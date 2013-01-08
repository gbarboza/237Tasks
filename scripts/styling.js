function setSizes() {
    var calendar = $('#calendarFrame');
    var leftOffset = parseInt($('#rightContainer').css('left'), 10);
    var padding = parseInt($('#rightContainer').css('padding-left')) * 2;
    var topOffset = parseInt($('header').css('height'), 10);
    calendar.css('width', window.innerWidth - leftOffset - padding);
    calendar.css('height', window.innerHeight - topOffset - padding);


    var leftContainerWidth = parseInt($('#leftContainer').width(), 10);
    var submitWidth = parseInt($('#submit').outerWidth(true), 10);
    var taskInputWidth = parseInt($('#taskInput').outerWidth(true), 10);
    var timeInput = $('#timeInput').timePicker();
    timeInput.css('width', leftContainerWidth - submitWidth - taskInputWidth - 26);

}

function onLoad() {
    $(window).resize(function() {setSizes();});
    var canvas = document.getElementById('logoCanvas');
    var context = canvas.getContext('2d');
    var x = canvas.width / 2 + 15;
    var y = canvas.height / 2;

    context.font = "italic 400 60px 'Titillium Web', sans-serif";
    // textAlign aligns text horizontally relative to placement
    context.textAlign = 'center';
    // textBaseline aligns text vertically relative to font style
    context.textBaseline = 'middle';
    var textWidth = context.measureText('237 Tasks').width;
    context.fillStyle = '#FAD163';
    // context.fillText("237 Tasks", x, y);
    context.fillText('2', x - (textWidth / 4) - 25, y + 10);
    context.fillText('3', x - (textWidth / 4), y + 10);
    context.fillText('7', x - (textWidth / 4) + 22, y + 10);
    context.fillStyle = '#4D90FE';
    context.font = "italic 200 60px 'Titillium Web', sans-serif";
    context.fillText('T', x - 16, y);
    context.fillText('a', x, y);
    context.fillText('s', x + 20, y);
    context.fillText('k', x + 40, y);
    context.fillText('s', x + 60, y);
}
