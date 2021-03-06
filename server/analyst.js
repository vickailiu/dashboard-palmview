var http = require('http');
var url = require('url');
var storage = require('node-persist');

var sequenceLog = [];

//node-persist
storage.initSync();

// mysql connector
var mysql      = require('mysql');
var connection = mysql.createConnection({
  host      : 'ntuedm.cbjb06heo433.ap-southeast-1.rds.amazonaws.com',
  port      : '3306',         // MySQL server port number (default 3306)
  database  : 'ntuedm',       // MySQL database name
  user      : 'school',       // MySQL username
  password  : 'pass'          // password
});

var operational;
var questions;
var summaryTable;
var property;

// mapping phaseID to phaseTry in the DB
var palmviewActivityMapper = {};
palmviewActivityMapper[1]  = 1; 
palmviewActivityMapper[2]  = 2;
palmviewActivityMapper[3]  = 3;
palmviewActivityMapper[4]  = 4;
palmviewActivityMapper[5]  = 5;
palmviewActivityMapper[9]  = 6;
palmviewActivityMapper[10] = 7;
palmviewActivityMapper[11] = 8;
palmviewActivityMapper[12] = 9;
palmviewActivityMapper[13] = 10; 
palmviewActivityMapper[16] = 1;
palmviewActivityMapper[17] = 2;
palmviewActivityMapper[18] = 3;
palmviewActivityMapper[19] = 4;
palmviewActivityMapper[20] = 5;
palmviewActivityMapper[24] = 6;
palmviewActivityMapper[25] = 7;
palmviewActivityMapper[26] = 8;
palmviewActivityMapper[27] = 9;
var activityMapper = {};
activityMapper[2] = palmviewActivityMapper;

var node_to_exclude = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 131, 132, 372];

