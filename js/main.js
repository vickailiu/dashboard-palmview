$(document).ready(function() {
    console.log("document loaded");
    initialize('document');
});

$(window).load(function() {
    console.log("window loaded");
    initialize('window');
});

var documentReady = false;
var windowReady = false;
var summaryTable;
var propertyList;

function initialize(ready) {
    if (ready == 'document') {
        documentReady = true;
    }
    if (ready == 'window') {
        windowReady = true;
    }
    if (documentReady && windowReady) {
        $.getJSON("server/persist/summaryTable", function(json) {
            console.log('summaryTable loaded'); // this will show the info it in firebug console
            summaryTable = json;
            createSchoolOverview();
        });
        $.getJSON("server/persist/propertyList", function(json) {
            console.log('property loaded'); // this will show the info it in firebug console
            propertyList = json;
        });
    }
}

var id = 0;

var offtaskDurationStep = 6;

// School Overview

//      school/classes:
//         students participated
//         progress curve
//         score curve
//         offtask
//         video watched percentage

function createSchoolOverview() {
    // prepare for data
    var schoolID = 2;
    var studentsParticipated = {};
    var studentsNotParticipated = {};
    var progress = {};
    var score = {};
    var offtask = {};
    var rawOfftask = {};
    var videoPercentage = {};

    studentsNotParticipated['school_' + schoolID] = [0];
    studentsParticipated['school_' + schoolID] = [0];
    progress['school_' + schoolID] = [];
    score['school_' + schoolID] = [];
    offtask['school_' + schoolID] = [];
    videoPercentage['school_' + schoolID] = [];

    for (var item in propertyList) {
        if (item.indexOf('class_') === 0 && propertyList[item].schoolID == schoolID) {
            studentsParticipated[item] = [0];
            studentsNotParticipated[item] = [0];
            progress[item] = [];
            score[item] = [];
            offtask[item] = [];
            videoPercentage[item] = [];
        }
    }

    for (var item in progress) {
        progress[item][0] = 0;		score[item][0] = 0;			videoPercentage[item][0] = 0;			offtask[item][0] = 0;
        progress[item][1] = 0;		score[item][1] = 0;			videoPercentage[item][1] = 0;			offtask[item][1] = 0;
        progress[item][2] = 0;		score[item][2] = 0;			videoPercentage[item][2] = 0;			offtask[item][2] = 0;
        progress[item][3] = 0;		score[item][3] = 0;			videoPercentage[item][3] = 0;			offtask[item][3] = 0;
        progress[item][4] = 0;		score[item][4] = 0;			videoPercentage[item][4] = 0;			offtask[item][4] = 0;
        progress[item][5] = 0;		score[item][5] = 0;			videoPercentage[item][5] = 0;			offtask[item][5] = 0;
        progress[item][6] = 0;		score[item][6] = 0;			videoPercentage[item][6] = 0;			offtask[item][6] = 0;
        progress[item][7] = 0;		score[item][7] = 0;			videoPercentage[item][7] = 0;			offtask[item][7] = 0;
        progress[item][8] = 0;		score[item][8] = 0;			videoPercentage[item][8] = 0;			offtask[item][8] = 0;
        progress[item][9] = 0;		score[item][9] = 0;			videoPercentage[item][9] = 0;			offtask[item][9] = 0;
        progress[item][10] = 0;		score[item][10] = 0;		videoPercentage[item][10] = 0;			offtask[item][10] = 0;
    }

    for (var item in summaryTable['subject_' + schoolID]) {
        if (item.indexOf('student_') != 0) continue;

        var studentNode = summaryTable['subject_' + schoolID][item];
        if (!studentNode || !studentNode.summary) {
            studentsNotParticipated['school_' + schoolID][0]++;
            studentsNotParticipated['class_' + propertyList[item].classID][0]++;
            continue;
        }

        if (studentNode.summary.progress > 0) {
            studentsParticipated['school_' + schoolID][0]++;
            studentsParticipated['class_' + propertyList[item].classID][0]++;
        }

        progress['school_' + schoolID][studentNode.summary.progress]++;
        progress['class_' + propertyList[item].classID][studentNode.summary.progress]++;

        if (studentNode.summary.question.answer) {
            score['school_' + schoolID][Math.ceil(10.0 * studentNode.summary.question.answer.correctSubmitTimes / studentNode.summary.question.answer.submitTimes - 0.000001)]++;
            score['class_' + propertyList[item].classID][Math.ceil(10.0 * studentNode.summary.question.answer.correctSubmitTimes / studentNode.summary.question.answer.submitTimes - 0.000001)]++;
        }

        if (studentNode.summary.video.watchedPercentage != undefined) {
            videoPercentage['school_' + schoolID][Math.ceil(10.0 * studentNode.summary.video.watchedPercentage)]++;
            videoPercentage['class_' + propertyList[item].classID][Math.ceil(10.0 * studentNode.summary.video.watchedPercentage)]++;
        }

        if (studentNode.summary.offTask.duration != undefined) {
            var ot = Math.ceil(1.0 * studentNode.summary.offTask.duration / 1000 / 60 / offtaskDurationStep);
            offtask['school_' + schoolID][ot <= 10 ? ot : 10]++
                offtask['class_' + propertyList[item].classID][ot <= 10 ? ot : 10]++
        }
    }

    // count for percentage
    for (var item in score) {
        for (i = 0; i <= 10; i++) {
            score[item][i] = Math.round(100.0 * score[item][i] / studentsParticipated[item][0]) / 100;
            videoPercentage[item][i] = Math.round(100.0 * videoPercentage[item][i] / studentsParticipated[item][0]) / 100;
            offtask[item][i] = Math.round(100.0 * offtask[item][i] / studentsParticipated[item][0]) / 100;
        }
    }

    id++;
    addCard(id, 11, 'School Overview', 'school_overview');

    for (var item in studentsParticipated) {
        for (var i = 1; i <= 10; i++) {
            studentsParticipated[item][i] = studentsParticipated[item][0];
            studentsNotParticipated[item][i] = studentsNotParticipated[item][0];
        }
    }

    for (var item in studentsParticipated) {
        studentsParticipated[item].unshift('p');
        studentsNotParticipated[item].unshift('np');		score[item].unshift('s');			videoPercentage[item].unshift('v');			offtask[item].unshift('o');
    }

    var subID = 0;
    for (var item in studentsParticipated) {
        generate(item, id, subID, item.indexOf('school') == 0 ? 'School Cohort' : propertyList[item].className);
        subID++
    }

    $('#school_overview').on("click", ".c3", function(e) {
        var index = parseInt(e.currentTarget.id.substr(8));
        if (index == 0) return;
        createClassStudentProgress('class_' + (index + 4));
        // console.log(e);
    });

    function generate(item, id, subID, title) {
        var mapper = {};
        mapper['p'] = 'Participated';
        mapper['np'] = 'Not Participated';
        mapper['s'] = 'Score';
        mapper['v'] = 'Video Percentage';
        mapper['o'] = 'Offtask Duration';

        var c3Columns = [studentsParticipated[item], studentsNotParticipated[item], score[item], videoPercentage[item], offtask[item]];
        var c3Types = {};
        var c3Groups = [
            ['p', 'np']
        ];
        var c3Axes = {};

        c3Types['s'] = 'area-spline';
        c3Types['v'] = 'area-spline';
        c3Types['o'] = 'area-spline';

        c3Axes['s'] = 'y2';
        c3Axes['v'] = 'y2';
        c3Axes['o'] = 'y2';

        var height = item.indexOf('school') == 0 ? 250 : 150;
        var width = item.indexOf('school') == 0 ? 550 : 230;
        var textCorrection = 25;

        var chart = c3.generate({
            size: {
                height: height,
                width: width
            },
            data: {
                columns: c3Columns,
                type: 'bar',
                types: c3Types,
                groups: c3Groups,
                axes: c3Axes
            },
            color: {
                pattern: ['#E0E0E0', '#F5F5F5', '#43A047', '#FB8C00', '#D81B60']
            },
            axis: {
                x: {
                    label: {
                        text: 'Distribution',
                        position: 'outer-center',
                    },
                    // padding: {
                    //     left: 2,
                    //     right: 2
                    // },
                    tick: {
                        format: function(x) {
                            return (x * 10);
                        }
                    }
                },
                y2: {
                    padding: {
                        bottom: 0,
                        top: 0
                    },
                    tick: {
                        count: 5,
                        format: function(d) {
                            return d * 100 + '%';
                        }
                    },
                    show: true,
                    max: 1,
                    min: 0
                },
                y: {
                    padding: {
                        bottom: 0,
                        top: 15
                    },
                    tick: {
                        count: 5,
                        format: function(d) {
                            return Math.round(d);
                        }
                    },
                    // max: 100,
                    // max: function(d) {
                    //     console.log(d)
                    //     foo = 1;
                    //     return d;
                    // },
                    min: 0
                }
            },
            point: {
                //show: false
                r: 0,
                focus: {
                    expand: {
                        r: 5
                    }
                }
            },
            bar: {
                width: {
                    ratio: 1.1
                }
            },
            tooltip: {
                format: {
                    title: function(x) {
                        return title;
                    },
                    name: function(name, ratio, id, index) {
                        if (name == 'p' || name == 'np') {
                            return mapper[name];
                        } else if (name == 'o') {
                            return mapper[name] + ' - ' + offtaskDurationStep * index + 'min';
                        } else {
                            return mapper[name] + ' - ' + index * 10;
                        }
                    },
                    value: function(value, ratio, id, index) {
                        if (id == 'p' || id == 'np') {
                            return value;
                        }
                        return '' + value * 100 + '%';
                    }
                },
                position: function(data, width, height, element) {
                    return item.indexOf('school') == 0 ? {
                        top: -30,
                        left: 70
                    } : {
                        top: -150,
                        left: 0
                    };
                }
            },
            legend: {
                show: item.indexOf('school') == 0 ? false : true
            },
            bindto: '#chart_' + id + '_' + subID
        });

        svg = d3.select('#' + chart.element.id);
        svg.append("text")
            .attr("style", "font-size: 16; left:" + (width / 2 - textCorrection) + "px; top:0; position:absolute;")
            .text(title);

        if (item.indexOf('school') == 0) {
            d3.select('.card-content').insert('div', '#chart_' + id + '_' + (subID + 1)).attr('class', 'legend').selectAll('div')
                .data(['p', 'np', 's', 'v', 'o'])
                .enter().append('div')
                .attr('data-id', function(id) {
                    return id;
                })
                .html(function(id) {
                    return "<div class='legend-icon' style='background-color:" + chart.color(id) + "'></div><span class='legend-text'>" + mapper[id] + "</span>";
                })
                .on('mouseover', function(id) {
                    chart.focus(id);
                })
                .on('mouseout', function(id) {
                    chart.revert();
                })
                .on('click', function(id) {
                    chart.toggle(id);
                });
        }
    }
}

