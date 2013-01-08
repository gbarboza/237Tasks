var SCOPE = 'https://www.googleapis.com/auth/calendar';
var CLIENT_ID = '';

/* Courtesy of http://code.google.com/p/google-api-javascript-client/wiki/Samples 
 *
 * This just gets us an hour long token
 */
function auth() {
    console.log('Sent Auth');
    var p = new promise.Promise();

    var config = {
        'client_id': CLIENT_ID,
        'scope': SCOPE
    };

    gapi.auth.authorize(config, function() {
            console.log('Got Auth');
            p.done(false, null);
    });

    return p;
}

/* Loads the google cal api */
function loadLib() {
    console.log('Requested lib');
    var p = new promise.Promise();

    gapi.client.load('calendar', 'v3', function() {
        console.log('Got lib');
        p.done(false, null);
    });

    return p;
}

/* Initializes everything we need and loads main app page */
function setup() {
    promise.chain([
            function() {
                return auth();
            },
            function(error, result) {
                return loadLib();
            },
            function(error, result) {
                return createCalIfNecessary();
            },
            function(error, result) {
                return loadAndImportTasks();
            }
        ]).then(function(error, callist) {
            console.log('Changing page');
            var headerBar = $('header');
            headerBar.removeClass('hideHeader');
            var loginScreen = $('#loginScreen');
            loginScreen.addClass('hidden');
            var appScreen = $('#appScreen');
            appScreen.removeClass('hidden');


            generateIFrame(window.innerHeight - 100);
        });
}

