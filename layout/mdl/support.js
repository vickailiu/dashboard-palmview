$(document).on("click", ".card-button-close", function(e){
	$(e.toElement).parents('section').slideUp();
	setTimeout(function() {
		$(e.toElement).parents('section').remove();
    }, 1000);
});