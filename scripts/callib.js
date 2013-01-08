function BasicBlock(startTime, endTime) {
    this.startTime = new XDate(startTime);
    this.endTime = new XDate(endTime);
}

function BusyBlock(startTime, endTime) {
    BasicBlock.call(this, startTime, endTime);
}

BusyBlock.prototype = new BasicBlock();
BusyBlock.prototype.constructor = BusyBlock;

/* Determine if a time falls within a busy block */
BusyBlock.prototype.isBusy = function(date) {
    if (date.valueOf() >= this.startTime.valueOf() &&
            date.valueOf() < this.endTime.valueOf()) {
        return true;
    } else {
        return false;
    }
};


/* A type of BasicBlock for time we are free */
function FreeBlock(startTime, endTime) {
    BasicBlock.call(this, startTime, endTime);
}

FreeBlock.prototype = new BasicBlock();
FreeBlock.prototype.constructor = FreeBlock;

FreeBlock.prototype.length = function() {
    return this.startTime.diffMinutes(this.endTime);
};


/* Pulls list of calendars for an user from Google */
function getCalendarList() {
    var p = new promise.Promise();

    console.log('Requested calendar list');

    gapi.client.calendar.calendarList.list().execute(function(x) {
        if(x.hasOwnProperty('code')) {
            alert('Google says their backend errored.');
        }
        console.log('Got calendar list');
        x.items = filterCalendars(x.items);
        p.done(false, x);
    });

    return p;
}

/* Remove silly calendars that mess with our app */
function filterCalendars(calendarList) {
    var filtered = [],
        filters = ['holiday@group.v.calendar.google.com', 'contacts@group.v.calendar.google.com'],
        include,
        i,
        j;

    for (i = 0; i < calendarList.length; i++) {
        include = true;
        for (j = 0; j < filters.length; j++) {
            if (calendarList[i].id.match(filters[j])) {
                include = false;
                break;
            }
        }

        if (include === true) {
            filtered.push(calendarList[i]);
        }
    }

    return filtered;
}

/* Given a calendar, start and end time, return a set of blocks
 * that represent when the user is busy during that time period */
function getBusyTimeList(calendarList, startTime, endTime) {
    var p = new promise.Promise(),
        fb_query = {};

    if (typeof startTime === 'undefined') {
        fb_query.timeMin = startTime = new XDate();
    } else {
        fb_query.timeMin = startTime;
    }

    if (typeof endTime === 'undefined') {
        fb_query.timeMax = startTime.clone().addDays(7);
    } else {
        fb_query.timeMax = endTime;
    }

    fb_query.items = filterCalendars(calendarList);

    console.log('Asked for busy times');
    gapi.client.calendar.freebusy.query(fb_query).execute(function(x) {
        console.log('Got busy times back');
        p.done(false, x);
    });

    return p;
}

/* Function to convert a list of BusyBlocks into FreeBlocks
 * since Google only gives us back busy times */
function deriveFreeFromBusy(freebusy, startT, endT) {
    var busyBlocks = [],
        freeBlocks = [],
        startTimes = [],
        endTimes = [],
        startFree,
        endFree,
        lastEnd,
        start,
        end,
        i;

    if (typeof startT === 'undefined') {
        startT = new XDate();
    }

    if (typeof endT === 'undefined') {
        endT = startT.clone().addDays(7);
    }

    /* Edge case where nothing is in the calendar */
    if (typeof freebusy.calendars === 'undefined') {
        freeBlocks.push(new FreeBlock(startT.toISOString(), endT.toISOString()));
        return freeBlocks;
    }

    /* Build list of BusyBlocks and lists of starts and ends */
    for (var key in freebusy.calendars) {
        for (i = 0; i < freebusy.calendars[key].busy.length; i++) {

            start = new XDate(freebusy.calendars[key].busy[i].start);
            end = new XDate(freebusy.calendars[key].busy[i].end);

            startTimes.push(start);
            endTimes.push(end);
            busyBlocks.push(new BusyBlock(start, end));
        }
    }

    /* Sort our lists */
    startTimes.sort(compareXDates);
    endTimes.sort(compareXDates);
    busyBlocks.sort(compareBlocksByEnd);


    startFree = startT.clone();

    while (startTimes.length > 0) {
        /* Our free time ends at the earliest start time */
        endFree = startTimes.shift();

        /* Add new FreeBlock */
        freeBlocks.push(new FreeBlock(startFree.toISOString(), endFree.toISOString()));

        /* Our next FreeBlock starts at the first endtime we aren't busy at */
        while (isBusy(busyBlocks, endTimes[0])) {
            lastEnd = endTimes.shift();

            /* Check if done */
            if (endTimes.length === 0)
                break;
        }

        /* Check if done */
        if (endTimes.length === 0) {
            break;
        }

        startFree = endTimes.shift();
        lastEnd = startFree;

        /* Check if done */
        if (startTimes.length === 0) {
                break;
        }

        /* Now remove all startTimes that we have passed */
        while (compareXDates(startTimes[0], startFree) <= 0) {
            startTimes.shift();

            /* Check if done */
            if (startTimes.length === 0)
                break;
        }
    }

    /* Handle adding final free block in after end of last
     * busy block if possible */
    if (endTimes.length === 0) {
        if (lastEnd.diffSeconds(endT) > 0) {
            freeBlocks.push(new FreeBlock(lastEnd.toISOString(), endT.toISOString()));
        }
    } else {
        if (endTimes[endTimes.length - 1].diffSeconds(endT) > 0) {
            freeBlocks.push(new FreeBlock(
                        endTimes[endTimes.length - 1].toISOString(),
                        endT.toISOString()));
        }
    }

    /* Sort and return */
    freeBlocks.sort(compareBlocksByStart);
    return freeBlocks;
}