// var showFullSchoolOverview = true;

// function toggleSchoolOverview(exceptionList) {

// }

//     class/students:
//        school, class, students
//        for each activity
function createClassOverview(classKey) {
    var studentList = [];
    for (var item in summaryTable['subject_2']) {
        if (item.indexOf('student_') != 0) continue;

        if ('class_' + propertyList[item].classID != classKey) continue

        var studentNode = summaryTable['subject_2'][item];
        if (!studentNode || !studentNode.summary) {
            continue;
        }

        studentList.push(item);
    }

    var operationalList = ['school_2', classKey];
    for (var i = 0; i < studentList.length; i++) {
        operationalList.push(studentList[i]);
    }

    // summary[activity].%attr%[school/class/student]
    var summary = {};
    for (var item in propertyList) {
        if (item.indexOf('activity_') != 0 || item == 'activity_1') continue;
        summary[item] = {};
        if (propertyList[item].type == 'VIDEO') {
            summary[item].videoPercentage = {};
            summary[item].pauseDuration = {};
            for (var i = 0; i < operationalList.length; i++) {
                summary[item].videoPercentage[operationalList[i]] = 0;
                summary[item].pauseDuration[operationalList[i]] = 0;
            }
        } else if (propertyList[item].para1 == 'MODAL_TUT') {
            summary[item].correctSubmitTimes = {};
            for (var i = 0; i < operationalList.length; i++) {
                summary[item].correctSubmitTimes[operationalList[i]] = 0;
            }
        } else {
            summary[item].correctTimes = {};
            summary[item].wrongTimes = {};
            summary[item].correctSubmitTimes = {};
            for (var i = 0; i < operationalList.length; i++) {
                summary[item].correctTimes[operationalList[i]] = 0;
                summary[item].wrongTimes[operationalList[i]] = 0;
                summary[item].correctSubmitTimes[operationalList[i]] = 0;
            }
        }
        summary[item].offtaskDuration = {};
        for (var i = 0; i < operationalList.length; i++) {
            summary[item].offtaskDuration[operationalList[i]] = 0;
        }
    }

    var cohortList = ['school_2', classKey];

    for (var item in propertyList) {
        if (item.indexOf('activity_') != 0 || item == 'activity_1') continue;

        for (var i = 0; i < cohortList.length; i++) {
            var cell = summaryTable[item][cohortList[i]];
            if (!cell || !cell.video) {
                continue;
            }

            if (propertyList[item].type == 'VIDEO') {
                if (cell.video) {
                    summary[item].videoPercentage[cohortList[i]] = cell.video.watchedPercentage ? cell.video.watchedPercentage : 0;
                    summary[item].pauseDuration[cohortList[i]] = (cell.video.pauseDuration ? cell.video.pauseDuration : 0) * cell.video.number;
                }
            } else if (propertyList[item].para1 == 'MODAL_TUT') {
                if (cell.question && cell.question.number > 0) {
                    summary[item].correctSubmitTimes[cohortList[i]] = 1.0 * cell.question.answer.correctSubmitTimes / cell.question.answer.submitTimes;
                }
            } else {
                if (cell.question && cell.question.number > 0) {
                    summary[item].correctTimes[cohortList[i]] = 1.0 * cell.question.answer.correct / cell.question.answer.submitTimes;
                    summary[item].wrongTimes[cohortList[i]] = 1.0 * (cell.question.answer.times - cell.question.answer.correct) / cell.question.answer.submitTimes;
                    summary[item].correctSubmitTimes[cohortList[i]] = 1.0 * cell.question.answer.correctSubmitTimes / cell.question.answer.submitTimes;
                }
            }
            summary[item].offtaskDuration[cohortList[i]] = (cell.offTask.duration ? cell.offTask.duration : 0) * cell.offTask.number;
        }

        for (var i = 0; i < studentList.length; i++) {
            var cell = summaryTable[item][studentList[i]];
            if (!cell || !cell.summary) {
                continue;
            }

            if (propertyList[item].type == 'VIDEO') {
                if (cell.summary.video) {
                    summary[item].videoPercentage[studentList[i]] = cell.summary.video.watchedPercentage ? cell.summary.video.watchedPercentage : 0;
                    summary[item].pauseDuration[studentList[i]] = (cell.summary.video.pauseDuration ? cell.summary.video.pauseDuration : 0) * cell.summary.video.number;
                }
            } else if (propertyList[item].para1 == 'MODAL_TUT') {
                if (cell.summary.question && cell.summary.question.number > 0) {
                    summary[item].correctSubmitTimes[studentList[i]] = 1.0 * cell.summary.question.answer.correctSubmitTimes / cell.summary.question.answer.submitTimes;
                }
            } else {
                if (cell.summary.question && cell.summary.question.number > 0) {
                    summary[item].correctTimes[studentList[i]] = 1.0 * cell.summary.question.answer.correct / cell.summary.question.answer.submitTimes;
                    summary[item].wrongTimes[studentList[i]] = 1.0 * (cell.summary.question.answer.times - cell.summary.question.answer.correct) / cell.summary.question.answer.submitTimes;
                    summary[item].correctSubmitTimes[studentList[i]] = 1.0 * cell.summary.question.answer.correctSubmitTimes / cell.summary.question.answer.submitTimes;
                }
            }
            summary[item].offtaskDuration[studentList[i]] = (cell.summary.offTask.duration ? cell.summary.offTask.duration : 0) * cell.summary.offTask.number;
        }
    }

    id++;
    addCustomCard(id, 'Class Overview', 'class_overview_' + id);

    var contentTemplate = '';
    contentTemplate += '<div class="mdl-tabs mdl-js-tabs mdl-js-ripple-effect">\
                                    <div class="mdl-tabs__tab-bar">'
    for (var i = 2; i <= 10; i++) {
        contentTemplate += '<a href="#activity-' + i + '-panel" class="mdl-tabs__tab">Activity ' + i + '</a>';
    }
    contentTemplate += '</div>'

    for (var i = 2; i <= 10; i++) {
        contentTemplate += '<div class = "mdl-tabs__panel' + (i == 2 ? ' is-active' : '') + '" id="activity-' + i + '-panel">\
                                        <div id="chart_' + id + '_' + i + '"></div>\
                                    </div>';
    }
    contentTemplate += '</div>';

    $('#class_overview_' + id + ' .card-content').append(contentTemplate);

    for (var i = 2; i <= 10; i++) {
        var item = 'activity_' + i;

        if (propertyList[item].type == 'VIDEO') {
            var videoPercentage = ['v'];
            var pauseDuration = ['p'];
        } else if (propertyList[item].para1 == 'MODAL_TUT') {
            var correctSubmitTimes = ['cs'];
        } else {
            var correctTimes = ['c'];
            var wrongTimes = ['w'];
            var correctSubmitTimes = ['cs'];
        }
        var offtaskDuration = ['o'];

        for (var j = 0; j < studentList.length; j++) {
            if (propertyList[item].type == 'VIDEO') {
                videoPercentage.push(summary[item].videoPercentage[studentList[j]]);
                pauseDuration.push(1.0 * summary[item].pauseDuration[studentList[j]] / 1000);
            } else if (propertyList[item].para1 == 'MODAL_TUT') {
                correctSubmitTimes.push(summary[item].correctSubmitTimes[studentList[j]]);
            } else {
                correctTimes.push(summary[item].correctTimes[studentList[j]]);
                wrongTimes.push(summary[item].wrongTimes[studentList[j]]);
                correctSubmitTimes.push(summary[item].correctSubmitTimes[studentList[j]]);
            }
            offtaskDuration.push(1.0 * summary[item].offtaskDuration[studentList[j]] / 1000);
        }

        var c3Columns = [];
        var c3Groups = [];
        var c3Axes = {};
        var c3Category = [];
        var c3Pattern = ['#90CAF9', '#E3F2FD', '#43A047', '#FB8C00', '#D81B60'];

        var mapper = {};
        mapper['v'] = 'Video Percentage';
        mapper['p'] = 'Paused Duration';
        mapper['cs'] = 'Correct Submittion';
        mapper['c'] = 'Correct Answer';
        mapper['w'] = 'Wrong Answer';
        mapper['o'] = 'Offline Duration';

        if (propertyList[item].type == 'VIDEO') {
            c3Columns = [videoPercentage, pauseDuration, offtaskDuration];
            c3Axes['p'] = 'y2';
            c3Axes['o'] = 'y2';
            c3Pattern = ['#FB8C00', '#FFCC80', '#BDBDBD'];
        } else if (propertyList[item].para1 == 'MODAL_TUT') {
            c3Columns = [correctSubmitTimes, offtaskDuration];
            c3Axes['o'] = 'y2';
            c3Pattern = ['#43A047', '#BDBDBD'];
        } else {
            c3Columns = [correctTimes, wrongTimes, correctSubmitTimes, offtaskDuration];
            c3Groups = [
                ['c', 'w']
            ];
            c3Axes['o'] = 'y2';
            c3Pattern = ['#90CAF9', '#E3F2FD', '#43A047', '#BDBDBD'];
        }
        for (var j = 0; j < studentList.length; j++) {
            c3Category[j] = propertyList[studentList[j]].name;
        }

        var chart = c3.generate({
            data: {
                columns: c3Columns,
                type: 'bar',
                groups: c3Groups,
                axes: c3Axes
            },
            axis: {
                x: {
                    type: 'category',
                    categories: c3Category
                },
                y2: {
                    show: true
                }
            },
            color: {
                pattern: c3Pattern
            },
            tooltip: {
                format: {
                    name: function(name, ratio, id, index) {
                        return mapper[name];
                    },
                    value: function(value, ratio, id, index) {
                        return Math.round(value * 100) / 100.0;
                    }
                }
            },
            bindto: '#chart_' + id + '_' + i
        });
        chart.flush();
    }
}