var routes = {
  "/api/debug": function() {
    sendResponse('bye');
  },
  // calculate the values across questions
  "/api/initialize": function() {
    operational = storage.getItemSync('operational');
    if (!operational) {
      operational = {};
      operational.schools = [];
      operational.classes = [];
      operational.students = [];
      storage.setItemSync('operational', operational);
      questions = {};
      storage.setItemSync('questions', questions);
      sendResponse('initialized!');
      return;
    }

    questions = storage.getItemSync('questions');
    sendResponse('loaded!');
  },
  // create student nodes
  "/api/createnode": function(parsedUrl) {
    if (!operational) {
      console.error('initialize first!');
    }

    var studentID = parsedUrl.query.studentID;
    var schoolID = parsedUrl.query.school;

    if (studentID) {  // update only this student's info
      connection.query('SELECT s.studentID, s.studentName AS username, sn.name AS name, sch.schoolID, sch.schoolName, c.classID, c.className, t.teacherID, t.teacherName, sub.subjID, sub.subjName, en.progress '+
                       'FROM STUDENT AS s '+
                       'INNER JOIN STUDENTNAME as sn ON s.studentName = sn.alias '+
                       //'LEFT OUTER JOIN STUDENTNAME as sn ON s.studentName = sn.alias '+
                       'INNER JOIN CLASS as c ON s.classID = c.classID '+
                       'INNER JOIN TEACHER as t ON s.teacherID = t.teacherID '+
                       'INNER JOIN SCHOOL as sch ON s.schoolID = sch.schoolID '+
                       'INNER JOIN ENROL as en on s.studentID = en.studentID '+
                       'INNER JOIN SUBJECT as sub on en.subjID = sub.subjID '+
                       'WHERE s.studentID = '+studentID+';',
                      student_query_handler);
    }
    else if (schoolID) {
      connection.query('SELECT s.studentID, s.studentName AS username, sn.name AS name, sch.schoolID, sch.schoolName, c.classID, c.className, t.teacherID, t.teacherName, sub.subjID, sub.subjName, en.progress '+
                       'FROM STUDENT AS s '+
                       'INNER JOIN STUDENTNAME as sn ON s.studentName = sn.alias '+
                       //'LEFT OUTER JOIN STUDENTNAME as sn ON s.studentName = sn.alias '+
                       'INNER JOIN CLASS as c ON s.classID = c.classID '+
                       'INNER JOIN TEACHER as t ON s.teacherID = t.teacherID '+
                       'INNER JOIN SCHOOL as sch ON s.schoolID = sch.schoolID '+
                       'INNER JOIN ENROL as en on s.studentID = en.studentID '+
                       'INNER JOIN SUBJECT as sub on en.subjID = sub.subjID '+
                       'WHERE s.schoolID = ' +schoolID+ ';',
                       student_query_handler); 
    }
    else {  // update the whole db
      connection.query('SELECT s.studentID, s.studentName AS username, sn.name AS name, sch.schoolID, sch.schoolName, c.classID, c.className, t.teacherID, t.teacherName, sub.subjID, sub.subjName, en.progress '+
                       'FROM STUDENT AS s '+
                       'INNER JOIN STUDENTNAME as sn ON s.studentName = sn.alias '+
                       //'LEFT OUTER JOIN STUDENTNAME as sn ON s.studentName = sn.alias '+
                       'INNER JOIN CLASS as c ON s.classID = c.classID '+
                       'INNER JOIN TEACHER as t ON s.teacherID = t.teacherID '+
                       'INNER JOIN SCHOOL as sch ON s.schoolID = sch.schoolID '+
                       'INNER JOIN ENROL as en on s.studentID = en.studentID '+
                       'INNER JOIN SUBJECT as sub on en.subjID = sub.subjID '+
                       'WHERE 1;',
                       student_query_handler);
    }

    function student_query_handler(err, rows) {
      if (err) {
        console.error('error connecting: ' + err.stack);
        return;
      }

      if (!rows || rows.length < 1) {
        console.log('no log');
        return;
      }

      var time_profiler = new Date();
      
      rows.forEach(function(row){ // rewrite the whole student DB, regardless the presence of the old data
        //studentNode = storage.getItemSync('student_'+row.studentID);
        //if (!studentNode) { // create the studentNode if not exist
          //studentNode = {};
          //storage.setItemSync('student_'+row.studentID, studentNode);
        //}
        if (node_to_exclude.indexOf(row.studentID) > -1) {
          return;
        }

        var studentNode = {};

        var exclude = ['subjID', 'subjName', 'progress'];

        for (var attr in row) {
          if ( exclude.indexOf(attr) < 0 ) {
            studentNode[attr] = row[attr];
          }
        }
        
        if (!studentNode.subjects) {
          studentNode.subjects = {};
        }
        if (!studentNode.subjects[row.subjID]){
          studentNode.subjects[row.subjID] = {};
        }

        studentNode.subjects[row.subjID].name = row.subjName;
        studentNode.subjects[row.subjID].progress = row.progress;

        if (operational.students.indexOf(studentNode.studentID) < 0) {
          operational.students.push(studentNode.studentID);
        }
        storage.setItemSync('student_'+row.studentID, studentNode);
      });

      operational.students.sort();

      storage.setItemSync('operational', operational);

      console.log('parsing complete, time spent: '+ ((new Date()).getTime() - time_profiler.getTime()) );
      sendResponse('parsing complete, time spent: '+ ((new Date()).getTime() - time_profiler.getTime()) );

      //connection.end();
    }

    //console.log('shot, it is async');

  },
  // query to the log of the database and consolidate it into student node
  "/api/parselog": function(parsedUrl) {
    var studentID = parsedUrl.query.studentID;
    var sessionID = parsedUrl.query.sessionID;
    
    if (!studentID) { // rebuild the log for all the students !!!! set to process palmview's data first
      connection.query( 'SELECT LOG.time, LOG.duration, LOG.actionType, LOG.action, LOG.target1, LOG.target2, LOG.phaseID, LOG.correct, LOG.studentID, LOG.sessionID FROM LOG INNER JOIN STUDENT ON  `LOG`.studentID =  `STUDENT`.studentID AND  '+
        '`STUDENT`.schoolID = 2 AND LOG.time > "2015-05-04" ORDER BY  `LOG`.studentID,  `LOG`.`logID`',
        log_query_handler);
    } else if (!sessionID) {  // (re)build the log for the student with studentID
      connection.query('SELECT time, duration, actionType, action, target1, target2, phaseID, correct, studentID, sessionID FROM `LOG` WHERE studentID = '+studentID+' ORDER BY `logID`',
        log_query_handler);
    } else {  // (re)build a session
      connection.query('SELECT time, duration, actionType, action, target1, target2, phaseID, correct, studentID, sessionID FROM `LOG` WHERE studentID = '+studentID+' AND sessionID = '+sessionID+' ORDER BY `logID`',
        log_query_handler);
    }

    function log_query_handler(err, rows) {
      if (err) {
        console.error('error connecting: ' + err.stack);
        return;
      }

      if (!rows || rows.length < 1) {
        console.log('no log');
        return;
      }

      // clean the duplications
      console.log(rows.length);

      var preTime, preDuration, preActionType, preAction, preTarget1, preTarget2, prePhaseID, preCorrect, preStudentID, preSessionID;
      var indicies = [];
      for (var i = 0; i<rows.length; i++) {
        var time = (new Date(rows[i].time)).getTime();
        var tempCorrect;
        if (rows[i].correct === null)
            tempCorrect = null;
          else
            tempCorrect = !!rows[i].correct[0]
        if (time == preTime &&
            // rows[i].duration == preDuration &&
            rows[i].actionType == preActionType &&
            rows[i].action == preAction &&
            rows[i].target1 == preTarget1 &&
            rows[i].target2 == preTarget2 &&
            rows[i].phaseID == prePhaseID &&
            tempCorrect == preCorrect &&
            rows[i].studentID == preStudentID &&
            rows[i].sessionID == preSessionID)
        {
          // console.log({'now':rows[i], 'pre': [preTime, preDuration, preActionType, preAction, preTarget1, preTarget2, prePhaseID, preCorrect, preStudentID, preSessionID]});
          indicies.push(i);
          // console.log(i);
        } else {
          preTime = time;
          // preDuration = rows[i].duration;
          preActionType = rows[i].actionType;
          preAction = rows[i].action;
          preTarget1 = rows[i].target1;
          preTarget2 = rows[i].target2;
          prePhaseID = rows[i].phaseID;
          if (rows[i].correct === null)
            preCorrect = null;
          else
            preCorrect = !!rows[i].correct[0]
          // preCorrect = rows[i].correct;
          preStudentID = rows[i].studentID;
          preSessionID = rows[i].sessionID;
        }
      }
      console.log(indicies.length);

      for (var i = indicies.length-1; i>-1; i--) {
        rows.splice(indicies[i],1);
      }
      console.log('after clearning the duplication');
      console.log(rows.length);

      var time_profiler = new Date();

      var currentStudentID;
      var currentSessionID;
      var currentActivityID;
      var currentStudentNode;
      var currentSessionNode;
      var currentActivityNode;

      rows.forEach(function(row){
        if (node_to_exclude.indexOf(row.studentID) > -1) {
          return;
        }

        if (row.studentID != currentStudentID) {
          // store the old node
          if (currentStudentNode) {
            storage.setItemSync('student_'+currentStudentID, currentStudentNode);
          }

          // new student node, everything new
          currentStudentID = row.studentID;
          currentStudentNode = storage.getItemSync('student_'+currentStudentID);
          if (!currentStudentNode) {
            console.log('no student: '+row.studentID+', do student_query first!');
            //sendResponse('no student: '+studentID+', do student_query first!');
            return;
          }

          currentSessionID = null;
          currentSessionNode = null;
          currentActivityID = null;
          currentActivityNode = null;

          if (!currentStudentNode.subjects[Object.keys(currentStudentNode.subjects)[0]].sessions) {
            currentStudentNode.subjects[Object.keys(currentStudentNode.subjects)[0]].sessions = [];
          }
        }

        if (row.sessionID != currentSessionID) {
          currentSessionID = row.sessionID;
          currentSessionNode = {};
          currentSessionNode.sessionID = currentSessionID;
          currentSessionNode.activities = [];
          currentStudentNode.subjects[Object.keys(currentStudentNode.subjects)[0]].sessions.push(currentSessionNode);

          currentActivityID = null;
          currentActivityNode = null;
        }

        if (row.phaseID != currentActivityID) {
          currentActivityID = row.phaseID;
          currentActivityNode = {};
          currentActivityNode.activityID = activityMapper[2][currentActivityID];
          currentActivityNode.events = [];
          currentSessionNode.activities.push(currentActivityNode);
        }

        var eventNode = {};
        eventNode.time = row.time;
        eventNode.duration = row.duration;
        eventNode.actionType = row.actionType;
        eventNode.action = row.action;
        eventNode.target1 = row.target1;
        eventNode.target2 = row.target2;
        if (row.correct === null)
          eventNode.correct = null;
        else
          eventNode.correct = !!row.correct[0]; // bit operation

        currentActivityNode.events.push(eventNode);
      });

      //processStudentLog(currentStudentNode);

      // last studentNode
      storage.setItemSync('student_'+currentStudentID, currentStudentNode);

      console.log('parsing complete, time spent: '+ ((new Date()).getTime() - time_profiler.getTime()) );
      sendResponse('parsing complete, time spent: '+ ((new Date()).getTime() - time_profiler.getTime()) );
    }

    //connection.end();
  },
  "/api/processlog": function(parsedUrl) {
    var studentID = parsedUrl.query.studentID;
    var sessionID = parsedUrl.query.sessionID;
    
    if (!studentID) {
      operational.students.forEach(function(studentID){
        var studentNode = storage.getItemSync('student_'+studentID);
        processStudentLog(studentNode);
        storage.setItemSync('student_'+studentID, studentNode);
      });
    } else if (!sessionID) {  // (re)build the log for the student with studentID
      var currentStudentNode = storage.getItemSync('student_'+studentID);
      processStudentLog(currentStudentNode);
      storage.setItemSync('student_'+studentID, currentStudentNode);
    } else {  // (re)build a session
      // TODO: do we really need it?
    }

    console.log('done');
    sendResponse('done!');
  },
  // query to the log of the database and consolidate it into student node
  "/api/parsequestion": function(parsedUrl) {
    
    connection.query( 'SELECT * FROM `QUESTIONDB` WHERE `subjID`=2 ORDER BY `QUESTIONDB`.`qID` ASC',
      question_query_handler);

    function question_query_handler(err, rows) {
      if (err) {
        console.error('error connecting: ' + err.stack);
        return;
      }

      if (!rows || rows.length < 1) {
        console.log('no question');
        return;
      }

      var questions;
      questions = storage.getItemSync('questions');
      if (!questions)
        throw "no questions!!!";

      rows.forEach(function(qns){
        var questionNode = {};
        questionNode.id = qns.qID;
        questionNode.type = qns.qnsType;
        questionNode.content = qns.qns;
        questionNode.answer = qns.ans;
        questionNode.para1 = qns.opt1;
        questionNode.para2 = qns.opt2;
        questionNode.para3 = qns.opt3;
        questionNode.para4 = qns.opt4;

        questions[questionNode.id] = questionNode;
      });

      storage.setItemSync('questions', questions);

      sendResponse('done!');
    }
  },
  "/api/summarizequestion": function(parsedUrl) {
    summaryTable = {};
    property = {};
    connection.query('SELECT * FROM  `SUBJECT` ORDER BY  `SUBJECT`.`subjID` ASC',
      subject_query_handler);
    function subject_query_handler(err, rows) {
      if (err) {
        console.error('error connecting: ' + err.stack);
        return;
      }

      if (!rows || rows.length < 1) {
        console.log('no subjects');
        return;
      }

      rows.forEach(function(subject){
        var subjectNode = {};
        subjectNode.id = subject.subjID;
        subjectNode.name = subject.subjName;

        property['subject_'+subjectNode.id] = subjectNode;
        summaryTable['subject_'+subjectNode.id] = {};
      });

      connection.query('SELECT * FROM  `PHASE_TRY` ORDER BY  `PHASE_TRY`.`phaseId` ASC ', 
        activity_query_handler);
    }

    function activity_query_handler(err, rows) {
      if (err) {
        console.error('error connecting: ' + err.stack);
        return;
      }

      if (!rows || rows.length < 1) {
        console.log('no subjects');
        return;
      }

      rows.forEach(function(activity){
        var activityNode = {};
        activityNode.id = palmviewActivityMapper[activity.phaseId];
        activityNode.name = activity.label;
        activityNode.title = activity.title;
        activityNode.subjID = activity.subjId;
        activityNode.type = activity.contentType;
        activityNode.para1 = activity.para1;
        activityNode.para2 = activity.para2;
        activityNode.para3 = activity.para3;

        property['activity_'+activityNode.id] = activityNode;
        summaryTable['activity_'+activityNode.id] = {};
      });

      rows.forEach(function(activity){
        var id = palmviewActivityMapper[activity.phaseId];
        
        summaryTable['activity_'+ id + '_video_68ihQ9jQOM8'] = {};
        summaryTable['activity_'+ id + '_video_Jowey_prtVM'] = {};
        summaryTable['activity_'+ id + '_video_pjjSp46ffjQ'] = {};
        summaryTable['activity_'+ id + '_video_bwm5pv3UiYE'] = {};
        summaryTable['activity_'+ id + '_video_LlFw4UPv4L4'] = {};
        summaryTable['activity_'+ id + '_video_Jx9mtdx-7aQ'] = {};
        summaryTable['activity_'+ id + '_video_jcc0WBVtO90'] = {};
        summaryTable['activity_'+ id + '_video_0lf0YACerzY'] = {};
        summaryTable['activity_'+ id + '_video_bDXedeH-Bpo'] = {};
        summaryTable['activity_'+ id + '_video_zJUaLHvLP6s'] = {};

        for (var questionID in questions) {
          summaryTable['activity_'+ id + '_question_' + questionID] = {};
        }
      });

      object_initialization();
    }

    function object_initialization() {

      for (var rowLabel in summaryTable) {
        // summaryTable[rowLabel]['student_138'] = {};
        // continue;

        summaryTable[rowLabel]['school_2'] = {};
        summaryTable[rowLabel]['class_5'] = {};
        summaryTable[rowLabel]['class_6'] = {};
        summaryTable[rowLabel]['class_7'] = {};
        summaryTable[rowLabel]['class_8'] = {};
        summaryTable[rowLabel]['class_9'] = {};
        summaryTable[rowLabel]['class_10'] = {};
        summaryTable[rowLabel]['class_11'] = {};
        summaryTable[rowLabel]['class_12'] = {};
        summaryTable[rowLabel]['class_13'] = {};
        summaryTable[rowLabel]['class_14'] = {};

        for(var i = 0; i< operational.students.length; i++) {
          summaryTable[rowLabel]['student_' + operational.students[i]] = {};
        }
      }

      summarize_question_view();
    }

    function summarize_question_view() {
      for(var i = 0; i< operational.students.length; i++) {
        var studentNode = storage.getItemSync('student_' + operational.students[i]);
        if (!studentNode) throw "summarize: cannot find the student";

        property['student_' + operational.students[i]] = {};

        // copy student property to propertylist
        for (var attr in studentNode) {
          if (attr != 'subjects') {
            property['student_' + operational.students[i]][attr] = studentNode[attr];
          }
        }

        for (var subjectID in studentNode.subjects) {
          var subjectNode = studentNode.subjects[subjectID];
          property['subject_'+subjectID].name = subjectNode.name;

          for (var i_session = 0; subjectNode.sessions && i_session < subjectNode.sessions.length; i_session++) {
            var sessionNode = subjectNode.sessions[i_session];

            for (var i_activity = 0; i_activity < sessionNode.activities.length; i_activity++) {
              var activityNode = sessionNode.activities[i_activity];
              if (activityNode.activityID - 1 === 0) continue;

              for (var i_q = 0; activityNode.questions && i_q < activityNode.questions.length; i_q++) {
                var questionNode = activityNode.questions[i_q];

                if (activityNode.activityID >= 3 && activityNode.activityID <= 5)
                  questionNode.sequenceCat = getSequenceCat(questionNode.sequence, activityNode.activityID);
                else if (activityNode.activityID >= 7 && activityNode.activityID <= 9)
                  questionNode.sequenceCat = getSequenceCat(questionNode.sequence, activityNode.activityID - 4);

                // if (activityNode.activityID == 5) {
                //   var sequence = '';
                //   for (var i_sq = 0; i_sq<questionNode.sequence.length; i_sq++) {
                //     sequence+= questionNode.sequence[i_sq].label + ',';
                //   }
                //   sequenceLog.push(sequence);
                // }

                if (summaryTable['activity_'+activityNode.activityID+'_question_'+questionNode.id]) {
                  if (!summaryTable['activity_'+activityNode.activityID+'_question_'+questionNode.id]['student_'+studentNode.studentID][sessionNode.sessionID]) {
                    summaryTable['activity_'+activityNode.activityID+'_question_'+questionNode.id]['student_'+studentNode.studentID][sessionNode.sessionID] = {};  
                    summaryTable['activity_'+activityNode.activityID+'_question_'+questionNode.id]['student_'+studentNode.studentID][sessionNode.sessionID].instances = [];
                  }
                  summaryTable['activity_'+activityNode.activityID+'_question_'+questionNode.id]['student_'+studentNode.studentID][sessionNode.sessionID].instances.push(questionNode);

                //   var bla = '';
                //   for (var j = 0; j<questionNode.sequence.length; j++) {
                //     bla += questionNode.sequence[j].label + ' ';
                //   }
                //   console.log(bla);
                // }
                // else {
                //   var bla = '';
                //   for (var j = 0; questionNode.sequence && j<questionNode.sequence.length; j++) {
                //     bla += questionNode.sequence[j].label + ' ';
                //   }
                //   console.log('----------------'+bla);
                }
              }

              //questions per session
              for (var rowLabel in summaryTable) {
                if (rowLabel.indexOf('activity_'+activityNode.activityID+'_question_') < 0) continue;
                if (!summaryTable[rowLabel]['student_'+studentNode.studentID][sessionNode.sessionID]) continue;
                cell = summaryTable[rowLabel]['student_'+studentNode.studentID][sessionNode.sessionID].instances;
                if (!cell) continue;

                var questionSummaryNode = {};
                questionSummaryNode.number = 0;
                questionSummaryNode.duration = 0;
                questionSummaryNode.correctTimes = 0;
                questionSummaryNode.highlightedWords = 0;
                questionSummaryNode.workout_planType = {};
                questionSummaryNode.workout_planType.times = 0;
                questionSummaryNode.workout_planType.correct = 0;
                questionSummaryNode.workout_planType.submitTimes = 0;
                questionSummaryNode.workout_planType.correctSubmitTimes = 0;
                questionSummaryNode.workout_planModel = {};
                questionSummaryNode.workout_planModel.times = 0;
                questionSummaryNode.workout_planModel.correct = 0;
                questionSummaryNode.workout_planModel.submitTimes = 0;
                questionSummaryNode.workout_planModel.correctSubmitTimes = 0;
                questionSummaryNode.workout_dragDrops = {};
                questionSummaryNode.workout_dragDrops.incomplete_attempts = 0;
                questionSummaryNode.workout_dragDrops.complete_attempts = 0;
                questionSummaryNode.workout_dragDrops.correct_attampts = 0;
                questionSummaryNode.workout_equation = {};
                questionSummaryNode.workout_equation.times = 0;
                questionSummaryNode.workout_equation.correct = 0;
                questionSummaryNode.answer = {};
                questionSummaryNode.answer.times = 0;
                questionSummaryNode.answer.correct = 0;
                questionSummaryNode.answer.submitTimes = 0;
                questionSummaryNode.answer.correctSubmitTimes = 0;
                questionSummaryNode.answer.finalCorrectSubmits = 0;
                questionSummaryNode.wrong_answer_reaction = {};
                questionSummaryNode.wrong_answer_reaction.ignore = 0;
                questionSummaryNode.wrong_answer_reaction.review = 0;
                questionSummaryNode.wrong_answer_reaction.hint = 0;
                questionSummaryNode.sequenceCat = {};
                questionSummaryNode.sequenceCat.complete = 0;
                questionSummaryNode.sequenceCat.complete_followRight = 0;
                questionSummaryNode.sequenceCat.complete_followRight_correct = 0;
                questionSummaryNode.sequenceCat.complete_followRight_incorrect = 0
                questionSummaryNode.sequenceCat.complete_inorderRight = 0;
                questionSummaryNode.sequenceCat.complete_inorderRight_correct = 0;
                questionSummaryNode.sequenceCat.complete_inorderRight_incorrect = 0
                questionSummaryNode.sequenceCat.complete_notFollow = 0;
                questionSummaryNode.sequenceCat.complete_notFollow_correct = 0;
                questionSummaryNode.sequenceCat.complete_notFollow_incorrect = 0;
                questionSummaryNode.sequenceCat.incomplete = 0;

                for (var i_ques = 0; cell && i_ques< cell.length; i_ques ++) {
                  var questionNode = cell[i_ques];

                  questionSummaryNode.number ++;
                  questionSummaryNode.duration += questionNode.duration;

                  questionSummaryNode.sequenceCat.complete += questionNode.sequenceCat.complete;
                  questionSummaryNode.sequenceCat.complete_followRight += questionNode.sequenceCat.complete_followRight;
                  questionSummaryNode.sequenceCat.complete_followRight_correct += questionNode.sequenceCat.complete_followRight_correct;
                  questionSummaryNode.sequenceCat.complete_followRight_incorrect += questionNode.sequenceCat.complete_followRight_incorrect;
                  questionSummaryNode.sequenceCat.complete_inorderRight += questionNode.sequenceCat.complete_inorderRight;
                  questionSummaryNode.sequenceCat.complete_inorderRight_correct += questionNode.sequenceCat.complete_inorderRight_correct;
                  questionSummaryNode.sequenceCat.complete_inorderRight_incorrect += questionNode.sequenceCat.complete_inorderRight_incorrect;
                  questionSummaryNode.sequenceCat.complete_notFollow += questionNode.sequenceCat.complete_notFollow;
                  questionSummaryNode.sequenceCat.complete_notFollow_correct += questionNode.sequenceCat.complete_notFollow_correct;
                  questionSummaryNode.sequenceCat.complete_notFollow_incorrect += questionNode.sequenceCat.complete_notFollow_incorrect;
                  questionSummaryNode.sequenceCat.incomplete += questionNode.sequenceCat.incomplete;

                  if (questionNode.highlightedWords) {
                    for (var i_highlight = 0; i_highlight<questionNode.highlightedWords.length; i_highlight++) {
                      if (questionNode.highlightedWords[i_highlight].highlight) {
                        questionSummaryNode.highlightedWords ++;    
                      }
                    }
                  }

                  if (questionNode.workout_planType) {
                    questionSummaryNode.workout_planType.times += questionNode.workout_planType.times;
                    questionSummaryNode.workout_planType.correct += questionNode.workout_planType.correctTimes;
                    if (questionNode.workout_planType.final) {
                      questionSummaryNode.workout_planType.submitTimes++;
                      //console.log('_' + questionNode.workout_planType.final +' vs '+ questionData.type.substr(6,1).toLowerCase());
                      if (questionNode.workout_planType.final == questions[questionNode.id].type.substr(6,1).toLowerCase()) {
                        questionSummaryNode.workout_planType.correctSubmitTimes ++;
                      }
                    }
                  }
                  
                  if (questionNode.workout_planModel) {
                    questionSummaryNode.workout_planModel.times += questionNode.workout_planModel.times;
                    questionSummaryNode.workout_planModel.correct += questionNode.workout_planModel.correctTimes;
                    if (questionNode.workout_planModel.final) {
                      questionSummaryNode.workout_planModel.submitTimes++;
                      //console.log('_' + questionNode.workout_planModel.final.toLowerCase() +' vs '+ questionData.type.substr(6).toLowerCase());
                      if (questionNode.workout_planModel.final.toLowerCase() == questions[questionNode.id].type.substr(6).toLowerCase()) {
                        questionSummaryNode.workout_planModel.correctSubmitTimes ++;
                      }
                    }
                  }

                  if (questionNode.workout_dragDrops && questionNode.workout_dragDrops.fields) {
                    for (var i_ddf = 0; i_ddf<questionNode.workout_dragDrops.fields.length; i_ddf++) {
                      questionSummaryNode.workout_dragDrops.incomplete_attempts += questionNode.workout_dragDrops.fields[i_ddf].incomplete_attempts;
                      questionSummaryNode.workout_dragDrops.complete_attempts += questionNode.workout_dragDrops.fields[i_ddf].attempts.times;
                      questionSummaryNode.workout_dragDrops.correct_attampts += questionNode.workout_dragDrops.fields[i_ddf].attempts.correctTimes;
                    }
                  }

                  if (questionNode.workout_equation) {
                    for (var i_eq = 0; i_eq<questionNode.workout_equation.length; i_eq++) {
                      questionSummaryNode.workout_equation.times += questionNode.workout_equation[i_eq].times;
                      questionSummaryNode.workout_equation.correct += questionNode.workout_equation[i_eq].correctTimes;
                    }
                  }

                  if (questionNode.answer) {
                    questionSummaryNode.answer.times += questionNode.answer.times;
                    questionSummaryNode.answer.correct += questionNode.answer.correctTimes;
                    // if (questionNode.answer.final !== null) {
                    //   questionSummaryNode.answer.submitTimes++;
                    //   if (questionNode.answer.final) {
                    //     questionSummaryNode.answer.correctSubmitTimes++;
                    //   }
                    // }
                    questionSummaryNode.answer.submitTimes += questionNode.answer.submitTimes
                    questionSummaryNode.answer.correctSubmitTimes += questionNode.answer.correctSubmitTimes
                    if (questionNode.answer.finalSubmit)
                      questionNode.answer.finalCorrectSubmits++;
                  }

                  if (questionNode.wrong_answer_reaction) {
                    questionSummaryNode.wrong_answer_reaction.ignore += questionNode.wrong_answer_reaction.ignore;
                    questionSummaryNode.wrong_answer_reaction.review += questionNode.wrong_answer_reaction.review;
                    questionSummaryNode.wrong_answer_reaction.hint += questionNode.wrong_answer_reaction.hint;
                  }
                }

                for(var mainattr in questionSummaryNode) {
                  if (mainattr == 'number') continue;
                  if (typeof questionSummaryNode[mainattr] == 'object') {
                    for(var subattr in questionSummaryNode[mainattr]) {
                      questionSummaryNode[mainattr][subattr] = 1.0 * questionSummaryNode[mainattr][subattr] / questionSummaryNode.number;
                    }
                  } else {
                    questionSummaryNode[mainattr] = 1.0 * questionSummaryNode[mainattr] / questionSummaryNode.number;
                  }
                }

                questionSummaryNode.withParent = !!sessionNode.withParent;
                summaryTable[rowLabel]['student_'+studentNode.studentID][sessionNode.sessionID].summary = questionSummaryNode;
              }

              for (var videoID in activityNode.videos) {
                if (!summaryTable['activity_'+activityNode.activityID+'_video_'+videoID]['student_'+studentNode.studentID][sessionNode.sessionID]) {
                  summaryTable['activity_'+activityNode.activityID+'_video_'+videoID]['student_'+studentNode.studentID][sessionNode.sessionID] = {};
                }
                summaryTable['activity_'+activityNode.activityID+'_video_'+videoID]['student_'+studentNode.studentID][sessionNode.sessionID].instances = activityNode.videos[videoID];

                var videoSummaryNode = {};
                videoSummaryNode.number = 0;
                var tempActiveDuration = 0;
                var tempPauseTimes = 0;
                var tempPauseDuration = 0;
                var tempPercentage = 0;

                for(var i_v = 0; i_v < activityNode.videos[videoID].length; i_v++) {
                  var videoNode = activityNode.videos[videoID][i_v];
                  videoSummaryNode.number ++;
                  tempActiveDuration += videoNode.activeDuration;
                  tempPauseTimes      += videoNode.pauses? videoNode.pauses.length : 0;
                  for (var i_video = 0; videoNode.pauses && i_video<videoNode.pauses.length; i_video++) {
                    if (videoNode.pauses[i_video].end) {
                      tempPauseDuration += (new Date(videoNode.pauses[i_video].end)).getTime() - (new Date(videoNode.pauses[i_video].start)).getTime();
                    }
                  }
                  tempPercentage += videoNode.watchedPercentage;
                }
                videoSummaryNode.activeDuration = 1.0 * tempActiveDuration / videoSummaryNode.number;
                videoSummaryNode.pauseTimes = 1.0 * tempPauseTimes / videoSummaryNode.number;
                videoSummaryNode.pauseDuration = 1.0 * tempPauseDuration / videoSummaryNode.number;
                videoSummaryNode.watchedPercentage = 1.0 * tempPercentage / videoSummaryNode.number;

                videoSummaryNode.withParent = !!sessionNode.withParent;
                summaryTable['activity_'+activityNode.activityID+'_video_'+videoID]['student_'+studentNode.studentID][sessionNode.sessionID].summary = videoSummaryNode;
              }

              if (!summaryTable['activity_'+activityNode.activityID]['student_'+studentNode.studentID][sessionNode.sessionID]) {
                summaryTable['activity_'+activityNode.activityID]['student_'+studentNode.studentID][sessionNode.sessionID] = {};
                summaryTable['activity_'+activityNode.activityID]['student_'+studentNode.studentID][sessionNode.sessionID].instances = [];
              }
              var activitySummaryNode = {};

              activitySummaryNode.completedActivities = activityNode.completed ? 1 : 0;
              activitySummaryNode.attemptedActivities = 1;
              activitySummaryNode.progress = activityNode.progress;
              activitySummaryNode.reinforcementAttempts = activityNode.reinforcementTimes;
              activitySummaryNode.duration = activityNode.duration;

              //activitySummaryNode.questionSummary = activityNode.questionSummary;
              activitySummaryNode.question = {};
              for (var mainattr in activityNode.questionSummary) {
                if (mainattr == 'number') {
                  activitySummaryNode.question.number = activityNode.questionSummary.number;
                  if (activitySummaryNode.question.number === 0) break;
                  continue;
                }
                var entry = activityNode.questionSummary[mainattr];
                if (entry === null) {
                  activitySummaryNode.question[mainattr] = 0;
                } else if (typeof entry == 'object') {
                  activitySummaryNode.question[mainattr] = {};
                  for (var subattr in entry) {
                    activitySummaryNode.question[mainattr][subattr] = 1.0 * entry[subattr] / activityNode.questionSummary.number;
                  }
                } else {
                  activitySummaryNode.question[mainattr] = 1.0 * entry / activityNode.questionSummary.number;
                }
              }
              activitySummaryNode.question.sequenceCat = {};
              activitySummaryNode.question.sequenceCat.complete = 0;
              activitySummaryNode.question.sequenceCat.complete_followRight = 0;
              activitySummaryNode.question.sequenceCat.complete_followRight_correct = 0;
              activitySummaryNode.question.sequenceCat.complete_followRight_incorrect = 0
              activitySummaryNode.question.sequenceCat.complete_inorderRight = 0;
              activitySummaryNode.question.sequenceCat.complete_inorderRight_correct = 0;
              activitySummaryNode.question.sequenceCat.complete_inorderRight_incorrect = 0;
              activitySummaryNode.question.sequenceCat.complete_notFollow = 0;
              activitySummaryNode.question.sequenceCat.complete_notFollow_correct = 0;
              activitySummaryNode.question.sequenceCat.complete_notFollow_incorrect = 0;
              activitySummaryNode.question.sequenceCat.incomplete = 0;

              for (var rowLabel in summaryTable) {
                if (rowLabel.indexOf('activity_'+activityNode.activityID+'_question_') < 0) continue;
                if (!summaryTable[rowLabel]['student_'+studentNode.studentID][sessionNode.sessionID]) continue;
                cell = summaryTable[rowLabel]['student_'+studentNode.studentID][sessionNode.sessionID].instances;
                if (!cell) continue;

                for (var i_ques = 0; cell && i_ques< cell.length; i_ques ++) {
                  var questionNode = cell[i_ques];

                  activitySummaryNode.question.sequenceCat.complete += questionNode.sequenceCat.complete;
                  activitySummaryNode.question.sequenceCat.complete_followRight += questionNode.sequenceCat.complete_followRight;
                  activitySummaryNode.question.sequenceCat.complete_followRight_correct += questionNode.sequenceCat.complete_followRight_correct;
                  activitySummaryNode.question.sequenceCat.complete_followRight_incorrect += questionNode.sequenceCat.complete_followRight_incorrect;
                  activitySummaryNode.question.sequenceCat.complete_inorderRight += questionNode.sequenceCat.complete_inorderRight;
                  activitySummaryNode.question.sequenceCat.complete_inorderRight_correct += questionNode.sequenceCat.complete_inorderRight_correct;
                  activitySummaryNode.question.sequenceCat.complete_inorderRight_incorrect += questionNode.sequenceCat.complete_inorderRight_incorrect;
                  activitySummaryNode.question.sequenceCat.complete_notFollow += questionNode.sequenceCat.complete_notFollow;
                  activitySummaryNode.question.sequenceCat.complete_notFollow_correct += questionNode.sequenceCat.complete_notFollow_correct;
                  activitySummaryNode.question.sequenceCat.complete_notFollow_incorrect += questionNode.sequenceCat.complete_notFollow_incorrect;
                  activitySummaryNode.question.sequenceCat.incomplete += questionNode.sequenceCat.incomplete;

                }
              }

              activitySummaryNode.question.sequenceCat.complete = 1.0 * activitySummaryNode.question.sequenceCat.complete / activitySummaryNode.question.number;
              activitySummaryNode.question.sequenceCat.complete_followRight = 1.0 * activitySummaryNode.question.sequenceCat.complete_followRight / activitySummaryNode.question.number;
              activitySummaryNode.question.sequenceCat.complete_followRight_correct = 1.0 * activitySummaryNode.question.sequenceCat.complete_followRight_correct / activitySummaryNode.question.number;
              activitySummaryNode.question.sequenceCat.complete_followRight_incorrect = 1.0 * activitySummaryNode.question.sequenceCat.complete_followRight_incorrect / activitySummaryNode.question.number;
              activitySummaryNode.question.sequenceCat.complete_inorderRight = 1.0 * activitySummaryNode.question.sequenceCat.complete_inorderRight / activitySummaryNode.question.number;
              activitySummaryNode.question.sequenceCat.complete_inorderRight_correct = 1.0 * activitySummaryNode.question.sequenceCat.complete_inorderRight_correct / activitySummaryNode.question.number;
              activitySummaryNode.question.sequenceCat.complete_inorderRight_incorrect = 1.0 * activitySummaryNode.question.sequenceCat.complete_inorderRight_incorrect / activitySummaryNode.question.number;
              activitySummaryNode.question.sequenceCat.complete_notFollow = 1.0 * activitySummaryNode.question.sequenceCat.complete_notFollow / activitySummaryNode.question.number;
              activitySummaryNode.question.sequenceCat.complete_notFollow_correct = 1.0 * activitySummaryNode.question.sequenceCat.complete_notFollow_correct / activitySummaryNode.question.number;
              activitySummaryNode.question.sequenceCat.complete_notFollow_incorrect = 1.0 * activitySummaryNode.question.sequenceCat.complete_notFollow_incorrect / activitySummaryNode.question.number;
              activitySummaryNode.question.sequenceCat.incomplete = 1.0 * activitySummaryNode.question.sequenceCat.incomplete / activitySummaryNode.question.number;

              activitySummaryNode.offTask = {};
              if (activityNode.offTask) {
                if (activityNode.offTask.instances && activityNode.offTask.instances.length > 0) {
                  activitySummaryNode.offTask.number = activityNode.offTask.instances.length;
                  activitySummaryNode.offTask.duration = 1.0 * activityNode.offTask.totalduration / activityNode.offTask.instances.length;
                } else {
                  if (activityNode.offTask.totalduration > 0) {
                    activitySummaryNode.offTask.number = 1;
                    activitySummaryNode.offTask.duration = activityNode.offTask.totalduration;
                  } else {
                    activitySummaryNode.offTask.number = 0;
                    activitySummaryNode.offTask.duration = 0;
                  }
                }
              }
              
              activitySummaryNode.video = {};
              activitySummaryNode.video.number = 0;
              activitySummaryNode.video.activeDuration = 0;
              activitySummaryNode.video.pauseTimes = 0;
              activitySummaryNode.video.pauseDuration = 0; 
              activitySummaryNode.video.watchedPercentage = 0;
              for (var videoID in activityNode.videos) {
                if (!summaryTable['activity_'+activityNode.activityID+'_video_'+videoID]['student_'+studentNode.studentID][sessionNode.sessionID])
                  continue;
                var videoNode = summaryTable['activity_'+activityNode.activityID+'_video_'+videoID]['student_'+studentNode.studentID][sessionNode.sessionID].summary;
                activitySummaryNode.video.number += videoNode.number;
                activitySummaryNode.video.activeDuration += videoNode.activeDuration * videoNode.number;
                activitySummaryNode.video.pauseTimes += videoNode.pauseTimes * videoNode.number;
                activitySummaryNode.video.pauseDuration += videoNode.pauseDuration * videoNode.number;
                activitySummaryNode.video.watchedPercentage += videoNode.watchedPercentage * videoNode.number;
              }
              if (activitySummaryNode.video.number > 0) {
                activitySummaryNode.video.activeDuration = 1.0 * activitySummaryNode.video.activeDuration / activitySummaryNode.video.number;
                activitySummaryNode.video.pauseTimes = 1.0 * activitySummaryNode.video.pauseTimes / activitySummaryNode.video.number;
                activitySummaryNode.video.pauseDuration = 1.0 * activitySummaryNode.video.pauseDuration / activitySummaryNode.video.number;
                activitySummaryNode.video.watchedPercentage = 1.0 * activitySummaryNode.video.watchedPercentage / activitySummaryNode.video.number;
              }
              if (!activitySummaryNode.video.activeDuration) activitySummaryNode.video.activeDuration = 0;
              if (!activitySummaryNode.video.pauseTimes) activitySummaryNode.video.pauseTimes = 0;
              if (!activitySummaryNode.video.pauseDuration) activitySummaryNode.video.pauseDuration = 0;
              if (!activitySummaryNode.video.watchedPercentage) activitySummaryNode.video.watchedPercentage = 0;

              summaryTable['activity_'+activityNode.activityID]['student_'+studentNode.studentID][sessionNode.sessionID].instances.push(activitySummaryNode);
            }
            
            // summarize individual activity for each session
            for (var rowLabel in summaryTable) {
              if (rowLabel.indexOf('activity_') !== 0 || 
                rowLabel.indexOf('_question_') > 0 ||
                rowLabel.indexOf('_video_') > 0)
                continue;
              if (!summaryTable[rowLabel] || !summaryTable[rowLabel]['student_'+studentNode.studentID] || !summaryTable[rowLabel]['student_'+studentNode.studentID][sessionNode.sessionID])
                continue;
              var count = summaryTable[rowLabel]['student_'+studentNode.studentID][sessionNode.sessionID].instances.length;
              if (count === 0) {
                continue;
              } else if (count == 1) {
                summaryTable[rowLabel]['student_'+studentNode.studentID][sessionNode.sessionID].summary = summaryTable[rowLabel]['student_'+studentNode.studentID][sessionNode.sessionID].instances[0];
                summaryTable[rowLabel]['student_'+studentNode.studentID][sessionNode.sessionID].summary.withParent = !!sessionNode.withParent;
              } else {
                var nodeList = [];
                for(var i_act = 0; i_act < count; i_act++) {
                  if (summaryTable[rowLabel]['student_'+studentNode.studentID][sessionNode.sessionID].instances[i_act]) {
                    nodeList.push(summaryTable[rowLabel]['student_'+studentNode.studentID][sessionNode.sessionID].instances[i_act]);
                  }
                }

                if (nodeList.length > 0) {
                  summaryTable[rowLabel]['student_'+studentNode.studentID][sessionNode.sessionID].summary = aggregate(nodeList,[], ['progress']);
                  summaryTable[rowLabel]['student_'+studentNode.studentID][sessionNode.sessionID].summary.withParent = !!sessionNode.withParent; 
                }
                
              }
            }

            // summarize subject for each session (from the activities)
            var nodeList = [];
            for (var rowLabel in summaryTable) {
              if (rowLabel.indexOf('activity_') !== 0 || 
                rowLabel.indexOf('_question_') > 0 ||
                rowLabel.indexOf('_video_') > 0)
                continue;

              if (!summaryTable[rowLabel] || ! summaryTable[rowLabel]['student_'+studentNode.studentID] || !summaryTable[rowLabel]['student_'+studentNode.studentID][sessionNode.sessionID])
                continue;

              if (summaryTable[rowLabel]['student_'+studentNode.studentID][sessionNode.sessionID].summary) {
                nodeList.push(summaryTable[rowLabel]['student_'+studentNode.studentID][sessionNode.sessionID].summary);
              }
            }

            if (nodeList.length > 0) {
              summaryTable['subject_'+subjectID]['student_'+studentNode.studentID][sessionNode.sessionID] = aggregate(nodeList, ['withParent', 'progress']);
              summaryTable['subject_'+subjectID]['student_'+studentNode.studentID][sessionNode.sessionID].withParent = !!sessionNode.withParent;
            }
          }

          // summarize for session
          for (var rowLabel in summaryTable) {
            var cell = summaryTable[rowLabel]['student_'+studentNode.studentID];
            var nodeList = [];

            if (rowLabel.indexOf('subject_') == 0) {
              for (var sessionID in cell) {
                if (cell[sessionID]) {
                  nodeList.push(cell[sessionID]);  
                }
              }
            } else {
              for (var sessionID in cell) {
                if (sessionID == 'summary') throw "cannot! there shouldn't be any summary";
                if (cell[sessionID].summary) {
                  nodeList.push(cell[sessionID].summary);  
                }
              }
            }

            if (nodeList.length > 0) {
              if ( rowLabel.indexOf('_question_') > 0 || rowLabel.indexOf('_video_') > 0 ) {
                summaryTable[rowLabel]['student_'+studentNode.studentID].summary = aggregateVideoQuestion(nodeList, ['withParent']);  
              } else {
                summaryTable[rowLabel]['student_'+studentNode.studentID].summary = aggregate(nodeList, ['withParent']);
              }
            }

            if (rowLabel == 'subject_2' && summaryTable[rowLabel]['student_'+studentNode.studentID].summary) {
              summaryTable[rowLabel]['student_'+studentNode.studentID].summary.progress = subjectNode.progress;
            }
          }
        }
      }

      storage.setItemSync('log', sequenceLog);

      // summarizequestion_finisher();
      // return;

      property['class_5'] = {};     property['class_5'].className = 'Euler 1';          property['class_5'].schoolID = 2;
      property['class_6'] = {};     property['class_6'].className = 'Gauss 1';          property['class_6'].schoolID = 2;
      property['class_7'] = {};     property['class_7'].className = 'Newton 1';         property['class_7'].schoolID = 2;
      property['class_8'] = {};     property['class_8'].className = 'Pythagoras 1';     property['class_8'].schoolID = 2;
      property['class_9'] = {};     property['class_9'].className = 'Archimedes 1';     property['class_9'].schoolID = 2;
      property['class_10'] = {};    property['class_10'].className = 'Euler 2';         property['class_10'].schoolID = 2;
      property['class_11'] = {};    property['class_11'].className = 'Gauss 2';         property['class_11'].schoolID = 2;
      property['class_12'] = {};    property['class_12'].className = 'Newton 2';        property['class_12'].schoolID = 2;
      property['class_13'] = {};    property['class_13'].className = 'Pythagoras 2';    property['class_13'].schoolID = 2;
      property['class_14'] = {};    property['class_14'].className = 'Archimedes 2';    property['class_14'].schoolID = 2;

      var exclusionList = ['progress', 'withParent'];

      for(var rowLabel in summaryTable) {
        for (var classID = 5; classID < 14; classID++) {
          var nodeList = [];

          for (var colLabel in summaryTable[rowLabel]) {
            if (colLabel.indexOf('student_') < 0 || property[colLabel].classID != classID) continue;
            var cellSummary = summaryTable[rowLabel][colLabel].summary;
            //if (!cellSummary) console.log('no summary?! '+ rowLabel + '   ' + colLabel);

            nodeList.push(cellSummary);
          }

          if (nodeList.length > 0) {
            if (rowLabel.indexOf('_question_') > 0 || rowLabel.indexOf('_video_') > 0) {
              summaryTable[rowLabel]['class_'+classID] = aggregateVideoQuestion(nodeList, ['withParent']);
            } else {
              summaryTable[rowLabel]['class_'+classID] = aggregate(nodeList, exclusionList);
            }
          }
        }
      }

      var schoolID = 2;
      for (var rowLabel in summaryTable) {
        var nodeList = [];
        
        for (var colLabel in summaryTable[rowLabel]) {
          if (colLabel.indexOf('class_') < 0 || property[colLabel].schoolID != schoolID) continue;
          var cellSummary = summaryTable[rowLabel][colLabel];
          //if (!cellSummary) console.log('no summary?! '+ rowLabel + '   ' + colLabel);
          nodeList.push(cellSummary);
        }

        if (rowLabel.indexOf('_question_') > 0 || rowLabel.indexOf('_video_') > 0) {
          summaryTable[rowLabel]['school_'+schoolID] = aggregateVideoQuestion(nodeList, ['withParent']);
        } else {
          summaryTable[rowLabel]['school_'+schoolID] = aggregate(nodeList, exclusionList);
        }
      }

      summarizequestion_finisher();
    }

    function aggregateVideoQuestion(nodeList, exclusionList) {
      var summary = {};
      summary.number = 0;

      for(var i = 0; i < nodeList.length; i++) {
        var node = nodeList[i];

        for (var mainattr in node) {
          if (exclusionList && exclusionList.indexOf(mainattr) > -1) continue;
          if (mainattr == 'number') {
            summary.number += node[mainattr];
          } else if (node[mainattr] === null) {
            continue;
          } else if (typeof node[mainattr] == 'object') {
            if (!summary[mainattr]) {
              summary[mainattr] = {};
            }
            for (var subattr in node[mainattr]) {
              if (!summary[mainattr][subattr]) {
                summary[mainattr][subattr] = node[mainattr][subattr] * node.number? node[mainattr][subattr] * node.number : 0 ;
              } else {
                summary[mainattr][subattr] += node[mainattr][subattr] * node.number? node[mainattr][subattr] * node.number : 0;
              }
            }
          } else {
            if (!summary[mainattr]) {
              summary[mainattr] = node[mainattr] * node.number ? node[mainattr] * node.number : 0;
            } else {
              summary[mainattr] += node[mainattr] * node.number ? node[mainattr] * node.number: 0;
            }
          }
        }
      }

      for (var mainattr in summary) {
        if (mainattr == 'number') continue;
        if (summary[mainattr] === null) continue;
        if (typeof summary[mainattr] == 'object') {
          for (var subattr in summary[mainattr]) {
            summary[mainattr][subattr] = 1.0 * summary[mainattr][subattr] / summary.number;
          }
        } else {
          summary[mainattr] = 1.0 * summary[mainattr] / summary.number;
        }
      }

      return summary;
    }

    function aggregate(nodeList, exclusionList, maxList) {
      var summary = {};
      var mainattrCount = {};
      for(var i = 0; i < nodeList.length; i++) {
        var node = nodeList[i];

        for(var mainattr in node) {
          if (exclusionList && exclusionList.indexOf(mainattr) > -1) continue;
          if (maxList && maxList.indexOf(mainattr) > -1) {
            if (!summary[mainattr] || (summary[mainattr]<node[mainattr]) ) {
              summary[mainattr] = node[mainattr];
            }
          }
          if (typeof node[mainattr] == 'object') {
            if (!mainattrCount[mainattr]) {
              mainattrCount[mainattr] = node[mainattr].number;
            } else {
              mainattrCount[mainattr] += node[mainattr].number;
            }
            if (!summary[mainattr]) {
              summary[mainattr] = {};
            }

            for (var subattr in node[mainattr]) {
              if (subattr == 'number') continue;
              if (node[mainattr][subattr] === null) continue;
              if (typeof node[mainattr][subattr] == 'object') {
                if (!summary[mainattr][subattr]) {
                  summary[mainattr][subattr] = {};
                }
                for (var leafattr in node[mainattr][subattr]) {
                  if (!summary[mainattr][subattr][leafattr]) {
                    summary[mainattr][subattr][leafattr] = node[mainattr][subattr][leafattr] * node[mainattr].number ? node[mainattr][subattr][leafattr] * node[mainattr].number : 0;
                  } else {
                    summary[mainattr][subattr][leafattr] += node[mainattr][subattr][leafattr] * node[mainattr].number ? node[mainattr][subattr][leafattr] * node[mainattr].number : 0;
                  }
                }
              } else {
                if (!summary[mainattr][subattr]) {
                  summary[mainattr][subattr] = node[mainattr][subattr] * node[mainattr].number ? node[mainattr][subattr] * node[mainattr].number : 0;
                } else {
                  summary[mainattr][subattr] += node[mainattr][subattr] * node[mainattr].number ? node[mainattr][subattr] * node[mainattr].number : 0;
                }
              }
            }

          } else {
            if (!summary[mainattr]) {
              summary[mainattr] = node[mainattr] ? node[mainattr] : 0;
            } else {
              summary[mainattr] += node[mainattr] ? node[mainattr] : 0;
            }
          }
        }
      }

      for (var mainattr in summary) {
        if (summary[mainattr] === null) continue;
        if (maxList && maxList.indexOf(mainattr) > -1) continue;
        if (typeof summary[mainattr] == 'object') {
          for (var subattr in summary[mainattr]) {
            if (subattr == 'number') continue;
            if (summary[mainattr][subattr] === null) continue;
            if (typeof summary[mainattr][subattr] == 'object') {
              for (var leafattr in summary[mainattr][subattr]) {
                summary[mainattr][subattr][leafattr] = 1.0 * summary[mainattr][subattr][leafattr] / mainattrCount[mainattr];
              }
            } else {
              summary[mainattr][subattr] = 1.0 * summary[mainattr][subattr] / mainattrCount[mainattr];
            }
          }
          summary[mainattr].number = mainattrCount[mainattr];
        }
      }

      return summary;
    }

    function summarizequestion_finisher() {
      storage.setItemSync('summaryTable', summaryTable);
      storage.setItemSync('propertyList', property);
      sendResponse('done');
    }

  },
  // retrive student node
  "/api/retrieve": function(parsedUrl) {
    var studentID = parsedUrl.query.studentID;
    var schoolID = parsedUrl.query.schoolID;
    var studentNode, students, i;

    if(studentID) {
      studentNode = storage.getItemSync('student_'+studentID);
      if (studentNode) {
        sendResponse(studentNode);
      } else {
        sendResponse("no student with id: "+studentID);
      }
    } else if(schoolID){
      students = [];
      for(i = 0; i< operational.students.length; i++) {
        studentNode = storage.getItemSync('student_'+operational.students[i]);
        if (!studentNode || studentNode.schoolID != schoolID) {
          continue;
        }
        students.push(studentNode);
      }
      sendResponse(students);
    } else {
      students = [];
      for(i = 0; i< operational.students.length; i++) {
        studentNode = storage.getItemSync('student_'+operational.students[i]);
        if (!studentNode) {
          continue;
        }
        students.push(studentNode);
      }
      sendResponse(students);
    }

    return {};
  },
  "/api/retrieveSummary": function(parsedUrl) {
    var fieldLabel = parsedUrl.query.field;
    var objectLabel = parsedUrl.query.object;
    //var item = parsedUrl.query.item;

    var fieldLabels;
    var objectLabels;
    if (fieldLabel)
      fieldLabels = fieldLabel.split(',');
    if (objectLabel)
      objectLabels = objectLabel.split(',');

    //var items = item.split(',');

    if (!summaryTable) {
      summaryTable = storage.getItemSync('summaryTable');
    }

    var table = {};

    var verifiedColLabel = [];

    for (var rowLabel in summaryTable) {
      if (fieldLabel) {
        var matched = false;

        for (var i = 0; i<fieldLabels.length; i++) {
          if (rowLabel.indexOf(fieldLabels[i]) == 0) {
            matched = true;
          }
        }

        // the rowLabel is not one of the field labels, so go to next rowLabel
        if (!matched) continue;
      }

      // if the program reaches here, then the rowLabel is one of the requested
      table[rowLabel] = {};

      if (verifiedColLabel.length == 0) {
        for (var colLabel in summaryTable[rowLabel]) {
          if (objectLabel) {
            for (var i = 0; i<objectLabels.length; i++) {
              if (colLabel.indexOf(objectLabels[i]) == 0) {
                verifiedColLabel.push(colLabel);
              }
            }
          } else {
            verifiedColLabel.push(colLabel);
          }
        }

        if (verifiedColLabel.length == 0) {
          sendResponse({});
          console.log('no valid object!');
          return;
        }
      }

      for (var i = 0; i<verifiedColLabel.length; i++) {
        table[rowLabel][verifiedColLabel[i]] = summaryTable[rowLabel][verifiedColLabel[i]];
      }
    }

    sendResponse(table);
  },
  "/api/getTable": function() {
    if (!summaryTable) {
      summaryTable = storage.getItemSync('summaryTable');
    }
    sendResponse(summaryTable);
  },
  "/api/clear": function() {
    storage.clearSync();
    sendResponse('done!');
  }
};