/* Given a set of BusyBlocks determine if the passed in time is free */
function isBusy(busyBlocks, time) {
    var i;

    for (i = 0; i < busyBlocks.length; i++) {
        if (busyBlocks[i].isBusy(time)) {
            return true;
        }
    }

    return false;
}

function compareXDates(x, y) {
    return x.valueOf() - y.valueOf();
}

function compareBlocksByEnd(x, y) {
    return x.endTime.valueOf() - y.endTime.valueOf();
}

function compareBlocksByStart(x, y) {
    return x.startTime.valueOf() - y.startTime.valueOf();
}

/*
 * Returns a string that can then be used as an iframe source
 * in order to embed the pretty google calendar widget that is
 * normally seen on calendar.google.com for a user.
 *
 * Background colors for each calendar are currently the same
 * for all calendars.
 */
function generateIFrameSrcStr(height) {
    var and = '&',
        i,
        srcStr,
        calendarPromise,
        allColors,
        p = new promise.Promise();

    if (typeof height === 'undefined') {
        height = 600;
    }

    calendarPromise = getCalendarList();

    /* We now have list of calendrs */
    calendarPromise.then(function(error, calendars) {
        srcStr = 'https://www.google.com/calendar/embed?';
        srcStr += 'showTitle=0' + and;
        srcStr += 'showTabs=0' + and;
        srcStr += 'mode=WEEK' + and;
        srcStr += 'showNav=0' + and;
        srcStr += 'height=' + height + and;
        srcStr += 'wkst=1' + and;
        srcStr += 'bgcolor=%23FFFFFF' + and;

        /* Add source strings */
        for (i = 0; i < calendars.items.length; i++) {
            srcStr += 'src=' + encodeURIComponent(calendars.items[i].id) + and;
        }

        /* Yinz all in Pittsburgh, right? */
        srcStr += 'ctz=' + encodeURIComponent('America/New_York');

        p.done(null, srcStr);
    });

    return p;
}

/* Pull out our calendar from list of calendars */
function getTaskCalendar(calendars) {
    var i;

    for (i = 0; i < calendars.items.length; i++) {
        if (calendars.items[i].description === '237TaskListCalendarDONTCHANGETHIS') {
            return calendars.items[i];
        }
    }

    return undefined;
}

/* Get events for calendar from Google */
function getTaskListArray(calendar) {
    var p = new promise.Promise();

    var req = {
        'calendarId' : calendar.id
    };

    console.log('Asked for events from cal');
    gapi.client.calendar.events.list(req).execute(function(x) {
        console.log('Got events for cal');

        /* Handle edge case where calendar events list is empty */
        if (!x.hasOwnProperty('items')) {
            x.items = [];
        }

        p.done(false, x.items);
    });

    return p;
}


/* Insert our calendar into an user's set of calendars */
function addOurCalendar() {
    var newCalendar = { 'resource' : {
        'summary': '237TaskListCalendar',
        'description': '237TaskListCalendarDONTCHANGETHIS',
        'timeZone': 'America/New_York'
    }
    };

    var p = new promise.Promise();

    console.log('Send request to insert calendar');
    gapi.client.calendar.calendars.insert(newCalendar).execute(function(x) {
        console.log('Inserted calendar successfully.');
        p.done(false, null);
    });

    return p;
}


/* Install Google calendar iframe into page */
function generateIFrame(height) {
    var stringPromise = generateIFrameSrcStr(height);
    stringPromise.then(function(error, iframeSrcString) {
        var iFrameElement = document.createElement('iframe');
        iFrameElement.setAttribute('src', iframeSrcString);
        iFrameElement.setAttribute('id', 'calendarFrame');
        iFrameElement.setAttribute('frameborder', '0');
        iFrameElement.setAttribute('scrolling', 'no');
        iFrameElement.setAttribute('height', height);

        var calDiv = document.getElementById('rightContainer');
        calDiv.appendChild(iFrameElement);

        // set the width of the iFrame element
        setSizes();
    });
}