function createClassStudentProgress(classKey) {
    id++;
    addCustomCard(id, 'Class Overview - ' + propertyList[classKey].className, 'class_overview_' + id);

    var progressList = [];
    var noProgressList = [];
    var haveProgressList = [];
    for (var item in summaryTable['subject_2']) {
        if (item.indexOf('student_') != 0) continue;

        if ('class_' + propertyList[item].classID != classKey) continue

        var studentNode = summaryTable['subject_2'][item];
        if (!studentNode || !studentNode.summary) {
            noProgressList.push({
                studentID: item,
                progress: 0
            });
        } else {
            haveProgressList.push({
                studentID: item,
                progress: studentNode.summary.progress * 10.0
            });
        }
    }

    progressList = haveProgressList.concat(noProgressList);

    var contentTemplate = "<ul id = 'progress_grid'>";
    for (var i = 0; i < progressList.length; i++) {
        contentTemplate += "<li class='gauge_chart' id='gauge_chart" + id + "_" + i + "' tooltip='" + propertyList[progressList[i].studentID].name + "' tooltip-persistent value='" + progressList[i].studentID + "'  tag='" + progressList[i].progress + "'>";
        contentTemplate += "<div class='title'>" + propertyList[progressList[i].studentID].name + "</div>";
        contentTemplate += "<div class='row' id='chart_" + id + "_" + i + "'></div>";
        contentTemplate += "</li>";
    }
    contentTemplate += "</ul>";
    $('#class_overview_' + id + ' .card-content').append(contentTemplate);

    $(".gauge_chart").click(function(e) {
        e.currentTarget.value;

        if (e.currentTarget.classList.contains("gauge_chart_selected")) {
            e.currentTarget.classList.remove("gauge_chart_selected");
            $(e.currentTarget).next().remove();
        } else {
            var progress = e.currentTarget.getAttribute('tag');
            if (progress == 0) return;
            e.currentTarget.classList.add("gauge_chart_selected");
            var studentID = e.currentTarget.getAttribute('value');
            $(e.currentTarget).after("<li class = 'gauge_chart gauge_chart_large' id='student_view_" + studentID + "'>\
                                    </li>");
            //$.getJSON("persist/"+studentID, function(json) {
            populateStudentView(studentID);
            //});
        }
    });

    for (i = 0; i < progressList.length; i++) {
        c3.generate({
            bindto: '#chart_' + id + '_' + i,
            data: {
                columns: [
                    ['data', progressList[i].progress]
                ],
                type: 'gauge',
            },
            color: {
                pattern: ['#FF0000', '#F97600', '#F6C600', '#60B044'], // the three color levels for the percentage values.
                threshold: {
                    values: [30, 60, 90, 100]
                }
            },
            size: {
                height: 120,
                width: 180
            }
        });
    }
}

