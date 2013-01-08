var TaskListNamespace = {
    'taskList': new TaskList()
};

function TaskList(tasks) {
    if (typeof tasks === 'undefined') {
        this.tasks = {};
    } else {
        this.tasks = tasks;
    }
}

TaskList.prototype.addTask = function(task) {
    if (typeof task.name === 'undefined') {
        return false;
    } else {
        this.tasks[task.name] = task;
        return true;
    }
};

TaskList.prototype.importTasks = function(calendars) {
    var taskCalendar = getTaskCalendar(calendars);
    var p = new promise.Promise();
    var tl = this;

    if (typeof taskCalendar === 'undefined') {
        return false;
    }

    taskPromise = getTaskListArray(taskCalendar);

    taskPromise.then(function(error, tasks) {
        for (var i = 0; i < tasks.length; i++) {
            var newTaskJsonString = window.atob(tasks[i].description);
            var newTask = JSON.parse(newTaskJsonString);
            newTask.id = tasks[i].id;
            tl.addTask(newTask);
        }

        p.done(error, undefined);
    });

    return p;
};

function Task(name, timeRequired) {
    this.name = name;
    this.length = timeRequired;
    this.scheduled = false;
    this.start = undefined;
    this.end = undefined;
    this.id = undefined;
    this.completed = false;
}