var currentSubjectNode;
var currentSessionNode;
var currentActivityNode;
var activityStart;
var activityEnd;
var currentEventTimeStamp;

var videoDuration = {
  '68ihQ9jQOM8':73,
  'Jowey_prtVM':86,
  'pjjSp46ffjQ':48,
  'bwm5pv3UiYE':75,
  'LlFw4UPv4L4':81,

  'Jx9mtdx-7aQ':48,
  'jcc0WBVtO90':73,
  '0lf0YACerzY':81,
  'bDXedeH-Bpo':75,
  'zJUaLHvLP6s':86
};

function processStudentLog(studentNode) {
  if (!studentNode) {
    console.error('student node is undefined!');
    return;
  }

  for (var subjectKey in studentNode.subjects) {
    currentSubjectNode = studentNode.subjects[subjectKey];
    // if (currentSubjectNode.progress <= 1) {
    //   return;
    // }
    if (!currentSubjectNode.sessions) { // somehow student with no actions came to further progress (e.g, studentID = 257)
      currentSubjectNode.progress = 1;
      return;
    }
    currentSubjectNode.sessions.forEach(function(_sessionNode){

      currentSessionNode = _sessionNode;
      currentSessionNode.activities.forEach(function(_activity){

        currentActivityNode = _activity;
        activityStart = null;
        activityEnd = null;
        currentEventTimeStamp = null;

        currentActivityNode.offTask = {};
        currentActivityNode.offTask.instances = [];
        currentActivityNode.offTask.totalduration = 0;
        var offTaskIndex = -1;

        currentActivityNode.videos = {};
        var currentVideoNode = null;
        var currentVideoID = '';
        var currentVideoPlayTime = 0;
        var currentVideoStartTime = 0;
        var previousPlayTime = 0;
        var previousStartTime = 0;

        currentActivityNode.questions = [];
        var currentQuestionNode = null;
        var currentQuestionID = '';
        var currentQuestionReadNode = null; // read node is special as there is no action that actually logged for this period. the only practice is that after starting a question, until the first action is made, is the reading period
        var currentQuestionSelectedOperator = '';

        var tailNode;
        var sequenceNode;

        currentActivityNode.events.forEach(function(_event){
          currentEventTimeStamp = new Date(_event.time);
          // general 
          if (_event.actionType == 'start') {
            activityStart = new Date(_event.time);
            return;
          }

          if (activityStart === null) {
            activityStart = currentEventTimeStamp;
          }

          // with parent check
          if (_event.action == 'with_parent') {
            currentSessionNode.withParent = (_event.target1 == 'true');
            return;
          }

          if (_event.actionType == 'pageActivity') {
            if (_event.action == 'leave_page') {
              offTaskIndex ++;
              currentActivityNode.offTask.instances[offTaskIndex] = {};
              currentActivityNode.offTask.instances[offTaskIndex].startTime = new Date(_event.time);
              currentActivityNode.offTask.instances[offTaskIndex].duration = -1;
            } else if (_event.action == 'alt_page') {
              if (offTaskIndex < 0 || currentActivityNode.offTask.instances[offTaskIndex].duration >= 0) {
                offTaskIndex ++;
                currentActivityNode.offTask.instances[offTaskIndex] = {};
                currentActivityNode.offTask.instances[offTaskIndex].startTime = new Date(_event.time - _event.duration);
              }
              currentActivityNode.offTask.instances[offTaskIndex].duration = _event.duration;
              currentActivityNode.offTask.totalduration += _event.duration;
            }
            return;
          }

          // all the video stuff comes here
          if (_event.actionType == "mouseClick" && startWith(_event.action, "video_") ) {
            if (_event.action == 'video_start') {
              if (currentVideoID !=  _event.target1) { // new video play
                currentVideoID = _event.target1;
                currentVideoPlayTime = Number(_event.target2);
                currentVideoStartTime = new Date(_event.time);
                currentVideoNode = {};
                currentVideoNode.activeDuration = 0;
                currentVideoNode.playedIntervals = [];
                currentVideoNode.pauses = [];

                currentVideoNode.playedIntervals.push({start:currentVideoPlayTime, end:null});

                if (!currentActivityNode.videos[currentVideoID]) {
                  currentActivityNode.videos[currentVideoID] = [];
                }
                currentActivityNode.videos[currentVideoID].push(currentVideoNode);

              } else { // seek to another location/pause then resume
                currentVideoPlayTime = Number(_event.target2);
                
                if (currentVideoNode.playedIntervals[currentVideoNode.playedIntervals.length-1].end === null) { // calculate previous played interval
                  currentVideoNode.playedIntervals[currentVideoNode.playedIntervals.length-1].end = previousPlayTime + ((new Date(_event.time)).getTime() - previousStartTime.getTime())/1000 ;
                }

                currentVideoNode.playedIntervals.push({start:currentVideoPlayTime, end:null});

                // if it is a resume after pause
                if (currentVideoNode.pauses.length > 0 && currentVideoNode.pauses[currentVideoNode.pauses.length-1].end === null)
                  currentVideoNode.pauses[currentVideoNode.pauses.length-1].end = new Date(_event.time);
              }

              previousStartTime = new Date(_event.time);
              previousPlayTime = Number(_event.target2);

            } else if (_event.action == 'video_end') {
              if (!currentVideoNode) return;

              if (_event.duration < 100)  // the active duration is somehow wrong
                currentVideoNode.activeDuration = (new Date(_event.time)).getTime() - currentVideoStartTime.getTime();
              else
                currentVideoNode.activeDuration = _event.duration;
              currentVideoNode.playedIntervals[currentVideoNode.playedIntervals.length-1].end = videoDuration[_event.target1];
              currentVideoID = '';
            } else if (_event.action == 'video_pause') {

              if (currentVideoID !=  _event.target1) { // new video node, if the video is paused on start
                currentVideoID = _event.target1;
                currentVideoPlayTime = Number(_event.target2);
                currentVideoStartTime = new Date(_event.time);
                currentVideoNode = {};
                currentVideoNode.activeDuration = 0;
                currentVideoNode.playedIntervals = [];
                currentVideoNode.pauses = [];

                currentVideoNode.playedIntervals.push({start:currentVideoPlayTime, end:null});

                if (!currentActivityNode.videos[currentVideoID])
                  currentActivityNode.videos[currentVideoID] = [];
                currentActivityNode.videos[currentVideoID].push(currentVideoNode);

              }

              var pauseNode = {};
              pauseNode.start = new Date(_event.time);
              pauseNode.end = null;
              pauseNode.at = Number(_event.target2);
              currentVideoNode.pauses.push(pauseNode);

            // } else if (_event.action == 'video_replay') {
            //   if (currentVideoID !=''){ // by any chance that the video didn't end properly
            //   }

            } else if (_event.action == 'video_stop') {
              if (currentVideoID !== '') { // video_end didn't fire
                currentVideoNode.activeDuration = (new Date(_event.time)).getTime() - currentVideoStartTime.getTime();
                currentVideoNode.playedIntervals[currentVideoNode.playedIntervals.length-1].end = videoDuration[_event.target1];
                currentVideoID = '';
              }

            // } else if (_event.action == 'video_select') {
            // } else if (_event.action == 'video_next_phase') {

            }

            return;
          } // end of video events

          if (currentActivityNode.activityID == 5 && _event.action == 'qnsStart') {
             // identical with line below
            if (currentQuestionID !== '') { // there is a question node exist, can do some statistics here
              currentQuestionNode.endTime = new Date(_event.time);
              currentQuestionNode.duration = currentQuestionNode.endTime.getTime() - currentQuestionNode.startTime.getTime();
              currentQuestionID = '';
              if (currentQuestionReadNode) {
                currentQuestionReadNode.endTime = new Date(_event.time);
                currentQuestionReadNode.duration = currentQuestionReadNode.endTime.getTime() - currentQuestionReadNode.startTime.getTime();
                currentQuestionNode.sequence.push(currentQuestionReadNode);
                currentQuestionReadNode = null;
              }
            }
            return;
          }

          // ----------------- questions ----------------- //
          if (currentQuestionID == 'temp' &&
            !startWith(_event.action, "instruction_") &&
            !startWith(_event.action, "select_well-done") &&
            _event.action != 'start_step' ) {
            currentQuestionID = _event.target1;
            currentQuestionNode.id = currentQuestionID;
          }

          // new question
          if ((currentQuestionID != _event.target1 &&         // to check for questionID rather than use 'qnsStart', the reason is that 'qnsStart' might not exist
            !startWith(_event.action, "instruction_") &&    // these are the stupid ones that don't have the questionID
            !startWith(_event.action, "select_well-done") &&
            (_event.action != 'start_step') || (_event.action == 'start_step' && currentQuestionID === '')) ) {
            
            if (currentQuestionID !== '') { // there is a question node exist, can do some statistics here
              currentQuestionNode.endTime = new Date(_event.time);
              currentQuestionNode.duration = currentQuestionNode.endTime.getTime() - currentQuestionNode.startTime.getTime();
              currentQuestionID = '';
              if (currentQuestionReadNode) { // identical with line 533 !!!!!!!!!!!!!
                currentQuestionReadNode.endTime = new Date(_event.time);
                currentQuestionReadNode.duration = currentQuestionReadNode.endTime.getTime() - currentQuestionReadNode.startTime.getTime();
                currentQuestionNode.sequence.push(currentQuestionReadNode);
                currentQuestionReadNode = null;
              }
            }

            if (_event.action == 'start_step' && _event.target1 == '0') {
              currentQuestionID = 'temp';
            } else {
              currentQuestionID = _event.target1;
            }
            currentQuestionNode = {};
            currentQuestionNode.id = currentQuestionID;
            currentQuestionNode.startTime = new Date(_event.time);
            currentQuestionNode.sequence = [];
            currentQuestionReadNode = {};
            currentQuestionReadNode.label = 'R';
            currentQuestionReadNode.startTime = new Date(_event.time);
            currentQuestionReadNode.endTime = null;

            currentActivityNode.questions.push(currentQuestionNode);
          }

          // pattern labels:
          // V  - instruction video
          // S  - start
          // R  - read
          // I  - identify
          // G  - get a plan
          // H  - have it done
          // T  - triple check
          // A  - write/choose an answer but haven't commit
          // AC - submit answer correctly
          // AW - submit answer wrongly
          // !!! don't have CA - correct and progress to next activity
          // !!! don't have CP - correct and go to next question
          // CM - practive more on this activity
          // WR - wrong and retry
          // WH - wrong and want hint
          // WI - wrong and ignore
          // L, LR, LI, LG, LH, LT : click on the checklist

          if (_event.action == 'qnsStart') {
            sequenceNode = {};
            sequenceNode.label = 'S';
            sequenceNode.time = new Date(_event.time);
            currentQuestionNode.sequence.push(sequenceNode);
            sequenceNode = null;
            return;
          }

          if (currentQuestionReadNode) { // got identical code above
            currentQuestionReadNode.endTime = new Date(_event.time);
            currentQuestionReadNode.duration = currentQuestionReadNode.endTime.getTime() - currentQuestionReadNode.startTime.getTime();
            currentQuestionNode.sequence.push(currentQuestionReadNode);
            currentQuestionReadNode = null;
          }

          // watched the instruction video for the activity
          // it is logged after the qnsStart, but actually should be before
          // manually change it here
          if (startWith(_event.action, "instruction_")) {
            var lastNode = currentQuestionNode.sequence.pop();
            sequenceNode = {};
            sequenceNode.label = 'V';

            if (lastNode.label == 'S') {
              sequenceNode.time = lastNode.time;
              lastNode.time = new Date(_event.time);
              sequenceNode.duration = sequenceNode.time.getTime() - lastNode.time.getTime();
              currentSubjectNode.sequence.push(sequenceNode);
              currentSubjectNode.sequence.push(lastNode);
            } else {
              currentQuestionNode.sequence.push(lastNode);
              sequenceNode.time = new Date(_event.time);
              currentQuestionNode.sequence.push(sequenceNode);
            }
            sequenceNode = null;
            return;
          }

          if ((startWith(_event.action, 'progress_') ||
            _event.action == 'start_step')) {

            sequenceNode = {};
            sequenceNode.time = new Date(_event.time);

            if (_event.action == 'start_step') {
              switch (_event.target1) {
                // case '0':
                //   break;
                case '1':
                  sequenceNode.label = 'LR';
                  break;
                case '2':
                  sequenceNode.label = 'LI';
                  break;
                case '3':
                  sequenceNode.label = 'LG';
                  break;
                case '4':
                  sequenceNode.label = 'LH';
                  break;
                case '5':
                  sequenceNode.label = 'LT';
                  break;
              }
            } else {
              sequenceNode.label = 'L';
            }

            currentQuestionNode.sequence.push(sequenceNode);
            sequenceNode = null;
            return;
          }

          if (_event.action == 'highlight' || _event.action == 'de-highlight') {
            tailNode = currentQuestionNode.sequence[currentQuestionNode.sequence.length-1];
            if (tailNode.label == 'I') { // append the current event to it
              tailNode.highlightedWords.push({time:new Date(_event.time), word:_event.target2, highlight: _event.action == 'highlight'});
            } else {
              if (tailNode.startTime && typeof tailNode.endTime == 'object' && !tailNode.endTime) { // properly complete the last node
                tailNode.endTime = new Date(_event.time);
                tailNode.duration = tailNode.endTime.getTime() - tailNode.startTime.getTime();
              }
              // create new node and push to sequence
              sequenceNode = {};
              sequenceNode.label = 'I';
              sequenceNode.startTime = new Date(_event.time);
              sequenceNode.endTime = null;
              sequenceNode.highlightedWords = [];
              sequenceNode.highlightedWords.push({time:new Date(_event.time), word:_event.target2, highlight: _event.action == 'highlight'});
              currentQuestionNode.sequence.push(sequenceNode);
              sequenceNode = null;
            }
            
            tailNode = null;
            return;
          }

          // get plan events
          if (startWith(_event.action, 'select_modal') ) {
            tailNode = currentQuestionNode.sequence[currentQuestionNode.sequence.length-1];
            if (tailNode.label != 'G') {
              if (tailNode.startTime && typeof tailNode.endTime == 'object' && !tailNode.endTime) {
                tailNode.endTime = new Date(_event.time);
                tailNode.duration = tailNode.endTime.getTime() - tailNode.startTime.getTime();
              }

              sequenceNode = {};
              sequenceNode.label = 'G';
              sequenceNode.startTime = new Date(_event.time);
              sequenceNode.endTime = null;
              sequenceNode.select_type = ['addition'];
              sequenceNode.select_model = [];
              sequenceNode.selectedModel = null;

              currentQuestionNode.sequence.push(sequenceNode);
              tailNode = sequenceNode;
              sequenceNode = null;
            }

            if (_event.action == 'select_modal') {
              tailNode = null;
              return;
            }

            if (tailNode.label != 'G') {
              throw "WTF???";
              // console.log('missing select_modal !!!' + _event.actionType + ' ' + _event.action);
              // return;
            }

            if (startWith(_event.action, 'select_modal_choose_type')) {
              tailNode.select_type.push(_event.action.substr(25));
              tailNode = null;
              return;
            }

            if (startWith(_event.action, 'select_modal_click')) {
              tailNode.select_model.push(_event.action.substr(25));
              tailNode = null;
              return;
            }

            if (startWith(_event.action, 'select_modal_complete')) {
              tailNode.endTime = new Date(_event.time);
              tailNode.duration = tailNode.endTime.getTime() - tailNode.startTime.getTime();
              tailNode.selectedModel = _event.action.substr(28);
              switch (tailNode.selectedModel.substr(0, 1)) {
                case 'A':
                  currentQuestionSelectedOperator = '+';
                  break;
                case 'S':
                  currentQuestionSelectedOperator = '-';
                  break;
                case 'M':
                  currentQuestionSelectedOperator = '*';
                  break;
                case 'D':
                  currentQuestionSelectedOperator = '/';
                  break;
                default:
                  throw 'What?? I dont know this ' + tailNode.selectedModel;
              }
              tailNode = null;
              return;
            }

            if (startWith(_event.action, 'select_modal_cancel')) {
              tailNode = null;
              return;
            }

            throw 'what? have more select_modal??? '+_event.actionType + ' ' + _event.action + ' ' + _event.target1;

          }

          // have it done event
          if (_event.action == 'drag' ||
            _event.action == 'drop' ||
            _event.action == 'label' ||
            startWith(_event.action, 'equation_')) {

            tailNode = currentQuestionNode.sequence[currentQuestionNode.sequence.length-1];
            if (tailNode.label != 'H') {
              if (tailNode.startTime && typeof tailNode.endTime == 'object' && !tailNode.endTime) { // properly close the previous phase
                tailNode.endTime = new Date(_event.time);
                tailNode.duration = tailNode.endTime.getTime() - tailNode.startTime.getTime();
              }
              sequenceNode = {};
              sequenceNode.label = 'H';
              sequenceNode.startTime = new Date(_event.time);
              sequenceNode.endTime = null;
              sequenceNode.dragDrops = [];
              sequenceNode.labels = [];
              sequenceNode.equationElements = [];
              currentQuestionNode.sequence.push(sequenceNode);
              sequenceNode = null;
            }
            sequenceNode = currentQuestionNode.sequence[currentQuestionNode.sequence.length-1];
            if (_event.action == 'drag') {
              sequenceNode.dragDrops.push('drag_'+_event.target2);
            } else if (_event.action == 'drop') {
              sequenceNode.dragDrops.push('drop_'+_event.target2+'_'+_event.correct);
            } else if (_event.action == 'label') {
              sequenceNode.labels.push(_event.correct);
            } else if (_event.action.length > 9) { // filtered out some stupid equation_ entries
              sequenceNode.equationElements.push(_event.action.substr(9)+'_'+_event.correct);
            } else {
              if (_event.action == 'equation_') {
                return;
              }
              throw 'what? still have???' + _event.actionType + ' ' + _event.action + ' ' + _event.target1;
            }
            sequenceNode = null;
            tailNode = null;
            return;
          }

          if (_event.action == 'mcq_select' || _event.action == 'answer') {
            tailNode = currentQuestionNode.sequence[currentQuestionNode.sequence.length-1];
            if (tailNode.label != 'A') {
              if (tailNode.startTime && typeof tailNode.endTime == 'object' && !tailNode.endTime) {
                tailNode.endTime = new Date(_event.time);
                tailNode.duration = tailNode.endTime.getTime() - tailNode.startTime.getTime();
              }
              sequenceNode = {};
              sequenceNode.label = 'A';
              sequenceNode.startTime = new Date(_event.time);
              sequenceNode.endTime = null;
              sequenceNode.answers = [];
              currentQuestionNode.sequence.push(sequenceNode);
              sequenceNode = null;
            }
            sequenceNode = currentQuestionNode.sequence[currentQuestionNode.sequence.length-1];
            sequenceNode.answers.push(_event.correct);
            currentQuestionNode.sequence.push(sequenceNode);
            sequenceNode = null;
            tailNode = null;
            return;
          }

          if (_event.actionType == 'submission') {
            tailNode = currentQuestionNode.sequence[currentQuestionNode.sequence.length-1];
            if (tailNode.startTime && typeof tailNode.endTime == 'object' && !tailNode.endTime) {
              tailNode.endTime = new Date(_event.time);
              tailNode.duration = tailNode.endTime.getTime() - tailNode.startTime.getTime();
            }
            tailNode = null;

            sequenceNode = {};
            
            if (_event.action == 'tut_equation') {
              sequenceNode.label = 'EQ'
              var equation = _event.target2;
              equation = equation.replace('Ã·', '/');
              equation = equation.replace(' ', currentQuestionSelectedOperator);
              sequenceNode.equation = equation;
            } else {
              sequenceNode.label = _event.correct ? 'AC' : 'AW';  
            }
            currentQuestionNode.sequence.push(sequenceNode);
            sequenceNode = null;
            return;
          }

          if (_event.actionType == 'end' && _event.action) { // for all practices, the end is not end of the activity, but the end of one question
            tailNode = currentQuestionNode.sequence[currentQuestionNode.sequence.length-1];
            if (tailNode.startTime && typeof tailNode.endTime == 'object' && !tailNode.endTime) {
              tailNode.endTime = new Date(_event.time);
              tailNode.duration = tailNode.endTime.getTime() - tailNode.startTime.getTime();
            }
            tailNode = null;

            sequenceNode = {};
            sequenceNode.time = new Date(_event.time);
            if (_event.action == 'review') {
              sequenceNode.label = 'WR';
            } else if (_event.action == 'ignore_error') {
              sequenceNode.label = 'WI';
            } else if (_event.action == 'show_hint') {
              sequenceNode.label = 'WH';
            } else {
              throw "what??? stil have end event?";
            }
            currentQuestionNode.sequence.push(sequenceNode);
            sequenceNode = null;
            return;
          }

          if (startWith(_event.action, 'select_well-done_')) {
            tailNode = currentQuestionNode.sequence[currentQuestionNode.sequence.length-1];
            if (tailNode.startTime && typeof tailNode.endTime == 'object' && !tailNode.endTime) {
              tailNode.endTime = new Date(_event.time);
              tailNode.duration = tailNode.endTime.getTime() - tailNode.startTime.getTime();
            }
            tailNode = null;

            sequenceNode = {};
            sequenceNode.time = new Date(_event.time);
            if (_event.target1 == 'next activity') {
              sequenceNode.label = 'CA';
            } else if (_event.target1 == 'practice more') {
              sequenceNode.label = 'CM';
            }
            currentQuestionNode.sequence.push(sequenceNode);
            sequenceNode = null;
            return;
          }

          if (_event.actionType == 'end' || _event.actionType == 'stop') { // only for video
            activityEnd = new Date(_event.time);

            // by any change there is no end indicator for video
            if (currentVideoID !== '') {
              currentVideoNode.activeDuration = (new Date(_event.time)).getTime() - currentVideoStartTime.getTime();

              if (currentVideoNode.playedIntervals.length > 0 && currentVideoNode.playedIntervals[currentVideoNode.playedIntervals.length-1].end === null)
                currentVideoNode.playedIntervals[currentVideoNode.playedIntervals.length-1].end = videoDuration[currentVideoID];
              if (currentVideoNode.pauses.length > 0 && currentVideoNode.pauses[currentVideoNode.pauses.length-1].end === null) // don't need to check for pause end for the "video_end" and "video_stop" as there won't be cases that video is being paused while the two events are triggered
                currentVideoNode.pauses[currentVideoNode.pauses.length-1].end = new Date(_event.time);

              currentVideoID = '';
            }

            return;
          }

          throw 'what? still have???'+ _event.actionType + ' ' + _event.action;
        });
        // end of events

        // by any chance there is no end
        if (activityEnd === null) {

          if (currentQuestionNode && currentQuestionNode.sequence) {
            tailNode = currentQuestionNode.sequence[currentQuestionNode.sequence.length-1];
            if (tailNode.startTime && typeof tailNode.endTime == 'object' && !tailNode.endTime) { // properly close the previous phase
              tailNode.endTime = currentEventTimeStamp;
              tailNode.duration = tailNode.endTime.getTime() - tailNode.startTime.getTime();
            }
            tailNode = null;
          }

          activityEnd = currentEventTimeStamp;
        }

        // cleanup the sequence node, there might be duplication for answer sequencenode
        for (var questionIndex = 0; questionIndex < currentActivityNode.questions.length; questionIndex++) {
          var questionNode = currentActivityNode.questions[questionIndex];
          if (!questionNode.id && (questionNode.duration <= 0 || !questionNode.duration)) {
            continue;
          }
          var duplicatedIndex = [];
          for (var sequenceIndex = 0; sequenceIndex < questionNode.sequence.length - 1; sequenceIndex++) {
            if (questionNode.sequence[sequenceIndex].label == 'A') {
              sequenceNode = questionNode.sequence[sequenceIndex];
              var nextNode = questionNode.sequence[sequenceIndex+1];
              if (nextNode.label == 'A' && nextNode.startTime == sequenceNode.startTime && nextNode.endTime == sequenceNode.endTime) {
                duplicatedIndex.push(sequenceIndex+1);
              }
            }
          }
          for (var di = 0; di<duplicatedIndex.length; di++) {
            questionNode.sequence.splice(duplicatedIndex[di],1);
          }
        }

        currentActivityNode.start = activityStart;
        currentActivityNode.end = activityEnd;
        currentActivityNode.duration = activityEnd.getTime() - activityStart.getTime();

        // further summary for the currentActivityNode
        // video
        for (var videoID in currentActivityNode.videos) {
          var videoNode = currentActivityNode.videos[videoID];

          var tempPlayedInterval = [];
          // this videoNode is for the video(sum of multiple play times)
          videoNode.pauses = [];
          videoNode.activeDuration = 0;

          for (var i = 0; i<videoNode.length; i++) {
            var video = videoNode[i];
            video.consolidatedIntervals = unionPlayedVideoIntervals(video.playedIntervals);
            video.watchedPercentage = video.consolidatedIntervals.playedLength/videoDuration[videoID];
            if (video.watchedPercentage > 0.99)
              video.watchedPercentage = 1;
            tempPlayedInterval.push.apply(tempPlayedInterval, video.consolidatedIntervals.intervals);
            videoNode.pauses.push.apply(videoNode.pauses, video.pauses);
            videoNode.activeDuration += video.activeDuration;
          }
          
          videoNode.watchedIntervals = unionPlayedVideoIntervals(tempPlayedInterval);
          videoNode.watchedPercentage = videoNode.watchedIntervals.playedLength / videoDuration[videoID];
          if (videoNode.watchedPercentage > 0.99)
            videoNode.watchedPercentage = 1;
        }

        // clean the activityNode.questions
        var nodetodelete = [];
        for (var questionIndex = 0; questionIndex < currentActivityNode.questions.length; questionIndex++) {
          var questionNode = currentActivityNode.questions[questionIndex];
          if (!questionNode.id) {
            if (questionIndex > 0) {
              var preNode = currentActivityNode.questions[questionIndex-1];
              for (var i_sq = 1; i_sq<questionNode.sequence.length; i_sq++) {
                preNode.sequence.push(questionNode.sequence[i_sq]);
              }
              nodetodelete.push(questionIndex);
            } else if (questionIndex < currentActivityNode.questions.length-1) {
              var afNode = currentActivityNode.questions[questionIndex+1];
              for (var i_sq = questionNode.sequence.length-1; i_sq>0; i_sq--) {
                afNode.sequence.splice(0, 0, questionNode.sequence[i_sq]);
              }
              nodetodelete.push(questionIndex);
            }
          }
        }
        for (var i_d = 0; i_d<nodetodelete.length; i_d++) {
          currentActivityNode.questions.splice(nodetodelete[i_d] - i_d,1);
        }

        nodetodelete = [];
        for (var questionIndex = 0; questionIndex < currentActivityNode.questions.length-1; questionIndex++) {
          if (nodetodelete.indexOf(questionIndex) > -1) continue;

          var questionNode = currentActivityNode.questions[questionIndex];
          if (questionNode.id == currentActivityNode.questions[questionIndex+1].id) {
            var untilIndex = questionIndex + 1;
            while (untilIndex < currentActivityNode.questions.length-1 && questionNode.id == currentActivityNode.questions[untilIndex + 1].id) {
              untilIndex++;
            }

            for (var i_mer = questionIndex + 1; i_mer <= untilIndex; i_mer++){
              var nextNode = currentActivityNode.questions[i_mer];
              if (nextNode.sequence[0].label != 'R') {
                questionNode.sequence.push(nextNode.sequence[0]);
              }
              for (var i_sq = 1; i_sq<nextNode.sequence.length; i_sq++) {
                questionNode.sequence.push(nextNode.sequence[i_sq]);
              }
              nodetodelete.push(i_mer);
            }
            questionNode.endTime = currentActivityNode.questions[untilIndex].endTime;
            questionNode.duration = (new Date(questionNode.endTime)).getTime() - (new Date(questionNode.startTime)).getTime();
          }
        }
        for (var i_d = 0; i_d<nodetodelete.length; i_d++) {
          currentActivityNode.questions.splice(nodetodelete[i_d] - i_d,1);
        }

        currentActivityNode.reinforcementTimes = 0;
        currentActivityNode.completed = false;
        currentActivityNode.questionSummary = {};
        currentActivityNode.questionSummary.number = 0;
        currentActivityNode.questionSummary.duration = 0;
        currentActivityNode.questionSummary.highlightedWords = 0;
        currentActivityNode.questionSummary.workout_planType = {};
        currentActivityNode.questionSummary.workout_planType.times = 0;
        currentActivityNode.questionSummary.workout_planType.correct = 0;
        currentActivityNode.questionSummary.workout_planType.submitTimes = 0;
        currentActivityNode.questionSummary.workout_planType.correctSubmitTimes = 0;
        currentActivityNode.questionSummary.workout_planModel = {};
        currentActivityNode.questionSummary.workout_planModel.times = 0;
        currentActivityNode.questionSummary.workout_planModel.correct = 0;
        currentActivityNode.questionSummary.workout_planModel.submitTimes = 0;
        currentActivityNode.questionSummary.workout_planModel.correctSubmitTimes = 0;
        currentActivityNode.questionSummary.workout_dragDrops = {};
        currentActivityNode.questionSummary.workout_dragDrops.incomplete_attempts = 0;
        currentActivityNode.questionSummary.workout_dragDrops.complete_attempts = 0;
        currentActivityNode.questionSummary.workout_dragDrops.correct_attampts = 0;
        currentActivityNode.questionSummary.workout_equation = {};
        currentActivityNode.questionSummary.workout_equation.times = 0;
        currentActivityNode.questionSummary.workout_equation.correct = 0;
        currentActivityNode.questionSummary.answer = {};
        currentActivityNode.questionSummary.answer.times = 0;
        currentActivityNode.questionSummary.answer.correct = 0;
        currentActivityNode.questionSummary.answer.submitTimes = 0;
        currentActivityNode.questionSummary.answer.correctSubmitTimes = 0;        
        currentActivityNode.questionSummary.answer.correctQuestions = 0;
        currentActivityNode.questionSummary.wrong_answer_reaction = {};
        currentActivityNode.questionSummary.wrong_answer_reaction.ignore = 0;
        currentActivityNode.questionSummary.wrong_answer_reaction.review = 0;
        currentActivityNode.questionSummary.wrong_answer_reaction.hint = 0;

        // question
        for (var questionIndex = 0; questionIndex < currentActivityNode.questions.length; questionIndex++) {
          var questionNode = currentActivityNode.questions[questionIndex];
          var questionData = questions[questionNode.id];
          if (!questionNode.id && (questionNode.duration <= 0 || !questionNode.duration)) {
            continue;
          }
          // if (!questionData) {
          //   throw ("where is the question?!?! id= " + questionNode.id);
          // }

          if (!questionNode.highlightedWords) {
            questionNode.highlightedWords = [];
          }

          if (!questionNode.workout_planType) {
            questionNode.workout_planType = {};
            questionNode.workout_planType.times = 0;
            questionNode.workout_planType.correctTimes = 0;
            questionNode.workout_planType.wrongTimes = 0;
            questionNode.workout_planType.final = null;
          }

          if (!questionNode.workout_planModel) {
            questionNode.workout_planModel = {};
            questionNode.workout_planModel.times = 0;
            questionNode.workout_planModel.correctTimes = 0;
            questionNode.workout_planModel.wrongTimes = 0;
            questionNode.workout_planModel.final = null;
          }

          if (!questionNode.workout_dragDrops) {
            questionNode.workout_dragDrops = {};
          }

          if (!questionNode.workout_label) {
            questionNode.workout_label = {};
            questionNode.workout_label.times = 0;
            questionNode.workout_label.correctTimes = 0;
            questionNode.workout_label.wrongTimes = 0;
            questionNode.workout_label.final = null;
          }

          if (!questionNode.workout_equation) {
            questionNode.workout_equation = {};
          }

          if (!questionNode.answer) {
            questionNode.answer = {};
            questionNode.answer.times = 0;
            questionNode.answer.correctTimes = 0;
            questionNode.answer.wrongTimes = 0;
            questionNode.answer.final = null;
            questionNode.answer.finalSubmit = null;
            questionNode.answer.submitTimes = 0;
            questionNode.answer.correctSubmitTimes = 0;
          }

          if (!questionNode.wrong_answer_reaction) {
            questionNode.wrong_answer_reaction = {};
            questionNode.wrong_answer_reaction.ignore = 0;
            questionNode.wrong_answer_reaction.review = 0;
            questionNode.wrong_answer_reaction.hint = 0;
          }

          for (var sequenceIndex = 0; sequenceIndex < questionNode.sequence.length; sequenceIndex++) {
            sequenceNode = questionNode.sequence[sequenceIndex];
            switch(sequenceNode.label) {
              case 'I':
                for (var keywordIndex = 0; keywordIndex < sequenceNode.highlightedWords.length; keywordIndex++) {
                  questionNode.highlightedWords.push(sequenceNode.highlightedWords[keywordIndex]);
                }
                break;
              case 'G':
                for (var typeIndex = 0; typeIndex<sequenceNode.select_type.length; typeIndex++){
                  questionNode.workout_planType.times ++;
                  if (questionData.type.substr(6,1).toLowerCase() == sequenceNode.select_type[typeIndex].substr(0,1)) {
                    questionNode.workout_planType.correctTimes ++;
                  } else {
                    questionNode.workout_planType.wrongTimes ++;
                  }
                }
                for (var modelIndex = 0; modelIndex<sequenceNode.select_model.length; modelIndex++){
                  questionNode.workout_planModel.times++;
                  if (questionData.type.substr(6).toLowerCase() == sequenceNode.select_model[modelIndex].toLowerCase()) {
                    questionNode.workout_planModel.correctTimes++;
                  } else {
                    questionNode.workout_planModel.wrongTimes++;
                  }
                }
                if (sequenceNode.selectedModel){
                  questionNode.workout_planType.final = sequenceNode.selectedModel.substr(0,1).toLowerCase();
                  questionNode.workout_planModel.final = sequenceNode.selectedModel;
                }
                break;
              case 'H':
                for (var dragDropIndex = 0; dragDropIndex<sequenceNode.dragDrops.length; dragDropIndex++) {
                  var dragDropObjectName = sequenceNode.dragDrops[dragDropIndex].split('_')[1];
                  var dragDropCase = questionNode.workout_dragDrops[dragDropObjectName];
                  if (!dragDropCase) {
                    dragDropCase = {};
                    dragDropCase.incomplete_attempts = 0;
                    dragDropCase.attempts = {};
                    dragDropCase.attempts.times = 0;
                    dragDropCase.attempts.correctTimes = 0;
                    dragDropCase.attempts.wrongTimes = 0;
                    dragDropCase.attempts.final = null;
                    questionNode.workout_dragDrops[dragDropObjectName] = dragDropCase;
                  }
                  if (sequenceNode.dragDrops[dragDropIndex].indexOf("drag_") === 0) { // it's a drag
                    dragDropCase.incomplete_attempts++;
                  } else {                                                            // it's a drop
                    if (sequenceNode.dragDrops[dragDropIndex-1] && sequenceNode.dragDrops[dragDropIndex-1].indexOf(dragDropObjectName)>0){
                      dragDropCase.incomplete_attempts--;
                    }
                    dragDropCase.attempts.times++;
                    dragDropCase.attempts.final = sequenceNode.dragDrops[dragDropIndex].split('_')[2] == 'true';
                    if (dragDropCase.attempts.final){
                      dragDropCase.attempts.correctTimes++;
                    } else {
                      dragDropCase.attempts.wrongTimes++;
                    }
                  }
                }
                for (var labelIndex = 0; labelIndex<sequenceNode.labels.length; labelIndex++) {
                  questionNode.workout_label.times++;
                  if (sequenceNode.labels[labelIndex] == 'true') {
                    questionNode.workout_label.correctTimes++;
                  } else {
                    questionNode.workout_label.wrongTimes++;
                  }
                }
                for (var eqIndex = 0; eqIndex<sequenceNode.equationElements.length; eqIndex++) {
                  var eqName = sequenceNode.equationElements[eqIndex].split('_')[0];
                  var eqObject = questionNode.workout_equation[eqName];
                  if (!eqObject) {
                    eqObject = {};
                    eqObject.times = 0;
                    eqObject.correctTimes = 0;
                    eqObject.wrongTimes = 0;
                    questionNode.workout_equation[eqName] = eqObject;
                  }
                  eqObject.times++;
                  if (sequenceNode.equationElements[eqIndex].split('_')[1]) {
                    eqObject.correctTimes++;
                  } else {
                    eqObject.wrongTimes++;
                  }
                }
                break;
              case 'A':
                for (var answerIndex = 0; answerIndex<sequenceNode.answers.length; answerIndex++) {
                  questionNode.answer.times++;
                  questionNode.answer.final = sequenceNode.answers[answerIndex];
                  if (sequenceNode.answers[answerIndex]) {
                    questionNode.answer.correctTimes++;
                  } else {
                    questionNode.answer.wrongTimes++;
                  }
                }
                break;
              case 'AC':
                questionNode.answer.submitTimes++;
                questionNode.answer.correctSubmitTimes++;
                questionNode.answer.finalSubmit = true;
                break;
              case 'AW':
                questionNode.answer.submitTimes++;
                questionNode.answer.finalSubmit = false;
                break;
              case 'CA':
                currentActivityNode.completed = true;
                break;
              case 'CM':
                currentActivityNode.reinforcementTimes++;
                currentActivityNode.completed = true;
                break;
              case 'WR':
                questionNode.wrong_answer_reaction.review++;
                break;
              case 'WI':
                questionNode.wrong_answer_reaction.ignore++;
                break;
              case 'WH':
                questionNode.wrong_answer_reaction.hint++;
                break;
            }
          }

          // update questionSummary
          currentActivityNode.questionSummary.number++;
          currentActivityNode.questionSummary.duration += parseInt(questionNode.duration);
          
          if (questionNode.highlightedWords) {
            for (var i_highlight = 0; i_highlight<questionNode.highlightedWords.length; i_highlight++) {
              if (questionNode.highlightedWords[i_highlight].highlight) {
                currentActivityNode.questionSummary.highlightedWords ++;    
              } else {
                currentActivityNode.questionSummary.highlightedWords --;
                if (currentActivityNode.questionSummary.highlightedWords < 0)
                  currentActivityNode.questionSummary.highlightedWords = 0;
              }
            }
          }
          
          if (questionNode.workout_planType) {
            currentActivityNode.questionSummary.workout_planType.times += parseInt(questionNode.workout_planType.times);
            currentActivityNode.questionSummary.workout_planType.correct += parseInt(questionNode.workout_planType.correctTimes);
            if (questionNode.workout_planType.final) {
              currentActivityNode.questionSummary.workout_planType.submitTimes++;
              //console.log('_' + questionNode.workout_planType.final +' vs '+ questionData.type.substr(6,1).toLowerCase());
              if (questionNode.workout_planType.final == questionData.type.substr(6,1).toLowerCase()) {
                currentActivityNode.questionSummary.workout_planType.correctSubmitTimes ++;
              }
            }
          }
          
          if (questionNode.workout_planModel) {
            currentActivityNode.questionSummary.workout_planModel.times += parseInt(questionNode.workout_planModel.times);
            currentActivityNode.questionSummary.workout_planModel.correct += parseInt(questionNode.workout_planModel.correctTimes);
            if (questionNode.workout_planModel.final) {
              currentActivityNode.questionSummary.workout_planModel.submitTimes++;
              //console.log('_' + questionNode.workout_planModel.final.toLowerCase() +' vs '+ questionData.type.substr(6).toLowerCase());
              if (questionNode.workout_planModel.final.toLowerCase() == questionData.type.substr(6).toLowerCase()) {
                currentActivityNode.questionSummary.workout_planModel.correctSubmitTimes ++;
              }
            }
          }

          if (questionNode.workout_dragDrops) {//} && questionNode.workout_dragDrops.fields) {
            for (var field in questionNode.workout_dragDrops) {
            //for (var i_ddf = 0; i_ddf<questionNode.workout_dragDrops.fields.length; i_ddf++) {
              currentActivityNode.questionSummary.workout_dragDrops.incomplete_attempts += parseInt(questionNode.workout_dragDrops[field].incomplete_attempts);
              currentActivityNode.questionSummary.workout_dragDrops.complete_attempts += parseInt(questionNode.workout_dragDrops[field].attempts.times);
              currentActivityNode.questionSummary.workout_dragDrops.correct_attampts += parseInt(questionNode.workout_dragDrops[field].attempts.correctTimes);
            }
          }

          if (questionNode.workout_equation) {
            //for (var i_eq = 0; i_eq<questionNode.workout_equation.length; i_eq++) {
            for (var field in questionNode.workout_equation) {
              currentActivityNode.questionSummary.workout_equation.times += parseInt(questionNode.workout_equation[field].times);
              currentActivityNode.questionSummary.workout_equation.correct += parseInt(questionNode.workout_equation[field].correctTimes);
            }
          }

          if (questionNode.answer) {
            currentActivityNode.questionSummary.answer.times += parseInt(questionNode.answer.times);
            currentActivityNode.questionSummary.answer.correct += parseInt(questionNode.answer.correctTimes);
            currentActivityNode.questionSummary.answer.submitTimes += parseInt(questionNode.answer.submitTimes);
            currentActivityNode.questionSummary.answer.correctSubmitTimes += parseInt(questionNode.answer.correctSubmitTimes);
            if (questionNode.answer.finalSubmit)
              currentActivityNode.questionSummary.answer.correctQuestions ++;
            // if (questionNode.answer.final !== null) {
            //   currentActivityNode.questionSummary.answer.submitTimes++;
            //   if (questionNode.answer.final) {
            //     currentActivityNode.questionSummary.answer.correctSubmitTimes ++;
            //   }
            // }
          }

          if (questionNode.wrong_answer_reaction) {
            currentActivityNode.questionSummary.wrong_answer_reaction.ignore += parseInt(questionNode.wrong_answer_reaction.ignore);
            currentActivityNode.questionSummary.wrong_answer_reaction.review += parseInt(questionNode.wrong_answer_reaction.review);
            currentActivityNode.questionSummary.wrong_answer_reaction.hint += parseInt(questionNode.wrong_answer_reaction.hint);
          }
          // end of updating questionSummary
        }

        // double verify the completeness
        if (!currentActivityNode.completed) {
          switch (currentActivityNode.activityID) {
            case 2:
              currentActivityNode.completed = currentActivityNode.videos && Object.keys(currentActivityNode.videos) && (Object.keys(currentActivityNode.videos).length == 3);
              break;
            case 6:
              currentActivityNode.completed = currentActivityNode.videos && Object.keys(currentActivityNode.videos) && (Object.keys(currentActivityNode.videos).length == 2);
              break;
            case 3:
            case 7:

            case 4:
            case 8:

            case 5:
            case 9:
              currentActivityNode.completed = (currentActivityNode.questionSummary.number >= 10);
              break;
            // case 4:
            // case 8:
            //   break;
            // case 5:
            // case 9:
            //   break;
          }
        }

        // progress
        switch (currentActivityNode.activityID) {
          case 2:
            if (currentActivityNode.videos && Object.keys(currentActivityNode.videos) && Object.keys(currentActivityNode.videos).length)
              currentActivityNode.progress = Object.keys(currentActivityNode.videos).length/3.0;
            else
              currentActivityNode.progress = 0;
            break;
          case 6:
            if (currentActivityNode.videos && Object.keys(currentActivityNode.videos) && Object.keys(currentActivityNode.videos).length)
              currentActivityNode.progress = Object.keys(currentActivityNode.videos).length/2.0;
            else
              currentActivityNode.progress = 0;
            break;
          case 3:
          case 7:
          case 4:
          case 8:
          case 5:
          case 9:
            if (currentActivityNode.questionSummary.answer.submitTimes > 0)
              currentActivityNode.progress = currentActivityNode.questionSummary.number / 10.0;
            else
              currentActivityNode.progress = 0;
            break;
        }
        if (currentActivityNode.progress > 1) {
          currentActivityNode.progress = 1;
        }
      });
      // end of activities


    });
    // end of sessions

  }
  // end of subjects
}