var activityCaption = ["","","Video - Addition/Subtraction",
    "MCQ - Addition/Subtraction Model",
    "Practice - Addition/Subtraction",
    "MCQ - Addition/Subtraction",
    "Video - Multiplication/Division",
    "MCQ - Multiplication/Division Model",
    "Practice - Multiplication/Division",
    "MCQ - Multiplication/Division",
    "MCQ Quiz"
];

function populateStudentView(studentID) {
    // duration total, with/o parents
    // video percentage, with/o parents
    // average score, with/o parents
    var studentNode = summaryTable['subject_2'][studentID];

    var content = '';
    content += '<h5>Overview</h5>';
    // duration
    content += '<div class="solid-card mdl-card mdl-shadow--2dp" style="background-color: #00bcd4 ">\
                  <div class="mdl-card__title mdl-card--expand">\
                    Duration\
                    <div id="c3_' + studentID + '_duration"></div>\
                  </div>\
                </div>';
    // video
    content += '<div class="solid-card mdl-card mdl-shadow--2dp" style="background-color: #8BC34A ">\
                  <div class="mdl-card__title mdl-card--expand">\
                    Video Completion\
                    <div id="c3_' + studentID + '_video" style="margin-top: 10px; margin-left: -10px;"></div>\
                  </div>\
                </div>';
    // score
    content += '<div class="solid-card mdl-card mdl-shadow--2dp" style="background-color: #ff9800 ">\
                  <div class="mdl-card__title mdl-card--expand">\
                    Average Score\
                    <div id="c3_' + studentID + '_score" style="margin-top: 10px; margin-left: -10px;"></div>\
                  </div>\
                </div>';
    // offtask
    content += '<div class="solid-card mdl-card mdl-shadow--2dp" style="background-color: #607d8b ">\
                  <div class="mdl-card__title mdl-card--expand">\
                    Offtask Duration\
                    <div id="c3_' + studentID + '_offtask"></div>\
                  </div>\
                </div>';

    content += '<h5>Activities</h5>';
    content += '<div class="mdl-tabs mdl-js-tabs">\
                  <div class="mdl-tabs__tab-bar">';
    for (var i = 2; i <= Math.min(studentNode.summary.progress, 9); i++) {
        if (!!summaryTable['activity_' + i][studentID].summary)
            content += '<a href="#tab_' + studentID + '_activity_' + i + '" id="' + studentID + '_activity_' + i + '" class="mdl-tabs__tab activity_tab" tooltip="' + activityCaption[i] + '" tooltip-persistent>Act ' + i + '</a>';
    }

    content += '</div>';
    for (var i = 2; i <= Math.min(studentNode.summary.progress, 9); i++) {
        content += '<div class="mdl-tabs__panel' + (i == 2 ? ' is-active"' : '"') + ' id="tab_' + studentID + '_activity_' + i + '"></div>'
    }
    content += '</div>';

    $('#student_view_' + studentID).append(content);
    componentHandler.upgradeAllRegistered();

    var withParentsDuration = 0;
    var withParentVideo = 0;
    var withParentVideoCount = 0;
    var withParentScore = 0;
    var withParentScoreCount = 0;
    var withParentOfftask = 0;
    var withoutPDuration = 0;
    var withoutPVideo = 0;
    var withoutPVideoCount = 0;
    var withoutPScore = 0;
    var withoutPScoreCount = 0;
    var withoutPOfftask = 0;

    for (var item in studentNode) {
        if (item == 'summary') continue;

        var vPer = 0;
        var vCount = 0;
        var sPer = 0;
        var sCount = 0;
        var o = 0;

        if (studentNode[item].video && studentNode[item].video.number) {
            vPer = studentNode[item].video.watchedPercentage;
            vCount = studentNode[item].video.number;
        }
        if (studentNode[item].question && studentNode[item].question.number) {
            sPer = studentNode[item].question.answer.correctSubmitTimes / studentNode[item].question.answer.submitTimes;
            sCount = studentNode[item].question.number;
        }
        if (studentNode[item].video && studentNode[item].video.number) {
            vPer = studentNode[item].video.watchedPercentage;
            vCount = studentNode[item].video.number;
        }
        if (studentNode[item].offTask && studentNode[item].offTask.duration) {
            o = studentNode[item].offTask.duration;
        }


        if (studentNode[item].withParent) {
            withParentsDuration += studentNode[item].duration;
            withParentVideo += vPer * vCount;
            withParentVideoCount += vCount;
            withParentScore += sPer * sCount;
            withParentScoreCount += sCount;
            withParentOfftask += o;
        } else {
            withoutPDuration += studentNode[item].duration;
            withoutPVideo += vPer * vCount;
            withoutPVideoCount += vCount;
            withoutPScore += sPer * sCount;
            withoutPScoreCount += sCount;
            withoutPOfftask += o;
        }
    }

    if (withParentVideoCount > 0) withParentVideo = Math.round(withParentVideo / withParentVideoCount * 100);
    if (withoutPVideoCount > 0) withoutPVideo = Math.round(withoutPVideo / withoutPVideoCount * 100);
    if (withParentScoreCount > 0) withParentScore = Math.round(withParentScore / withParentScoreCount * 100);
    if (withoutPScoreCount > 0) withoutPScore = Math.round(withoutPScore / withoutPScoreCount * 100);

    var c3Columns = [
        ['With Parents', withParentsDuration],
        ['Without Parents', withoutPDuration]
    ];
    c3.generate({
        bindto: '#c3_' + studentID + '_duration',
        data: {
            columns: c3Columns,
            colors: {
                'With Parents': 'rgba(255, 255, 255, 1)',
                'Without Parents': 'rgba(255, 255, 255, 0.6)'
            },
            type: 'donut'
        },
        donut: {
            title: convertTime(studentNode.summary.duration / 1000),
            width: 8,
            label: {
                show: false
            }
        },
        size: {
            height: 142,
            width: 142
        }
    });

    var c3Columns = [
        ['percentage', withParentVideo, withoutPVideo]
    ];
    c3.generate({
        bindto: '#c3_' + studentID + '_video',
        data: {
            columns: c3Columns,
            type: 'bar'
        },
        color: {
            pattern: ['rgba(255, 255, 255, 0.9)']
        },
        axis: {
            x: {
                type: 'category',
                categories: ['With Parents', 'Without Parents']
            },
            y: {
                show: true,
                max: 100,
                min: 0,
                padding: {
                    top: 0,
                    bottom: 0
                },
                tick: {
                    values: [0, 20, 40, 60, 80, 100],
                    format: function(d) {
                        return d + '%';
                    }
                }
            }
        },
        tooltip: {
            format: {
                value: function(value, ratio, id, index) {
                    return value + '%';
                }
            }
        },
        grid: {
            y: {
                show: true
            }
        },
        legend: {
            show: false
        },
        size: {
            height: 125,
            width: 142
        }
    });

    var c3Columns = [
        ['Score', withParentScore, withoutPScore]
    ];
    c3.generate({
        bindto: '#c3_' + studentID + '_score',
        data: {
            columns: c3Columns,
            type: 'bar'
        },
        color: {
            pattern: ['rgba(255, 255, 255, 0.9)']
        },
        axis: {
            x: {
                type: 'category',
                categories: ['With Parents', 'Without Parents']
            },
            y: {
                show: true,
                max: 100,
                min: 0,
                padding: {
                    top: 0,
                    bottom: 0
                },
                tick: {
                    values: [0, 20, 40, 60, 80, 100],
                    format: function(d) {
                        return d + '%';
                    }
                }
            }
        },
        tooltip: {
            format: {
                value: function(value, ratio, id, index) {
                    return value + '%';
                }
            }
        },
        grid: {
            y: {
                show: true
            }
        },
        legend: {
            show: false
        },
        size: {
            height: 125,
            width: 142
        }
    });

    var c3Columns = [
        ['With Parents', withParentOfftask],
        ['Without Parents', withoutPOfftask]
    ];
    c3.generate({
        bindto: '#c3_' + studentID + '_offtask',
        data: {
            columns: c3Columns,
            colors: {
                'With Parents': 'rgba(255, 255, 255, 1)',
                'Without Parents': 'rgba(255, 255, 255, 0.6)'
            },
            type: 'donut'
        },
        donut: {
            title: convertTime((withParentOfftask + withoutPOfftask) / 1000),
            width: 8,
            label: {
                show: false
            }
        },
        size: {
            height: 142,
            width: 142
        }
    });

    for (var i = 2; i <= studentNode.summary.progress; i++) {
        if (!summaryTable['activity_' + i][studentID].summary) continue;
        switch (i) {
            case 2:
            case 6:
                renderVideoActivity('activity_' + i, studentID);
                break;
            case 3:
            case 7:
                renderMCQModelActivity('activity_' + i, studentID);
                break;
            case 4:
            case 8:
                renderModelActivity('activity_' + i, studentID);
                break;
            case 5:
            case 9:
                renderMCQActivity('activity_' + i, studentID);
        }
    }
}