/* Find a find block that is big enough for a task */
function findFreeBlockForTask(task, freeBlocks) {
    var i;

    for (i = 0; i < freeBlocks.length; i++) {
        if (typeof freeBlocks[i] === 'undefined') {
            continue;
        } else if (freeBlocks[i].length() >= task.length)
            return freeBlocks[i];
    }

    return undefined;
}

/* Add an event/task to our calendar via Google's API */
function addTaskToCalendar(task, calendar, freeBlock) {
    var p = new promise.Promise(),
        req = {};
    ev = {
        'summary': task.name,
        'start': { 'dateTime': freeBlock.startTime.toISOString() },
        'end': { 'dateTime' : freeBlock.startTime.clone().addMinutes(task.length).toISOString() },
        'description': undefined
    };

    console.log('Adding task ' + task.name);

    /* Store time stuff */
    task.start = ev.start.dateTime;
    task.end = ev.end.dateTime;

    /* Store representation of task object in event */
    ev.description = window.btoa(JSON.stringify(task));

    req.calendarId = calendar.id;
    req.resource = ev;

    console.log('Sent req to add task');
    gapi.client.calendar.events.insert(req).execute(function(x) {
        console.log('Added task');
        p.done(false, x);
    });

    return p;
}


/* Remove a task for a calendar */
function removeTaskFromCalendar(task, calendar) {
    console.log('Removing ' + task.name);

    var p = new promise.Promise();
    var result;
    var req = {
        'calendarId': calendar.id,
        'eventId': task.id
    };

    console.log('Sent req to remove task');
    gapi.client.calendar.events.delete(req).execute(function(x) {
        if (x.error != undefined) {
            result = false;
        } else {
            result = true;
        }

        console.log('Removed task');
        p.done(false, result);
    });

    return p;
}

/* Change whether a task/event is completed and push to google */
function toggleComplete(taskName) {
    var task = TaskListNamespace.taskList.tasks[taskName];
    var calendar = TaskListNamespace.cal;

    var p = new promise.Promise();
    task.completed = !task.completed;

    var req = {
        'calendarId': calendar.id,
        'eventId': task.id
    },
        ev = {
            'summary': task.name,
            'description': window.btoa(JSON.stringify(task)),
            'start': { 'dateTime' : task.start },
            'end': { 'dateTime' : task.end }
        };

    req.resource = ev;

    console.log('Send req to flip completed bit');
    gapi.client.calendar.events.update(req).execute(function(x) {
        console.log('Toggled completed bit');
        p.done(false, x);
    });

    return p;
}

/* Given just a task and a time, push a calendar to google */
function pushTaskToCalendar(taskName, length) {
    var ourcal;
    var task = {'name' : taskName, 'length': length};
    var p = new promise.Promise();

    /* Get calendars, finds our cal, gets busy time, finds freeblock
     * adds task to calendar */
    promise.chain([
        function() {
            return getCalendarList();
        },
        function(error, callist) {
            ourcal = getTaskCalendar(callist);
            return getBusyTimeList(callist.items);
        },
        function(error, busylist) {
            freelist = deriveFreeFromBusy(busylist);
            fb = findFreeBlockForTask(task, freelist);
            if (typeof fb === 'undefined') {
                return noFreeBlock(task.name);
            } else {
                return addTaskToCalendar(task, ourcal, fb);
            }
        }]).then(
            function(error, result) {
                p.done(false, result);
            }
    );

    return p;
}

/* Installs our calendar if it doesn't exist */
function createCalIfNecessary() {
    var p = new promise.Promise();

    promise.chain([
        function() {
            return checkForOurCal();
        }]).then(function(error, res) {
            if (res === false) {
                var calProm = addOurCalendar();
                calProm.then(function(error, res) {
                    return p.done(false, undefined);
                });
            } else {
                return p.done(false, undefined);
            }
        });

    return p;
}

/* Checks if our calendar exists */
function checkForOurCal() {
    var p = new promise.Promise();
    var ourcal;

    promise.chain([
        function() {
            return getCalendarList();
        }]).then(function(error, result) {
            ourcal = getTaskCalendar(result);

            /* Save calendar so we don't have to fetch it a lot */
            TaskListNamespace.cal = ourcal;

            if (typeof ourcal === 'undefined') {
                p.done(false, false);
            } else {
                p.done(false, ourcal);
            }
        });

    return p;
}

/* Pulls tasks from our calendar and loads them into the UI */
function loadAndImportTasks() {
    var tl = TaskListNamespace.taskList;
    var calListPromise = getCalendarList();
    var tasksImportedPromise;
    var p = new promise.Promise();

    console.log('Send events request');

    calListPromise.then(function(error, callist) {
        tasksImportedPromise = tl.importTasks(callist);
        tasksImportedPromise.then(function(error, tasklist) {
            console.log('Got events imported');
            for (var key in tl.tasks) {
                if (tl.tasks.hasOwnProperty(key)) {
                    loadTaskIntoUI(tl.tasks[key]);
                }
            }

            p.done(false, undefined);
        });
    });

    return p;
}