function startWith(str, key) {
  if (!str) return false;
  return (str.indexOf(key) === 0);
}

function unionPlayedVideoIntervals(intervals) {
  if (intervals === undefined)
    return {'rawIntervals':intervals, 'playedLength':0, 'intervals':[]};
  var mergedIntervals = intervals;
  var mergedLength = -1;
  var key = 0;
  do {
    mergedLength = mergedIntervals.length;
    mergedIntervals = unionIntervals(mergedIntervals, key);
    key++;
  } while (mergedIntervals.length != mergedLength && mergedIntervals.length > key);

  var playedLength = 0;
  for (var i = 0; i<mergedIntervals.length; i++) {
    playedLength += mergedIntervals[i].end - mergedIntervals[i].start;
  }

  return {'rawIntervals':intervals, 'playedLength':playedLength, 'intervals':mergedIntervals};
}

function unionIntervals(intervals, key) {
  var mergedIntervals = [];
  var i;

  for (i = 0; i<=key; i++) {
    mergedIntervals.push(intervals[i]);
  }

  for (i = key+1; i< intervals.length; i++) {
    // merge mergedIntervals[0] and intervals[i]
    if (mergedIntervals[key].end < intervals[i].start || mergedIntervals[key].start > intervals.end) { // cannot merge
      mergedIntervals.push(intervals[i]);
    } else {
      mergedIntervals[key].start = mergedIntervals[key].start < intervals[i].start ? mergedIntervals[key].start : intervals[i].start;
      mergedIntervals[key].end   = mergedIntervals[key].end   > intervals[i].end   ? mergedIntervals[key].end   : intervals[i].end  ;     
    }
  }

  return mergedIntervals;
}