var videoDuration = {
    '68ihQ9jQOM8': 73,
    'Jowey_prtVM': 86,
    'pjjSp46ffjQ': 48,
    'bwm5pv3UiYE': 75,
    'LlFw4UPv4L4': 81,

    'Jx9mtdx-7aQ': 48,
    'jcc0WBVtO90': 73,
    '0lf0YACerzY': 81,
    'bDXedeH-Bpo': 75,
    'zJUaLHvLP6s': 86
};
var videoTitle = {
    'activity_2': {
        'pjjSp46ffjQ': "Method",
        '68ihQ9jQOM8': "Addition",
        'LlFw4UPv4L4': "Substraction"
    },
    'activity_6': {
        'bwm5pv3UiYE': "Multiplication",
        'Jowey_prtVM': "Division"
    }
};

function renderVideoActivity(activityID, studentID) {
    var content = '';
    content += '<h6>Activity ' + activityID.substr(9) + ': ' + activityCaption[activityID.substr(9)] + '</h6>';
    // offtask and average percentage
    content += '<div class="activity-summary">';
    content += addMiniCard('Played Times',
        summaryTable[activityID][studentID].summary.video.number,
        'teal');
    content += addMiniCard('Average Percentage',
        summaryTable[activityID][studentID].summary.video.watchedPercentage,
        'pink');
    content += addMiniCard('Average Pause Duration',
        convertTime(summaryTable[activityID][studentID].summary.video.pauseDuration / 1000),
        'lime');
    content += addMiniCard('Offtask Duration',
        summaryTable[activityID][studentID].summary.offTask.number ? convertTime(summaryTable[activityID][studentID].summary.offTask.duration / 1000) : 0,
        'bluegray');
    content += '</div>';

    // per video: percentage, pause times, repeat times
    for (var videoID in videoTitle[activityID]) {
        content += '<div class="video-summary"><span>Video: ' + videoTitle[activityID][videoID] + '</span><div id="' + studentID + '_' + activityID + '_video_' + videoID + '"></div></div>';
    }

    $('#tab_' + studentID + '_' + activityID).append(content);

    for (var videoID in videoTitle[activityID]) {
        var videoSummary = summaryTable[activityID + '_video_' + videoID][studentID];
        var playedIntervals = [];
        var pauses = [];
        for (var item in videoSummary) {
            if (item == 'summary') continue;
            for (var i = 0; i < videoSummary[item].instances.length; i++) {
                var instance = videoSummary[item].instances[i];
                playedIntervals = playedIntervals.concat(instance.playedIntervals);
                pauses = pauses.concat(instance.pauses);
            }
        }
        // convert intervals and pauses into step chart data
        var c3Columns = [];
        var colors = {};
        var hideLegend = [];
        // pause
        var pauseColumn = makeArrayOf(0, videoDuration[videoID]);
        for (var i = 0; i < pauses.length; i++) {
            pauseColumn[Math.round(pauses[i].at)] = 1.2;
        }
        pauseColumn.unshift('pauses');
        c3Columns.push(pauseColumn);
        colors['pauses'] = 'rgba(96, 49, 0, 0.2)';
        // played intervals
        for (var i = 0; i < playedIntervals.length; i++) {
            var playColumn = makeArrayOf(0, videoDuration[videoID]);
            for (var j = Math.round(playedIntervals[i].start); j <= Math.round(playedIntervals[i].end); j++) {
                playColumn[j] = 1;
            }
            id = 'play' + i;
            playColumn.unshift(id);
            c3Columns.push(playColumn);
            colors[id] = 'rgba(1, 66, 96, 0.2)'
            hideLegend.push(id);
        }
        c3.generate({
            bindto: '#' + studentID + '_' + activityID + '_video_' + videoID,
            data: {
                columns: c3Columns,
                type: 'area-step',
                colors: colors
            },
            axis: {
                x: {
                    label: "video timestamp"
                },
                y: {
                    show: false,
                    max: 1.5,
                    min: 0,
                    padding: {
                        top: 0,
                        bottom: 0
                    }
                }
            },
            tooltip: {
                grouped: false // Default true
            },
            legend: {
                position: 'right',
                hide: hideLegend
            },
            size: {
                height: 100
            }
        })
    }
}

