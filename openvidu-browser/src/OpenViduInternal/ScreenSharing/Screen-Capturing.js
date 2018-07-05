// global variables
var chromeMediaSource = 'screen';
var sourceId;
var screenCallback;
var isFirefox = typeof window.InstallTrigger !== 'undefined';
var isOpera = !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;
var isChrome = !!window.chrome && !isOpera;

window.addEventListener('message', function (event) {
    if (event.origin != window.location.origin) {
        return;
    }
    onMessageCallback(event.data);
});

// and the function that handles received messages
function onMessageCallback(data) {
    // "cancel" button is clicked
    if (data == 'PermissionDeniedError') {
        if (screenCallback)
            return screenCallback('PermissionDeniedError');
        else
            throw new Error('PermissionDeniedError');
    }
    // extension notified his presence
    if (data == 'rtcmulticonnection-extension-loaded') {
        chromeMediaSource = 'desktop';
    }
    // extension shared temp sourceId
    if (data.sourceId && screenCallback) {
        screenCallback(sourceId = data.sourceId, data.canRequestAudioTrack === true);
    }
}

// this method can be used to check if chrome extension is installed & enabled.
function isChromeExtensionAvailable(callback) {
    if (!callback) return;
    if (chromeMediaSource == 'desktop') return callback(true);

    // ask extension if it is available
    window.postMessage('are-you-there', '*');
    setTimeout(function () {
        if (chromeMediaSource == 'screen') {
            callback(false);
        } else callback(true);
    }, 2000);
}

// this function can be used to get "source-id" from the extension
function getSourceId(callback) {
    if (!callback)
        throw '"callback" parameter is mandatory.';
    if (sourceId)
        return callback(sourceId);
    screenCallback = callback;
    window.postMessage('get-sourceId', '*');
}

// this function can be used to get "source-id" from the extension
function getCustomSourceId(arr, callback) {
    if (!arr || !arr.forEach) throw '"arr" parameter is mandatory and it must be an array.';
    if (!callback) throw '"callback" parameter is mandatory.';

    if (sourceId) return callback(sourceId);

    screenCallback = callback;
    window.postMessage({
        'get-custom-sourceId': arr
    }, '*');
}

// this function can be used to get "source-id" from the extension
function getSourceIdWithAudio(callback) {
    if (!callback) throw '"callback" parameter is mandatory.';
    if (sourceId) return callback(sourceId);

    screenCallback = callback;
    window.postMessage('audio-plus-tab', '*');
}

function getChromeExtensionStatus(extensionid, callback) {
    if (isFirefox)
        return callback('not-chrome');
    if (arguments.length != 2) {
        callback = extensionid;
        extensionid = 'lfcgfepafnobdloecchnfaclibenjold'; // default extension-id
    }
    var image = document.createElement('img');
    image.src = 'chrome-extension://' + extensionid + '/icon.png';
    image.onload = function () {
        chromeMediaSource = 'screen';
        window.postMessage('are-you-there', '*');
        setTimeout(function () {
            if (chromeMediaSource == 'screen') {
                callback('installed-disabled');
            } else
                callback('installed-enabled');
        }, 2000);
    };
    image.onerror = function () {
        callback('not-installed');
    };
}

function getScreenConstraintsWithAudio(callback) {
    getScreenConstraints(callback, true);
}

// this function explains how to use above methods/objects
function getScreenConstraints(callback, captureSourceIdWithAudio) {
    sourceId = '';
    var firefoxScreenConstraints = {
        mozMediaSource: 'window',
        mediaSource: 'window'
    };
    if (isFirefox)
        return callback(null, firefoxScreenConstraints);
    // this statement defines getUserMedia constraints
    // that will be used to capture content of screen
    var screen_constraints = {
        mandatory: {
            chromeMediaSource: chromeMediaSource,
            maxWidth: screen.width > 1920 ? screen.width : 1920,
            maxHeight: screen.height > 1080 ? screen.height : 1080
        },
        optional: []
    };
    // this statement verifies chrome extension availability
    // if installed and available then it will invoke extension API
    // otherwise it will fallback to command-line based screen capturing API
    if (chromeMediaSource == 'desktop' && !sourceId) {
        if (captureSourceIdWithAudio) {
            getSourceIdWithAudio(function (sourceId, canRequestAudioTrack) {
                screen_constraints.mandatory.chromeMediaSourceId = sourceId;

                if (canRequestAudioTrack) {
                    screen_constraints.canRequestAudioTrack = true;
                }
                callback(sourceId == 'PermissionDeniedError' ? sourceId : null, screen_constraints);
            });
        }
        else {
            getSourceId(function (sourceId) {
                screen_constraints.mandatory.chromeMediaSourceId = sourceId;
                callback(sourceId == 'PermissionDeniedError' ? sourceId : null, screen_constraints);
            });
        }
        return;
    }

    // this statement sets gets 'sourceId" and sets "chromeMediaSourceId" 
    if (chromeMediaSource == 'desktop') {
        screen_constraints.mandatory.chromeMediaSourceId = sourceId;
    }

    // now invoking native getUserMedia API
    callback(null, screen_constraints);
}

exports.getScreenConstraints = getScreenConstraints;
exports.getScreenConstraintsWithAudio = getScreenConstraintsWithAudio;
exports.isChromeExtensionAvailable = isChromeExtensionAvailable;
exports.getChromeExtensionStatus = getChromeExtensionStatus;
exports.getSourceId = getSourceId;