var regex = {
  3: {
    followRight:            /(R,)([B-Z],){0,}(I,)([B-Z],){0,}((A|AW|AC),)/,
    followRightAllLabel:    /(R,)(V,){0,}(L,)(I,)(L,)((A|AW|AC),)(L,)/,
    followRightMissLabel :  /(R,)(V,){0,}(L,){0,}(I,L,){0,}(I,)(L,){0,}((A|AW|AC),)(L,){0,}/,
    followRightLazyLabel1 : /(R,)(V,){0,}(L,){0,}(I,)(L,){2,3}((A|AW|AC),)(?!(L,))/,
    followRightLazyLabel2 : /(R,)(V,){0,}(L,){0,}(I,)((A|AW|AC),)(L,){2,3}/,
    followRightLazyLabel3 : /L,L,L,/,
    unRightComplete :       /(^R,|S,R,)((?![I])[A-Z],){0,}((A|AW|AC),)/,
    unRightInComplt :       /(^R,|S,R,)((?![A])[A-Z],){0,}$/
  },
  4: {
    followRight:            /^(R,|S,R,)(((((([A-Z]){1,2}),){0,})(undefined,)){0,})(((([A-Z]){1,2}),){0,})((I,){1,})(((([A-Z]){1,2}),){0,})((G,){1,})(((([A-Z]){1,2}),){0,})((H,){1,})(((([A-Z]){1,2}),){0,})((A|AW|AC),)/
  },
  5: {
    followRight:            /(R,)((([A-Z]),){0,})(I,)((([A-Z]),){0,})(A,)/
  }
}