function renderMCQModelActivity(activityID, studentID) {
    var content = '';
    content += '<h6>Activity ' + activityID.substr(9) + ': ' + activityCaption[activityID.substr(9)] + '</h6>';
    content += '<div class="activity-summary">';
    content += addMiniCard('Activity Attempt Times',
        summaryTable[activityID][studentID].summary.attemptedActivities,
        'teal');
    content += addMiniCard('Activity Complete Times',
        summaryTable[activityID][studentID].summary.completedActivities,
        'pink');
    content += addMiniCard('Average Score',
        Math.round(summaryTable[activityID][studentID].summary.question.answer.correctSubmitTimes / summaryTable[activityID][studentID].summary.question.answer.submitTimes * 100) / 100.0,
        'lime');
    content += addMiniCard('Offtask Duration',
        summaryTable[activityID][studentID].summary.offTask.number ? convertTime(summaryTable[activityID][studentID].summary.offTask.duration / 1000) : 0,
        'bluegray');
    content += '</div>';

    content += '<div class="activity-summary">';
    // answer pattern
    content += '<div class="solid-card large mdl-card mdl-shadow--2dp bgm-white">\
                      <div class="mdl-card__title mdl-card--expand">\
                        Answer Pattern\
                        <div id="' + studentID + '_' + activityID + '_pattern"></div>\
                      </div>\
                    </div>';

    // wrong answer reaction
    content += '<div class="solid-card large mdl-card mdl-shadow--2dp bgm-white">\
                      <div class="mdl-card__title mdl-card--expand">\
                        Wrong Answer Reaction\
                        <div id="' + studentID + '_' + activityID + '_wrongaction"></div>\
                      </div>\
                    </div>';
    content += '</div>';

    $('#tab_' + studentID + '_' + activityID).append(content);

    var follow = summaryTable[activityID][studentID].summary.question.sequenceCat.complete_followRight;
    var follow_c = summaryTable[activityID][studentID].summary.question.sequenceCat.complete_followRight_correct;
    var notFollow = summaryTable[activityID][studentID].summary.question.sequenceCat.complete_notFollow;
    var notFollow_c = summaryTable[activityID][studentID].summary.question.sequenceCat.complete_notFollow_correct;
    var incomplete = summaryTable[activityID][studentID].summary.question.sequenceCat.incomplete;

    var c3Columns = [
        ['Follow Steps', follow],
        ['Not Follow Steps', notFollow],
        ['Incomplete', incomplete]
    ];
    c3.generate({
        bindto: '#' + studentID + '_' + activityID + '_pattern',
        data: {
            columns: c3Columns,
            colors: {
                'Follow Steps': 'green',
                'Not Follow Steps': 'orange',
                'Incomplete': 'lightgray'
            },
            type: 'donut'
        },
        donut: {
            width: 40
        },
        tooltip: {
            contents: function(d, defaultTitleFormat, defaultValueFormat, color) {
                var titleFormat = defaultTitleFormat,
                    nameFormat = function(name) {
                        return name;
                    },
                    valueFormat = defaultValueFormat,
                    text, i, title, value, name, bgcolor;
                for (i = 0; i < d.length; i++) {
                    if (!(d[i] && (d[i].value || d[i].value === 0))) {
                        continue;
                    }

                    if (!text) {
                        title = titleFormat ? titleFormat(d[i].x) : d[i].x;
                        text = "<table class='" + this.CLASS.tooltip + "'>" + (title || title === 0 ? "<tr><th colspan='2'>" + title + "</th></tr>" : "");
                    }

                    value = valueFormat(d[i].value, d[i].ratio, d[i].id, d[i].index);
                    if (value !== undefined) {
                        name = nameFormat(d[i].name, d[i].ratio, d[i].id, d[i].index);
                        bgcolor = color(d[i].id);

                        text += "<tr class='" + this.CLASS.tooltipName + "-" + d[i].id + "'>";
                        text += "<td class='name'><span style='background-color:" + bgcolor + "'></span>" + name + "</td>";
                        text += "<td class='value'>" + value + "</td>";
                        text += "</tr>";

                        if (d[i].id == 'Follow Steps' || d[i].id == 'Not Follow Steps') {
                        	var ele = $(event.path).filter("div")[0];
                        	var rate = 0;
                        	if (ele) {
                        		var substr = ele.id.split('_');
                        		var studentID = substr[0]+'_'+substr[1];
                        		var activityID = substr[2]+'_'+substr[3];
                        		if (d[i].id == 'Follow Steps') {
                        			rate = summaryTable[activityID][studentID].summary.question.sequenceCat.complete_followRight_correct/summaryTable[activityID][studentID].summary.question.sequenceCat.complete_followRight;
                        		} else {
                        			rate = summaryTable[activityID][studentID].summary.question.sequenceCat.complete_notFollow_correct / summaryTable[activityID][studentID].summary.question.sequenceCat.complete_notFollow;
                        		}
                        	}
                        	rate = Math.round(rate * 10000) / 100 + '%'
							text += "<tr>";
							text += "<td class='name'>answer correctly</td>";
							text += "<td class='value'>" + rate + "</td>";
							text += "</tr>";
                        }
                    }
                }
                return text + "</table>";
            }
        },
        size: {
            height: 256,
            width: 256
        }
    });

    // dummyPie(studentID+'_'+activityID+'_pattern',
    //         follow, follow_c, notFollow, notFollow_c, incomplete);

    function dummyPie(id, follow, follow_c, notFollow, notFollow_c, incomplete) {
        // config
        var size = 256;
        var innerRadius = 50;
        var outerRadius = 100;
        var color = [
            ['#7CB342', '#FFB300', ''],
            ['#558B2F', '#FF8F00', '#BDBDBD']
        ];

        var sum = follow + notFollow + incomplete;
        var ratio = [follow / sum, notFollow / sum, incomplete / sum];
        var ratioV = [follow_c / follow, notFollow_c / notFollow, 0];

        var vis = d3.select("#" + id).append("svg")
            .attr("width", size)
            .attr("height", size)
            .append("g")
            .attr("transform", "translate(" + size / 2 + "," + size / 2 + ")");
        var angle = 0;
        for (var i = 0; i < ratioV.length; i++) {
            var arc = d3.svg.arc()
                .innerRadius(innerRadius).outerRadius((outerRadius - innerRadius) * ratioV[i] + innerRadius)
                .startAngle(angle).endAngle(angle += ratio[i] * 2 * Math.PI);
            vis.append("path").attr("d", arc).attr("fill", color[0][i]);
        }
        var angle = 0;
        for (var i = 0; i < ratio.length; i++) {
            var arc = d3.svg.arc()
                .innerRadius((outerRadius - innerRadius) * ratioV[i] + innerRadius).outerRadius(outerRadius)
                .startAngle(angle).endAngle(angle += ratio[i] * 2 * Math.PI);
            vis.append("path").attr("d", arc).attr("fill", color[1][i]);
        }
    }

    var w_a_r_ignore = summaryTable[activityID][studentID].summary.question.wrong_answer_reaction.ignore * summaryTable[activityID][studentID].summary.question.number;
    var w_a_r_review = summaryTable[activityID][studentID].summary.question.wrong_answer_reaction.review * summaryTable[activityID][studentID].summary.question.number;
    var w_a_r_hint = summaryTable[activityID][studentID].summary.question.wrong_answer_reaction.hint * summaryTable[activityID][studentID].summary.question.number;

    var c3Columns = [
        ['Ignore', w_a_r_ignore],
        ['Review', w_a_r_review],
        ['Hint', w_a_r_hint]
    ];
    c3.generate({
        bindto: '#' + studentID + '_' + activityID + '_wrongaction',
        data: {
            columns: c3Columns,
            colors: {
                'Ignore': 'gray',
                'Review': 'green',
                'Hint': 'yellow'
            },
            type: 'donut'
        },
        donut: {
            width: 40,
            label: {
                format: function(value, ratio, id) {
                    return value;
                }
            }
        },
        size: {
            height: 256,
            width: 256
        }
    });

}

