function addTaskToUI(name, scheduledTime, isComplete) {
    var list;
    var newTaskNode;
    var newTaskCheckbox;
    var taskName;
    var taskSchedule;
    var taskWrapper;
    var deleteButton;
    var rescheduleButton;
    var editButton;

    // new task node contains the task name and the task scheduled time
    taskWrapper = $('<div class="taskWrapper"></div>');
    newTaskNode = $('<div class="task"></div>');
    newTaskNode.click(function() {
        onToggleTask(name);
    });

    // hovering over the task shows the delete button
    taskWrapper.hover(function() {
        var deleteTaskButton = $(this).find('span');
        deleteTaskButton.toggleClass('hidden');
    });

    // create checkbox
    newTaskCheckbox = $('<input type="checkbox" />');
    newTaskCheckbox.attr('name', name);
    newTaskCheckbox.attr('value', 'TODO');


    // create task name from input
    taskName = $('<div class="taskName"></div>');
    taskName.append(newTaskCheckbox);
    taskName.append(name);

    taskSchedule = $('<div class="taskSchedule"></div>');
    taskSchedule.append(scheduledTime);

    taskWrapper.append(newTaskNode);

    // create delete button
    deleteButton = ($('<span class="deleteTaskButton hidden" title="delete">X</span>'));
    deleteButton.bind('click', function() {onDeleteTask(deleteButton)});
    deleteButton.bind('click', false);
    newTaskNode.append(deleteButton);

    // create reschedule button
    rescheduleButton = ($('<span class="rescheduleTaskButton hidden" title="reschedule">&nbsp; </span>'));
    rescheduleButton.bind('click', function() {rescheduleTask(name)});
    rescheduleButton.bind('click', false);

    newTaskNode.append(taskName);
    newTaskNode.append(taskSchedule);

    if (isComplete === true) {
        var checkbox = newTaskNode.find(':checkbox');
        checkbox[0].checked = true;

        // put the task in the right list
        var node = $(this).parent().detach();
        if (checkbox[0].checked) {
            list = $('#completed form');
        } else {
            list = $('#scheduled form');
        }

        list.prepend(node);
    } else {
        newTaskNode.append(rescheduleButton);
        list = $('#scheduled form');
    }

    list.append(taskWrapper);
}

/// translate input string for time ("hr:min") to number value of minutes
function timeInputToMinutes(timeLength) {
    var hrMin = timeLength.split(':');
    /// account for case of entering just a number
    if (hrMin.length == 1) return (parseInt(hrMin[0]));

    var hrs = parseInt(hrMin[0]);
    if (isNaN(hrs)) hrs = 0;
    var mins = parseInt(hrMin[1]);

    return hrs * 60 + mins;
}

function onToggleTask(name) {
    if (!TaskListNamespace.taskList.tasks.hasOwnProperty(name)) {
        return false;
    }

    var togglePromise = toggleComplete(name);

    clearUI();

    togglePromise.then(function(error, result) {
        var loadPromise = loadAndImportTasks();
        loadPromise.then(function(error, res) {
        });
    });
}

function rescheduleTask(taskname) {
    var task = TaskListNamespace.taskList.tasks[taskname];
    var ourcal;
    var fb;
    var freelist;
    var p = new promise.Promise();

    var listProm = getCalendarList();

    listProm.then(function(error, callist) {
        ourcal = getTaskCalendar(callist);

        var busyProm = getBusyTimeList(callist.items);

        busyProm.then(function(error, busylist) {
            var freelist = deriveFreeFromBusy(busylist);
            var fb = findFreeBlockForTask(task, freelist);

            if (typeof fb === 'undefined') {
                var nfb = noFreeBlock(task.name);
                nfb.then(function(error, busylist) {
                    p.done(false, false);
                });
            } else {
                var removePromise = removeTaskFromCalendar(task, ourcal);

                removePromise.then(function(error, result) {
                    var addProm = addTaskToCalendar(task, ourcal, fb);

                    addProm.then(function(error, result) {
                        clearUI();
                        var loadPromise = loadAndImportTasks();
                        loadPromise.then(function(error, res) {
                            refreshIFrame();
                            p.done(false, true);
                        });
                    });
                });
            }
        });
    });
}

function onAddTask() {
    var name = document.getElementById('taskInput').value;
    var leng = timeInputToMinutes(document.getElementById('timeInput').value);

    if (TaskListNamespace.taskList.tasks.hasOwnProperty(name)) {
        taskNameExistsError();
    } else if (isNaN(leng)) {
        taskTimeError();
    } else if (name === '') {
        alert("Name must not be blank");
    } else {
        var pushPromise = pushTaskToCalendar(name, leng);

        pushPromise.then(function(error, result) {
            clearUI();
            var loadPromise = loadAndImportTasks();
            loadPromise.then(function(error, res) {
                refreshIFrame();
            });
        });

        clearInput();
    }
}

function onDeleteTask(deleteButton) {
    var name = deleteButton.parent().find('.taskName input').attr('name');
    var task;
    var removePromise;

    if (!TaskListNamespace.taskList.tasks.hasOwnProperty(name)) {
        console.log("Tried to remove a task we don't have a id for.");
        return false;
    } else {
        task = TaskListNamespace.taskList.tasks[name];
    }

    var removePromise = removeTaskFromCalendar(task, TaskListNamespace.cal);

    removePromise.then(function(error, result) {
        if (result === true) {
            delete TaskListNamespace.taskList.tasks[name];
            var loadPromise = loadAndImportTasks();
            clearUI();
            loadPromise.then(function(error, res) {
                refreshIFrame();
            });
        }
    });

}

function refreshIFrame() {
    console.log('Refreshing iFrame');
    var iframe = document.getElementById('calendarFrame');
    iframe.src = iframe.src;

}

function clearUI() {
    $('#scheduled form').empty();
    $('#completed form').empty();
}

function clearInput() {
    document.getElementById('taskInput').value = '';
    document.getElementById('timeInput').value = '';
}

function taskNameExistsError() {
    /* Probably a more friendly way to do this */
    alert('Task with that name already exists');
}

function taskTimeError() {
    alert('Invalid time');
}

function loadTaskIntoUI(task) {
    var niceTimeStr = new XDate(task.start).toString('MMM d - h:mmtt');
    addTaskToUI(task.name, niceTimeStr, task.completed);
}

function noFreeBlock(taskname) {
    var p = new promise.Promise();

    alert("Couldn't find a block of time large enough for task " + taskname);
    p.done(false, false);

    return p;
}