function getSequenceCat(sequence, activityID) {
  var sq = '';
  for (var i_sq = 0; i_sq<sequence.length; i_sq++) {
    sq+= sequence[i_sq].label + ',';
  }

  var cat = {};
  cat.complete = 0;
  cat.complete_followRight = 0;
  cat.complete_followRight_correct = 0;
  cat.complete_followRight_incorrect = 0;
  cat.complete_inorderRight = 0;
  cat.complete_inorderRight_correct = 0;
  cat.complete_inorderRight_incorrect = 0;
  cat.complete_notFollow = 0;
  cat.complete_notFollow_correct = 0;
  cat.complete_notFollow_incorrect = 0;
  cat.incomplete = 0;

  if (activityID == 3) {
    // console.log(sq);
    if (regex[activityID].followRight.test(sq)) {
      cat.complete = 1;
      cat.complete_followRight = 1;
      if (sq.indexOf('AC') >= 0) {
        cat.complete_followRight_correct = 1;
      } else {
        cat.complete_followRight_incorrect = 1;
      }
    } else if ((sq.indexOf('R,')>-1) && (sq.indexOf(',I,')>-1) && (sq.indexOf('A')>-1)) {
      cat.complete = 1;
      cat.complete_inorderRight = 1;
      if (sq.indexOf('AC') >= 0) {
        cat.complete_inorderRight_correct = 1;
      } else {
        cat.complete_inorderRight_incorrect = 1;
      }
    } else {
      if (sq.indexOf('A') >= 0) {
        cat.complete = 1;
        cat.complete_notFollow = 1;
        if (sq.indexOf('AC') >= 0) {
          cat.complete_notFollow_correct = 1;
        } else if (sq.indexOf('AW') >= 0) {
          cat.complete_notFollow_incorrect = 1;
        }
      } else {
        cat.incomplete = 1;
      }
    }
  }

  if (activityID == 4) {
    //console.log(sq);
    if (regex[activityID].followRight.test(sq)) {       // follow right
      cat.complete = 1;
      cat.complete_followRight = 1;
      if (sq.indexOf('AC') >= 0) {
        cat.complete_followRight_correct = 1;
      } else {
        cat.complete_followRight_incorrect = 1;
      }
    } else if ((sq.indexOf('R,')>-1) && (sq.indexOf(',I,')>-1) && (sq.indexOf(',G,')>-1) && (sq.indexOf(',H,')>-1) && (sq.indexOf('A')>-1) ) {  // right but inorder
      cat.complete = 1;
      cat.complete_inorderRight = 1;
      if (sq.indexOf('AC') >= 0) {
        cat.complete_inorderRight_correct = 1;
      } else {
        cat.complete_inorderRight_incorrect = 1;
      }
    } else {
      if (sq.indexOf('A') >= 0) {
        cat.complete = 1;
        cat.complete_notFollow = 1;
        if (sq.indexOf('AC') >= 0) {
          cat.complete_notFollow_correct = 1;
        } else if (sq.indexOf('AW') >= 0) {
          cat.complete_notFollow_incorrect = 1;
        }
      } else {
        cat.incomplete = 1;
      }
    }
  }

  if (activityID == 5) {
    // console.log(sq);
    if (regex[activityID].followRight.test(sq)) {
      cat.complete = 1;
      cat.complete_followRight = 1;
    } else if ((sq.indexOf('R,')>-1) && (sq.indexOf(',I,')>-1) && (sq.indexOf('A')>-1)) {
      cat.complete = 1;
      cat.complete_inorderRight = 1;
    } else {
      if (sq.indexOf('A') >= 0) {
        cat.complete = 1;
        cat.complete_notFollow = 1;
      } else {
        cat.incomplete = 1;
      }
    }
  }

  return cat;
}

function sendResponse(res) {
  if (_response === null) {
    console.error('response is null');
  }
  _response.setHeader('Access-Control-Allow-Origin', '*');
  _response.writeHead(200, {"Content-Type": "application/json"});
  if ( (typeof res) == 'string')
    _response.end(res);
  else
    _response.end( JSON.stringify(res) );
}

var _response = null;

var server = http.createServer(function(request, response) {
  _response = response;
  _response.setHeader('Access-Control-Allow-Origin', '*');
  var parsedUrl = url.parse(request.url, true);
  var index;
  if (parsedUrl.pathname.indexOf("//") === 0) {
    index = parsedUrl.pathname.substr(1);
  } else {
    index = parsedUrl.pathname;
  }

  var resource = routes[index];
  if (resource) {
    resource(parsedUrl);
    // response.writeHead(200, {"Content-Type": "application/json"});
    // response.end(JSON.stringify(resource(parsedUrl)));
  }
  else {
    response.writeHead(404);
    _response.end();
  }
});
// server.listen(1337,'127.0.0.1');
// production
server.listen(8000,'127.0.0.1');
console.log('running');