function renderModelActivity(activityID, studentID) {
    var completedActivities = 0;

    var activitySummary = summaryTable[activityID][studentID];
    for (var item in activitySummary) {
        if (item == 'summary') continue;
        for (var i = 0; i < activitySummary[item].instances.length; i++) {
            var instance = activitySummary[item].instances[i];
            if (instance.question.number > 0) {
                if (instance.question.number * instance.question.answer.submitTimes > 10) {
                    completedActivities++;
                }
            }
        }
    }

    var content = '';
    content += '<h6>Activity ' + activityID.substr(9) + ': ' + activityCaption[activityID.substr(9)] + '</h6>';
    content += '<div class="activity-summary">';
    content += addMiniCard('Activity Attempt Times',
        summaryTable[activityID][studentID].summary.attemptedActivities,
        'teal');
    content += addMiniCard('Activity Complete Times',
        completedActivities,
        'pink');
    content += addMiniCard('Average Score',
        Math.round(summaryTable[activityID][studentID].summary.question.answer.correctSubmitTimes / summaryTable[activityID][studentID].summary.question.answer.submitTimes * 100) / 100.0,
        'lime');
    content += addMiniCard('Offtask Duration',
        summaryTable[activityID][studentID].summary.offTask.number ? convertTime(summaryTable[activityID][studentID].summary.offTask.duration / 1000) : 0,
        'bluegray');
    content += '</div>';

    content += '<div class="activity-summary">';
    // answer pattern
    content += '<div class="solid-card large mdl-card mdl-shadow--2dp bgm-white">\
                      <div class="mdl-card__title mdl-card--expand">\
                        Answer Pattern\
                        <div id="' + studentID + '_' + activityID + '_pattern"></div>\
                      </div>\
                    </div>';

    // wrong answer reaction
    content += '<div class="solid-card large mdl-card mdl-shadow--2dp bgm-white">\
                      <div class="mdl-card__title mdl-card--expand">\
                        Wrong Answer Reaction\
                        <div id="' + studentID + '_' + activityID + '_wrongaction"></div>\
                      </div>\
                    </div>';
    content += '</div>';

    $('#tab_' + studentID + '_' + activityID).append(content);

    var follow = summaryTable[activityID][studentID].summary.question.sequenceCat.complete_followRight;
    var notFollow = summaryTable[activityID][studentID].summary.question.sequenceCat.complete_notFollow;
    var incomplete = summaryTable[activityID][studentID].summary.question.sequenceCat.incomplete;

    var c3Columns = [
        ['Follow Steps', follow],
        ['Not Follow Steps', notFollow],
        ['Incomplete', incomplete]
    ];
    c3.generate({
        bindto: '#' + studentID + '_' + activityID + '_pattern',
        data: {
            columns: c3Columns,
            colors: {
                'Follow Steps': 'green',
                'Not Follow Steps': 'orange',
                'Incomplete': 'lightgray'
            },
            type: 'donut'
        },
        donut: {
            width: 40
                //       label: {
                //     format: function (value, ratio, id) {
                //           return value;
                //     }
                // }
        },
        size: {
            height: 256,
            width: 256
        }
    });

    var w_a_r_ignore = summaryTable[activityID][studentID].summary.question.wrong_answer_reaction.ignore * summaryTable[activityID][studentID].summary.question.number;
    var w_a_r_review = summaryTable[activityID][studentID].summary.question.wrong_answer_reaction.review * summaryTable[activityID][studentID].summary.question.number;
    var w_a_r_hint = summaryTable[activityID][studentID].summary.question.wrong_answer_reaction.hint * summaryTable[activityID][studentID].summary.question.number;

    var c3Columns = [
        ['Ignore', w_a_r_ignore],
        ['Review', w_a_r_review],
        ['Hint', w_a_r_hint]
    ];
    c3.generate({
        bindto: '#' + studentID + '_' + activityID + '_wrongaction',
        data: {
            columns: c3Columns,
            colors: {
                'Ignore': 'gray',
                'Review': 'green',
                'Hint': 'yellow'
            },
            type: 'donut'
        },
        donut: {
            width: 40,
            label: {
                format: function(value, ratio, id) {
                    return value;
                }
            }
        },
        size: {
            height: 256,
            width: 256
        }
    });

}

function renderMCQActivity(activityID, studentID) {
    var content = '';
    content += '<h6>Activity ' + activityID.substr(9) + ': ' + activityCaption[activityID.substr(9)] + '</h6>';
    content += '<div class="activity-summary">';
    content += addMiniCard('Activity Attempt Times',
        summaryTable[activityID][studentID].summary.attemptedActivities,
        'teal');
    content += addMiniCard('Activity Complete Times',
        summaryTable[activityID][studentID].summary.completedActivities,
        'pink');
    content += addMiniCard('Average Score',
        Math.round(summaryTable[activityID][studentID].summary.question.answer.correctSubmitTimes / summaryTable[activityID][studentID].summary.question.answer.submitTimes * 100) / 100.0,
        'lime');
    content += addMiniCard('Offtask Duration',
        summaryTable[activityID][studentID].summary.offTask.number ? convertTime(summaryTable[activityID][studentID].summary.offTask.duration / 1000) : 0,
        'bluegray');
    content += '</div>';

    content += '<div class="activity-summary">';
    // answer pattern
    content += '<div class="solid-card large mdl-card mdl-shadow--2dp bgm-white">\
                      <div class="mdl-card__title mdl-card--expand">\
                        Answer Pattern\
                        <div id="' + studentID + '_' + activityID + '_pattern"></div>\
                      </div>\
                    </div>';

    // wrong answer reaction
    content += '<div class="solid-card large mdl-card mdl-shadow--2dp bgm-white">\
                      <div class="mdl-card__title mdl-card--expand">\
                        Wrong Answer Reaction\
                        <div id="' + studentID + '_' + activityID + '_wrongaction"></div>\
                      </div>\
                    </div>';
    content += '</div>';

    $('#tab_' + studentID + '_' + activityID).append(content);

    var follow = summaryTable[activityID][studentID].summary.question.sequenceCat.complete_followRight;
    var notFollow = summaryTable[activityID][studentID].summary.question.sequenceCat.complete_notFollow;
    var incomplete = summaryTable[activityID][studentID].summary.question.sequenceCat.incomplete;

    var c3Columns = [
        ['Follow Steps', follow],
        ['Not Follow Steps', notFollow],
        ['Incomplete', incomplete]
    ];
    c3.generate({
        bindto: '#' + studentID + '_' + activityID + '_pattern',
        data: {
            columns: c3Columns,
            colors: {
                'Follow Steps': 'green',
                'Not Follow Steps': 'orange',
                'Incomplete': 'lightgray'
            },
            type: 'donut'
        },
        donut: {
            width: 40
                //       label: {
                //     format: function (value, ratio, id) {
                //           return value;
                //     }
                // }
        },
        size: {
            height: 256,
            width: 256
        }
    });

    var w_a_r_ignore = summaryTable[activityID][studentID].summary.question.wrong_answer_reaction.ignore * summaryTable[activityID][studentID].summary.question.number;
    var w_a_r_review = summaryTable[activityID][studentID].summary.question.wrong_answer_reaction.review * summaryTable[activityID][studentID].summary.question.number;
    var w_a_r_hint = summaryTable[activityID][studentID].summary.question.wrong_answer_reaction.hint * summaryTable[activityID][studentID].summary.question.number;

    var c3Columns = [
        ['Ignore', w_a_r_ignore],
        ['Review', w_a_r_review],
        ['Hint', w_a_r_hint]
    ];
    c3.generate({
        bindto: '#' + studentID + '_' + activityID + '_wrongaction',
        data: {
            columns: c3Columns,
            colors: {
                'Ignore': 'gray',
                'Review': 'green',
                'Hint': 'yellow'
            },
            type: 'donut'
        },
        donut: {
            width: 40,
            label: {
                format: function(value, ratio, id) {
                    return value;
                }
            }
        },
        size: {
            height: 256,
            width: 256
        }
    });

}

function addMiniCard(title, content, color) {
    return '<div class="mini-carts-container">\
                <div class="mini-charts-item bgm-' + (color ? color : 'orange') + '">\
                    <div class="clearfix">\
                        <div class="chart stats-line"></div>\
                        <div class="count" tooltip="' + title + ' : ' + content + '" tooltip-persistent>\
                            <small>' + title + '</small>\
                            <h2>' + content + '</h2>\
                        </div>\
                    </div>\
                </div>\
            </div>';
}

function addCard(id, charts, heading, key) {
    var section = document.createElement('section');
    section.className = 'section--center mdl-grid mdl-grid--no-spacing mdl-shadow--2dp';
    section.id = key;

    var innerHTML = '';
    innerHTML += '<div class="mdl-card mdl-cell mdl-cell--12-col">\
                        <div class="card-outerwrapper mdl-card__supporting-text mdl-grid mdl-grid--no-spacing">\
                            <div class="card-content mdl-cell mdl-cell--12-col">\
                                <h4>';
    innerHTML += heading ? heading : 'chart';
    innerHTML += '</h4>';

    for (var i = 0; i < charts; i++) {
        innerHTML += '<div id="chart_' + id + '_' + i + '"></div>';
    }

    innerHTML += '</div>\
                        </div>\
                    </div>\
                    <div class="card-hover-placeholder">\
                        <button class="card-button mdl-button mdl-js-button mdl-js-ripple-effect mdl-button--icon" id="';
    innerHTML += 'btn' + id;
    innerHTML += '">\
                            <i class="material-icons">more_vert</i>\
                        </button>\
                        <button class="card-button mdl-button mdl-js-button mdl-js-ripple-effect mdl-button--icon card-button-close">\
                            <i class="material-icons">close</i>\
                        </button>\
                    </div>\
                    <ul class="mdl-menu mdl-js-menu mdl-menu--bottom-right" for="';
    innerHTML += 'btn' + id;
    innerHTML += '">\
                        <li class="mdl-menu__item">Lorem</li>\
                        <li class="mdl-menu__item" disabled>Ipsum</li>\
                        <li class="mdl-menu__item">Dolor</li>\
                    </ul>';

    section.innerHTML = innerHTML;

    $('#card-holder').append($(section));
    setTimeout(function() {
        // componentHandler.upgradeElement(section);
        componentHandler.upgradeAllRegistered();
        $(section).addClass('appeared');
    }, 5);
}

function addCustomCard(id, heading, key) {
    var section = document.createElement('section');
    section.className = 'section--center mdl-grid mdl-grid--no-spacing mdl-shadow--2dp';
    section.id = key;

    var innerHTML = '';
    innerHTML += '<div class="mdl-card mdl-cell mdl-cell--12-col">\
                        <div class="card-outerwrapper mdl-card__supporting-text mdl-grid mdl-grid--no-spacing">\
                            <div class="card-content mdl-cell mdl-cell--12-col">\
                                <h4>';
    innerHTML += heading ? heading : 'chart';
    innerHTML += '</h4>\
                            </div>\
                        </div>\
                    </div>\
                    <div class="card-hover-placeholder">\
                        <button class="card-button mdl-button mdl-js-button mdl-js-ripple-effect mdl-button--icon" id="';
    innerHTML += 'btn' + id;
    innerHTML += '">\
                            <i class="material-icons">more_vert</i>\
                        </button>\
                        <button class="card-button mdl-button mdl-js-button mdl-js-ripple-effect mdl-button--icon card-button-close">\
                            <i class="material-icons">close</i>\
                        </button>\
                    </div>\
                    <ul class="mdl-menu mdl-js-menu mdl-menu--bottom-right" for="';
    innerHTML += 'btn' + id;
    innerHTML += '">\
                        <li class="mdl-menu__item">Lorem</li>\
                        <li class="mdl-menu__item" disabled>Ipsum</li>\
                        <li class="mdl-menu__item">Dolor</li>\
                    </ul>';

    section.innerHTML = innerHTML;

    $('#card-holder').append($(section));
    setTimeout(function() {
        // componentHandler.upgradeElement(section);
        componentHandler.upgradeAllRegistered();
        $(section).addClass('appeared');
    }, 5);
}

function convertTime(totalSec) {
    var hours = parseInt(totalSec / 3600) % 24;
    var minutes = parseInt(totalSec / 60) % 60;
    var seconds = Math.floor(totalSec % 60);

    var result = (hours > 0 ? ((hours < 10 ? "0" + hours : hours) + "h") : "") +
        (minutes > 0 ? ((minutes < 10 ? "0" + minutes : minutes) + "m") : "") +
        (seconds < 10 ? "0" + seconds : seconds) + "s";
    return result;
}

function makeArrayOf(value, length) {
    var arr = [],
        i = length;
    while (i--) {
        arr[i] = value;
    }
    return arr;
}