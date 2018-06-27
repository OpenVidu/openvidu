(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var objectCreate = Object.create || objectCreatePolyfill
var objectKeys = Object.keys || objectKeysPolyfill
var bind = Function.prototype.bind || functionBindPolyfill

function EventEmitter() {
  if (!this._events || !Object.prototype.hasOwnProperty.call(this, '_events')) {
    this._events = objectCreate(null);
    this._eventsCount = 0;
  }

  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
var defaultMaxListeners = 10;

var hasDefineProperty;
try {
  var o = {};
  if (Object.defineProperty) Object.defineProperty(o, 'x', { value: 0 });
  hasDefineProperty = o.x === 0;
} catch (err) { hasDefineProperty = false }
if (hasDefineProperty) {
  Object.defineProperty(EventEmitter, 'defaultMaxListeners', {
    enumerable: true,
    get: function() {
      return defaultMaxListeners;
    },
    set: function(arg) {
      // check whether the input is a positive number (whose value is zero or
      // greater and not a NaN).
      if (typeof arg !== 'number' || arg < 0 || arg !== arg)
        throw new TypeError('"defaultMaxListeners" must be a positive number');
      defaultMaxListeners = arg;
    }
  });
} else {
  EventEmitter.defaultMaxListeners = defaultMaxListeners;
}

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== 'number' || n < 0 || isNaN(n))
    throw new TypeError('"n" argument must be a positive number');
  this._maxListeners = n;
  return this;
};

function $getMaxListeners(that) {
  if (that._maxListeners === undefined)
    return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}

EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return $getMaxListeners(this);
};

// These standalone emit* functions are used to optimize calling of event
// handlers for fast cases because emit() itself often has a variable number of
// arguments and can be deoptimized because of that. These functions always have
// the same number of arguments and thus do not get deoptimized, so the code
// inside them can execute faster.
function emitNone(handler, isFn, self) {
  if (isFn)
    handler.call(self);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self);
  }
}
function emitOne(handler, isFn, self, arg1) {
  if (isFn)
    handler.call(self, arg1);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1);
  }
}
function emitTwo(handler, isFn, self, arg1, arg2) {
  if (isFn)
    handler.call(self, arg1, arg2);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2);
  }
}
function emitThree(handler, isFn, self, arg1, arg2, arg3) {
  if (isFn)
    handler.call(self, arg1, arg2, arg3);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2, arg3);
  }
}

function emitMany(handler, isFn, self, args) {
  if (isFn)
    handler.apply(self, args);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].apply(self, args);
  }
}

EventEmitter.prototype.emit = function emit(type) {
  var er, handler, len, args, i, events;
  var doError = (type === 'error');

  events = this._events;
  if (events)
    doError = (doError && events.error == null);
  else if (!doError)
    return false;

  // If there is no 'error' event listener then throw.
  if (doError) {
    if (arguments.length > 1)
      er = arguments[1];
    if (er instanceof Error) {
      throw er; // Unhandled 'error' event
    } else {
      // At least give some kind of context to the user
      var err = new Error('Unhandled "error" event. (' + er + ')');
      err.context = er;
      throw err;
    }
    return false;
  }

  handler = events[type];

  if (!handler)
    return false;

  var isFn = typeof handler === 'function';
  len = arguments.length;
  switch (len) {
      // fast cases
    case 1:
      emitNone(handler, isFn, this);
      break;
    case 2:
      emitOne(handler, isFn, this, arguments[1]);
      break;
    case 3:
      emitTwo(handler, isFn, this, arguments[1], arguments[2]);
      break;
    case 4:
      emitThree(handler, isFn, this, arguments[1], arguments[2], arguments[3]);
      break;
      // slower
    default:
      args = new Array(len - 1);
      for (i = 1; i < len; i++)
        args[i - 1] = arguments[i];
      emitMany(handler, isFn, this, args);
  }

  return true;
};

function _addListener(target, type, listener, prepend) {
  var m;
  var events;
  var existing;

  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');

  events = target._events;
  if (!events) {
    events = target._events = objectCreate(null);
    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener) {
      target.emit('newListener', type,
          listener.listener ? listener.listener : listener);

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = target._events;
    }
    existing = events[type];
  }

  if (!existing) {
    // Optimize the case of one listener. Don't need the extra array object.
    existing = events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] =
          prepend ? [listener, existing] : [existing, listener];
    } else {
      // If we've already got an array, just append.
      if (prepend) {
        existing.unshift(listener);
      } else {
        existing.push(listener);
      }
    }

    // Check for listener leak
    if (!existing.warned) {
      m = $getMaxListeners(target);
      if (m && m > 0 && existing.length > m) {
        existing.warned = true;
        var w = new Error('Possible EventEmitter memory leak detected. ' +
            existing.length + ' "' + String(type) + '" listeners ' +
            'added. Use emitter.setMaxListeners() to ' +
            'increase limit.');
        w.name = 'MaxListenersExceededWarning';
        w.emitter = target;
        w.type = type;
        w.count = existing.length;
        if (typeof console === 'object' && console.warn) {
          console.warn('%s: %s', w.name, w.message);
        }
      }
    }
  }

  return target;
}

EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.prependListener =
    function prependListener(type, listener) {
      return _addListener(this, type, listener, true);
    };

function onceWrapper() {
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);
    this.fired = true;
    switch (arguments.length) {
      case 0:
        return this.listener.call(this.target);
      case 1:
        return this.listener.call(this.target, arguments[0]);
      case 2:
        return this.listener.call(this.target, arguments[0], arguments[1]);
      case 3:
        return this.listener.call(this.target, arguments[0], arguments[1],
            arguments[2]);
      default:
        var args = new Array(arguments.length);
        for (var i = 0; i < args.length; ++i)
          args[i] = arguments[i];
        this.listener.apply(this.target, args);
    }
  }
}

function _onceWrap(target, type, listener) {
  var state = { fired: false, wrapFn: undefined, target: target, type: type, listener: listener };
  var wrapped = bind.call(onceWrapper, state);
  wrapped.listener = listener;
  state.wrapFn = wrapped;
  return wrapped;
}

EventEmitter.prototype.once = function once(type, listener) {
  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');
  this.on(type, _onceWrap(this, type, listener));
  return this;
};

EventEmitter.prototype.prependOnceListener =
    function prependOnceListener(type, listener) {
      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');
      this.prependListener(type, _onceWrap(this, type, listener));
      return this;
    };

// Emits a 'removeListener' event if and only if the listener was removed.
EventEmitter.prototype.removeListener =
    function removeListener(type, listener) {
      var list, events, position, i, originalListener;

      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');

      events = this._events;
      if (!events)
        return this;

      list = events[type];
      if (!list)
        return this;

      if (list === listener || list.listener === listener) {
        if (--this._eventsCount === 0)
          this._events = objectCreate(null);
        else {
          delete events[type];
          if (events.removeListener)
            this.emit('removeListener', type, list.listener || listener);
        }
      } else if (typeof list !== 'function') {
        position = -1;

        for (i = list.length - 1; i >= 0; i--) {
          if (list[i] === listener || list[i].listener === listener) {
            originalListener = list[i].listener;
            position = i;
            break;
          }
        }

        if (position < 0)
          return this;

        if (position === 0)
          list.shift();
        else
          spliceOne(list, position);

        if (list.length === 1)
          events[type] = list[0];

        if (events.removeListener)
          this.emit('removeListener', type, originalListener || listener);
      }

      return this;
    };

EventEmitter.prototype.removeAllListeners =
    function removeAllListeners(type) {
      var listeners, events, i;

      events = this._events;
      if (!events)
        return this;

      // not listening for removeListener, no need to emit
      if (!events.removeListener) {
        if (arguments.length === 0) {
          this._events = objectCreate(null);
          this._eventsCount = 0;
        } else if (events[type]) {
          if (--this._eventsCount === 0)
            this._events = objectCreate(null);
          else
            delete events[type];
        }
        return this;
      }

      // emit removeListener for all listeners on all events
      if (arguments.length === 0) {
        var keys = objectKeys(events);
        var key;
        for (i = 0; i < keys.length; ++i) {
          key = keys[i];
          if (key === 'removeListener') continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners('removeListener');
        this._events = objectCreate(null);
        this._eventsCount = 0;
        return this;
      }

      listeners = events[type];

      if (typeof listeners === 'function') {
        this.removeListener(type, listeners);
      } else if (listeners) {
        // LIFO order
        for (i = listeners.length - 1; i >= 0; i--) {
          this.removeListener(type, listeners[i]);
        }
      }

      return this;
    };

function _listeners(target, type, unwrap) {
  var events = target._events;

  if (!events)
    return [];

  var evlistener = events[type];
  if (!evlistener)
    return [];

  if (typeof evlistener === 'function')
    return unwrap ? [evlistener.listener || evlistener] : [evlistener];

  return unwrap ? unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
}

EventEmitter.prototype.listeners = function listeners(type) {
  return _listeners(this, type, true);
};

EventEmitter.prototype.rawListeners = function rawListeners(type) {
  return _listeners(this, type, false);
};

EventEmitter.listenerCount = function(emitter, type) {
  if (typeof emitter.listenerCount === 'function') {
    return emitter.listenerCount(type);
  } else {
    return listenerCount.call(emitter, type);
  }
};

EventEmitter.prototype.listenerCount = listenerCount;
function listenerCount(type) {
  var events = this._events;

  if (events) {
    var evlistener = events[type];

    if (typeof evlistener === 'function') {
      return 1;
    } else if (evlistener) {
      return evlistener.length;
    }
  }

  return 0;
}

EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? Reflect.ownKeys(this._events) : [];
};

// About 1.5x faster than the two-arg version of Array#splice().
function spliceOne(list, index) {
  for (var i = index, k = i + 1, n = list.length; k < n; i += 1, k += 1)
    list[i] = list[k];
  list.pop();
}

function arrayClone(arr, n) {
  var copy = new Array(n);
  for (var i = 0; i < n; ++i)
    copy[i] = arr[i];
  return copy;
}

function unwrapListeners(arr) {
  var ret = new Array(arr.length);
  for (var i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }
  return ret;
}

function objectCreatePolyfill(proto) {
  var F = function() {};
  F.prototype = proto;
  return new F;
}
function objectKeysPolyfill(obj) {
  var keys = [];
  for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) {
    keys.push(k);
  }
  return k;
}
function functionBindPolyfill(context) {
  var fn = this;
  return function () {
    return fn.apply(context, arguments);
  };
}

},{}],2:[function(require,module,exports){
/* jshint node: true */
'use strict';

var normalice = require('normalice');

/**
  # freeice

  The `freeice` module is a simple way of getting random STUN or TURN server
  for your WebRTC application.  The list of servers (just STUN at this stage)
  were sourced from this [gist](https://gist.github.com/zziuni/3741933).

  ## Example Use

  The following demonstrates how you can use `freeice` with
  [rtc-quickconnect](https://github.com/rtc-io/rtc-quickconnect):

  <<< examples/quickconnect.js

  As the `freeice` module generates ice servers in a list compliant with the
  WebRTC spec you will be able to use it with raw `RTCPeerConnection`
  constructors and other WebRTC libraries.

  ## Hey, don't use my STUN/TURN server!

  If for some reason your free STUN or TURN server ends up in the
  list of servers ([stun](https://github.com/DamonOehlman/freeice/blob/master/stun.json) or
  [turn](https://github.com/DamonOehlman/freeice/blob/master/turn.json))
  that is used in this module, you can feel
  free to open an issue on this repository and those servers will be removed
  within 24 hours (or sooner).  This is the quickest and probably the most
  polite way to have something removed (and provides us some visibility
  if someone opens a pull request requesting that a server is added).

  ## Please add my server!

  If you have a server that you wish to add to the list, that's awesome! I'm
  sure I speak on behalf of a whole pile of WebRTC developers who say thanks.
  To get it into the list, feel free to either open a pull request or if you
  find that process a bit daunting then just create an issue requesting
  the addition of the server (make sure you provide all the details, and if
  you have a Terms of Service then including that in the PR/issue would be
  awesome).

  ## I know of a free server, can I add it?

  Sure, if you do your homework and make sure it is ok to use (I'm currently
  in the process of reviewing the terms of those STUN servers included from
  the original list).  If it's ok to go, then please see the previous entry
  for how to add it.

  ## Current List of Servers

  * current as at the time of last `README.md` file generation

  ### STUN

  <<< stun.json

  ### TURN

  <<< turn.json

**/

var freeice = module.exports = function(opts) {
  // if a list of servers has been provided, then use it instead of defaults
  var servers = {
    stun: (opts || {}).stun || require('./stun.json'),
    turn: (opts || {}).turn || require('./turn.json')
  };

  var stunCount = (opts || {}).stunCount || 2;
  var turnCount = (opts || {}).turnCount || 0;
  var selected;

  function getServers(type, count) {
    var out = [];
    var input = [].concat(servers[type]);
    var idx;

    while (input.length && out.length < count) {
      idx = (Math.random() * input.length) | 0;
      out = out.concat(input.splice(idx, 1));
    }

    return out.map(function(url) {
        //If it's a not a string, don't try to "normalice" it otherwise using type:url will screw it up
        if ((typeof url !== 'string') && (! (url instanceof String))) {
            return url;
        } else {
            return normalice(type + ':' + url);
        }
    });
  }

  // add stun servers
  selected = [].concat(getServers('stun', stunCount));

  if (turnCount) {
    selected = selected.concat(getServers('turn', turnCount));
  }

  return selected;
};

},{"./stun.json":3,"./turn.json":4,"normalice":7}],3:[function(require,module,exports){
module.exports=[
  "stun.l.google.com:19302",
  "stun1.l.google.com:19302",
  "stun2.l.google.com:19302",
  "stun3.l.google.com:19302",
  "stun4.l.google.com:19302",
  "stun.ekiga.net",
  "stun.ideasip.com",
  "stun.schlund.de",
  "stun.stunprotocol.org:3478",
  "stun.voiparound.com",
  "stun.voipbuster.com",
  "stun.voipstunt.com",
  "stun.voxgratia.org",
  "stun.services.mozilla.com"
]

},{}],4:[function(require,module,exports){
module.exports=[]

},{}],5:[function(require,module,exports){
var WildEmitter = require('wildemitter');

function getMaxVolume (analyser, fftBins) {
  var maxVolume = -Infinity;
  analyser.getFloatFrequencyData(fftBins);

  for(var i=4, ii=fftBins.length; i < ii; i++) {
    if (fftBins[i] > maxVolume && fftBins[i] < 0) {
      maxVolume = fftBins[i];
    }
  };

  return maxVolume;
}


var audioContextType;
if (typeof window !== 'undefined') {
  audioContextType = window.AudioContext || window.webkitAudioContext;
}
// use a single audio context due to hardware limits
var audioContext = null;
module.exports = function(stream, options) {
  var harker = new WildEmitter();


  // make it not break in non-supported browsers
  if (!audioContextType) return harker;

  //Config
  var options = options || {},
      smoothing = (options.smoothing || 0.1),
      interval = (options.interval || 50),
      threshold = options.threshold,
      play = options.play,
      history = options.history || 10,
      running = true;

  //Setup Audio Context
  if (!audioContext) {
    audioContext = new audioContextType();
  }
  var sourceNode, fftBins, analyser;

  analyser = audioContext.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = smoothing;
  fftBins = new Float32Array(analyser.frequencyBinCount);

  if (stream.jquery) stream = stream[0];
  if (stream instanceof HTMLAudioElement || stream instanceof HTMLVideoElement) {
    //Audio Tag
    sourceNode = audioContext.createMediaElementSource(stream);
    if (typeof play === 'undefined') play = true;
    threshold = threshold || -50;
  } else {
    //WebRTC Stream
    sourceNode = audioContext.createMediaStreamSource(stream);
    threshold = threshold || -50;
  }

  sourceNode.connect(analyser);
  if (play) analyser.connect(audioContext.destination);

  harker.speaking = false;

  harker.suspend = function() {
    audioContext.suspend();
  }
  harker.resume = function() {
    audioContext.resume();
  }
  Object.defineProperty(harker, 'state', { get: function() {
    return audioContext.state;
  }});
  audioContext.onstatechange = function() {
    harker.emit('state_change', audioContext.state);
  }

  harker.setThreshold = function(t) {
    threshold = t;
  };

  harker.setInterval = function(i) {
    interval = i;
  };

  harker.stop = function() {
    running = false;
    harker.emit('volume_change', -100, threshold);
    if (harker.speaking) {
      harker.speaking = false;
      harker.emit('stopped_speaking');
    }
    analyser.disconnect();
    sourceNode.disconnect();
  };
  harker.speakingHistory = [];
  for (var i = 0; i < history; i++) {
      harker.speakingHistory.push(0);
  }

  // Poll the analyser node to determine if speaking
  // and emit events if changed
  var looper = function() {
    setTimeout(function() {

      //check if stop has been called
      if(!running) {
        return;
      }

      var currentVolume = getMaxVolume(analyser, fftBins);

      harker.emit('volume_change', currentVolume, threshold);

      var history = 0;
      if (currentVolume > threshold && !harker.speaking) {
        // trigger quickly, short history
        for (var i = harker.speakingHistory.length - 3; i < harker.speakingHistory.length; i++) {
          history += harker.speakingHistory[i];
        }
        if (history >= 2) {
          harker.speaking = true;
          harker.emit('speaking');
        }
      } else if (currentVolume < threshold && harker.speaking) {
        for (var i = 0; i < harker.speakingHistory.length; i++) {
          history += harker.speakingHistory[i];
        }
        if (history == 0) {
          harker.speaking = false;
          harker.emit('stopped_speaking');
        }
      }
      harker.speakingHistory.shift();
      harker.speakingHistory.push(0 + (currentVolume > threshold));

      looper();
    }, interval);
  };
  looper();


  return harker;
}

},{"wildemitter":14}],6:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],7:[function(require,module,exports){
/**
  # normalice

  Normalize an ice server configuration object (or plain old string) into a format
  that is usable in all browsers supporting WebRTC.  Primarily this module is designed
  to help with the transition of the `url` attribute of the configuration object to
  the `urls` attribute.

  ## Example Usage

  <<< examples/simple.js

**/

var protocols = [
  'stun:',
  'turn:'
];

module.exports = function(input) {
  var url = (input || {}).url || input;
  var protocol;
  var parts;
  var output = {};

  // if we don't have a string url, then allow the input to passthrough
  if (typeof url != 'string' && (! (url instanceof String))) {
    return input;
  }

  // trim the url string, and convert to an array
  url = url.trim();

  // if the protocol is not known, then passthrough
  protocol = protocols[protocols.indexOf(url.slice(0, 5))];
  if (! protocol) {
    return input;
  }

  // now let's attack the remaining url parts
  url = url.slice(5);
  parts = url.split('@');

  output.username = input.username;
  output.credential = input.credential;
  // if we have an authentication part, then set the credentials
  if (parts.length > 1) {
    url = parts[1];
    parts = parts[0].split(':');

    // add the output credential and username
    output.username = parts[0];
    output.credential = (input || {}).credential || parts[1] || '';
  }

  output.url = protocol + url;
  output.urls = [ output.url ];

  return output;
};

},{}],8:[function(require,module,exports){
(function (global){
/*!
 * Platform.js <https://mths.be/platform>
 * Copyright 2014-2018 Benjamin Tan <https://bnjmnt4n.now.sh/>
 * Copyright 2011-2013 John-David Dalton <http://allyoucanleet.com/>
 * Available under MIT license <https://mths.be/mit>
 */
;(function() {
  'use strict';

  /** Used to determine if values are of the language type `Object`. */
  var objectTypes = {
    'function': true,
    'object': true
  };

  /** Used as a reference to the global object. */
  var root = (objectTypes[typeof window] && window) || this;

  /** Backup possible global object. */
  var oldRoot = root;

  /** Detect free variable `exports`. */
  var freeExports = objectTypes[typeof exports] && exports;

  /** Detect free variable `module`. */
  var freeModule = objectTypes[typeof module] && module && !module.nodeType && module;

  /** Detect free variable `global` from Node.js or Browserified code and use it as `root`. */
  var freeGlobal = freeExports && freeModule && typeof global == 'object' && global;
  if (freeGlobal && (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal || freeGlobal.self === freeGlobal)) {
    root = freeGlobal;
  }

  /**
   * Used as the maximum length of an array-like object.
   * See the [ES6 spec](http://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength)
   * for more details.
   */
  var maxSafeInteger = Math.pow(2, 53) - 1;

  /** Regular expression to detect Opera. */
  var reOpera = /\bOpera/;

  /** Possible global object. */
  var thisBinding = this;

  /** Used for native method references. */
  var objectProto = Object.prototype;

  /** Used to check for own properties of an object. */
  var hasOwnProperty = objectProto.hasOwnProperty;

  /** Used to resolve the internal `[[Class]]` of values. */
  var toString = objectProto.toString;

  /*--------------------------------------------------------------------------*/

  /**
   * Capitalizes a string value.
   *
   * @private
   * @param {string} string The string to capitalize.
   * @returns {string} The capitalized string.
   */
  function capitalize(string) {
    string = String(string);
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  /**
   * A utility function to clean up the OS name.
   *
   * @private
   * @param {string} os The OS name to clean up.
   * @param {string} [pattern] A `RegExp` pattern matching the OS name.
   * @param {string} [label] A label for the OS.
   */
  function cleanupOS(os, pattern, label) {
    // Platform tokens are defined at:
    // http://msdn.microsoft.com/en-us/library/ms537503(VS.85).aspx
    // http://web.archive.org/web/20081122053950/http://msdn.microsoft.com/en-us/library/ms537503(VS.85).aspx
    var data = {
      '10.0': '10',
      '6.4':  '10 Technical Preview',
      '6.3':  '8.1',
      '6.2':  '8',
      '6.1':  'Server 2008 R2 / 7',
      '6.0':  'Server 2008 / Vista',
      '5.2':  'Server 2003 / XP 64-bit',
      '5.1':  'XP',
      '5.01': '2000 SP1',
      '5.0':  '2000',
      '4.0':  'NT',
      '4.90': 'ME'
    };
    // Detect Windows version from platform tokens.
    if (pattern && label && /^Win/i.test(os) && !/^Windows Phone /i.test(os) &&
        (data = data[/[\d.]+$/.exec(os)])) {
      os = 'Windows ' + data;
    }
    // Correct character case and cleanup string.
    os = String(os);

    if (pattern && label) {
      os = os.replace(RegExp(pattern, 'i'), label);
    }

    os = format(
      os.replace(/ ce$/i, ' CE')
        .replace(/\bhpw/i, 'web')
        .replace(/\bMacintosh\b/, 'Mac OS')
        .replace(/_PowerPC\b/i, ' OS')
        .replace(/\b(OS X) [^ \d]+/i, '$1')
        .replace(/\bMac (OS X)\b/, '$1')
        .replace(/\/(\d)/, ' $1')
        .replace(/_/g, '.')
        .replace(/(?: BePC|[ .]*fc[ \d.]+)$/i, '')
        .replace(/\bx86\.64\b/gi, 'x86_64')
        .replace(/\b(Windows Phone) OS\b/, '$1')
        .replace(/\b(Chrome OS \w+) [\d.]+\b/, '$1')
        .split(' on ')[0]
    );

    return os;
  }

  /**
   * An iteration utility for arrays and objects.
   *
   * @private
   * @param {Array|Object} object The object to iterate over.
   * @param {Function} callback The function called per iteration.
   */
  function each(object, callback) {
    var index = -1,
        length = object ? object.length : 0;

    if (typeof length == 'number' && length > -1 && length <= maxSafeInteger) {
      while (++index < length) {
        callback(object[index], index, object);
      }
    } else {
      forOwn(object, callback);
    }
  }

  /**
   * Trim and conditionally capitalize string values.
   *
   * @private
   * @param {string} string The string to format.
   * @returns {string} The formatted string.
   */
  function format(string) {
    string = trim(string);
    return /^(?:webOS|i(?:OS|P))/.test(string)
      ? string
      : capitalize(string);
  }

  /**
   * Iterates over an object's own properties, executing the `callback` for each.
   *
   * @private
   * @param {Object} object The object to iterate over.
   * @param {Function} callback The function executed per own property.
   */
  function forOwn(object, callback) {
    for (var key in object) {
      if (hasOwnProperty.call(object, key)) {
        callback(object[key], key, object);
      }
    }
  }

  /**
   * Gets the internal `[[Class]]` of a value.
   *
   * @private
   * @param {*} value The value.
   * @returns {string} The `[[Class]]`.
   */
  function getClassOf(value) {
    return value == null
      ? capitalize(value)
      : toString.call(value).slice(8, -1);
  }

  /**
   * Host objects can return type values that are different from their actual
   * data type. The objects we are concerned with usually return non-primitive
   * types of "object", "function", or "unknown".
   *
   * @private
   * @param {*} object The owner of the property.
   * @param {string} property The property to check.
   * @returns {boolean} Returns `true` if the property value is a non-primitive, else `false`.
   */
  function isHostType(object, property) {
    var type = object != null ? typeof object[property] : 'number';
    return !/^(?:boolean|number|string|undefined)$/.test(type) &&
      (type == 'object' ? !!object[property] : true);
  }

  /**
   * Prepares a string for use in a `RegExp` by making hyphens and spaces optional.
   *
   * @private
   * @param {string} string The string to qualify.
   * @returns {string} The qualified string.
   */
  function qualify(string) {
    return String(string).replace(/([ -])(?!$)/g, '$1?');
  }

  /**
   * A bare-bones `Array#reduce` like utility function.
   *
   * @private
   * @param {Array} array The array to iterate over.
   * @param {Function} callback The function called per iteration.
   * @returns {*} The accumulated result.
   */
  function reduce(array, callback) {
    var accumulator = null;
    each(array, function(value, index) {
      accumulator = callback(accumulator, value, index, array);
    });
    return accumulator;
  }

  /**
   * Removes leading and trailing whitespace from a string.
   *
   * @private
   * @param {string} string The string to trim.
   * @returns {string} The trimmed string.
   */
  function trim(string) {
    return String(string).replace(/^ +| +$/g, '');
  }

  /*--------------------------------------------------------------------------*/

  /**
   * Creates a new platform object.
   *
   * @memberOf platform
   * @param {Object|string} [ua=navigator.userAgent] The user agent string or
   *  context object.
   * @returns {Object} A platform object.
   */
  function parse(ua) {

    /** The environment context object. */
    var context = root;

    /** Used to flag when a custom context is provided. */
    var isCustomContext = ua && typeof ua == 'object' && getClassOf(ua) != 'String';

    // Juggle arguments.
    if (isCustomContext) {
      context = ua;
      ua = null;
    }

    /** Browser navigator object. */
    var nav = context.navigator || {};

    /** Browser user agent string. */
    var userAgent = nav.userAgent || '';

    ua || (ua = userAgent);

    /** Used to flag when `thisBinding` is the [ModuleScope]. */
    var isModuleScope = isCustomContext || thisBinding == oldRoot;

    /** Used to detect if browser is like Chrome. */
    var likeChrome = isCustomContext
      ? !!nav.likeChrome
      : /\bChrome\b/.test(ua) && !/internal|\n/i.test(toString.toString());

    /** Internal `[[Class]]` value shortcuts. */
    var objectClass = 'Object',
        airRuntimeClass = isCustomContext ? objectClass : 'ScriptBridgingProxyObject',
        enviroClass = isCustomContext ? objectClass : 'Environment',
        javaClass = (isCustomContext && context.java) ? 'JavaPackage' : getClassOf(context.java),
        phantomClass = isCustomContext ? objectClass : 'RuntimeObject';

    /** Detect Java environments. */
    var java = /\bJava/.test(javaClass) && context.java;

    /** Detect Rhino. */
    var rhino = java && getClassOf(context.environment) == enviroClass;

    /** A character to represent alpha. */
    var alpha = java ? 'a' : '\u03b1';

    /** A character to represent beta. */
    var beta = java ? 'b' : '\u03b2';

    /** Browser document object. */
    var doc = context.document || {};

    /**
     * Detect Opera browser (Presto-based).
     * http://www.howtocreate.co.uk/operaStuff/operaObject.html
     * http://dev.opera.com/articles/view/opera-mini-web-content-authoring-guidelines/#operamini
     */
    var opera = context.operamini || context.opera;

    /** Opera `[[Class]]`. */
    var operaClass = reOpera.test(operaClass = (isCustomContext && opera) ? opera['[[Class]]'] : getClassOf(opera))
      ? operaClass
      : (opera = null);

    /*------------------------------------------------------------------------*/

    /** Temporary variable used over the script's lifetime. */
    var data;

    /** The CPU architecture. */
    var arch = ua;

    /** Platform description array. */
    var description = [];

    /** Platform alpha/beta indicator. */
    var prerelease = null;

    /** A flag to indicate that environment features should be used to resolve the platform. */
    var useFeatures = ua == userAgent;

    /** The browser/environment version. */
    var version = useFeatures && opera && typeof opera.version == 'function' && opera.version();

    /** A flag to indicate if the OS ends with "/ Version" */
    var isSpecialCasedOS;

    /* Detectable layout engines (order is important). */
    var layout = getLayout([
      { 'label': 'EdgeHTML', 'pattern': 'Edge' },
      'Trident',
      { 'label': 'WebKit', 'pattern': 'AppleWebKit' },
      'iCab',
      'Presto',
      'NetFront',
      'Tasman',
      'KHTML',
      'Gecko'
    ]);

    /* Detectable browser names (order is important). */
    var name = getName([
      'Adobe AIR',
      'Arora',
      'Avant Browser',
      'Breach',
      'Camino',
      'Electron',
      'Epiphany',
      'Fennec',
      'Flock',
      'Galeon',
      'GreenBrowser',
      'iCab',
      'Iceweasel',
      'K-Meleon',
      'Konqueror',
      'Lunascape',
      'Maxthon',
      { 'label': 'Microsoft Edge', 'pattern': 'Edge' },
      'Midori',
      'Nook Browser',
      'PaleMoon',
      'PhantomJS',
      'Raven',
      'Rekonq',
      'RockMelt',
      { 'label': 'Samsung Internet', 'pattern': 'SamsungBrowser' },
      'SeaMonkey',
      { 'label': 'Silk', 'pattern': '(?:Cloud9|Silk-Accelerated)' },
      'Sleipnir',
      'SlimBrowser',
      { 'label': 'SRWare Iron', 'pattern': 'Iron' },
      'Sunrise',
      'Swiftfox',
      'Waterfox',
      'WebPositive',
      'Opera Mini',
      { 'label': 'Opera Mini', 'pattern': 'OPiOS' },
      'Opera',
      { 'label': 'Opera', 'pattern': 'OPR' },
      'Chrome',
      { 'label': 'Chrome Mobile', 'pattern': '(?:CriOS|CrMo)' },
      { 'label': 'Firefox', 'pattern': '(?:Firefox|Minefield)' },
      { 'label': 'Firefox for iOS', 'pattern': 'FxiOS' },
      { 'label': 'IE', 'pattern': 'IEMobile' },
      { 'label': 'IE', 'pattern': 'MSIE' },
      'Safari'
    ]);

    /* Detectable products (order is important). */
    var product = getProduct([
      { 'label': 'BlackBerry', 'pattern': 'BB10' },
      'BlackBerry',
      { 'label': 'Galaxy S', 'pattern': 'GT-I9000' },
      { 'label': 'Galaxy S2', 'pattern': 'GT-I9100' },
      { 'label': 'Galaxy S3', 'pattern': 'GT-I9300' },
      { 'label': 'Galaxy S4', 'pattern': 'GT-I9500' },
      { 'label': 'Galaxy S5', 'pattern': 'SM-G900' },
      { 'label': 'Galaxy S6', 'pattern': 'SM-G920' },
      { 'label': 'Galaxy S6 Edge', 'pattern': 'SM-G925' },
      { 'label': 'Galaxy S7', 'pattern': 'SM-G930' },
      { 'label': 'Galaxy S7 Edge', 'pattern': 'SM-G935' },
      'Google TV',
      'Lumia',
      'iPad',
      'iPod',
      'iPhone',
      'Kindle',
      { 'label': 'Kindle Fire', 'pattern': '(?:Cloud9|Silk-Accelerated)' },
      'Nexus',
      'Nook',
      'PlayBook',
      'PlayStation Vita',
      'PlayStation',
      'TouchPad',
      'Transformer',
      { 'label': 'Wii U', 'pattern': 'WiiU' },
      'Wii',
      'Xbox One',
      { 'label': 'Xbox 360', 'pattern': 'Xbox' },
      'Xoom'
    ]);

    /* Detectable manufacturers. */
    var manufacturer = getManufacturer({
      'Apple': { 'iPad': 1, 'iPhone': 1, 'iPod': 1 },
      'Archos': {},
      'Amazon': { 'Kindle': 1, 'Kindle Fire': 1 },
      'Asus': { 'Transformer': 1 },
      'Barnes & Noble': { 'Nook': 1 },
      'BlackBerry': { 'PlayBook': 1 },
      'Google': { 'Google TV': 1, 'Nexus': 1 },
      'HP': { 'TouchPad': 1 },
      'HTC': {},
      'LG': {},
      'Microsoft': { 'Xbox': 1, 'Xbox One': 1 },
      'Motorola': { 'Xoom': 1 },
      'Nintendo': { 'Wii U': 1,  'Wii': 1 },
      'Nokia': { 'Lumia': 1 },
      'Samsung': { 'Galaxy S': 1, 'Galaxy S2': 1, 'Galaxy S3': 1, 'Galaxy S4': 1 },
      'Sony': { 'PlayStation': 1, 'PlayStation Vita': 1 }
    });

    /* Detectable operating systems (order is important). */
    var os = getOS([
      'Windows Phone',
      'Android',
      'CentOS',
      { 'label': 'Chrome OS', 'pattern': 'CrOS' },
      'Debian',
      'Fedora',
      'FreeBSD',
      'Gentoo',
      'Haiku',
      'Kubuntu',
      'Linux Mint',
      'OpenBSD',
      'Red Hat',
      'SuSE',
      'Ubuntu',
      'Xubuntu',
      'Cygwin',
      'Symbian OS',
      'hpwOS',
      'webOS ',
      'webOS',
      'Tablet OS',
      'Tizen',
      'Linux',
      'Mac OS X',
      'Macintosh',
      'Mac',
      'Windows 98;',
      'Windows '
    ]);

    /*------------------------------------------------------------------------*/

    /**
     * Picks the layout engine from an array of guesses.
     *
     * @private
     * @param {Array} guesses An array of guesses.
     * @returns {null|string} The detected layout engine.
     */
    function getLayout(guesses) {
      return reduce(guesses, function(result, guess) {
        return result || RegExp('\\b' + (
          guess.pattern || qualify(guess)
        ) + '\\b', 'i').exec(ua) && (guess.label || guess);
      });
    }

    /**
     * Picks the manufacturer from an array of guesses.
     *
     * @private
     * @param {Array} guesses An object of guesses.
     * @returns {null|string} The detected manufacturer.
     */
    function getManufacturer(guesses) {
      return reduce(guesses, function(result, value, key) {
        // Lookup the manufacturer by product or scan the UA for the manufacturer.
        return result || (
          value[product] ||
          value[/^[a-z]+(?: +[a-z]+\b)*/i.exec(product)] ||
          RegExp('\\b' + qualify(key) + '(?:\\b|\\w*\\d)', 'i').exec(ua)
        ) && key;
      });
    }

    /**
     * Picks the browser name from an array of guesses.
     *
     * @private
     * @param {Array} guesses An array of guesses.
     * @returns {null|string} The detected browser name.
     */
    function getName(guesses) {
      return reduce(guesses, function(result, guess) {
        return result || RegExp('\\b' + (
          guess.pattern || qualify(guess)
        ) + '\\b', 'i').exec(ua) && (guess.label || guess);
      });
    }

    /**
     * Picks the OS name from an array of guesses.
     *
     * @private
     * @param {Array} guesses An array of guesses.
     * @returns {null|string} The detected OS name.
     */
    function getOS(guesses) {
      return reduce(guesses, function(result, guess) {
        var pattern = guess.pattern || qualify(guess);
        if (!result && (result =
              RegExp('\\b' + pattern + '(?:/[\\d.]+|[ \\w.]*)', 'i').exec(ua)
            )) {
          result = cleanupOS(result, pattern, guess.label || guess);
        }
        return result;
      });
    }

    /**
     * Picks the product name from an array of guesses.
     *
     * @private
     * @param {Array} guesses An array of guesses.
     * @returns {null|string} The detected product name.
     */
    function getProduct(guesses) {
      return reduce(guesses, function(result, guess) {
        var pattern = guess.pattern || qualify(guess);
        if (!result && (result =
              RegExp('\\b' + pattern + ' *\\d+[.\\w_]*', 'i').exec(ua) ||
              RegExp('\\b' + pattern + ' *\\w+-[\\w]*', 'i').exec(ua) ||
              RegExp('\\b' + pattern + '(?:; *(?:[a-z]+[_-])?[a-z]+\\d+|[^ ();-]*)', 'i').exec(ua)
            )) {
          // Split by forward slash and append product version if needed.
          if ((result = String((guess.label && !RegExp(pattern, 'i').test(guess.label)) ? guess.label : result).split('/'))[1] && !/[\d.]+/.test(result[0])) {
            result[0] += ' ' + result[1];
          }
          // Correct character case and cleanup string.
          guess = guess.label || guess;
          result = format(result[0]
            .replace(RegExp(pattern, 'i'), guess)
            .replace(RegExp('; *(?:' + guess + '[_-])?', 'i'), ' ')
            .replace(RegExp('(' + guess + ')[-_.]?(\\w)', 'i'), '$1 $2'));
        }
        return result;
      });
    }

    /**
     * Resolves the version using an array of UA patterns.
     *
     * @private
     * @param {Array} patterns An array of UA patterns.
     * @returns {null|string} The detected version.
     */
    function getVersion(patterns) {
      return reduce(patterns, function(result, pattern) {
        return result || (RegExp(pattern +
          '(?:-[\\d.]+/|(?: for [\\w-]+)?[ /-])([\\d.]+[^ ();/_-]*)', 'i').exec(ua) || 0)[1] || null;
      });
    }

    /**
     * Returns `platform.description` when the platform object is coerced to a string.
     *
     * @name toString
     * @memberOf platform
     * @returns {string} Returns `platform.description` if available, else an empty string.
     */
    function toStringPlatform() {
      return this.description || '';
    }

    /*------------------------------------------------------------------------*/

    // Convert layout to an array so we can add extra details.
    layout && (layout = [layout]);

    // Detect product names that contain their manufacturer's name.
    if (manufacturer && !product) {
      product = getProduct([manufacturer]);
    }
    // Clean up Google TV.
    if ((data = /\bGoogle TV\b/.exec(product))) {
      product = data[0];
    }
    // Detect simulators.
    if (/\bSimulator\b/i.test(ua)) {
      product = (product ? product + ' ' : '') + 'Simulator';
    }
    // Detect Opera Mini 8+ running in Turbo/Uncompressed mode on iOS.
    if (name == 'Opera Mini' && /\bOPiOS\b/.test(ua)) {
      description.push('running in Turbo/Uncompressed mode');
    }
    // Detect IE Mobile 11.
    if (name == 'IE' && /\blike iPhone OS\b/.test(ua)) {
      data = parse(ua.replace(/like iPhone OS/, ''));
      manufacturer = data.manufacturer;
      product = data.product;
    }
    // Detect iOS.
    else if (/^iP/.test(product)) {
      name || (name = 'Safari');
      os = 'iOS' + ((data = / OS ([\d_]+)/i.exec(ua))
        ? ' ' + data[1].replace(/_/g, '.')
        : '');
    }
    // Detect Kubuntu.
    else if (name == 'Konqueror' && !/buntu/i.test(os)) {
      os = 'Kubuntu';
    }
    // Detect Android browsers.
    else if ((manufacturer && manufacturer != 'Google' &&
        ((/Chrome/.test(name) && !/\bMobile Safari\b/i.test(ua)) || /\bVita\b/.test(product))) ||
        (/\bAndroid\b/.test(os) && /^Chrome/.test(name) && /\bVersion\//i.test(ua))) {
      name = 'Android Browser';
      os = /\bAndroid\b/.test(os) ? os : 'Android';
    }
    // Detect Silk desktop/accelerated modes.
    else if (name == 'Silk') {
      if (!/\bMobi/i.test(ua)) {
        os = 'Android';
        description.unshift('desktop mode');
      }
      if (/Accelerated *= *true/i.test(ua)) {
        description.unshift('accelerated');
      }
    }
    // Detect PaleMoon identifying as Firefox.
    else if (name == 'PaleMoon' && (data = /\bFirefox\/([\d.]+)\b/.exec(ua))) {
      description.push('identifying as Firefox ' + data[1]);
    }
    // Detect Firefox OS and products running Firefox.
    else if (name == 'Firefox' && (data = /\b(Mobile|Tablet|TV)\b/i.exec(ua))) {
      os || (os = 'Firefox OS');
      product || (product = data[1]);
    }
    // Detect false positives for Firefox/Safari.
    else if (!name || (data = !/\bMinefield\b/i.test(ua) && /\b(?:Firefox|Safari)\b/.exec(name))) {
      // Escape the `/` for Firefox 1.
      if (name && !product && /[\/,]|^[^(]+?\)/.test(ua.slice(ua.indexOf(data + '/') + 8))) {
        // Clear name of false positives.
        name = null;
      }
      // Reassign a generic name.
      if ((data = product || manufacturer || os) &&
          (product || manufacturer || /\b(?:Android|Symbian OS|Tablet OS|webOS)\b/.test(os))) {
        name = /[a-z]+(?: Hat)?/i.exec(/\bAndroid\b/.test(os) ? os : data) + ' Browser';
      }
    }
    // Add Chrome version to description for Electron.
    else if (name == 'Electron' && (data = (/\bChrome\/([\d.]+)\b/.exec(ua) || 0)[1])) {
      description.push('Chromium ' + data);
    }
    // Detect non-Opera (Presto-based) versions (order is important).
    if (!version) {
      version = getVersion([
        '(?:Cloud9|CriOS|CrMo|Edge|FxiOS|IEMobile|Iron|Opera ?Mini|OPiOS|OPR|Raven|SamsungBrowser|Silk(?!/[\\d.]+$))',
        'Version',
        qualify(name),
        '(?:Firefox|Minefield|NetFront)'
      ]);
    }
    // Detect stubborn layout engines.
    if ((data =
          layout == 'iCab' && parseFloat(version) > 3 && 'WebKit' ||
          /\bOpera\b/.test(name) && (/\bOPR\b/.test(ua) ? 'Blink' : 'Presto') ||
          /\b(?:Midori|Nook|Safari)\b/i.test(ua) && !/^(?:Trident|EdgeHTML)$/.test(layout) && 'WebKit' ||
          !layout && /\bMSIE\b/i.test(ua) && (os == 'Mac OS' ? 'Tasman' : 'Trident') ||
          layout == 'WebKit' && /\bPlayStation\b(?! Vita\b)/i.test(name) && 'NetFront'
        )) {
      layout = [data];
    }
    // Detect Windows Phone 7 desktop mode.
    if (name == 'IE' && (data = (/; *(?:XBLWP|ZuneWP)(\d+)/i.exec(ua) || 0)[1])) {
      name += ' Mobile';
      os = 'Windows Phone ' + (/\+$/.test(data) ? data : data + '.x');
      description.unshift('desktop mode');
    }
    // Detect Windows Phone 8.x desktop mode.
    else if (/\bWPDesktop\b/i.test(ua)) {
      name = 'IE Mobile';
      os = 'Windows Phone 8.x';
      description.unshift('desktop mode');
      version || (version = (/\brv:([\d.]+)/.exec(ua) || 0)[1]);
    }
    // Detect IE 11 identifying as other browsers.
    else if (name != 'IE' && layout == 'Trident' && (data = /\brv:([\d.]+)/.exec(ua))) {
      if (name) {
        description.push('identifying as ' + name + (version ? ' ' + version : ''));
      }
      name = 'IE';
      version = data[1];
    }
    // Leverage environment features.
    if (useFeatures) {
      // Detect server-side environments.
      // Rhino has a global function while others have a global object.
      if (isHostType(context, 'global')) {
        if (java) {
          data = java.lang.System;
          arch = data.getProperty('os.arch');
          os = os || data.getProperty('os.name') + ' ' + data.getProperty('os.version');
        }
        if (rhino) {
          try {
            version = context.require('ringo/engine').version.join('.');
            name = 'RingoJS';
          } catch(e) {
            if ((data = context.system) && data.global.system == context.system) {
              name = 'Narwhal';
              os || (os = data[0].os || null);
            }
          }
          if (!name) {
            name = 'Rhino';
          }
        }
        else if (
          typeof context.process == 'object' && !context.process.browser &&
          (data = context.process)
        ) {
          if (typeof data.versions == 'object') {
            if (typeof data.versions.electron == 'string') {
              description.push('Node ' + data.versions.node);
              name = 'Electron';
              version = data.versions.electron;
            } else if (typeof data.versions.nw == 'string') {
              description.push('Chromium ' + version, 'Node ' + data.versions.node);
              name = 'NW.js';
              version = data.versions.nw;
            }
          }
          if (!name) {
            name = 'Node.js';
            arch = data.arch;
            os = data.platform;
            version = /[\d.]+/.exec(data.version);
            version = version ? version[0] : null;
          }
        }
      }
      // Detect Adobe AIR.
      else if (getClassOf((data = context.runtime)) == airRuntimeClass) {
        name = 'Adobe AIR';
        os = data.flash.system.Capabilities.os;
      }
      // Detect PhantomJS.
      else if (getClassOf((data = context.phantom)) == phantomClass) {
        name = 'PhantomJS';
        version = (data = data.version || null) && (data.major + '.' + data.minor + '.' + data.patch);
      }
      // Detect IE compatibility modes.
      else if (typeof doc.documentMode == 'number' && (data = /\bTrident\/(\d+)/i.exec(ua))) {
        // We're in compatibility mode when the Trident version + 4 doesn't
        // equal the document mode.
        version = [version, doc.documentMode];
        if ((data = +data[1] + 4) != version[1]) {
          description.push('IE ' + version[1] + ' mode');
          layout && (layout[1] = '');
          version[1] = data;
        }
        version = name == 'IE' ? String(version[1].toFixed(1)) : version[0];
      }
      // Detect IE 11 masking as other browsers.
      else if (typeof doc.documentMode == 'number' && /^(?:Chrome|Firefox)\b/.test(name)) {
        description.push('masking as ' + name + ' ' + version);
        name = 'IE';
        version = '11.0';
        layout = ['Trident'];
        os = 'Windows';
      }
      os = os && format(os);
    }
    // Detect prerelease phases.
    if (version && (data =
          /(?:[ab]|dp|pre|[ab]\d+pre)(?:\d+\+?)?$/i.exec(version) ||
          /(?:alpha|beta)(?: ?\d)?/i.exec(ua + ';' + (useFeatures && nav.appMinorVersion)) ||
          /\bMinefield\b/i.test(ua) && 'a'
        )) {
      prerelease = /b/i.test(data) ? 'beta' : 'alpha';
      version = version.replace(RegExp(data + '\\+?$'), '') +
        (prerelease == 'beta' ? beta : alpha) + (/\d+\+?/.exec(data) || '');
    }
    // Detect Firefox Mobile.
    if (name == 'Fennec' || name == 'Firefox' && /\b(?:Android|Firefox OS)\b/.test(os)) {
      name = 'Firefox Mobile';
    }
    // Obscure Maxthon's unreliable version.
    else if (name == 'Maxthon' && version) {
      version = version.replace(/\.[\d.]+/, '.x');
    }
    // Detect Xbox 360 and Xbox One.
    else if (/\bXbox\b/i.test(product)) {
      if (product == 'Xbox 360') {
        os = null;
      }
      if (product == 'Xbox 360' && /\bIEMobile\b/.test(ua)) {
        description.unshift('mobile mode');
      }
    }
    // Add mobile postfix.
    else if ((/^(?:Chrome|IE|Opera)$/.test(name) || name && !product && !/Browser|Mobi/.test(name)) &&
        (os == 'Windows CE' || /Mobi/i.test(ua))) {
      name += ' Mobile';
    }
    // Detect IE platform preview.
    else if (name == 'IE' && useFeatures) {
      try {
        if (context.external === null) {
          description.unshift('platform preview');
        }
      } catch(e) {
        description.unshift('embedded');
      }
    }
    // Detect BlackBerry OS version.
    // http://docs.blackberry.com/en/developers/deliverables/18169/HTTP_headers_sent_by_BB_Browser_1234911_11.jsp
    else if ((/\bBlackBerry\b/.test(product) || /\bBB10\b/.test(ua)) && (data =
          (RegExp(product.replace(/ +/g, ' *') + '/([.\\d]+)', 'i').exec(ua) || 0)[1] ||
          version
        )) {
      data = [data, /BB10/.test(ua)];
      os = (data[1] ? (product = null, manufacturer = 'BlackBerry') : 'Device Software') + ' ' + data[0];
      version = null;
    }
    // Detect Opera identifying/masking itself as another browser.
    // http://www.opera.com/support/kb/view/843/
    else if (this != forOwn && product != 'Wii' && (
          (useFeatures && opera) ||
          (/Opera/.test(name) && /\b(?:MSIE|Firefox)\b/i.test(ua)) ||
          (name == 'Firefox' && /\bOS X (?:\d+\.){2,}/.test(os)) ||
          (name == 'IE' && (
            (os && !/^Win/.test(os) && version > 5.5) ||
            /\bWindows XP\b/.test(os) && version > 8 ||
            version == 8 && !/\bTrident\b/.test(ua)
          ))
        ) && !reOpera.test((data = parse.call(forOwn, ua.replace(reOpera, '') + ';'))) && data.name) {
      // When "identifying", the UA contains both Opera and the other browser's name.
      data = 'ing as ' + data.name + ((data = data.version) ? ' ' + data : '');
      if (reOpera.test(name)) {
        if (/\bIE\b/.test(data) && os == 'Mac OS') {
          os = null;
        }
        data = 'identify' + data;
      }
      // When "masking", the UA contains only the other browser's name.
      else {
        data = 'mask' + data;
        if (operaClass) {
          name = format(operaClass.replace(/([a-z])([A-Z])/g, '$1 $2'));
        } else {
          name = 'Opera';
        }
        if (/\bIE\b/.test(data)) {
          os = null;
        }
        if (!useFeatures) {
          version = null;
        }
      }
      layout = ['Presto'];
      description.push(data);
    }
    // Detect WebKit Nightly and approximate Chrome/Safari versions.
    if ((data = (/\bAppleWebKit\/([\d.]+\+?)/i.exec(ua) || 0)[1])) {
      // Correct build number for numeric comparison.
      // (e.g. "532.5" becomes "532.05")
      data = [parseFloat(data.replace(/\.(\d)$/, '.0$1')), data];
      // Nightly builds are postfixed with a "+".
      if (name == 'Safari' && data[1].slice(-1) == '+') {
        name = 'WebKit Nightly';
        prerelease = 'alpha';
        version = data[1].slice(0, -1);
      }
      // Clear incorrect browser versions.
      else if (version == data[1] ||
          version == (data[2] = (/\bSafari\/([\d.]+\+?)/i.exec(ua) || 0)[1])) {
        version = null;
      }
      // Use the full Chrome version when available.
      data[1] = (/\bChrome\/([\d.]+)/i.exec(ua) || 0)[1];
      // Detect Blink layout engine.
      if (data[0] == 537.36 && data[2] == 537.36 && parseFloat(data[1]) >= 28 && layout == 'WebKit') {
        layout = ['Blink'];
      }
      // Detect JavaScriptCore.
      // http://stackoverflow.com/questions/6768474/how-can-i-detect-which-javascript-engine-v8-or-jsc-is-used-at-runtime-in-androi
      if (!useFeatures || (!likeChrome && !data[1])) {
        layout && (layout[1] = 'like Safari');
        data = (data = data[0], data < 400 ? 1 : data < 500 ? 2 : data < 526 ? 3 : data < 533 ? 4 : data < 534 ? '4+' : data < 535 ? 5 : data < 537 ? 6 : data < 538 ? 7 : data < 601 ? 8 : '8');
      } else {
        layout && (layout[1] = 'like Chrome');
        data = data[1] || (data = data[0], data < 530 ? 1 : data < 532 ? 2 : data < 532.05 ? 3 : data < 533 ? 4 : data < 534.03 ? 5 : data < 534.07 ? 6 : data < 534.10 ? 7 : data < 534.13 ? 8 : data < 534.16 ? 9 : data < 534.24 ? 10 : data < 534.30 ? 11 : data < 535.01 ? 12 : data < 535.02 ? '13+' : data < 535.07 ? 15 : data < 535.11 ? 16 : data < 535.19 ? 17 : data < 536.05 ? 18 : data < 536.10 ? 19 : data < 537.01 ? 20 : data < 537.11 ? '21+' : data < 537.13 ? 23 : data < 537.18 ? 24 : data < 537.24 ? 25 : data < 537.36 ? 26 : layout != 'Blink' ? '27' : '28');
      }
      // Add the postfix of ".x" or "+" for approximate versions.
      layout && (layout[1] += ' ' + (data += typeof data == 'number' ? '.x' : /[.+]/.test(data) ? '' : '+'));
      // Obscure version for some Safari 1-2 releases.
      if (name == 'Safari' && (!version || parseInt(version) > 45)) {
        version = data;
      }
    }
    // Detect Opera desktop modes.
    if (name == 'Opera' &&  (data = /\bzbov|zvav$/.exec(os))) {
      name += ' ';
      description.unshift('desktop mode');
      if (data == 'zvav') {
        name += 'Mini';
        version = null;
      } else {
        name += 'Mobile';
      }
      os = os.replace(RegExp(' *' + data + '$'), '');
    }
    // Detect Chrome desktop mode.
    else if (name == 'Safari' && /\bChrome\b/.exec(layout && layout[1])) {
      description.unshift('desktop mode');
      name = 'Chrome Mobile';
      version = null;

      if (/\bOS X\b/.test(os)) {
        manufacturer = 'Apple';
        os = 'iOS 4.3+';
      } else {
        os = null;
      }
    }
    // Strip incorrect OS versions.
    if (version && version.indexOf((data = /[\d.]+$/.exec(os))) == 0 &&
        ua.indexOf('/' + data + '-') > -1) {
      os = trim(os.replace(data, ''));
    }
    // Add layout engine.
    if (layout && !/\b(?:Avant|Nook)\b/.test(name) && (
        /Browser|Lunascape|Maxthon/.test(name) ||
        name != 'Safari' && /^iOS/.test(os) && /\bSafari\b/.test(layout[1]) ||
        /^(?:Adobe|Arora|Breach|Midori|Opera|Phantom|Rekonq|Rock|Samsung Internet|Sleipnir|Web)/.test(name) && layout[1])) {
      // Don't add layout details to description if they are falsey.
      (data = layout[layout.length - 1]) && description.push(data);
    }
    // Combine contextual information.
    if (description.length) {
      description = ['(' + description.join('; ') + ')'];
    }
    // Append manufacturer to description.
    if (manufacturer && product && product.indexOf(manufacturer) < 0) {
      description.push('on ' + manufacturer);
    }
    // Append product to description.
    if (product) {
      description.push((/^on /.test(description[description.length - 1]) ? '' : 'on ') + product);
    }
    // Parse the OS into an object.
    if (os) {
      data = / ([\d.+]+)$/.exec(os);
      isSpecialCasedOS = data && os.charAt(os.length - data[0].length - 1) == '/';
      os = {
        'architecture': 32,
        'family': (data && !isSpecialCasedOS) ? os.replace(data[0], '') : os,
        'version': data ? data[1] : null,
        'toString': function() {
          var version = this.version;
          return this.family + ((version && !isSpecialCasedOS) ? ' ' + version : '') + (this.architecture == 64 ? ' 64-bit' : '');
        }
      };
    }
    // Add browser/OS architecture.
    if ((data = /\b(?:AMD|IA|Win|WOW|x86_|x)64\b/i.exec(arch)) && !/\bi686\b/i.test(arch)) {
      if (os) {
        os.architecture = 64;
        os.family = os.family.replace(RegExp(' *' + data), '');
      }
      if (
          name && (/\bWOW64\b/i.test(ua) ||
          (useFeatures && /\w(?:86|32)$/.test(nav.cpuClass || nav.platform) && !/\bWin64; x64\b/i.test(ua)))
      ) {
        description.unshift('32-bit');
      }
    }
    // Chrome 39 and above on OS X is always 64-bit.
    else if (
        os && /^OS X/.test(os.family) &&
        name == 'Chrome' && parseFloat(version) >= 39
    ) {
      os.architecture = 64;
    }

    ua || (ua = null);

    /*------------------------------------------------------------------------*/

    /**
     * The platform object.
     *
     * @name platform
     * @type Object
     */
    var platform = {};

    /**
     * The platform description.
     *
     * @memberOf platform
     * @type string|null
     */
    platform.description = ua;

    /**
     * The name of the browser's layout engine.
     *
     * The list of common layout engines include:
     * "Blink", "EdgeHTML", "Gecko", "Trident" and "WebKit"
     *
     * @memberOf platform
     * @type string|null
     */
    platform.layout = layout && layout[0];

    /**
     * The name of the product's manufacturer.
     *
     * The list of manufacturers include:
     * "Apple", "Archos", "Amazon", "Asus", "Barnes & Noble", "BlackBerry",
     * "Google", "HP", "HTC", "LG", "Microsoft", "Motorola", "Nintendo",
     * "Nokia", "Samsung" and "Sony"
     *
     * @memberOf platform
     * @type string|null
     */
    platform.manufacturer = manufacturer;

    /**
     * The name of the browser/environment.
     *
     * The list of common browser names include:
     * "Chrome", "Electron", "Firefox", "Firefox for iOS", "IE",
     * "Microsoft Edge", "PhantomJS", "Safari", "SeaMonkey", "Silk",
     * "Opera Mini" and "Opera"
     *
     * Mobile versions of some browsers have "Mobile" appended to their name:
     * eg. "Chrome Mobile", "Firefox Mobile", "IE Mobile" and "Opera Mobile"
     *
     * @memberOf platform
     * @type string|null
     */
    platform.name = name;

    /**
     * The alpha/beta release indicator.
     *
     * @memberOf platform
     * @type string|null
     */
    platform.prerelease = prerelease;

    /**
     * The name of the product hosting the browser.
     *
     * The list of common products include:
     *
     * "BlackBerry", "Galaxy S4", "Lumia", "iPad", "iPod", "iPhone", "Kindle",
     * "Kindle Fire", "Nexus", "Nook", "PlayBook", "TouchPad" and "Transformer"
     *
     * @memberOf platform
     * @type string|null
     */
    platform.product = product;

    /**
     * The browser's user agent string.
     *
     * @memberOf platform
     * @type string|null
     */
    platform.ua = ua;

    /**
     * The browser/environment version.
     *
     * @memberOf platform
     * @type string|null
     */
    platform.version = name && version;

    /**
     * The name of the operating system.
     *
     * @memberOf platform
     * @type Object
     */
    platform.os = os || {

      /**
       * The CPU architecture the OS is built for.
       *
       * @memberOf platform.os
       * @type number|null
       */
      'architecture': null,

      /**
       * The family of the OS.
       *
       * Common values include:
       * "Windows", "Windows Server 2008 R2 / 7", "Windows Server 2008 / Vista",
       * "Windows XP", "OS X", "Ubuntu", "Debian", "Fedora", "Red Hat", "SuSE",
       * "Android", "iOS" and "Windows Phone"
       *
       * @memberOf platform.os
       * @type string|null
       */
      'family': null,

      /**
       * The version of the OS.
       *
       * @memberOf platform.os
       * @type string|null
       */
      'version': null,

      /**
       * Returns the OS string.
       *
       * @memberOf platform.os
       * @returns {string} The OS string.
       */
      'toString': function() { return 'null'; }
    };

    platform.parse = parse;
    platform.toString = toStringPlatform;

    if (platform.version) {
      description.unshift(version);
    }
    if (platform.name) {
      description.unshift(name);
    }
    if (os && name && !(os == String(os).split(' ')[0] && (os == name.split(' ')[0] || product))) {
      description.push(product ? '(' + os + ')' : 'on ' + os);
    }
    if (description.length) {
      platform.description = description.join(' ');
    }
    return platform;
  }

  /*--------------------------------------------------------------------------*/

  // Export platform.
  var platform = parse();

  // Some AMD build optimizers, like r.js, check for condition patterns like the following:
  if (typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
    // Expose platform on the global object to prevent errors when platform is
    // loaded by a script tag in the presence of an AMD loader.
    // See http://requirejs.org/docs/errors.html#mismatch for more details.
    root.platform = platform;

    // Define as an anonymous module so platform can be aliased through path mapping.
    define(function() {
      return platform;
    });
  }
  // Check for `exports` after `define` in case a build optimizer adds an `exports` object.
  else if (freeExports && freeModule) {
    // Export for CommonJS support.
    forOwn(platform, function(value, key) {
      freeExports[key] = value;
    });
  }
  else {
    // Export to the global object.
    root.platform = platform;
  }
}.call(this));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],9:[function(require,module,exports){
var v1 = require('./v1');
var v4 = require('./v4');

var uuid = v4;
uuid.v1 = v1;
uuid.v4 = v4;

module.exports = uuid;

},{"./v1":12,"./v4":13}],10:[function(require,module,exports){
/**
 * Convert array of 16 byte values to UUID string format of the form:
 * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
 */
var byteToHex = [];
for (var i = 0; i < 256; ++i) {
  byteToHex[i] = (i + 0x100).toString(16).substr(1);
}

function bytesToUuid(buf, offset) {
  var i = offset || 0;
  var bth = byteToHex;
  return bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]];
}

module.exports = bytesToUuid;

},{}],11:[function(require,module,exports){
// Unique ID creation requires a high quality random # generator.  In the
// browser this is a little complicated due to unknown quality of Math.random()
// and inconsistent support for the `crypto` API.  We do the best we can via
// feature-detection

// getRandomValues needs to be invoked in a context where "this" is a Crypto implementation.
var getRandomValues = (typeof(crypto) != 'undefined' && crypto.getRandomValues.bind(crypto)) ||
                      (typeof(msCrypto) != 'undefined' && msCrypto.getRandomValues.bind(msCrypto));
if (getRandomValues) {
  // WHATWG crypto RNG - http://wiki.whatwg.org/wiki/Crypto
  var rnds8 = new Uint8Array(16); // eslint-disable-line no-undef

  module.exports = function whatwgRNG() {
    getRandomValues(rnds8);
    return rnds8;
  };
} else {
  // Math.random()-based (RNG)
  //
  // If all else fails, use Math.random().  It's fast, but is of unspecified
  // quality.
  var rnds = new Array(16);

  module.exports = function mathRNG() {
    for (var i = 0, r; i < 16; i++) {
      if ((i & 0x03) === 0) r = Math.random() * 0x100000000;
      rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
    }

    return rnds;
  };
}

},{}],12:[function(require,module,exports){
var rng = require('./lib/rng');
var bytesToUuid = require('./lib/bytesToUuid');

// **`v1()` - Generate time-based UUID**
//
// Inspired by https://github.com/LiosK/UUID.js
// and http://docs.python.org/library/uuid.html

var _nodeId;
var _clockseq;

// Previous uuid creation time
var _lastMSecs = 0;
var _lastNSecs = 0;

// See https://github.com/broofa/node-uuid for API details
function v1(options, buf, offset) {
  var i = buf && offset || 0;
  var b = buf || [];

  options = options || {};
  var node = options.node || _nodeId;
  var clockseq = options.clockseq !== undefined ? options.clockseq : _clockseq;

  // node and clockseq need to be initialized to random values if they're not
  // specified.  We do this lazily to minimize issues related to insufficient
  // system entropy.  See #189
  if (node == null || clockseq == null) {
    var seedBytes = rng();
    if (node == null) {
      // Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
      node = _nodeId = [
        seedBytes[0] | 0x01,
        seedBytes[1], seedBytes[2], seedBytes[3], seedBytes[4], seedBytes[5]
      ];
    }
    if (clockseq == null) {
      // Per 4.2.2, randomize (14 bit) clockseq
      clockseq = _clockseq = (seedBytes[6] << 8 | seedBytes[7]) & 0x3fff;
    }
  }

  // UUID timestamps are 100 nano-second units since the Gregorian epoch,
  // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
  // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
  // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.
  var msecs = options.msecs !== undefined ? options.msecs : new Date().getTime();

  // Per 4.2.1.2, use count of uuid's generated during the current clock
  // cycle to simulate higher resolution clock
  var nsecs = options.nsecs !== undefined ? options.nsecs : _lastNSecs + 1;

  // Time since last uuid creation (in msecs)
  var dt = (msecs - _lastMSecs) + (nsecs - _lastNSecs)/10000;

  // Per 4.2.1.2, Bump clockseq on clock regression
  if (dt < 0 && options.clockseq === undefined) {
    clockseq = clockseq + 1 & 0x3fff;
  }

  // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
  // time interval
  if ((dt < 0 || msecs > _lastMSecs) && options.nsecs === undefined) {
    nsecs = 0;
  }

  // Per 4.2.1.2 Throw error if too many uuids are requested
  if (nsecs >= 10000) {
    throw new Error('uuid.v1(): Can\'t create more than 10M uuids/sec');
  }

  _lastMSecs = msecs;
  _lastNSecs = nsecs;
  _clockseq = clockseq;

  // Per 4.1.4 - Convert from unix epoch to Gregorian epoch
  msecs += 12219292800000;

  // `time_low`
  var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
  b[i++] = tl >>> 24 & 0xff;
  b[i++] = tl >>> 16 & 0xff;
  b[i++] = tl >>> 8 & 0xff;
  b[i++] = tl & 0xff;

  // `time_mid`
  var tmh = (msecs / 0x100000000 * 10000) & 0xfffffff;
  b[i++] = tmh >>> 8 & 0xff;
  b[i++] = tmh & 0xff;

  // `time_high_and_version`
  b[i++] = tmh >>> 24 & 0xf | 0x10; // include version
  b[i++] = tmh >>> 16 & 0xff;

  // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)
  b[i++] = clockseq >>> 8 | 0x80;

  // `clock_seq_low`
  b[i++] = clockseq & 0xff;

  // `node`
  for (var n = 0; n < 6; ++n) {
    b[i + n] = node[n];
  }

  return buf ? buf : bytesToUuid(b);
}

module.exports = v1;

},{"./lib/bytesToUuid":10,"./lib/rng":11}],13:[function(require,module,exports){
var rng = require('./lib/rng');
var bytesToUuid = require('./lib/bytesToUuid');

function v4(options, buf, offset) {
  var i = buf && offset || 0;

  if (typeof(options) == 'string') {
    buf = options === 'binary' ? new Array(16) : null;
    options = null;
  }
  options = options || {};

  var rnds = options.random || (options.rng || rng)();

  // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
  rnds[6] = (rnds[6] & 0x0f) | 0x40;
  rnds[8] = (rnds[8] & 0x3f) | 0x80;

  // Copy bytes to buffer, if provided
  if (buf) {
    for (var ii = 0; ii < 16; ++ii) {
      buf[i + ii] = rnds[ii];
    }
  }

  return buf || bytesToUuid(rnds);
}

module.exports = v4;

},{"./lib/bytesToUuid":10,"./lib/rng":11}],14:[function(require,module,exports){
/*
WildEmitter.js is a slim little event emitter by @henrikjoreteg largely based
on @visionmedia's Emitter from UI Kit.

Why? I wanted it standalone.

I also wanted support for wildcard emitters like this:

emitter.on('*', function (eventName, other, event, payloads) {

});

emitter.on('somenamespace*', function (eventName, payloads) {

});

Please note that callbacks triggered by wildcard registered events also get
the event name as the first argument.
*/

module.exports = WildEmitter;

function WildEmitter() { }

WildEmitter.mixin = function (constructor) {
    var prototype = constructor.prototype || constructor;

    prototype.isWildEmitter= true;

    // Listen on the given `event` with `fn`. Store a group name if present.
    prototype.on = function (event, groupName, fn) {
        this.callbacks = this.callbacks || {};
        var hasGroup = (arguments.length === 3),
            group = hasGroup ? arguments[1] : undefined,
            func = hasGroup ? arguments[2] : arguments[1];
        func._groupName = group;
        (this.callbacks[event] = this.callbacks[event] || []).push(func);
        return this;
    };

    // Adds an `event` listener that will be invoked a single
    // time then automatically removed.
    prototype.once = function (event, groupName, fn) {
        var self = this,
            hasGroup = (arguments.length === 3),
            group = hasGroup ? arguments[1] : undefined,
            func = hasGroup ? arguments[2] : arguments[1];
        function on() {
            self.off(event, on);
            func.apply(this, arguments);
        }
        this.on(event, group, on);
        return this;
    };

    // Unbinds an entire group
    prototype.releaseGroup = function (groupName) {
        this.callbacks = this.callbacks || {};
        var item, i, len, handlers;
        for (item in this.callbacks) {
            handlers = this.callbacks[item];
            for (i = 0, len = handlers.length; i < len; i++) {
                if (handlers[i]._groupName === groupName) {
                    //console.log('removing');
                    // remove it and shorten the array we're looping through
                    handlers.splice(i, 1);
                    i--;
                    len--;
                }
            }
        }
        return this;
    };

    // Remove the given callback for `event` or all
    // registered callbacks.
    prototype.off = function (event, fn) {
        this.callbacks = this.callbacks || {};
        var callbacks = this.callbacks[event],
            i;

        if (!callbacks) return this;

        // remove all handlers
        if (arguments.length === 1) {
            delete this.callbacks[event];
            return this;
        }

        // remove specific handler
        i = callbacks.indexOf(fn);
        callbacks.splice(i, 1);
        if (callbacks.length === 0) {
            delete this.callbacks[event];
        }
        return this;
    };

    /// Emit `event` with the given args.
    // also calls any `*` handlers
    prototype.emit = function (event) {
        this.callbacks = this.callbacks || {};
        var args = [].slice.call(arguments, 1),
            callbacks = this.callbacks[event],
            specialCallbacks = this.getWildcardCallbacks(event),
            i,
            len,
            item,
            listeners;

        if (callbacks) {
            listeners = callbacks.slice();
            for (i = 0, len = listeners.length; i < len; ++i) {
                if (!listeners[i]) {
                    break;
                }
                listeners[i].apply(this, args);
            }
        }

        if (specialCallbacks) {
            len = specialCallbacks.length;
            listeners = specialCallbacks.slice();
            for (i = 0, len = listeners.length; i < len; ++i) {
                if (!listeners[i]) {
                    break;
                }
                listeners[i].apply(this, [event].concat(args));
            }
        }

        return this;
    };

    // Helper for for finding special wildcard event handlers that match the event
    prototype.getWildcardCallbacks = function (eventName) {
        this.callbacks = this.callbacks || {};
        var item,
            split,
            result = [];

        for (item in this.callbacks) {
            split = item.split('*');
            if (item === '*' || (split.length === 2 && eventName.slice(0, split[0].length) === split[0])) {
                result = result.concat(this.callbacks[item]);
            }
        }
        return result;
    };

};

WildEmitter.mixin(WildEmitter);

},{}],15:[function(require,module,exports){
/*!
 * EventEmitter v5.2.4 - git.io/ee
 * Unlicense - http://unlicense.org/
 * Oliver Caldwell - http://oli.me.uk/
 * @preserve
 */

;(function (exports) {
    'use strict';

    /**
     * Class for managing events.
     * Can be extended to provide event functionality in other classes.
     *
     * @class EventEmitter Manages event registering and emitting.
     */
    function EventEmitter() {}

    // Shortcuts to improve speed and size
    var proto = EventEmitter.prototype;
    var originalGlobalValue = exports.EventEmitter;

    /**
     * Finds the index of the listener for the event in its storage array.
     *
     * @param {Function[]} listeners Array of listeners to search through.
     * @param {Function} listener Method to look for.
     * @return {Number} Index of the specified listener, -1 if not found
     * @api private
     */
    function indexOfListener(listeners, listener) {
        var i = listeners.length;
        while (i--) {
            if (listeners[i].listener === listener) {
                return i;
            }
        }

        return -1;
    }

    /**
     * Alias a method while keeping the context correct, to allow for overwriting of target method.
     *
     * @param {String} name The name of the target method.
     * @return {Function} The aliased method
     * @api private
     */
    function alias(name) {
        return function aliasClosure() {
            return this[name].apply(this, arguments);
        };
    }

    /**
     * Returns the listener array for the specified event.
     * Will initialise the event object and listener arrays if required.
     * Will return an object if you use a regex search. The object contains keys for each matched event. So /ba[rz]/ might return an object containing bar and baz. But only if you have either defined them with defineEvent or added some listeners to them.
     * Each property in the object response is an array of listener functions.
     *
     * @param {String|RegExp} evt Name of the event to return the listeners from.
     * @return {Function[]|Object} All listener functions for the event.
     */
    proto.getListeners = function getListeners(evt) {
        var events = this._getEvents();
        var response;
        var key;

        // Return a concatenated array of all matching events if
        // the selector is a regular expression.
        if (evt instanceof RegExp) {
            response = {};
            for (key in events) {
                if (events.hasOwnProperty(key) && evt.test(key)) {
                    response[key] = events[key];
                }
            }
        }
        else {
            response = events[evt] || (events[evt] = []);
        }

        return response;
    };

    /**
     * Takes a list of listener objects and flattens it into a list of listener functions.
     *
     * @param {Object[]} listeners Raw listener objects.
     * @return {Function[]} Just the listener functions.
     */
    proto.flattenListeners = function flattenListeners(listeners) {
        var flatListeners = [];
        var i;

        for (i = 0; i < listeners.length; i += 1) {
            flatListeners.push(listeners[i].listener);
        }

        return flatListeners;
    };

    /**
     * Fetches the requested listeners via getListeners but will always return the results inside an object. This is mainly for internal use but others may find it useful.
     *
     * @param {String|RegExp} evt Name of the event to return the listeners from.
     * @return {Object} All listener functions for an event in an object.
     */
    proto.getListenersAsObject = function getListenersAsObject(evt) {
        var listeners = this.getListeners(evt);
        var response;

        if (listeners instanceof Array) {
            response = {};
            response[evt] = listeners;
        }

        return response || listeners;
    };

    function isValidListener (listener) {
        if (typeof listener === 'function' || listener instanceof RegExp) {
            return true
        } else if (listener && typeof listener === 'object') {
            return isValidListener(listener.listener)
        } else {
            return false
        }
    }

    /**
     * Adds a listener function to the specified event.
     * The listener will not be added if it is a duplicate.
     * If the listener returns true then it will be removed after it is called.
     * If you pass a regular expression as the event name then the listener will be added to all events that match it.
     *
     * @param {String|RegExp} evt Name of the event to attach the listener to.
     * @param {Function} listener Method to be called when the event is emitted. If the function returns true then it will be removed after calling.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.addListener = function addListener(evt, listener) {
        if (!isValidListener(listener)) {
            throw new TypeError('listener must be a function');
        }

        var listeners = this.getListenersAsObject(evt);
        var listenerIsWrapped = typeof listener === 'object';
        var key;

        for (key in listeners) {
            if (listeners.hasOwnProperty(key) && indexOfListener(listeners[key], listener) === -1) {
                listeners[key].push(listenerIsWrapped ? listener : {
                    listener: listener,
                    once: false
                });
            }
        }

        return this;
    };

    /**
     * Alias of addListener
     */
    proto.on = alias('addListener');

    /**
     * Semi-alias of addListener. It will add a listener that will be
     * automatically removed after its first execution.
     *
     * @param {String|RegExp} evt Name of the event to attach the listener to.
     * @param {Function} listener Method to be called when the event is emitted. If the function returns true then it will be removed after calling.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.addOnceListener = function addOnceListener(evt, listener) {
        return this.addListener(evt, {
            listener: listener,
            once: true
        });
    };

    /**
     * Alias of addOnceListener.
     */
    proto.once = alias('addOnceListener');

    /**
     * Defines an event name. This is required if you want to use a regex to add a listener to multiple events at once. If you don't do this then how do you expect it to know what event to add to? Should it just add to every possible match for a regex? No. That is scary and bad.
     * You need to tell it what event names should be matched by a regex.
     *
     * @param {String} evt Name of the event to create.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.defineEvent = function defineEvent(evt) {
        this.getListeners(evt);
        return this;
    };

    /**
     * Uses defineEvent to define multiple events.
     *
     * @param {String[]} evts An array of event names to define.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.defineEvents = function defineEvents(evts) {
        for (var i = 0; i < evts.length; i += 1) {
            this.defineEvent(evts[i]);
        }
        return this;
    };

    /**
     * Removes a listener function from the specified event.
     * When passed a regular expression as the event name, it will remove the listener from all events that match it.
     *
     * @param {String|RegExp} evt Name of the event to remove the listener from.
     * @param {Function} listener Method to remove from the event.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.removeListener = function removeListener(evt, listener) {
        var listeners = this.getListenersAsObject(evt);
        var index;
        var key;

        for (key in listeners) {
            if (listeners.hasOwnProperty(key)) {
                index = indexOfListener(listeners[key], listener);

                if (index !== -1) {
                    listeners[key].splice(index, 1);
                }
            }
        }

        return this;
    };

    /**
     * Alias of removeListener
     */
    proto.off = alias('removeListener');

    /**
     * Adds listeners in bulk using the manipulateListeners method.
     * If you pass an object as the first argument you can add to multiple events at once. The object should contain key value pairs of events and listeners or listener arrays. You can also pass it an event name and an array of listeners to be added.
     * You can also pass it a regular expression to add the array of listeners to all events that match it.
     * Yeah, this function does quite a bit. That's probably a bad thing.
     *
     * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to add to multiple events at once.
     * @param {Function[]} [listeners] An optional array of listener functions to add.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.addListeners = function addListeners(evt, listeners) {
        // Pass through to manipulateListeners
        return this.manipulateListeners(false, evt, listeners);
    };

    /**
     * Removes listeners in bulk using the manipulateListeners method.
     * If you pass an object as the first argument you can remove from multiple events at once. The object should contain key value pairs of events and listeners or listener arrays.
     * You can also pass it an event name and an array of listeners to be removed.
     * You can also pass it a regular expression to remove the listeners from all events that match it.
     *
     * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to remove from multiple events at once.
     * @param {Function[]} [listeners] An optional array of listener functions to remove.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.removeListeners = function removeListeners(evt, listeners) {
        // Pass through to manipulateListeners
        return this.manipulateListeners(true, evt, listeners);
    };

    /**
     * Edits listeners in bulk. The addListeners and removeListeners methods both use this to do their job. You should really use those instead, this is a little lower level.
     * The first argument will determine if the listeners are removed (true) or added (false).
     * If you pass an object as the second argument you can add/remove from multiple events at once. The object should contain key value pairs of events and listeners or listener arrays.
     * You can also pass it an event name and an array of listeners to be added/removed.
     * You can also pass it a regular expression to manipulate the listeners of all events that match it.
     *
     * @param {Boolean} remove True if you want to remove listeners, false if you want to add.
     * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to add/remove from multiple events at once.
     * @param {Function[]} [listeners] An optional array of listener functions to add/remove.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.manipulateListeners = function manipulateListeners(remove, evt, listeners) {
        var i;
        var value;
        var single = remove ? this.removeListener : this.addListener;
        var multiple = remove ? this.removeListeners : this.addListeners;

        // If evt is an object then pass each of its properties to this method
        if (typeof evt === 'object' && !(evt instanceof RegExp)) {
            for (i in evt) {
                if (evt.hasOwnProperty(i) && (value = evt[i])) {
                    // Pass the single listener straight through to the singular method
                    if (typeof value === 'function') {
                        single.call(this, i, value);
                    }
                    else {
                        // Otherwise pass back to the multiple function
                        multiple.call(this, i, value);
                    }
                }
            }
        }
        else {
            // So evt must be a string
            // And listeners must be an array of listeners
            // Loop over it and pass each one to the multiple method
            i = listeners.length;
            while (i--) {
                single.call(this, evt, listeners[i]);
            }
        }

        return this;
    };

    /**
     * Removes all listeners from a specified event.
     * If you do not specify an event then all listeners will be removed.
     * That means every event will be emptied.
     * You can also pass a regex to remove all events that match it.
     *
     * @param {String|RegExp} [evt] Optional name of the event to remove all listeners for. Will remove from every event if not passed.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.removeEvent = function removeEvent(evt) {
        var type = typeof evt;
        var events = this._getEvents();
        var key;

        // Remove different things depending on the state of evt
        if (type === 'string') {
            // Remove all listeners for the specified event
            delete events[evt];
        }
        else if (evt instanceof RegExp) {
            // Remove all events matching the regex.
            for (key in events) {
                if (events.hasOwnProperty(key) && evt.test(key)) {
                    delete events[key];
                }
            }
        }
        else {
            // Remove all listeners in all events
            delete this._events;
        }

        return this;
    };

    /**
     * Alias of removeEvent.
     *
     * Added to mirror the node API.
     */
    proto.removeAllListeners = alias('removeEvent');

    /**
     * Emits an event of your choice.
     * When emitted, every listener attached to that event will be executed.
     * If you pass the optional argument array then those arguments will be passed to every listener upon execution.
     * Because it uses `apply`, your array of arguments will be passed as if you wrote them out separately.
     * So they will not arrive within the array on the other side, they will be separate.
     * You can also pass a regular expression to emit to all events that match it.
     *
     * @param {String|RegExp} evt Name of the event to emit and execute listeners for.
     * @param {Array} [args] Optional array of arguments to be passed to each listener.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.emitEvent = function emitEvent(evt, args) {
        var listenersMap = this.getListenersAsObject(evt);
        var listeners;
        var listener;
        var i;
        var key;
        var response;

        for (key in listenersMap) {
            if (listenersMap.hasOwnProperty(key)) {
                listeners = listenersMap[key].slice(0);

                for (i = 0; i < listeners.length; i++) {
                    // If the listener returns true then it shall be removed from the event
                    // The function is executed either with a basic call or an apply if there is an args array
                    listener = listeners[i];

                    if (listener.once === true) {
                        this.removeListener(evt, listener.listener);
                    }

                    response = listener.listener.apply(this, args || []);

                    if (response === this._getOnceReturnValue()) {
                        this.removeListener(evt, listener.listener);
                    }
                }
            }
        }

        return this;
    };

    /**
     * Alias of emitEvent
     */
    proto.trigger = alias('emitEvent');

    /**
     * Subtly different from emitEvent in that it will pass its arguments on to the listeners, as opposed to taking a single array of arguments to pass on.
     * As with emitEvent, you can pass a regex in place of the event name to emit to all events that match it.
     *
     * @param {String|RegExp} evt Name of the event to emit and execute listeners for.
     * @param {...*} Optional additional arguments to be passed to each listener.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.emit = function emit(evt) {
        var args = Array.prototype.slice.call(arguments, 1);
        return this.emitEvent(evt, args);
    };

    /**
     * Sets the current value to check against when executing listeners. If a
     * listeners return value matches the one set here then it will be removed
     * after execution. This value defaults to true.
     *
     * @param {*} value The new value to check for when executing listeners.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.setOnceReturnValue = function setOnceReturnValue(value) {
        this._onceReturnValue = value;
        return this;
    };

    /**
     * Fetches the current value to check against when executing listeners. If
     * the listeners return value matches this one then it should be removed
     * automatically. It will return true by default.
     *
     * @return {*|Boolean} The current value to check for or the default, true.
     * @api private
     */
    proto._getOnceReturnValue = function _getOnceReturnValue() {
        if (this.hasOwnProperty('_onceReturnValue')) {
            return this._onceReturnValue;
        }
        else {
            return true;
        }
    };

    /**
     * Fetches the events object and creates one if required.
     *
     * @return {Object} The events storage object.
     * @api private
     */
    proto._getEvents = function _getEvents() {
        return this._events || (this._events = {});
    };

    /**
     * Reverts the global {@link EventEmitter} to its previous value and returns a reference to this version.
     *
     * @return {Function} Non conflicting EventEmitter class.
     */
    EventEmitter.noConflict = function noConflict() {
        exports.EventEmitter = originalGlobalValue;
        return EventEmitter;
    };

    // Expose the class either via AMD, CommonJS or the global object
    if (typeof define === 'function' && define.amd) {
        define(function () {
            return EventEmitter;
        });
    }
    else if (typeof module === 'object' && module.exports){
        module.exports = EventEmitter;
    }
    else {
        exports.EventEmitter = EventEmitter;
    }
}(this || {}));

},{}],16:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var OpenVidu_1 = require("./OpenVidu/OpenVidu");
if (window) {
    window['OpenVidu'] = OpenVidu_1.OpenVidu;
}

},{"./OpenVidu/OpenVidu":19}],17:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Stream_1 = require("./Stream");
var Connection = (function () {
    function Connection(session, opts) {
        this.session = session;
        this.disposed = false;
        var msg = "'Connection' created ";
        if (!!opts) {
            msg += "(remote) with 'connectionId' [" + opts.id + ']';
        }
        else {
            msg += '(local)';
        }
        console.info(msg);
        this.options = opts;
        if (!!opts) {
            this.connectionId = opts.id;
            if (opts.metadata) {
                this.data = opts.metadata;
            }
            if (opts.streams) {
                this.initRemoteStreams(opts.streams);
            }
        }
        this.creationTime = new Date().getTime();
    }
    Connection.prototype.sendIceCandidate = function (candidate) {
        console.debug((!!this.stream.outboundStreamOpts ? 'Local' : 'Remote'), 'candidate for', this.connectionId, JSON.stringify(candidate));
        this.session.openvidu.sendRequest('onIceCandidate', {
            endpointName: this.connectionId,
            candidate: candidate.candidate,
            sdpMid: candidate.sdpMid,
            sdpMLineIndex: candidate.sdpMLineIndex
        }, function (error, response) {
            if (error) {
                console.error('Error sending ICE candidate: '
                    + JSON.stringify(error));
            }
        });
    };
    Connection.prototype.initRemoteStreams = function (options) {
        var _this = this;
        options.forEach(function (opts) {
            var streamOptions = {
                id: opts.id,
                connection: _this,
                frameRate: opts.frameRate,
                recvAudio: opts.audioActive,
                recvVideo: opts.videoActive,
                typeOfVideo: opts.typeOfVideo
            };
            var stream = new Stream_1.Stream(_this.session, streamOptions);
            _this.addStream(stream);
        });
        console.info("Remote 'Connection' with 'connectionId' [" + this.connectionId + '] is now configured for receiving Streams with options: ', this.stream.inboundStreamOpts);
    };
    Connection.prototype.addStream = function (stream) {
        stream.connection = this;
        this.stream = stream;
    };
    Connection.prototype.removeStream = function (streamId) {
        delete this.stream;
    };
    Connection.prototype.dispose = function () {
        if (!!this.stream) {
            delete this.stream;
        }
        this.disposed = true;
    };
    return Connection;
}());
exports.Connection = Connection;

},{"./Stream":22}],18:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var LocalRecorderState_1 = require("../OpenViduInternal/Enums/LocalRecorderState");
var LocalRecorder = (function () {
    function LocalRecorder(stream) {
        this.stream = stream;
        this.chunks = [];
        this.count = 0;
        this.connectionId = (!!this.stream.connection) ? this.stream.connection.connectionId : 'default-connection';
        this.id = this.stream.streamId + '_' + this.connectionId + '_localrecord';
        this.state = LocalRecorderState_1.LocalRecorderState.READY;
    }
    LocalRecorder.prototype.record = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                if (typeof MediaRecorder === 'undefined') {
                    console.error('MediaRecorder not supported on your browser. See compatibility in https://caniuse.com/#search=MediaRecorder');
                    throw (Error('MediaRecorder not supported on your browser. See compatibility in https://caniuse.com/#search=MediaRecorder'));
                }
                if (_this.state !== LocalRecorderState_1.LocalRecorderState.READY) {
                    throw (Error('\'LocalRecord.record()\' needs \'LocalRecord.state\' to be \'READY\' (current value: \'' + _this.state + '\'). Call \'LocalRecorder.clean()\' or init a new LocalRecorder before'));
                }
                console.log("Starting local recording of stream '" + _this.stream.streamId + "' of connection '" + _this.connectionId + "'");
                if (typeof MediaRecorder.isTypeSupported === 'function') {
                    var options = void 0;
                    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
                        options = { mimeType: 'video/webm;codecs=vp9' };
                    }
                    else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
                        options = { mimeType: 'video/webm;codecs=h264' };
                    }
                    else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
                        options = { mimeType: 'video/webm;codecs=vp8' };
                    }
                    console.log('Using mimeType ' + options.mimeType);
                    _this.mediaRecorder = new MediaRecorder(_this.stream.getMediaStream(), options);
                }
                else {
                    console.warn('isTypeSupported is not supported, using default codecs for browser');
                    _this.mediaRecorder = new MediaRecorder(_this.stream.getMediaStream());
                }
                _this.mediaRecorder.start(10);
            }
            catch (err) {
                reject(err);
            }
            _this.mediaRecorder.ondataavailable = function (e) {
                _this.chunks.push(e.data);
            };
            _this.mediaRecorder.onerror = function (e) {
                console.error('MediaRecorder error: ', e);
            };
            _this.mediaRecorder.onstart = function () {
                console.log('MediaRecorder started (state=' + _this.mediaRecorder.state + ')');
            };
            _this.mediaRecorder.onstop = function () {
                _this.onStopDefault();
            };
            _this.mediaRecorder.onpause = function () {
                console.log('MediaRecorder paused (state=' + _this.mediaRecorder.state + ')');
            };
            _this.mediaRecorder.onresume = function () {
                console.log('MediaRecorder resumed (state=' + _this.mediaRecorder.state + ')');
            };
            _this.mediaRecorder.onwarning = function (e) {
                console.log('MediaRecorder warning: ' + e);
            };
            _this.state = LocalRecorderState_1.LocalRecorderState.RECORDING;
            resolve();
        });
    };
    LocalRecorder.prototype.stop = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                if (_this.state === LocalRecorderState_1.LocalRecorderState.READY || _this.state === LocalRecorderState_1.LocalRecorderState.FINISHED) {
                    throw (Error('\'LocalRecord.stop()\' needs \'LocalRecord.state\' to be \'RECORDING\' or \'PAUSED\' (current value: \'' + _this.state + '\'). Call \'LocalRecorder.start()\' before'));
                }
                _this.mediaRecorder.onstop = function () {
                    _this.onStopDefault();
                    resolve();
                };
                _this.mediaRecorder.stop();
            }
            catch (e) {
                reject(e);
            }
        });
    };
    LocalRecorder.prototype.pause = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                if (_this.state !== LocalRecorderState_1.LocalRecorderState.RECORDING) {
                    reject(Error('\'LocalRecord.pause()\' needs \'LocalRecord.state\' to be \'RECORDING\' (current value: \'' + _this.state + '\'). Call \'LocalRecorder.start()\' or \'LocalRecorder.resume()\' before'));
                }
                _this.mediaRecorder.pause();
                _this.state = LocalRecorderState_1.LocalRecorderState.PAUSED;
            }
            catch (error) {
                reject(error);
            }
        });
    };
    LocalRecorder.prototype.resume = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                if (_this.state !== LocalRecorderState_1.LocalRecorderState.PAUSED) {
                    throw (Error('\'LocalRecord.resume()\' needs \'LocalRecord.state\' to be \'PAUSED\' (current value: \'' + _this.state + '\'). Call \'LocalRecorder.pause()\' before'));
                }
                _this.mediaRecorder.resume();
                _this.state = LocalRecorderState_1.LocalRecorderState.RECORDING;
            }
            catch (error) {
                reject(error);
            }
        });
    };
    LocalRecorder.prototype.preview = function (parentElement) {
        if (this.state !== LocalRecorderState_1.LocalRecorderState.FINISHED) {
            throw (Error('\'LocalRecord.preview()\' needs \'LocalRecord.state\' to be \'FINISHED\' (current value: \'' + this.state + '\'). Call \'LocalRecorder.stop()\' before'));
        }
        this.videoPreview = document.createElement('video');
        this.videoPreview.id = this.id;
        this.videoPreview.autoplay = true;
        if (typeof parentElement === 'string') {
            this.htmlParentElementId = parentElement;
            var parentElementDom = document.getElementById(parentElement);
            if (parentElementDom) {
                this.videoPreview = parentElementDom.appendChild(this.videoPreview);
            }
        }
        else {
            this.htmlParentElementId = parentElement.id;
            this.videoPreview = parentElement.appendChild(this.videoPreview);
        }
        this.videoPreview.src = this.videoPreviewSrc;
        return this.videoPreview;
    };
    LocalRecorder.prototype.clean = function () {
        var _this = this;
        var f = function () {
            delete _this.blob;
            _this.chunks = [];
            _this.count = 0;
            delete _this.mediaRecorder;
            _this.state = LocalRecorderState_1.LocalRecorderState.READY;
        };
        if (this.state === LocalRecorderState_1.LocalRecorderState.RECORDING || this.state === LocalRecorderState_1.LocalRecorderState.PAUSED) {
            this.stop().then(function () { return f(); }).catch(function () { return f(); });
        }
        else {
            f();
        }
    };
    LocalRecorder.prototype.download = function () {
        if (this.state !== LocalRecorderState_1.LocalRecorderState.FINISHED) {
            throw (Error('\'LocalRecord.download()\' needs \'LocalRecord.state\' to be \'FINISHED\' (current value: \'' + this.state + '\'). Call \'LocalRecorder.stop()\' before'));
        }
        else {
            var a = document.createElement('a');
            a.style.display = 'none';
            document.body.appendChild(a);
            var url = window.URL.createObjectURL(this.blob);
            a.href = url;
            a.download = this.id + '.webm';
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }
    };
    LocalRecorder.prototype.getBlob = function () {
        if (this.state !== LocalRecorderState_1.LocalRecorderState.FINISHED) {
            throw (Error('Call \'LocalRecord.stop()\' before getting Blob file'));
        }
        else {
            return this.blob;
        }
    };
    LocalRecorder.prototype.uploadAsBinary = function (endpoint, headers) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (_this.state !== LocalRecorderState_1.LocalRecorderState.FINISHED) {
                reject(Error('\'LocalRecord.uploadAsBinary()\' needs \'LocalRecord.state\' to be \'FINISHED\' (current value: \'' + _this.state + '\'). Call \'LocalRecorder.stop()\' before'));
            }
            else {
                var http_1 = new XMLHttpRequest();
                http_1.open('POST', endpoint, true);
                if (typeof headers === 'object') {
                    for (var _i = 0, _a = Object.keys(headers); _i < _a.length; _i++) {
                        var key = _a[_i];
                        http_1.setRequestHeader(key, headers[key]);
                    }
                }
                http_1.onreadystatechange = function () {
                    if (http_1.readyState === 4) {
                        if (http_1.status.toString().charAt(0) === '2') {
                            resolve(http_1.responseText);
                        }
                        else {
                            reject(http_1.status);
                        }
                    }
                };
                http_1.send(_this.blob);
            }
        });
    };
    LocalRecorder.prototype.uploadAsMultipartfile = function (endpoint, headers) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (_this.state !== LocalRecorderState_1.LocalRecorderState.FINISHED) {
                reject(Error('\'LocalRecord.uploadAsMultipartfile()\' needs \'LocalRecord.state\' to be \'FINISHED\' (current value: \'' + _this.state + '\'). Call \'LocalRecorder.stop()\' before'));
            }
            else {
                var http_2 = new XMLHttpRequest();
                http_2.open('POST', endpoint, true);
                if (typeof headers === 'object') {
                    for (var _i = 0, _a = Object.keys(headers); _i < _a.length; _i++) {
                        var key = _a[_i];
                        http_2.setRequestHeader(key, headers[key]);
                    }
                }
                var sendable = new FormData();
                sendable.append('file', _this.blob, _this.id + '.webm');
                http_2.onreadystatechange = function () {
                    if (http_2.readyState === 4) {
                        if (http_2.status.toString().charAt(0) === '2') {
                            resolve(http_2.responseText);
                        }
                        else {
                            reject(http_2.status);
                        }
                    }
                };
                http_2.send(sendable);
            }
        });
    };
    LocalRecorder.prototype.onStopDefault = function () {
        console.log('MediaRecorder stopped  (state=' + this.mediaRecorder.state + ')');
        this.blob = new Blob(this.chunks, { type: 'video/webm' });
        this.chunks = [];
        this.videoPreviewSrc = window.URL.createObjectURL(this.blob);
        this.state = LocalRecorderState_1.LocalRecorderState.FINISHED;
    };
    return LocalRecorder;
}());
exports.LocalRecorder = LocalRecorder;

},{"../OpenViduInternal/Enums/LocalRecorderState":25}],19:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var LocalRecorder_1 = require("./LocalRecorder");
var Publisher_1 = require("./Publisher");
var Session_1 = require("./Session");
var OpenViduError_1 = require("../OpenViduInternal/Enums/OpenViduError");
var VideoInsertMode_1 = require("../OpenViduInternal/Enums/VideoInsertMode");
var screenSharingAuto = require("../OpenViduInternal/ScreenSharing/Screen-Capturing-Auto");
var screenSharing = require("../OpenViduInternal/ScreenSharing/Screen-Capturing");
var RpcBuilder = require("../OpenViduInternal/KurentoUtils/kurento-jsonrpc");
var platform = require("platform");
var OpenVidu = (function () {
    function OpenVidu() {
        this.secret = '';
        this.recorder = false;
        this.advancedConfiguration = {};
        console.info("'OpenVidu' initialized");
    }
    OpenVidu.prototype.initSession = function () {
        this.session = new Session_1.Session(this);
        return this.session;
    };
    OpenVidu.prototype.initPublisher = function (targetElement, param2, param3) {
        var properties;
        if (!!param2 && (typeof param2 !== 'function')) {
            properties = param2;
            properties = {
                audioSource: (typeof properties.audioSource !== 'undefined') ? properties.audioSource : undefined,
                frameRate: this.isMediaStreamTrack(properties.videoSource) ? undefined : ((typeof properties.frameRate !== 'undefined') ? properties.frameRate : undefined),
                insertMode: (typeof properties.insertMode !== 'undefined') ? ((typeof properties.insertMode === 'string') ? VideoInsertMode_1.VideoInsertMode[properties.insertMode] : properties.insertMode) : VideoInsertMode_1.VideoInsertMode.APPEND,
                mirror: (typeof properties.mirror !== 'undefined') ? properties.mirror : true,
                publishAudio: (typeof properties.publishAudio !== 'undefined') ? properties.publishAudio : true,
                publishVideo: (typeof properties.publishVideo !== 'undefined') ? properties.publishVideo : true,
                resolution: this.isMediaStreamTrack(properties.videoSource) ? undefined : ((typeof properties.resolution !== 'undefined') ? properties.resolution : '640x480'),
                videoSource: (typeof properties.videoSource !== 'undefined') ? properties.videoSource : undefined
            };
        }
        else {
            properties = {
                insertMode: VideoInsertMode_1.VideoInsertMode.APPEND,
                mirror: true,
                publishAudio: true,
                publishVideo: true,
                resolution: '640x480'
            };
        }
        var publisher = new Publisher_1.Publisher(targetElement, properties, this);
        var completionHandler;
        if (!!param2 && (typeof param2 === 'function')) {
            completionHandler = param2;
        }
        else if (!!param3) {
            completionHandler = param3;
        }
        publisher.initialize()
            .then(function () {
            if (completionHandler !== undefined) {
                completionHandler(undefined);
            }
            publisher.emitEvent('accessAllowed', []);
        }).catch(function (error) {
            if (completionHandler !== undefined) {
                completionHandler(error);
            }
            publisher.emitEvent('accessDenied', []);
        });
        return publisher;
    };
    OpenVidu.prototype.initPublisherAsync = function (targetElement, properties) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var publisher;
            var callback = function (error) {
                if (!!error) {
                    reject(error);
                }
                else {
                    resolve(publisher);
                }
            };
            if (!!properties) {
                publisher = _this.initPublisher(targetElement, properties, callback);
            }
            else {
                publisher = _this.initPublisher(targetElement, callback);
            }
        });
    };
    OpenVidu.prototype.initLocalRecorder = function (stream) {
        return new LocalRecorder_1.LocalRecorder(stream);
    };
    OpenVidu.prototype.checkSystemRequirements = function () {
        var browser = platform.name;
        var version = platform.version;
        if ((browser !== 'Chrome') && (browser !== 'Chrome Mobile') &&
            (browser !== 'Firefox') && (browser !== 'Firefox Mobile') && (browser !== 'Firefox for iOS') &&
            (browser !== 'Opera') && (browser !== 'Opera Mobile') &&
            (browser !== 'Safari')) {
            return 0;
        }
        else {
            return 1;
        }
    };
    OpenVidu.prototype.getDevices = function () {
        return new Promise(function (resolve, reject) {
            navigator.mediaDevices.enumerateDevices().then(function (deviceInfos) {
                var devices = [];
                deviceInfos.forEach(function (deviceInfo) {
                    if (deviceInfo.kind === 'audioinput' || deviceInfo.kind === 'videoinput') {
                        devices.push({
                            kind: deviceInfo.kind,
                            deviceId: deviceInfo.deviceId,
                            label: deviceInfo.label
                        });
                    }
                });
                resolve(devices);
            }).catch(function (error) {
                console.error('Error getting devices', error);
                reject(error);
            });
        });
    };
    OpenVidu.prototype.getUserMedia = function (options) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.generateMediaConstraints(options)
                .then(function (constraints) {
                navigator.mediaDevices.getUserMedia(constraints)
                    .then(function (mediaStream) {
                    resolve(mediaStream);
                })
                    .catch(function (error) {
                    var errorName;
                    var errorMessage = error.toString();
                    if (!(options.videoSource === 'screen')) {
                        errorName = OpenViduError_1.OpenViduErrorName.DEVICE_ACCESS_DENIED;
                    }
                    else {
                        errorName = OpenViduError_1.OpenViduErrorName.SCREEN_CAPTURE_DENIED;
                    }
                    reject(new OpenViduError_1.OpenViduError(errorName, errorMessage));
                });
            })
                .catch(function (error) {
                reject(error);
            });
        });
    };
    OpenVidu.prototype.enableProdMode = function () {
        console.log = function () { };
        console.debug = function () { };
        console.info = function () { };
        console.warn = function () { };
    };
    OpenVidu.prototype.setAdvancedConfiguration = function (configuration) {
        this.advancedConfiguration = configuration;
    };
    OpenVidu.prototype.generateMediaConstraints = function (publisherProperties) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var audio, video;
            if (publisherProperties.audioSource === null || publisherProperties.audioSource === false) {
                audio = false;
            }
            else if (publisherProperties.audioSource === undefined) {
                audio = true;
            }
            else {
                audio = publisherProperties.audioSource;
            }
            if (publisherProperties.videoSource === null || publisherProperties.videoSource === false) {
                video = false;
            }
            else {
                video = {
                    height: {
                        ideal: 480
                    },
                    width: {
                        ideal: 640
                    }
                };
            }
            var mediaConstraints = {
                audio: audio,
                video: video
            };
            if (typeof mediaConstraints.audio === 'string') {
                mediaConstraints.audio = { deviceId: { exact: mediaConstraints.audio } };
            }
            if (mediaConstraints.video) {
                if (!!publisherProperties.resolution) {
                    var widthAndHeight = publisherProperties.resolution.toLowerCase().split('x');
                    var width = Number(widthAndHeight[0]);
                    var height = Number(widthAndHeight[1]);
                    mediaConstraints.video.width.ideal = width;
                    mediaConstraints.video.height.ideal = height;
                }
                if (!!publisherProperties.frameRate) {
                    mediaConstraints.video.frameRate = { ideal: publisherProperties.frameRate };
                }
                if (!!publisherProperties.videoSource && typeof publisherProperties.videoSource === 'string') {
                    if (publisherProperties.videoSource === 'screen') {
                        if (platform.name !== 'Chrome' && platform.name.indexOf('Firefox') === -1) {
                            var error = new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.SCREEN_SHARING_NOT_SUPPORTED, 'You can only screen share in desktop Chrome and Firefox. Detected browser: ' + platform.name);
                            console.error(error);
                            reject(error);
                        }
                        else {
                            if (!!_this.advancedConfiguration.screenShareChromeExtension && !(platform.name.indexOf('Firefox') !== -1)) {
                                screenSharing.getScreenConstraints(function (error, screenConstraints) {
                                    if (!!error || !!screenConstraints.mandatory && screenConstraints.mandatory.chromeMediaSource === 'screen') {
                                        if (error === 'permission-denied' || error === 'PermissionDeniedError') {
                                            var error_1 = new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.SCREEN_CAPTURE_DENIED, 'You must allow access to one window of your desktop');
                                            console.error(error_1);
                                            reject(error_1);
                                        }
                                        else {
                                            var extensionId = _this.advancedConfiguration.screenShareChromeExtension.split('/').pop().trim();
                                            screenSharing.getChromeExtensionStatus(extensionId, function (status) {
                                                if (status === 'installed-disabled') {
                                                    var error_2 = new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.SCREEN_EXTENSION_DISABLED, 'You must enable the screen extension');
                                                    console.error(error_2);
                                                    reject(error_2);
                                                }
                                                if (status === 'not-installed') {
                                                    var error_3 = new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.SCREEN_EXTENSION_NOT_INSTALLED, _this.advancedConfiguration.screenShareChromeExtension);
                                                    console.error(error_3);
                                                    reject(error_3);
                                                }
                                            });
                                        }
                                    }
                                    else {
                                        mediaConstraints.video = screenConstraints;
                                        resolve(mediaConstraints);
                                    }
                                });
                            }
                            else {
                                screenSharingAuto.getScreenId(function (error, sourceId, screenConstraints) {
                                    if (!!error) {
                                        if (error === 'not-installed') {
                                            var extensionUrl = !!_this.advancedConfiguration.screenShareChromeExtension ? _this.advancedConfiguration.screenShareChromeExtension :
                                                'https://chrome.google.com/webstore/detail/openvidu-screensharing/lfcgfepafnobdloecchnfaclibenjold';
                                            var error_4 = new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.SCREEN_EXTENSION_NOT_INSTALLED, extensionUrl);
                                            console.error(error_4);
                                            reject(error_4);
                                        }
                                        else if (error === 'installed-disabled') {
                                            var error_5 = new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.SCREEN_EXTENSION_DISABLED, 'You must enable the screen extension');
                                            console.error(error_5);
                                            reject(error_5);
                                        }
                                        else if (error === 'permission-denied') {
                                            var error_6 = new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.SCREEN_CAPTURE_DENIED, 'You must allow access to one window of your desktop');
                                            console.error(error_6);
                                            reject(error_6);
                                        }
                                    }
                                    else {
                                        mediaConstraints.video = screenConstraints.video;
                                        resolve(mediaConstraints);
                                    }
                                });
                            }
                            publisherProperties.videoSource = 'screen';
                        }
                    }
                    else {
                        mediaConstraints.video['deviceId'] = { exact: publisherProperties.videoSource };
                        resolve(mediaConstraints);
                    }
                }
                else {
                    resolve(mediaConstraints);
                }
            }
            else {
                resolve(mediaConstraints);
            }
        });
    };
    OpenVidu.prototype.startWs = function (onConnectSucces) {
        var config = {
            heartbeat: 5000,
            sendCloseMessage: false,
            ws: {
                uri: this.wsUri,
                useSockJS: false,
                onconnected: onConnectSucces,
                ondisconnect: this.disconnectCallback.bind(this),
                onreconnecting: this.reconnectingCallback.bind(this),
                onreconnected: this.reconnectedCallback.bind(this)
            },
            rpc: {
                requestTimeout: 10000,
                participantJoined: this.session.onParticipantJoined.bind(this.session),
                participantPublished: this.session.onParticipantPublished.bind(this.session),
                participantUnpublished: this.session.onParticipantUnpublished.bind(this.session),
                participantLeft: this.session.onParticipantLeft.bind(this.session),
                participantEvicted: this.session.onParticipantEvicted.bind(this.session),
                recordingStarted: this.session.onRecordingStarted.bind(this.session),
                recordingStopped: this.session.onRecordingStopped.bind(this.session),
                sendMessage: this.session.onNewMessage.bind(this.session),
                iceCandidate: this.session.recvIceCandidate.bind(this.session),
                mediaError: this.session.onMediaError.bind(this.session)
            }
        };
        this.jsonRpcClient = new RpcBuilder.clients.JsonRpcClient(config);
    };
    OpenVidu.prototype.closeWs = function () {
        this.jsonRpcClient.close();
    };
    OpenVidu.prototype.sendRequest = function (method, params, callback) {
        if (params && params instanceof Function) {
            callback = params;
            params = {};
        }
        console.debug('Sending request: {method:"' + method + '", params: ' + JSON.stringify(params) + '}');
        this.jsonRpcClient.send(method, params, callback);
    };
    OpenVidu.prototype.isMediaStreamTrack = function (mediaSource) {
        var is = (!!mediaSource &&
            mediaSource.enabled !== undefined && typeof mediaSource.enabled === 'boolean' &&
            mediaSource.id !== undefined && typeof mediaSource.id === 'string' &&
            mediaSource.kind !== undefined && typeof mediaSource.kind === 'string' &&
            mediaSource.label !== undefined && typeof mediaSource.label === 'string' &&
            mediaSource.muted !== undefined && typeof mediaSource.muted === 'boolean' &&
            mediaSource.readyState !== undefined && typeof mediaSource.readyState === 'string');
        return is;
    };
    OpenVidu.prototype.getWsUri = function () {
        return this.wsUri;
    };
    OpenVidu.prototype.getSecret = function () {
        return this.secret;
    };
    OpenVidu.prototype.getRecorder = function () {
        return this.recorder;
    };
    OpenVidu.prototype.disconnectCallback = function () {
        console.warn('Websocket connection lost');
        if (this.isRoomAvailable()) {
            this.session.onLostConnection();
        }
        else {
            alert('Connection error. Please reload page.');
        }
    };
    OpenVidu.prototype.reconnectingCallback = function () {
        console.warn('Websocket connection lost (reconnecting)');
        if (this.isRoomAvailable()) {
            this.session.onLostConnection();
        }
        else {
            alert('Connection error. Please reload page.');
        }
    };
    OpenVidu.prototype.reconnectedCallback = function () {
        console.warn('Websocket reconnected');
    };
    OpenVidu.prototype.isRoomAvailable = function () {
        if (this.session !== undefined && this.session instanceof Session_1.Session) {
            return true;
        }
        else {
            console.warn('Session instance not found');
            return false;
        }
    };
    return OpenVidu;
}());
exports.OpenVidu = OpenVidu;

},{"../OpenViduInternal/Enums/OpenViduError":26,"../OpenViduInternal/Enums/VideoInsertMode":27,"../OpenViduInternal/KurentoUtils/kurento-jsonrpc":42,"../OpenViduInternal/ScreenSharing/Screen-Capturing":47,"../OpenViduInternal/ScreenSharing/Screen-Capturing-Auto":46,"./LocalRecorder":18,"./Publisher":20,"./Session":21,"platform":8}],20:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var Session_1 = require("./Session");
var Stream_1 = require("./Stream");
var StreamManager_1 = require("./StreamManager");
var StreamEvent_1 = require("../OpenViduInternal/Events/StreamEvent");
var VideoElementEvent_1 = require("../OpenViduInternal/Events/VideoElementEvent");
var OpenViduError_1 = require("../OpenViduInternal/Enums/OpenViduError");
var Publisher = (function (_super) {
    __extends(Publisher, _super);
    function Publisher(targEl, properties, openvidu) {
        var _this = _super.call(this, new Stream_1.Stream((!!openvidu.session) ? openvidu.session : new Session_1.Session(openvidu), { publisherProperties: properties, mediaConstraints: {} }), targEl) || this;
        _this.openvidu = openvidu;
        _this.accessAllowed = false;
        _this.isSubscribedToRemote = false;
        _this.accessDenied = false;
        _this.properties = properties;
        _this.stream.ee.on('local-stream-destroyed-by-disconnect', function (reason) {
            var streamEvent = new StreamEvent_1.StreamEvent(true, _this, 'streamDestroyed', _this.stream, reason);
            _this.ee.emitEvent('streamDestroyed', [streamEvent]);
            streamEvent.callDefaultBehaviour();
        });
        return _this;
    }
    Publisher.prototype.publishAudio = function (value) {
        this.stream.getMediaStream().getAudioTracks().forEach(function (track) {
            track.enabled = value;
        });
        console.info("'Publisher' has " + (value ? 'published' : 'unpublished') + ' its audio stream');
    };
    Publisher.prototype.publishVideo = function (value) {
        this.stream.getMediaStream().getVideoTracks().forEach(function (track) {
            track.enabled = value;
        });
        console.info("'Publisher' has " + (value ? 'published' : 'unpublished') + ' its video stream');
    };
    Publisher.prototype.subscribeToRemote = function (value) {
        value = (value !== undefined) ? value : true;
        this.isSubscribedToRemote = value;
        this.stream.subscribeToMyRemote(value);
    };
    Publisher.prototype.on = function (type, handler) {
        var _this = this;
        _super.prototype.on.call(this, type, handler);
        if (type === 'streamCreated') {
            if (!!this.stream && this.stream.isLocalStreamPublished) {
                this.ee.emitEvent('streamCreated', [new StreamEvent_1.StreamEvent(false, this, 'streamCreated', this.stream, '')]);
            }
            else {
                this.stream.ee.on('stream-created-by-publisher', function () {
                    _this.ee.emitEvent('streamCreated', [new StreamEvent_1.StreamEvent(false, _this, 'streamCreated', _this.stream, '')]);
                });
            }
        }
        if (type === 'remoteVideoPlaying') {
            if (this.stream.displayMyRemote() && this.videos[0] && this.videos[0].video &&
                this.videos[0].video.currentTime > 0 &&
                this.videos[0].video.paused === false &&
                this.videos[0].video.ended === false &&
                this.videos[0].video.readyState === 4) {
                this.ee.emitEvent('remoteVideoPlaying', [new VideoElementEvent_1.VideoElementEvent(this.videos[0].video, this, 'remoteVideoPlaying')]);
            }
        }
        if (type === 'accessAllowed') {
            if (this.accessAllowed) {
                this.ee.emitEvent('accessAllowed');
            }
        }
        if (type === 'accessDenied') {
            if (this.accessDenied) {
                this.ee.emitEvent('accessDenied');
            }
        }
        return this;
    };
    Publisher.prototype.once = function (type, handler) {
        var _this = this;
        _super.prototype.once.call(this, type, handler);
        if (type === 'streamCreated') {
            if (!!this.stream && this.stream.isLocalStreamPublished) {
                this.ee.emitEvent('streamCreated', [new StreamEvent_1.StreamEvent(false, this, 'streamCreated', this.stream, '')]);
            }
            else {
                this.stream.ee.once('stream-created-by-publisher', function () {
                    _this.ee.emitEvent('streamCreated', [new StreamEvent_1.StreamEvent(false, _this, 'streamCreated', _this.stream, '')]);
                });
            }
        }
        if (type === 'remoteVideoPlaying') {
            if (this.stream.displayMyRemote() && this.videos[0] && this.videos[0].video &&
                this.videos[0].video.currentTime > 0 &&
                this.videos[0].video.paused === false &&
                this.videos[0].video.ended === false &&
                this.videos[0].video.readyState === 4) {
                this.ee.emitEvent('remoteVideoPlaying', [new VideoElementEvent_1.VideoElementEvent(this.videos[0].video, this, 'remoteVideoPlaying')]);
            }
        }
        if (type === 'accessAllowed') {
            if (this.accessAllowed) {
                this.ee.emitEvent('accessAllowed');
            }
        }
        if (type === 'accessDenied') {
            if (this.accessDenied) {
                this.ee.emitEvent('accessDenied');
            }
        }
        return this;
    };
    Publisher.prototype.initialize = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var errorCallback = function (openViduError) {
                _this.accessDenied = true;
                _this.accessAllowed = false;
                reject(openViduError);
            };
            var successCallback = function (mediaStream) {
                _this.accessAllowed = true;
                _this.accessDenied = false;
                if (_this.openvidu.isMediaStreamTrack(_this.properties.audioSource)) {
                    mediaStream.removeTrack(mediaStream.getAudioTracks()[0]);
                    mediaStream.addTrack(_this.properties.audioSource);
                }
                if (_this.openvidu.isMediaStreamTrack(_this.properties.videoSource)) {
                    mediaStream.removeTrack(mediaStream.getVideoTracks()[0]);
                    mediaStream.addTrack(_this.properties.videoSource);
                }
                if (!!mediaStream.getAudioTracks()[0]) {
                    mediaStream.getAudioTracks()[0].enabled = !!_this.stream.outboundStreamOpts.publisherProperties.publishAudio;
                }
                if (!!mediaStream.getVideoTracks()[0]) {
                    mediaStream.getVideoTracks()[0].enabled = !!_this.stream.outboundStreamOpts.publisherProperties.publishVideo;
                }
                _this.stream.setMediaStream(mediaStream);
                if (!_this.stream.displayMyRemote()) {
                    _this.stream.updateMediaStreamInVideos();
                }
                _this.stream.isLocalStreamReadyToPublish = true;
                _this.stream.ee.emitEvent('stream-ready-to-publish', []);
                if (!!_this.firstVideoElement) {
                    _this.createVideoElement(_this.firstVideoElement.targetElement, _this.properties.insertMode);
                }
                delete _this.firstVideoElement;
                resolve();
            };
            _this.openvidu.generateMediaConstraints(_this.properties)
                .then(function (constraints) {
                var outboundStreamOptions = {
                    mediaConstraints: constraints,
                    publisherProperties: _this.properties
                };
                _this.stream.setOutboundStreamOptions(outboundStreamOptions);
                var constraintsAux = {};
                var timeForDialogEvent = 1250;
                if (_this.stream.isSendVideo() || _this.stream.isSendAudio()) {
                    var definedAudioConstraint_1 = ((constraints.audio === undefined) ? true : constraints.audio);
                    constraintsAux.audio = _this.stream.isSendScreen() ? false : definedAudioConstraint_1;
                    constraintsAux.video = constraints.video;
                    var startTime_1 = Date.now();
                    _this.setPermissionDialogTimer(timeForDialogEvent);
                    navigator.mediaDevices.getUserMedia(constraintsAux)
                        .then(function (mediaStream) {
                        _this.clearPermissionDialogTimer(startTime_1, timeForDialogEvent);
                        if (_this.stream.isSendScreen() && _this.stream.isSendAudio()) {
                            constraintsAux.audio = definedAudioConstraint_1;
                            constraintsAux.video = false;
                            startTime_1 = Date.now();
                            _this.setPermissionDialogTimer(timeForDialogEvent);
                            navigator.mediaDevices.getUserMedia(constraintsAux)
                                .then(function (audioOnlyStream) {
                                _this.clearPermissionDialogTimer(startTime_1, timeForDialogEvent);
                                mediaStream.addTrack(audioOnlyStream.getAudioTracks()[0]);
                                successCallback(mediaStream);
                            })
                                .catch(function (error) {
                                _this.clearPermissionDialogTimer(startTime_1, timeForDialogEvent);
                                var errorName, errorMessage;
                                switch (error.name.toLowerCase()) {
                                    case 'notfounderror':
                                        errorName = OpenViduError_1.OpenViduErrorName.INPUT_AUDIO_DEVICE_NOT_FOUND;
                                        errorMessage = error.toString();
                                        errorCallback(new OpenViduError_1.OpenViduError(errorName, errorMessage));
                                        break;
                                    case 'notallowederror':
                                        errorName = OpenViduError_1.OpenViduErrorName.DEVICE_ACCESS_DENIED;
                                        errorMessage = error.toString();
                                        errorCallback(new OpenViduError_1.OpenViduError(errorName, errorMessage));
                                        break;
                                    case 'overconstrainederror':
                                        if (error.constraint.toLowerCase() === 'deviceid') {
                                            errorName = OpenViduError_1.OpenViduErrorName.INPUT_AUDIO_DEVICE_NOT_FOUND;
                                            errorMessage = "Audio input device with deviceId '" + constraints.video.deviceId.exact + "' not found";
                                        }
                                        else {
                                            errorName = OpenViduError_1.OpenViduErrorName.PUBLISHER_PROPERTIES_ERROR;
                                            errorMessage = "Audio input device doesn't support the value passed for constraint '" + error.constraint + "'";
                                        }
                                        errorCallback(new OpenViduError_1.OpenViduError(errorName, errorMessage));
                                        break;
                                }
                            });
                        }
                        else {
                            successCallback(mediaStream);
                        }
                    })
                        .catch(function (error) {
                        _this.clearPermissionDialogTimer(startTime_1, timeForDialogEvent);
                        var errorName, errorMessage;
                        switch (error.name.toLowerCase()) {
                            case 'notfounderror':
                                navigator.mediaDevices.getUserMedia({
                                    audio: false,
                                    video: constraints.video
                                })
                                    .then(function (mediaStream) {
                                    mediaStream.getVideoTracks().forEach(function (track) {
                                        track.stop();
                                    });
                                    errorName = OpenViduError_1.OpenViduErrorName.INPUT_AUDIO_DEVICE_NOT_FOUND;
                                    errorMessage = error.toString();
                                    errorCallback(new OpenViduError_1.OpenViduError(errorName, errorMessage));
                                }).catch(function (e) {
                                    errorName = OpenViduError_1.OpenViduErrorName.INPUT_VIDEO_DEVICE_NOT_FOUND;
                                    errorMessage = error.toString();
                                    errorCallback(new OpenViduError_1.OpenViduError(errorName, errorMessage));
                                });
                                break;
                            case 'notallowederror':
                                errorName = _this.stream.isSendScreen() ? OpenViduError_1.OpenViduErrorName.SCREEN_CAPTURE_DENIED : OpenViduError_1.OpenViduErrorName.DEVICE_ACCESS_DENIED;
                                errorMessage = error.toString();
                                errorCallback(new OpenViduError_1.OpenViduError(errorName, errorMessage));
                                break;
                            case 'overconstrainederror':
                                navigator.mediaDevices.getUserMedia({
                                    audio: false,
                                    video: constraints.video
                                })
                                    .then(function (mediaStream) {
                                    mediaStream.getVideoTracks().forEach(function (track) {
                                        track.stop();
                                    });
                                    if (error.constraint.toLowerCase() === 'deviceid') {
                                        errorName = OpenViduError_1.OpenViduErrorName.INPUT_AUDIO_DEVICE_NOT_FOUND;
                                        errorMessage = "Audio input device with deviceId '" + constraints.audio.deviceId.exact + "' not found";
                                    }
                                    else {
                                        errorName = OpenViduError_1.OpenViduErrorName.PUBLISHER_PROPERTIES_ERROR;
                                        errorMessage = "Audio input device doesn't support the value passed for constraint '" + error.constraint + "'";
                                    }
                                    errorCallback(new OpenViduError_1.OpenViduError(errorName, errorMessage));
                                }).catch(function (e) {
                                    if (error.constraint.toLowerCase() === 'deviceid') {
                                        errorName = OpenViduError_1.OpenViduErrorName.INPUT_VIDEO_DEVICE_NOT_FOUND;
                                        errorMessage = "Video input device with deviceId '" + constraints.video.deviceId.exact + "' not found";
                                    }
                                    else {
                                        errorName = OpenViduError_1.OpenViduErrorName.PUBLISHER_PROPERTIES_ERROR;
                                        errorMessage = "Video input device doesn't support the value passed for constraint '" + error.constraint + "'";
                                    }
                                    errorCallback(new OpenViduError_1.OpenViduError(errorName, errorMessage));
                                });
                                break;
                        }
                    });
                }
                else {
                    reject(new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.NO_INPUT_SOURCE_SET, "Properties 'audioSource' and 'videoSource' cannot be set to false or null at the same time when calling 'OpenVidu.initPublisher'"));
                }
            })
                .catch(function (error) {
                errorCallback(error);
            });
        });
    };
    Publisher.prototype.updateSession = function (session) {
        this.session = session;
        this.stream.session = session;
    };
    Publisher.prototype.emitEvent = function (type, eventArray) {
        this.ee.emitEvent(type, eventArray);
    };
    Publisher.prototype.reestablishStreamPlayingEvent = function () {
        if (this.ee.getListeners('streamPlaying').length > 0) {
            this.addPlayEventToFirstVideo();
        }
    };
    Publisher.prototype.setPermissionDialogTimer = function (waitTime) {
        var _this = this;
        this.permissionDialogTimeout = setTimeout(function () {
            _this.ee.emitEvent('accessDialogOpened', []);
        }, waitTime);
    };
    Publisher.prototype.clearPermissionDialogTimer = function (startTime, waitTime) {
        clearTimeout(this.permissionDialogTimeout);
        if ((Date.now() - startTime) > waitTime) {
            this.ee.emitEvent('accessDialogClosed', []);
        }
    };
    return Publisher;
}(StreamManager_1.StreamManager));
exports.Publisher = Publisher;

},{"../OpenViduInternal/Enums/OpenViduError":26,"../OpenViduInternal/Events/StreamEvent":34,"../OpenViduInternal/Events/VideoElementEvent":36,"./Session":21,"./Stream":22,"./StreamManager":23}],21:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Connection_1 = require("./Connection");
var Subscriber_1 = require("./Subscriber");
var ConnectionEvent_1 = require("../OpenViduInternal/Events/ConnectionEvent");
var RecordingEvent_1 = require("../OpenViduInternal/Events/RecordingEvent");
var SessionDisconnectedEvent_1 = require("../OpenViduInternal/Events/SessionDisconnectedEvent");
var SignalEvent_1 = require("../OpenViduInternal/Events/SignalEvent");
var StreamEvent_1 = require("../OpenViduInternal/Events/StreamEvent");
var OpenViduError_1 = require("../OpenViduInternal/Enums/OpenViduError");
var VideoInsertMode_1 = require("../OpenViduInternal/Enums/VideoInsertMode");
var platform = require("platform");
var EventEmitter = require("wolfy87-eventemitter");
var Session = (function () {
    function Session(openvidu) {
        this.streamManagers = [];
        this.remoteStreamsCreated = {};
        this.remoteConnections = {};
        this.speakingEventsEnabled = false;
        this.ee = new EventEmitter();
        this.openvidu = openvidu;
    }
    Session.prototype.connect = function (token, metadata) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.processToken(token);
            if (_this.openvidu.checkSystemRequirements()) {
                _this.options = {
                    sessionId: _this.sessionId,
                    participantId: token,
                    metadata: !!metadata ? _this.stringClientMetadata(metadata) : ''
                };
                _this.connectAux(token).then(function () {
                    resolve();
                }).catch(function (error) {
                    reject(error);
                });
            }
            else {
                reject(new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.BROWSER_NOT_SUPPORTED, 'Browser ' + platform.name + ' ' + platform.version + ' is not supported in OpenVidu'));
            }
        });
    };
    Session.prototype.disconnect = function () {
        this.leave(false, 'disconnect');
    };
    Session.prototype.subscribe = function (stream, targetElement, param3, param4) {
        var properties = {};
        if (!!param3 && typeof param3 !== 'function') {
            properties = {
                insertMode: (typeof param3.insertMode !== 'undefined') ? ((typeof param3.insertMode === 'string') ? VideoInsertMode_1.VideoInsertMode[param3.insertMode] : properties.insertMode) : VideoInsertMode_1.VideoInsertMode.APPEND,
                subscribeToAudio: (typeof param3.subscribeToAudio !== 'undefined') ? param3.subscribeToAudio : true,
                subscribeToVideo: (typeof param3.subscribeToVideo !== 'undefined') ? param3.subscribeToVideo : true
            };
        }
        else {
            properties = {
                insertMode: VideoInsertMode_1.VideoInsertMode.APPEND,
                subscribeToAudio: true,
                subscribeToVideo: true
            };
        }
        var completionHandler;
        if (!!param3 && (typeof param3 === 'function')) {
            completionHandler = param3;
        }
        else if (!!param4) {
            completionHandler = param4;
        }
        console.info('Subscribing to ' + stream.connection.connectionId);
        stream.subscribe()
            .then(function () {
            console.info('Subscribed correctly to ' + stream.connection.connectionId);
            if (completionHandler !== undefined) {
                completionHandler(undefined);
            }
        })
            .catch(function (error) {
            if (completionHandler !== undefined) {
                completionHandler(error);
            }
        });
        var subscriber = new Subscriber_1.Subscriber(stream, targetElement, properties);
        if (!!subscriber.targetElement) {
            stream.streamManager.createVideoElement(subscriber.targetElement, properties.insertMode);
        }
        return subscriber;
    };
    Session.prototype.subscribeAsync = function (stream, targetElement, properties) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var subscriber;
            var callback = function (error) {
                if (!!error) {
                    reject(error);
                }
                else {
                    resolve(subscriber);
                }
            };
            if (!!properties) {
                subscriber = _this.subscribe(stream, targetElement, properties, callback);
            }
            else {
                subscriber = _this.subscribe(stream, targetElement, callback);
            }
        });
    };
    Session.prototype.unsubscribe = function (subscriber) {
        var connectionId = subscriber.stream.connection.connectionId;
        console.info('Unsubscribing from ' + connectionId);
        this.openvidu.sendRequest('unsubscribeFromVideo', { sender: subscriber.stream.connection.connectionId }, function (error, response) {
            if (error) {
                console.error('Error unsubscribing from ' + connectionId, error);
            }
            else {
                console.info('Unsubscribed correctly from ' + connectionId);
            }
            subscriber.stream.disposeWebRtcPeer();
            subscriber.stream.disposeMediaStream();
        });
        subscriber.stream.streamManager.removeAllVideos();
    };
    Session.prototype.publish = function (publisher) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            publisher.session = _this;
            publisher.stream.session = _this;
            if (!publisher.stream.isLocalStreamPublished) {
                _this.connection.addStream(publisher.stream);
                publisher.stream.publish()
                    .then(function () {
                    resolve();
                })
                    .catch(function (error) {
                    reject(error);
                });
            }
            else {
                publisher.initialize()
                    .then(function () {
                    _this.connection.addStream(publisher.stream);
                    publisher.reestablishStreamPlayingEvent();
                    publisher.stream.publish()
                        .then(function () {
                        resolve();
                    })
                        .catch(function (error) {
                        reject(error);
                    });
                }).catch(function (error) {
                    reject(error);
                });
            }
        });
    };
    Session.prototype.unpublish = function (publisher) {
        var stream = publisher.stream;
        if (!stream.connection) {
            console.error('The associated Connection object of this Publisher is null', stream);
            return;
        }
        else if (stream.connection !== this.connection) {
            console.error('The associated Connection object of this Publisher is not your local Connection.' +
                "Only moderators can force unpublish on remote Streams via 'forceUnpublish' method", stream);
            return;
        }
        else {
            console.info('Unpublishing local media (' + stream.connection.connectionId + ')');
            this.openvidu.sendRequest('unpublishVideo', function (error, response) {
                if (error) {
                    console.error(error);
                }
                else {
                    console.info('Media unpublished correctly');
                }
            });
            stream.disposeWebRtcPeer();
            delete stream.connection.stream;
            var streamEvent = new StreamEvent_1.StreamEvent(true, publisher, 'streamDestroyed', publisher.stream, 'unpublish');
            publisher.emitEvent('streamDestroyed', [streamEvent]);
            streamEvent.callDefaultBehaviour();
        }
    };
    Session.prototype.signal = function (signal) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var signalMessage = {};
            if (signal.to && signal.to.length > 0) {
                var connectionIds_1 = [];
                signal.to.forEach(function (connection) {
                    connectionIds_1.push(connection.connectionId);
                });
                signalMessage['to'] = connectionIds_1;
            }
            else {
                signalMessage['to'] = [];
            }
            signalMessage['data'] = signal.data ? signal.data : '';
            signalMessage['type'] = signal.type ? signal.type : '';
            _this.openvidu.sendRequest('sendMessage', {
                message: JSON.stringify(signalMessage)
            }, function (error, response) {
                if (!!error) {
                    reject(error);
                }
                else {
                    resolve();
                }
            });
        });
    };
    Session.prototype.on = function (type, handler) {
        this.ee.on(type, function (event) {
            if (event) {
                console.info("Event '" + type + "' triggered by 'Session'", event);
            }
            else {
                console.info("Event '" + type + "' triggered by 'Session'");
            }
            handler(event);
        });
        if (type === 'publisherStartSpeaking' || type === 'publisherStopSpeaking') {
            this.speakingEventsEnabled = true;
            for (var connectionId in this.remoteConnections) {
                var str = this.remoteConnections[connectionId].stream;
                if (!!str && !str.speechEvent && str.hasAudio) {
                    str.enableSpeakingEvents();
                }
            }
        }
        return this;
    };
    Session.prototype.once = function (type, handler) {
        this.ee.once(type, function (event) {
            if (event) {
                console.info("Event '" + type + "' triggered by 'Session'", event);
            }
            else {
                console.info("Event '" + type + "' triggered by 'Session'");
            }
            handler(event);
        });
        if (type === 'publisherStartSpeaking' || type === 'publisherStopSpeaking') {
            this.speakingEventsEnabled = true;
            for (var connectionId in this.remoteConnections) {
                var str = this.remoteConnections[connectionId].stream;
                if (!!str && !str.speechEvent && str.hasAudio) {
                    str.enableOnceSpeakingEvents();
                }
            }
        }
        return this;
    };
    Session.prototype.off = function (type, handler) {
        if (!handler) {
            this.ee.removeAllListeners(type);
        }
        else {
            this.ee.off(type, handler);
        }
        if (type === 'publisherStartSpeaking' || type === 'publisherStopSpeaking') {
            this.speakingEventsEnabled = false;
            for (var connectionId in this.remoteConnections) {
                var str = this.remoteConnections[connectionId].stream;
                if (!!str && !!str.speechEvent) {
                    str.disableSpeakingEvents();
                }
            }
        }
        return this;
    };
    Session.prototype.onParticipantJoined = function (response) {
        var _this = this;
        this.getConnection(response.id, '')
            .then(function (connection) {
            console.warn('Connection ' + response.id + ' already exists in connections list');
        })
            .catch(function (openViduError) {
            var connection = new Connection_1.Connection(_this, response);
            _this.remoteConnections[response.id] = connection;
            _this.ee.emitEvent('connectionCreated', [new ConnectionEvent_1.ConnectionEvent(false, _this, 'connectionCreated', connection, '')]);
        });
    };
    Session.prototype.onParticipantLeft = function (msg) {
        var _this = this;
        this.getRemoteConnection(msg.name, 'Remote connection ' + msg.name + " unknown when 'onParticipantLeft'. " +
            'Existing remote connections: ' + JSON.stringify(Object.keys(this.remoteConnections)))
            .then(function (connection) {
            if (!!connection.stream) {
                var stream = connection.stream;
                var streamEvent = new StreamEvent_1.StreamEvent(true, _this, 'streamDestroyed', stream, msg.reason);
                _this.ee.emitEvent('streamDestroyed', [streamEvent]);
                streamEvent.callDefaultBehaviour();
                delete _this.remoteStreamsCreated[stream.streamId];
            }
            delete _this.remoteConnections[connection.connectionId];
            _this.ee.emitEvent('connectionDestroyed', [new ConnectionEvent_1.ConnectionEvent(false, _this, 'connectionDestroyed', connection, msg.reason)]);
        })
            .catch(function (openViduError) {
            console.error(openViduError);
        });
    };
    Session.prototype.onParticipantPublished = function (response) {
        var _this = this;
        var afterConnectionFound = function (connection) {
            _this.remoteConnections[connection.connectionId] = connection;
            if (!_this.remoteStreamsCreated[connection.stream.streamId]) {
                _this.ee.emitEvent('streamCreated', [new StreamEvent_1.StreamEvent(false, _this, 'streamCreated', connection.stream, '')]);
            }
            _this.remoteStreamsCreated[connection.stream.streamId] = true;
        };
        var connection;
        this.getRemoteConnection(response.id, "Remote connection '" + response.id + "' unknown when 'onParticipantPublished'. " +
            'Existing remote connections: ' + JSON.stringify(Object.keys(this.remoteConnections)))
            .then(function (con) {
            connection = con;
            response.metadata = con.data;
            connection.options = response;
            connection.initRemoteStreams(response.streams);
            afterConnectionFound(connection);
        })
            .catch(function (openViduError) {
            connection = new Connection_1.Connection(_this, response);
            afterConnectionFound(connection);
        });
    };
    Session.prototype.onParticipantUnpublished = function (msg) {
        var _this = this;
        this.getRemoteConnection(msg.name, "Remote connection '" + msg.name + "' unknown when 'onParticipantUnpublished'. " +
            'Existing remote connections: ' + JSON.stringify(Object.keys(this.remoteConnections)))
            .then(function (connection) {
            var streamEvent = new StreamEvent_1.StreamEvent(true, _this, 'streamDestroyed', connection.stream, msg.reason);
            _this.ee.emitEvent('streamDestroyed', [streamEvent]);
            streamEvent.callDefaultBehaviour();
            var streamId = connection.stream.streamId;
            delete _this.remoteStreamsCreated[streamId];
            connection.removeStream(streamId);
        })
            .catch(function (openViduError) {
            console.error(openViduError);
        });
    };
    Session.prototype.onParticipantEvicted = function (msg) {
    };
    Session.prototype.onNewMessage = function (msg) {
        var _this = this;
        console.info('New signal: ' + JSON.stringify(msg));
        this.getConnection(msg.from, "Connection '" + msg.from + "' unknow when 'onNewMessage'. Existing remote connections: "
            + JSON.stringify(Object.keys(this.remoteConnections)) + '. Existing local connection: ' + this.connection.connectionId)
            .then(function (connection) {
            _this.ee.emitEvent('signal', [new SignalEvent_1.SignalEvent(_this, msg.type, msg.data, connection)]);
            _this.ee.emitEvent('signal:' + msg.type, [new SignalEvent_1.SignalEvent(_this, msg.type, msg.data, connection)]);
        })
            .catch(function (openViduError) {
            console.error(openViduError);
        });
    };
    Session.prototype.recvIceCandidate = function (msg) {
        var candidate = {
            candidate: msg.candidate,
            sdpMid: msg.sdpMid,
            sdpMLineIndex: msg.sdpMLineIndex,
            toJSON: function () {
                return { candidate: msg.candidate };
            }
        };
        this.getConnection(msg.endpointName, 'Connection not found for endpoint ' + msg.endpointName + '. Ice candidate will be ignored: ' + candidate)
            .then(function (connection) {
            var stream = connection.stream;
            stream.getWebRtcPeer().addIceCandidate(candidate).catch(function (error) {
                console.error('Error adding candidate for ' + stream.streamId
                    + ' stream of endpoint ' + msg.endpointName + ': ' + error);
            });
        })
            .catch(function (openViduError) {
            console.error(openViduError);
        });
    };
    Session.prototype.onSessionClosed = function (msg) {
        console.info('Session closed: ' + JSON.stringify(msg));
        var s = msg.room;
        if (s !== undefined) {
            this.ee.emitEvent('session-closed', [{
                    session: s
                }]);
        }
        else {
            console.warn('Session undefined on session closed', msg);
        }
    };
    Session.prototype.onLostConnection = function () {
        console.warn('Lost connection in Session ' + this.sessionId);
        if (!!this.sessionId && !this.connection.disposed) {
            this.leave(true, 'networkDisconnect');
        }
    };
    Session.prototype.onMediaError = function (params) {
        console.error('Media error: ' + JSON.stringify(params));
        var err = params.error;
        if (err) {
            this.ee.emitEvent('error-media', [{
                    error: err
                }]);
        }
        else {
            console.warn('Received undefined media error. Params:', params);
        }
    };
    Session.prototype.onRecordingStarted = function (response) {
        this.ee.emitEvent('recordingStarted', [new RecordingEvent_1.RecordingEvent(this, 'recordingStarted', response.id, response.name)]);
    };
    Session.prototype.onRecordingStopped = function (response) {
        this.ee.emitEvent('recordingStopped', [new RecordingEvent_1.RecordingEvent(this, 'recordingStopped', response.id, response.name)]);
    };
    Session.prototype.emitEvent = function (type, eventArray) {
        this.ee.emitEvent(type, eventArray);
    };
    Session.prototype.leave = function (forced, reason) {
        var _this = this;
        forced = !!forced;
        console.info('Leaving Session (forced=' + forced + ')');
        if (!!this.connection) {
            if (!this.connection.disposed && !forced) {
                this.openvidu.sendRequest('leaveRoom', function (error, response) {
                    if (error) {
                        console.error(error);
                    }
                    _this.openvidu.closeWs();
                });
            }
            else {
                this.openvidu.closeWs();
            }
            if (!!this.connection.stream) {
                this.connection.stream.disposeWebRtcPeer();
                if (this.connection.stream.isLocalStreamPublished) {
                    this.connection.stream.ee.emitEvent('local-stream-destroyed-by-disconnect', [reason]);
                }
            }
            if (!this.connection.disposed) {
                var sessionDisconnectEvent = new SessionDisconnectedEvent_1.SessionDisconnectedEvent(this, reason);
                this.ee.emitEvent('sessionDisconnected', [sessionDisconnectEvent]);
                sessionDisconnectEvent.callDefaultBehaviour();
            }
        }
        else {
            console.warn('You were not connected to the session ' + this.sessionId);
        }
    };
    Session.prototype.connectAux = function (token) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.openvidu.startWs(function (error) {
                if (!!error) {
                    reject(error);
                }
                else {
                    var joinParams = {
                        token: (!!token) ? token : '',
                        session: _this.sessionId,
                        metadata: !!_this.options.metadata ? _this.options.metadata : '',
                        secret: _this.openvidu.getSecret(),
                        recorder: _this.openvidu.getRecorder(),
                    };
                    _this.openvidu.sendRequest('joinRoom', joinParams, function (error, response) {
                        if (!!error) {
                            reject(error);
                        }
                        else {
                            _this.connection = new Connection_1.Connection(_this);
                            _this.connection.connectionId = response.id;
                            _this.connection.data = response.metadata;
                            var events_1 = {
                                connections: new Array(),
                                streams: new Array()
                            };
                            var existingParticipants = response.value;
                            existingParticipants.forEach(function (participant) {
                                var connection = new Connection_1.Connection(_this, participant);
                                _this.remoteConnections[connection.connectionId] = connection;
                                events_1.connections.push(connection);
                                if (!!connection.stream) {
                                    _this.remoteStreamsCreated[connection.stream.streamId] = true;
                                    events_1.streams.push(connection.stream);
                                }
                            });
                            _this.ee.emitEvent('connectionCreated', [new ConnectionEvent_1.ConnectionEvent(false, _this, 'connectionCreated', _this.connection, '')]);
                            events_1.connections.forEach(function (connection) {
                                _this.ee.emitEvent('connectionCreated', [new ConnectionEvent_1.ConnectionEvent(false, _this, 'connectionCreated', connection, '')]);
                            });
                            events_1.streams.forEach(function (stream) {
                                _this.ee.emitEvent('streamCreated', [new StreamEvent_1.StreamEvent(false, _this, 'streamCreated', stream, '')]);
                            });
                            resolve();
                        }
                    });
                }
            });
        });
    };
    Session.prototype.stringClientMetadata = function (metadata) {
        if (typeof metadata !== 'string') {
            return JSON.stringify(metadata);
        }
        else {
            return metadata;
        }
    };
    Session.prototype.getConnection = function (connectionId, errorMessage) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var connection = _this.remoteConnections[connectionId];
            if (!!connection) {
                resolve(connection);
            }
            else {
                if (_this.connection.connectionId === connectionId) {
                    resolve(_this.connection);
                }
                else {
                    reject(new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.GENERIC_ERROR, errorMessage));
                }
            }
        });
    };
    Session.prototype.getRemoteConnection = function (connectionId, errorMessage) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var connection = _this.remoteConnections[connectionId];
            if (!!connection) {
                resolve(connection);
            }
            else {
                reject(new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.GENERIC_ERROR, errorMessage));
            }
        });
    };
    Session.prototype.processToken = function (token) {
        var url = new URL(token);
        this.sessionId = url.searchParams.get('sessionId');
        var secret = url.searchParams.get('secret');
        var recorder = url.searchParams.get('recorder');
        var turnUsername = url.searchParams.get('turnUsername');
        var turnCredential = url.searchParams.get('turnCredential');
        var role = url.searchParams.get('role');
        if (!!secret) {
            this.openvidu.secret = secret;
        }
        if (!!recorder) {
            this.openvidu.recorder = true;
        }
        if (!!turnUsername && !!turnCredential) {
            var stunUrl = 'stun:' + url.hostname + ':3478';
            var turnUrl1 = 'turn:' + url.hostname + ':3478';
            var turnUrl2 = turnUrl1 + '?transport=tcp';
            this.openvidu.iceServers = [
                { urls: [stunUrl] },
                { urls: [turnUrl1, turnUrl2], username: turnUsername, credential: turnCredential }
            ];
            console.log('TURN temp credentials [' + turnUsername + ':' + turnCredential + ']');
        }
        if (!!role) {
            this.openvidu.role = role;
        }
        this.openvidu.wsUri = 'wss://' + url.host + '/openvidu';
    };
    return Session;
}());
exports.Session = Session;

},{"../OpenViduInternal/Enums/OpenViduError":26,"../OpenViduInternal/Enums/VideoInsertMode":27,"../OpenViduInternal/Events/ConnectionEvent":28,"../OpenViduInternal/Events/RecordingEvent":31,"../OpenViduInternal/Events/SessionDisconnectedEvent":32,"../OpenViduInternal/Events/SignalEvent":33,"../OpenViduInternal/Events/StreamEvent":34,"./Connection":17,"./Subscriber":24,"platform":8,"wolfy87-eventemitter":15}],22:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var WebRtcPeer_1 = require("../OpenViduInternal/WebRtcPeer/WebRtcPeer");
var WebRtcStats_1 = require("../OpenViduInternal/WebRtcStats/WebRtcStats");
var PublisherSpeakingEvent_1 = require("../OpenViduInternal/Events/PublisherSpeakingEvent");
var EventEmitter = require("wolfy87-eventemitter");
var hark = require("hark");
var Stream = (function () {
    function Stream(session, options) {
        var _this = this;
        this.ee = new EventEmitter();
        this.isSubscribeToRemote = false;
        this.isLocalStreamReadyToPublish = false;
        this.isLocalStreamPublished = false;
        this.session = session;
        if (options.hasOwnProperty('id')) {
            this.inboundStreamOpts = options;
            this.streamId = this.inboundStreamOpts.id;
            this.hasAudio = this.inboundStreamOpts.recvAudio;
            this.hasVideo = this.inboundStreamOpts.recvVideo;
            this.typeOfVideo = (!this.inboundStreamOpts.typeOfVideo) ? undefined : this.inboundStreamOpts.typeOfVideo;
            this.frameRate = (this.inboundStreamOpts.frameRate === -1) ? undefined : this.inboundStreamOpts.frameRate;
        }
        else {
            this.outboundStreamOpts = options;
            if (this.isSendVideo()) {
                if (this.isSendScreen()) {
                    this.typeOfVideo = 'SCREEN';
                }
                else {
                    this.typeOfVideo = 'CAMERA';
                }
                this.frameRate = this.outboundStreamOpts.publisherProperties.frameRate;
            }
            else {
                delete this.typeOfVideo;
            }
            this.hasAudio = this.isSendAudio();
            this.hasVideo = this.isSendVideo();
        }
        this.ee.on('mediastream-updated', function () {
            _this.streamManager.updateMediaStream(_this.mediaStream);
            console.debug('Video srcObject [' + _this.mediaStream + '] updated in stream [' + _this.streamId + ']');
        });
    }
    Stream.prototype.getMediaStream = function () {
        return this.mediaStream;
    };
    Stream.prototype.setMediaStream = function (mediaStream) {
        this.mediaStream = mediaStream;
    };
    Stream.prototype.updateMediaStreamInVideos = function () {
        this.ee.emitEvent('mediastream-updated');
    };
    Stream.prototype.getWebRtcPeer = function () {
        return this.webRtcPeer;
    };
    Stream.prototype.getRTCPeerConnection = function () {
        return this.webRtcPeer.pc;
    };
    Stream.prototype.subscribeToMyRemote = function (value) {
        this.isSubscribeToRemote = value;
    };
    Stream.prototype.setOutboundStreamOptions = function (outboundStreamOpts) {
        this.outboundStreamOpts = outboundStreamOpts;
    };
    Stream.prototype.subscribe = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.initWebRtcPeerReceive()
                .then(function () {
                resolve();
            })
                .catch(function (error) {
                reject(error);
            });
        });
    };
    Stream.prototype.publish = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (_this.isLocalStreamReadyToPublish) {
                _this.initWebRtcPeerSend()
                    .then(function () {
                    resolve();
                })
                    .catch(function (error) {
                    reject(error);
                });
            }
            else {
                _this.ee.once('stream-ready-to-publish', function () {
                    _this.publish()
                        .then(function () {
                        resolve();
                    })
                        .catch(function (error) {
                        reject(error);
                    });
                });
            }
        });
    };
    Stream.prototype.disposeWebRtcPeer = function () {
        if (this.webRtcPeer) {
            this.webRtcPeer.dispose();
        }
        if (this.speechEvent) {
            this.speechEvent.stop();
        }
        this.stopWebRtcStats();
        console.info((!!this.outboundStreamOpts ? 'Outbound ' : 'Inbound ') + "WebRTCPeer from 'Stream' with id [" + this.streamId + '] is now closed');
    };
    Stream.prototype.disposeMediaStream = function () {
        if (this.mediaStream) {
            this.mediaStream.getAudioTracks().forEach(function (track) {
                track.stop();
            });
            this.mediaStream.getVideoTracks().forEach(function (track) {
                track.stop();
            });
            delete this.mediaStream;
        }
        console.info((!!this.outboundStreamOpts ? 'Local ' : 'Remote ') + "MediaStream from 'Stream' with id [" + this.streamId + '] is now disposed');
    };
    Stream.prototype.displayMyRemote = function () {
        return this.isSubscribeToRemote;
    };
    Stream.prototype.isSendAudio = function () {
        return (!!this.outboundStreamOpts &&
            this.outboundStreamOpts.publisherProperties.audioSource !== null &&
            this.outboundStreamOpts.publisherProperties.audioSource !== false);
    };
    Stream.prototype.isSendVideo = function () {
        return (!!this.outboundStreamOpts &&
            this.outboundStreamOpts.publisherProperties.videoSource !== null &&
            this.outboundStreamOpts.publisherProperties.videoSource !== false);
    };
    Stream.prototype.isSendScreen = function () {
        return (!!this.outboundStreamOpts &&
            this.outboundStreamOpts.publisherProperties.videoSource === 'screen');
    };
    Stream.prototype.setSpeechEventIfNotExists = function () {
        if (!this.speechEvent) {
            var harkOptions = this.session.openvidu.advancedConfiguration.publisherSpeakingEventsOptions || {};
            harkOptions.interval = (typeof harkOptions.interval === 'number') ? harkOptions.interval : 50;
            harkOptions.threshold = (typeof harkOptions.threshold === 'number') ? harkOptions.threshold : -50;
            this.speechEvent = hark(this.mediaStream, harkOptions);
        }
    };
    Stream.prototype.enableSpeakingEvents = function () {
        var _this = this;
        this.setSpeechEventIfNotExists();
        this.speechEvent.on('speaking', function () {
            _this.session.emitEvent('publisherStartSpeaking', [new PublisherSpeakingEvent_1.PublisherSpeakingEvent(_this.session, 'publisherStartSpeaking', _this.connection, _this.streamId)]);
        });
        this.speechEvent.on('stopped_speaking', function () {
            _this.session.emitEvent('publisherStopSpeaking', [new PublisherSpeakingEvent_1.PublisherSpeakingEvent(_this.session, 'publisherStopSpeaking', _this.connection, _this.streamId)]);
        });
    };
    Stream.prototype.enableOnceSpeakingEvents = function () {
        var _this = this;
        this.setSpeechEventIfNotExists();
        this.speechEvent.on('speaking', function () {
            _this.session.emitEvent('publisherStartSpeaking', [new PublisherSpeakingEvent_1.PublisherSpeakingEvent(_this.session, 'publisherStartSpeaking', _this.connection, _this.streamId)]);
            _this.disableSpeakingEvents();
        });
        this.speechEvent.on('stopped_speaking', function () {
            _this.session.emitEvent('publisherStopSpeaking', [new PublisherSpeakingEvent_1.PublisherSpeakingEvent(_this.session, 'publisherStopSpeaking', _this.connection, _this.streamId)]);
            _this.disableSpeakingEvents();
        });
    };
    Stream.prototype.disableSpeakingEvents = function () {
        this.speechEvent.stop();
        this.speechEvent = undefined;
    };
    Stream.prototype.isLocal = function () {
        return (!this.inboundStreamOpts && !!this.outboundStreamOpts);
    };
    Stream.prototype.getSelectedIceCandidate = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.webRtcStats.getSelectedIceCandidateInfo()
                .then(function (report) { return resolve(report); })
                .catch(function (error) { return reject(error); });
        });
    };
    Stream.prototype.getRemoteIceCandidateList = function () {
        return this.webRtcPeer.remoteCandidatesQueue;
    };
    Stream.prototype.getLocalIceCandidateList = function () {
        return this.webRtcPeer.localCandidatesQueue;
    };
    Stream.prototype.initWebRtcPeerSend = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var userMediaConstraints = {
                audio: _this.isSendAudio(),
                video: _this.isSendVideo()
            };
            var options = {
                mediaStream: _this.mediaStream,
                mediaConstraints: userMediaConstraints,
                onicecandidate: _this.connection.sendIceCandidate.bind(_this.connection),
                iceServers: _this.getIceServersConf(),
                simulcast: false
            };
            var successCallback = function (sdpOfferParam) {
                console.debug('Sending SDP offer to publish as '
                    + _this.streamId, sdpOfferParam);
                _this.session.openvidu.sendRequest('publishVideo', {
                    sdpOffer: sdpOfferParam,
                    doLoopback: _this.displayMyRemote() || false,
                    audioActive: _this.isSendAudio(),
                    videoActive: _this.isSendVideo(),
                    typeOfVideo: ((_this.isSendVideo()) ? (_this.isSendScreen() ? 'SCREEN' : 'CAMERA') : ''),
                    frameRate: !!_this.frameRate ? _this.frameRate : -1
                }, function (error, response) {
                    if (error) {
                        reject('Error on publishVideo: ' + JSON.stringify(error));
                    }
                    else {
                        _this.webRtcPeer.processAnswer(response.sdpAnswer)
                            .then(function () {
                            _this.streamId = response.id;
                            _this.isLocalStreamPublished = true;
                            if (_this.displayMyRemote()) {
                                _this.remotePeerSuccesfullyEstablished();
                            }
                            _this.ee.emitEvent('stream-created-by-publisher');
                            _this.initWebRtcStats();
                            resolve();
                        })
                            .catch(function (error) {
                            reject(error);
                        });
                        console.info("'Publisher' successfully published to session");
                    }
                });
            };
            if (_this.displayMyRemote()) {
                _this.webRtcPeer = new WebRtcPeer_1.WebRtcPeerSendrecv(options);
            }
            else {
                _this.webRtcPeer = new WebRtcPeer_1.WebRtcPeerSendonly(options);
            }
            _this.webRtcPeer.generateOffer().then(function (offer) {
                successCallback(offer);
            }).catch(function (error) {
                reject(new Error('(publish) SDP offer error: ' + JSON.stringify(error)));
            });
        });
    };
    Stream.prototype.initWebRtcPeerReceive = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var offerConstraints = {
                audio: _this.inboundStreamOpts.recvAudio,
                video: _this.inboundStreamOpts.recvVideo
            };
            console.debug("'Session.subscribe(Stream)' called. Constraints of generate SDP offer", offerConstraints);
            var options = {
                onicecandidate: _this.connection.sendIceCandidate.bind(_this.connection),
                mediaConstraints: offerConstraints,
                iceServers: _this.getIceServersConf(),
                simulcast: false
            };
            var successCallback = function (sdpOfferParam) {
                console.debug('Sending SDP offer to subscribe to '
                    + _this.streamId, sdpOfferParam);
                _this.session.openvidu.sendRequest('receiveVideoFrom', {
                    sender: _this.streamId,
                    sdpOffer: sdpOfferParam
                }, function (error, response) {
                    if (error) {
                        reject(new Error('Error on recvVideoFrom: ' + JSON.stringify(error)));
                    }
                    else {
                        _this.webRtcPeer.processAnswer(response.sdpAnswer).then(function () {
                            _this.remotePeerSuccesfullyEstablished();
                            _this.initWebRtcStats();
                            resolve();
                        }).catch(function (error) {
                            reject(error);
                        });
                    }
                });
            };
            _this.webRtcPeer = new WebRtcPeer_1.WebRtcPeerRecvonly(options);
            _this.webRtcPeer.generateOffer()
                .then(function (offer) {
                successCallback(offer);
            })
                .catch(function (error) {
                reject(new Error('(subscribe) SDP offer error: ' + JSON.stringify(error)));
            });
        });
    };
    Stream.prototype.remotePeerSuccesfullyEstablished = function () {
        this.mediaStream = this.webRtcPeer.pc.getRemoteStreams()[0];
        console.debug('Peer remote stream', this.mediaStream);
        if (!!this.mediaStream) {
            this.ee.emitEvent('mediastream-updated');
            if (!this.displayMyRemote() && !!this.mediaStream.getAudioTracks()[0] && this.session.speakingEventsEnabled) {
                this.enableSpeakingEvents();
            }
        }
    };
    Stream.prototype.initWebRtcStats = function () {
        this.webRtcStats = new WebRtcStats_1.WebRtcStats(this);
        this.webRtcStats.initWebRtcStats();
    };
    Stream.prototype.stopWebRtcStats = function () {
        if (!!this.webRtcStats && this.webRtcStats.isEnabled()) {
            this.webRtcStats.stopWebRtcStats();
        }
    };
    Stream.prototype.getIceServersConf = function () {
        var returnValue;
        if (!!this.session.openvidu.advancedConfiguration.iceServers) {
            returnValue = this.session.openvidu.advancedConfiguration.iceServers === 'freeice' ?
                undefined :
                this.session.openvidu.advancedConfiguration.iceServers;
        }
        else if (this.session.openvidu.iceServers) {
            returnValue = this.session.openvidu.iceServers;
        }
        else {
            returnValue = undefined;
        }
        return returnValue;
    };
    return Stream;
}());
exports.Stream = Stream;

},{"../OpenViduInternal/Events/PublisherSpeakingEvent":30,"../OpenViduInternal/WebRtcPeer/WebRtcPeer":48,"../OpenViduInternal/WebRtcStats/WebRtcStats":49,"hark":5,"wolfy87-eventemitter":15}],23:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var StreamManagerEvent_1 = require("../OpenViduInternal/Events/StreamManagerEvent");
var VideoElementEvent_1 = require("../OpenViduInternal/Events/VideoElementEvent");
var VideoInsertMode_1 = require("../OpenViduInternal/Enums/VideoInsertMode");
var EventEmitter = require("wolfy87-eventemitter");
var StreamManager = (function () {
    function StreamManager(stream, targetElement) {
        var _this = this;
        this.videos = [];
        this.lazyLaunchVideoElementCreatedEvent = false;
        this.ee = new EventEmitter();
        this.stream = stream;
        this.stream.streamManager = this;
        this.remote = !this.stream.isLocal();
        if (!!targetElement) {
            var targEl = void 0;
            if (typeof targetElement === 'string') {
                targEl = document.getElementById(targetElement);
            }
            else if (targetElement instanceof HTMLElement) {
                targEl = targetElement;
            }
            if (!!targEl) {
                this.firstVideoElement = {
                    targetElement: targEl,
                    video: document.createElement('video'),
                    id: ''
                };
                this.targetElement = targEl;
                this.element = targEl;
            }
        }
        this.canPlayListener = function () {
            if (_this.stream.isLocal()) {
                if (!_this.stream.displayMyRemote()) {
                    console.info("Your local 'Stream' with id [" + _this.stream.streamId + '] video is now playing');
                    _this.ee.emitEvent('videoPlaying', [new VideoElementEvent_1.VideoElementEvent(_this.videos[0].video, _this, 'videoPlaying')]);
                }
                else {
                    console.info("Your own remote 'Stream' with id [" + _this.stream.streamId + '] video is now playing');
                    _this.ee.emitEvent('remoteVideoPlaying', [new VideoElementEvent_1.VideoElementEvent(_this.videos[0].video, _this, 'remoteVideoPlaying')]);
                }
            }
            else {
                console.info("Remote 'Stream' with id [" + _this.stream.streamId + '] video is now playing');
                _this.ee.emitEvent('videoPlaying', [new VideoElementEvent_1.VideoElementEvent(_this.videos[0].video, _this, 'videoPlaying')]);
            }
            _this.ee.emitEvent('streamPlaying', [new StreamManagerEvent_1.StreamManagerEvent(_this)]);
        };
    }
    StreamManager.prototype.on = function (type, handler) {
        this.ee.on(type, function (event) {
            if (event) {
                console.info("Event '" + type + "' triggered", event);
            }
            else {
                console.info("Event '" + type + "' triggered");
            }
            handler(event);
        });
        if (type === 'videoElementCreated') {
            if (!!this.stream && this.lazyLaunchVideoElementCreatedEvent) {
                this.ee.emitEvent('videoElementCreated', [new VideoElementEvent_1.VideoElementEvent(this.videos[0].video, this, 'videoElementCreated')]);
                this.lazyLaunchVideoElementCreatedEvent = false;
            }
        }
        if (type === 'streamPlaying' || type === 'videoPlaying') {
            if (this.videos[0] && this.videos[0].video &&
                this.videos[0].video.currentTime > 0 &&
                this.videos[0].video.paused === false &&
                this.videos[0].video.ended === false &&
                this.videos[0].video.readyState === 4) {
                this.ee.emitEvent('streamPlaying', [new StreamManagerEvent_1.StreamManagerEvent(this)]);
                this.ee.emitEvent('videoPlaying', [new VideoElementEvent_1.VideoElementEvent(this.videos[0].video, this, 'videoPlaying')]);
            }
        }
        return this;
    };
    StreamManager.prototype.once = function (type, handler) {
        this.ee.once(type, function (event) {
            if (event) {
                console.info("Event '" + type + "' triggered once", event);
            }
            else {
                console.info("Event '" + type + "' triggered once");
            }
            handler(event);
        });
        if (type === 'videoElementCreated') {
            if (!!this.stream && this.lazyLaunchVideoElementCreatedEvent) {
                this.ee.emitEvent('videoElementCreated', [new VideoElementEvent_1.VideoElementEvent(this.videos[0].video, this, 'videoElementCreated')]);
            }
        }
        if (type === 'streamPlaying' || type === 'videoPlaying') {
            if (this.videos[0] && this.videos[0].video &&
                this.videos[0].video.currentTime > 0 &&
                this.videos[0].video.paused === false &&
                this.videos[0].video.ended === false &&
                this.videos[0].video.readyState === 4) {
                this.ee.emitEvent('streamPlaying', [new StreamManagerEvent_1.StreamManagerEvent(this)]);
                this.ee.emitEvent('videoPlaying', [new VideoElementEvent_1.VideoElementEvent(this.videos[0].video, this, 'videoPlaying')]);
            }
        }
        return this;
    };
    StreamManager.prototype.off = function (type, handler) {
        if (!handler) {
            this.ee.removeAllListeners(type);
        }
        else {
            this.ee.off(type, handler);
        }
        return this;
    };
    StreamManager.prototype.addVideoElement = function (video) {
        this.initializeVideoProperties(video);
        for (var _i = 0, _a = this.videos; _i < _a.length; _i++) {
            var v = _a[_i];
            if (v.video === video) {
                return 0;
            }
        }
        var returnNumber = 1;
        this.initializeVideoProperties(video);
        for (var _b = 0, _c = this.stream.session.streamManagers; _b < _c.length; _b++) {
            var streamManager = _c[_b];
            if (streamManager.disassociateVideo(video)) {
                returnNumber = -1;
                break;
            }
        }
        this.stream.session.streamManagers.forEach(function (streamManager) {
            streamManager.disassociateVideo(video);
        });
        this.pushNewStreamManagerVideo({
            video: video,
            id: video.id
        });
        console.info('New video element associated to ', this);
        return returnNumber;
    };
    StreamManager.prototype.createVideoElement = function (targetElement, insertMode) {
        var targEl;
        if (typeof targetElement === 'string') {
            targEl = document.getElementById(targEl);
            if (!targEl) {
                throw new Error("The provided 'targetElement' couldn't be resolved to any HTML element: " + targetElement);
            }
        }
        else if (targetElement instanceof HTMLElement) {
            targEl = targetElement;
        }
        else {
            throw new Error("The provided 'targetElement' couldn't be resolved to any HTML element: " + targetElement);
        }
        var video = document.createElement('video');
        this.initializeVideoProperties(video);
        var insMode = !!insertMode ? insertMode : VideoInsertMode_1.VideoInsertMode.APPEND;
        switch (insMode) {
            case VideoInsertMode_1.VideoInsertMode.AFTER:
                targEl.parentNode.insertBefore(video, targEl.nextSibling);
                break;
            case VideoInsertMode_1.VideoInsertMode.APPEND:
                targEl.appendChild(video);
                break;
            case VideoInsertMode_1.VideoInsertMode.BEFORE:
                targEl.parentNode.insertBefore(video, targEl);
                break;
            case VideoInsertMode_1.VideoInsertMode.PREPEND:
                targEl.insertBefore(video, targEl.childNodes[0]);
                break;
            case VideoInsertMode_1.VideoInsertMode.REPLACE:
                targEl.parentNode.replaceChild(video, targEl);
                break;
            default:
                insMode = VideoInsertMode_1.VideoInsertMode.APPEND;
                targEl.appendChild(video);
                break;
        }
        var v = {
            targetElement: targEl,
            video: video,
            insertMode: insMode,
            id: video.id
        };
        this.pushNewStreamManagerVideo(v);
        this.ee.emitEvent('videoElementCreated', [new VideoElementEvent_1.VideoElementEvent(v.video, this, 'videoElementCreated')]);
        this.lazyLaunchVideoElementCreatedEvent = !!this.firstVideoElement;
        return video;
    };
    StreamManager.prototype.initializeVideoProperties = function (video) {
        video.srcObject = this.stream.getMediaStream();
        video.autoplay = true;
        video.controls = false;
        if (!video.id) {
            video.id = (this.remote ? 'remote-' : 'local-') + 'video-' + this.stream.streamId;
            if (!this.id && !!this.targetElement) {
                this.id = video.id;
            }
        }
        if (!this.remote && !this.stream.displayMyRemote()) {
            video.muted = true;
            if (this.stream.outboundStreamOpts.publisherProperties.mirror) {
                this.mirrorVideo(video);
            }
        }
    };
    StreamManager.prototype.removeAllVideos = function () {
        var _this = this;
        for (var i = this.stream.session.streamManagers.length - 1; i >= 0; --i) {
            if (this.stream.session.streamManagers[i] === this) {
                this.stream.session.streamManagers.splice(i, 1);
            }
        }
        this.videos.slice().reverse().forEach(function (streamManagerVideo, index, videos) {
            streamManagerVideo.video.removeEventListener('canplay', _this.canPlayListener);
            if (!!streamManagerVideo.targetElement) {
                streamManagerVideo.video.parentNode.removeChild(streamManagerVideo.video);
                _this.ee.emitEvent('videoElementDestroyed', [new VideoElementEvent_1.VideoElementEvent(streamManagerVideo.video, _this, 'videoElementDestroyed')]);
                _this.videos.splice(videos.length - 1 - index, 1);
            }
            else {
                streamManagerVideo.video.srcObject = null;
            }
        });
    };
    StreamManager.prototype.disassociateVideo = function (video) {
        var disassociated = false;
        for (var i = 0; i < this.videos.length; i++) {
            if (this.videos[i].video === video) {
                this.videos.splice(i, 1);
                disassociated = true;
                console.info('Video element disassociated from ', this);
                break;
            }
        }
        return disassociated;
    };
    StreamManager.prototype.addPlayEventToFirstVideo = function () {
        if ((!!this.videos[0]) && (!!this.videos[0].video) && (this.videos[0].video.oncanplay === null)) {
            this.videos[0].video.addEventListener('canplay', this.canPlayListener);
        }
    };
    StreamManager.prototype.updateMediaStream = function (mediaStream) {
        this.videos.forEach(function (streamManagerVideo) {
            streamManagerVideo.video.srcObject = mediaStream;
        });
    };
    StreamManager.prototype.pushNewStreamManagerVideo = function (streamManagerVideo) {
        this.videos.push(streamManagerVideo);
        this.addPlayEventToFirstVideo();
        if (this.stream.session.streamManagers.indexOf(this) === -1) {
            this.stream.session.streamManagers.push(this);
        }
    };
    StreamManager.prototype.mirrorVideo = function (video) {
        video.style.transform = 'rotateY(180deg)';
        video.style.webkitTransform = 'rotateY(180deg)';
    };
    return StreamManager;
}());
exports.StreamManager = StreamManager;

},{"../OpenViduInternal/Enums/VideoInsertMode":27,"../OpenViduInternal/Events/StreamManagerEvent":35,"../OpenViduInternal/Events/VideoElementEvent":36,"wolfy87-eventemitter":15}],24:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var StreamManager_1 = require("./StreamManager");
var Subscriber = (function (_super) {
    __extends(Subscriber, _super);
    function Subscriber(stream, targEl, properties) {
        var _this = _super.call(this, stream, targEl) || this;
        _this.element = _this.targetElement;
        _this.stream = stream;
        _this.properties = properties;
        return _this;
    }
    Subscriber.prototype.subscribeToAudio = function (value) {
        this.stream.getMediaStream().getAudioTracks().forEach(function (track) {
            track.enabled = value;
        });
        console.info("'Subscriber' has " + (value ? 'subscribed to' : 'unsubscribed from') + ' its audio stream');
        return this;
    };
    Subscriber.prototype.subscribeToVideo = function (value) {
        this.stream.getMediaStream().getVideoTracks().forEach(function (track) {
            track.enabled = value;
        });
        console.info("'Subscriber' has " + (value ? 'subscribed to' : 'unsubscribed from') + ' its video stream');
        return this;
    };
    return Subscriber;
}(StreamManager_1.StreamManager));
exports.Subscriber = Subscriber;

},{"./StreamManager":23}],25:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var LocalRecorderState;
(function (LocalRecorderState) {
    LocalRecorderState["READY"] = "READY";
    LocalRecorderState["RECORDING"] = "RECORDING";
    LocalRecorderState["PAUSED"] = "PAUSED";
    LocalRecorderState["FINISHED"] = "FINISHED";
})(LocalRecorderState = exports.LocalRecorderState || (exports.LocalRecorderState = {}));

},{}],26:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var OpenViduErrorName;
(function (OpenViduErrorName) {
    OpenViduErrorName["BROWSER_NOT_SUPPORTED"] = "BROWSER_NOT_SUPPORTED";
    OpenViduErrorName["DEVICE_ACCESS_DENIED"] = "DEVICE_ACCESS_DENIED";
    OpenViduErrorName["SCREEN_CAPTURE_DENIED"] = "SCREEN_CAPTURE_DENIED";
    OpenViduErrorName["SCREEN_SHARING_NOT_SUPPORTED"] = "SCREEN_SHARING_NOT_SUPPORTED";
    OpenViduErrorName["SCREEN_EXTENSION_NOT_INSTALLED"] = "SCREEN_EXTENSION_NOT_INSTALLED";
    OpenViduErrorName["SCREEN_EXTENSION_DISABLED"] = "SCREEN_EXTENSION_DISABLED";
    OpenViduErrorName["INPUT_VIDEO_DEVICE_NOT_FOUND"] = "INPUT_VIDEO_DEVICE_NOT_FOUND";
    OpenViduErrorName["INPUT_AUDIO_DEVICE_NOT_FOUND"] = "INPUT_AUDIO_DEVICE_NOT_FOUND";
    OpenViduErrorName["NO_INPUT_SOURCE_SET"] = "NO_INPUT_SOURCE_SET";
    OpenViduErrorName["PUBLISHER_PROPERTIES_ERROR"] = "PUBLISHER_PROPERTIES_ERROR";
    OpenViduErrorName["OPENVIDU_PERMISSION_DENIED"] = "OPENVIDU_PERMISSION_DENIED";
    OpenViduErrorName["OPENVIDU_NOT_CONNECTED"] = "OPENVIDU_NOT_CONNECTED";
    OpenViduErrorName["GENERIC_ERROR"] = "GENERIC_ERROR";
})(OpenViduErrorName = exports.OpenViduErrorName || (exports.OpenViduErrorName = {}));
var OpenViduError = (function () {
    function OpenViduError(name, message) {
        this.name = name;
        this.message = message;
    }
    return OpenViduError;
}());
exports.OpenViduError = OpenViduError;

},{}],27:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var VideoInsertMode;
(function (VideoInsertMode) {
    VideoInsertMode["AFTER"] = "AFTER";
    VideoInsertMode["APPEND"] = "APPEND";
    VideoInsertMode["BEFORE"] = "BEFORE";
    VideoInsertMode["PREPEND"] = "PREPEND";
    VideoInsertMode["REPLACE"] = "REPLACE";
})(VideoInsertMode = exports.VideoInsertMode || (exports.VideoInsertMode = {}));

},{}],28:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var Event_1 = require("./Event");
var ConnectionEvent = (function (_super) {
    __extends(ConnectionEvent, _super);
    function ConnectionEvent(cancelable, target, type, connection, reason) {
        var _this = _super.call(this, cancelable, target, type) || this;
        _this.connection = connection;
        _this.reason = reason;
        return _this;
    }
    ConnectionEvent.prototype.callDefaultBehaviour = function () { };
    return ConnectionEvent;
}(Event_1.Event));
exports.ConnectionEvent = ConnectionEvent;

},{"./Event":29}],29:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Event = (function () {
    function Event(cancelable, target, type) {
        this.hasBeenPrevented = false;
        this.cancelable = cancelable;
        this.target = target;
        this.type = type;
    }
    Event.prototype.isDefaultPrevented = function () {
        return this.hasBeenPrevented;
    };
    Event.prototype.preventDefault = function () {
        this.callDefaultBehaviour = function () { };
        this.hasBeenPrevented = true;
    };
    return Event;
}());
exports.Event = Event;

},{}],30:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var Event_1 = require("./Event");
var PublisherSpeakingEvent = (function (_super) {
    __extends(PublisherSpeakingEvent, _super);
    function PublisherSpeakingEvent(target, type, connection, streamId) {
        var _this = _super.call(this, false, target, type) || this;
        _this.type = type;
        _this.connection = connection;
        _this.streamId = streamId;
        return _this;
    }
    PublisherSpeakingEvent.prototype.callDefaultBehaviour = function () { };
    return PublisherSpeakingEvent;
}(Event_1.Event));
exports.PublisherSpeakingEvent = PublisherSpeakingEvent;

},{"./Event":29}],31:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var Event_1 = require("./Event");
var RecordingEvent = (function (_super) {
    __extends(RecordingEvent, _super);
    function RecordingEvent(target, type, id, name) {
        var _this = _super.call(this, false, target, type) || this;
        _this.id = id;
        if (name !== id) {
            _this.name = name;
        }
        return _this;
    }
    RecordingEvent.prototype.callDefaultBehaviour = function () { };
    return RecordingEvent;
}(Event_1.Event));
exports.RecordingEvent = RecordingEvent;

},{"./Event":29}],32:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var Event_1 = require("./Event");
var SessionDisconnectedEvent = (function (_super) {
    __extends(SessionDisconnectedEvent, _super);
    function SessionDisconnectedEvent(target, reason) {
        var _this = _super.call(this, true, target, 'sessionDisconnected') || this;
        _this.reason = reason;
        return _this;
    }
    SessionDisconnectedEvent.prototype.callDefaultBehaviour = function () {
        console.info("Calling default behaviour upon '" + this.type + "' event dispatched by 'Session'");
        var session = this.target;
        for (var connectionId in session.remoteConnections) {
            if (!!session.remoteConnections[connectionId].stream) {
                session.remoteConnections[connectionId].stream.disposeWebRtcPeer();
                session.remoteConnections[connectionId].stream.disposeMediaStream();
                if (session.remoteConnections[connectionId].stream.streamManager) {
                    session.remoteConnections[connectionId].stream.streamManager.removeAllVideos();
                }
                delete session.remoteStreamsCreated[session.remoteConnections[connectionId].stream.streamId];
                session.remoteConnections[connectionId].dispose();
            }
            delete session.remoteConnections[connectionId];
        }
    };
    return SessionDisconnectedEvent;
}(Event_1.Event));
exports.SessionDisconnectedEvent = SessionDisconnectedEvent;

},{"./Event":29}],33:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var Event_1 = require("./Event");
var SignalEvent = (function (_super) {
    __extends(SignalEvent, _super);
    function SignalEvent(target, type, data, from) {
        var _this = _super.call(this, false, target, type) || this;
        _this.type = type;
        _this.data = data;
        _this.from = from;
        return _this;
    }
    SignalEvent.prototype.callDefaultBehaviour = function () { };
    return SignalEvent;
}(Event_1.Event));
exports.SignalEvent = SignalEvent;

},{"./Event":29}],34:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var Event_1 = require("./Event");
var Publisher_1 = require("../../OpenVidu/Publisher");
var Session_1 = require("../../OpenVidu/Session");
var StreamEvent = (function (_super) {
    __extends(StreamEvent, _super);
    function StreamEvent(cancelable, target, type, stream, reason) {
        var _this = _super.call(this, cancelable, target, type) || this;
        _this.stream = stream;
        _this.reason = reason;
        return _this;
    }
    StreamEvent.prototype.callDefaultBehaviour = function () {
        if (this.type === 'streamDestroyed') {
            if (this.target instanceof Session_1.Session) {
                console.info("Calling default behaviour upon '" + this.type + "' event dispatched by 'Session'");
                this.stream.disposeWebRtcPeer();
            }
            else if (this.target instanceof Publisher_1.Publisher) {
                console.info("Calling default behaviour upon '" + this.type + "' event dispatched by 'Publisher'");
                this.stream.isLocalStreamReadyToPublish = false;
            }
            this.stream.disposeMediaStream();
            if (this.stream.streamManager)
                this.stream.streamManager.removeAllVideos();
            delete this.stream.session.remoteStreamsCreated[this.stream.streamId];
            var remoteConnection = this.stream.session.remoteConnections[this.stream.connection.connectionId];
            if (!!remoteConnection && !!remoteConnection.options) {
                var streamOptionsServer = remoteConnection.options.streams;
                for (var i = streamOptionsServer.length - 1; i >= 0; --i) {
                    if (streamOptionsServer[i].id === this.stream.streamId) {
                        streamOptionsServer.splice(i, 1);
                    }
                }
            }
        }
    };
    return StreamEvent;
}(Event_1.Event));
exports.StreamEvent = StreamEvent;

},{"../../OpenVidu/Publisher":20,"../../OpenVidu/Session":21,"./Event":29}],35:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var Event_1 = require("./Event");
var StreamManagerEvent = (function (_super) {
    __extends(StreamManagerEvent, _super);
    function StreamManagerEvent(target) {
        return _super.call(this, false, target, 'streamPlaying') || this;
    }
    StreamManagerEvent.prototype.callDefaultBehaviour = function () { };
    return StreamManagerEvent;
}(Event_1.Event));
exports.StreamManagerEvent = StreamManagerEvent;

},{"./Event":29}],36:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var Event_1 = require("./Event");
var VideoElementEvent = (function (_super) {
    __extends(VideoElementEvent, _super);
    function VideoElementEvent(element, target, type) {
        var _this = _super.call(this, false, target, type) || this;
        _this.element = element;
        return _this;
    }
    VideoElementEvent.prototype.callDefaultBehaviour = function () { };
    return VideoElementEvent;
}(Event_1.Event));
exports.VideoElementEvent = VideoElementEvent;

},{"./Event":29}],37:[function(require,module,exports){
function Mapper() {
    var sources = {};
    this.forEach = function (callback) {
        for (var key in sources) {
            var source = sources[key];
            for (var key2 in source)
                callback(source[key2]);
        }
        ;
    };
    this.get = function (id, source) {
        var ids = sources[source];
        if (ids == undefined)
            return undefined;
        return ids[id];
    };
    this.remove = function (id, source) {
        var ids = sources[source];
        if (ids == undefined)
            return;
        delete ids[id];
        for (var i in ids) {
            return false;
        }
        delete sources[source];
    };
    this.set = function (value, id, source) {
        if (value == undefined)
            return this.remove(id, source);
        var ids = sources[source];
        if (ids == undefined)
            sources[source] = ids = {};
        ids[id] = value;
    };
}
;
Mapper.prototype.pop = function (id, source) {
    var value = this.get(id, source);
    if (value == undefined)
        return undefined;
    this.remove(id, source);
    return value;
};
module.exports = Mapper;

},{}],38:[function(require,module,exports){
var JsonRpcClient = require('./jsonrpcclient');
exports.JsonRpcClient = JsonRpcClient;

},{"./jsonrpcclient":39}],39:[function(require,module,exports){
var RpcBuilder = require('../');
var WebSocketWithReconnection = require('./transports/webSocketWithReconnection');
Date.now = Date.now || function () {
    return +new Date;
};
var PING_INTERVAL = 5000;
var RECONNECTING = 'RECONNECTING';
var CONNECTED = 'CONNECTED';
var DISCONNECTED = 'DISCONNECTED';
var Logger = console;
function JsonRpcClient(configuration) {
    var self = this;
    var wsConfig = configuration.ws;
    var notReconnectIfNumLessThan = -1;
    var pingNextNum = 0;
    var enabledPings = true;
    var pingPongStarted = false;
    var pingInterval;
    var status = DISCONNECTED;
    var onreconnecting = wsConfig.onreconnecting;
    var onreconnected = wsConfig.onreconnected;
    var onconnected = wsConfig.onconnected;
    var onerror = wsConfig.onerror;
    configuration.rpc.pull = function (params, request) {
        request.reply(null, "push");
    };
    wsConfig.onreconnecting = function () {
        Logger.debug("--------- ONRECONNECTING -----------");
        if (status === RECONNECTING) {
            Logger.error("Websocket already in RECONNECTING state when receiving a new ONRECONNECTING message. Ignoring it");
            return;
        }
        status = RECONNECTING;
        if (onreconnecting) {
            onreconnecting();
        }
    };
    wsConfig.onreconnected = function () {
        Logger.debug("--------- ONRECONNECTED -----------");
        if (status === CONNECTED) {
            Logger.error("Websocket already in CONNECTED state when receiving a new ONRECONNECTED message. Ignoring it");
            return;
        }
        status = CONNECTED;
        enabledPings = true;
        updateNotReconnectIfLessThan();
        usePing();
        if (onreconnected) {
            onreconnected();
        }
    };
    wsConfig.onconnected = function () {
        Logger.debug("--------- ONCONNECTED -----------");
        if (status === CONNECTED) {
            Logger.error("Websocket already in CONNECTED state when receiving a new ONCONNECTED message. Ignoring it");
            return;
        }
        status = CONNECTED;
        enabledPings = true;
        usePing();
        if (onconnected) {
            onconnected();
        }
    };
    wsConfig.onerror = function (error) {
        Logger.debug("--------- ONERROR -----------");
        status = DISCONNECTED;
        if (onerror) {
            onerror(error);
        }
    };
    var ws = new WebSocketWithReconnection(wsConfig);
    Logger.debug('Connecting websocket to URI: ' + wsConfig.uri);
    var rpcBuilderOptions = {
        request_timeout: configuration.rpc.requestTimeout,
        ping_request_timeout: configuration.rpc.heartbeatRequestTimeout
    };
    var rpc = new RpcBuilder(RpcBuilder.packers.JsonRPC, rpcBuilderOptions, ws, function (request) {
        Logger.debug('Received request: ' + JSON.stringify(request));
        try {
            var func = configuration.rpc[request.method];
            if (func === undefined) {
                Logger.error("Method " + request.method + " not registered in client");
            }
            else {
                func(request.params, request);
            }
        }
        catch (err) {
            Logger.error('Exception processing request: ' + JSON.stringify(request));
            Logger.error(err);
        }
    });
    this.send = function (method, params, callback) {
        if (method !== 'ping') {
            Logger.debug('Request: method:' + method + " params:" + JSON.stringify(params));
        }
        var requestTime = Date.now();
        rpc.encode(method, params, function (error, result) {
            if (error) {
                try {
                    Logger.error("ERROR:" + error.message + " in Request: method:" +
                        method + " params:" + JSON.stringify(params) + " request:" +
                        error.request);
                    if (error.data) {
                        Logger.error("ERROR DATA:" + JSON.stringify(error.data));
                    }
                }
                catch (e) { }
                error.requestTime = requestTime;
            }
            if (callback) {
                if (result != undefined && result.value !== 'pong') {
                    Logger.debug('Response: ' + JSON.stringify(result));
                }
                callback(error, result);
            }
        });
    };
    function updateNotReconnectIfLessThan() {
        Logger.debug("notReconnectIfNumLessThan = " + pingNextNum + ' (old=' +
            notReconnectIfNumLessThan + ')');
        notReconnectIfNumLessThan = pingNextNum;
    }
    function sendPing() {
        if (enabledPings) {
            var params = null;
            if (pingNextNum == 0 || pingNextNum == notReconnectIfNumLessThan) {
                params = {
                    interval: configuration.heartbeat || PING_INTERVAL
                };
            }
            pingNextNum++;
            self.send('ping', params, (function (pingNum) {
                return function (error, result) {
                    if (error) {
                        Logger.debug("Error in ping request #" + pingNum + " (" +
                            error.message + ")");
                        if (pingNum > notReconnectIfNumLessThan) {
                            enabledPings = false;
                            updateNotReconnectIfLessThan();
                            Logger.debug("Server did not respond to ping message #" +
                                pingNum + ". Reconnecting... ");
                            ws.reconnectWs();
                        }
                    }
                };
            })(pingNextNum));
        }
        else {
            Logger.debug("Trying to send ping, but ping is not enabled");
        }
    }
    function usePing() {
        if (!pingPongStarted) {
            Logger.debug("Starting ping (if configured)");
            pingPongStarted = true;
            if (configuration.heartbeat != undefined) {
                pingInterval = setInterval(sendPing, configuration.heartbeat);
                sendPing();
            }
        }
    }
    this.close = function () {
        Logger.debug("Closing jsonRpcClient explicitly by client");
        if (pingInterval != undefined) {
            Logger.debug("Clearing ping interval");
            clearInterval(pingInterval);
        }
        pingPongStarted = false;
        enabledPings = false;
        if (configuration.sendCloseMessage) {
            Logger.debug("Sending close message");
            this.send('closeSession', null, function (error, result) {
                if (error) {
                    Logger.error("Error sending close message: " + JSON.stringify(error));
                }
                ws.close();
            });
        }
        else {
            ws.close();
        }
    };
    this.forceClose = function (millis) {
        ws.forceClose(millis);
    };
    this.reconnect = function () {
        ws.reconnectWs();
    };
}
module.exports = JsonRpcClient;

},{"../":42,"./transports/webSocketWithReconnection":41}],40:[function(require,module,exports){
var WebSocketWithReconnection = require('./webSocketWithReconnection');
exports.WebSocketWithReconnection = WebSocketWithReconnection;

},{"./webSocketWithReconnection":41}],41:[function(require,module,exports){
(function (global){
"use strict";
var BrowserWebSocket = global.WebSocket || global.MozWebSocket;
var Logger = console;
var MAX_RETRIES = 2000;
var RETRY_TIME_MS = 3000;
var CONNECTING = 0;
var OPEN = 1;
var CLOSING = 2;
var CLOSED = 3;
function WebSocketWithReconnection(config) {
    var closing = false;
    var registerMessageHandler;
    var wsUri = config.uri;
    var useSockJS = config.useSockJS;
    var reconnecting = false;
    var forcingDisconnection = false;
    var ws;
    if (useSockJS) {
        ws = new SockJS(wsUri);
    }
    else {
        ws = new WebSocket(wsUri);
    }
    ws.onopen = function () {
        logConnected(ws, wsUri);
        if (config.onconnected) {
            config.onconnected();
        }
    };
    ws.onerror = function (error) {
        Logger.error("Could not connect to " + wsUri + " (invoking onerror if defined)", error);
        if (config.onerror) {
            config.onerror(error);
        }
    };
    function logConnected(ws, wsUri) {
        try {
            Logger.debug("WebSocket connected to " + wsUri);
        }
        catch (e) {
            Logger.error(e);
        }
    }
    var reconnectionOnClose = function () {
        if (ws.readyState === CLOSED) {
            if (closing) {
                Logger.debug("Connection closed by user");
            }
            else {
                Logger.debug("Connection closed unexpectecly. Reconnecting...");
                reconnectToSameUri(MAX_RETRIES, 1);
            }
        }
        else {
            Logger.debug("Close callback from previous websocket. Ignoring it");
        }
    };
    ws.onclose = reconnectionOnClose;
    function reconnectToSameUri(maxRetries, numRetries) {
        Logger.debug("reconnectToSameUri (attempt #" + numRetries + ", max=" + maxRetries + ")");
        if (numRetries === 1) {
            if (reconnecting) {
                Logger.warn("Trying to reconnectToNewUri when reconnecting... Ignoring this reconnection.");
                return;
            }
            else {
                reconnecting = true;
            }
            if (config.onreconnecting) {
                config.onreconnecting();
            }
        }
        if (forcingDisconnection) {
            reconnectToNewUri(maxRetries, numRetries, wsUri);
        }
        else {
            if (config.newWsUriOnReconnection) {
                config.newWsUriOnReconnection(function (error, newWsUri) {
                    if (error) {
                        Logger.debug(error);
                        setTimeout(function () {
                            reconnectToSameUri(maxRetries, numRetries + 1);
                        }, RETRY_TIME_MS);
                    }
                    else {
                        reconnectToNewUri(maxRetries, numRetries, newWsUri);
                    }
                });
            }
            else {
                reconnectToNewUri(maxRetries, numRetries, wsUri);
            }
        }
    }
    function reconnectToNewUri(maxRetries, numRetries, reconnectWsUri) {
        Logger.debug("Reconnection attempt #" + numRetries);
        ws.close();
        wsUri = reconnectWsUri || wsUri;
        var newWs;
        if (useSockJS) {
            newWs = new SockJS(wsUri);
        }
        else {
            newWs = new WebSocket(wsUri);
        }
        newWs.onopen = function () {
            Logger.debug("Reconnected after " + numRetries + " attempts...");
            logConnected(newWs, wsUri);
            reconnecting = false;
            registerMessageHandler();
            if (config.onreconnected()) {
                config.onreconnected();
            }
            newWs.onclose = reconnectionOnClose;
        };
        var onErrorOrClose = function (error) {
            Logger.warn("Reconnection error: ", error);
            if (numRetries === maxRetries) {
                if (config.ondisconnect) {
                    config.ondisconnect();
                }
            }
            else {
                setTimeout(function () {
                    reconnectToSameUri(maxRetries, numRetries + 1);
                }, RETRY_TIME_MS);
            }
        };
        newWs.onerror = onErrorOrClose;
        ws = newWs;
    }
    this.close = function () {
        closing = true;
        ws.close();
    };
    this.forceClose = function (millis) {
        Logger.debug("Testing: Force WebSocket close");
        if (millis) {
            Logger.debug("Testing: Change wsUri for " + millis + " millis to simulate net failure");
            var goodWsUri = wsUri;
            wsUri = "wss://21.234.12.34.4:443/";
            forcingDisconnection = true;
            setTimeout(function () {
                Logger.debug("Testing: Recover good wsUri " + goodWsUri);
                wsUri = goodWsUri;
                forcingDisconnection = false;
            }, millis);
        }
        ws.close();
    };
    this.reconnectWs = function () {
        Logger.debug("reconnectWs");
        reconnectToSameUri(MAX_RETRIES, 1, wsUri);
    };
    this.send = function (message) {
        ws.send(message);
    };
    this.addEventListener = function (type, callback) {
        registerMessageHandler = function () {
            ws.addEventListener(type, callback);
        };
        registerMessageHandler();
    };
}
module.exports = WebSocketWithReconnection;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],42:[function(require,module,exports){
var defineProperty_IE8 = false;
if (Object.defineProperty) {
    try {
        Object.defineProperty({}, "x", {});
    }
    catch (e) {
        defineProperty_IE8 = true;
    }
}
if (!Function.prototype.bind) {
    Function.prototype.bind = function (oThis) {
        if (typeof this !== 'function') {
            throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
        }
        var aArgs = Array.prototype.slice.call(arguments, 1), fToBind = this, fNOP = function () { }, fBound = function () {
            return fToBind.apply(this instanceof fNOP && oThis
                ? this
                : oThis, aArgs.concat(Array.prototype.slice.call(arguments)));
        };
        fNOP.prototype = this.prototype;
        fBound.prototype = new fNOP();
        return fBound;
    };
}
var EventEmitter = require('events').EventEmitter;
var inherits = require('inherits');
var packers = require('./packers');
var Mapper = require('./Mapper');
var BASE_TIMEOUT = 5000;
function unifyResponseMethods(responseMethods) {
    if (!responseMethods)
        return {};
    for (var key in responseMethods) {
        var value = responseMethods[key];
        if (typeof value == 'string')
            responseMethods[key] =
                {
                    response: value
                };
    }
    ;
    return responseMethods;
}
;
function unifyTransport(transport) {
    if (!transport)
        return;
    if (transport instanceof Function)
        return { send: transport };
    if (transport.send instanceof Function)
        return transport;
    if (transport.postMessage instanceof Function) {
        transport.send = transport.postMessage;
        return transport;
    }
    if (transport.write instanceof Function) {
        transport.send = transport.write;
        return transport;
    }
    if (transport.onmessage !== undefined)
        return;
    if (transport.pause instanceof Function)
        return;
    throw new SyntaxError("Transport is not a function nor a valid object");
}
;
function RpcNotification(method, params) {
    if (defineProperty_IE8) {
        this.method = method;
        this.params = params;
    }
    else {
        Object.defineProperty(this, 'method', { value: method, enumerable: true });
        Object.defineProperty(this, 'params', { value: params, enumerable: true });
    }
}
;
function RpcBuilder(packer, options, transport, onRequest) {
    var self = this;
    if (!packer)
        throw new SyntaxError('Packer is not defined');
    if (!packer.pack || !packer.unpack)
        throw new SyntaxError('Packer is invalid');
    var responseMethods = unifyResponseMethods(packer.responseMethods);
    if (options instanceof Function) {
        if (transport != undefined)
            throw new SyntaxError("There can't be parameters after onRequest");
        onRequest = options;
        transport = undefined;
        options = undefined;
    }
    ;
    if (options && options.send instanceof Function) {
        if (transport && !(transport instanceof Function))
            throw new SyntaxError("Only a function can be after transport");
        onRequest = transport;
        transport = options;
        options = undefined;
    }
    ;
    if (transport instanceof Function) {
        if (onRequest != undefined)
            throw new SyntaxError("There can't be parameters after onRequest");
        onRequest = transport;
        transport = undefined;
    }
    ;
    if (transport && transport.send instanceof Function)
        if (onRequest && !(onRequest instanceof Function))
            throw new SyntaxError("Only a function can be after transport");
    options = options || {};
    EventEmitter.call(this);
    if (onRequest)
        this.on('request', onRequest);
    if (defineProperty_IE8)
        this.peerID = options.peerID;
    else
        Object.defineProperty(this, 'peerID', { value: options.peerID });
    var max_retries = options.max_retries || 0;
    function transportMessage(event) {
        self.decode(event.data || event);
    }
    ;
    this.getTransport = function () {
        return transport;
    };
    this.setTransport = function (value) {
        if (transport) {
            if (transport.removeEventListener)
                transport.removeEventListener('message', transportMessage);
            else if (transport.removeListener)
                transport.removeListener('data', transportMessage);
        }
        ;
        if (value) {
            if (value.addEventListener)
                value.addEventListener('message', transportMessage);
            else if (value.addListener)
                value.addListener('data', transportMessage);
        }
        ;
        transport = unifyTransport(value);
    };
    if (!defineProperty_IE8)
        Object.defineProperty(this, 'transport', {
            get: this.getTransport.bind(this),
            set: this.setTransport.bind(this)
        });
    this.setTransport(transport);
    var request_timeout = options.request_timeout || BASE_TIMEOUT;
    var ping_request_timeout = options.ping_request_timeout || request_timeout;
    var response_timeout = options.response_timeout || BASE_TIMEOUT;
    var duplicates_timeout = options.duplicates_timeout || BASE_TIMEOUT;
    var requestID = 0;
    var requests = new Mapper();
    var responses = new Mapper();
    var processedResponses = new Mapper();
    var message2Key = {};
    function storeResponse(message, id, dest) {
        var response = {
            message: message,
            timeout: setTimeout(function () {
                responses.remove(id, dest);
            }, response_timeout)
        };
        responses.set(response, id, dest);
    }
    ;
    function storeProcessedResponse(ack, from) {
        var timeout = setTimeout(function () {
            processedResponses.remove(ack, from);
        }, duplicates_timeout);
        processedResponses.set(timeout, ack, from);
    }
    ;
    function RpcRequest(method, params, id, from, transport) {
        RpcNotification.call(this, method, params);
        this.getTransport = function () {
            return transport;
        };
        this.setTransport = function (value) {
            transport = unifyTransport(value);
        };
        if (!defineProperty_IE8)
            Object.defineProperty(this, 'transport', {
                get: this.getTransport.bind(this),
                set: this.setTransport.bind(this)
            });
        var response = responses.get(id, from);
        if (!(transport || self.getTransport())) {
            if (defineProperty_IE8)
                this.duplicated = Boolean(response);
            else
                Object.defineProperty(this, 'duplicated', {
                    value: Boolean(response)
                });
        }
        var responseMethod = responseMethods[method];
        this.pack = packer.pack.bind(packer, this, id);
        this.reply = function (error, result, transport) {
            if (error instanceof Function || error && error.send instanceof Function) {
                if (result != undefined)
                    throw new SyntaxError("There can't be parameters after callback");
                transport = error;
                result = null;
                error = undefined;
            }
            else if (result instanceof Function
                || result && result.send instanceof Function) {
                if (transport != undefined)
                    throw new SyntaxError("There can't be parameters after callback");
                transport = result;
                result = null;
            }
            ;
            transport = unifyTransport(transport);
            if (response)
                clearTimeout(response.timeout);
            if (from != undefined) {
                if (error)
                    error.dest = from;
                if (result)
                    result.dest = from;
            }
            ;
            var message;
            if (error || result != undefined) {
                if (self.peerID != undefined) {
                    if (error)
                        error.from = self.peerID;
                    else
                        result.from = self.peerID;
                }
                if (responseMethod) {
                    if (responseMethod.error == undefined && error)
                        message =
                            {
                                error: error
                            };
                    else {
                        var method = error
                            ? responseMethod.error
                            : responseMethod.response;
                        message =
                            {
                                method: method,
                                params: error || result
                            };
                    }
                }
                else
                    message =
                        {
                            error: error,
                            result: result
                        };
                message = packer.pack(message, id);
            }
            else if (response)
                message = response.message;
            else
                message = packer.pack({ result: null }, id);
            storeResponse(message, id, from);
            transport = transport || this.getTransport() || self.getTransport();
            if (transport)
                return transport.send(message);
            return message;
        };
    }
    ;
    inherits(RpcRequest, RpcNotification);
    function cancel(message) {
        var key = message2Key[message];
        if (!key)
            return;
        delete message2Key[message];
        var request = requests.pop(key.id, key.dest);
        if (!request)
            return;
        clearTimeout(request.timeout);
        storeProcessedResponse(key.id, key.dest);
    }
    ;
    this.cancel = function (message) {
        if (message)
            return cancel(message);
        for (var message in message2Key)
            cancel(message);
    };
    this.close = function () {
        var transport = this.getTransport();
        if (transport && transport.close)
            transport.close();
        this.cancel();
        processedResponses.forEach(clearTimeout);
        responses.forEach(function (response) {
            clearTimeout(response.timeout);
        });
    };
    this.encode = function (method, params, dest, transport, callback) {
        if (params instanceof Function) {
            if (dest != undefined)
                throw new SyntaxError("There can't be parameters after callback");
            callback = params;
            transport = undefined;
            dest = undefined;
            params = undefined;
        }
        else if (dest instanceof Function) {
            if (transport != undefined)
                throw new SyntaxError("There can't be parameters after callback");
            callback = dest;
            transport = undefined;
            dest = undefined;
        }
        else if (transport instanceof Function) {
            if (callback != undefined)
                throw new SyntaxError("There can't be parameters after callback");
            callback = transport;
            transport = undefined;
        }
        ;
        if (self.peerID != undefined) {
            params = params || {};
            params.from = self.peerID;
        }
        ;
        if (dest != undefined) {
            params = params || {};
            params.dest = dest;
        }
        ;
        var message = {
            method: method,
            params: params
        };
        if (callback) {
            var id = requestID++;
            var retried = 0;
            message = packer.pack(message, id);
            function dispatchCallback(error, result) {
                self.cancel(message);
                callback(error, result);
            }
            ;
            var request = {
                message: message,
                callback: dispatchCallback,
                responseMethods: responseMethods[method] || {}
            };
            var encode_transport = unifyTransport(transport);
            function sendRequest(transport) {
                var rt = (method === 'ping' ? ping_request_timeout : request_timeout);
                request.timeout = setTimeout(timeout, rt * Math.pow(2, retried++));
                message2Key[message] = { id: id, dest: dest };
                requests.set(request, id, dest);
                transport = transport || encode_transport || self.getTransport();
                if (transport)
                    return transport.send(message);
                return message;
            }
            ;
            function retry(transport) {
                transport = unifyTransport(transport);
                console.warn(retried + ' retry for request message:', message);
                var timeout = processedResponses.pop(id, dest);
                clearTimeout(timeout);
                return sendRequest(transport);
            }
            ;
            function timeout() {
                if (retried < max_retries)
                    return retry(transport);
                var error = new Error('Request has timed out');
                error.request = message;
                error.retry = retry;
                dispatchCallback(error);
            }
            ;
            return sendRequest(transport);
        }
        ;
        message = packer.pack(message);
        transport = transport || this.getTransport();
        if (transport)
            return transport.send(message);
        return message;
    };
    this.decode = function (message, transport) {
        if (!message)
            throw new TypeError("Message is not defined");
        try {
            message = packer.unpack(message);
        }
        catch (e) {
            return console.debug(e, message);
        }
        ;
        var id = message.id;
        var ack = message.ack;
        var method = message.method;
        var params = message.params || {};
        var from = params.from;
        var dest = params.dest;
        if (self.peerID != undefined && from == self.peerID)
            return;
        if (id == undefined && ack == undefined) {
            var notification = new RpcNotification(method, params);
            if (self.emit('request', notification))
                return;
            return notification;
        }
        ;
        function processRequest() {
            transport = unifyTransport(transport) || self.getTransport();
            if (transport) {
                var response = responses.get(id, from);
                if (response)
                    return transport.send(response.message);
            }
            ;
            var idAck = (id != undefined) ? id : ack;
            var request = new RpcRequest(method, params, idAck, from, transport);
            if (self.emit('request', request))
                return;
            return request;
        }
        ;
        function processResponse(request, error, result) {
            request.callback(error, result);
        }
        ;
        function duplicatedResponse(timeout) {
            console.warn("Response already processed", message);
            clearTimeout(timeout);
            storeProcessedResponse(ack, from);
        }
        ;
        if (method) {
            if (dest == undefined || dest == self.peerID) {
                var request = requests.get(ack, from);
                if (request) {
                    var responseMethods = request.responseMethods;
                    if (method == responseMethods.error)
                        return processResponse(request, params);
                    if (method == responseMethods.response)
                        return processResponse(request, null, params);
                    return processRequest();
                }
                var processed = processedResponses.get(ack, from);
                if (processed)
                    return duplicatedResponse(processed);
            }
            return processRequest();
        }
        ;
        var error = message.error;
        var result = message.result;
        if (error && error.dest && error.dest != self.peerID)
            return;
        if (result && result.dest && result.dest != self.peerID)
            return;
        var request = requests.get(ack, from);
        if (!request) {
            var processed = processedResponses.get(ack, from);
            if (processed)
                return duplicatedResponse(processed);
            return console.warn("No callback was defined for this message", message);
        }
        ;
        processResponse(request, error, result);
    };
}
;
inherits(RpcBuilder, EventEmitter);
RpcBuilder.RpcNotification = RpcNotification;
module.exports = RpcBuilder;
var clients = require('./clients');
var transports = require('./clients/transports');
RpcBuilder.clients = clients;
RpcBuilder.clients.transports = transports;
RpcBuilder.packers = packers;

},{"./Mapper":37,"./clients":38,"./clients/transports":40,"./packers":45,"events":1,"inherits":6}],43:[function(require,module,exports){
function pack(message, id) {
    var result = {
        jsonrpc: "2.0"
    };
    if (message.method) {
        result.method = message.method;
        if (message.params)
            result.params = message.params;
        if (id != undefined)
            result.id = id;
    }
    else if (id != undefined) {
        if (message.error) {
            if (message.result !== undefined)
                throw new TypeError("Both result and error are defined");
            result.error = message.error;
        }
        else if (message.result !== undefined)
            result.result = message.result;
        else
            throw new TypeError("No result or error is defined");
        result.id = id;
    }
    ;
    return JSON.stringify(result);
}
;
function unpack(message) {
    var result = message;
    if (typeof message === 'string' || message instanceof String) {
        result = JSON.parse(message);
    }
    var version = result.jsonrpc;
    if (version !== '2.0')
        throw new TypeError("Invalid JsonRPC version '" + version + "': " + message);
    if (result.method == undefined) {
        if (result.id == undefined)
            throw new TypeError("Invalid message: " + message);
        var result_defined = result.result !== undefined;
        var error_defined = result.error !== undefined;
        if (result_defined && error_defined)
            throw new TypeError("Both result and error are defined: " + message);
        if (!result_defined && !error_defined)
            throw new TypeError("No result or error is defined: " + message);
        result.ack = result.id;
        delete result.id;
    }
    return result;
}
;
exports.pack = pack;
exports.unpack = unpack;

},{}],44:[function(require,module,exports){
function pack(message) {
    throw new TypeError("Not yet implemented");
}
;
function unpack(message) {
    throw new TypeError("Not yet implemented");
}
;
exports.pack = pack;
exports.unpack = unpack;

},{}],45:[function(require,module,exports){
var JsonRPC = require('./JsonRPC');
var XmlRPC = require('./XmlRPC');
exports.JsonRPC = JsonRPC;
exports.XmlRPC = XmlRPC;

},{"./JsonRPC":43,"./XmlRPC":44}],46:[function(require,module,exports){
window.getScreenId = function (callback, custom_parameter) {
    if (navigator.userAgent.indexOf('Edge') !== -1 && (!!navigator.msSaveOrOpenBlob || !!navigator.msSaveBlob)) {
        callback({
            video: true
        });
        return;
    }
    if (!!navigator.mozGetUserMedia) {
        callback(null, 'firefox', {
            video: {
                mozMediaSource: 'window',
                mediaSource: 'window'
            }
        });
        return;
    }
    window.addEventListener('message', onIFrameCallback);
    function onIFrameCallback(event) {
        if (!event.data)
            return;
        if (event.data.chromeMediaSourceId) {
            if (event.data.chromeMediaSourceId === 'PermissionDeniedError') {
                callback('permission-denied');
            }
            else {
                callback(null, event.data.chromeMediaSourceId, getScreenConstraints(null, event.data.chromeMediaSourceId, event.data.canRequestAudioTrack));
            }
            window.removeEventListener('message', onIFrameCallback);
        }
        if (event.data.chromeExtensionStatus) {
            callback(event.data.chromeExtensionStatus, null, getScreenConstraints(event.data.chromeExtensionStatus));
            window.removeEventListener('message', onIFrameCallback);
        }
    }
    if (!custom_parameter) {
        setTimeout(postGetSourceIdMessage, 100);
    }
    else {
        setTimeout(function () {
            postGetSourceIdMessage(custom_parameter);
        }, 100);
    }
};
function getScreenConstraints(error, sourceId, canRequestAudioTrack) {
    var screen_constraints = {
        audio: false,
        video: {
            mandatory: {
                chromeMediaSource: error ? 'screen' : 'desktop',
                maxWidth: window.screen.width > 1920 ? window.screen.width : 1920,
                maxHeight: window.screen.height > 1080 ? window.screen.height : 1080
            },
            optional: []
        }
    };
    if (!!canRequestAudioTrack) {
        screen_constraints.audio = {
            mandatory: {
                chromeMediaSource: error ? 'screen' : 'desktop',
            },
            optional: []
        };
    }
    if (sourceId) {
        screen_constraints.video.mandatory.chromeMediaSourceId = sourceId;
        if (screen_constraints.audio && screen_constraints.audio.mandatory) {
            screen_constraints.audio.mandatory.chromeMediaSourceId = sourceId;
        }
    }
    return screen_constraints;
}
function postGetSourceIdMessage(custom_parameter) {
    if (!iframe) {
        loadIFrame(function () {
            postGetSourceIdMessage(custom_parameter);
        });
        return;
    }
    if (!iframe.isLoaded) {
        setTimeout(function () {
            postGetSourceIdMessage(custom_parameter);
        }, 100);
        return;
    }
    if (!custom_parameter) {
        iframe.contentWindow.postMessage({
            captureSourceId: true
        }, '*');
    }
    else if (!!custom_parameter.forEach) {
        iframe.contentWindow.postMessage({
            captureCustomSourceId: custom_parameter
        }, '*');
    }
    else {
        iframe.contentWindow.postMessage({
            captureSourceIdWithAudio: true
        }, '*');
    }
}
var iframe;
window.getScreenConstraints = function (callback) {
    loadIFrame(function () {
        getScreenId(function (error, sourceId, screen_constraints) {
            if (!screen_constraints) {
                screen_constraints = {
                    video: true
                };
            }
            callback(error, screen_constraints.video);
        });
    });
};
function loadIFrame(loadCallback) {
    if (iframe) {
        loadCallback();
        return;
    }
    iframe = document.createElement('iframe');
    iframe.onload = function () {
        iframe.isLoaded = true;
        loadCallback();
    };
    iframe.src = 'https://openvidu.github.io/openvidu-screen-sharing-chrome-extension/';
    iframe.style.display = 'none';
    (document.body || document.documentElement).appendChild(iframe);
}
window.getChromeExtensionStatus = function (callback) {
    if (!!navigator.mozGetUserMedia) {
        callback('installed-enabled');
        return;
    }
    window.addEventListener('message', onIFrameCallback);
    function onIFrameCallback(event) {
        if (!event.data)
            return;
        if (event.data.chromeExtensionStatus) {
            callback(event.data.chromeExtensionStatus);
            window.removeEventListener('message', onIFrameCallback);
        }
    }
    setTimeout(postGetChromeExtensionStatusMessage, 100);
};
function postGetChromeExtensionStatusMessage() {
    if (!iframe) {
        loadIFrame(postGetChromeExtensionStatusMessage);
        return;
    }
    if (!iframe.isLoaded) {
        setTimeout(postGetChromeExtensionStatusMessage, 100);
        return;
    }
    iframe.contentWindow.postMessage({
        getChromeExtensionStatus: true
    }, '*');
}
exports.getScreenId = getScreenId;

},{}],47:[function(require,module,exports){
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
function onMessageCallback(data) {
    if (data == 'PermissionDeniedError') {
        if (screenCallback)
            return screenCallback('PermissionDeniedError');
        else
            throw new Error('PermissionDeniedError');
    }
    if (data == 'rtcmulticonnection-extension-loaded') {
        chromeMediaSource = 'desktop';
    }
    if (data.sourceId && screenCallback) {
        screenCallback(sourceId = data.sourceId, data.canRequestAudioTrack === true);
    }
}
function isChromeExtensionAvailable(callback) {
    if (!callback)
        return;
    if (chromeMediaSource == 'desktop')
        return callback(true);
    window.postMessage('are-you-there', '*');
    setTimeout(function () {
        if (chromeMediaSource == 'screen') {
            callback(false);
        }
        else
            callback(true);
    }, 2000);
}
function getSourceId(callback) {
    if (!callback)
        throw '"callback" parameter is mandatory.';
    if (sourceId)
        return callback(sourceId);
    screenCallback = callback;
    window.postMessage('get-sourceId', '*');
}
function getCustomSourceId(arr, callback) {
    if (!arr || !arr.forEach)
        throw '"arr" parameter is mandatory and it must be an array.';
    if (!callback)
        throw '"callback" parameter is mandatory.';
    if (sourceId)
        return callback(sourceId);
    screenCallback = callback;
    window.postMessage({
        'get-custom-sourceId': arr
    }, '*');
}
function getSourceIdWithAudio(callback) {
    if (!callback)
        throw '"callback" parameter is mandatory.';
    if (sourceId)
        return callback(sourceId);
    screenCallback = callback;
    window.postMessage('audio-plus-tab', '*');
}
function getChromeExtensionStatus(extensionid, callback) {
    if (isFirefox)
        return callback('not-chrome');
    if (arguments.length != 2) {
        callback = extensionid;
        extensionid = 'lfcgfepafnobdloecchnfaclibenjold';
    }
    var image = document.createElement('img');
    image.src = 'chrome-extension://' + extensionid + '/icon.png';
    image.onload = function () {
        chromeMediaSource = 'screen';
        window.postMessage('are-you-there', '*');
        setTimeout(function () {
            if (chromeMediaSource == 'screen') {
                callback('installed-disabled');
            }
            else
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
function getScreenConstraints(callback, captureSourceIdWithAudio) {
    sourceId = '';
    var firefoxScreenConstraints = {
        mozMediaSource: 'window',
        mediaSource: 'window'
    };
    if (isFirefox)
        return callback(null, firefoxScreenConstraints);
    var screen_constraints = {
        mandatory: {
            chromeMediaSource: chromeMediaSource,
            maxWidth: screen.width > 1920 ? screen.width : 1920,
            maxHeight: screen.height > 1080 ? screen.height : 1080
        },
        optional: []
    };
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
    if (chromeMediaSource == 'desktop') {
        screen_constraints.mandatory.chromeMediaSourceId = sourceId;
    }
    callback(null, screen_constraints);
}
exports.getScreenConstraints = getScreenConstraints;
exports.getScreenConstraintsWithAudio = getScreenConstraintsWithAudio;
exports.isChromeExtensionAvailable = isChromeExtensionAvailable;
exports.getChromeExtensionStatus = getChromeExtensionStatus;
exports.getSourceId = getSourceId;

},{}],48:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var freeice = require("freeice");
var uuid = require("uuid");
var platform = require("platform");
var WebRtcPeer = (function () {
    function WebRtcPeer(configuration) {
        var _this = this;
        this.configuration = configuration;
        this.remoteCandidatesQueue = [];
        this.localCandidatesQueue = [];
        this.iceCandidateList = [];
        this.candidategatheringdone = false;
        this.configuration.iceServers = (!!this.configuration.iceServers && this.configuration.iceServers.length > 0) ? this.configuration.iceServers : freeice();
        this.pc = new RTCPeerConnection({ iceServers: this.configuration.iceServers });
        this.id = !!configuration.id ? configuration.id : uuid.v4();
        this.pc.onicecandidate = function (event) {
            var candidate = event.candidate;
            if (candidate) {
                _this.localCandidatesQueue.push({ candidate: candidate.candidate });
                _this.candidategatheringdone = false;
                _this.configuration.onicecandidate(event.candidate);
            }
            else if (!_this.candidategatheringdone) {
                _this.candidategatheringdone = true;
            }
        };
        this.pc.onsignalingstatechange = function () {
            if (_this.pc.signalingState === 'stable') {
                while (_this.iceCandidateList.length > 0) {
                    _this.pc.addIceCandidate(_this.iceCandidateList.shift());
                }
            }
        };
        this.start();
    }
    WebRtcPeer.prototype.start = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (_this.pc.signalingState === 'closed') {
                reject('The peer connection object is in "closed" state. This is most likely due to an invocation of the dispose method before accepting in the dialogue');
            }
            if (!!_this.configuration.mediaStream) {
                _this.pc.addStream(_this.configuration.mediaStream);
            }
            if (_this.configuration.mode === 'sendonly' &&
                (platform.name === 'Chrome' && platform.version.toString().substring(0, 2) === '39')) {
                _this.configuration.mode = 'sendrecv';
            }
            resolve();
        });
    };
    WebRtcPeer.prototype.dispose = function () {
        var _this = this;
        console.debug('Disposing WebRtcPeer');
        try {
            if (this.pc) {
                if (this.pc.signalingState === 'closed') {
                    return;
                }
                this.remoteCandidatesQueue = [];
                this.localCandidatesQueue = [];
                this.pc.getLocalStreams().forEach(function (str) {
                    _this.streamStop(str);
                });
                this.pc.close();
            }
        }
        catch (err) {
            console.warn('Exception disposing webrtc peer ' + err);
        }
    };
    WebRtcPeer.prototype.generateOffer = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var offerAudio, offerVideo = true;
            if (!!_this.configuration.mediaConstraints) {
                offerAudio = (typeof _this.configuration.mediaConstraints.audio === 'boolean') ?
                    _this.configuration.mediaConstraints.audio : true;
                offerVideo = (typeof _this.configuration.mediaConstraints.video === 'boolean') ?
                    _this.configuration.mediaConstraints.video : true;
            }
            var constraints = {
                offerToReceiveAudio: +(_this.configuration.mode !== 'sendonly' && offerAudio),
                offerToReceiveVideo: +(_this.configuration.mode !== 'sendonly' && offerVideo)
            };
            console.debug('RTCPeerConnection constraints: ' + JSON.stringify(constraints));
            _this.pc.createOffer(constraints).then(function (offer) {
                console.debug('Created SDP offer');
                return _this.pc.setLocalDescription(offer);
            }).then(function () {
                var localDescription = _this.pc.localDescription;
                if (!!localDescription) {
                    console.debug('Local description set', localDescription.sdp);
                    resolve(localDescription.sdp);
                }
                else {
                    reject('Local description is not defined');
                }
            }).catch(function (error) { return reject(error); });
        });
    };
    WebRtcPeer.prototype.processOffer = function (sdpOffer) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var offer = {
                type: 'offer',
                sdp: sdpOffer
            };
            console.debug('SDP offer received, setting remote description');
            if (_this.pc.signalingState === 'closed') {
                reject('PeerConnection is closed');
            }
            _this.pc.setRemoteDescription(offer)
                .then(function () {
                return _this.pc.createAnswer();
            }).then(function (answer) {
                console.debug('Created SDP answer');
                return _this.pc.setLocalDescription(answer);
            }).then(function () {
                var localDescription = _this.pc.localDescription;
                if (!!localDescription) {
                    console.debug('Local description set', localDescription.sdp);
                    resolve(localDescription.sdp);
                }
                else {
                    reject('Local description is not defined');
                }
            }).catch(function (error) { return reject(error); });
        });
    };
    WebRtcPeer.prototype.processAnswer = function (sdpAnswer) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var answer = {
                type: 'answer',
                sdp: sdpAnswer
            };
            console.debug('SDP answer received, setting remote description');
            if (_this.pc.signalingState === 'closed') {
                reject('RTCPeerConnection is closed');
            }
            _this.pc.setRemoteDescription(answer).then(function () { return resolve(); }).catch(function (error) { return reject(error); });
        });
    };
    WebRtcPeer.prototype.addIceCandidate = function (iceCandidate) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            console.debug('Remote ICE candidate received', iceCandidate);
            _this.remoteCandidatesQueue.push(iceCandidate);
            switch (_this.pc.signalingState) {
                case 'closed':
                    reject(new Error('PeerConnection object is closed'));
                    break;
                case 'stable':
                    if (!!_this.pc.remoteDescription) {
                        _this.pc.addIceCandidate(iceCandidate).then(function () { return resolve(); }).catch(function (error) { return reject(error); });
                    }
                    break;
                default:
                    _this.iceCandidateList.push(iceCandidate);
                    resolve();
            }
        });
    };
    WebRtcPeer.prototype.streamStop = function (stream) {
        stream.getTracks().forEach(function (track) {
            track.stop();
            stream.removeTrack(track);
        });
    };
    return WebRtcPeer;
}());
exports.WebRtcPeer = WebRtcPeer;
var WebRtcPeerRecvonly = (function (_super) {
    __extends(WebRtcPeerRecvonly, _super);
    function WebRtcPeerRecvonly(configuration) {
        var _this = this;
        configuration.mode = 'recvonly';
        _this = _super.call(this, configuration) || this;
        return _this;
    }
    return WebRtcPeerRecvonly;
}(WebRtcPeer));
exports.WebRtcPeerRecvonly = WebRtcPeerRecvonly;
var WebRtcPeerSendonly = (function (_super) {
    __extends(WebRtcPeerSendonly, _super);
    function WebRtcPeerSendonly(configuration) {
        var _this = this;
        configuration.mode = 'sendonly';
        _this = _super.call(this, configuration) || this;
        return _this;
    }
    return WebRtcPeerSendonly;
}(WebRtcPeer));
exports.WebRtcPeerSendonly = WebRtcPeerSendonly;
var WebRtcPeerSendrecv = (function (_super) {
    __extends(WebRtcPeerSendrecv, _super);
    function WebRtcPeerSendrecv(configuration) {
        var _this = this;
        configuration.mode = 'sendrecv';
        _this = _super.call(this, configuration) || this;
        return _this;
    }
    return WebRtcPeerSendrecv;
}(WebRtcPeer));
exports.WebRtcPeerSendrecv = WebRtcPeerSendrecv;

},{"freeice":2,"platform":8,"uuid":9}],49:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var platform = require("platform");
var WebRtcStats = (function () {
    function WebRtcStats(stream) {
        this.stream = stream;
        this.webRtcStatsEnabled = false;
        this.statsInterval = 1;
        this.stats = {
            inbound: {
                audio: {
                    bytesReceived: 0,
                    packetsReceived: 0,
                    packetsLost: 0
                },
                video: {
                    bytesReceived: 0,
                    packetsReceived: 0,
                    packetsLost: 0,
                    framesDecoded: 0,
                    nackCount: 0
                }
            },
            outbound: {
                audio: {
                    bytesSent: 0,
                    packetsSent: 0,
                },
                video: {
                    bytesSent: 0,
                    packetsSent: 0,
                    framesEncoded: 0,
                    nackCount: 0
                }
            }
        };
    }
    WebRtcStats.prototype.isEnabled = function () {
        return this.webRtcStatsEnabled;
    };
    WebRtcStats.prototype.initWebRtcStats = function () {
        var _this = this;
        var elastestInstrumentation = localStorage.getItem('elastest-instrumentation');
        if (elastestInstrumentation) {
            console.warn('WebRtc stats enabled for stream ' + this.stream.streamId + ' of connection ' + this.stream.connection.connectionId);
            this.webRtcStatsEnabled = true;
            var instrumentation_1 = JSON.parse(elastestInstrumentation);
            this.statsInterval = instrumentation_1.webrtc.interval;
            console.warn('localStorage item: ' + JSON.stringify(instrumentation_1));
            this.webRtcStatsIntervalId = setInterval(function () {
                _this.sendStatsToHttpEndpoint(instrumentation_1);
            }, this.statsInterval * 1000);
            return;
        }
        console.debug('WebRtc stats not enabled');
    };
    WebRtcStats.prototype.stopWebRtcStats = function () {
        if (this.webRtcStatsEnabled) {
            clearInterval(this.webRtcStatsIntervalId);
            console.warn('WebRtc stats stopped for disposed stream ' + this.stream.streamId + ' of connection ' + this.stream.connection.connectionId);
        }
    };
    WebRtcStats.prototype.getSelectedIceCandidateInfo = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.getStatsAgnostic(_this.stream.getRTCPeerConnection(), function (stats) {
                if ((platform.name.indexOf('Chrome') !== -1) || (platform.name.indexOf('Opera') !== -1)) {
                    var localCandidateId = void 0, remoteCandidateId = void 0, googCandidatePair = void 0;
                    var localCandidates = {};
                    var remoteCandidates = {};
                    for (var key in stats) {
                        var stat = stats[key];
                        if (stat.type === 'localcandidate') {
                            localCandidates[stat.id] = stat;
                        }
                        else if (stat.type === 'remotecandidate') {
                            remoteCandidates[stat.id] = stat;
                        }
                        else if (stat.type === 'googCandidatePair' && (stat.googActiveConnection === 'true')) {
                            googCandidatePair = stat;
                            localCandidateId = stat.localCandidateId;
                            remoteCandidateId = stat.remoteCandidateId;
                        }
                    }
                    var finalLocalCandidate_1 = localCandidates[localCandidateId];
                    if (!!finalLocalCandidate_1) {
                        var candList = _this.stream.getLocalIceCandidateList();
                        var cand = candList.filter(function (c) {
                            return (!!c.candidate &&
                                c.candidate.indexOf(finalLocalCandidate_1.ipAddress) >= 0 &&
                                c.candidate.indexOf(finalLocalCandidate_1.portNumber) >= 0 &&
                                c.candidate.indexOf(finalLocalCandidate_1.priority) >= 0);
                        });
                        finalLocalCandidate_1.raw = !!cand[0] ? cand[0].candidate : 'ERROR: Cannot find local candidate in list of sent ICE candidates';
                    }
                    else {
                        finalLocalCandidate_1 = 'ERROR: No active local ICE candidate. Probably ICE-TCP is being used';
                    }
                    var finalRemoteCandidate_1 = remoteCandidates[remoteCandidateId];
                    if (!!finalRemoteCandidate_1) {
                        var candList = _this.stream.getRemoteIceCandidateList();
                        var cand = candList.filter(function (c) {
                            return (!!c.candidate &&
                                c.candidate.indexOf(finalRemoteCandidate_1.ipAddress) >= 0 &&
                                c.candidate.indexOf(finalRemoteCandidate_1.portNumber) >= 0 &&
                                c.candidate.indexOf(finalRemoteCandidate_1.priority) >= 0);
                        });
                        finalRemoteCandidate_1.raw = !!cand[0] ? cand[0].candidate : 'ERROR: Cannot find remote candidate in list of received ICE candidates';
                    }
                    else {
                        finalRemoteCandidate_1 = 'ERROR: No active remote ICE candidate. Probably ICE-TCP is being used';
                    }
                    resolve({
                        googCandidatePair: googCandidatePair,
                        localCandidate: finalLocalCandidate_1,
                        remoteCandidate: finalRemoteCandidate_1
                    });
                }
                else {
                    reject('Selected ICE candidate info only available for Chrome');
                }
            }, function (error) {
                reject(error);
            });
        });
    };
    WebRtcStats.prototype.sendStatsToHttpEndpoint = function (instrumentation) {
        var _this = this;
        var sendPost = function (json) {
            var http = new XMLHttpRequest();
            var url = instrumentation.webrtc.httpEndpoint;
            http.open('POST', url, true);
            http.setRequestHeader('Content-type', 'application/json');
            http.onreadystatechange = function () {
                if (http.readyState === 4 && http.status === 200) {
                    console.log('WebRtc stats successfully sent to ' + url + ' for stream ' + _this.stream.streamId + ' of connection ' + _this.stream.connection.connectionId);
                }
            };
            http.send(json);
        };
        var f = function (stats) {
            if (platform.name.indexOf('Firefox') !== -1) {
                stats.forEach(function (stat) {
                    var json = {};
                    if ((stat.type === 'inbound-rtp') &&
                        (stat.nackCount !== null &&
                            stat.isRemote === false &&
                            stat.id.startsWith('inbound') &&
                            stat.remoteId.startsWith('inbound'))) {
                        var metricId = 'webrtc_inbound_' + stat.mediaType + '_' + stat.ssrc;
                        var jit = stat.jitter * 1000;
                        var metrics = {
                            bytesReceived: (stat.bytesReceived - _this.stats.inbound[stat.mediaType].bytesReceived) / _this.statsInterval,
                            jitter: jit,
                            packetsReceived: (stat.packetsReceived - _this.stats.inbound[stat.mediaType].packetsReceived) / _this.statsInterval,
                            packetsLost: (stat.packetsLost - _this.stats.inbound[stat.mediaType].packetsLost) / _this.statsInterval
                        };
                        var units = {
                            bytesReceived: 'bytes',
                            jitter: 'ms',
                            packetsReceived: 'packets',
                            packetsLost: 'packets'
                        };
                        if (stat.mediaType === 'video') {
                            metrics['framesDecoded'] = (stat.framesDecoded - _this.stats.inbound.video.framesDecoded) / _this.statsInterval;
                            metrics['nackCount'] = (stat.nackCount - _this.stats.inbound.video.nackCount) / _this.statsInterval;
                            units['framesDecoded'] = 'frames';
                            units['nackCount'] = 'packets';
                            _this.stats.inbound.video.framesDecoded = stat.framesDecoded;
                            _this.stats.inbound.video.nackCount = stat.nackCount;
                        }
                        _this.stats.inbound[stat.mediaType].bytesReceived = stat.bytesReceived;
                        _this.stats.inbound[stat.mediaType].packetsReceived = stat.packetsReceived;
                        _this.stats.inbound[stat.mediaType].packetsLost = stat.packetsLost;
                        json = {
                            '@timestamp': new Date(stat.timestamp).toISOString(),
                            'exec': instrumentation.exec,
                            'component': instrumentation.component,
                            'stream': 'webRtc',
                            'type': metricId,
                            'stream_type': 'composed_metrics',
                            'units': units
                        };
                        json[metricId] = metrics;
                        sendPost(JSON.stringify(json));
                    }
                    else if ((stat.type === 'outbound-rtp') &&
                        (stat.isRemote === false &&
                            stat.id.toLowerCase().includes('outbound'))) {
                        var metricId = 'webrtc_outbound_' + stat.mediaType + '_' + stat.ssrc;
                        var metrics = {
                            bytesSent: (stat.bytesSent - _this.stats.outbound[stat.mediaType].bytesSent) / _this.statsInterval,
                            packetsSent: (stat.packetsSent - _this.stats.outbound[stat.mediaType].packetsSent) / _this.statsInterval
                        };
                        var units = {
                            bytesSent: 'bytes',
                            packetsSent: 'packets'
                        };
                        if (stat.mediaType === 'video') {
                            metrics['framesEncoded'] = (stat.framesEncoded - _this.stats.outbound.video.framesEncoded) / _this.statsInterval;
                            units['framesEncoded'] = 'frames';
                            _this.stats.outbound.video.framesEncoded = stat.framesEncoded;
                        }
                        _this.stats.outbound[stat.mediaType].bytesSent = stat.bytesSent;
                        _this.stats.outbound[stat.mediaType].packetsSent = stat.packetsSent;
                        json = {
                            '@timestamp': new Date(stat.timestamp).toISOString(),
                            'exec': instrumentation.exec,
                            'component': instrumentation.component,
                            'stream': 'webRtc',
                            'type': metricId,
                            'stream_type': 'composed_metrics',
                            'units': units
                        };
                        json[metricId] = metrics;
                        sendPost(JSON.stringify(json));
                    }
                });
            }
            else if ((platform.name.indexOf('Chrome') !== -1) || (platform.name.indexOf('Opera') !== -1)) {
                for (var _i = 0, _a = Object.keys(stats); _i < _a.length; _i++) {
                    var key = _a[_i];
                    var stat = stats[key];
                    if (stat.type === 'ssrc') {
                        var json = {};
                        if ('bytesReceived' in stat && ((stat.mediaType === 'audio' && 'audioOutputLevel' in stat) ||
                            (stat.mediaType === 'video' && 'qpSum' in stat))) {
                            var metricId = 'webrtc_inbound_' + stat.mediaType + '_' + stat.ssrc;
                            var metrics = {
                                bytesReceived: (stat.bytesReceived - _this.stats.inbound[stat.mediaType].bytesReceived) / _this.statsInterval,
                                jitter: stat.googJitterBufferMs,
                                packetsReceived: (stat.packetsReceived - _this.stats.inbound[stat.mediaType].packetsReceived) / _this.statsInterval,
                                packetsLost: (stat.packetsLost - _this.stats.inbound[stat.mediaType].packetsLost) / _this.statsInterval
                            };
                            var units = {
                                bytesReceived: 'bytes',
                                jitter: 'ms',
                                packetsReceived: 'packets',
                                packetsLost: 'packets'
                            };
                            if (stat.mediaType === 'video') {
                                metrics['framesDecoded'] = (stat.framesDecoded - _this.stats.inbound.video.framesDecoded) / _this.statsInterval;
                                metrics['nackCount'] = (stat.googNacksSent - _this.stats.inbound.video.nackCount) / _this.statsInterval;
                                units['framesDecoded'] = 'frames';
                                units['nackCount'] = 'packets';
                                _this.stats.inbound.video.framesDecoded = stat.framesDecoded;
                                _this.stats.inbound.video.nackCount = stat.googNacksSent;
                            }
                            _this.stats.inbound[stat.mediaType].bytesReceived = stat.bytesReceived;
                            _this.stats.inbound[stat.mediaType].packetsReceived = stat.packetsReceived;
                            _this.stats.inbound[stat.mediaType].packetsLost = stat.packetsLost;
                            json = {
                                '@timestamp': new Date(stat.timestamp).toISOString(),
                                'exec': instrumentation.exec,
                                'component': instrumentation.component,
                                'stream': 'webRtc',
                                'type': metricId,
                                'stream_type': 'composed_metrics',
                                'units': units
                            };
                            json[metricId] = metrics;
                            sendPost(JSON.stringify(json));
                        }
                        else if ('bytesSent' in stat) {
                            var metricId = 'webrtc_outbound_' + stat.mediaType + '_' + stat.ssrc;
                            var metrics = {
                                bytesSent: (stat.bytesSent - _this.stats.outbound[stat.mediaType].bytesSent) / _this.statsInterval,
                                packetsSent: (stat.packetsSent - _this.stats.outbound[stat.mediaType].packetsSent) / _this.statsInterval
                            };
                            var units = {
                                bytesSent: 'bytes',
                                packetsSent: 'packets'
                            };
                            if (stat.mediaType === 'video') {
                                metrics['framesEncoded'] = (stat.framesEncoded - _this.stats.outbound.video.framesEncoded) / _this.statsInterval;
                                units['framesEncoded'] = 'frames';
                                _this.stats.outbound.video.framesEncoded = stat.framesEncoded;
                            }
                            _this.stats.outbound[stat.mediaType].bytesSent = stat.bytesSent;
                            _this.stats.outbound[stat.mediaType].packetsSent = stat.packetsSent;
                            json = {
                                '@timestamp': new Date(stat.timestamp).toISOString(),
                                'exec': instrumentation.exec,
                                'component': instrumentation.component,
                                'stream': 'webRtc',
                                'type': metricId,
                                'stream_type': 'composed_metrics',
                                'units': units
                            };
                            json[metricId] = metrics;
                            sendPost(JSON.stringify(json));
                        }
                    }
                }
            }
        };
        this.getStatsAgnostic(this.stream.getRTCPeerConnection(), f, function (error) { console.log(error); });
    };
    WebRtcStats.prototype.standardizeReport = function (response) {
        console.log(response);
        var standardReport = {};
        if (platform.name.indexOf('Firefox') !== -1) {
            Object.keys(response).forEach(function (key) {
                console.log(response[key]);
            });
            return response;
        }
        response.result().forEach(function (report) {
            var standardStats = {
                id: report.id,
                timestamp: report.timestamp,
                type: report.type
            };
            report.names().forEach(function (name) {
                standardStats[name] = report.stat(name);
            });
            standardReport[standardStats.id] = standardStats;
        });
        return standardReport;
    };
    WebRtcStats.prototype.getStatsAgnostic = function (pc, successCb, failureCb) {
        var _this = this;
        if (platform.name.indexOf('Firefox') !== -1) {
            return pc.getStats(null).then(function (response) {
                var report = _this.standardizeReport(response);
                successCb(report);
            }).catch(failureCb);
        }
        else if ((platform.name.indexOf('Chrome') !== -1) || (platform.name.indexOf('Opera') !== -1)) {
            return pc.getStats(function (response) {
                var report = _this.standardizeReport(response);
                successCb(report);
            }, null, failureCb);
        }
    };
    return WebRtcStats;
}());
exports.WebRtcStats = WebRtcStats;

},{"platform":8}]},{},[16])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi9ub2RlX21vZHVsZXMvZXZlbnRzL2V2ZW50cy5qcyIsIi4uL25vZGVfbW9kdWxlcy9mcmVlaWNlL2luZGV4LmpzIiwiLi4vbm9kZV9tb2R1bGVzL2ZyZWVpY2Uvc3R1bi5qc29uIiwiLi4vbm9kZV9tb2R1bGVzL2ZyZWVpY2UvdHVybi5qc29uIiwiLi4vbm9kZV9tb2R1bGVzL2hhcmsvaGFyay5qcyIsIi4uL25vZGVfbW9kdWxlcy9pbmhlcml0cy9pbmhlcml0c19icm93c2VyLmpzIiwiLi4vbm9kZV9tb2R1bGVzL25vcm1hbGljZS9pbmRleC5qcyIsIi4uL25vZGVfbW9kdWxlcy9wbGF0Zm9ybS9wbGF0Zm9ybS5qcyIsIi4uL25vZGVfbW9kdWxlcy91dWlkL2luZGV4LmpzIiwiLi4vbm9kZV9tb2R1bGVzL3V1aWQvbGliL2J5dGVzVG9VdWlkLmpzIiwiLi4vbm9kZV9tb2R1bGVzL3V1aWQvbGliL3JuZy1icm93c2VyLmpzIiwiLi4vbm9kZV9tb2R1bGVzL3V1aWQvdjEuanMiLCIuLi9ub2RlX21vZHVsZXMvdXVpZC92NC5qcyIsIi4uL25vZGVfbW9kdWxlcy93aWxkZW1pdHRlci93aWxkZW1pdHRlci5qcyIsIi4uL25vZGVfbW9kdWxlcy93b2xmeTg3LWV2ZW50ZW1pdHRlci9FdmVudEVtaXR0ZXIuanMiLCJNYWluLnRzIiwiT3BlblZpZHUvQ29ubmVjdGlvbi50cyIsIk9wZW5WaWR1L0xvY2FsUmVjb3JkZXIudHMiLCJPcGVuVmlkdS9PcGVuVmlkdS50cyIsIk9wZW5WaWR1L1B1Ymxpc2hlci50cyIsIk9wZW5WaWR1L1Nlc3Npb24udHMiLCJPcGVuVmlkdS9TdHJlYW0udHMiLCJPcGVuVmlkdS9TdHJlYW1NYW5hZ2VyLnRzIiwiT3BlblZpZHUvU3Vic2NyaWJlci50cyIsIk9wZW5WaWR1SW50ZXJuYWwvRW51bXMvTG9jYWxSZWNvcmRlclN0YXRlLnRzIiwiT3BlblZpZHVJbnRlcm5hbC9FbnVtcy9PcGVuVmlkdUVycm9yLnRzIiwiT3BlblZpZHVJbnRlcm5hbC9FbnVtcy9WaWRlb0luc2VydE1vZGUudHMiLCJPcGVuVmlkdUludGVybmFsL0V2ZW50cy9Db25uZWN0aW9uRXZlbnQudHMiLCJPcGVuVmlkdUludGVybmFsL0V2ZW50cy9FdmVudC50cyIsIk9wZW5WaWR1SW50ZXJuYWwvRXZlbnRzL1B1Ymxpc2hlclNwZWFraW5nRXZlbnQudHMiLCJPcGVuVmlkdUludGVybmFsL0V2ZW50cy9SZWNvcmRpbmdFdmVudC50cyIsIk9wZW5WaWR1SW50ZXJuYWwvRXZlbnRzL1Nlc3Npb25EaXNjb25uZWN0ZWRFdmVudC50cyIsIk9wZW5WaWR1SW50ZXJuYWwvRXZlbnRzL1NpZ25hbEV2ZW50LnRzIiwiT3BlblZpZHVJbnRlcm5hbC9FdmVudHMvU3RyZWFtRXZlbnQudHMiLCJPcGVuVmlkdUludGVybmFsL0V2ZW50cy9TdHJlYW1NYW5hZ2VyRXZlbnQudHMiLCJPcGVuVmlkdUludGVybmFsL0V2ZW50cy9WaWRlb0VsZW1lbnRFdmVudC50cyIsIk9wZW5WaWR1SW50ZXJuYWwvS3VyZW50b1V0aWxzL2t1cmVudG8tanNvbnJwYy9NYXBwZXIuanMiLCJPcGVuVmlkdUludGVybmFsL0t1cmVudG9VdGlscy9rdXJlbnRvLWpzb25ycGMvY2xpZW50cy9pbmRleC5qcyIsIk9wZW5WaWR1SW50ZXJuYWwvS3VyZW50b1V0aWxzL2t1cmVudG8tanNvbnJwYy9jbGllbnRzL2pzb25ycGNjbGllbnQuanMiLCJPcGVuVmlkdUludGVybmFsL0t1cmVudG9VdGlscy9rdXJlbnRvLWpzb25ycGMvY2xpZW50cy90cmFuc3BvcnRzL2luZGV4LmpzIiwiT3BlblZpZHVJbnRlcm5hbC9LdXJlbnRvVXRpbHMva3VyZW50by1qc29ucnBjL2NsaWVudHMvdHJhbnNwb3J0cy93ZWJTb2NrZXRXaXRoUmVjb25uZWN0aW9uLmpzIiwiT3BlblZpZHVJbnRlcm5hbC9LdXJlbnRvVXRpbHMva3VyZW50by1qc29ucnBjL2luZGV4LmpzIiwiT3BlblZpZHVJbnRlcm5hbC9LdXJlbnRvVXRpbHMva3VyZW50by1qc29ucnBjL3BhY2tlcnMvSnNvblJQQy5qcyIsIk9wZW5WaWR1SW50ZXJuYWwvS3VyZW50b1V0aWxzL2t1cmVudG8tanNvbnJwYy9wYWNrZXJzL1htbFJQQy5qcyIsIk9wZW5WaWR1SW50ZXJuYWwvS3VyZW50b1V0aWxzL2t1cmVudG8tanNvbnJwYy9wYWNrZXJzL2luZGV4LmpzIiwiT3BlblZpZHVJbnRlcm5hbC9TY3JlZW5TaGFyaW5nL1NjcmVlbi1DYXB0dXJpbmctQXV0by5qcyIsIk9wZW5WaWR1SW50ZXJuYWwvU2NyZWVuU2hhcmluZy9TY3JlZW4tQ2FwdHVyaW5nLmpzIiwiT3BlblZpZHVJbnRlcm5hbC9XZWJSdGNQZWVyL1dlYlJ0Y1BlZXIudHMiLCJPcGVuVmlkdUludGVybmFsL1dlYlJ0Y1N0YXRzL1dlYlJ0Y1N0YXRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzZ0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hCQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDNURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2pzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3RlQSxnREFBK0M7QUFFL0MsSUFBSSxNQUFNLEVBQUU7SUFFUixNQUFNLENBQUMsVUFBVSxDQUFDLEdBQUcsbUJBQVEsQ0FBQztDQUNqQzs7Ozs7QUNhRCxtQ0FBa0M7QUFV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LEdBQUcsS0FBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUNoRCxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDdEIsQ0FBQyxFQUFFLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztTQUN2QjtJQUNMLENBQUM7SUFFTCxrQkFBQztBQUFELENBcllBLEFBcVlDLElBQUE7QUFyWVksa0NBQVciLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxudmFyIG9iamVjdENyZWF0ZSA9IE9iamVjdC5jcmVhdGUgfHwgb2JqZWN0Q3JlYXRlUG9seWZpbGxcbnZhciBvYmplY3RLZXlzID0gT2JqZWN0LmtleXMgfHwgb2JqZWN0S2V5c1BvbHlmaWxsXG52YXIgYmluZCA9IEZ1bmN0aW9uLnByb3RvdHlwZS5iaW5kIHx8IGZ1bmN0aW9uQmluZFBvbHlmaWxsXG5cbmZ1bmN0aW9uIEV2ZW50RW1pdHRlcigpIHtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCh0aGlzLCAnX2V2ZW50cycpKSB7XG4gICAgdGhpcy5fZXZlbnRzID0gb2JqZWN0Q3JlYXRlKG51bGwpO1xuICAgIHRoaXMuX2V2ZW50c0NvdW50ID0gMDtcbiAgfVxuXG4gIHRoaXMuX21heExpc3RlbmVycyA9IHRoaXMuX21heExpc3RlbmVycyB8fCB1bmRlZmluZWQ7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC4xMC54XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnMgPSB1bmRlZmluZWQ7XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW4gMTAgbGlzdGVuZXJzIGFyZVxuLy8gYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaCBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbnZhciBkZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbnZhciBoYXNEZWZpbmVQcm9wZXJ0eTtcbnRyeSB7XG4gIHZhciBvID0ge307XG4gIGlmIChPYmplY3QuZGVmaW5lUHJvcGVydHkpIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvLCAneCcsIHsgdmFsdWU6IDAgfSk7XG4gIGhhc0RlZmluZVByb3BlcnR5ID0gby54ID09PSAwO1xufSBjYXRjaCAoZXJyKSB7IGhhc0RlZmluZVByb3BlcnR5ID0gZmFsc2UgfVxuaWYgKGhhc0RlZmluZVByb3BlcnR5KSB7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShFdmVudEVtaXR0ZXIsICdkZWZhdWx0TWF4TGlzdGVuZXJzJywge1xuICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBkZWZhdWx0TWF4TGlzdGVuZXJzO1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbihhcmcpIHtcbiAgICAgIC8vIGNoZWNrIHdoZXRoZXIgdGhlIGlucHV0IGlzIGEgcG9zaXRpdmUgbnVtYmVyICh3aG9zZSB2YWx1ZSBpcyB6ZXJvIG9yXG4gICAgICAvLyBncmVhdGVyIGFuZCBub3QgYSBOYU4pLlxuICAgICAgaWYgKHR5cGVvZiBhcmcgIT09ICdudW1iZXInIHx8IGFyZyA8IDAgfHwgYXJnICE9PSBhcmcpXG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wiZGVmYXVsdE1heExpc3RlbmVyc1wiIG11c3QgYmUgYSBwb3NpdGl2ZSBudW1iZXInKTtcbiAgICAgIGRlZmF1bHRNYXhMaXN0ZW5lcnMgPSBhcmc7XG4gICAgfVxuICB9KTtcbn0gZWxzZSB7XG4gIEV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzID0gZGVmYXVsdE1heExpc3RlbmVycztcbn1cblxuLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4vLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24gc2V0TWF4TGlzdGVuZXJzKG4pIHtcbiAgaWYgKHR5cGVvZiBuICE9PSAnbnVtYmVyJyB8fCBuIDwgMCB8fCBpc05hTihuKSlcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcIm5cIiBhcmd1bWVudCBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7XG4gIHRoaXMuX21heExpc3RlbmVycyA9IG47XG4gIHJldHVybiB0aGlzO1xufTtcblxuZnVuY3Rpb24gJGdldE1heExpc3RlbmVycyh0aGF0KSB7XG4gIGlmICh0aGF0Ll9tYXhMaXN0ZW5lcnMgPT09IHVuZGVmaW5lZClcbiAgICByZXR1cm4gRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gIHJldHVybiB0aGF0Ll9tYXhMaXN0ZW5lcnM7XG59XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZ2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24gZ2V0TWF4TGlzdGVuZXJzKCkge1xuICByZXR1cm4gJGdldE1heExpc3RlbmVycyh0aGlzKTtcbn07XG5cbi8vIFRoZXNlIHN0YW5kYWxvbmUgZW1pdCogZnVuY3Rpb25zIGFyZSB1c2VkIHRvIG9wdGltaXplIGNhbGxpbmcgb2YgZXZlbnRcbi8vIGhhbmRsZXJzIGZvciBmYXN0IGNhc2VzIGJlY2F1c2UgZW1pdCgpIGl0c2VsZiBvZnRlbiBoYXMgYSB2YXJpYWJsZSBudW1iZXIgb2Zcbi8vIGFyZ3VtZW50cyBhbmQgY2FuIGJlIGRlb3B0aW1pemVkIGJlY2F1c2Ugb2YgdGhhdC4gVGhlc2UgZnVuY3Rpb25zIGFsd2F5cyBoYXZlXG4vLyB0aGUgc2FtZSBudW1iZXIgb2YgYXJndW1lbnRzIGFuZCB0aHVzIGRvIG5vdCBnZXQgZGVvcHRpbWl6ZWQsIHNvIHRoZSBjb2RlXG4vLyBpbnNpZGUgdGhlbSBjYW4gZXhlY3V0ZSBmYXN0ZXIuXG5mdW5jdGlvbiBlbWl0Tm9uZShoYW5kbGVyLCBpc0ZuLCBzZWxmKSB7XG4gIGlmIChpc0ZuKVxuICAgIGhhbmRsZXIuY2FsbChzZWxmKTtcbiAgZWxzZSB7XG4gICAgdmFyIGxlbiA9IGhhbmRsZXIubGVuZ3RoO1xuICAgIHZhciBsaXN0ZW5lcnMgPSBhcnJheUNsb25lKGhhbmRsZXIsIGxlbik7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47ICsraSlcbiAgICAgIGxpc3RlbmVyc1tpXS5jYWxsKHNlbGYpO1xuICB9XG59XG5mdW5jdGlvbiBlbWl0T25lKGhhbmRsZXIsIGlzRm4sIHNlbGYsIGFyZzEpIHtcbiAgaWYgKGlzRm4pXG4gICAgaGFuZGxlci5jYWxsKHNlbGYsIGFyZzEpO1xuICBlbHNlIHtcbiAgICB2YXIgbGVuID0gaGFuZGxlci5sZW5ndGg7XG4gICAgdmFyIGxpc3RlbmVycyA9IGFycmF5Q2xvbmUoaGFuZGxlciwgbGVuKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgKytpKVxuICAgICAgbGlzdGVuZXJzW2ldLmNhbGwoc2VsZiwgYXJnMSk7XG4gIH1cbn1cbmZ1bmN0aW9uIGVtaXRUd28oaGFuZGxlciwgaXNGbiwgc2VsZiwgYXJnMSwgYXJnMikge1xuICBpZiAoaXNGbilcbiAgICBoYW5kbGVyLmNhbGwoc2VsZiwgYXJnMSwgYXJnMik7XG4gIGVsc2Uge1xuICAgIHZhciBsZW4gPSBoYW5kbGVyLmxlbmd0aDtcbiAgICB2YXIgbGlzdGVuZXJzID0gYXJyYXlDbG9uZShoYW5kbGVyLCBsZW4pO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyArK2kpXG4gICAgICBsaXN0ZW5lcnNbaV0uY2FsbChzZWxmLCBhcmcxLCBhcmcyKTtcbiAgfVxufVxuZnVuY3Rpb24gZW1pdFRocmVlKGhhbmRsZXIsIGlzRm4sIHNlbGYsIGFyZzEsIGFyZzIsIGFyZzMpIHtcbiAgaWYgKGlzRm4pXG4gICAgaGFuZGxlci5jYWxsKHNlbGYsIGFyZzEsIGFyZzIsIGFyZzMpO1xuICBlbHNlIHtcbiAgICB2YXIgbGVuID0gaGFuZGxlci5sZW5ndGg7XG4gICAgdmFyIGxpc3RlbmVycyA9IGFycmF5Q2xvbmUoaGFuZGxlciwgbGVuKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgKytpKVxuICAgICAgbGlzdGVuZXJzW2ldLmNhbGwoc2VsZiwgYXJnMSwgYXJnMiwgYXJnMyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZW1pdE1hbnkoaGFuZGxlciwgaXNGbiwgc2VsZiwgYXJncykge1xuICBpZiAoaXNGbilcbiAgICBoYW5kbGVyLmFwcGx5KHNlbGYsIGFyZ3MpO1xuICBlbHNlIHtcbiAgICB2YXIgbGVuID0gaGFuZGxlci5sZW5ndGg7XG4gICAgdmFyIGxpc3RlbmVycyA9IGFycmF5Q2xvbmUoaGFuZGxlciwgbGVuKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgKytpKVxuICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHNlbGYsIGFyZ3MpO1xuICB9XG59XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uIGVtaXQodHlwZSkge1xuICB2YXIgZXIsIGhhbmRsZXIsIGxlbiwgYXJncywgaSwgZXZlbnRzO1xuICB2YXIgZG9FcnJvciA9ICh0eXBlID09PSAnZXJyb3InKTtcblxuICBldmVudHMgPSB0aGlzLl9ldmVudHM7XG4gIGlmIChldmVudHMpXG4gICAgZG9FcnJvciA9IChkb0Vycm9yICYmIGV2ZW50cy5lcnJvciA9PSBudWxsKTtcbiAgZWxzZSBpZiAoIWRvRXJyb3IpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgaWYgKGRvRXJyb3IpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpXG4gICAgICBlciA9IGFyZ3VtZW50c1sxXTtcbiAgICBpZiAoZXIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEF0IGxlYXN0IGdpdmUgc29tZSBraW5kIG9mIGNvbnRleHQgdG8gdGhlIHVzZXJcbiAgICAgIHZhciBlcnIgPSBuZXcgRXJyb3IoJ1VuaGFuZGxlZCBcImVycm9yXCIgZXZlbnQuICgnICsgZXIgKyAnKScpO1xuICAgICAgZXJyLmNvbnRleHQgPSBlcjtcbiAgICAgIHRocm93IGVycjtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgaGFuZGxlciA9IGV2ZW50c1t0eXBlXTtcblxuICBpZiAoIWhhbmRsZXIpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIHZhciBpc0ZuID0gdHlwZW9mIGhhbmRsZXIgPT09ICdmdW5jdGlvbic7XG4gIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gIHN3aXRjaCAobGVuKSB7XG4gICAgICAvLyBmYXN0IGNhc2VzXG4gICAgY2FzZSAxOlxuICAgICAgZW1pdE5vbmUoaGFuZGxlciwgaXNGbiwgdGhpcyk7XG4gICAgICBicmVhaztcbiAgICBjYXNlIDI6XG4gICAgICBlbWl0T25lKGhhbmRsZXIsIGlzRm4sIHRoaXMsIGFyZ3VtZW50c1sxXSk7XG4gICAgICBicmVhaztcbiAgICBjYXNlIDM6XG4gICAgICBlbWl0VHdvKGhhbmRsZXIsIGlzRm4sIHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgNDpcbiAgICAgIGVtaXRUaHJlZShoYW5kbGVyLCBpc0ZuLCB0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSwgYXJndW1lbnRzWzNdKTtcbiAgICAgIGJyZWFrO1xuICAgICAgLy8gc2xvd2VyXG4gICAgZGVmYXVsdDpcbiAgICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgZW1pdE1hbnkoaGFuZGxlciwgaXNGbiwgdGhpcywgYXJncyk7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbmZ1bmN0aW9uIF9hZGRMaXN0ZW5lcih0YXJnZXQsIHR5cGUsIGxpc3RlbmVyLCBwcmVwZW5kKSB7XG4gIHZhciBtO1xuICB2YXIgZXZlbnRzO1xuICB2YXIgZXhpc3Rpbmc7XG5cbiAgaWYgKHR5cGVvZiBsaXN0ZW5lciAhPT0gJ2Z1bmN0aW9uJylcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcImxpc3RlbmVyXCIgYXJndW1lbnQgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgZXZlbnRzID0gdGFyZ2V0Ll9ldmVudHM7XG4gIGlmICghZXZlbnRzKSB7XG4gICAgZXZlbnRzID0gdGFyZ2V0Ll9ldmVudHMgPSBvYmplY3RDcmVhdGUobnVsbCk7XG4gICAgdGFyZ2V0Ll9ldmVudHNDb3VudCA9IDA7XG4gIH0gZWxzZSB7XG4gICAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PT0gXCJuZXdMaXN0ZW5lclwiISBCZWZvcmVcbiAgICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyXCIuXG4gICAgaWYgKGV2ZW50cy5uZXdMaXN0ZW5lcikge1xuICAgICAgdGFyZ2V0LmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSxcbiAgICAgICAgICBsaXN0ZW5lci5saXN0ZW5lciA/IGxpc3RlbmVyLmxpc3RlbmVyIDogbGlzdGVuZXIpO1xuXG4gICAgICAvLyBSZS1hc3NpZ24gYGV2ZW50c2AgYmVjYXVzZSBhIG5ld0xpc3RlbmVyIGhhbmRsZXIgY291bGQgaGF2ZSBjYXVzZWQgdGhlXG4gICAgICAvLyB0aGlzLl9ldmVudHMgdG8gYmUgYXNzaWduZWQgdG8gYSBuZXcgb2JqZWN0XG4gICAgICBldmVudHMgPSB0YXJnZXQuX2V2ZW50cztcbiAgICB9XG4gICAgZXhpc3RpbmcgPSBldmVudHNbdHlwZV07XG4gIH1cblxuICBpZiAoIWV4aXN0aW5nKSB7XG4gICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXG4gICAgZXhpc3RpbmcgPSBldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgICArK3RhcmdldC5fZXZlbnRzQ291bnQ7XG4gIH0gZWxzZSB7XG4gICAgaWYgKHR5cGVvZiBleGlzdGluZyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgICBleGlzdGluZyA9IGV2ZW50c1t0eXBlXSA9XG4gICAgICAgICAgcHJlcGVuZCA/IFtsaXN0ZW5lciwgZXhpc3RpbmddIDogW2V4aXN0aW5nLCBsaXN0ZW5lcl07XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFwcGVuZC5cbiAgICAgIGlmIChwcmVwZW5kKSB7XG4gICAgICAgIGV4aXN0aW5nLnVuc2hpZnQobGlzdGVuZXIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZXhpc3RpbmcucHVzaChsaXN0ZW5lcik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgICBpZiAoIWV4aXN0aW5nLndhcm5lZCkge1xuICAgICAgbSA9ICRnZXRNYXhMaXN0ZW5lcnModGFyZ2V0KTtcbiAgICAgIGlmIChtICYmIG0gPiAwICYmIGV4aXN0aW5nLmxlbmd0aCA+IG0pIHtcbiAgICAgICAgZXhpc3Rpbmcud2FybmVkID0gdHJ1ZTtcbiAgICAgICAgdmFyIHcgPSBuZXcgRXJyb3IoJ1Bvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgbGVhayBkZXRlY3RlZC4gJyArXG4gICAgICAgICAgICBleGlzdGluZy5sZW5ndGggKyAnIFwiJyArIFN0cmluZyh0eXBlKSArICdcIiBsaXN0ZW5lcnMgJyArXG4gICAgICAgICAgICAnYWRkZWQuIFVzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvICcgK1xuICAgICAgICAgICAgJ2luY3JlYXNlIGxpbWl0LicpO1xuICAgICAgICB3Lm5hbWUgPSAnTWF4TGlzdGVuZXJzRXhjZWVkZWRXYXJuaW5nJztcbiAgICAgICAgdy5lbWl0dGVyID0gdGFyZ2V0O1xuICAgICAgICB3LnR5cGUgPSB0eXBlO1xuICAgICAgICB3LmNvdW50ID0gZXhpc3RpbmcubGVuZ3RoO1xuICAgICAgICBpZiAodHlwZW9mIGNvbnNvbGUgPT09ICdvYmplY3QnICYmIGNvbnNvbGUud2Fybikge1xuICAgICAgICAgIGNvbnNvbGUud2FybignJXM6ICVzJywgdy5uYW1lLCB3Lm1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRhcmdldDtcbn1cblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uIGFkZExpc3RlbmVyKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHJldHVybiBfYWRkTGlzdGVuZXIodGhpcywgdHlwZSwgbGlzdGVuZXIsIGZhbHNlKTtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnByZXBlbmRMaXN0ZW5lciA9XG4gICAgZnVuY3Rpb24gcHJlcGVuZExpc3RlbmVyKHR5cGUsIGxpc3RlbmVyKSB7XG4gICAgICByZXR1cm4gX2FkZExpc3RlbmVyKHRoaXMsIHR5cGUsIGxpc3RlbmVyLCB0cnVlKTtcbiAgICB9O1xuXG5mdW5jdGlvbiBvbmNlV3JhcHBlcigpIHtcbiAgaWYgKCF0aGlzLmZpcmVkKSB7XG4gICAgdGhpcy50YXJnZXQucmVtb3ZlTGlzdGVuZXIodGhpcy50eXBlLCB0aGlzLndyYXBGbik7XG4gICAgdGhpcy5maXJlZCA9IHRydWU7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICBjYXNlIDA6XG4gICAgICAgIHJldHVybiB0aGlzLmxpc3RlbmVyLmNhbGwodGhpcy50YXJnZXQpO1xuICAgICAgY2FzZSAxOlxuICAgICAgICByZXR1cm4gdGhpcy5saXN0ZW5lci5jYWxsKHRoaXMudGFyZ2V0LCBhcmd1bWVudHNbMF0pO1xuICAgICAgY2FzZSAyOlxuICAgICAgICByZXR1cm4gdGhpcy5saXN0ZW5lci5jYWxsKHRoaXMudGFyZ2V0LCBhcmd1bWVudHNbMF0sIGFyZ3VtZW50c1sxXSk7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIHJldHVybiB0aGlzLmxpc3RlbmVyLmNhbGwodGhpcy50YXJnZXQsIGFyZ3VtZW50c1swXSwgYXJndW1lbnRzWzFdLFxuICAgICAgICAgICAgYXJndW1lbnRzWzJdKTtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGgpO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3MubGVuZ3RoOyArK2kpXG4gICAgICAgICAgYXJnc1tpXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgdGhpcy5saXN0ZW5lci5hcHBseSh0aGlzLnRhcmdldCwgYXJncyk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIF9vbmNlV3JhcCh0YXJnZXQsIHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBzdGF0ZSA9IHsgZmlyZWQ6IGZhbHNlLCB3cmFwRm46IHVuZGVmaW5lZCwgdGFyZ2V0OiB0YXJnZXQsIHR5cGU6IHR5cGUsIGxpc3RlbmVyOiBsaXN0ZW5lciB9O1xuICB2YXIgd3JhcHBlZCA9IGJpbmQuY2FsbChvbmNlV3JhcHBlciwgc3RhdGUpO1xuICB3cmFwcGVkLmxpc3RlbmVyID0gbGlzdGVuZXI7XG4gIHN0YXRlLndyYXBGbiA9IHdyYXBwZWQ7XG4gIHJldHVybiB3cmFwcGVkO1xufVxuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbiBvbmNlKHR5cGUsIGxpc3RlbmVyKSB7XG4gIGlmICh0eXBlb2YgbGlzdGVuZXIgIT09ICdmdW5jdGlvbicpXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJsaXN0ZW5lclwiIGFyZ3VtZW50IG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICB0aGlzLm9uKHR5cGUsIF9vbmNlV3JhcCh0aGlzLCB0eXBlLCBsaXN0ZW5lcikpO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucHJlcGVuZE9uY2VMaXN0ZW5lciA9XG4gICAgZnVuY3Rpb24gcHJlcGVuZE9uY2VMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcikge1xuICAgICAgaWYgKHR5cGVvZiBsaXN0ZW5lciAhPT0gJ2Z1bmN0aW9uJylcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJsaXN0ZW5lclwiIGFyZ3VtZW50IG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICAgICAgdGhpcy5wcmVwZW5kTGlzdGVuZXIodHlwZSwgX29uY2VXcmFwKHRoaXMsIHR5cGUsIGxpc3RlbmVyKSk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG4vLyBFbWl0cyBhICdyZW1vdmVMaXN0ZW5lcicgZXZlbnQgaWYgYW5kIG9ubHkgaWYgdGhlIGxpc3RlbmVyIHdhcyByZW1vdmVkLlxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9XG4gICAgZnVuY3Rpb24gcmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXIpIHtcbiAgICAgIHZhciBsaXN0LCBldmVudHMsIHBvc2l0aW9uLCBpLCBvcmlnaW5hbExpc3RlbmVyO1xuXG4gICAgICBpZiAodHlwZW9mIGxpc3RlbmVyICE9PSAnZnVuY3Rpb24nKVxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcImxpc3RlbmVyXCIgYXJndW1lbnQgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgICAgIGV2ZW50cyA9IHRoaXMuX2V2ZW50cztcbiAgICAgIGlmICghZXZlbnRzKVxuICAgICAgICByZXR1cm4gdGhpcztcblxuICAgICAgbGlzdCA9IGV2ZW50c1t0eXBlXTtcbiAgICAgIGlmICghbGlzdClcbiAgICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICAgIGlmIChsaXN0ID09PSBsaXN0ZW5lciB8fCBsaXN0Lmxpc3RlbmVyID09PSBsaXN0ZW5lcikge1xuICAgICAgICBpZiAoLS10aGlzLl9ldmVudHNDb3VudCA9PT0gMClcbiAgICAgICAgICB0aGlzLl9ldmVudHMgPSBvYmplY3RDcmVhdGUobnVsbCk7XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGRlbGV0ZSBldmVudHNbdHlwZV07XG4gICAgICAgICAgaWYgKGV2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgICAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0Lmxpc3RlbmVyIHx8IGxpc3RlbmVyKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgbGlzdCAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBwb3NpdGlvbiA9IC0xO1xuXG4gICAgICAgIGZvciAoaSA9IGxpc3QubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgICBpZiAobGlzdFtpXSA9PT0gbGlzdGVuZXIgfHwgbGlzdFtpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpIHtcbiAgICAgICAgICAgIG9yaWdpbmFsTGlzdGVuZXIgPSBsaXN0W2ldLmxpc3RlbmVyO1xuICAgICAgICAgICAgcG9zaXRpb24gPSBpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHBvc2l0aW9uIDwgMClcbiAgICAgICAgICByZXR1cm4gdGhpcztcblxuICAgICAgICBpZiAocG9zaXRpb24gPT09IDApXG4gICAgICAgICAgbGlzdC5zaGlmdCgpO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgc3BsaWNlT25lKGxpc3QsIHBvc2l0aW9uKTtcblxuICAgICAgICBpZiAobGlzdC5sZW5ndGggPT09IDEpXG4gICAgICAgICAgZXZlbnRzW3R5cGVdID0gbGlzdFswXTtcblxuICAgICAgICBpZiAoZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBvcmlnaW5hbExpc3RlbmVyIHx8IGxpc3RlbmVyKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPVxuICAgIGZ1bmN0aW9uIHJlbW92ZUFsbExpc3RlbmVycyh0eXBlKSB7XG4gICAgICB2YXIgbGlzdGVuZXJzLCBldmVudHMsIGk7XG5cbiAgICAgIGV2ZW50cyA9IHRoaXMuX2V2ZW50cztcbiAgICAgIGlmICghZXZlbnRzKVxuICAgICAgICByZXR1cm4gdGhpcztcblxuICAgICAgLy8gbm90IGxpc3RlbmluZyBmb3IgcmVtb3ZlTGlzdGVuZXIsIG5vIG5lZWQgdG8gZW1pdFxuICAgICAgaWYgKCFldmVudHMucmVtb3ZlTGlzdGVuZXIpIHtcbiAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICB0aGlzLl9ldmVudHMgPSBvYmplY3RDcmVhdGUobnVsbCk7XG4gICAgICAgICAgdGhpcy5fZXZlbnRzQ291bnQgPSAwO1xuICAgICAgICB9IGVsc2UgaWYgKGV2ZW50c1t0eXBlXSkge1xuICAgICAgICAgIGlmICgtLXRoaXMuX2V2ZW50c0NvdW50ID09PSAwKVxuICAgICAgICAgICAgdGhpcy5fZXZlbnRzID0gb2JqZWN0Q3JlYXRlKG51bGwpO1xuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIGRlbGV0ZSBldmVudHNbdHlwZV07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9XG5cbiAgICAgIC8vIGVtaXQgcmVtb3ZlTGlzdGVuZXIgZm9yIGFsbCBsaXN0ZW5lcnMgb24gYWxsIGV2ZW50c1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgdmFyIGtleXMgPSBvYmplY3RLZXlzKGV2ZW50cyk7XG4gICAgICAgIHZhciBrZXk7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAga2V5ID0ga2V5c1tpXTtcbiAgICAgICAgICBpZiAoa2V5ID09PSAncmVtb3ZlTGlzdGVuZXInKSBjb250aW51ZTtcbiAgICAgICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhrZXkpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCdyZW1vdmVMaXN0ZW5lcicpO1xuICAgICAgICB0aGlzLl9ldmVudHMgPSBvYmplY3RDcmVhdGUobnVsbCk7XG4gICAgICAgIHRoaXMuX2V2ZW50c0NvdW50ID0gMDtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9XG5cbiAgICAgIGxpc3RlbmVycyA9IGV2ZW50c1t0eXBlXTtcblxuICAgICAgaWYgKHR5cGVvZiBsaXN0ZW5lcnMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnMpO1xuICAgICAgfSBlbHNlIGlmIChsaXN0ZW5lcnMpIHtcbiAgICAgICAgLy8gTElGTyBvcmRlclxuICAgICAgICBmb3IgKGkgPSBsaXN0ZW5lcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyc1tpXSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuZnVuY3Rpb24gX2xpc3RlbmVycyh0YXJnZXQsIHR5cGUsIHVud3JhcCkge1xuICB2YXIgZXZlbnRzID0gdGFyZ2V0Ll9ldmVudHM7XG5cbiAgaWYgKCFldmVudHMpXG4gICAgcmV0dXJuIFtdO1xuXG4gIHZhciBldmxpc3RlbmVyID0gZXZlbnRzW3R5cGVdO1xuICBpZiAoIWV2bGlzdGVuZXIpXG4gICAgcmV0dXJuIFtdO1xuXG4gIGlmICh0eXBlb2YgZXZsaXN0ZW5lciA9PT0gJ2Z1bmN0aW9uJylcbiAgICByZXR1cm4gdW53cmFwID8gW2V2bGlzdGVuZXIubGlzdGVuZXIgfHwgZXZsaXN0ZW5lcl0gOiBbZXZsaXN0ZW5lcl07XG5cbiAgcmV0dXJuIHVud3JhcCA/IHVud3JhcExpc3RlbmVycyhldmxpc3RlbmVyKSA6IGFycmF5Q2xvbmUoZXZsaXN0ZW5lciwgZXZsaXN0ZW5lci5sZW5ndGgpO1xufVxuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uIGxpc3RlbmVycyh0eXBlKSB7XG4gIHJldHVybiBfbGlzdGVuZXJzKHRoaXMsIHR5cGUsIHRydWUpO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yYXdMaXN0ZW5lcnMgPSBmdW5jdGlvbiByYXdMaXN0ZW5lcnModHlwZSkge1xuICByZXR1cm4gX2xpc3RlbmVycyh0aGlzLCB0eXBlLCBmYWxzZSk7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgaWYgKHR5cGVvZiBlbWl0dGVyLmxpc3RlbmVyQ291bnQgPT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gZW1pdHRlci5saXN0ZW5lckNvdW50KHR5cGUpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBsaXN0ZW5lckNvdW50LmNhbGwoZW1pdHRlciwgdHlwZSk7XG4gIH1cbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJDb3VudCA9IGxpc3RlbmVyQ291bnQ7XG5mdW5jdGlvbiBsaXN0ZW5lckNvdW50KHR5cGUpIHtcbiAgdmFyIGV2ZW50cyA9IHRoaXMuX2V2ZW50cztcblxuICBpZiAoZXZlbnRzKSB7XG4gICAgdmFyIGV2bGlzdGVuZXIgPSBldmVudHNbdHlwZV07XG5cbiAgICBpZiAodHlwZW9mIGV2bGlzdGVuZXIgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybiAxO1xuICAgIH0gZWxzZSBpZiAoZXZsaXN0ZW5lcikge1xuICAgICAgcmV0dXJuIGV2bGlzdGVuZXIubGVuZ3RoO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiAwO1xufVxuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmV2ZW50TmFtZXMgPSBmdW5jdGlvbiBldmVudE5hbWVzKCkge1xuICByZXR1cm4gdGhpcy5fZXZlbnRzQ291bnQgPiAwID8gUmVmbGVjdC5vd25LZXlzKHRoaXMuX2V2ZW50cykgOiBbXTtcbn07XG5cbi8vIEFib3V0IDEuNXggZmFzdGVyIHRoYW4gdGhlIHR3by1hcmcgdmVyc2lvbiBvZiBBcnJheSNzcGxpY2UoKS5cbmZ1bmN0aW9uIHNwbGljZU9uZShsaXN0LCBpbmRleCkge1xuICBmb3IgKHZhciBpID0gaW5kZXgsIGsgPSBpICsgMSwgbiA9IGxpc3QubGVuZ3RoOyBrIDwgbjsgaSArPSAxLCBrICs9IDEpXG4gICAgbGlzdFtpXSA9IGxpc3Rba107XG4gIGxpc3QucG9wKCk7XG59XG5cbmZ1bmN0aW9uIGFycmF5Q2xvbmUoYXJyLCBuKSB7XG4gIHZhciBjb3B5ID0gbmV3IEFycmF5KG4pO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IG47ICsraSlcbiAgICBjb3B5W2ldID0gYXJyW2ldO1xuICByZXR1cm4gY29weTtcbn1cblxuZnVuY3Rpb24gdW53cmFwTGlzdGVuZXJzKGFycikge1xuICB2YXIgcmV0ID0gbmV3IEFycmF5KGFyci5sZW5ndGgpO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHJldC5sZW5ndGg7ICsraSkge1xuICAgIHJldFtpXSA9IGFycltpXS5saXN0ZW5lciB8fCBhcnJbaV07XG4gIH1cbiAgcmV0dXJuIHJldDtcbn1cblxuZnVuY3Rpb24gb2JqZWN0Q3JlYXRlUG9seWZpbGwocHJvdG8pIHtcbiAgdmFyIEYgPSBmdW5jdGlvbigpIHt9O1xuICBGLnByb3RvdHlwZSA9IHByb3RvO1xuICByZXR1cm4gbmV3IEY7XG59XG5mdW5jdGlvbiBvYmplY3RLZXlzUG9seWZpbGwob2JqKSB7XG4gIHZhciBrZXlzID0gW107XG4gIGZvciAodmFyIGsgaW4gb2JqKSBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgaykpIHtcbiAgICBrZXlzLnB1c2goayk7XG4gIH1cbiAgcmV0dXJuIGs7XG59XG5mdW5jdGlvbiBmdW5jdGlvbkJpbmRQb2x5ZmlsbChjb250ZXh0KSB7XG4gIHZhciBmbiA9IHRoaXM7XG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZuLmFwcGx5KGNvbnRleHQsIGFyZ3VtZW50cyk7XG4gIH07XG59XG4iLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgbm9ybWFsaWNlID0gcmVxdWlyZSgnbm9ybWFsaWNlJyk7XG5cbi8qKlxuICAjIGZyZWVpY2VcblxuICBUaGUgYGZyZWVpY2VgIG1vZHVsZSBpcyBhIHNpbXBsZSB3YXkgb2YgZ2V0dGluZyByYW5kb20gU1RVTiBvciBUVVJOIHNlcnZlclxuICBmb3IgeW91ciBXZWJSVEMgYXBwbGljYXRpb24uICBUaGUgbGlzdCBvZiBzZXJ2ZXJzIChqdXN0IFNUVU4gYXQgdGhpcyBzdGFnZSlcbiAgd2VyZSBzb3VyY2VkIGZyb20gdGhpcyBbZ2lzdF0oaHR0cHM6Ly9naXN0LmdpdGh1Yi5jb20venppdW5pLzM3NDE5MzMpLlxuXG4gICMjIEV4YW1wbGUgVXNlXG5cbiAgVGhlIGZvbGxvd2luZyBkZW1vbnN0cmF0ZXMgaG93IHlvdSBjYW4gdXNlIGBmcmVlaWNlYCB3aXRoXG4gIFtydGMtcXVpY2tjb25uZWN0XShodHRwczovL2dpdGh1Yi5jb20vcnRjLWlvL3J0Yy1xdWlja2Nvbm5lY3QpOlxuXG4gIDw8PCBleGFtcGxlcy9xdWlja2Nvbm5lY3QuanNcblxuICBBcyB0aGUgYGZyZWVpY2VgIG1vZHVsZSBnZW5lcmF0ZXMgaWNlIHNlcnZlcnMgaW4gYSBsaXN0IGNvbXBsaWFudCB3aXRoIHRoZVxuICBXZWJSVEMgc3BlYyB5b3Ugd2lsbCBiZSBhYmxlIHRvIHVzZSBpdCB3aXRoIHJhdyBgUlRDUGVlckNvbm5lY3Rpb25gXG4gIGNvbnN0cnVjdG9ycyBhbmQgb3RoZXIgV2ViUlRDIGxpYnJhcmllcy5cblxuICAjIyBIZXksIGRvbid0IHVzZSBteSBTVFVOL1RVUk4gc2VydmVyIVxuXG4gIElmIGZvciBzb21lIHJlYXNvbiB5b3VyIGZyZWUgU1RVTiBvciBUVVJOIHNlcnZlciBlbmRzIHVwIGluIHRoZVxuICBsaXN0IG9mIHNlcnZlcnMgKFtzdHVuXShodHRwczovL2dpdGh1Yi5jb20vRGFtb25PZWhsbWFuL2ZyZWVpY2UvYmxvYi9tYXN0ZXIvc3R1bi5qc29uKSBvclxuICBbdHVybl0oaHR0cHM6Ly9naXRodWIuY29tL0RhbW9uT2VobG1hbi9mcmVlaWNlL2Jsb2IvbWFzdGVyL3R1cm4uanNvbikpXG4gIHRoYXQgaXMgdXNlZCBpbiB0aGlzIG1vZHVsZSwgeW91IGNhbiBmZWVsXG4gIGZyZWUgdG8gb3BlbiBhbiBpc3N1ZSBvbiB0aGlzIHJlcG9zaXRvcnkgYW5kIHRob3NlIHNlcnZlcnMgd2lsbCBiZSByZW1vdmVkXG4gIHdpdGhpbiAyNCBob3VycyAob3Igc29vbmVyKS4gIFRoaXMgaXMgdGhlIHF1aWNrZXN0IGFuZCBwcm9iYWJseSB0aGUgbW9zdFxuICBwb2xpdGUgd2F5IHRvIGhhdmUgc29tZXRoaW5nIHJlbW92ZWQgKGFuZCBwcm92aWRlcyB1cyBzb21lIHZpc2liaWxpdHlcbiAgaWYgc29tZW9uZSBvcGVucyBhIHB1bGwgcmVxdWVzdCByZXF1ZXN0aW5nIHRoYXQgYSBzZXJ2ZXIgaXMgYWRkZWQpLlxuXG4gICMjIFBsZWFzZSBhZGQgbXkgc2VydmVyIVxuXG4gIElmIHlvdSBoYXZlIGEgc2VydmVyIHRoYXQgeW91IHdpc2ggdG8gYWRkIHRvIHRoZSBsaXN0LCB0aGF0J3MgYXdlc29tZSEgSSdtXG4gIHN1cmUgSSBzcGVhayBvbiBiZWhhbGYgb2YgYSB3aG9sZSBwaWxlIG9mIFdlYlJUQyBkZXZlbG9wZXJzIHdobyBzYXkgdGhhbmtzLlxuICBUbyBnZXQgaXQgaW50byB0aGUgbGlzdCwgZmVlbCBmcmVlIHRvIGVpdGhlciBvcGVuIGEgcHVsbCByZXF1ZXN0IG9yIGlmIHlvdVxuICBmaW5kIHRoYXQgcHJvY2VzcyBhIGJpdCBkYXVudGluZyB0aGVuIGp1c3QgY3JlYXRlIGFuIGlzc3VlIHJlcXVlc3RpbmdcbiAgdGhlIGFkZGl0aW9uIG9mIHRoZSBzZXJ2ZXIgKG1ha2Ugc3VyZSB5b3UgcHJvdmlkZSBhbGwgdGhlIGRldGFpbHMsIGFuZCBpZlxuICB5b3UgaGF2ZSBhIFRlcm1zIG9mIFNlcnZpY2UgdGhlbiBpbmNsdWRpbmcgdGhhdCBpbiB0aGUgUFIvaXNzdWUgd291bGQgYmVcbiAgYXdlc29tZSkuXG5cbiAgIyMgSSBrbm93IG9mIGEgZnJlZSBzZXJ2ZXIsIGNhbiBJIGFkZCBpdD9cblxuICBTdXJlLCBpZiB5b3UgZG8geW91ciBob21ld29yayBhbmQgbWFrZSBzdXJlIGl0IGlzIG9rIHRvIHVzZSAoSSdtIGN1cnJlbnRseVxuICBpbiB0aGUgcHJvY2VzcyBvZiByZXZpZXdpbmcgdGhlIHRlcm1zIG9mIHRob3NlIFNUVU4gc2VydmVycyBpbmNsdWRlZCBmcm9tXG4gIHRoZSBvcmlnaW5hbCBsaXN0KS4gIElmIGl0J3Mgb2sgdG8gZ28sIHRoZW4gcGxlYXNlIHNlZSB0aGUgcHJldmlvdXMgZW50cnlcbiAgZm9yIGhvdyB0byBhZGQgaXQuXG5cbiAgIyMgQ3VycmVudCBMaXN0IG9mIFNlcnZlcnNcblxuICAqIGN1cnJlbnQgYXMgYXQgdGhlIHRpbWUgb2YgbGFzdCBgUkVBRE1FLm1kYCBmaWxlIGdlbmVyYXRpb25cblxuICAjIyMgU1RVTlxuXG4gIDw8PCBzdHVuLmpzb25cblxuICAjIyMgVFVSTlxuXG4gIDw8PCB0dXJuLmpzb25cblxuKiovXG5cbnZhciBmcmVlaWNlID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihvcHRzKSB7XG4gIC8vIGlmIGEgbGlzdCBvZiBzZXJ2ZXJzIGhhcyBiZWVuIHByb3ZpZGVkLCB0aGVuIHVzZSBpdCBpbnN0ZWFkIG9mIGRlZmF1bHRzXG4gIHZhciBzZXJ2ZXJzID0ge1xuICAgIHN0dW46IChvcHRzIHx8IHt9KS5zdHVuIHx8IHJlcXVpcmUoJy4vc3R1bi5qc29uJyksXG4gICAgdHVybjogKG9wdHMgfHwge30pLnR1cm4gfHwgcmVxdWlyZSgnLi90dXJuLmpzb24nKVxuICB9O1xuXG4gIHZhciBzdHVuQ291bnQgPSAob3B0cyB8fCB7fSkuc3R1bkNvdW50IHx8IDI7XG4gIHZhciB0dXJuQ291bnQgPSAob3B0cyB8fCB7fSkudHVybkNvdW50IHx8IDA7XG4gIHZhciBzZWxlY3RlZDtcblxuICBmdW5jdGlvbiBnZXRTZXJ2ZXJzKHR5cGUsIGNvdW50KSB7XG4gICAgdmFyIG91dCA9IFtdO1xuICAgIHZhciBpbnB1dCA9IFtdLmNvbmNhdChzZXJ2ZXJzW3R5cGVdKTtcbiAgICB2YXIgaWR4O1xuXG4gICAgd2hpbGUgKGlucHV0Lmxlbmd0aCAmJiBvdXQubGVuZ3RoIDwgY291bnQpIHtcbiAgICAgIGlkeCA9IChNYXRoLnJhbmRvbSgpICogaW5wdXQubGVuZ3RoKSB8IDA7XG4gICAgICBvdXQgPSBvdXQuY29uY2F0KGlucHV0LnNwbGljZShpZHgsIDEpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gb3V0Lm1hcChmdW5jdGlvbih1cmwpIHtcbiAgICAgICAgLy9JZiBpdCdzIGEgbm90IGEgc3RyaW5nLCBkb24ndCB0cnkgdG8gXCJub3JtYWxpY2VcIiBpdCBvdGhlcndpc2UgdXNpbmcgdHlwZTp1cmwgd2lsbCBzY3JldyBpdCB1cFxuICAgICAgICBpZiAoKHR5cGVvZiB1cmwgIT09ICdzdHJpbmcnKSAmJiAoISAodXJsIGluc3RhbmNlb2YgU3RyaW5nKSkpIHtcbiAgICAgICAgICAgIHJldHVybiB1cmw7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gbm9ybWFsaWNlKHR5cGUgKyAnOicgKyB1cmwpO1xuICAgICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvLyBhZGQgc3R1biBzZXJ2ZXJzXG4gIHNlbGVjdGVkID0gW10uY29uY2F0KGdldFNlcnZlcnMoJ3N0dW4nLCBzdHVuQ291bnQpKTtcblxuICBpZiAodHVybkNvdW50KSB7XG4gICAgc2VsZWN0ZWQgPSBzZWxlY3RlZC5jb25jYXQoZ2V0U2VydmVycygndHVybicsIHR1cm5Db3VudCkpO1xuICB9XG5cbiAgcmV0dXJuIHNlbGVjdGVkO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzPVtcbiAgXCJzdHVuLmwuZ29vZ2xlLmNvbToxOTMwMlwiLFxuICBcInN0dW4xLmwuZ29vZ2xlLmNvbToxOTMwMlwiLFxuICBcInN0dW4yLmwuZ29vZ2xlLmNvbToxOTMwMlwiLFxuICBcInN0dW4zLmwuZ29vZ2xlLmNvbToxOTMwMlwiLFxuICBcInN0dW40LmwuZ29vZ2xlLmNvbToxOTMwMlwiLFxuICBcInN0dW4uZWtpZ2EubmV0XCIsXG4gIFwic3R1bi5pZGVhc2lwLmNvbVwiLFxuICBcInN0dW4uc2NobHVuZC5kZVwiLFxuICBcInN0dW4uc3R1bnByb3RvY29sLm9yZzozNDc4XCIsXG4gIFwic3R1bi52b2lwYXJvdW5kLmNvbVwiLFxuICBcInN0dW4udm9pcGJ1c3Rlci5jb21cIixcbiAgXCJzdHVuLnZvaXBzdHVudC5jb21cIixcbiAgXCJzdHVuLnZveGdyYXRpYS5vcmdcIixcbiAgXCJzdHVuLnNlcnZpY2VzLm1vemlsbGEuY29tXCJcbl1cbiIsIm1vZHVsZS5leHBvcnRzPVtdXG4iLCJ2YXIgV2lsZEVtaXR0ZXIgPSByZXF1aXJlKCd3aWxkZW1pdHRlcicpO1xuXG5mdW5jdGlvbiBnZXRNYXhWb2x1bWUgKGFuYWx5c2VyLCBmZnRCaW5zKSB7XG4gIHZhciBtYXhWb2x1bWUgPSAtSW5maW5pdHk7XG4gIGFuYWx5c2VyLmdldEZsb2F0RnJlcXVlbmN5RGF0YShmZnRCaW5zKTtcblxuICBmb3IodmFyIGk9NCwgaWk9ZmZ0Qmlucy5sZW5ndGg7IGkgPCBpaTsgaSsrKSB7XG4gICAgaWYgKGZmdEJpbnNbaV0gPiBtYXhWb2x1bWUgJiYgZmZ0Qmluc1tpXSA8IDApIHtcbiAgICAgIG1heFZvbHVtZSA9IGZmdEJpbnNbaV07XG4gICAgfVxuICB9O1xuXG4gIHJldHVybiBtYXhWb2x1bWU7XG59XG5cblxudmFyIGF1ZGlvQ29udGV4dFR5cGU7XG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgYXVkaW9Db250ZXh0VHlwZSA9IHdpbmRvdy5BdWRpb0NvbnRleHQgfHwgd2luZG93LndlYmtpdEF1ZGlvQ29udGV4dDtcbn1cbi8vIHVzZSBhIHNpbmdsZSBhdWRpbyBjb250ZXh0IGR1ZSB0byBoYXJkd2FyZSBsaW1pdHNcbnZhciBhdWRpb0NvbnRleHQgPSBudWxsO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihzdHJlYW0sIG9wdGlvbnMpIHtcbiAgdmFyIGhhcmtlciA9IG5ldyBXaWxkRW1pdHRlcigpO1xuXG5cbiAgLy8gbWFrZSBpdCBub3QgYnJlYWsgaW4gbm9uLXN1cHBvcnRlZCBicm93c2Vyc1xuICBpZiAoIWF1ZGlvQ29udGV4dFR5cGUpIHJldHVybiBoYXJrZXI7XG5cbiAgLy9Db25maWdcbiAgdmFyIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9LFxuICAgICAgc21vb3RoaW5nID0gKG9wdGlvbnMuc21vb3RoaW5nIHx8IDAuMSksXG4gICAgICBpbnRlcnZhbCA9IChvcHRpb25zLmludGVydmFsIHx8IDUwKSxcbiAgICAgIHRocmVzaG9sZCA9IG9wdGlvbnMudGhyZXNob2xkLFxuICAgICAgcGxheSA9IG9wdGlvbnMucGxheSxcbiAgICAgIGhpc3RvcnkgPSBvcHRpb25zLmhpc3RvcnkgfHwgMTAsXG4gICAgICBydW5uaW5nID0gdHJ1ZTtcblxuICAvL1NldHVwIEF1ZGlvIENvbnRleHRcbiAgaWYgKCFhdWRpb0NvbnRleHQpIHtcbiAgICBhdWRpb0NvbnRleHQgPSBuZXcgYXVkaW9Db250ZXh0VHlwZSgpO1xuICB9XG4gIHZhciBzb3VyY2VOb2RlLCBmZnRCaW5zLCBhbmFseXNlcjtcblxuICBhbmFseXNlciA9IGF1ZGlvQ29udGV4dC5jcmVhdGVBbmFseXNlcigpO1xuICBhbmFseXNlci5mZnRTaXplID0gNTEyO1xuICBhbmFseXNlci5zbW9vdGhpbmdUaW1lQ29uc3RhbnQgPSBzbW9vdGhpbmc7XG4gIGZmdEJpbnMgPSBuZXcgRmxvYXQzMkFycmF5KGFuYWx5c2VyLmZyZXF1ZW5jeUJpbkNvdW50KTtcblxuICBpZiAoc3RyZWFtLmpxdWVyeSkgc3RyZWFtID0gc3RyZWFtWzBdO1xuICBpZiAoc3RyZWFtIGluc3RhbmNlb2YgSFRNTEF1ZGlvRWxlbWVudCB8fCBzdHJlYW0gaW5zdGFuY2VvZiBIVE1MVmlkZW9FbGVtZW50KSB7XG4gICAgLy9BdWRpbyBUYWdcbiAgICBzb3VyY2VOb2RlID0gYXVkaW9Db250ZXh0LmNyZWF0ZU1lZGlhRWxlbWVudFNvdXJjZShzdHJlYW0pO1xuICAgIGlmICh0eXBlb2YgcGxheSA9PT0gJ3VuZGVmaW5lZCcpIHBsYXkgPSB0cnVlO1xuICAgIHRocmVzaG9sZCA9IHRocmVzaG9sZCB8fCAtNTA7XG4gIH0gZWxzZSB7XG4gICAgLy9XZWJSVEMgU3RyZWFtXG4gICAgc291cmNlTm9kZSA9IGF1ZGlvQ29udGV4dC5jcmVhdGVNZWRpYVN0cmVhbVNvdXJjZShzdHJlYW0pO1xuICAgIHRocmVzaG9sZCA9IHRocmVzaG9sZCB8fCAtNTA7XG4gIH1cblxuICBzb3VyY2VOb2RlLmNvbm5lY3QoYW5hbHlzZXIpO1xuICBpZiAocGxheSkgYW5hbHlzZXIuY29ubmVjdChhdWRpb0NvbnRleHQuZGVzdGluYXRpb24pO1xuXG4gIGhhcmtlci5zcGVha2luZyA9IGZhbHNlO1xuXG4gIGhhcmtlci5zdXNwZW5kID0gZnVuY3Rpb24oKSB7XG4gICAgYXVkaW9Db250ZXh0LnN1c3BlbmQoKTtcbiAgfVxuICBoYXJrZXIucmVzdW1lID0gZnVuY3Rpb24oKSB7XG4gICAgYXVkaW9Db250ZXh0LnJlc3VtZSgpO1xuICB9XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShoYXJrZXIsICdzdGF0ZScsIHsgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gYXVkaW9Db250ZXh0LnN0YXRlO1xuICB9fSk7XG4gIGF1ZGlvQ29udGV4dC5vbnN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKSB7XG4gICAgaGFya2VyLmVtaXQoJ3N0YXRlX2NoYW5nZScsIGF1ZGlvQ29udGV4dC5zdGF0ZSk7XG4gIH1cblxuICBoYXJrZXIuc2V0VGhyZXNob2xkID0gZnVuY3Rpb24odCkge1xuICAgIHRocmVzaG9sZCA9IHQ7XG4gIH07XG5cbiAgaGFya2VyLnNldEludGVydmFsID0gZnVuY3Rpb24oaSkge1xuICAgIGludGVydmFsID0gaTtcbiAgfTtcblxuICBoYXJrZXIuc3RvcCA9IGZ1bmN0aW9uKCkge1xuICAgIHJ1bm5pbmcgPSBmYWxzZTtcbiAgICBoYXJrZXIuZW1pdCgndm9sdW1lX2NoYW5nZScsIC0xMDAsIHRocmVzaG9sZCk7XG4gICAgaWYgKGhhcmtlci5zcGVha2luZykge1xuICAgICAgaGFya2VyLnNwZWFraW5nID0gZmFsc2U7XG4gICAgICBoYXJrZXIuZW1pdCgnc3RvcHBlZF9zcGVha2luZycpO1xuICAgIH1cbiAgICBhbmFseXNlci5kaXNjb25uZWN0KCk7XG4gICAgc291cmNlTm9kZS5kaXNjb25uZWN0KCk7XG4gIH07XG4gIGhhcmtlci5zcGVha2luZ0hpc3RvcnkgPSBbXTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBoaXN0b3J5OyBpKyspIHtcbiAgICAgIGhhcmtlci5zcGVha2luZ0hpc3RvcnkucHVzaCgwKTtcbiAgfVxuXG4gIC8vIFBvbGwgdGhlIGFuYWx5c2VyIG5vZGUgdG8gZGV0ZXJtaW5lIGlmIHNwZWFraW5nXG4gIC8vIGFuZCBlbWl0IGV2ZW50cyBpZiBjaGFuZ2VkXG4gIHZhciBsb29wZXIgPSBmdW5jdGlvbigpIHtcbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuXG4gICAgICAvL2NoZWNrIGlmIHN0b3AgaGFzIGJlZW4gY2FsbGVkXG4gICAgICBpZighcnVubmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHZhciBjdXJyZW50Vm9sdW1lID0gZ2V0TWF4Vm9sdW1lKGFuYWx5c2VyLCBmZnRCaW5zKTtcblxuICAgICAgaGFya2VyLmVtaXQoJ3ZvbHVtZV9jaGFuZ2UnLCBjdXJyZW50Vm9sdW1lLCB0aHJlc2hvbGQpO1xuXG4gICAgICB2YXIgaGlzdG9yeSA9IDA7XG4gICAgICBpZiAoY3VycmVudFZvbHVtZSA+IHRocmVzaG9sZCAmJiAhaGFya2VyLnNwZWFraW5nKSB7XG4gICAgICAgIC8vIHRyaWdnZXIgcXVpY2tseSwgc2hvcnQgaGlzdG9yeVxuICAgICAgICBmb3IgKHZhciBpID0gaGFya2VyLnNwZWFraW5nSGlzdG9yeS5sZW5ndGggLSAzOyBpIDwgaGFya2VyLnNwZWFraW5nSGlzdG9yeS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGhpc3RvcnkgKz0gaGFya2VyLnNwZWFraW5nSGlzdG9yeVtpXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaGlzdG9yeSA+PSAyKSB7XG4gICAgICAgICAgaGFya2VyLnNwZWFraW5nID0gdHJ1ZTtcbiAgICAgICAgICBoYXJrZXIuZW1pdCgnc3BlYWtpbmcnKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChjdXJyZW50Vm9sdW1lIDwgdGhyZXNob2xkICYmIGhhcmtlci5zcGVha2luZykge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGhhcmtlci5zcGVha2luZ0hpc3RvcnkubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBoaXN0b3J5ICs9IGhhcmtlci5zcGVha2luZ0hpc3RvcnlbaV07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGhpc3RvcnkgPT0gMCkge1xuICAgICAgICAgIGhhcmtlci5zcGVha2luZyA9IGZhbHNlO1xuICAgICAgICAgIGhhcmtlci5lbWl0KCdzdG9wcGVkX3NwZWFraW5nJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGhhcmtlci5zcGVha2luZ0hpc3Rvcnkuc2hpZnQoKTtcbiAgICAgIGhhcmtlci5zcGVha2luZ0hpc3RvcnkucHVzaCgwICsgKGN1cnJlbnRWb2x1bWUgPiB0aHJlc2hvbGQpKTtcblxuICAgICAgbG9vcGVyKCk7XG4gICAgfSwgaW50ZXJ2YWwpO1xuICB9O1xuICBsb29wZXIoKTtcblxuXG4gIHJldHVybiBoYXJrZXI7XG59XG4iLCJpZiAodHlwZW9mIE9iamVjdC5jcmVhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgLy8gaW1wbGVtZW50YXRpb24gZnJvbSBzdGFuZGFyZCBub2RlLmpzICd1dGlsJyBtb2R1bGVcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIGN0b3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShzdXBlckN0b3IucHJvdG90eXBlLCB7XG4gICAgICBjb25zdHJ1Y3Rvcjoge1xuICAgICAgICB2YWx1ZTogY3RvcixcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcbn0gZWxzZSB7XG4gIC8vIG9sZCBzY2hvb2wgc2hpbSBmb3Igb2xkIGJyb3dzZXJzXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICB2YXIgVGVtcEN0b3IgPSBmdW5jdGlvbiAoKSB7fVxuICAgIFRlbXBDdG9yLnByb3RvdHlwZSA9IHN1cGVyQ3Rvci5wcm90b3R5cGVcbiAgICBjdG9yLnByb3RvdHlwZSA9IG5ldyBUZW1wQ3RvcigpXG4gICAgY3Rvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBjdG9yXG4gIH1cbn1cbiIsIi8qKlxuICAjIG5vcm1hbGljZVxuXG4gIE5vcm1hbGl6ZSBhbiBpY2Ugc2VydmVyIGNvbmZpZ3VyYXRpb24gb2JqZWN0IChvciBwbGFpbiBvbGQgc3RyaW5nKSBpbnRvIGEgZm9ybWF0XG4gIHRoYXQgaXMgdXNhYmxlIGluIGFsbCBicm93c2VycyBzdXBwb3J0aW5nIFdlYlJUQy4gIFByaW1hcmlseSB0aGlzIG1vZHVsZSBpcyBkZXNpZ25lZFxuICB0byBoZWxwIHdpdGggdGhlIHRyYW5zaXRpb24gb2YgdGhlIGB1cmxgIGF0dHJpYnV0ZSBvZiB0aGUgY29uZmlndXJhdGlvbiBvYmplY3QgdG9cbiAgdGhlIGB1cmxzYCBhdHRyaWJ1dGUuXG5cbiAgIyMgRXhhbXBsZSBVc2FnZVxuXG4gIDw8PCBleGFtcGxlcy9zaW1wbGUuanNcblxuKiovXG5cbnZhciBwcm90b2NvbHMgPSBbXG4gICdzdHVuOicsXG4gICd0dXJuOidcbl07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oaW5wdXQpIHtcbiAgdmFyIHVybCA9IChpbnB1dCB8fCB7fSkudXJsIHx8IGlucHV0O1xuICB2YXIgcHJvdG9jb2w7XG4gIHZhciBwYXJ0cztcbiAgdmFyIG91dHB1dCA9IHt9O1xuXG4gIC8vIGlmIHdlIGRvbid0IGhhdmUgYSBzdHJpbmcgdXJsLCB0aGVuIGFsbG93IHRoZSBpbnB1dCB0byBwYXNzdGhyb3VnaFxuICBpZiAodHlwZW9mIHVybCAhPSAnc3RyaW5nJyAmJiAoISAodXJsIGluc3RhbmNlb2YgU3RyaW5nKSkpIHtcbiAgICByZXR1cm4gaW5wdXQ7XG4gIH1cblxuICAvLyB0cmltIHRoZSB1cmwgc3RyaW5nLCBhbmQgY29udmVydCB0byBhbiBhcnJheVxuICB1cmwgPSB1cmwudHJpbSgpO1xuXG4gIC8vIGlmIHRoZSBwcm90b2NvbCBpcyBub3Qga25vd24sIHRoZW4gcGFzc3Rocm91Z2hcbiAgcHJvdG9jb2wgPSBwcm90b2NvbHNbcHJvdG9jb2xzLmluZGV4T2YodXJsLnNsaWNlKDAsIDUpKV07XG4gIGlmICghIHByb3RvY29sKSB7XG4gICAgcmV0dXJuIGlucHV0O1xuICB9XG5cbiAgLy8gbm93IGxldCdzIGF0dGFjayB0aGUgcmVtYWluaW5nIHVybCBwYXJ0c1xuICB1cmwgPSB1cmwuc2xpY2UoNSk7XG4gIHBhcnRzID0gdXJsLnNwbGl0KCdAJyk7XG5cbiAgb3V0cHV0LnVzZXJuYW1lID0gaW5wdXQudXNlcm5hbWU7XG4gIG91dHB1dC5jcmVkZW50aWFsID0gaW5wdXQuY3JlZGVudGlhbDtcbiAgLy8gaWYgd2UgaGF2ZSBhbiBhdXRoZW50aWNhdGlvbiBwYXJ0LCB0aGVuIHNldCB0aGUgY3JlZGVudGlhbHNcbiAgaWYgKHBhcnRzLmxlbmd0aCA+IDEpIHtcbiAgICB1cmwgPSBwYXJ0c1sxXTtcbiAgICBwYXJ0cyA9IHBhcnRzWzBdLnNwbGl0KCc6Jyk7XG5cbiAgICAvLyBhZGQgdGhlIG91dHB1dCBjcmVkZW50aWFsIGFuZCB1c2VybmFtZVxuICAgIG91dHB1dC51c2VybmFtZSA9IHBhcnRzWzBdO1xuICAgIG91dHB1dC5jcmVkZW50aWFsID0gKGlucHV0IHx8IHt9KS5jcmVkZW50aWFsIHx8IHBhcnRzWzFdIHx8ICcnO1xuICB9XG5cbiAgb3V0cHV0LnVybCA9IHByb3RvY29sICsgdXJsO1xuICBvdXRwdXQudXJscyA9IFsgb3V0cHV0LnVybCBdO1xuXG4gIHJldHVybiBvdXRwdXQ7XG59O1xuIiwiLyohXG4gKiBQbGF0Zm9ybS5qcyA8aHR0cHM6Ly9tdGhzLmJlL3BsYXRmb3JtPlxuICogQ29weXJpZ2h0IDIwMTQtMjAxOCBCZW5qYW1pbiBUYW4gPGh0dHBzOi8vYm5qbW50NG4ubm93LnNoLz5cbiAqIENvcHlyaWdodCAyMDExLTIwMTMgSm9obi1EYXZpZCBEYWx0b24gPGh0dHA6Ly9hbGx5b3VjYW5sZWV0LmNvbS8+XG4gKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHBzOi8vbXRocy5iZS9taXQ+XG4gKi9cbjsoZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICAvKiogVXNlZCB0byBkZXRlcm1pbmUgaWYgdmFsdWVzIGFyZSBvZiB0aGUgbGFuZ3VhZ2UgdHlwZSBgT2JqZWN0YC4gKi9cbiAgdmFyIG9iamVjdFR5cGVzID0ge1xuICAgICdmdW5jdGlvbic6IHRydWUsXG4gICAgJ29iamVjdCc6IHRydWVcbiAgfTtcblxuICAvKiogVXNlZCBhcyBhIHJlZmVyZW5jZSB0byB0aGUgZ2xvYmFsIG9iamVjdC4gKi9cbiAgdmFyIHJvb3QgPSAob2JqZWN0VHlwZXNbdHlwZW9mIHdpbmRvd10gJiYgd2luZG93KSB8fCB0aGlzO1xuXG4gIC8qKiBCYWNrdXAgcG9zc2libGUgZ2xvYmFsIG9iamVjdC4gKi9cbiAgdmFyIG9sZFJvb3QgPSByb290O1xuXG4gIC8qKiBEZXRlY3QgZnJlZSB2YXJpYWJsZSBgZXhwb3J0c2AuICovXG4gIHZhciBmcmVlRXhwb3J0cyA9IG9iamVjdFR5cGVzW3R5cGVvZiBleHBvcnRzXSAmJiBleHBvcnRzO1xuXG4gIC8qKiBEZXRlY3QgZnJlZSB2YXJpYWJsZSBgbW9kdWxlYC4gKi9cbiAgdmFyIGZyZWVNb2R1bGUgPSBvYmplY3RUeXBlc1t0eXBlb2YgbW9kdWxlXSAmJiBtb2R1bGUgJiYgIW1vZHVsZS5ub2RlVHlwZSAmJiBtb2R1bGU7XG5cbiAgLyoqIERldGVjdCBmcmVlIHZhcmlhYmxlIGBnbG9iYWxgIGZyb20gTm9kZS5qcyBvciBCcm93c2VyaWZpZWQgY29kZSBhbmQgdXNlIGl0IGFzIGByb290YC4gKi9cbiAgdmFyIGZyZWVHbG9iYWwgPSBmcmVlRXhwb3J0cyAmJiBmcmVlTW9kdWxlICYmIHR5cGVvZiBnbG9iYWwgPT0gJ29iamVjdCcgJiYgZ2xvYmFsO1xuICBpZiAoZnJlZUdsb2JhbCAmJiAoZnJlZUdsb2JhbC5nbG9iYWwgPT09IGZyZWVHbG9iYWwgfHwgZnJlZUdsb2JhbC53aW5kb3cgPT09IGZyZWVHbG9iYWwgfHwgZnJlZUdsb2JhbC5zZWxmID09PSBmcmVlR2xvYmFsKSkge1xuICAgIHJvb3QgPSBmcmVlR2xvYmFsO1xuICB9XG5cbiAgLyoqXG4gICAqIFVzZWQgYXMgdGhlIG1heGltdW0gbGVuZ3RoIG9mIGFuIGFycmF5LWxpa2Ugb2JqZWN0LlxuICAgKiBTZWUgdGhlIFtFUzYgc3BlY10oaHR0cDovL3Blb3BsZS5tb3ppbGxhLm9yZy9+am9yZW5kb3JmZi9lczYtZHJhZnQuaHRtbCNzZWMtdG9sZW5ndGgpXG4gICAqIGZvciBtb3JlIGRldGFpbHMuXG4gICAqL1xuICB2YXIgbWF4U2FmZUludGVnZXIgPSBNYXRoLnBvdygyLCA1MykgLSAxO1xuXG4gIC8qKiBSZWd1bGFyIGV4cHJlc3Npb24gdG8gZGV0ZWN0IE9wZXJhLiAqL1xuICB2YXIgcmVPcGVyYSA9IC9cXGJPcGVyYS87XG5cbiAgLyoqIFBvc3NpYmxlIGdsb2JhbCBvYmplY3QuICovXG4gIHZhciB0aGlzQmluZGluZyA9IHRoaXM7XG5cbiAgLyoqIFVzZWQgZm9yIG5hdGl2ZSBtZXRob2QgcmVmZXJlbmNlcy4gKi9cbiAgdmFyIG9iamVjdFByb3RvID0gT2JqZWN0LnByb3RvdHlwZTtcblxuICAvKiogVXNlZCB0byBjaGVjayBmb3Igb3duIHByb3BlcnRpZXMgb2YgYW4gb2JqZWN0LiAqL1xuICB2YXIgaGFzT3duUHJvcGVydHkgPSBvYmplY3RQcm90by5oYXNPd25Qcm9wZXJ0eTtcblxuICAvKiogVXNlZCB0byByZXNvbHZlIHRoZSBpbnRlcm5hbCBgW1tDbGFzc11dYCBvZiB2YWx1ZXMuICovXG4gIHZhciB0b1N0cmluZyA9IG9iamVjdFByb3RvLnRvU3RyaW5nO1xuXG4gIC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG4gIC8qKlxuICAgKiBDYXBpdGFsaXplcyBhIHN0cmluZyB2YWx1ZS5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtzdHJpbmd9IHN0cmluZyBUaGUgc3RyaW5nIHRvIGNhcGl0YWxpemUuXG4gICAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBjYXBpdGFsaXplZCBzdHJpbmcuXG4gICAqL1xuICBmdW5jdGlvbiBjYXBpdGFsaXplKHN0cmluZykge1xuICAgIHN0cmluZyA9IFN0cmluZyhzdHJpbmcpO1xuICAgIHJldHVybiBzdHJpbmcuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBzdHJpbmcuc2xpY2UoMSk7XG4gIH1cblxuICAvKipcbiAgICogQSB1dGlsaXR5IGZ1bmN0aW9uIHRvIGNsZWFuIHVwIHRoZSBPUyBuYW1lLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge3N0cmluZ30gb3MgVGhlIE9TIG5hbWUgdG8gY2xlYW4gdXAuXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBbcGF0dGVybl0gQSBgUmVnRXhwYCBwYXR0ZXJuIG1hdGNoaW5nIHRoZSBPUyBuYW1lLlxuICAgKiBAcGFyYW0ge3N0cmluZ30gW2xhYmVsXSBBIGxhYmVsIGZvciB0aGUgT1MuXG4gICAqL1xuICBmdW5jdGlvbiBjbGVhbnVwT1Mob3MsIHBhdHRlcm4sIGxhYmVsKSB7XG4gICAgLy8gUGxhdGZvcm0gdG9rZW5zIGFyZSBkZWZpbmVkIGF0OlxuICAgIC8vIGh0dHA6Ly9tc2RuLm1pY3Jvc29mdC5jb20vZW4tdXMvbGlicmFyeS9tczUzNzUwMyhWUy44NSkuYXNweFxuICAgIC8vIGh0dHA6Ly93ZWIuYXJjaGl2ZS5vcmcvd2ViLzIwMDgxMTIyMDUzOTUwL2h0dHA6Ly9tc2RuLm1pY3Jvc29mdC5jb20vZW4tdXMvbGlicmFyeS9tczUzNzUwMyhWUy44NSkuYXNweFxuICAgIHZhciBkYXRhID0ge1xuICAgICAgJzEwLjAnOiAnMTAnLFxuICAgICAgJzYuNCc6ICAnMTAgVGVjaG5pY2FsIFByZXZpZXcnLFxuICAgICAgJzYuMyc6ICAnOC4xJyxcbiAgICAgICc2LjInOiAgJzgnLFxuICAgICAgJzYuMSc6ICAnU2VydmVyIDIwMDggUjIgLyA3JyxcbiAgICAgICc2LjAnOiAgJ1NlcnZlciAyMDA4IC8gVmlzdGEnLFxuICAgICAgJzUuMic6ICAnU2VydmVyIDIwMDMgLyBYUCA2NC1iaXQnLFxuICAgICAgJzUuMSc6ICAnWFAnLFxuICAgICAgJzUuMDEnOiAnMjAwMCBTUDEnLFxuICAgICAgJzUuMCc6ICAnMjAwMCcsXG4gICAgICAnNC4wJzogICdOVCcsXG4gICAgICAnNC45MCc6ICdNRSdcbiAgICB9O1xuICAgIC8vIERldGVjdCBXaW5kb3dzIHZlcnNpb24gZnJvbSBwbGF0Zm9ybSB0b2tlbnMuXG4gICAgaWYgKHBhdHRlcm4gJiYgbGFiZWwgJiYgL15XaW4vaS50ZXN0KG9zKSAmJiAhL15XaW5kb3dzIFBob25lIC9pLnRlc3Qob3MpICYmXG4gICAgICAgIChkYXRhID0gZGF0YVsvW1xcZC5dKyQvLmV4ZWMob3MpXSkpIHtcbiAgICAgIG9zID0gJ1dpbmRvd3MgJyArIGRhdGE7XG4gICAgfVxuICAgIC8vIENvcnJlY3QgY2hhcmFjdGVyIGNhc2UgYW5kIGNsZWFudXAgc3RyaW5nLlxuICAgIG9zID0gU3RyaW5nKG9zKTtcblxuICAgIGlmIChwYXR0ZXJuICYmIGxhYmVsKSB7XG4gICAgICBvcyA9IG9zLnJlcGxhY2UoUmVnRXhwKHBhdHRlcm4sICdpJyksIGxhYmVsKTtcbiAgICB9XG5cbiAgICBvcyA9IGZvcm1hdChcbiAgICAgIG9zLnJlcGxhY2UoLyBjZSQvaSwgJyBDRScpXG4gICAgICAgIC5yZXBsYWNlKC9cXGJocHcvaSwgJ3dlYicpXG4gICAgICAgIC5yZXBsYWNlKC9cXGJNYWNpbnRvc2hcXGIvLCAnTWFjIE9TJylcbiAgICAgICAgLnJlcGxhY2UoL19Qb3dlclBDXFxiL2ksICcgT1MnKVxuICAgICAgICAucmVwbGFjZSgvXFxiKE9TIFgpIFteIFxcZF0rL2ksICckMScpXG4gICAgICAgIC5yZXBsYWNlKC9cXGJNYWMgKE9TIFgpXFxiLywgJyQxJylcbiAgICAgICAgLnJlcGxhY2UoL1xcLyhcXGQpLywgJyAkMScpXG4gICAgICAgIC5yZXBsYWNlKC9fL2csICcuJylcbiAgICAgICAgLnJlcGxhY2UoLyg/OiBCZVBDfFsgLl0qZmNbIFxcZC5dKykkL2ksICcnKVxuICAgICAgICAucmVwbGFjZSgvXFxieDg2XFwuNjRcXGIvZ2ksICd4ODZfNjQnKVxuICAgICAgICAucmVwbGFjZSgvXFxiKFdpbmRvd3MgUGhvbmUpIE9TXFxiLywgJyQxJylcbiAgICAgICAgLnJlcGxhY2UoL1xcYihDaHJvbWUgT1MgXFx3KykgW1xcZC5dK1xcYi8sICckMScpXG4gICAgICAgIC5zcGxpdCgnIG9uICcpWzBdXG4gICAgKTtcblxuICAgIHJldHVybiBvcztcbiAgfVxuXG4gIC8qKlxuICAgKiBBbiBpdGVyYXRpb24gdXRpbGl0eSBmb3IgYXJyYXlzIGFuZCBvYmplY3RzLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge0FycmF5fE9iamVjdH0gb2JqZWN0IFRoZSBvYmplY3QgdG8gaXRlcmF0ZSBvdmVyLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBUaGUgZnVuY3Rpb24gY2FsbGVkIHBlciBpdGVyYXRpb24uXG4gICAqL1xuICBmdW5jdGlvbiBlYWNoKG9iamVjdCwgY2FsbGJhY2spIHtcbiAgICB2YXIgaW5kZXggPSAtMSxcbiAgICAgICAgbGVuZ3RoID0gb2JqZWN0ID8gb2JqZWN0Lmxlbmd0aCA6IDA7XG5cbiAgICBpZiAodHlwZW9mIGxlbmd0aCA9PSAnbnVtYmVyJyAmJiBsZW5ndGggPiAtMSAmJiBsZW5ndGggPD0gbWF4U2FmZUludGVnZXIpIHtcbiAgICAgIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgIGNhbGxiYWNrKG9iamVjdFtpbmRleF0sIGluZGV4LCBvYmplY3QpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBmb3JPd24ob2JqZWN0LCBjYWxsYmFjayk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFRyaW0gYW5kIGNvbmRpdGlvbmFsbHkgY2FwaXRhbGl6ZSBzdHJpbmcgdmFsdWVzLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge3N0cmluZ30gc3RyaW5nIFRoZSBzdHJpbmcgdG8gZm9ybWF0LlxuICAgKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgZm9ybWF0dGVkIHN0cmluZy5cbiAgICovXG4gIGZ1bmN0aW9uIGZvcm1hdChzdHJpbmcpIHtcbiAgICBzdHJpbmcgPSB0cmltKHN0cmluZyk7XG4gICAgcmV0dXJuIC9eKD86d2ViT1N8aSg/Ok9TfFApKS8udGVzdChzdHJpbmcpXG4gICAgICA/IHN0cmluZ1xuICAgICAgOiBjYXBpdGFsaXplKHN0cmluZyk7XG4gIH1cblxuICAvKipcbiAgICogSXRlcmF0ZXMgb3ZlciBhbiBvYmplY3QncyBvd24gcHJvcGVydGllcywgZXhlY3V0aW5nIHRoZSBgY2FsbGJhY2tgIGZvciBlYWNoLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IFRoZSBvYmplY3QgdG8gaXRlcmF0ZSBvdmVyLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBUaGUgZnVuY3Rpb24gZXhlY3V0ZWQgcGVyIG93biBwcm9wZXJ0eS5cbiAgICovXG4gIGZ1bmN0aW9uIGZvck93bihvYmplY3QsIGNhbGxiYWNrKSB7XG4gICAgZm9yICh2YXIga2V5IGluIG9iamVjdCkge1xuICAgICAgaWYgKGhhc093blByb3BlcnR5LmNhbGwob2JqZWN0LCBrZXkpKSB7XG4gICAgICAgIGNhbGxiYWNrKG9iamVjdFtrZXldLCBrZXksIG9iamVjdCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIGludGVybmFsIGBbW0NsYXNzXV1gIG9mIGEgdmFsdWUuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlLlxuICAgKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgYFtbQ2xhc3NdXWAuXG4gICAqL1xuICBmdW5jdGlvbiBnZXRDbGFzc09mKHZhbHVlKSB7XG4gICAgcmV0dXJuIHZhbHVlID09IG51bGxcbiAgICAgID8gY2FwaXRhbGl6ZSh2YWx1ZSlcbiAgICAgIDogdG9TdHJpbmcuY2FsbCh2YWx1ZSkuc2xpY2UoOCwgLTEpO1xuICB9XG5cbiAgLyoqXG4gICAqIEhvc3Qgb2JqZWN0cyBjYW4gcmV0dXJuIHR5cGUgdmFsdWVzIHRoYXQgYXJlIGRpZmZlcmVudCBmcm9tIHRoZWlyIGFjdHVhbFxuICAgKiBkYXRhIHR5cGUuIFRoZSBvYmplY3RzIHdlIGFyZSBjb25jZXJuZWQgd2l0aCB1c3VhbGx5IHJldHVybiBub24tcHJpbWl0aXZlXG4gICAqIHR5cGVzIG9mIFwib2JqZWN0XCIsIFwiZnVuY3Rpb25cIiwgb3IgXCJ1bmtub3duXCIuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7Kn0gb2JqZWN0IFRoZSBvd25lciBvZiB0aGUgcHJvcGVydHkuXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBwcm9wZXJ0eSBUaGUgcHJvcGVydHkgdG8gY2hlY2suXG4gICAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgcHJvcGVydHkgdmFsdWUgaXMgYSBub24tcHJpbWl0aXZlLCBlbHNlIGBmYWxzZWAuXG4gICAqL1xuICBmdW5jdGlvbiBpc0hvc3RUeXBlKG9iamVjdCwgcHJvcGVydHkpIHtcbiAgICB2YXIgdHlwZSA9IG9iamVjdCAhPSBudWxsID8gdHlwZW9mIG9iamVjdFtwcm9wZXJ0eV0gOiAnbnVtYmVyJztcbiAgICByZXR1cm4gIS9eKD86Ym9vbGVhbnxudW1iZXJ8c3RyaW5nfHVuZGVmaW5lZCkkLy50ZXN0KHR5cGUpICYmXG4gICAgICAodHlwZSA9PSAnb2JqZWN0JyA/ICEhb2JqZWN0W3Byb3BlcnR5XSA6IHRydWUpO1xuICB9XG5cbiAgLyoqXG4gICAqIFByZXBhcmVzIGEgc3RyaW5nIGZvciB1c2UgaW4gYSBgUmVnRXhwYCBieSBtYWtpbmcgaHlwaGVucyBhbmQgc3BhY2VzIG9wdGlvbmFsLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge3N0cmluZ30gc3RyaW5nIFRoZSBzdHJpbmcgdG8gcXVhbGlmeS5cbiAgICogQHJldHVybnMge3N0cmluZ30gVGhlIHF1YWxpZmllZCBzdHJpbmcuXG4gICAqL1xuICBmdW5jdGlvbiBxdWFsaWZ5KHN0cmluZykge1xuICAgIHJldHVybiBTdHJpbmcoc3RyaW5nKS5yZXBsYWNlKC8oWyAtXSkoPyEkKS9nLCAnJDE/Jyk7XG4gIH1cblxuICAvKipcbiAgICogQSBiYXJlLWJvbmVzIGBBcnJheSNyZWR1Y2VgIGxpa2UgdXRpbGl0eSBmdW5jdGlvbi5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtBcnJheX0gYXJyYXkgVGhlIGFycmF5IHRvIGl0ZXJhdGUgb3Zlci5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgVGhlIGZ1bmN0aW9uIGNhbGxlZCBwZXIgaXRlcmF0aW9uLlxuICAgKiBAcmV0dXJucyB7Kn0gVGhlIGFjY3VtdWxhdGVkIHJlc3VsdC5cbiAgICovXG4gIGZ1bmN0aW9uIHJlZHVjZShhcnJheSwgY2FsbGJhY2spIHtcbiAgICB2YXIgYWNjdW11bGF0b3IgPSBudWxsO1xuICAgIGVhY2goYXJyYXksIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCkge1xuICAgICAgYWNjdW11bGF0b3IgPSBjYWxsYmFjayhhY2N1bXVsYXRvciwgdmFsdWUsIGluZGV4LCBhcnJheSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIGFjY3VtdWxhdG9yO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgbGVhZGluZyBhbmQgdHJhaWxpbmcgd2hpdGVzcGFjZSBmcm9tIGEgc3RyaW5nLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge3N0cmluZ30gc3RyaW5nIFRoZSBzdHJpbmcgdG8gdHJpbS5cbiAgICogQHJldHVybnMge3N0cmluZ30gVGhlIHRyaW1tZWQgc3RyaW5nLlxuICAgKi9cbiAgZnVuY3Rpb24gdHJpbShzdHJpbmcpIHtcbiAgICByZXR1cm4gU3RyaW5nKHN0cmluZykucmVwbGFjZSgvXiArfCArJC9nLCAnJyk7XG4gIH1cblxuICAvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBwbGF0Zm9ybSBvYmplY3QuXG4gICAqXG4gICAqIEBtZW1iZXJPZiBwbGF0Zm9ybVxuICAgKiBAcGFyYW0ge09iamVjdHxzdHJpbmd9IFt1YT1uYXZpZ2F0b3IudXNlckFnZW50XSBUaGUgdXNlciBhZ2VudCBzdHJpbmcgb3JcbiAgICogIGNvbnRleHQgb2JqZWN0LlxuICAgKiBAcmV0dXJucyB7T2JqZWN0fSBBIHBsYXRmb3JtIG9iamVjdC5cbiAgICovXG4gIGZ1bmN0aW9uIHBhcnNlKHVhKSB7XG5cbiAgICAvKiogVGhlIGVudmlyb25tZW50IGNvbnRleHQgb2JqZWN0LiAqL1xuICAgIHZhciBjb250ZXh0ID0gcm9vdDtcblxuICAgIC8qKiBVc2VkIHRvIGZsYWcgd2hlbiBhIGN1c3RvbSBjb250ZXh0IGlzIHByb3ZpZGVkLiAqL1xuICAgIHZhciBpc0N1c3RvbUNvbnRleHQgPSB1YSAmJiB0eXBlb2YgdWEgPT0gJ29iamVjdCcgJiYgZ2V0Q2xhc3NPZih1YSkgIT0gJ1N0cmluZyc7XG5cbiAgICAvLyBKdWdnbGUgYXJndW1lbnRzLlxuICAgIGlmIChpc0N1c3RvbUNvbnRleHQpIHtcbiAgICAgIGNvbnRleHQgPSB1YTtcbiAgICAgIHVhID0gbnVsbDtcbiAgICB9XG5cbiAgICAvKiogQnJvd3NlciBuYXZpZ2F0b3Igb2JqZWN0LiAqL1xuICAgIHZhciBuYXYgPSBjb250ZXh0Lm5hdmlnYXRvciB8fCB7fTtcblxuICAgIC8qKiBCcm93c2VyIHVzZXIgYWdlbnQgc3RyaW5nLiAqL1xuICAgIHZhciB1c2VyQWdlbnQgPSBuYXYudXNlckFnZW50IHx8ICcnO1xuXG4gICAgdWEgfHwgKHVhID0gdXNlckFnZW50KTtcblxuICAgIC8qKiBVc2VkIHRvIGZsYWcgd2hlbiBgdGhpc0JpbmRpbmdgIGlzIHRoZSBbTW9kdWxlU2NvcGVdLiAqL1xuICAgIHZhciBpc01vZHVsZVNjb3BlID0gaXNDdXN0b21Db250ZXh0IHx8IHRoaXNCaW5kaW5nID09IG9sZFJvb3Q7XG5cbiAgICAvKiogVXNlZCB0byBkZXRlY3QgaWYgYnJvd3NlciBpcyBsaWtlIENocm9tZS4gKi9cbiAgICB2YXIgbGlrZUNocm9tZSA9IGlzQ3VzdG9tQ29udGV4dFxuICAgICAgPyAhIW5hdi5saWtlQ2hyb21lXG4gICAgICA6IC9cXGJDaHJvbWVcXGIvLnRlc3QodWEpICYmICEvaW50ZXJuYWx8XFxuL2kudGVzdCh0b1N0cmluZy50b1N0cmluZygpKTtcblxuICAgIC8qKiBJbnRlcm5hbCBgW1tDbGFzc11dYCB2YWx1ZSBzaG9ydGN1dHMuICovXG4gICAgdmFyIG9iamVjdENsYXNzID0gJ09iamVjdCcsXG4gICAgICAgIGFpclJ1bnRpbWVDbGFzcyA9IGlzQ3VzdG9tQ29udGV4dCA/IG9iamVjdENsYXNzIDogJ1NjcmlwdEJyaWRnaW5nUHJveHlPYmplY3QnLFxuICAgICAgICBlbnZpcm9DbGFzcyA9IGlzQ3VzdG9tQ29udGV4dCA/IG9iamVjdENsYXNzIDogJ0Vudmlyb25tZW50JyxcbiAgICAgICAgamF2YUNsYXNzID0gKGlzQ3VzdG9tQ29udGV4dCAmJiBjb250ZXh0LmphdmEpID8gJ0phdmFQYWNrYWdlJyA6IGdldENsYXNzT2YoY29udGV4dC5qYXZhKSxcbiAgICAgICAgcGhhbnRvbUNsYXNzID0gaXNDdXN0b21Db250ZXh0ID8gb2JqZWN0Q2xhc3MgOiAnUnVudGltZU9iamVjdCc7XG5cbiAgICAvKiogRGV0ZWN0IEphdmEgZW52aXJvbm1lbnRzLiAqL1xuICAgIHZhciBqYXZhID0gL1xcYkphdmEvLnRlc3QoamF2YUNsYXNzKSAmJiBjb250ZXh0LmphdmE7XG5cbiAgICAvKiogRGV0ZWN0IFJoaW5vLiAqL1xuICAgIHZhciByaGlubyA9IGphdmEgJiYgZ2V0Q2xhc3NPZihjb250ZXh0LmVudmlyb25tZW50KSA9PSBlbnZpcm9DbGFzcztcblxuICAgIC8qKiBBIGNoYXJhY3RlciB0byByZXByZXNlbnQgYWxwaGEuICovXG4gICAgdmFyIGFscGhhID0gamF2YSA/ICdhJyA6ICdcXHUwM2IxJztcblxuICAgIC8qKiBBIGNoYXJhY3RlciB0byByZXByZXNlbnQgYmV0YS4gKi9cbiAgICB2YXIgYmV0YSA9IGphdmEgPyAnYicgOiAnXFx1MDNiMic7XG5cbiAgICAvKiogQnJvd3NlciBkb2N1bWVudCBvYmplY3QuICovXG4gICAgdmFyIGRvYyA9IGNvbnRleHQuZG9jdW1lbnQgfHwge307XG5cbiAgICAvKipcbiAgICAgKiBEZXRlY3QgT3BlcmEgYnJvd3NlciAoUHJlc3RvLWJhc2VkKS5cbiAgICAgKiBodHRwOi8vd3d3Lmhvd3RvY3JlYXRlLmNvLnVrL29wZXJhU3R1ZmYvb3BlcmFPYmplY3QuaHRtbFxuICAgICAqIGh0dHA6Ly9kZXYub3BlcmEuY29tL2FydGljbGVzL3ZpZXcvb3BlcmEtbWluaS13ZWItY29udGVudC1hdXRob3JpbmctZ3VpZGVsaW5lcy8jb3BlcmFtaW5pXG4gICAgICovXG4gICAgdmFyIG9wZXJhID0gY29udGV4dC5vcGVyYW1pbmkgfHwgY29udGV4dC5vcGVyYTtcblxuICAgIC8qKiBPcGVyYSBgW1tDbGFzc11dYC4gKi9cbiAgICB2YXIgb3BlcmFDbGFzcyA9IHJlT3BlcmEudGVzdChvcGVyYUNsYXNzID0gKGlzQ3VzdG9tQ29udGV4dCAmJiBvcGVyYSkgPyBvcGVyYVsnW1tDbGFzc11dJ10gOiBnZXRDbGFzc09mKG9wZXJhKSlcbiAgICAgID8gb3BlcmFDbGFzc1xuICAgICAgOiAob3BlcmEgPSBudWxsKTtcblxuICAgIC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxuICAgIC8qKiBUZW1wb3JhcnkgdmFyaWFibGUgdXNlZCBvdmVyIHRoZSBzY3JpcHQncyBsaWZldGltZS4gKi9cbiAgICB2YXIgZGF0YTtcblxuICAgIC8qKiBUaGUgQ1BVIGFyY2hpdGVjdHVyZS4gKi9cbiAgICB2YXIgYXJjaCA9IHVhO1xuXG4gICAgLyoqIFBsYXRmb3JtIGRlc2NyaXB0aW9uIGFycmF5LiAqL1xuICAgIHZhciBkZXNjcmlwdGlvbiA9IFtdO1xuXG4gICAgLyoqIFBsYXRmb3JtIGFscGhhL2JldGEgaW5kaWNhdG9yLiAqL1xuICAgIHZhciBwcmVyZWxlYXNlID0gbnVsbDtcblxuICAgIC8qKiBBIGZsYWcgdG8gaW5kaWNhdGUgdGhhdCBlbnZpcm9ubWVudCBmZWF0dXJlcyBzaG91bGQgYmUgdXNlZCB0byByZXNvbHZlIHRoZSBwbGF0Zm9ybS4gKi9cbiAgICB2YXIgdXNlRmVhdHVyZXMgPSB1YSA9PSB1c2VyQWdlbnQ7XG5cbiAgICAvKiogVGhlIGJyb3dzZXIvZW52aXJvbm1lbnQgdmVyc2lvbi4gKi9cbiAgICB2YXIgdmVyc2lvbiA9IHVzZUZlYXR1cmVzICYmIG9wZXJhICYmIHR5cGVvZiBvcGVyYS52ZXJzaW9uID09ICdmdW5jdGlvbicgJiYgb3BlcmEudmVyc2lvbigpO1xuXG4gICAgLyoqIEEgZmxhZyB0byBpbmRpY2F0ZSBpZiB0aGUgT1MgZW5kcyB3aXRoIFwiLyBWZXJzaW9uXCIgKi9cbiAgICB2YXIgaXNTcGVjaWFsQ2FzZWRPUztcblxuICAgIC8qIERldGVjdGFibGUgbGF5b3V0IGVuZ2luZXMgKG9yZGVyIGlzIGltcG9ydGFudCkuICovXG4gICAgdmFyIGxheW91dCA9IGdldExheW91dChbXG4gICAgICB7ICdsYWJlbCc6ICdFZGdlSFRNTCcsICdwYXR0ZXJuJzogJ0VkZ2UnIH0sXG4gICAgICAnVHJpZGVudCcsXG4gICAgICB7ICdsYWJlbCc6ICdXZWJLaXQnLCAncGF0dGVybic6ICdBcHBsZVdlYktpdCcgfSxcbiAgICAgICdpQ2FiJyxcbiAgICAgICdQcmVzdG8nLFxuICAgICAgJ05ldEZyb250JyxcbiAgICAgICdUYXNtYW4nLFxuICAgICAgJ0tIVE1MJyxcbiAgICAgICdHZWNrbydcbiAgICBdKTtcblxuICAgIC8qIERldGVjdGFibGUgYnJvd3NlciBuYW1lcyAob3JkZXIgaXMgaW1wb3J0YW50KS4gKi9cbiAgICB2YXIgbmFtZSA9IGdldE5hbWUoW1xuICAgICAgJ0Fkb2JlIEFJUicsXG4gICAgICAnQXJvcmEnLFxuICAgICAgJ0F2YW50IEJyb3dzZXInLFxuICAgICAgJ0JyZWFjaCcsXG4gICAgICAnQ2FtaW5vJyxcbiAgICAgICdFbGVjdHJvbicsXG4gICAgICAnRXBpcGhhbnknLFxuICAgICAgJ0Zlbm5lYycsXG4gICAgICAnRmxvY2snLFxuICAgICAgJ0dhbGVvbicsXG4gICAgICAnR3JlZW5Ccm93c2VyJyxcbiAgICAgICdpQ2FiJyxcbiAgICAgICdJY2V3ZWFzZWwnLFxuICAgICAgJ0stTWVsZW9uJyxcbiAgICAgICdLb25xdWVyb3InLFxuICAgICAgJ0x1bmFzY2FwZScsXG4gICAgICAnTWF4dGhvbicsXG4gICAgICB7ICdsYWJlbCc6ICdNaWNyb3NvZnQgRWRnZScsICdwYXR0ZXJuJzogJ0VkZ2UnIH0sXG4gICAgICAnTWlkb3JpJyxcbiAgICAgICdOb29rIEJyb3dzZXInLFxuICAgICAgJ1BhbGVNb29uJyxcbiAgICAgICdQaGFudG9tSlMnLFxuICAgICAgJ1JhdmVuJyxcbiAgICAgICdSZWtvbnEnLFxuICAgICAgJ1JvY2tNZWx0JyxcbiAgICAgIHsgJ2xhYmVsJzogJ1NhbXN1bmcgSW50ZXJuZXQnLCAncGF0dGVybic6ICdTYW1zdW5nQnJvd3NlcicgfSxcbiAgICAgICdTZWFNb25rZXknLFxuICAgICAgeyAnbGFiZWwnOiAnU2lsaycsICdwYXR0ZXJuJzogJyg/OkNsb3VkOXxTaWxrLUFjY2VsZXJhdGVkKScgfSxcbiAgICAgICdTbGVpcG5pcicsXG4gICAgICAnU2xpbUJyb3dzZXInLFxuICAgICAgeyAnbGFiZWwnOiAnU1JXYXJlIElyb24nLCAncGF0dGVybic6ICdJcm9uJyB9LFxuICAgICAgJ1N1bnJpc2UnLFxuICAgICAgJ1N3aWZ0Zm94JyxcbiAgICAgICdXYXRlcmZveCcsXG4gICAgICAnV2ViUG9zaXRpdmUnLFxuICAgICAgJ09wZXJhIE1pbmknLFxuICAgICAgeyAnbGFiZWwnOiAnT3BlcmEgTWluaScsICdwYXR0ZXJuJzogJ09QaU9TJyB9LFxuICAgICAgJ09wZXJhJyxcbiAgICAgIHsgJ2xhYmVsJzogJ09wZXJhJywgJ3BhdHRlcm4nOiAnT1BSJyB9LFxuICAgICAgJ0Nocm9tZScsXG4gICAgICB7ICdsYWJlbCc6ICdDaHJvbWUgTW9iaWxlJywgJ3BhdHRlcm4nOiAnKD86Q3JpT1N8Q3JNbyknIH0sXG4gICAgICB7ICdsYWJlbCc6ICdGaXJlZm94JywgJ3BhdHRlcm4nOiAnKD86RmlyZWZveHxNaW5lZmllbGQpJyB9LFxuICAgICAgeyAnbGFiZWwnOiAnRmlyZWZveCBmb3IgaU9TJywgJ3BhdHRlcm4nOiAnRnhpT1MnIH0sXG4gICAgICB7ICdsYWJlbCc6ICdJRScsICdwYXR0ZXJuJzogJ0lFTW9iaWxlJyB9LFxuICAgICAgeyAnbGFiZWwnOiAnSUUnLCAncGF0dGVybic6ICdNU0lFJyB9LFxuICAgICAgJ1NhZmFyaSdcbiAgICBdKTtcblxuICAgIC8qIERldGVjdGFibGUgcHJvZHVjdHMgKG9yZGVyIGlzIGltcG9ydGFudCkuICovXG4gICAgdmFyIHByb2R1Y3QgPSBnZXRQcm9kdWN0KFtcbiAgICAgIHsgJ2xhYmVsJzogJ0JsYWNrQmVycnknLCAncGF0dGVybic6ICdCQjEwJyB9LFxuICAgICAgJ0JsYWNrQmVycnknLFxuICAgICAgeyAnbGFiZWwnOiAnR2FsYXh5IFMnLCAncGF0dGVybic6ICdHVC1JOTAwMCcgfSxcbiAgICAgIHsgJ2xhYmVsJzogJ0dhbGF4eSBTMicsICdwYXR0ZXJuJzogJ0dULUk5MTAwJyB9LFxuICAgICAgeyAnbGFiZWwnOiAnR2FsYXh5IFMzJywgJ3BhdHRlcm4nOiAnR1QtSTkzMDAnIH0sXG4gICAgICB7ICdsYWJlbCc6ICdHYWxheHkgUzQnLCAncGF0dGVybic6ICdHVC1JOTUwMCcgfSxcbiAgICAgIHsgJ2xhYmVsJzogJ0dhbGF4eSBTNScsICdwYXR0ZXJuJzogJ1NNLUc5MDAnIH0sXG4gICAgICB7ICdsYWJlbCc6ICdHYWxheHkgUzYnLCAncGF0dGVybic6ICdTTS1HOTIwJyB9LFxuICAgICAgeyAnbGFiZWwnOiAnR2FsYXh5IFM2IEVkZ2UnLCAncGF0dGVybic6ICdTTS1HOTI1JyB9LFxuICAgICAgeyAnbGFiZWwnOiAnR2FsYXh5IFM3JywgJ3BhdHRlcm4nOiAnU00tRzkzMCcgfSxcbiAgICAgIHsgJ2xhYmVsJzogJ0dhbGF4eSBTNyBFZGdlJywgJ3BhdHRlcm4nOiAnU00tRzkzNScgfSxcbiAgICAgICdHb29nbGUgVFYnLFxuICAgICAgJ0x1bWlhJyxcbiAgICAgICdpUGFkJyxcbiAgICAgICdpUG9kJyxcbiAgICAgICdpUGhvbmUnLFxuICAgICAgJ0tpbmRsZScsXG4gICAgICB7ICdsYWJlbCc6ICdLaW5kbGUgRmlyZScsICdwYXR0ZXJuJzogJyg/OkNsb3VkOXxTaWxrLUFjY2VsZXJhdGVkKScgfSxcbiAgICAgICdOZXh1cycsXG4gICAgICAnTm9vaycsXG4gICAgICAnUGxheUJvb2snLFxuICAgICAgJ1BsYXlTdGF0aW9uIFZpdGEnLFxuICAgICAgJ1BsYXlTdGF0aW9uJyxcbiAgICAgICdUb3VjaFBhZCcsXG4gICAgICAnVHJhbnNmb3JtZXInLFxuICAgICAgeyAnbGFiZWwnOiAnV2lpIFUnLCAncGF0dGVybic6ICdXaWlVJyB9LFxuICAgICAgJ1dpaScsXG4gICAgICAnWGJveCBPbmUnLFxuICAgICAgeyAnbGFiZWwnOiAnWGJveCAzNjAnLCAncGF0dGVybic6ICdYYm94JyB9LFxuICAgICAgJ1hvb20nXG4gICAgXSk7XG5cbiAgICAvKiBEZXRlY3RhYmxlIG1hbnVmYWN0dXJlcnMuICovXG4gICAgdmFyIG1hbnVmYWN0dXJlciA9IGdldE1hbnVmYWN0dXJlcih7XG4gICAgICAnQXBwbGUnOiB7ICdpUGFkJzogMSwgJ2lQaG9uZSc6IDEsICdpUG9kJzogMSB9LFxuICAgICAgJ0FyY2hvcyc6IHt9LFxuICAgICAgJ0FtYXpvbic6IHsgJ0tpbmRsZSc6IDEsICdLaW5kbGUgRmlyZSc6IDEgfSxcbiAgICAgICdBc3VzJzogeyAnVHJhbnNmb3JtZXInOiAxIH0sXG4gICAgICAnQmFybmVzICYgTm9ibGUnOiB7ICdOb29rJzogMSB9LFxuICAgICAgJ0JsYWNrQmVycnknOiB7ICdQbGF5Qm9vayc6IDEgfSxcbiAgICAgICdHb29nbGUnOiB7ICdHb29nbGUgVFYnOiAxLCAnTmV4dXMnOiAxIH0sXG4gICAgICAnSFAnOiB7ICdUb3VjaFBhZCc6IDEgfSxcbiAgICAgICdIVEMnOiB7fSxcbiAgICAgICdMRyc6IHt9LFxuICAgICAgJ01pY3Jvc29mdCc6IHsgJ1hib3gnOiAxLCAnWGJveCBPbmUnOiAxIH0sXG4gICAgICAnTW90b3JvbGEnOiB7ICdYb29tJzogMSB9LFxuICAgICAgJ05pbnRlbmRvJzogeyAnV2lpIFUnOiAxLCAgJ1dpaSc6IDEgfSxcbiAgICAgICdOb2tpYSc6IHsgJ0x1bWlhJzogMSB9LFxuICAgICAgJ1NhbXN1bmcnOiB7ICdHYWxheHkgUyc6IDEsICdHYWxheHkgUzInOiAxLCAnR2FsYXh5IFMzJzogMSwgJ0dhbGF4eSBTNCc6IDEgfSxcbiAgICAgICdTb255JzogeyAnUGxheVN0YXRpb24nOiAxLCAnUGxheVN0YXRpb24gVml0YSc6IDEgfVxuICAgIH0pO1xuXG4gICAgLyogRGV0ZWN0YWJsZSBvcGVyYXRpbmcgc3lzdGVtcyAob3JkZXIgaXMgaW1wb3J0YW50KS4gKi9cbiAgICB2YXIgb3MgPSBnZXRPUyhbXG4gICAgICAnV2luZG93cyBQaG9uZScsXG4gICAgICAnQW5kcm9pZCcsXG4gICAgICAnQ2VudE9TJyxcbiAgICAgIHsgJ2xhYmVsJzogJ0Nocm9tZSBPUycsICdwYXR0ZXJuJzogJ0NyT1MnIH0sXG4gICAgICAnRGViaWFuJyxcbiAgICAgICdGZWRvcmEnLFxuICAgICAgJ0ZyZWVCU0QnLFxuICAgICAgJ0dlbnRvbycsXG4gICAgICAnSGFpa3UnLFxuICAgICAgJ0t1YnVudHUnLFxuICAgICAgJ0xpbnV4IE1pbnQnLFxuICAgICAgJ09wZW5CU0QnLFxuICAgICAgJ1JlZCBIYXQnLFxuICAgICAgJ1N1U0UnLFxuICAgICAgJ1VidW50dScsXG4gICAgICAnWHVidW50dScsXG4gICAgICAnQ3lnd2luJyxcbiAgICAgICdTeW1iaWFuIE9TJyxcbiAgICAgICdocHdPUycsXG4gICAgICAnd2ViT1MgJyxcbiAgICAgICd3ZWJPUycsXG4gICAgICAnVGFibGV0IE9TJyxcbiAgICAgICdUaXplbicsXG4gICAgICAnTGludXgnLFxuICAgICAgJ01hYyBPUyBYJyxcbiAgICAgICdNYWNpbnRvc2gnLFxuICAgICAgJ01hYycsXG4gICAgICAnV2luZG93cyA5ODsnLFxuICAgICAgJ1dpbmRvd3MgJ1xuICAgIF0pO1xuXG4gICAgLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG4gICAgLyoqXG4gICAgICogUGlja3MgdGhlIGxheW91dCBlbmdpbmUgZnJvbSBhbiBhcnJheSBvZiBndWVzc2VzLlxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBndWVzc2VzIEFuIGFycmF5IG9mIGd1ZXNzZXMuXG4gICAgICogQHJldHVybnMge251bGx8c3RyaW5nfSBUaGUgZGV0ZWN0ZWQgbGF5b3V0IGVuZ2luZS5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRMYXlvdXQoZ3Vlc3Nlcykge1xuICAgICAgcmV0dXJuIHJlZHVjZShndWVzc2VzLCBmdW5jdGlvbihyZXN1bHQsIGd1ZXNzKSB7XG4gICAgICAgIHJldHVybiByZXN1bHQgfHwgUmVnRXhwKCdcXFxcYicgKyAoXG4gICAgICAgICAgZ3Vlc3MucGF0dGVybiB8fCBxdWFsaWZ5KGd1ZXNzKVxuICAgICAgICApICsgJ1xcXFxiJywgJ2knKS5leGVjKHVhKSAmJiAoZ3Vlc3MubGFiZWwgfHwgZ3Vlc3MpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUGlja3MgdGhlIG1hbnVmYWN0dXJlciBmcm9tIGFuIGFycmF5IG9mIGd1ZXNzZXMuXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGd1ZXNzZXMgQW4gb2JqZWN0IG9mIGd1ZXNzZXMuXG4gICAgICogQHJldHVybnMge251bGx8c3RyaW5nfSBUaGUgZGV0ZWN0ZWQgbWFudWZhY3R1cmVyLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldE1hbnVmYWN0dXJlcihndWVzc2VzKSB7XG4gICAgICByZXR1cm4gcmVkdWNlKGd1ZXNzZXMsIGZ1bmN0aW9uKHJlc3VsdCwgdmFsdWUsIGtleSkge1xuICAgICAgICAvLyBMb29rdXAgdGhlIG1hbnVmYWN0dXJlciBieSBwcm9kdWN0IG9yIHNjYW4gdGhlIFVBIGZvciB0aGUgbWFudWZhY3R1cmVyLlxuICAgICAgICByZXR1cm4gcmVzdWx0IHx8IChcbiAgICAgICAgICB2YWx1ZVtwcm9kdWN0XSB8fFxuICAgICAgICAgIHZhbHVlWy9eW2Etel0rKD86ICtbYS16XStcXGIpKi9pLmV4ZWMocHJvZHVjdCldIHx8XG4gICAgICAgICAgUmVnRXhwKCdcXFxcYicgKyBxdWFsaWZ5KGtleSkgKyAnKD86XFxcXGJ8XFxcXHcqXFxcXGQpJywgJ2knKS5leGVjKHVhKVxuICAgICAgICApICYmIGtleTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBpY2tzIHRoZSBicm93c2VyIG5hbWUgZnJvbSBhbiBhcnJheSBvZiBndWVzc2VzLlxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBndWVzc2VzIEFuIGFycmF5IG9mIGd1ZXNzZXMuXG4gICAgICogQHJldHVybnMge251bGx8c3RyaW5nfSBUaGUgZGV0ZWN0ZWQgYnJvd3NlciBuYW1lLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldE5hbWUoZ3Vlc3Nlcykge1xuICAgICAgcmV0dXJuIHJlZHVjZShndWVzc2VzLCBmdW5jdGlvbihyZXN1bHQsIGd1ZXNzKSB7XG4gICAgICAgIHJldHVybiByZXN1bHQgfHwgUmVnRXhwKCdcXFxcYicgKyAoXG4gICAgICAgICAgZ3Vlc3MucGF0dGVybiB8fCBxdWFsaWZ5KGd1ZXNzKVxuICAgICAgICApICsgJ1xcXFxiJywgJ2knKS5leGVjKHVhKSAmJiAoZ3Vlc3MubGFiZWwgfHwgZ3Vlc3MpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUGlja3MgdGhlIE9TIG5hbWUgZnJvbSBhbiBhcnJheSBvZiBndWVzc2VzLlxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBndWVzc2VzIEFuIGFycmF5IG9mIGd1ZXNzZXMuXG4gICAgICogQHJldHVybnMge251bGx8c3RyaW5nfSBUaGUgZGV0ZWN0ZWQgT1MgbmFtZS5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRPUyhndWVzc2VzKSB7XG4gICAgICByZXR1cm4gcmVkdWNlKGd1ZXNzZXMsIGZ1bmN0aW9uKHJlc3VsdCwgZ3Vlc3MpIHtcbiAgICAgICAgdmFyIHBhdHRlcm4gPSBndWVzcy5wYXR0ZXJuIHx8IHF1YWxpZnkoZ3Vlc3MpO1xuICAgICAgICBpZiAoIXJlc3VsdCAmJiAocmVzdWx0ID1cbiAgICAgICAgICAgICAgUmVnRXhwKCdcXFxcYicgKyBwYXR0ZXJuICsgJyg/Oi9bXFxcXGQuXSt8WyBcXFxcdy5dKiknLCAnaScpLmV4ZWModWEpXG4gICAgICAgICAgICApKSB7XG4gICAgICAgICAgcmVzdWx0ID0gY2xlYW51cE9TKHJlc3VsdCwgcGF0dGVybiwgZ3Vlc3MubGFiZWwgfHwgZ3Vlc3MpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQaWNrcyB0aGUgcHJvZHVjdCBuYW1lIGZyb20gYW4gYXJyYXkgb2YgZ3Vlc3Nlcy5cbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHtBcnJheX0gZ3Vlc3NlcyBBbiBhcnJheSBvZiBndWVzc2VzLlxuICAgICAqIEByZXR1cm5zIHtudWxsfHN0cmluZ30gVGhlIGRldGVjdGVkIHByb2R1Y3QgbmFtZS5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRQcm9kdWN0KGd1ZXNzZXMpIHtcbiAgICAgIHJldHVybiByZWR1Y2UoZ3Vlc3NlcywgZnVuY3Rpb24ocmVzdWx0LCBndWVzcykge1xuICAgICAgICB2YXIgcGF0dGVybiA9IGd1ZXNzLnBhdHRlcm4gfHwgcXVhbGlmeShndWVzcyk7XG4gICAgICAgIGlmICghcmVzdWx0ICYmIChyZXN1bHQgPVxuICAgICAgICAgICAgICBSZWdFeHAoJ1xcXFxiJyArIHBhdHRlcm4gKyAnICpcXFxcZCtbLlxcXFx3X10qJywgJ2knKS5leGVjKHVhKSB8fFxuICAgICAgICAgICAgICBSZWdFeHAoJ1xcXFxiJyArIHBhdHRlcm4gKyAnICpcXFxcdystW1xcXFx3XSonLCAnaScpLmV4ZWModWEpIHx8XG4gICAgICAgICAgICAgIFJlZ0V4cCgnXFxcXGInICsgcGF0dGVybiArICcoPzo7ICooPzpbYS16XStbXy1dKT9bYS16XStcXFxcZCt8W14gKCk7LV0qKScsICdpJykuZXhlYyh1YSlcbiAgICAgICAgICAgICkpIHtcbiAgICAgICAgICAvLyBTcGxpdCBieSBmb3J3YXJkIHNsYXNoIGFuZCBhcHBlbmQgcHJvZHVjdCB2ZXJzaW9uIGlmIG5lZWRlZC5cbiAgICAgICAgICBpZiAoKHJlc3VsdCA9IFN0cmluZygoZ3Vlc3MubGFiZWwgJiYgIVJlZ0V4cChwYXR0ZXJuLCAnaScpLnRlc3QoZ3Vlc3MubGFiZWwpKSA/IGd1ZXNzLmxhYmVsIDogcmVzdWx0KS5zcGxpdCgnLycpKVsxXSAmJiAhL1tcXGQuXSsvLnRlc3QocmVzdWx0WzBdKSkge1xuICAgICAgICAgICAgcmVzdWx0WzBdICs9ICcgJyArIHJlc3VsdFsxXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gQ29ycmVjdCBjaGFyYWN0ZXIgY2FzZSBhbmQgY2xlYW51cCBzdHJpbmcuXG4gICAgICAgICAgZ3Vlc3MgPSBndWVzcy5sYWJlbCB8fCBndWVzcztcbiAgICAgICAgICByZXN1bHQgPSBmb3JtYXQocmVzdWx0WzBdXG4gICAgICAgICAgICAucmVwbGFjZShSZWdFeHAocGF0dGVybiwgJ2knKSwgZ3Vlc3MpXG4gICAgICAgICAgICAucmVwbGFjZShSZWdFeHAoJzsgKig/OicgKyBndWVzcyArICdbXy1dKT8nLCAnaScpLCAnICcpXG4gICAgICAgICAgICAucmVwbGFjZShSZWdFeHAoJygnICsgZ3Vlc3MgKyAnKVstXy5dPyhcXFxcdyknLCAnaScpLCAnJDEgJDInKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJlc29sdmVzIHRoZSB2ZXJzaW9uIHVzaW5nIGFuIGFycmF5IG9mIFVBIHBhdHRlcm5zLlxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBwYXR0ZXJucyBBbiBhcnJheSBvZiBVQSBwYXR0ZXJucy5cbiAgICAgKiBAcmV0dXJucyB7bnVsbHxzdHJpbmd9IFRoZSBkZXRlY3RlZCB2ZXJzaW9uLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldFZlcnNpb24ocGF0dGVybnMpIHtcbiAgICAgIHJldHVybiByZWR1Y2UocGF0dGVybnMsIGZ1bmN0aW9uKHJlc3VsdCwgcGF0dGVybikge1xuICAgICAgICByZXR1cm4gcmVzdWx0IHx8IChSZWdFeHAocGF0dGVybiArXG4gICAgICAgICAgJyg/Oi1bXFxcXGQuXSsvfCg/OiBmb3IgW1xcXFx3LV0rKT9bIC8tXSkoW1xcXFxkLl0rW14gKCk7L18tXSopJywgJ2knKS5leGVjKHVhKSB8fCAwKVsxXSB8fCBudWxsO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyBgcGxhdGZvcm0uZGVzY3JpcHRpb25gIHdoZW4gdGhlIHBsYXRmb3JtIG9iamVjdCBpcyBjb2VyY2VkIHRvIGEgc3RyaW5nLlxuICAgICAqXG4gICAgICogQG5hbWUgdG9TdHJpbmdcbiAgICAgKiBAbWVtYmVyT2YgcGxhdGZvcm1cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBSZXR1cm5zIGBwbGF0Zm9ybS5kZXNjcmlwdGlvbmAgaWYgYXZhaWxhYmxlLCBlbHNlIGFuIGVtcHR5IHN0cmluZy5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiB0b1N0cmluZ1BsYXRmb3JtKCkge1xuICAgICAgcmV0dXJuIHRoaXMuZGVzY3JpcHRpb24gfHwgJyc7XG4gICAgfVxuXG4gICAgLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG4gICAgLy8gQ29udmVydCBsYXlvdXQgdG8gYW4gYXJyYXkgc28gd2UgY2FuIGFkZCBleHRyYSBkZXRhaWxzLlxuICAgIGxheW91dCAmJiAobGF5b3V0ID0gW2xheW91dF0pO1xuXG4gICAgLy8gRGV0ZWN0IHByb2R1Y3QgbmFtZXMgdGhhdCBjb250YWluIHRoZWlyIG1hbnVmYWN0dXJlcidzIG5hbWUuXG4gICAgaWYgKG1hbnVmYWN0dXJlciAmJiAhcHJvZHVjdCkge1xuICAgICAgcHJvZHVjdCA9IGdldFByb2R1Y3QoW21hbnVmYWN0dXJlcl0pO1xuICAgIH1cbiAgICAvLyBDbGVhbiB1cCBHb29nbGUgVFYuXG4gICAgaWYgKChkYXRhID0gL1xcYkdvb2dsZSBUVlxcYi8uZXhlYyhwcm9kdWN0KSkpIHtcbiAgICAgIHByb2R1Y3QgPSBkYXRhWzBdO1xuICAgIH1cbiAgICAvLyBEZXRlY3Qgc2ltdWxhdG9ycy5cbiAgICBpZiAoL1xcYlNpbXVsYXRvclxcYi9pLnRlc3QodWEpKSB7XG4gICAgICBwcm9kdWN0ID0gKHByb2R1Y3QgPyBwcm9kdWN0ICsgJyAnIDogJycpICsgJ1NpbXVsYXRvcic7XG4gICAgfVxuICAgIC8vIERldGVjdCBPcGVyYSBNaW5pIDgrIHJ1bm5pbmcgaW4gVHVyYm8vVW5jb21wcmVzc2VkIG1vZGUgb24gaU9TLlxuICAgIGlmIChuYW1lID09ICdPcGVyYSBNaW5pJyAmJiAvXFxiT1BpT1NcXGIvLnRlc3QodWEpKSB7XG4gICAgICBkZXNjcmlwdGlvbi5wdXNoKCdydW5uaW5nIGluIFR1cmJvL1VuY29tcHJlc3NlZCBtb2RlJyk7XG4gICAgfVxuICAgIC8vIERldGVjdCBJRSBNb2JpbGUgMTEuXG4gICAgaWYgKG5hbWUgPT0gJ0lFJyAmJiAvXFxibGlrZSBpUGhvbmUgT1NcXGIvLnRlc3QodWEpKSB7XG4gICAgICBkYXRhID0gcGFyc2UodWEucmVwbGFjZSgvbGlrZSBpUGhvbmUgT1MvLCAnJykpO1xuICAgICAgbWFudWZhY3R1cmVyID0gZGF0YS5tYW51ZmFjdHVyZXI7XG4gICAgICBwcm9kdWN0ID0gZGF0YS5wcm9kdWN0O1xuICAgIH1cbiAgICAvLyBEZXRlY3QgaU9TLlxuICAgIGVsc2UgaWYgKC9eaVAvLnRlc3QocHJvZHVjdCkpIHtcbiAgICAgIG5hbWUgfHwgKG5hbWUgPSAnU2FmYXJpJyk7XG4gICAgICBvcyA9ICdpT1MnICsgKChkYXRhID0gLyBPUyAoW1xcZF9dKykvaS5leGVjKHVhKSlcbiAgICAgICAgPyAnICcgKyBkYXRhWzFdLnJlcGxhY2UoL18vZywgJy4nKVxuICAgICAgICA6ICcnKTtcbiAgICB9XG4gICAgLy8gRGV0ZWN0IEt1YnVudHUuXG4gICAgZWxzZSBpZiAobmFtZSA9PSAnS29ucXVlcm9yJyAmJiAhL2J1bnR1L2kudGVzdChvcykpIHtcbiAgICAgIG9zID0gJ0t1YnVudHUnO1xuICAgIH1cbiAgICAvLyBEZXRlY3QgQW5kcm9pZCBicm93c2Vycy5cbiAgICBlbHNlIGlmICgobWFudWZhY3R1cmVyICYmIG1hbnVmYWN0dXJlciAhPSAnR29vZ2xlJyAmJlxuICAgICAgICAoKC9DaHJvbWUvLnRlc3QobmFtZSkgJiYgIS9cXGJNb2JpbGUgU2FmYXJpXFxiL2kudGVzdCh1YSkpIHx8IC9cXGJWaXRhXFxiLy50ZXN0KHByb2R1Y3QpKSkgfHxcbiAgICAgICAgKC9cXGJBbmRyb2lkXFxiLy50ZXN0KG9zKSAmJiAvXkNocm9tZS8udGVzdChuYW1lKSAmJiAvXFxiVmVyc2lvblxcLy9pLnRlc3QodWEpKSkge1xuICAgICAgbmFtZSA9ICdBbmRyb2lkIEJyb3dzZXInO1xuICAgICAgb3MgPSAvXFxiQW5kcm9pZFxcYi8udGVzdChvcykgPyBvcyA6ICdBbmRyb2lkJztcbiAgICB9XG4gICAgLy8gRGV0ZWN0IFNpbGsgZGVza3RvcC9hY2NlbGVyYXRlZCBtb2Rlcy5cbiAgICBlbHNlIGlmIChuYW1lID09ICdTaWxrJykge1xuICAgICAgaWYgKCEvXFxiTW9iaS9pLnRlc3QodWEpKSB7XG4gICAgICAgIG9zID0gJ0FuZHJvaWQnO1xuICAgICAgICBkZXNjcmlwdGlvbi51bnNoaWZ0KCdkZXNrdG9wIG1vZGUnKTtcbiAgICAgIH1cbiAgICAgIGlmICgvQWNjZWxlcmF0ZWQgKj0gKnRydWUvaS50ZXN0KHVhKSkge1xuICAgICAgICBkZXNjcmlwdGlvbi51bnNoaWZ0KCdhY2NlbGVyYXRlZCcpO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBEZXRlY3QgUGFsZU1vb24gaWRlbnRpZnlpbmcgYXMgRmlyZWZveC5cbiAgICBlbHNlIGlmIChuYW1lID09ICdQYWxlTW9vbicgJiYgKGRhdGEgPSAvXFxiRmlyZWZveFxcLyhbXFxkLl0rKVxcYi8uZXhlYyh1YSkpKSB7XG4gICAgICBkZXNjcmlwdGlvbi5wdXNoKCdpZGVudGlmeWluZyBhcyBGaXJlZm94ICcgKyBkYXRhWzFdKTtcbiAgICB9XG4gICAgLy8gRGV0ZWN0IEZpcmVmb3ggT1MgYW5kIHByb2R1Y3RzIHJ1bm5pbmcgRmlyZWZveC5cbiAgICBlbHNlIGlmIChuYW1lID09ICdGaXJlZm94JyAmJiAoZGF0YSA9IC9cXGIoTW9iaWxlfFRhYmxldHxUVilcXGIvaS5leGVjKHVhKSkpIHtcbiAgICAgIG9zIHx8IChvcyA9ICdGaXJlZm94IE9TJyk7XG4gICAgICBwcm9kdWN0IHx8IChwcm9kdWN0ID0gZGF0YVsxXSk7XG4gICAgfVxuICAgIC8vIERldGVjdCBmYWxzZSBwb3NpdGl2ZXMgZm9yIEZpcmVmb3gvU2FmYXJpLlxuICAgIGVsc2UgaWYgKCFuYW1lIHx8IChkYXRhID0gIS9cXGJNaW5lZmllbGRcXGIvaS50ZXN0KHVhKSAmJiAvXFxiKD86RmlyZWZveHxTYWZhcmkpXFxiLy5leGVjKG5hbWUpKSkge1xuICAgICAgLy8gRXNjYXBlIHRoZSBgL2AgZm9yIEZpcmVmb3ggMS5cbiAgICAgIGlmIChuYW1lICYmICFwcm9kdWN0ICYmIC9bXFwvLF18XlteKF0rP1xcKS8udGVzdCh1YS5zbGljZSh1YS5pbmRleE9mKGRhdGEgKyAnLycpICsgOCkpKSB7XG4gICAgICAgIC8vIENsZWFyIG5hbWUgb2YgZmFsc2UgcG9zaXRpdmVzLlxuICAgICAgICBuYW1lID0gbnVsbDtcbiAgICAgIH1cbiAgICAgIC8vIFJlYXNzaWduIGEgZ2VuZXJpYyBuYW1lLlxuICAgICAgaWYgKChkYXRhID0gcHJvZHVjdCB8fCBtYW51ZmFjdHVyZXIgfHwgb3MpICYmXG4gICAgICAgICAgKHByb2R1Y3QgfHwgbWFudWZhY3R1cmVyIHx8IC9cXGIoPzpBbmRyb2lkfFN5bWJpYW4gT1N8VGFibGV0IE9TfHdlYk9TKVxcYi8udGVzdChvcykpKSB7XG4gICAgICAgIG5hbWUgPSAvW2Etel0rKD86IEhhdCk/L2kuZXhlYygvXFxiQW5kcm9pZFxcYi8udGVzdChvcykgPyBvcyA6IGRhdGEpICsgJyBCcm93c2VyJztcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gQWRkIENocm9tZSB2ZXJzaW9uIHRvIGRlc2NyaXB0aW9uIGZvciBFbGVjdHJvbi5cbiAgICBlbHNlIGlmIChuYW1lID09ICdFbGVjdHJvbicgJiYgKGRhdGEgPSAoL1xcYkNocm9tZVxcLyhbXFxkLl0rKVxcYi8uZXhlYyh1YSkgfHwgMClbMV0pKSB7XG4gICAgICBkZXNjcmlwdGlvbi5wdXNoKCdDaHJvbWl1bSAnICsgZGF0YSk7XG4gICAgfVxuICAgIC8vIERldGVjdCBub24tT3BlcmEgKFByZXN0by1iYXNlZCkgdmVyc2lvbnMgKG9yZGVyIGlzIGltcG9ydGFudCkuXG4gICAgaWYgKCF2ZXJzaW9uKSB7XG4gICAgICB2ZXJzaW9uID0gZ2V0VmVyc2lvbihbXG4gICAgICAgICcoPzpDbG91ZDl8Q3JpT1N8Q3JNb3xFZGdlfEZ4aU9TfElFTW9iaWxlfElyb258T3BlcmEgP01pbml8T1BpT1N8T1BSfFJhdmVufFNhbXN1bmdCcm93c2VyfFNpbGsoPyEvW1xcXFxkLl0rJCkpJyxcbiAgICAgICAgJ1ZlcnNpb24nLFxuICAgICAgICBxdWFsaWZ5KG5hbWUpLFxuICAgICAgICAnKD86RmlyZWZveHxNaW5lZmllbGR8TmV0RnJvbnQpJ1xuICAgICAgXSk7XG4gICAgfVxuICAgIC8vIERldGVjdCBzdHViYm9ybiBsYXlvdXQgZW5naW5lcy5cbiAgICBpZiAoKGRhdGEgPVxuICAgICAgICAgIGxheW91dCA9PSAnaUNhYicgJiYgcGFyc2VGbG9hdCh2ZXJzaW9uKSA+IDMgJiYgJ1dlYktpdCcgfHxcbiAgICAgICAgICAvXFxiT3BlcmFcXGIvLnRlc3QobmFtZSkgJiYgKC9cXGJPUFJcXGIvLnRlc3QodWEpID8gJ0JsaW5rJyA6ICdQcmVzdG8nKSB8fFxuICAgICAgICAgIC9cXGIoPzpNaWRvcml8Tm9va3xTYWZhcmkpXFxiL2kudGVzdCh1YSkgJiYgIS9eKD86VHJpZGVudHxFZGdlSFRNTCkkLy50ZXN0KGxheW91dCkgJiYgJ1dlYktpdCcgfHxcbiAgICAgICAgICAhbGF5b3V0ICYmIC9cXGJNU0lFXFxiL2kudGVzdCh1YSkgJiYgKG9zID09ICdNYWMgT1MnID8gJ1Rhc21hbicgOiAnVHJpZGVudCcpIHx8XG4gICAgICAgICAgbGF5b3V0ID09ICdXZWJLaXQnICYmIC9cXGJQbGF5U3RhdGlvblxcYig/ISBWaXRhXFxiKS9pLnRlc3QobmFtZSkgJiYgJ05ldEZyb250J1xuICAgICAgICApKSB7XG4gICAgICBsYXlvdXQgPSBbZGF0YV07XG4gICAgfVxuICAgIC8vIERldGVjdCBXaW5kb3dzIFBob25lIDcgZGVza3RvcCBtb2RlLlxuICAgIGlmIChuYW1lID09ICdJRScgJiYgKGRhdGEgPSAoLzsgKig/OlhCTFdQfFp1bmVXUCkoXFxkKykvaS5leGVjKHVhKSB8fCAwKVsxXSkpIHtcbiAgICAgIG5hbWUgKz0gJyBNb2JpbGUnO1xuICAgICAgb3MgPSAnV2luZG93cyBQaG9uZSAnICsgKC9cXCskLy50ZXN0KGRhdGEpID8gZGF0YSA6IGRhdGEgKyAnLngnKTtcbiAgICAgIGRlc2NyaXB0aW9uLnVuc2hpZnQoJ2Rlc2t0b3AgbW9kZScpO1xuICAgIH1cbiAgICAvLyBEZXRlY3QgV2luZG93cyBQaG9uZSA4LnggZGVza3RvcCBtb2RlLlxuICAgIGVsc2UgaWYgKC9cXGJXUERlc2t0b3BcXGIvaS50ZXN0KHVhKSkge1xuICAgICAgbmFtZSA9ICdJRSBNb2JpbGUnO1xuICAgICAgb3MgPSAnV2luZG93cyBQaG9uZSA4LngnO1xuICAgICAgZGVzY3JpcHRpb24udW5zaGlmdCgnZGVza3RvcCBtb2RlJyk7XG4gICAgICB2ZXJzaW9uIHx8ICh2ZXJzaW9uID0gKC9cXGJydjooW1xcZC5dKykvLmV4ZWModWEpIHx8IDApWzFdKTtcbiAgICB9XG4gICAgLy8gRGV0ZWN0IElFIDExIGlkZW50aWZ5aW5nIGFzIG90aGVyIGJyb3dzZXJzLlxuICAgIGVsc2UgaWYgKG5hbWUgIT0gJ0lFJyAmJiBsYXlvdXQgPT0gJ1RyaWRlbnQnICYmIChkYXRhID0gL1xcYnJ2OihbXFxkLl0rKS8uZXhlYyh1YSkpKSB7XG4gICAgICBpZiAobmFtZSkge1xuICAgICAgICBkZXNjcmlwdGlvbi5wdXNoKCdpZGVudGlmeWluZyBhcyAnICsgbmFtZSArICh2ZXJzaW9uID8gJyAnICsgdmVyc2lvbiA6ICcnKSk7XG4gICAgICB9XG4gICAgICBuYW1lID0gJ0lFJztcbiAgICAgIHZlcnNpb24gPSBkYXRhWzFdO1xuICAgIH1cbiAgICAvLyBMZXZlcmFnZSBlbnZpcm9ubWVudCBmZWF0dXJlcy5cbiAgICBpZiAodXNlRmVhdHVyZXMpIHtcbiAgICAgIC8vIERldGVjdCBzZXJ2ZXItc2lkZSBlbnZpcm9ubWVudHMuXG4gICAgICAvLyBSaGlubyBoYXMgYSBnbG9iYWwgZnVuY3Rpb24gd2hpbGUgb3RoZXJzIGhhdmUgYSBnbG9iYWwgb2JqZWN0LlxuICAgICAgaWYgKGlzSG9zdFR5cGUoY29udGV4dCwgJ2dsb2JhbCcpKSB7XG4gICAgICAgIGlmIChqYXZhKSB7XG4gICAgICAgICAgZGF0YSA9IGphdmEubGFuZy5TeXN0ZW07XG4gICAgICAgICAgYXJjaCA9IGRhdGEuZ2V0UHJvcGVydHkoJ29zLmFyY2gnKTtcbiAgICAgICAgICBvcyA9IG9zIHx8IGRhdGEuZ2V0UHJvcGVydHkoJ29zLm5hbWUnKSArICcgJyArIGRhdGEuZ2V0UHJvcGVydHkoJ29zLnZlcnNpb24nKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmhpbm8pIHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgdmVyc2lvbiA9IGNvbnRleHQucmVxdWlyZSgncmluZ28vZW5naW5lJykudmVyc2lvbi5qb2luKCcuJyk7XG4gICAgICAgICAgICBuYW1lID0gJ1JpbmdvSlMnO1xuICAgICAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICAgICAgaWYgKChkYXRhID0gY29udGV4dC5zeXN0ZW0pICYmIGRhdGEuZ2xvYmFsLnN5c3RlbSA9PSBjb250ZXh0LnN5c3RlbSkge1xuICAgICAgICAgICAgICBuYW1lID0gJ05hcndoYWwnO1xuICAgICAgICAgICAgICBvcyB8fCAob3MgPSBkYXRhWzBdLm9zIHx8IG51bGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIW5hbWUpIHtcbiAgICAgICAgICAgIG5hbWUgPSAnUmhpbm8nO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChcbiAgICAgICAgICB0eXBlb2YgY29udGV4dC5wcm9jZXNzID09ICdvYmplY3QnICYmICFjb250ZXh0LnByb2Nlc3MuYnJvd3NlciAmJlxuICAgICAgICAgIChkYXRhID0gY29udGV4dC5wcm9jZXNzKVxuICAgICAgICApIHtcbiAgICAgICAgICBpZiAodHlwZW9mIGRhdGEudmVyc2lvbnMgPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgZGF0YS52ZXJzaW9ucy5lbGVjdHJvbiA9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICBkZXNjcmlwdGlvbi5wdXNoKCdOb2RlICcgKyBkYXRhLnZlcnNpb25zLm5vZGUpO1xuICAgICAgICAgICAgICBuYW1lID0gJ0VsZWN0cm9uJztcbiAgICAgICAgICAgICAgdmVyc2lvbiA9IGRhdGEudmVyc2lvbnMuZWxlY3Ryb247XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBkYXRhLnZlcnNpb25zLm53ID09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgIGRlc2NyaXB0aW9uLnB1c2goJ0Nocm9taXVtICcgKyB2ZXJzaW9uLCAnTm9kZSAnICsgZGF0YS52ZXJzaW9ucy5ub2RlKTtcbiAgICAgICAgICAgICAgbmFtZSA9ICdOVy5qcyc7XG4gICAgICAgICAgICAgIHZlcnNpb24gPSBkYXRhLnZlcnNpb25zLm53O1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIW5hbWUpIHtcbiAgICAgICAgICAgIG5hbWUgPSAnTm9kZS5qcyc7XG4gICAgICAgICAgICBhcmNoID0gZGF0YS5hcmNoO1xuICAgICAgICAgICAgb3MgPSBkYXRhLnBsYXRmb3JtO1xuICAgICAgICAgICAgdmVyc2lvbiA9IC9bXFxkLl0rLy5leGVjKGRhdGEudmVyc2lvbik7XG4gICAgICAgICAgICB2ZXJzaW9uID0gdmVyc2lvbiA/IHZlcnNpb25bMF0gOiBudWxsO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gRGV0ZWN0IEFkb2JlIEFJUi5cbiAgICAgIGVsc2UgaWYgKGdldENsYXNzT2YoKGRhdGEgPSBjb250ZXh0LnJ1bnRpbWUpKSA9PSBhaXJSdW50aW1lQ2xhc3MpIHtcbiAgICAgICAgbmFtZSA9ICdBZG9iZSBBSVInO1xuICAgICAgICBvcyA9IGRhdGEuZmxhc2guc3lzdGVtLkNhcGFiaWxpdGllcy5vcztcbiAgICAgIH1cbiAgICAgIC8vIERldGVjdCBQaGFudG9tSlMuXG4gICAgICBlbHNlIGlmIChnZXRDbGFzc09mKChkYXRhID0gY29udGV4dC5waGFudG9tKSkgPT0gcGhhbnRvbUNsYXNzKSB7XG4gICAgICAgIG5hbWUgPSAnUGhhbnRvbUpTJztcbiAgICAgICAgdmVyc2lvbiA9IChkYXRhID0gZGF0YS52ZXJzaW9uIHx8IG51bGwpICYmIChkYXRhLm1ham9yICsgJy4nICsgZGF0YS5taW5vciArICcuJyArIGRhdGEucGF0Y2gpO1xuICAgICAgfVxuICAgICAgLy8gRGV0ZWN0IElFIGNvbXBhdGliaWxpdHkgbW9kZXMuXG4gICAgICBlbHNlIGlmICh0eXBlb2YgZG9jLmRvY3VtZW50TW9kZSA9PSAnbnVtYmVyJyAmJiAoZGF0YSA9IC9cXGJUcmlkZW50XFwvKFxcZCspL2kuZXhlYyh1YSkpKSB7XG4gICAgICAgIC8vIFdlJ3JlIGluIGNvbXBhdGliaWxpdHkgbW9kZSB3aGVuIHRoZSBUcmlkZW50IHZlcnNpb24gKyA0IGRvZXNuJ3RcbiAgICAgICAgLy8gZXF1YWwgdGhlIGRvY3VtZW50IG1vZGUuXG4gICAgICAgIHZlcnNpb24gPSBbdmVyc2lvbiwgZG9jLmRvY3VtZW50TW9kZV07XG4gICAgICAgIGlmICgoZGF0YSA9ICtkYXRhWzFdICsgNCkgIT0gdmVyc2lvblsxXSkge1xuICAgICAgICAgIGRlc2NyaXB0aW9uLnB1c2goJ0lFICcgKyB2ZXJzaW9uWzFdICsgJyBtb2RlJyk7XG4gICAgICAgICAgbGF5b3V0ICYmIChsYXlvdXRbMV0gPSAnJyk7XG4gICAgICAgICAgdmVyc2lvblsxXSA9IGRhdGE7XG4gICAgICAgIH1cbiAgICAgICAgdmVyc2lvbiA9IG5hbWUgPT0gJ0lFJyA/IFN0cmluZyh2ZXJzaW9uWzFdLnRvRml4ZWQoMSkpIDogdmVyc2lvblswXTtcbiAgICAgIH1cbiAgICAgIC8vIERldGVjdCBJRSAxMSBtYXNraW5nIGFzIG90aGVyIGJyb3dzZXJzLlxuICAgICAgZWxzZSBpZiAodHlwZW9mIGRvYy5kb2N1bWVudE1vZGUgPT0gJ251bWJlcicgJiYgL14oPzpDaHJvbWV8RmlyZWZveClcXGIvLnRlc3QobmFtZSkpIHtcbiAgICAgICAgZGVzY3JpcHRpb24ucHVzaCgnbWFza2luZyBhcyAnICsgbmFtZSArICcgJyArIHZlcnNpb24pO1xuICAgICAgICBuYW1lID0gJ0lFJztcbiAgICAgICAgdmVyc2lvbiA9ICcxMS4wJztcbiAgICAgICAgbGF5b3V0ID0gWydUcmlkZW50J107XG4gICAgICAgIG9zID0gJ1dpbmRvd3MnO1xuICAgICAgfVxuICAgICAgb3MgPSBvcyAmJiBmb3JtYXQob3MpO1xuICAgIH1cbiAgICAvLyBEZXRlY3QgcHJlcmVsZWFzZSBwaGFzZXMuXG4gICAgaWYgKHZlcnNpb24gJiYgKGRhdGEgPVxuICAgICAgICAgIC8oPzpbYWJdfGRwfHByZXxbYWJdXFxkK3ByZSkoPzpcXGQrXFwrPyk/JC9pLmV4ZWModmVyc2lvbikgfHxcbiAgICAgICAgICAvKD86YWxwaGF8YmV0YSkoPzogP1xcZCk/L2kuZXhlYyh1YSArICc7JyArICh1c2VGZWF0dXJlcyAmJiBuYXYuYXBwTWlub3JWZXJzaW9uKSkgfHxcbiAgICAgICAgICAvXFxiTWluZWZpZWxkXFxiL2kudGVzdCh1YSkgJiYgJ2EnXG4gICAgICAgICkpIHtcbiAgICAgIHByZXJlbGVhc2UgPSAvYi9pLnRlc3QoZGF0YSkgPyAnYmV0YScgOiAnYWxwaGEnO1xuICAgICAgdmVyc2lvbiA9IHZlcnNpb24ucmVwbGFjZShSZWdFeHAoZGF0YSArICdcXFxcKz8kJyksICcnKSArXG4gICAgICAgIChwcmVyZWxlYXNlID09ICdiZXRhJyA/IGJldGEgOiBhbHBoYSkgKyAoL1xcZCtcXCs/Ly5leGVjKGRhdGEpIHx8ICcnKTtcbiAgICB9XG4gICAgLy8gRGV0ZWN0IEZpcmVmb3ggTW9iaWxlLlxuICAgIGlmIChuYW1lID09ICdGZW5uZWMnIHx8IG5hbWUgPT0gJ0ZpcmVmb3gnICYmIC9cXGIoPzpBbmRyb2lkfEZpcmVmb3ggT1MpXFxiLy50ZXN0KG9zKSkge1xuICAgICAgbmFtZSA9ICdGaXJlZm94IE1vYmlsZSc7XG4gICAgfVxuICAgIC8vIE9ic2N1cmUgTWF4dGhvbidzIHVucmVsaWFibGUgdmVyc2lvbi5cbiAgICBlbHNlIGlmIChuYW1lID09ICdNYXh0aG9uJyAmJiB2ZXJzaW9uKSB7XG4gICAgICB2ZXJzaW9uID0gdmVyc2lvbi5yZXBsYWNlKC9cXC5bXFxkLl0rLywgJy54Jyk7XG4gICAgfVxuICAgIC8vIERldGVjdCBYYm94IDM2MCBhbmQgWGJveCBPbmUuXG4gICAgZWxzZSBpZiAoL1xcYlhib3hcXGIvaS50ZXN0KHByb2R1Y3QpKSB7XG4gICAgICBpZiAocHJvZHVjdCA9PSAnWGJveCAzNjAnKSB7XG4gICAgICAgIG9zID0gbnVsbDtcbiAgICAgIH1cbiAgICAgIGlmIChwcm9kdWN0ID09ICdYYm94IDM2MCcgJiYgL1xcYklFTW9iaWxlXFxiLy50ZXN0KHVhKSkge1xuICAgICAgICBkZXNjcmlwdGlvbi51bnNoaWZ0KCdtb2JpbGUgbW9kZScpO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBBZGQgbW9iaWxlIHBvc3RmaXguXG4gICAgZWxzZSBpZiAoKC9eKD86Q2hyb21lfElFfE9wZXJhKSQvLnRlc3QobmFtZSkgfHwgbmFtZSAmJiAhcHJvZHVjdCAmJiAhL0Jyb3dzZXJ8TW9iaS8udGVzdChuYW1lKSkgJiZcbiAgICAgICAgKG9zID09ICdXaW5kb3dzIENFJyB8fCAvTW9iaS9pLnRlc3QodWEpKSkge1xuICAgICAgbmFtZSArPSAnIE1vYmlsZSc7XG4gICAgfVxuICAgIC8vIERldGVjdCBJRSBwbGF0Zm9ybSBwcmV2aWV3LlxuICAgIGVsc2UgaWYgKG5hbWUgPT0gJ0lFJyAmJiB1c2VGZWF0dXJlcykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgaWYgKGNvbnRleHQuZXh0ZXJuYWwgPT09IG51bGwpIHtcbiAgICAgICAgICBkZXNjcmlwdGlvbi51bnNoaWZ0KCdwbGF0Zm9ybSBwcmV2aWV3Jyk7XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICBkZXNjcmlwdGlvbi51bnNoaWZ0KCdlbWJlZGRlZCcpO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBEZXRlY3QgQmxhY2tCZXJyeSBPUyB2ZXJzaW9uLlxuICAgIC8vIGh0dHA6Ly9kb2NzLmJsYWNrYmVycnkuY29tL2VuL2RldmVsb3BlcnMvZGVsaXZlcmFibGVzLzE4MTY5L0hUVFBfaGVhZGVyc19zZW50X2J5X0JCX0Jyb3dzZXJfMTIzNDkxMV8xMS5qc3BcbiAgICBlbHNlIGlmICgoL1xcYkJsYWNrQmVycnlcXGIvLnRlc3QocHJvZHVjdCkgfHwgL1xcYkJCMTBcXGIvLnRlc3QodWEpKSAmJiAoZGF0YSA9XG4gICAgICAgICAgKFJlZ0V4cChwcm9kdWN0LnJlcGxhY2UoLyArL2csICcgKicpICsgJy8oWy5cXFxcZF0rKScsICdpJykuZXhlYyh1YSkgfHwgMClbMV0gfHxcbiAgICAgICAgICB2ZXJzaW9uXG4gICAgICAgICkpIHtcbiAgICAgIGRhdGEgPSBbZGF0YSwgL0JCMTAvLnRlc3QodWEpXTtcbiAgICAgIG9zID0gKGRhdGFbMV0gPyAocHJvZHVjdCA9IG51bGwsIG1hbnVmYWN0dXJlciA9ICdCbGFja0JlcnJ5JykgOiAnRGV2aWNlIFNvZnR3YXJlJykgKyAnICcgKyBkYXRhWzBdO1xuICAgICAgdmVyc2lvbiA9IG51bGw7XG4gICAgfVxuICAgIC8vIERldGVjdCBPcGVyYSBpZGVudGlmeWluZy9tYXNraW5nIGl0c2VsZiBhcyBhbm90aGVyIGJyb3dzZXIuXG4gICAgLy8gaHR0cDovL3d3dy5vcGVyYS5jb20vc3VwcG9ydC9rYi92aWV3Lzg0My9cbiAgICBlbHNlIGlmICh0aGlzICE9IGZvck93biAmJiBwcm9kdWN0ICE9ICdXaWknICYmIChcbiAgICAgICAgICAodXNlRmVhdHVyZXMgJiYgb3BlcmEpIHx8XG4gICAgICAgICAgKC9PcGVyYS8udGVzdChuYW1lKSAmJiAvXFxiKD86TVNJRXxGaXJlZm94KVxcYi9pLnRlc3QodWEpKSB8fFxuICAgICAgICAgIChuYW1lID09ICdGaXJlZm94JyAmJiAvXFxiT1MgWCAoPzpcXGQrXFwuKXsyLH0vLnRlc3Qob3MpKSB8fFxuICAgICAgICAgIChuYW1lID09ICdJRScgJiYgKFxuICAgICAgICAgICAgKG9zICYmICEvXldpbi8udGVzdChvcykgJiYgdmVyc2lvbiA+IDUuNSkgfHxcbiAgICAgICAgICAgIC9cXGJXaW5kb3dzIFhQXFxiLy50ZXN0KG9zKSAmJiB2ZXJzaW9uID4gOCB8fFxuICAgICAgICAgICAgdmVyc2lvbiA9PSA4ICYmICEvXFxiVHJpZGVudFxcYi8udGVzdCh1YSlcbiAgICAgICAgICApKVxuICAgICAgICApICYmICFyZU9wZXJhLnRlc3QoKGRhdGEgPSBwYXJzZS5jYWxsKGZvck93biwgdWEucmVwbGFjZShyZU9wZXJhLCAnJykgKyAnOycpKSkgJiYgZGF0YS5uYW1lKSB7XG4gICAgICAvLyBXaGVuIFwiaWRlbnRpZnlpbmdcIiwgdGhlIFVBIGNvbnRhaW5zIGJvdGggT3BlcmEgYW5kIHRoZSBvdGhlciBicm93c2VyJ3MgbmFtZS5cbiAgICAgIGRhdGEgPSAnaW5nIGFzICcgKyBkYXRhLm5hbWUgKyAoKGRhdGEgPSBkYXRhLnZlcnNpb24pID8gJyAnICsgZGF0YSA6ICcnKTtcbiAgICAgIGlmIChyZU9wZXJhLnRlc3QobmFtZSkpIHtcbiAgICAgICAgaWYgKC9cXGJJRVxcYi8udGVzdChkYXRhKSAmJiBvcyA9PSAnTWFjIE9TJykge1xuICAgICAgICAgIG9zID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBkYXRhID0gJ2lkZW50aWZ5JyArIGRhdGE7XG4gICAgICB9XG4gICAgICAvLyBXaGVuIFwibWFza2luZ1wiLCB0aGUgVUEgY29udGFpbnMgb25seSB0aGUgb3RoZXIgYnJvd3NlcidzIG5hbWUuXG4gICAgICBlbHNlIHtcbiAgICAgICAgZGF0YSA9ICdtYXNrJyArIGRhdGE7XG4gICAgICAgIGlmIChvcGVyYUNsYXNzKSB7XG4gICAgICAgICAgbmFtZSA9IGZvcm1hdChvcGVyYUNsYXNzLnJlcGxhY2UoLyhbYS16XSkoW0EtWl0pL2csICckMSAkMicpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBuYW1lID0gJ09wZXJhJztcbiAgICAgICAgfVxuICAgICAgICBpZiAoL1xcYklFXFxiLy50ZXN0KGRhdGEpKSB7XG4gICAgICAgICAgb3MgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdXNlRmVhdHVyZXMpIHtcbiAgICAgICAgICB2ZXJzaW9uID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgbGF5b3V0ID0gWydQcmVzdG8nXTtcbiAgICAgIGRlc2NyaXB0aW9uLnB1c2goZGF0YSk7XG4gICAgfVxuICAgIC8vIERldGVjdCBXZWJLaXQgTmlnaHRseSBhbmQgYXBwcm94aW1hdGUgQ2hyb21lL1NhZmFyaSB2ZXJzaW9ucy5cbiAgICBpZiAoKGRhdGEgPSAoL1xcYkFwcGxlV2ViS2l0XFwvKFtcXGQuXStcXCs/KS9pLmV4ZWModWEpIHx8IDApWzFdKSkge1xuICAgICAgLy8gQ29ycmVjdCBidWlsZCBudW1iZXIgZm9yIG51bWVyaWMgY29tcGFyaXNvbi5cbiAgICAgIC8vIChlLmcuIFwiNTMyLjVcIiBiZWNvbWVzIFwiNTMyLjA1XCIpXG4gICAgICBkYXRhID0gW3BhcnNlRmxvYXQoZGF0YS5yZXBsYWNlKC9cXC4oXFxkKSQvLCAnLjAkMScpKSwgZGF0YV07XG4gICAgICAvLyBOaWdodGx5IGJ1aWxkcyBhcmUgcG9zdGZpeGVkIHdpdGggYSBcIitcIi5cbiAgICAgIGlmIChuYW1lID09ICdTYWZhcmknICYmIGRhdGFbMV0uc2xpY2UoLTEpID09ICcrJykge1xuICAgICAgICBuYW1lID0gJ1dlYktpdCBOaWdodGx5JztcbiAgICAgICAgcHJlcmVsZWFzZSA9ICdhbHBoYSc7XG4gICAgICAgIHZlcnNpb24gPSBkYXRhWzFdLnNsaWNlKDAsIC0xKTtcbiAgICAgIH1cbiAgICAgIC8vIENsZWFyIGluY29ycmVjdCBicm93c2VyIHZlcnNpb25zLlxuICAgICAgZWxzZSBpZiAodmVyc2lvbiA9PSBkYXRhWzFdIHx8XG4gICAgICAgICAgdmVyc2lvbiA9PSAoZGF0YVsyXSA9ICgvXFxiU2FmYXJpXFwvKFtcXGQuXStcXCs/KS9pLmV4ZWModWEpIHx8IDApWzFdKSkge1xuICAgICAgICB2ZXJzaW9uID0gbnVsbDtcbiAgICAgIH1cbiAgICAgIC8vIFVzZSB0aGUgZnVsbCBDaHJvbWUgdmVyc2lvbiB3aGVuIGF2YWlsYWJsZS5cbiAgICAgIGRhdGFbMV0gPSAoL1xcYkNocm9tZVxcLyhbXFxkLl0rKS9pLmV4ZWModWEpIHx8IDApWzFdO1xuICAgICAgLy8gRGV0ZWN0IEJsaW5rIGxheW91dCBlbmdpbmUuXG4gICAgICBpZiAoZGF0YVswXSA9PSA1MzcuMzYgJiYgZGF0YVsyXSA9PSA1MzcuMzYgJiYgcGFyc2VGbG9hdChkYXRhWzFdKSA+PSAyOCAmJiBsYXlvdXQgPT0gJ1dlYktpdCcpIHtcbiAgICAgICAgbGF5b3V0ID0gWydCbGluayddO1xuICAgICAgfVxuICAgICAgLy8gRGV0ZWN0IEphdmFTY3JpcHRDb3JlLlxuICAgICAgLy8gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy82NzY4NDc0L2hvdy1jYW4taS1kZXRlY3Qtd2hpY2gtamF2YXNjcmlwdC1lbmdpbmUtdjgtb3ItanNjLWlzLXVzZWQtYXQtcnVudGltZS1pbi1hbmRyb2lcbiAgICAgIGlmICghdXNlRmVhdHVyZXMgfHwgKCFsaWtlQ2hyb21lICYmICFkYXRhWzFdKSkge1xuICAgICAgICBsYXlvdXQgJiYgKGxheW91dFsxXSA9ICdsaWtlIFNhZmFyaScpO1xuICAgICAgICBkYXRhID0gKGRhdGEgPSBkYXRhWzBdLCBkYXRhIDwgNDAwID8gMSA6IGRhdGEgPCA1MDAgPyAyIDogZGF0YSA8IDUyNiA/IDMgOiBkYXRhIDwgNTMzID8gNCA6IGRhdGEgPCA1MzQgPyAnNCsnIDogZGF0YSA8IDUzNSA/IDUgOiBkYXRhIDwgNTM3ID8gNiA6IGRhdGEgPCA1MzggPyA3IDogZGF0YSA8IDYwMSA/IDggOiAnOCcpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGF5b3V0ICYmIChsYXlvdXRbMV0gPSAnbGlrZSBDaHJvbWUnKTtcbiAgICAgICAgZGF0YSA9IGRhdGFbMV0gfHwgKGRhdGEgPSBkYXRhWzBdLCBkYXRhIDwgNTMwID8gMSA6IGRhdGEgPCA1MzIgPyAyIDogZGF0YSA8IDUzMi4wNSA/IDMgOiBkYXRhIDwgNTMzID8gNCA6IGRhdGEgPCA1MzQuMDMgPyA1IDogZGF0YSA8IDUzNC4wNyA/IDYgOiBkYXRhIDwgNTM0LjEwID8gNyA6IGRhdGEgPCA1MzQuMTMgPyA4IDogZGF0YSA8IDUzNC4xNiA/IDkgOiBkYXRhIDwgNTM0LjI0ID8gMTAgOiBkYXRhIDwgNTM0LjMwID8gMTEgOiBkYXRhIDwgNTM1LjAxID8gMTIgOiBkYXRhIDwgNTM1LjAyID8gJzEzKycgOiBkYXRhIDwgNTM1LjA3ID8gMTUgOiBkYXRhIDwgNTM1LjExID8gMTYgOiBkYXRhIDwgNTM1LjE5ID8gMTcgOiBkYXRhIDwgNTM2LjA1ID8gMTggOiBkYXRhIDwgNTM2LjEwID8gMTkgOiBkYXRhIDwgNTM3LjAxID8gMjAgOiBkYXRhIDwgNTM3LjExID8gJzIxKycgOiBkYXRhIDwgNTM3LjEzID8gMjMgOiBkYXRhIDwgNTM3LjE4ID8gMjQgOiBkYXRhIDwgNTM3LjI0ID8gMjUgOiBkYXRhIDwgNTM3LjM2ID8gMjYgOiBsYXlvdXQgIT0gJ0JsaW5rJyA/ICcyNycgOiAnMjgnKTtcbiAgICAgIH1cbiAgICAgIC8vIEFkZCB0aGUgcG9zdGZpeCBvZiBcIi54XCIgb3IgXCIrXCIgZm9yIGFwcHJveGltYXRlIHZlcnNpb25zLlxuICAgICAgbGF5b3V0ICYmIChsYXlvdXRbMV0gKz0gJyAnICsgKGRhdGEgKz0gdHlwZW9mIGRhdGEgPT0gJ251bWJlcicgPyAnLngnIDogL1suK10vLnRlc3QoZGF0YSkgPyAnJyA6ICcrJykpO1xuICAgICAgLy8gT2JzY3VyZSB2ZXJzaW9uIGZvciBzb21lIFNhZmFyaSAxLTIgcmVsZWFzZXMuXG4gICAgICBpZiAobmFtZSA9PSAnU2FmYXJpJyAmJiAoIXZlcnNpb24gfHwgcGFyc2VJbnQodmVyc2lvbikgPiA0NSkpIHtcbiAgICAgICAgdmVyc2lvbiA9IGRhdGE7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIERldGVjdCBPcGVyYSBkZXNrdG9wIG1vZGVzLlxuICAgIGlmIChuYW1lID09ICdPcGVyYScgJiYgIChkYXRhID0gL1xcYnpib3Z8enZhdiQvLmV4ZWMob3MpKSkge1xuICAgICAgbmFtZSArPSAnICc7XG4gICAgICBkZXNjcmlwdGlvbi51bnNoaWZ0KCdkZXNrdG9wIG1vZGUnKTtcbiAgICAgIGlmIChkYXRhID09ICd6dmF2Jykge1xuICAgICAgICBuYW1lICs9ICdNaW5pJztcbiAgICAgICAgdmVyc2lvbiA9IG51bGw7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBuYW1lICs9ICdNb2JpbGUnO1xuICAgICAgfVxuICAgICAgb3MgPSBvcy5yZXBsYWNlKFJlZ0V4cCgnIConICsgZGF0YSArICckJyksICcnKTtcbiAgICB9XG4gICAgLy8gRGV0ZWN0IENocm9tZSBkZXNrdG9wIG1vZGUuXG4gICAgZWxzZSBpZiAobmFtZSA9PSAnU2FmYXJpJyAmJiAvXFxiQ2hyb21lXFxiLy5leGVjKGxheW91dCAmJiBsYXlvdXRbMV0pKSB7XG4gICAgICBkZXNjcmlwdGlvbi51bnNoaWZ0KCdkZXNrdG9wIG1vZGUnKTtcbiAgICAgIG5hbWUgPSAnQ2hyb21lIE1vYmlsZSc7XG4gICAgICB2ZXJzaW9uID0gbnVsbDtcblxuICAgICAgaWYgKC9cXGJPUyBYXFxiLy50ZXN0KG9zKSkge1xuICAgICAgICBtYW51ZmFjdHVyZXIgPSAnQXBwbGUnO1xuICAgICAgICBvcyA9ICdpT1MgNC4zKyc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvcyA9IG51bGw7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIFN0cmlwIGluY29ycmVjdCBPUyB2ZXJzaW9ucy5cbiAgICBpZiAodmVyc2lvbiAmJiB2ZXJzaW9uLmluZGV4T2YoKGRhdGEgPSAvW1xcZC5dKyQvLmV4ZWMob3MpKSkgPT0gMCAmJlxuICAgICAgICB1YS5pbmRleE9mKCcvJyArIGRhdGEgKyAnLScpID4gLTEpIHtcbiAgICAgIG9zID0gdHJpbShvcy5yZXBsYWNlKGRhdGEsICcnKSk7XG4gICAgfVxuICAgIC8vIEFkZCBsYXlvdXQgZW5naW5lLlxuICAgIGlmIChsYXlvdXQgJiYgIS9cXGIoPzpBdmFudHxOb29rKVxcYi8udGVzdChuYW1lKSAmJiAoXG4gICAgICAgIC9Ccm93c2VyfEx1bmFzY2FwZXxNYXh0aG9uLy50ZXN0KG5hbWUpIHx8XG4gICAgICAgIG5hbWUgIT0gJ1NhZmFyaScgJiYgL15pT1MvLnRlc3Qob3MpICYmIC9cXGJTYWZhcmlcXGIvLnRlc3QobGF5b3V0WzFdKSB8fFxuICAgICAgICAvXig/OkFkb2JlfEFyb3JhfEJyZWFjaHxNaWRvcml8T3BlcmF8UGhhbnRvbXxSZWtvbnF8Um9ja3xTYW1zdW5nIEludGVybmV0fFNsZWlwbmlyfFdlYikvLnRlc3QobmFtZSkgJiYgbGF5b3V0WzFdKSkge1xuICAgICAgLy8gRG9uJ3QgYWRkIGxheW91dCBkZXRhaWxzIHRvIGRlc2NyaXB0aW9uIGlmIHRoZXkgYXJlIGZhbHNleS5cbiAgICAgIChkYXRhID0gbGF5b3V0W2xheW91dC5sZW5ndGggLSAxXSkgJiYgZGVzY3JpcHRpb24ucHVzaChkYXRhKTtcbiAgICB9XG4gICAgLy8gQ29tYmluZSBjb250ZXh0dWFsIGluZm9ybWF0aW9uLlxuICAgIGlmIChkZXNjcmlwdGlvbi5sZW5ndGgpIHtcbiAgICAgIGRlc2NyaXB0aW9uID0gWycoJyArIGRlc2NyaXB0aW9uLmpvaW4oJzsgJykgKyAnKSddO1xuICAgIH1cbiAgICAvLyBBcHBlbmQgbWFudWZhY3R1cmVyIHRvIGRlc2NyaXB0aW9uLlxuICAgIGlmIChtYW51ZmFjdHVyZXIgJiYgcHJvZHVjdCAmJiBwcm9kdWN0LmluZGV4T2YobWFudWZhY3R1cmVyKSA8IDApIHtcbiAgICAgIGRlc2NyaXB0aW9uLnB1c2goJ29uICcgKyBtYW51ZmFjdHVyZXIpO1xuICAgIH1cbiAgICAvLyBBcHBlbmQgcHJvZHVjdCB0byBkZXNjcmlwdGlvbi5cbiAgICBpZiAocHJvZHVjdCkge1xuICAgICAgZGVzY3JpcHRpb24ucHVzaCgoL15vbiAvLnRlc3QoZGVzY3JpcHRpb25bZGVzY3JpcHRpb24ubGVuZ3RoIC0gMV0pID8gJycgOiAnb24gJykgKyBwcm9kdWN0KTtcbiAgICB9XG4gICAgLy8gUGFyc2UgdGhlIE9TIGludG8gYW4gb2JqZWN0LlxuICAgIGlmIChvcykge1xuICAgICAgZGF0YSA9IC8gKFtcXGQuK10rKSQvLmV4ZWMob3MpO1xuICAgICAgaXNTcGVjaWFsQ2FzZWRPUyA9IGRhdGEgJiYgb3MuY2hhckF0KG9zLmxlbmd0aCAtIGRhdGFbMF0ubGVuZ3RoIC0gMSkgPT0gJy8nO1xuICAgICAgb3MgPSB7XG4gICAgICAgICdhcmNoaXRlY3R1cmUnOiAzMixcbiAgICAgICAgJ2ZhbWlseSc6IChkYXRhICYmICFpc1NwZWNpYWxDYXNlZE9TKSA/IG9zLnJlcGxhY2UoZGF0YVswXSwgJycpIDogb3MsXG4gICAgICAgICd2ZXJzaW9uJzogZGF0YSA/IGRhdGFbMV0gOiBudWxsLFxuICAgICAgICAndG9TdHJpbmcnOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgdmVyc2lvbiA9IHRoaXMudmVyc2lvbjtcbiAgICAgICAgICByZXR1cm4gdGhpcy5mYW1pbHkgKyAoKHZlcnNpb24gJiYgIWlzU3BlY2lhbENhc2VkT1MpID8gJyAnICsgdmVyc2lvbiA6ICcnKSArICh0aGlzLmFyY2hpdGVjdHVyZSA9PSA2NCA/ICcgNjQtYml0JyA6ICcnKTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9XG4gICAgLy8gQWRkIGJyb3dzZXIvT1MgYXJjaGl0ZWN0dXJlLlxuICAgIGlmICgoZGF0YSA9IC9cXGIoPzpBTUR8SUF8V2lufFdPV3x4ODZffHgpNjRcXGIvaS5leGVjKGFyY2gpKSAmJiAhL1xcYmk2ODZcXGIvaS50ZXN0KGFyY2gpKSB7XG4gICAgICBpZiAob3MpIHtcbiAgICAgICAgb3MuYXJjaGl0ZWN0dXJlID0gNjQ7XG4gICAgICAgIG9zLmZhbWlseSA9IG9zLmZhbWlseS5yZXBsYWNlKFJlZ0V4cCgnIConICsgZGF0YSksICcnKTtcbiAgICAgIH1cbiAgICAgIGlmIChcbiAgICAgICAgICBuYW1lICYmICgvXFxiV09XNjRcXGIvaS50ZXN0KHVhKSB8fFxuICAgICAgICAgICh1c2VGZWF0dXJlcyAmJiAvXFx3KD86ODZ8MzIpJC8udGVzdChuYXYuY3B1Q2xhc3MgfHwgbmF2LnBsYXRmb3JtKSAmJiAhL1xcYldpbjY0OyB4NjRcXGIvaS50ZXN0KHVhKSkpXG4gICAgICApIHtcbiAgICAgICAgZGVzY3JpcHRpb24udW5zaGlmdCgnMzItYml0Jyk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIENocm9tZSAzOSBhbmQgYWJvdmUgb24gT1MgWCBpcyBhbHdheXMgNjQtYml0LlxuICAgIGVsc2UgaWYgKFxuICAgICAgICBvcyAmJiAvXk9TIFgvLnRlc3Qob3MuZmFtaWx5KSAmJlxuICAgICAgICBuYW1lID09ICdDaHJvbWUnICYmIHBhcnNlRmxvYXQodmVyc2lvbikgPj0gMzlcbiAgICApIHtcbiAgICAgIG9zLmFyY2hpdGVjdHVyZSA9IDY0O1xuICAgIH1cblxuICAgIHVhIHx8ICh1YSA9IG51bGwpO1xuXG4gICAgLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG4gICAgLyoqXG4gICAgICogVGhlIHBsYXRmb3JtIG9iamVjdC5cbiAgICAgKlxuICAgICAqIEBuYW1lIHBsYXRmb3JtXG4gICAgICogQHR5cGUgT2JqZWN0XG4gICAgICovXG4gICAgdmFyIHBsYXRmb3JtID0ge307XG5cbiAgICAvKipcbiAgICAgKiBUaGUgcGxhdGZvcm0gZGVzY3JpcHRpb24uXG4gICAgICpcbiAgICAgKiBAbWVtYmVyT2YgcGxhdGZvcm1cbiAgICAgKiBAdHlwZSBzdHJpbmd8bnVsbFxuICAgICAqL1xuICAgIHBsYXRmb3JtLmRlc2NyaXB0aW9uID0gdWE7XG5cbiAgICAvKipcbiAgICAgKiBUaGUgbmFtZSBvZiB0aGUgYnJvd3NlcidzIGxheW91dCBlbmdpbmUuXG4gICAgICpcbiAgICAgKiBUaGUgbGlzdCBvZiBjb21tb24gbGF5b3V0IGVuZ2luZXMgaW5jbHVkZTpcbiAgICAgKiBcIkJsaW5rXCIsIFwiRWRnZUhUTUxcIiwgXCJHZWNrb1wiLCBcIlRyaWRlbnRcIiBhbmQgXCJXZWJLaXRcIlxuICAgICAqXG4gICAgICogQG1lbWJlck9mIHBsYXRmb3JtXG4gICAgICogQHR5cGUgc3RyaW5nfG51bGxcbiAgICAgKi9cbiAgICBwbGF0Zm9ybS5sYXlvdXQgPSBsYXlvdXQgJiYgbGF5b3V0WzBdO1xuXG4gICAgLyoqXG4gICAgICogVGhlIG5hbWUgb2YgdGhlIHByb2R1Y3QncyBtYW51ZmFjdHVyZXIuXG4gICAgICpcbiAgICAgKiBUaGUgbGlzdCBvZiBtYW51ZmFjdHVyZXJzIGluY2x1ZGU6XG4gICAgICogXCJBcHBsZVwiLCBcIkFyY2hvc1wiLCBcIkFtYXpvblwiLCBcIkFzdXNcIiwgXCJCYXJuZXMgJiBOb2JsZVwiLCBcIkJsYWNrQmVycnlcIixcbiAgICAgKiBcIkdvb2dsZVwiLCBcIkhQXCIsIFwiSFRDXCIsIFwiTEdcIiwgXCJNaWNyb3NvZnRcIiwgXCJNb3Rvcm9sYVwiLCBcIk5pbnRlbmRvXCIsXG4gICAgICogXCJOb2tpYVwiLCBcIlNhbXN1bmdcIiBhbmQgXCJTb255XCJcbiAgICAgKlxuICAgICAqIEBtZW1iZXJPZiBwbGF0Zm9ybVxuICAgICAqIEB0eXBlIHN0cmluZ3xudWxsXG4gICAgICovXG4gICAgcGxhdGZvcm0ubWFudWZhY3R1cmVyID0gbWFudWZhY3R1cmVyO1xuXG4gICAgLyoqXG4gICAgICogVGhlIG5hbWUgb2YgdGhlIGJyb3dzZXIvZW52aXJvbm1lbnQuXG4gICAgICpcbiAgICAgKiBUaGUgbGlzdCBvZiBjb21tb24gYnJvd3NlciBuYW1lcyBpbmNsdWRlOlxuICAgICAqIFwiQ2hyb21lXCIsIFwiRWxlY3Ryb25cIiwgXCJGaXJlZm94XCIsIFwiRmlyZWZveCBmb3IgaU9TXCIsIFwiSUVcIixcbiAgICAgKiBcIk1pY3Jvc29mdCBFZGdlXCIsIFwiUGhhbnRvbUpTXCIsIFwiU2FmYXJpXCIsIFwiU2VhTW9ua2V5XCIsIFwiU2lsa1wiLFxuICAgICAqIFwiT3BlcmEgTWluaVwiIGFuZCBcIk9wZXJhXCJcbiAgICAgKlxuICAgICAqIE1vYmlsZSB2ZXJzaW9ucyBvZiBzb21lIGJyb3dzZXJzIGhhdmUgXCJNb2JpbGVcIiBhcHBlbmRlZCB0byB0aGVpciBuYW1lOlxuICAgICAqIGVnLiBcIkNocm9tZSBNb2JpbGVcIiwgXCJGaXJlZm94IE1vYmlsZVwiLCBcIklFIE1vYmlsZVwiIGFuZCBcIk9wZXJhIE1vYmlsZVwiXG4gICAgICpcbiAgICAgKiBAbWVtYmVyT2YgcGxhdGZvcm1cbiAgICAgKiBAdHlwZSBzdHJpbmd8bnVsbFxuICAgICAqL1xuICAgIHBsYXRmb3JtLm5hbWUgPSBuYW1lO1xuXG4gICAgLyoqXG4gICAgICogVGhlIGFscGhhL2JldGEgcmVsZWFzZSBpbmRpY2F0b3IuXG4gICAgICpcbiAgICAgKiBAbWVtYmVyT2YgcGxhdGZvcm1cbiAgICAgKiBAdHlwZSBzdHJpbmd8bnVsbFxuICAgICAqL1xuICAgIHBsYXRmb3JtLnByZXJlbGVhc2UgPSBwcmVyZWxlYXNlO1xuXG4gICAgLyoqXG4gICAgICogVGhlIG5hbWUgb2YgdGhlIHByb2R1Y3QgaG9zdGluZyB0aGUgYnJvd3Nlci5cbiAgICAgKlxuICAgICAqIFRoZSBsaXN0IG9mIGNvbW1vbiBwcm9kdWN0cyBpbmNsdWRlOlxuICAgICAqXG4gICAgICogXCJCbGFja0JlcnJ5XCIsIFwiR2FsYXh5IFM0XCIsIFwiTHVtaWFcIiwgXCJpUGFkXCIsIFwiaVBvZFwiLCBcImlQaG9uZVwiLCBcIktpbmRsZVwiLFxuICAgICAqIFwiS2luZGxlIEZpcmVcIiwgXCJOZXh1c1wiLCBcIk5vb2tcIiwgXCJQbGF5Qm9va1wiLCBcIlRvdWNoUGFkXCIgYW5kIFwiVHJhbnNmb3JtZXJcIlxuICAgICAqXG4gICAgICogQG1lbWJlck9mIHBsYXRmb3JtXG4gICAgICogQHR5cGUgc3RyaW5nfG51bGxcbiAgICAgKi9cbiAgICBwbGF0Zm9ybS5wcm9kdWN0ID0gcHJvZHVjdDtcblxuICAgIC8qKlxuICAgICAqIFRoZSBicm93c2VyJ3MgdXNlciBhZ2VudCBzdHJpbmcuXG4gICAgICpcbiAgICAgKiBAbWVtYmVyT2YgcGxhdGZvcm1cbiAgICAgKiBAdHlwZSBzdHJpbmd8bnVsbFxuICAgICAqL1xuICAgIHBsYXRmb3JtLnVhID0gdWE7XG5cbiAgICAvKipcbiAgICAgKiBUaGUgYnJvd3Nlci9lbnZpcm9ubWVudCB2ZXJzaW9uLlxuICAgICAqXG4gICAgICogQG1lbWJlck9mIHBsYXRmb3JtXG4gICAgICogQHR5cGUgc3RyaW5nfG51bGxcbiAgICAgKi9cbiAgICBwbGF0Zm9ybS52ZXJzaW9uID0gbmFtZSAmJiB2ZXJzaW9uO1xuXG4gICAgLyoqXG4gICAgICogVGhlIG5hbWUgb2YgdGhlIG9wZXJhdGluZyBzeXN0ZW0uXG4gICAgICpcbiAgICAgKiBAbWVtYmVyT2YgcGxhdGZvcm1cbiAgICAgKiBAdHlwZSBPYmplY3RcbiAgICAgKi9cbiAgICBwbGF0Zm9ybS5vcyA9IG9zIHx8IHtcblxuICAgICAgLyoqXG4gICAgICAgKiBUaGUgQ1BVIGFyY2hpdGVjdHVyZSB0aGUgT1MgaXMgYnVpbHQgZm9yLlxuICAgICAgICpcbiAgICAgICAqIEBtZW1iZXJPZiBwbGF0Zm9ybS5vc1xuICAgICAgICogQHR5cGUgbnVtYmVyfG51bGxcbiAgICAgICAqL1xuICAgICAgJ2FyY2hpdGVjdHVyZSc6IG51bGwsXG5cbiAgICAgIC8qKlxuICAgICAgICogVGhlIGZhbWlseSBvZiB0aGUgT1MuXG4gICAgICAgKlxuICAgICAgICogQ29tbW9uIHZhbHVlcyBpbmNsdWRlOlxuICAgICAgICogXCJXaW5kb3dzXCIsIFwiV2luZG93cyBTZXJ2ZXIgMjAwOCBSMiAvIDdcIiwgXCJXaW5kb3dzIFNlcnZlciAyMDA4IC8gVmlzdGFcIixcbiAgICAgICAqIFwiV2luZG93cyBYUFwiLCBcIk9TIFhcIiwgXCJVYnVudHVcIiwgXCJEZWJpYW5cIiwgXCJGZWRvcmFcIiwgXCJSZWQgSGF0XCIsIFwiU3VTRVwiLFxuICAgICAgICogXCJBbmRyb2lkXCIsIFwiaU9TXCIgYW5kIFwiV2luZG93cyBQaG9uZVwiXG4gICAgICAgKlxuICAgICAgICogQG1lbWJlck9mIHBsYXRmb3JtLm9zXG4gICAgICAgKiBAdHlwZSBzdHJpbmd8bnVsbFxuICAgICAgICovXG4gICAgICAnZmFtaWx5JzogbnVsbCxcblxuICAgICAgLyoqXG4gICAgICAgKiBUaGUgdmVyc2lvbiBvZiB0aGUgT1MuXG4gICAgICAgKlxuICAgICAgICogQG1lbWJlck9mIHBsYXRmb3JtLm9zXG4gICAgICAgKiBAdHlwZSBzdHJpbmd8bnVsbFxuICAgICAgICovXG4gICAgICAndmVyc2lvbic6IG51bGwsXG5cbiAgICAgIC8qKlxuICAgICAgICogUmV0dXJucyB0aGUgT1Mgc3RyaW5nLlxuICAgICAgICpcbiAgICAgICAqIEBtZW1iZXJPZiBwbGF0Zm9ybS5vc1xuICAgICAgICogQHJldHVybnMge3N0cmluZ30gVGhlIE9TIHN0cmluZy5cbiAgICAgICAqL1xuICAgICAgJ3RvU3RyaW5nJzogZnVuY3Rpb24oKSB7IHJldHVybiAnbnVsbCc7IH1cbiAgICB9O1xuXG4gICAgcGxhdGZvcm0ucGFyc2UgPSBwYXJzZTtcbiAgICBwbGF0Zm9ybS50b1N0cmluZyA9IHRvU3RyaW5nUGxhdGZvcm07XG5cbiAgICBpZiAocGxhdGZvcm0udmVyc2lvbikge1xuICAgICAgZGVzY3JpcHRpb24udW5zaGlmdCh2ZXJzaW9uKTtcbiAgICB9XG4gICAgaWYgKHBsYXRmb3JtLm5hbWUpIHtcbiAgICAgIGRlc2NyaXB0aW9uLnVuc2hpZnQobmFtZSk7XG4gICAgfVxuICAgIGlmIChvcyAmJiBuYW1lICYmICEob3MgPT0gU3RyaW5nKG9zKS5zcGxpdCgnICcpWzBdICYmIChvcyA9PSBuYW1lLnNwbGl0KCcgJylbMF0gfHwgcHJvZHVjdCkpKSB7XG4gICAgICBkZXNjcmlwdGlvbi5wdXNoKHByb2R1Y3QgPyAnKCcgKyBvcyArICcpJyA6ICdvbiAnICsgb3MpO1xuICAgIH1cbiAgICBpZiAoZGVzY3JpcHRpb24ubGVuZ3RoKSB7XG4gICAgICBwbGF0Zm9ybS5kZXNjcmlwdGlvbiA9IGRlc2NyaXB0aW9uLmpvaW4oJyAnKTtcbiAgICB9XG4gICAgcmV0dXJuIHBsYXRmb3JtO1xuICB9XG5cbiAgLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cbiAgLy8gRXhwb3J0IHBsYXRmb3JtLlxuICB2YXIgcGxhdGZvcm0gPSBwYXJzZSgpO1xuXG4gIC8vIFNvbWUgQU1EIGJ1aWxkIG9wdGltaXplcnMsIGxpa2Ugci5qcywgY2hlY2sgZm9yIGNvbmRpdGlvbiBwYXR0ZXJucyBsaWtlIHRoZSBmb2xsb3dpbmc6XG4gIGlmICh0eXBlb2YgZGVmaW5lID09ICdmdW5jdGlvbicgJiYgdHlwZW9mIGRlZmluZS5hbWQgPT0gJ29iamVjdCcgJiYgZGVmaW5lLmFtZCkge1xuICAgIC8vIEV4cG9zZSBwbGF0Zm9ybSBvbiB0aGUgZ2xvYmFsIG9iamVjdCB0byBwcmV2ZW50IGVycm9ycyB3aGVuIHBsYXRmb3JtIGlzXG4gICAgLy8gbG9hZGVkIGJ5IGEgc2NyaXB0IHRhZyBpbiB0aGUgcHJlc2VuY2Ugb2YgYW4gQU1EIGxvYWRlci5cbiAgICAvLyBTZWUgaHR0cDovL3JlcXVpcmVqcy5vcmcvZG9jcy9lcnJvcnMuaHRtbCNtaXNtYXRjaCBmb3IgbW9yZSBkZXRhaWxzLlxuICAgIHJvb3QucGxhdGZvcm0gPSBwbGF0Zm9ybTtcblxuICAgIC8vIERlZmluZSBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlIHNvIHBsYXRmb3JtIGNhbiBiZSBhbGlhc2VkIHRocm91Z2ggcGF0aCBtYXBwaW5nLlxuICAgIGRlZmluZShmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBwbGF0Zm9ybTtcbiAgICB9KTtcbiAgfVxuICAvLyBDaGVjayBmb3IgYGV4cG9ydHNgIGFmdGVyIGBkZWZpbmVgIGluIGNhc2UgYSBidWlsZCBvcHRpbWl6ZXIgYWRkcyBhbiBgZXhwb3J0c2Agb2JqZWN0LlxuICBlbHNlIGlmIChmcmVlRXhwb3J0cyAmJiBmcmVlTW9kdWxlKSB7XG4gICAgLy8gRXhwb3J0IGZvciBDb21tb25KUyBzdXBwb3J0LlxuICAgIGZvck93bihwbGF0Zm9ybSwgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgZnJlZUV4cG9ydHNba2V5XSA9IHZhbHVlO1xuICAgIH0pO1xuICB9XG4gIGVsc2Uge1xuICAgIC8vIEV4cG9ydCB0byB0aGUgZ2xvYmFsIG9iamVjdC5cbiAgICByb290LnBsYXRmb3JtID0gcGxhdGZvcm07XG4gIH1cbn0uY2FsbCh0aGlzKSk7XG4iLCJ2YXIgdjEgPSByZXF1aXJlKCcuL3YxJyk7XG52YXIgdjQgPSByZXF1aXJlKCcuL3Y0Jyk7XG5cbnZhciB1dWlkID0gdjQ7XG51dWlkLnYxID0gdjE7XG51dWlkLnY0ID0gdjQ7XG5cbm1vZHVsZS5leHBvcnRzID0gdXVpZDtcbiIsIi8qKlxuICogQ29udmVydCBhcnJheSBvZiAxNiBieXRlIHZhbHVlcyB0byBVVUlEIHN0cmluZyBmb3JtYXQgb2YgdGhlIGZvcm06XG4gKiBYWFhYWFhYWC1YWFhYLVhYWFgtWFhYWC1YWFhYWFhYWFhYWFhcbiAqL1xudmFyIGJ5dGVUb0hleCA9IFtdO1xuZm9yICh2YXIgaSA9IDA7IGkgPCAyNTY7ICsraSkge1xuICBieXRlVG9IZXhbaV0gPSAoaSArIDB4MTAwKS50b1N0cmluZygxNikuc3Vic3RyKDEpO1xufVxuXG5mdW5jdGlvbiBieXRlc1RvVXVpZChidWYsIG9mZnNldCkge1xuICB2YXIgaSA9IG9mZnNldCB8fCAwO1xuICB2YXIgYnRoID0gYnl0ZVRvSGV4O1xuICByZXR1cm4gYnRoW2J1ZltpKytdXSArIGJ0aFtidWZbaSsrXV0gK1xuICAgICAgICAgIGJ0aFtidWZbaSsrXV0gKyBidGhbYnVmW2krK11dICsgJy0nICtcbiAgICAgICAgICBidGhbYnVmW2krK11dICsgYnRoW2J1ZltpKytdXSArICctJyArXG4gICAgICAgICAgYnRoW2J1ZltpKytdXSArIGJ0aFtidWZbaSsrXV0gKyAnLScgK1xuICAgICAgICAgIGJ0aFtidWZbaSsrXV0gKyBidGhbYnVmW2krK11dICsgJy0nICtcbiAgICAgICAgICBidGhbYnVmW2krK11dICsgYnRoW2J1ZltpKytdXSArXG4gICAgICAgICAgYnRoW2J1ZltpKytdXSArIGJ0aFtidWZbaSsrXV0gK1xuICAgICAgICAgIGJ0aFtidWZbaSsrXV0gKyBidGhbYnVmW2krK11dO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGJ5dGVzVG9VdWlkO1xuIiwiLy8gVW5pcXVlIElEIGNyZWF0aW9uIHJlcXVpcmVzIGEgaGlnaCBxdWFsaXR5IHJhbmRvbSAjIGdlbmVyYXRvci4gIEluIHRoZVxuLy8gYnJvd3NlciB0aGlzIGlzIGEgbGl0dGxlIGNvbXBsaWNhdGVkIGR1ZSB0byB1bmtub3duIHF1YWxpdHkgb2YgTWF0aC5yYW5kb20oKVxuLy8gYW5kIGluY29uc2lzdGVudCBzdXBwb3J0IGZvciB0aGUgYGNyeXB0b2AgQVBJLiAgV2UgZG8gdGhlIGJlc3Qgd2UgY2FuIHZpYVxuLy8gZmVhdHVyZS1kZXRlY3Rpb25cblxuLy8gZ2V0UmFuZG9tVmFsdWVzIG5lZWRzIHRvIGJlIGludm9rZWQgaW4gYSBjb250ZXh0IHdoZXJlIFwidGhpc1wiIGlzIGEgQ3J5cHRvIGltcGxlbWVudGF0aW9uLlxudmFyIGdldFJhbmRvbVZhbHVlcyA9ICh0eXBlb2YoY3J5cHRvKSAhPSAndW5kZWZpbmVkJyAmJiBjcnlwdG8uZ2V0UmFuZG9tVmFsdWVzLmJpbmQoY3J5cHRvKSkgfHxcbiAgICAgICAgICAgICAgICAgICAgICAodHlwZW9mKG1zQ3J5cHRvKSAhPSAndW5kZWZpbmVkJyAmJiBtc0NyeXB0by5nZXRSYW5kb21WYWx1ZXMuYmluZChtc0NyeXB0bykpO1xuaWYgKGdldFJhbmRvbVZhbHVlcykge1xuICAvLyBXSEFUV0cgY3J5cHRvIFJORyAtIGh0dHA6Ly93aWtpLndoYXR3Zy5vcmcvd2lraS9DcnlwdG9cbiAgdmFyIHJuZHM4ID0gbmV3IFVpbnQ4QXJyYXkoMTYpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXVuZGVmXG5cbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiB3aGF0d2dSTkcoKSB7XG4gICAgZ2V0UmFuZG9tVmFsdWVzKHJuZHM4KTtcbiAgICByZXR1cm4gcm5kczg7XG4gIH07XG59IGVsc2Uge1xuICAvLyBNYXRoLnJhbmRvbSgpLWJhc2VkIChSTkcpXG4gIC8vXG4gIC8vIElmIGFsbCBlbHNlIGZhaWxzLCB1c2UgTWF0aC5yYW5kb20oKS4gIEl0J3MgZmFzdCwgYnV0IGlzIG9mIHVuc3BlY2lmaWVkXG4gIC8vIHF1YWxpdHkuXG4gIHZhciBybmRzID0gbmV3IEFycmF5KDE2KTtcblxuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIG1hdGhSTkcoKSB7XG4gICAgZm9yICh2YXIgaSA9IDAsIHI7IGkgPCAxNjsgaSsrKSB7XG4gICAgICBpZiAoKGkgJiAweDAzKSA9PT0gMCkgciA9IE1hdGgucmFuZG9tKCkgKiAweDEwMDAwMDAwMDtcbiAgICAgIHJuZHNbaV0gPSByID4+PiAoKGkgJiAweDAzKSA8PCAzKSAmIDB4ZmY7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJuZHM7XG4gIH07XG59XG4iLCJ2YXIgcm5nID0gcmVxdWlyZSgnLi9saWIvcm5nJyk7XG52YXIgYnl0ZXNUb1V1aWQgPSByZXF1aXJlKCcuL2xpYi9ieXRlc1RvVXVpZCcpO1xuXG4vLyAqKmB2MSgpYCAtIEdlbmVyYXRlIHRpbWUtYmFzZWQgVVVJRCoqXG4vL1xuLy8gSW5zcGlyZWQgYnkgaHR0cHM6Ly9naXRodWIuY29tL0xpb3NLL1VVSUQuanNcbi8vIGFuZCBodHRwOi8vZG9jcy5weXRob24ub3JnL2xpYnJhcnkvdXVpZC5odG1sXG5cbnZhciBfbm9kZUlkO1xudmFyIF9jbG9ja3NlcTtcblxuLy8gUHJldmlvdXMgdXVpZCBjcmVhdGlvbiB0aW1lXG52YXIgX2xhc3RNU2VjcyA9IDA7XG52YXIgX2xhc3ROU2VjcyA9IDA7XG5cbi8vIFNlZSBodHRwczovL2dpdGh1Yi5jb20vYnJvb2ZhL25vZGUtdXVpZCBmb3IgQVBJIGRldGFpbHNcbmZ1bmN0aW9uIHYxKG9wdGlvbnMsIGJ1Ziwgb2Zmc2V0KSB7XG4gIHZhciBpID0gYnVmICYmIG9mZnNldCB8fCAwO1xuICB2YXIgYiA9IGJ1ZiB8fCBbXTtcblxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgdmFyIG5vZGUgPSBvcHRpb25zLm5vZGUgfHwgX25vZGVJZDtcbiAgdmFyIGNsb2Nrc2VxID0gb3B0aW9ucy5jbG9ja3NlcSAhPT0gdW5kZWZpbmVkID8gb3B0aW9ucy5jbG9ja3NlcSA6IF9jbG9ja3NlcTtcblxuICAvLyBub2RlIGFuZCBjbG9ja3NlcSBuZWVkIHRvIGJlIGluaXRpYWxpemVkIHRvIHJhbmRvbSB2YWx1ZXMgaWYgdGhleSdyZSBub3RcbiAgLy8gc3BlY2lmaWVkLiAgV2UgZG8gdGhpcyBsYXppbHkgdG8gbWluaW1pemUgaXNzdWVzIHJlbGF0ZWQgdG8gaW5zdWZmaWNpZW50XG4gIC8vIHN5c3RlbSBlbnRyb3B5LiAgU2VlICMxODlcbiAgaWYgKG5vZGUgPT0gbnVsbCB8fCBjbG9ja3NlcSA9PSBudWxsKSB7XG4gICAgdmFyIHNlZWRCeXRlcyA9IHJuZygpO1xuICAgIGlmIChub2RlID09IG51bGwpIHtcbiAgICAgIC8vIFBlciA0LjUsIGNyZWF0ZSBhbmQgNDgtYml0IG5vZGUgaWQsICg0NyByYW5kb20gYml0cyArIG11bHRpY2FzdCBiaXQgPSAxKVxuICAgICAgbm9kZSA9IF9ub2RlSWQgPSBbXG4gICAgICAgIHNlZWRCeXRlc1swXSB8IDB4MDEsXG4gICAgICAgIHNlZWRCeXRlc1sxXSwgc2VlZEJ5dGVzWzJdLCBzZWVkQnl0ZXNbM10sIHNlZWRCeXRlc1s0XSwgc2VlZEJ5dGVzWzVdXG4gICAgICBdO1xuICAgIH1cbiAgICBpZiAoY2xvY2tzZXEgPT0gbnVsbCkge1xuICAgICAgLy8gUGVyIDQuMi4yLCByYW5kb21pemUgKDE0IGJpdCkgY2xvY2tzZXFcbiAgICAgIGNsb2Nrc2VxID0gX2Nsb2Nrc2VxID0gKHNlZWRCeXRlc1s2XSA8PCA4IHwgc2VlZEJ5dGVzWzddKSAmIDB4M2ZmZjtcbiAgICB9XG4gIH1cblxuICAvLyBVVUlEIHRpbWVzdGFtcHMgYXJlIDEwMCBuYW5vLXNlY29uZCB1bml0cyBzaW5jZSB0aGUgR3JlZ29yaWFuIGVwb2NoLFxuICAvLyAoMTU4Mi0xMC0xNSAwMDowMCkuICBKU051bWJlcnMgYXJlbid0IHByZWNpc2UgZW5vdWdoIGZvciB0aGlzLCBzb1xuICAvLyB0aW1lIGlzIGhhbmRsZWQgaW50ZXJuYWxseSBhcyAnbXNlY3MnIChpbnRlZ2VyIG1pbGxpc2Vjb25kcykgYW5kICduc2VjcydcbiAgLy8gKDEwMC1uYW5vc2Vjb25kcyBvZmZzZXQgZnJvbSBtc2Vjcykgc2luY2UgdW5peCBlcG9jaCwgMTk3MC0wMS0wMSAwMDowMC5cbiAgdmFyIG1zZWNzID0gb3B0aW9ucy5tc2VjcyAhPT0gdW5kZWZpbmVkID8gb3B0aW9ucy5tc2VjcyA6IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuXG4gIC8vIFBlciA0LjIuMS4yLCB1c2UgY291bnQgb2YgdXVpZCdzIGdlbmVyYXRlZCBkdXJpbmcgdGhlIGN1cnJlbnQgY2xvY2tcbiAgLy8gY3ljbGUgdG8gc2ltdWxhdGUgaGlnaGVyIHJlc29sdXRpb24gY2xvY2tcbiAgdmFyIG5zZWNzID0gb3B0aW9ucy5uc2VjcyAhPT0gdW5kZWZpbmVkID8gb3B0aW9ucy5uc2VjcyA6IF9sYXN0TlNlY3MgKyAxO1xuXG4gIC8vIFRpbWUgc2luY2UgbGFzdCB1dWlkIGNyZWF0aW9uIChpbiBtc2VjcylcbiAgdmFyIGR0ID0gKG1zZWNzIC0gX2xhc3RNU2VjcykgKyAobnNlY3MgLSBfbGFzdE5TZWNzKS8xMDAwMDtcblxuICAvLyBQZXIgNC4yLjEuMiwgQnVtcCBjbG9ja3NlcSBvbiBjbG9jayByZWdyZXNzaW9uXG4gIGlmIChkdCA8IDAgJiYgb3B0aW9ucy5jbG9ja3NlcSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgY2xvY2tzZXEgPSBjbG9ja3NlcSArIDEgJiAweDNmZmY7XG4gIH1cblxuICAvLyBSZXNldCBuc2VjcyBpZiBjbG9jayByZWdyZXNzZXMgKG5ldyBjbG9ja3NlcSkgb3Igd2UndmUgbW92ZWQgb250byBhIG5ld1xuICAvLyB0aW1lIGludGVydmFsXG4gIGlmICgoZHQgPCAwIHx8IG1zZWNzID4gX2xhc3RNU2VjcykgJiYgb3B0aW9ucy5uc2VjcyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgbnNlY3MgPSAwO1xuICB9XG5cbiAgLy8gUGVyIDQuMi4xLjIgVGhyb3cgZXJyb3IgaWYgdG9vIG1hbnkgdXVpZHMgYXJlIHJlcXVlc3RlZFxuICBpZiAobnNlY3MgPj0gMTAwMDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3V1aWQudjEoKTogQ2FuXFwndCBjcmVhdGUgbW9yZSB0aGFuIDEwTSB1dWlkcy9zZWMnKTtcbiAgfVxuXG4gIF9sYXN0TVNlY3MgPSBtc2VjcztcbiAgX2xhc3ROU2VjcyA9IG5zZWNzO1xuICBfY2xvY2tzZXEgPSBjbG9ja3NlcTtcblxuICAvLyBQZXIgNC4xLjQgLSBDb252ZXJ0IGZyb20gdW5peCBlcG9jaCB0byBHcmVnb3JpYW4gZXBvY2hcbiAgbXNlY3MgKz0gMTIyMTkyOTI4MDAwMDA7XG5cbiAgLy8gYHRpbWVfbG93YFxuICB2YXIgdGwgPSAoKG1zZWNzICYgMHhmZmZmZmZmKSAqIDEwMDAwICsgbnNlY3MpICUgMHgxMDAwMDAwMDA7XG4gIGJbaSsrXSA9IHRsID4+PiAyNCAmIDB4ZmY7XG4gIGJbaSsrXSA9IHRsID4+PiAxNiAmIDB4ZmY7XG4gIGJbaSsrXSA9IHRsID4+PiA4ICYgMHhmZjtcbiAgYltpKytdID0gdGwgJiAweGZmO1xuXG4gIC8vIGB0aW1lX21pZGBcbiAgdmFyIHRtaCA9IChtc2VjcyAvIDB4MTAwMDAwMDAwICogMTAwMDApICYgMHhmZmZmZmZmO1xuICBiW2krK10gPSB0bWggPj4+IDggJiAweGZmO1xuICBiW2krK10gPSB0bWggJiAweGZmO1xuXG4gIC8vIGB0aW1lX2hpZ2hfYW5kX3ZlcnNpb25gXG4gIGJbaSsrXSA9IHRtaCA+Pj4gMjQgJiAweGYgfCAweDEwOyAvLyBpbmNsdWRlIHZlcnNpb25cbiAgYltpKytdID0gdG1oID4+PiAxNiAmIDB4ZmY7XG5cbiAgLy8gYGNsb2NrX3NlcV9oaV9hbmRfcmVzZXJ2ZWRgIChQZXIgNC4yLjIgLSBpbmNsdWRlIHZhcmlhbnQpXG4gIGJbaSsrXSA9IGNsb2Nrc2VxID4+PiA4IHwgMHg4MDtcblxuICAvLyBgY2xvY2tfc2VxX2xvd2BcbiAgYltpKytdID0gY2xvY2tzZXEgJiAweGZmO1xuXG4gIC8vIGBub2RlYFxuICBmb3IgKHZhciBuID0gMDsgbiA8IDY7ICsrbikge1xuICAgIGJbaSArIG5dID0gbm9kZVtuXTtcbiAgfVxuXG4gIHJldHVybiBidWYgPyBidWYgOiBieXRlc1RvVXVpZChiKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB2MTtcbiIsInZhciBybmcgPSByZXF1aXJlKCcuL2xpYi9ybmcnKTtcbnZhciBieXRlc1RvVXVpZCA9IHJlcXVpcmUoJy4vbGliL2J5dGVzVG9VdWlkJyk7XG5cbmZ1bmN0aW9uIHY0KG9wdGlvbnMsIGJ1Ziwgb2Zmc2V0KSB7XG4gIHZhciBpID0gYnVmICYmIG9mZnNldCB8fCAwO1xuXG4gIGlmICh0eXBlb2Yob3B0aW9ucykgPT0gJ3N0cmluZycpIHtcbiAgICBidWYgPSBvcHRpb25zID09PSAnYmluYXJ5JyA/IG5ldyBBcnJheSgxNikgOiBudWxsO1xuICAgIG9wdGlvbnMgPSBudWxsO1xuICB9XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gIHZhciBybmRzID0gb3B0aW9ucy5yYW5kb20gfHwgKG9wdGlvbnMucm5nIHx8IHJuZykoKTtcblxuICAvLyBQZXIgNC40LCBzZXQgYml0cyBmb3IgdmVyc2lvbiBhbmQgYGNsb2NrX3NlcV9oaV9hbmRfcmVzZXJ2ZWRgXG4gIHJuZHNbNl0gPSAocm5kc1s2XSAmIDB4MGYpIHwgMHg0MDtcbiAgcm5kc1s4XSA9IChybmRzWzhdICYgMHgzZikgfCAweDgwO1xuXG4gIC8vIENvcHkgYnl0ZXMgdG8gYnVmZmVyLCBpZiBwcm92aWRlZFxuICBpZiAoYnVmKSB7XG4gICAgZm9yICh2YXIgaWkgPSAwOyBpaSA8IDE2OyArK2lpKSB7XG4gICAgICBidWZbaSArIGlpXSA9IHJuZHNbaWldO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBidWYgfHwgYnl0ZXNUb1V1aWQocm5kcyk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gdjQ7XG4iLCIvKlxyXG5XaWxkRW1pdHRlci5qcyBpcyBhIHNsaW0gbGl0dGxlIGV2ZW50IGVtaXR0ZXIgYnkgQGhlbnJpa2pvcmV0ZWcgbGFyZ2VseSBiYXNlZFxyXG5vbiBAdmlzaW9ubWVkaWEncyBFbWl0dGVyIGZyb20gVUkgS2l0LlxyXG5cclxuV2h5PyBJIHdhbnRlZCBpdCBzdGFuZGFsb25lLlxyXG5cclxuSSBhbHNvIHdhbnRlZCBzdXBwb3J0IGZvciB3aWxkY2FyZCBlbWl0dGVycyBsaWtlIHRoaXM6XHJcblxyXG5lbWl0dGVyLm9uKCcqJywgZnVuY3Rpb24gKGV2ZW50TmFtZSwgb3RoZXIsIGV2ZW50LCBwYXlsb2Fkcykge1xyXG5cclxufSk7XHJcblxyXG5lbWl0dGVyLm9uKCdzb21lbmFtZXNwYWNlKicsIGZ1bmN0aW9uIChldmVudE5hbWUsIHBheWxvYWRzKSB7XHJcblxyXG59KTtcclxuXHJcblBsZWFzZSBub3RlIHRoYXQgY2FsbGJhY2tzIHRyaWdnZXJlZCBieSB3aWxkY2FyZCByZWdpc3RlcmVkIGV2ZW50cyBhbHNvIGdldFxyXG50aGUgZXZlbnQgbmFtZSBhcyB0aGUgZmlyc3QgYXJndW1lbnQuXHJcbiovXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFdpbGRFbWl0dGVyO1xyXG5cclxuZnVuY3Rpb24gV2lsZEVtaXR0ZXIoKSB7IH1cclxuXHJcbldpbGRFbWl0dGVyLm1peGluID0gZnVuY3Rpb24gKGNvbnN0cnVjdG9yKSB7XHJcbiAgICB2YXIgcHJvdG90eXBlID0gY29uc3RydWN0b3IucHJvdG90eXBlIHx8IGNvbnN0cnVjdG9yO1xyXG5cclxuICAgIHByb3RvdHlwZS5pc1dpbGRFbWl0dGVyPSB0cnVlO1xyXG5cclxuICAgIC8vIExpc3RlbiBvbiB0aGUgZ2l2ZW4gYGV2ZW50YCB3aXRoIGBmbmAuIFN0b3JlIGEgZ3JvdXAgbmFtZSBpZiBwcmVzZW50LlxyXG4gICAgcHJvdG90eXBlLm9uID0gZnVuY3Rpb24gKGV2ZW50LCBncm91cE5hbWUsIGZuKSB7XHJcbiAgICAgICAgdGhpcy5jYWxsYmFja3MgPSB0aGlzLmNhbGxiYWNrcyB8fCB7fTtcclxuICAgICAgICB2YXIgaGFzR3JvdXAgPSAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMyksXHJcbiAgICAgICAgICAgIGdyb3VwID0gaGFzR3JvdXAgPyBhcmd1bWVudHNbMV0gOiB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgIGZ1bmMgPSBoYXNHcm91cCA/IGFyZ3VtZW50c1syXSA6IGFyZ3VtZW50c1sxXTtcclxuICAgICAgICBmdW5jLl9ncm91cE5hbWUgPSBncm91cDtcclxuICAgICAgICAodGhpcy5jYWxsYmFja3NbZXZlbnRdID0gdGhpcy5jYWxsYmFja3NbZXZlbnRdIHx8IFtdKS5wdXNoKGZ1bmMpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfTtcclxuXHJcbiAgICAvLyBBZGRzIGFuIGBldmVudGAgbGlzdGVuZXIgdGhhdCB3aWxsIGJlIGludm9rZWQgYSBzaW5nbGVcclxuICAgIC8vIHRpbWUgdGhlbiBhdXRvbWF0aWNhbGx5IHJlbW92ZWQuXHJcbiAgICBwcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uIChldmVudCwgZ3JvdXBOYW1lLCBmbikge1xyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcyxcclxuICAgICAgICAgICAgaGFzR3JvdXAgPSAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMyksXHJcbiAgICAgICAgICAgIGdyb3VwID0gaGFzR3JvdXAgPyBhcmd1bWVudHNbMV0gOiB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgIGZ1bmMgPSBoYXNHcm91cCA/IGFyZ3VtZW50c1syXSA6IGFyZ3VtZW50c1sxXTtcclxuICAgICAgICBmdW5jdGlvbiBvbigpIHtcclxuICAgICAgICAgICAgc2VsZi5vZmYoZXZlbnQsIG9uKTtcclxuICAgICAgICAgICAgZnVuYy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLm9uKGV2ZW50LCBncm91cCwgb24pO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfTtcclxuXHJcbiAgICAvLyBVbmJpbmRzIGFuIGVudGlyZSBncm91cFxyXG4gICAgcHJvdG90eXBlLnJlbGVhc2VHcm91cCA9IGZ1bmN0aW9uIChncm91cE5hbWUpIHtcclxuICAgICAgICB0aGlzLmNhbGxiYWNrcyA9IHRoaXMuY2FsbGJhY2tzIHx8IHt9O1xyXG4gICAgICAgIHZhciBpdGVtLCBpLCBsZW4sIGhhbmRsZXJzO1xyXG4gICAgICAgIGZvciAoaXRlbSBpbiB0aGlzLmNhbGxiYWNrcykge1xyXG4gICAgICAgICAgICBoYW5kbGVycyA9IHRoaXMuY2FsbGJhY2tzW2l0ZW1dO1xyXG4gICAgICAgICAgICBmb3IgKGkgPSAwLCBsZW4gPSBoYW5kbGVycy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xyXG4gICAgICAgICAgICAgICAgaWYgKGhhbmRsZXJzW2ldLl9ncm91cE5hbWUgPT09IGdyb3VwTmFtZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ3JlbW92aW5nJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gcmVtb3ZlIGl0IGFuZCBzaG9ydGVuIHRoZSBhcnJheSB3ZSdyZSBsb29waW5nIHRocm91Z2hcclxuICAgICAgICAgICAgICAgICAgICBoYW5kbGVycy5zcGxpY2UoaSwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaS0tO1xyXG4gICAgICAgICAgICAgICAgICAgIGxlbi0tO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfTtcclxuXHJcbiAgICAvLyBSZW1vdmUgdGhlIGdpdmVuIGNhbGxiYWNrIGZvciBgZXZlbnRgIG9yIGFsbFxyXG4gICAgLy8gcmVnaXN0ZXJlZCBjYWxsYmFja3MuXHJcbiAgICBwcm90b3R5cGUub2ZmID0gZnVuY3Rpb24gKGV2ZW50LCBmbikge1xyXG4gICAgICAgIHRoaXMuY2FsbGJhY2tzID0gdGhpcy5jYWxsYmFja3MgfHwge307XHJcbiAgICAgICAgdmFyIGNhbGxiYWNrcyA9IHRoaXMuY2FsbGJhY2tzW2V2ZW50XSxcclxuICAgICAgICAgICAgaTtcclxuXHJcbiAgICAgICAgaWYgKCFjYWxsYmFja3MpIHJldHVybiB0aGlzO1xyXG5cclxuICAgICAgICAvLyByZW1vdmUgYWxsIGhhbmRsZXJzXHJcbiAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcclxuICAgICAgICAgICAgZGVsZXRlIHRoaXMuY2FsbGJhY2tzW2V2ZW50XTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyByZW1vdmUgc3BlY2lmaWMgaGFuZGxlclxyXG4gICAgICAgIGkgPSBjYWxsYmFja3MuaW5kZXhPZihmbik7XHJcbiAgICAgICAgY2FsbGJhY2tzLnNwbGljZShpLCAxKTtcclxuICAgICAgICBpZiAoY2FsbGJhY2tzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICBkZWxldGUgdGhpcy5jYWxsYmFja3NbZXZlbnRdO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH07XHJcblxyXG4gICAgLy8vIEVtaXQgYGV2ZW50YCB3aXRoIHRoZSBnaXZlbiBhcmdzLlxyXG4gICAgLy8gYWxzbyBjYWxscyBhbnkgYCpgIGhhbmRsZXJzXHJcbiAgICBwcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgIHRoaXMuY2FsbGJhY2tzID0gdGhpcy5jYWxsYmFja3MgfHwge307XHJcbiAgICAgICAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSksXHJcbiAgICAgICAgICAgIGNhbGxiYWNrcyA9IHRoaXMuY2FsbGJhY2tzW2V2ZW50XSxcclxuICAgICAgICAgICAgc3BlY2lhbENhbGxiYWNrcyA9IHRoaXMuZ2V0V2lsZGNhcmRDYWxsYmFja3MoZXZlbnQpLFxyXG4gICAgICAgICAgICBpLFxyXG4gICAgICAgICAgICBsZW4sXHJcbiAgICAgICAgICAgIGl0ZW0sXHJcbiAgICAgICAgICAgIGxpc3RlbmVycztcclxuXHJcbiAgICAgICAgaWYgKGNhbGxiYWNrcykge1xyXG4gICAgICAgICAgICBsaXN0ZW5lcnMgPSBjYWxsYmFja3Muc2xpY2UoKTtcclxuICAgICAgICAgICAgZm9yIChpID0gMCwgbGVuID0gbGlzdGVuZXJzLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIWxpc3RlbmVyc1tpXSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoc3BlY2lhbENhbGxiYWNrcykge1xyXG4gICAgICAgICAgICBsZW4gPSBzcGVjaWFsQ2FsbGJhY2tzLmxlbmd0aDtcclxuICAgICAgICAgICAgbGlzdGVuZXJzID0gc3BlY2lhbENhbGxiYWNrcy5zbGljZSgpO1xyXG4gICAgICAgICAgICBmb3IgKGkgPSAwLCBsZW4gPSBsaXN0ZW5lcnMubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcclxuICAgICAgICAgICAgICAgIGlmICghbGlzdGVuZXJzW2ldKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBsaXN0ZW5lcnNbaV0uYXBwbHkodGhpcywgW2V2ZW50XS5jb25jYXQoYXJncykpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH07XHJcblxyXG4gICAgLy8gSGVscGVyIGZvciBmb3IgZmluZGluZyBzcGVjaWFsIHdpbGRjYXJkIGV2ZW50IGhhbmRsZXJzIHRoYXQgbWF0Y2ggdGhlIGV2ZW50XHJcbiAgICBwcm90b3R5cGUuZ2V0V2lsZGNhcmRDYWxsYmFja3MgPSBmdW5jdGlvbiAoZXZlbnROYW1lKSB7XHJcbiAgICAgICAgdGhpcy5jYWxsYmFja3MgPSB0aGlzLmNhbGxiYWNrcyB8fCB7fTtcclxuICAgICAgICB2YXIgaXRlbSxcclxuICAgICAgICAgICAgc3BsaXQsXHJcbiAgICAgICAgICAgIHJlc3VsdCA9IFtdO1xyXG5cclxuICAgICAgICBmb3IgKGl0ZW0gaW4gdGhpcy5jYWxsYmFja3MpIHtcclxuICAgICAgICAgICAgc3BsaXQgPSBpdGVtLnNwbGl0KCcqJyk7XHJcbiAgICAgICAgICAgIGlmIChpdGVtID09PSAnKicgfHwgKHNwbGl0Lmxlbmd0aCA9PT0gMiAmJiBldmVudE5hbWUuc2xpY2UoMCwgc3BsaXRbMF0ubGVuZ3RoKSA9PT0gc3BsaXRbMF0pKSB7XHJcbiAgICAgICAgICAgICAgICByZXN1bHQgPSByZXN1bHQuY29uY2F0KHRoaXMuY2FsbGJhY2tzW2l0ZW1dKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgfTtcclxuXHJcbn07XHJcblxyXG5XaWxkRW1pdHRlci5taXhpbihXaWxkRW1pdHRlcik7XHJcbiIsIi8qIVxuICogRXZlbnRFbWl0dGVyIHY1LjIuNCAtIGdpdC5pby9lZVxuICogVW5saWNlbnNlIC0gaHR0cDovL3VubGljZW5zZS5vcmcvXG4gKiBPbGl2ZXIgQ2FsZHdlbGwgLSBodHRwOi8vb2xpLm1lLnVrL1xuICogQHByZXNlcnZlXG4gKi9cblxuOyhmdW5jdGlvbiAoZXhwb3J0cykge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIC8qKlxuICAgICAqIENsYXNzIGZvciBtYW5hZ2luZyBldmVudHMuXG4gICAgICogQ2FuIGJlIGV4dGVuZGVkIHRvIHByb3ZpZGUgZXZlbnQgZnVuY3Rpb25hbGl0eSBpbiBvdGhlciBjbGFzc2VzLlxuICAgICAqXG4gICAgICogQGNsYXNzIEV2ZW50RW1pdHRlciBNYW5hZ2VzIGV2ZW50IHJlZ2lzdGVyaW5nIGFuZCBlbWl0dGluZy5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7fVxuXG4gICAgLy8gU2hvcnRjdXRzIHRvIGltcHJvdmUgc3BlZWQgYW5kIHNpemVcbiAgICB2YXIgcHJvdG8gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlO1xuICAgIHZhciBvcmlnaW5hbEdsb2JhbFZhbHVlID0gZXhwb3J0cy5FdmVudEVtaXR0ZXI7XG5cbiAgICAvKipcbiAgICAgKiBGaW5kcyB0aGUgaW5kZXggb2YgdGhlIGxpc3RlbmVyIGZvciB0aGUgZXZlbnQgaW4gaXRzIHN0b3JhZ2UgYXJyYXkuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9uW119IGxpc3RlbmVycyBBcnJheSBvZiBsaXN0ZW5lcnMgdG8gc2VhcmNoIHRocm91Z2guXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gbGlzdGVuZXIgTWV0aG9kIHRvIGxvb2sgZm9yLlxuICAgICAqIEByZXR1cm4ge051bWJlcn0gSW5kZXggb2YgdGhlIHNwZWNpZmllZCBsaXN0ZW5lciwgLTEgaWYgbm90IGZvdW5kXG4gICAgICogQGFwaSBwcml2YXRlXG4gICAgICovXG4gICAgZnVuY3Rpb24gaW5kZXhPZkxpc3RlbmVyKGxpc3RlbmVycywgbGlzdGVuZXIpIHtcbiAgICAgICAgdmFyIGkgPSBsaXN0ZW5lcnMubGVuZ3RoO1xuICAgICAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgICAgICBpZiAobGlzdGVuZXJzW2ldLmxpc3RlbmVyID09PSBsaXN0ZW5lcikge1xuICAgICAgICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIC0xO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEFsaWFzIGEgbWV0aG9kIHdoaWxlIGtlZXBpbmcgdGhlIGNvbnRleHQgY29ycmVjdCwgdG8gYWxsb3cgZm9yIG92ZXJ3cml0aW5nIG9mIHRhcmdldCBtZXRob2QuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBUaGUgbmFtZSBvZiB0aGUgdGFyZ2V0IG1ldGhvZC5cbiAgICAgKiBAcmV0dXJuIHtGdW5jdGlvbn0gVGhlIGFsaWFzZWQgbWV0aG9kXG4gICAgICogQGFwaSBwcml2YXRlXG4gICAgICovXG4gICAgZnVuY3Rpb24gYWxpYXMobmFtZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gYWxpYXNDbG9zdXJlKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXNbbmFtZV0uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBsaXN0ZW5lciBhcnJheSBmb3IgdGhlIHNwZWNpZmllZCBldmVudC5cbiAgICAgKiBXaWxsIGluaXRpYWxpc2UgdGhlIGV2ZW50IG9iamVjdCBhbmQgbGlzdGVuZXIgYXJyYXlzIGlmIHJlcXVpcmVkLlxuICAgICAqIFdpbGwgcmV0dXJuIGFuIG9iamVjdCBpZiB5b3UgdXNlIGEgcmVnZXggc2VhcmNoLiBUaGUgb2JqZWN0IGNvbnRhaW5zIGtleXMgZm9yIGVhY2ggbWF0Y2hlZCBldmVudC4gU28gL2JhW3J6XS8gbWlnaHQgcmV0dXJuIGFuIG9iamVjdCBjb250YWluaW5nIGJhciBhbmQgYmF6LiBCdXQgb25seSBpZiB5b3UgaGF2ZSBlaXRoZXIgZGVmaW5lZCB0aGVtIHdpdGggZGVmaW5lRXZlbnQgb3IgYWRkZWQgc29tZSBsaXN0ZW5lcnMgdG8gdGhlbS5cbiAgICAgKiBFYWNoIHByb3BlcnR5IGluIHRoZSBvYmplY3QgcmVzcG9uc2UgaXMgYW4gYXJyYXkgb2YgbGlzdGVuZXIgZnVuY3Rpb25zLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtTdHJpbmd8UmVnRXhwfSBldnQgTmFtZSBvZiB0aGUgZXZlbnQgdG8gcmV0dXJuIHRoZSBsaXN0ZW5lcnMgZnJvbS5cbiAgICAgKiBAcmV0dXJuIHtGdW5jdGlvbltdfE9iamVjdH0gQWxsIGxpc3RlbmVyIGZ1bmN0aW9ucyBmb3IgdGhlIGV2ZW50LlxuICAgICAqL1xuICAgIHByb3RvLmdldExpc3RlbmVycyA9IGZ1bmN0aW9uIGdldExpc3RlbmVycyhldnQpIHtcbiAgICAgICAgdmFyIGV2ZW50cyA9IHRoaXMuX2dldEV2ZW50cygpO1xuICAgICAgICB2YXIgcmVzcG9uc2U7XG4gICAgICAgIHZhciBrZXk7XG5cbiAgICAgICAgLy8gUmV0dXJuIGEgY29uY2F0ZW5hdGVkIGFycmF5IG9mIGFsbCBtYXRjaGluZyBldmVudHMgaWZcbiAgICAgICAgLy8gdGhlIHNlbGVjdG9yIGlzIGEgcmVndWxhciBleHByZXNzaW9uLlxuICAgICAgICBpZiAoZXZ0IGluc3RhbmNlb2YgUmVnRXhwKSB7XG4gICAgICAgICAgICByZXNwb25zZSA9IHt9O1xuICAgICAgICAgICAgZm9yIChrZXkgaW4gZXZlbnRzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGV2ZW50cy5oYXNPd25Qcm9wZXJ0eShrZXkpICYmIGV2dC50ZXN0KGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2Vba2V5XSA9IGV2ZW50c1trZXldO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJlc3BvbnNlID0gZXZlbnRzW2V2dF0gfHwgKGV2ZW50c1tldnRdID0gW10pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBUYWtlcyBhIGxpc3Qgb2YgbGlzdGVuZXIgb2JqZWN0cyBhbmQgZmxhdHRlbnMgaXQgaW50byBhIGxpc3Qgb2YgbGlzdGVuZXIgZnVuY3Rpb25zLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3RbXX0gbGlzdGVuZXJzIFJhdyBsaXN0ZW5lciBvYmplY3RzLlxuICAgICAqIEByZXR1cm4ge0Z1bmN0aW9uW119IEp1c3QgdGhlIGxpc3RlbmVyIGZ1bmN0aW9ucy5cbiAgICAgKi9cbiAgICBwcm90by5mbGF0dGVuTGlzdGVuZXJzID0gZnVuY3Rpb24gZmxhdHRlbkxpc3RlbmVycyhsaXN0ZW5lcnMpIHtcbiAgICAgICAgdmFyIGZsYXRMaXN0ZW5lcnMgPSBbXTtcbiAgICAgICAgdmFyIGk7XG5cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGxpc3RlbmVycy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgICAgZmxhdExpc3RlbmVycy5wdXNoKGxpc3RlbmVyc1tpXS5saXN0ZW5lcik7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZmxhdExpc3RlbmVycztcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogRmV0Y2hlcyB0aGUgcmVxdWVzdGVkIGxpc3RlbmVycyB2aWEgZ2V0TGlzdGVuZXJzIGJ1dCB3aWxsIGFsd2F5cyByZXR1cm4gdGhlIHJlc3VsdHMgaW5zaWRlIGFuIG9iamVjdC4gVGhpcyBpcyBtYWlubHkgZm9yIGludGVybmFsIHVzZSBidXQgb3RoZXJzIG1heSBmaW5kIGl0IHVzZWZ1bC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfFJlZ0V4cH0gZXZ0IE5hbWUgb2YgdGhlIGV2ZW50IHRvIHJldHVybiB0aGUgbGlzdGVuZXJzIGZyb20uXG4gICAgICogQHJldHVybiB7T2JqZWN0fSBBbGwgbGlzdGVuZXIgZnVuY3Rpb25zIGZvciBhbiBldmVudCBpbiBhbiBvYmplY3QuXG4gICAgICovXG4gICAgcHJvdG8uZ2V0TGlzdGVuZXJzQXNPYmplY3QgPSBmdW5jdGlvbiBnZXRMaXN0ZW5lcnNBc09iamVjdChldnQpIHtcbiAgICAgICAgdmFyIGxpc3RlbmVycyA9IHRoaXMuZ2V0TGlzdGVuZXJzKGV2dCk7XG4gICAgICAgIHZhciByZXNwb25zZTtcblxuICAgICAgICBpZiAobGlzdGVuZXJzIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICAgIHJlc3BvbnNlID0ge307XG4gICAgICAgICAgICByZXNwb25zZVtldnRdID0gbGlzdGVuZXJzO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlIHx8IGxpc3RlbmVycztcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gaXNWYWxpZExpc3RlbmVyIChsaXN0ZW5lcikge1xuICAgICAgICBpZiAodHlwZW9mIGxpc3RlbmVyID09PSAnZnVuY3Rpb24nIHx8IGxpc3RlbmVyIGluc3RhbmNlb2YgUmVnRXhwKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgICB9IGVsc2UgaWYgKGxpc3RlbmVyICYmIHR5cGVvZiBsaXN0ZW5lciA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIHJldHVybiBpc1ZhbGlkTGlzdGVuZXIobGlzdGVuZXIubGlzdGVuZXIpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEFkZHMgYSBsaXN0ZW5lciBmdW5jdGlvbiB0byB0aGUgc3BlY2lmaWVkIGV2ZW50LlxuICAgICAqIFRoZSBsaXN0ZW5lciB3aWxsIG5vdCBiZSBhZGRlZCBpZiBpdCBpcyBhIGR1cGxpY2F0ZS5cbiAgICAgKiBJZiB0aGUgbGlzdGVuZXIgcmV0dXJucyB0cnVlIHRoZW4gaXQgd2lsbCBiZSByZW1vdmVkIGFmdGVyIGl0IGlzIGNhbGxlZC5cbiAgICAgKiBJZiB5b3UgcGFzcyBhIHJlZ3VsYXIgZXhwcmVzc2lvbiBhcyB0aGUgZXZlbnQgbmFtZSB0aGVuIHRoZSBsaXN0ZW5lciB3aWxsIGJlIGFkZGVkIHRvIGFsbCBldmVudHMgdGhhdCBtYXRjaCBpdC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfFJlZ0V4cH0gZXZ0IE5hbWUgb2YgdGhlIGV2ZW50IHRvIGF0dGFjaCB0aGUgbGlzdGVuZXIgdG8uXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gbGlzdGVuZXIgTWV0aG9kIHRvIGJlIGNhbGxlZCB3aGVuIHRoZSBldmVudCBpcyBlbWl0dGVkLiBJZiB0aGUgZnVuY3Rpb24gcmV0dXJucyB0cnVlIHRoZW4gaXQgd2lsbCBiZSByZW1vdmVkIGFmdGVyIGNhbGxpbmcuXG4gICAgICogQHJldHVybiB7T2JqZWN0fSBDdXJyZW50IGluc3RhbmNlIG9mIEV2ZW50RW1pdHRlciBmb3IgY2hhaW5pbmcuXG4gICAgICovXG4gICAgcHJvdG8uYWRkTGlzdGVuZXIgPSBmdW5jdGlvbiBhZGRMaXN0ZW5lcihldnQsIGxpc3RlbmVyKSB7XG4gICAgICAgIGlmICghaXNWYWxpZExpc3RlbmVyKGxpc3RlbmVyKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgbGlzdGVuZXJzID0gdGhpcy5nZXRMaXN0ZW5lcnNBc09iamVjdChldnQpO1xuICAgICAgICB2YXIgbGlzdGVuZXJJc1dyYXBwZWQgPSB0eXBlb2YgbGlzdGVuZXIgPT09ICdvYmplY3QnO1xuICAgICAgICB2YXIga2V5O1xuXG4gICAgICAgIGZvciAoa2V5IGluIGxpc3RlbmVycykge1xuICAgICAgICAgICAgaWYgKGxpc3RlbmVycy5oYXNPd25Qcm9wZXJ0eShrZXkpICYmIGluZGV4T2ZMaXN0ZW5lcihsaXN0ZW5lcnNba2V5XSwgbGlzdGVuZXIpID09PSAtMSkge1xuICAgICAgICAgICAgICAgIGxpc3RlbmVyc1trZXldLnB1c2gobGlzdGVuZXJJc1dyYXBwZWQgPyBsaXN0ZW5lciA6IHtcbiAgICAgICAgICAgICAgICAgICAgbGlzdGVuZXI6IGxpc3RlbmVyLFxuICAgICAgICAgICAgICAgICAgICBvbmNlOiBmYWxzZVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEFsaWFzIG9mIGFkZExpc3RlbmVyXG4gICAgICovXG4gICAgcHJvdG8ub24gPSBhbGlhcygnYWRkTGlzdGVuZXInKTtcblxuICAgIC8qKlxuICAgICAqIFNlbWktYWxpYXMgb2YgYWRkTGlzdGVuZXIuIEl0IHdpbGwgYWRkIGEgbGlzdGVuZXIgdGhhdCB3aWxsIGJlXG4gICAgICogYXV0b21hdGljYWxseSByZW1vdmVkIGFmdGVyIGl0cyBmaXJzdCBleGVjdXRpb24uXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge1N0cmluZ3xSZWdFeHB9IGV2dCBOYW1lIG9mIHRoZSBldmVudCB0byBhdHRhY2ggdGhlIGxpc3RlbmVyIHRvLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGxpc3RlbmVyIE1ldGhvZCB0byBiZSBjYWxsZWQgd2hlbiB0aGUgZXZlbnQgaXMgZW1pdHRlZC4gSWYgdGhlIGZ1bmN0aW9uIHJldHVybnMgdHJ1ZSB0aGVuIGl0IHdpbGwgYmUgcmVtb3ZlZCBhZnRlciBjYWxsaW5nLlxuICAgICAqIEByZXR1cm4ge09iamVjdH0gQ3VycmVudCBpbnN0YW5jZSBvZiBFdmVudEVtaXR0ZXIgZm9yIGNoYWluaW5nLlxuICAgICAqL1xuICAgIHByb3RvLmFkZE9uY2VMaXN0ZW5lciA9IGZ1bmN0aW9uIGFkZE9uY2VMaXN0ZW5lcihldnQsIGxpc3RlbmVyKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmFkZExpc3RlbmVyKGV2dCwge1xuICAgICAgICAgICAgbGlzdGVuZXI6IGxpc3RlbmVyLFxuICAgICAgICAgICAgb25jZTogdHJ1ZVxuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQWxpYXMgb2YgYWRkT25jZUxpc3RlbmVyLlxuICAgICAqL1xuICAgIHByb3RvLm9uY2UgPSBhbGlhcygnYWRkT25jZUxpc3RlbmVyJyk7XG5cbiAgICAvKipcbiAgICAgKiBEZWZpbmVzIGFuIGV2ZW50IG5hbWUuIFRoaXMgaXMgcmVxdWlyZWQgaWYgeW91IHdhbnQgdG8gdXNlIGEgcmVnZXggdG8gYWRkIGEgbGlzdGVuZXIgdG8gbXVsdGlwbGUgZXZlbnRzIGF0IG9uY2UuIElmIHlvdSBkb24ndCBkbyB0aGlzIHRoZW4gaG93IGRvIHlvdSBleHBlY3QgaXQgdG8ga25vdyB3aGF0IGV2ZW50IHRvIGFkZCB0bz8gU2hvdWxkIGl0IGp1c3QgYWRkIHRvIGV2ZXJ5IHBvc3NpYmxlIG1hdGNoIGZvciBhIHJlZ2V4PyBOby4gVGhhdCBpcyBzY2FyeSBhbmQgYmFkLlxuICAgICAqIFlvdSBuZWVkIHRvIHRlbGwgaXQgd2hhdCBldmVudCBuYW1lcyBzaG91bGQgYmUgbWF0Y2hlZCBieSBhIHJlZ2V4LlxuICAgICAqXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGV2dCBOYW1lIG9mIHRoZSBldmVudCB0byBjcmVhdGUuXG4gICAgICogQHJldHVybiB7T2JqZWN0fSBDdXJyZW50IGluc3RhbmNlIG9mIEV2ZW50RW1pdHRlciBmb3IgY2hhaW5pbmcuXG4gICAgICovXG4gICAgcHJvdG8uZGVmaW5lRXZlbnQgPSBmdW5jdGlvbiBkZWZpbmVFdmVudChldnQpIHtcbiAgICAgICAgdGhpcy5nZXRMaXN0ZW5lcnMoZXZ0KTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFVzZXMgZGVmaW5lRXZlbnQgdG8gZGVmaW5lIG11bHRpcGxlIGV2ZW50cy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7U3RyaW5nW119IGV2dHMgQW4gYXJyYXkgb2YgZXZlbnQgbmFtZXMgdG8gZGVmaW5lLlxuICAgICAqIEByZXR1cm4ge09iamVjdH0gQ3VycmVudCBpbnN0YW5jZSBvZiBFdmVudEVtaXR0ZXIgZm9yIGNoYWluaW5nLlxuICAgICAqL1xuICAgIHByb3RvLmRlZmluZUV2ZW50cyA9IGZ1bmN0aW9uIGRlZmluZUV2ZW50cyhldnRzKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZXZ0cy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgICAgdGhpcy5kZWZpbmVFdmVudChldnRzW2ldKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmVtb3ZlcyBhIGxpc3RlbmVyIGZ1bmN0aW9uIGZyb20gdGhlIHNwZWNpZmllZCBldmVudC5cbiAgICAgKiBXaGVuIHBhc3NlZCBhIHJlZ3VsYXIgZXhwcmVzc2lvbiBhcyB0aGUgZXZlbnQgbmFtZSwgaXQgd2lsbCByZW1vdmUgdGhlIGxpc3RlbmVyIGZyb20gYWxsIGV2ZW50cyB0aGF0IG1hdGNoIGl0LlxuICAgICAqXG4gICAgICogQHBhcmFtIHtTdHJpbmd8UmVnRXhwfSBldnQgTmFtZSBvZiB0aGUgZXZlbnQgdG8gcmVtb3ZlIHRoZSBsaXN0ZW5lciBmcm9tLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGxpc3RlbmVyIE1ldGhvZCB0byByZW1vdmUgZnJvbSB0aGUgZXZlbnQuXG4gICAgICogQHJldHVybiB7T2JqZWN0fSBDdXJyZW50IGluc3RhbmNlIG9mIEV2ZW50RW1pdHRlciBmb3IgY2hhaW5pbmcuXG4gICAgICovXG4gICAgcHJvdG8ucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbiByZW1vdmVMaXN0ZW5lcihldnQsIGxpc3RlbmVyKSB7XG4gICAgICAgIHZhciBsaXN0ZW5lcnMgPSB0aGlzLmdldExpc3RlbmVyc0FzT2JqZWN0KGV2dCk7XG4gICAgICAgIHZhciBpbmRleDtcbiAgICAgICAgdmFyIGtleTtcblxuICAgICAgICBmb3IgKGtleSBpbiBsaXN0ZW5lcnMpIHtcbiAgICAgICAgICAgIGlmIChsaXN0ZW5lcnMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgICAgIGluZGV4ID0gaW5kZXhPZkxpc3RlbmVyKGxpc3RlbmVyc1trZXldLCBsaXN0ZW5lcik7XG5cbiAgICAgICAgICAgICAgICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIGxpc3RlbmVyc1trZXldLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEFsaWFzIG9mIHJlbW92ZUxpc3RlbmVyXG4gICAgICovXG4gICAgcHJvdG8ub2ZmID0gYWxpYXMoJ3JlbW92ZUxpc3RlbmVyJyk7XG5cbiAgICAvKipcbiAgICAgKiBBZGRzIGxpc3RlbmVycyBpbiBidWxrIHVzaW5nIHRoZSBtYW5pcHVsYXRlTGlzdGVuZXJzIG1ldGhvZC5cbiAgICAgKiBJZiB5b3UgcGFzcyBhbiBvYmplY3QgYXMgdGhlIGZpcnN0IGFyZ3VtZW50IHlvdSBjYW4gYWRkIHRvIG11bHRpcGxlIGV2ZW50cyBhdCBvbmNlLiBUaGUgb2JqZWN0IHNob3VsZCBjb250YWluIGtleSB2YWx1ZSBwYWlycyBvZiBldmVudHMgYW5kIGxpc3RlbmVycyBvciBsaXN0ZW5lciBhcnJheXMuIFlvdSBjYW4gYWxzbyBwYXNzIGl0IGFuIGV2ZW50IG5hbWUgYW5kIGFuIGFycmF5IG9mIGxpc3RlbmVycyB0byBiZSBhZGRlZC5cbiAgICAgKiBZb3UgY2FuIGFsc28gcGFzcyBpdCBhIHJlZ3VsYXIgZXhwcmVzc2lvbiB0byBhZGQgdGhlIGFycmF5IG9mIGxpc3RlbmVycyB0byBhbGwgZXZlbnRzIHRoYXQgbWF0Y2ggaXQuXG4gICAgICogWWVhaCwgdGhpcyBmdW5jdGlvbiBkb2VzIHF1aXRlIGEgYml0LiBUaGF0J3MgcHJvYmFibHkgYSBiYWQgdGhpbmcuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge1N0cmluZ3xPYmplY3R8UmVnRXhwfSBldnQgQW4gZXZlbnQgbmFtZSBpZiB5b3Ugd2lsbCBwYXNzIGFuIGFycmF5IG9mIGxpc3RlbmVycyBuZXh0LiBBbiBvYmplY3QgaWYgeW91IHdpc2ggdG8gYWRkIHRvIG11bHRpcGxlIGV2ZW50cyBhdCBvbmNlLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb25bXX0gW2xpc3RlbmVyc10gQW4gb3B0aW9uYWwgYXJyYXkgb2YgbGlzdGVuZXIgZnVuY3Rpb25zIHRvIGFkZC5cbiAgICAgKiBAcmV0dXJuIHtPYmplY3R9IEN1cnJlbnQgaW5zdGFuY2Ugb2YgRXZlbnRFbWl0dGVyIGZvciBjaGFpbmluZy5cbiAgICAgKi9cbiAgICBwcm90by5hZGRMaXN0ZW5lcnMgPSBmdW5jdGlvbiBhZGRMaXN0ZW5lcnMoZXZ0LCBsaXN0ZW5lcnMpIHtcbiAgICAgICAgLy8gUGFzcyB0aHJvdWdoIHRvIG1hbmlwdWxhdGVMaXN0ZW5lcnNcbiAgICAgICAgcmV0dXJuIHRoaXMubWFuaXB1bGF0ZUxpc3RlbmVycyhmYWxzZSwgZXZ0LCBsaXN0ZW5lcnMpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZW1vdmVzIGxpc3RlbmVycyBpbiBidWxrIHVzaW5nIHRoZSBtYW5pcHVsYXRlTGlzdGVuZXJzIG1ldGhvZC5cbiAgICAgKiBJZiB5b3UgcGFzcyBhbiBvYmplY3QgYXMgdGhlIGZpcnN0IGFyZ3VtZW50IHlvdSBjYW4gcmVtb3ZlIGZyb20gbXVsdGlwbGUgZXZlbnRzIGF0IG9uY2UuIFRoZSBvYmplY3Qgc2hvdWxkIGNvbnRhaW4ga2V5IHZhbHVlIHBhaXJzIG9mIGV2ZW50cyBhbmQgbGlzdGVuZXJzIG9yIGxpc3RlbmVyIGFycmF5cy5cbiAgICAgKiBZb3UgY2FuIGFsc28gcGFzcyBpdCBhbiBldmVudCBuYW1lIGFuZCBhbiBhcnJheSBvZiBsaXN0ZW5lcnMgdG8gYmUgcmVtb3ZlZC5cbiAgICAgKiBZb3UgY2FuIGFsc28gcGFzcyBpdCBhIHJlZ3VsYXIgZXhwcmVzc2lvbiB0byByZW1vdmUgdGhlIGxpc3RlbmVycyBmcm9tIGFsbCBldmVudHMgdGhhdCBtYXRjaCBpdC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfE9iamVjdHxSZWdFeHB9IGV2dCBBbiBldmVudCBuYW1lIGlmIHlvdSB3aWxsIHBhc3MgYW4gYXJyYXkgb2YgbGlzdGVuZXJzIG5leHQuIEFuIG9iamVjdCBpZiB5b3Ugd2lzaCB0byByZW1vdmUgZnJvbSBtdWx0aXBsZSBldmVudHMgYXQgb25jZS5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9uW119IFtsaXN0ZW5lcnNdIEFuIG9wdGlvbmFsIGFycmF5IG9mIGxpc3RlbmVyIGZ1bmN0aW9ucyB0byByZW1vdmUuXG4gICAgICogQHJldHVybiB7T2JqZWN0fSBDdXJyZW50IGluc3RhbmNlIG9mIEV2ZW50RW1pdHRlciBmb3IgY2hhaW5pbmcuXG4gICAgICovXG4gICAgcHJvdG8ucmVtb3ZlTGlzdGVuZXJzID0gZnVuY3Rpb24gcmVtb3ZlTGlzdGVuZXJzKGV2dCwgbGlzdGVuZXJzKSB7XG4gICAgICAgIC8vIFBhc3MgdGhyb3VnaCB0byBtYW5pcHVsYXRlTGlzdGVuZXJzXG4gICAgICAgIHJldHVybiB0aGlzLm1hbmlwdWxhdGVMaXN0ZW5lcnModHJ1ZSwgZXZ0LCBsaXN0ZW5lcnMpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBFZGl0cyBsaXN0ZW5lcnMgaW4gYnVsay4gVGhlIGFkZExpc3RlbmVycyBhbmQgcmVtb3ZlTGlzdGVuZXJzIG1ldGhvZHMgYm90aCB1c2UgdGhpcyB0byBkbyB0aGVpciBqb2IuIFlvdSBzaG91bGQgcmVhbGx5IHVzZSB0aG9zZSBpbnN0ZWFkLCB0aGlzIGlzIGEgbGl0dGxlIGxvd2VyIGxldmVsLlxuICAgICAqIFRoZSBmaXJzdCBhcmd1bWVudCB3aWxsIGRldGVybWluZSBpZiB0aGUgbGlzdGVuZXJzIGFyZSByZW1vdmVkICh0cnVlKSBvciBhZGRlZCAoZmFsc2UpLlxuICAgICAqIElmIHlvdSBwYXNzIGFuIG9iamVjdCBhcyB0aGUgc2Vjb25kIGFyZ3VtZW50IHlvdSBjYW4gYWRkL3JlbW92ZSBmcm9tIG11bHRpcGxlIGV2ZW50cyBhdCBvbmNlLiBUaGUgb2JqZWN0IHNob3VsZCBjb250YWluIGtleSB2YWx1ZSBwYWlycyBvZiBldmVudHMgYW5kIGxpc3RlbmVycyBvciBsaXN0ZW5lciBhcnJheXMuXG4gICAgICogWW91IGNhbiBhbHNvIHBhc3MgaXQgYW4gZXZlbnQgbmFtZSBhbmQgYW4gYXJyYXkgb2YgbGlzdGVuZXJzIHRvIGJlIGFkZGVkL3JlbW92ZWQuXG4gICAgICogWW91IGNhbiBhbHNvIHBhc3MgaXQgYSByZWd1bGFyIGV4cHJlc3Npb24gdG8gbWFuaXB1bGF0ZSB0aGUgbGlzdGVuZXJzIG9mIGFsbCBldmVudHMgdGhhdCBtYXRjaCBpdC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gcmVtb3ZlIFRydWUgaWYgeW91IHdhbnQgdG8gcmVtb3ZlIGxpc3RlbmVycywgZmFsc2UgaWYgeW91IHdhbnQgdG8gYWRkLlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfE9iamVjdHxSZWdFeHB9IGV2dCBBbiBldmVudCBuYW1lIGlmIHlvdSB3aWxsIHBhc3MgYW4gYXJyYXkgb2YgbGlzdGVuZXJzIG5leHQuIEFuIG9iamVjdCBpZiB5b3Ugd2lzaCB0byBhZGQvcmVtb3ZlIGZyb20gbXVsdGlwbGUgZXZlbnRzIGF0IG9uY2UuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbltdfSBbbGlzdGVuZXJzXSBBbiBvcHRpb25hbCBhcnJheSBvZiBsaXN0ZW5lciBmdW5jdGlvbnMgdG8gYWRkL3JlbW92ZS5cbiAgICAgKiBAcmV0dXJuIHtPYmplY3R9IEN1cnJlbnQgaW5zdGFuY2Ugb2YgRXZlbnRFbWl0dGVyIGZvciBjaGFpbmluZy5cbiAgICAgKi9cbiAgICBwcm90by5tYW5pcHVsYXRlTGlzdGVuZXJzID0gZnVuY3Rpb24gbWFuaXB1bGF0ZUxpc3RlbmVycyhyZW1vdmUsIGV2dCwgbGlzdGVuZXJzKSB7XG4gICAgICAgIHZhciBpO1xuICAgICAgICB2YXIgdmFsdWU7XG4gICAgICAgIHZhciBzaW5nbGUgPSByZW1vdmUgPyB0aGlzLnJlbW92ZUxpc3RlbmVyIDogdGhpcy5hZGRMaXN0ZW5lcjtcbiAgICAgICAgdmFyIG11bHRpcGxlID0gcmVtb3ZlID8gdGhpcy5yZW1vdmVMaXN0ZW5lcnMgOiB0aGlzLmFkZExpc3RlbmVycztcblxuICAgICAgICAvLyBJZiBldnQgaXMgYW4gb2JqZWN0IHRoZW4gcGFzcyBlYWNoIG9mIGl0cyBwcm9wZXJ0aWVzIHRvIHRoaXMgbWV0aG9kXG4gICAgICAgIGlmICh0eXBlb2YgZXZ0ID09PSAnb2JqZWN0JyAmJiAhKGV2dCBpbnN0YW5jZW9mIFJlZ0V4cCkpIHtcbiAgICAgICAgICAgIGZvciAoaSBpbiBldnQpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXZ0Lmhhc093blByb3BlcnR5KGkpICYmICh2YWx1ZSA9IGV2dFtpXSkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gUGFzcyB0aGUgc2luZ2xlIGxpc3RlbmVyIHN0cmFpZ2h0IHRocm91Z2ggdG8gdGhlIHNpbmd1bGFyIG1ldGhvZFxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzaW5nbGUuY2FsbCh0aGlzLCBpLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBPdGhlcndpc2UgcGFzcyBiYWNrIHRvIHRoZSBtdWx0aXBsZSBmdW5jdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgbXVsdGlwbGUuY2FsbCh0aGlzLCBpLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAvLyBTbyBldnQgbXVzdCBiZSBhIHN0cmluZ1xuICAgICAgICAgICAgLy8gQW5kIGxpc3RlbmVycyBtdXN0IGJlIGFuIGFycmF5IG9mIGxpc3RlbmVyc1xuICAgICAgICAgICAgLy8gTG9vcCBvdmVyIGl0IGFuZCBwYXNzIGVhY2ggb25lIHRvIHRoZSBtdWx0aXBsZSBtZXRob2RcbiAgICAgICAgICAgIGkgPSBsaXN0ZW5lcnMubGVuZ3RoO1xuICAgICAgICAgICAgd2hpbGUgKGktLSkge1xuICAgICAgICAgICAgICAgIHNpbmdsZS5jYWxsKHRoaXMsIGV2dCwgbGlzdGVuZXJzW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZW1vdmVzIGFsbCBsaXN0ZW5lcnMgZnJvbSBhIHNwZWNpZmllZCBldmVudC5cbiAgICAgKiBJZiB5b3UgZG8gbm90IHNwZWNpZnkgYW4gZXZlbnQgdGhlbiBhbGwgbGlzdGVuZXJzIHdpbGwgYmUgcmVtb3ZlZC5cbiAgICAgKiBUaGF0IG1lYW5zIGV2ZXJ5IGV2ZW50IHdpbGwgYmUgZW1wdGllZC5cbiAgICAgKiBZb3UgY2FuIGFsc28gcGFzcyBhIHJlZ2V4IHRvIHJlbW92ZSBhbGwgZXZlbnRzIHRoYXQgbWF0Y2ggaXQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge1N0cmluZ3xSZWdFeHB9IFtldnRdIE9wdGlvbmFsIG5hbWUgb2YgdGhlIGV2ZW50IHRvIHJlbW92ZSBhbGwgbGlzdGVuZXJzIGZvci4gV2lsbCByZW1vdmUgZnJvbSBldmVyeSBldmVudCBpZiBub3QgcGFzc2VkLlxuICAgICAqIEByZXR1cm4ge09iamVjdH0gQ3VycmVudCBpbnN0YW5jZSBvZiBFdmVudEVtaXR0ZXIgZm9yIGNoYWluaW5nLlxuICAgICAqL1xuICAgIHByb3RvLnJlbW92ZUV2ZW50ID0gZnVuY3Rpb24gcmVtb3ZlRXZlbnQoZXZ0KSB7XG4gICAgICAgIHZhciB0eXBlID0gdHlwZW9mIGV2dDtcbiAgICAgICAgdmFyIGV2ZW50cyA9IHRoaXMuX2dldEV2ZW50cygpO1xuICAgICAgICB2YXIga2V5O1xuXG4gICAgICAgIC8vIFJlbW92ZSBkaWZmZXJlbnQgdGhpbmdzIGRlcGVuZGluZyBvbiB0aGUgc3RhdGUgb2YgZXZ0XG4gICAgICAgIGlmICh0eXBlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgLy8gUmVtb3ZlIGFsbCBsaXN0ZW5lcnMgZm9yIHRoZSBzcGVjaWZpZWQgZXZlbnRcbiAgICAgICAgICAgIGRlbGV0ZSBldmVudHNbZXZ0XTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChldnQgaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICAgICAgICAgIC8vIFJlbW92ZSBhbGwgZXZlbnRzIG1hdGNoaW5nIHRoZSByZWdleC5cbiAgICAgICAgICAgIGZvciAoa2V5IGluIGV2ZW50cykge1xuICAgICAgICAgICAgICAgIGlmIChldmVudHMuaGFzT3duUHJvcGVydHkoa2V5KSAmJiBldnQudGVzdChrZXkpKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBldmVudHNba2V5XTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAvLyBSZW1vdmUgYWxsIGxpc3RlbmVycyBpbiBhbGwgZXZlbnRzXG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fZXZlbnRzO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEFsaWFzIG9mIHJlbW92ZUV2ZW50LlxuICAgICAqXG4gICAgICogQWRkZWQgdG8gbWlycm9yIHRoZSBub2RlIEFQSS5cbiAgICAgKi9cbiAgICBwcm90by5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBhbGlhcygncmVtb3ZlRXZlbnQnKTtcblxuICAgIC8qKlxuICAgICAqIEVtaXRzIGFuIGV2ZW50IG9mIHlvdXIgY2hvaWNlLlxuICAgICAqIFdoZW4gZW1pdHRlZCwgZXZlcnkgbGlzdGVuZXIgYXR0YWNoZWQgdG8gdGhhdCBldmVudCB3aWxsIGJlIGV4ZWN1dGVkLlxuICAgICAqIElmIHlvdSBwYXNzIHRoZSBvcHRpb25hbCBhcmd1bWVudCBhcnJheSB0aGVuIHRob3NlIGFyZ3VtZW50cyB3aWxsIGJlIHBhc3NlZCB0byBldmVyeSBsaXN0ZW5lciB1cG9uIGV4ZWN1dGlvbi5cbiAgICAgKiBCZWNhdXNlIGl0IHVzZXMgYGFwcGx5YCwgeW91ciBhcnJheSBvZiBhcmd1bWVudHMgd2lsbCBiZSBwYXNzZWQgYXMgaWYgeW91IHdyb3RlIHRoZW0gb3V0IHNlcGFyYXRlbHkuXG4gICAgICogU28gdGhleSB3aWxsIG5vdCBhcnJpdmUgd2l0aGluIHRoZSBhcnJheSBvbiB0aGUgb3RoZXIgc2lkZSwgdGhleSB3aWxsIGJlIHNlcGFyYXRlLlxuICAgICAqIFlvdSBjYW4gYWxzbyBwYXNzIGEgcmVndWxhciBleHByZXNzaW9uIHRvIGVtaXQgdG8gYWxsIGV2ZW50cyB0aGF0IG1hdGNoIGl0LlxuICAgICAqXG4gICAgICogQHBhcmFtIHtTdHJpbmd8UmVnRXhwfSBldnQgTmFtZSBvZiB0aGUgZXZlbnQgdG8gZW1pdCBhbmQgZXhlY3V0ZSBsaXN0ZW5lcnMgZm9yLlxuICAgICAqIEBwYXJhbSB7QXJyYXl9IFthcmdzXSBPcHRpb25hbCBhcnJheSBvZiBhcmd1bWVudHMgdG8gYmUgcGFzc2VkIHRvIGVhY2ggbGlzdGVuZXIuXG4gICAgICogQHJldHVybiB7T2JqZWN0fSBDdXJyZW50IGluc3RhbmNlIG9mIEV2ZW50RW1pdHRlciBmb3IgY2hhaW5pbmcuXG4gICAgICovXG4gICAgcHJvdG8uZW1pdEV2ZW50ID0gZnVuY3Rpb24gZW1pdEV2ZW50KGV2dCwgYXJncykge1xuICAgICAgICB2YXIgbGlzdGVuZXJzTWFwID0gdGhpcy5nZXRMaXN0ZW5lcnNBc09iamVjdChldnQpO1xuICAgICAgICB2YXIgbGlzdGVuZXJzO1xuICAgICAgICB2YXIgbGlzdGVuZXI7XG4gICAgICAgIHZhciBpO1xuICAgICAgICB2YXIga2V5O1xuICAgICAgICB2YXIgcmVzcG9uc2U7XG5cbiAgICAgICAgZm9yIChrZXkgaW4gbGlzdGVuZXJzTWFwKSB7XG4gICAgICAgICAgICBpZiAobGlzdGVuZXJzTWFwLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnNNYXBba2V5XS5zbGljZSgwKTtcblxuICAgICAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBsaXN0ZW5lcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSWYgdGhlIGxpc3RlbmVyIHJldHVybnMgdHJ1ZSB0aGVuIGl0IHNoYWxsIGJlIHJlbW92ZWQgZnJvbSB0aGUgZXZlbnRcbiAgICAgICAgICAgICAgICAgICAgLy8gVGhlIGZ1bmN0aW9uIGlzIGV4ZWN1dGVkIGVpdGhlciB3aXRoIGEgYmFzaWMgY2FsbCBvciBhbiBhcHBseSBpZiB0aGVyZSBpcyBhbiBhcmdzIGFycmF5XG4gICAgICAgICAgICAgICAgICAgIGxpc3RlbmVyID0gbGlzdGVuZXJzW2ldO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChsaXN0ZW5lci5vbmNlID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKGV2dCwgbGlzdGVuZXIubGlzdGVuZXIpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UgPSBsaXN0ZW5lci5saXN0ZW5lci5hcHBseSh0aGlzLCBhcmdzIHx8IFtdKTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UgPT09IHRoaXMuX2dldE9uY2VSZXR1cm5WYWx1ZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKGV2dCwgbGlzdGVuZXIubGlzdGVuZXIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEFsaWFzIG9mIGVtaXRFdmVudFxuICAgICAqL1xuICAgIHByb3RvLnRyaWdnZXIgPSBhbGlhcygnZW1pdEV2ZW50Jyk7XG5cbiAgICAvKipcbiAgICAgKiBTdWJ0bHkgZGlmZmVyZW50IGZyb20gZW1pdEV2ZW50IGluIHRoYXQgaXQgd2lsbCBwYXNzIGl0cyBhcmd1bWVudHMgb24gdG8gdGhlIGxpc3RlbmVycywgYXMgb3Bwb3NlZCB0byB0YWtpbmcgYSBzaW5nbGUgYXJyYXkgb2YgYXJndW1lbnRzIHRvIHBhc3Mgb24uXG4gICAgICogQXMgd2l0aCBlbWl0RXZlbnQsIHlvdSBjYW4gcGFzcyBhIHJlZ2V4IGluIHBsYWNlIG9mIHRoZSBldmVudCBuYW1lIHRvIGVtaXQgdG8gYWxsIGV2ZW50cyB0aGF0IG1hdGNoIGl0LlxuICAgICAqXG4gICAgICogQHBhcmFtIHtTdHJpbmd8UmVnRXhwfSBldnQgTmFtZSBvZiB0aGUgZXZlbnQgdG8gZW1pdCBhbmQgZXhlY3V0ZSBsaXN0ZW5lcnMgZm9yLlxuICAgICAqIEBwYXJhbSB7Li4uKn0gT3B0aW9uYWwgYWRkaXRpb25hbCBhcmd1bWVudHMgdG8gYmUgcGFzc2VkIHRvIGVhY2ggbGlzdGVuZXIuXG4gICAgICogQHJldHVybiB7T2JqZWN0fSBDdXJyZW50IGluc3RhbmNlIG9mIEV2ZW50RW1pdHRlciBmb3IgY2hhaW5pbmcuXG4gICAgICovXG4gICAgcHJvdG8uZW1pdCA9IGZ1bmN0aW9uIGVtaXQoZXZ0KSB7XG4gICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuZW1pdEV2ZW50KGV2dCwgYXJncyk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNldHMgdGhlIGN1cnJlbnQgdmFsdWUgdG8gY2hlY2sgYWdhaW5zdCB3aGVuIGV4ZWN1dGluZyBsaXN0ZW5lcnMuIElmIGFcbiAgICAgKiBsaXN0ZW5lcnMgcmV0dXJuIHZhbHVlIG1hdGNoZXMgdGhlIG9uZSBzZXQgaGVyZSB0aGVuIGl0IHdpbGwgYmUgcmVtb3ZlZFxuICAgICAqIGFmdGVyIGV4ZWN1dGlvbi4gVGhpcyB2YWx1ZSBkZWZhdWx0cyB0byB0cnVlLlxuICAgICAqXG4gICAgICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgbmV3IHZhbHVlIHRvIGNoZWNrIGZvciB3aGVuIGV4ZWN1dGluZyBsaXN0ZW5lcnMuXG4gICAgICogQHJldHVybiB7T2JqZWN0fSBDdXJyZW50IGluc3RhbmNlIG9mIEV2ZW50RW1pdHRlciBmb3IgY2hhaW5pbmcuXG4gICAgICovXG4gICAgcHJvdG8uc2V0T25jZVJldHVyblZhbHVlID0gZnVuY3Rpb24gc2V0T25jZVJldHVyblZhbHVlKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuX29uY2VSZXR1cm5WYWx1ZSA9IHZhbHVlO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogRmV0Y2hlcyB0aGUgY3VycmVudCB2YWx1ZSB0byBjaGVjayBhZ2FpbnN0IHdoZW4gZXhlY3V0aW5nIGxpc3RlbmVycy4gSWZcbiAgICAgKiB0aGUgbGlzdGVuZXJzIHJldHVybiB2YWx1ZSBtYXRjaGVzIHRoaXMgb25lIHRoZW4gaXQgc2hvdWxkIGJlIHJlbW92ZWRcbiAgICAgKiBhdXRvbWF0aWNhbGx5LiBJdCB3aWxsIHJldHVybiB0cnVlIGJ5IGRlZmF1bHQuXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIHsqfEJvb2xlYW59IFRoZSBjdXJyZW50IHZhbHVlIHRvIGNoZWNrIGZvciBvciB0aGUgZGVmYXVsdCwgdHJ1ZS5cbiAgICAgKiBAYXBpIHByaXZhdGVcbiAgICAgKi9cbiAgICBwcm90by5fZ2V0T25jZVJldHVyblZhbHVlID0gZnVuY3Rpb24gX2dldE9uY2VSZXR1cm5WYWx1ZSgpIHtcbiAgICAgICAgaWYgKHRoaXMuaGFzT3duUHJvcGVydHkoJ19vbmNlUmV0dXJuVmFsdWUnKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX29uY2VSZXR1cm5WYWx1ZTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEZldGNoZXMgdGhlIGV2ZW50cyBvYmplY3QgYW5kIGNyZWF0ZXMgb25lIGlmIHJlcXVpcmVkLlxuICAgICAqXG4gICAgICogQHJldHVybiB7T2JqZWN0fSBUaGUgZXZlbnRzIHN0b3JhZ2Ugb2JqZWN0LlxuICAgICAqIEBhcGkgcHJpdmF0ZVxuICAgICAqL1xuICAgIHByb3RvLl9nZXRFdmVudHMgPSBmdW5jdGlvbiBfZ2V0RXZlbnRzKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZXZlbnRzIHx8ICh0aGlzLl9ldmVudHMgPSB7fSk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJldmVydHMgdGhlIGdsb2JhbCB7QGxpbmsgRXZlbnRFbWl0dGVyfSB0byBpdHMgcHJldmlvdXMgdmFsdWUgYW5kIHJldHVybnMgYSByZWZlcmVuY2UgdG8gdGhpcyB2ZXJzaW9uLlxuICAgICAqXG4gICAgICogQHJldHVybiB7RnVuY3Rpb259IE5vbiBjb25mbGljdGluZyBFdmVudEVtaXR0ZXIgY2xhc3MuXG4gICAgICovXG4gICAgRXZlbnRFbWl0dGVyLm5vQ29uZmxpY3QgPSBmdW5jdGlvbiBub0NvbmZsaWN0KCkge1xuICAgICAgICBleHBvcnRzLkV2ZW50RW1pdHRlciA9IG9yaWdpbmFsR2xvYmFsVmFsdWU7XG4gICAgICAgIHJldHVybiBFdmVudEVtaXR0ZXI7XG4gICAgfTtcblxuICAgIC8vIEV4cG9zZSB0aGUgY2xhc3MgZWl0aGVyIHZpYSBBTUQsIENvbW1vbkpTIG9yIHRoZSBnbG9iYWwgb2JqZWN0XG4gICAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgICAgICBkZWZpbmUoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIEV2ZW50RW1pdHRlcjtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKXtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBleHBvcnRzLkV2ZW50RW1pdHRlciA9IEV2ZW50RW1pdHRlcjtcbiAgICB9XG59KHRoaXMgfHwge30pKTtcbiIsImltcG9ydCB7IE9wZW5WaWR1IH0gZnJvbSAnLi9PcGVuVmlkdS9PcGVuVmlkdSc7XG5cbmlmICh3aW5kb3cpIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tc3RyaW5nLWxpdGVyYWxcbiAgICB3aW5kb3dbJ09wZW5WaWR1J10gPSBPcGVuVmlkdTtcbn0iLCIvKlxuICogKEMpIENvcHlyaWdodCAyMDE3LTIwMTggT3BlblZpZHUgKGh0dHBzOi8vb3BlbnZpZHUuaW8vKVxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKlxuICovXG5cbmltcG9ydCB7IFNlc3Npb24gfSBmcm9tICcuL1Nlc3Npb24nO1xuaW1wb3J0IHsgU3RyZWFtIH0gZnJvbSAnLi9TdHJlYW0nO1xuaW1wb3J0IHsgQ29ubmVjdGlvbk9wdGlvbnMgfSBmcm9tICcuLi9PcGVuVmlkdUludGVybmFsL0ludGVyZmFjZXMvUHJpdmF0ZS9Db25uZWN0aW9uT3B0aW9ucyc7XG5pbXBvcnQgeyBJbmJvdW5kU3RyZWFtT3B0aW9ucyB9IGZyb20gJy4uL09wZW5WaWR1SW50ZXJuYWwvSW50ZXJmYWNlcy9Qcml2YXRlL0luYm91bmRTdHJlYW1PcHRpb25zJztcbmltcG9ydCB7IFN0cmVhbU9wdGlvbnNTZXJ2ZXIgfSBmcm9tICcuLi9PcGVuVmlkdUludGVybmFsL0ludGVyZmFjZXMvUHJpdmF0ZS9TdHJlYW1PcHRpb25zU2VydmVyJztcblxuXG4vKipcbiAqIFJlcHJlc2VudHMgZWFjaCBvbmUgb2YgdGhlIHVzZXIncyBjb25uZWN0aW9uIHRvIHRoZSBzZXNzaW9uICh0aGUgbG9jYWwgb25lIGFuZCBvdGhlciB1c2VyJ3MgY29ubmVjdGlvbnMpLlxuICogVGhlcmVmb3JlIGVhY2ggW1tTZXNzaW9uXV0gYW5kIFtbU3RyZWFtXV0gb2JqZWN0IGhhcyBhbiBhdHRyaWJ1dGUgb2YgdHlwZSBDb25uZWN0aW9uXG4gKi9cbmV4cG9ydCBjbGFzcyBDb25uZWN0aW9uIHtcblxuICAgIC8qKlxuICAgICAqIFVuaXF1ZSBpZGVudGlmaWVyIG9mIHRoZSBjb25uZWN0aW9uXG4gICAgICovXG4gICAgY29ubmVjdGlvbklkOiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBUaW1lIHdoZW4gdGhpcyBjb25uZWN0aW9uIHdhcyBjcmVhdGVkIChVVEMgbWlsbGlzZWNvbmRzKVxuICAgICAqL1xuICAgIGNyZWF0aW9uVGltZTogbnVtYmVyO1xuXG4gICAgLyoqXG4gICAgICogRGF0YSBhc3NvY2lhdGVkIHRvIHRoaXMgY29ubmVjdGlvbiAoYW5kIHRoZXJlZm9yZSB0byBjZXJ0YWluIHVzZXIpLiBUaGlzIGlzIGFuIGltcG9ydGFudCBmaWVsZDpcbiAgICAgKiBpdCBhbGxvd3MgeW91IHRvIGJyb2FkY2FzdCBhbGwgdGhlIGluZm9ybWF0aW9uIHlvdSB3YW50IGZvciBlYWNoIHVzZXIgKGEgdXNlcm5hbWUsIGZvciBleGFtcGxlKVxuICAgICAqL1xuICAgIGRhdGE6IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIEBoaWRkZW5cbiAgICAgKi9cbiAgICBzdHJlYW06IFN0cmVhbTtcblxuICAgIC8qKlxuICAgICAqIEBoaWRkZW5cbiAgICAgKi9cbiAgICBvcHRpb25zOiBDb25uZWN0aW9uT3B0aW9ucyB8IHVuZGVmaW5lZDtcblxuICAgIC8qKlxuICAgICAqIEBoaWRkZW5cbiAgICAgKi9cbiAgICBkaXNwb3NlZCA9IGZhbHNlO1xuXG4gICAgLyoqXG4gICAgICogQGhpZGRlblxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgc2Vzc2lvbjogU2Vzc2lvbiwgb3B0cz86IENvbm5lY3Rpb25PcHRpb25zKSB7XG5cbiAgICAgICAgbGV0IG1zZyA9IFwiJ0Nvbm5lY3Rpb24nIGNyZWF0ZWQgXCI7XG4gICAgICAgIGlmICghIW9wdHMpIHtcbiAgICAgICAgICAgIG1zZyArPSBcIihyZW1vdGUpIHdpdGggJ2Nvbm5lY3Rpb25JZCcgW1wiICsgb3B0cy5pZCArICddJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG1zZyArPSAnKGxvY2FsKSc7XG4gICAgICAgIH1cbiAgICAgICAgY29uc29sZS5pbmZvKG1zZyk7XG5cbiAgICAgICAgdGhpcy5vcHRpb25zID0gb3B0cztcblxuICAgICAgICBpZiAoISFvcHRzKSB7XG4gICAgICAgICAgICAvLyBDb25uZWN0aW9uIGlzIHJlbW90ZVxuICAgICAgICAgICAgdGhpcy5jb25uZWN0aW9uSWQgPSBvcHRzLmlkO1xuICAgICAgICAgICAgaWYgKG9wdHMubWV0YWRhdGEpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmRhdGEgPSBvcHRzLm1ldGFkYXRhO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG9wdHMuc3RyZWFtcykge1xuICAgICAgICAgICAgICAgIHRoaXMuaW5pdFJlbW90ZVN0cmVhbXMob3B0cy5zdHJlYW1zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY3JlYXRpb25UaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgfVxuXG5cbiAgICAvKiBIaWRkZW4gbWV0aG9kcyAqL1xuXG4gICAgLyoqXG4gICAgICogQGhpZGRlblxuICAgICAqL1xuICAgIHNlbmRJY2VDYW5kaWRhdGUoY2FuZGlkYXRlOiBSVENJY2VDYW5kaWRhdGUpOiB2b2lkIHtcblxuICAgICAgICBjb25zb2xlLmRlYnVnKCghIXRoaXMuc3RyZWFtLm91dGJvdW5kU3RyZWFtT3B0cyA/ICdMb2NhbCcgOiAnUmVtb3RlJyksICdjYW5kaWRhdGUgZm9yJyxcbiAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbklkLCBKU09OLnN0cmluZ2lmeShjYW5kaWRhdGUpKTtcblxuICAgICAgICB0aGlzLnNlc3Npb24ub3BlbnZpZHUuc2VuZFJlcXVlc3QoJ29uSWNlQ2FuZGlkYXRlJywge1xuICAgICAgICAgICAgZW5kcG9pbnROYW1lOiB0aGlzLmNvbm5lY3Rpb25JZCxcbiAgICAgICAgICAgIGNhbmRpZGF0ZTogY2FuZGlkYXRlLmNhbmRpZGF0ZSxcbiAgICAgICAgICAgIHNkcE1pZDogY2FuZGlkYXRlLnNkcE1pZCxcbiAgICAgICAgICAgIHNkcE1MaW5lSW5kZXg6IGNhbmRpZGF0ZS5zZHBNTGluZUluZGV4XG4gICAgICAgIH0sIChlcnJvciwgcmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHNlbmRpbmcgSUNFIGNhbmRpZGF0ZTogJ1xuICAgICAgICAgICAgICAgICAgICArIEpTT04uc3RyaW5naWZ5KGVycm9yKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBoaWRkZW5cbiAgICAgKi9cbiAgICBpbml0UmVtb3RlU3RyZWFtcyhvcHRpb25zOiBTdHJlYW1PcHRpb25zU2VydmVyW10pOiB2b2lkIHtcblxuICAgICAgICAvLyBUaGlzIGlzIHJlYWR5IGZvciBzdXBwb3J0aW5nIG11bHRpcGxlIHN0cmVhbXMgcGVyIENvbm5lY3Rpb24gb2JqZWN0LiBSaWdodCBub3cgdGhlIGxvb3Agd2lsbCBhbHdheXMgcnVuIGp1c3Qgb25jZVxuICAgICAgICAvLyB0aGlzLnN0cmVhbSBzaG91bGQgYWxzbyBiZSByZXBsYWNlZCBieSBhIGNvbGxlY3Rpb24gb2Ygc3RyZWFtcyB0byBzdXBwb3J0IG11bHRpcGxlIHN0cmVhbXMgcGVyIENvbm5lY3Rpb25cbiAgICAgICAgb3B0aW9ucy5mb3JFYWNoKG9wdHMgPT4ge1xuICAgICAgICAgICAgY29uc3Qgc3RyZWFtT3B0aW9uczogSW5ib3VuZFN0cmVhbU9wdGlvbnMgPSB7XG4gICAgICAgICAgICAgICAgaWQ6IG9wdHMuaWQsXG4gICAgICAgICAgICAgICAgY29ubmVjdGlvbjogdGhpcyxcbiAgICAgICAgICAgICAgICBmcmFtZVJhdGU6IG9wdHMuZnJhbWVSYXRlLFxuICAgICAgICAgICAgICAgIHJlY3ZBdWRpbzogb3B0cy5hdWRpb0FjdGl2ZSxcbiAgICAgICAgICAgICAgICByZWN2VmlkZW86IG9wdHMudmlkZW9BY3RpdmUsXG4gICAgICAgICAgICAgICAgdHlwZU9mVmlkZW86IG9wdHMudHlwZU9mVmlkZW9cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBjb25zdCBzdHJlYW0gPSBuZXcgU3RyZWFtKHRoaXMuc2Vzc2lvbiwgc3RyZWFtT3B0aW9ucyk7XG5cbiAgICAgICAgICAgIHRoaXMuYWRkU3RyZWFtKHN0cmVhbSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnNvbGUuaW5mbyhcIlJlbW90ZSAnQ29ubmVjdGlvbicgd2l0aCAnY29ubmVjdGlvbklkJyBbXCIgKyB0aGlzLmNvbm5lY3Rpb25JZCArICddIGlzIG5vdyBjb25maWd1cmVkIGZvciByZWNlaXZpbmcgU3RyZWFtcyB3aXRoIG9wdGlvbnM6ICcsIHRoaXMuc3RyZWFtLmluYm91bmRTdHJlYW1PcHRzKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAaGlkZGVuXG4gICAgICovXG4gICAgYWRkU3RyZWFtKHN0cmVhbTogU3RyZWFtKTogdm9pZCB7XG4gICAgICAgIHN0cmVhbS5jb25uZWN0aW9uID0gdGhpcztcbiAgICAgICAgdGhpcy5zdHJlYW0gPSBzdHJlYW07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGhpZGRlblxuICAgICAqL1xuICAgIHJlbW92ZVN0cmVhbShzdHJlYW1JZDogc3RyaW5nKTogdm9pZCB7XG4gICAgICAgIGRlbGV0ZSB0aGlzLnN0cmVhbTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAaGlkZGVuXG4gICAgICovXG4gICAgZGlzcG9zZSgpOiB2b2lkIHtcbiAgICAgICAgaWYgKCEhdGhpcy5zdHJlYW0pIHtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLnN0cmVhbTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmRpc3Bvc2VkID0gdHJ1ZTtcbiAgICB9XG5cbn0iLCIvKlxuICogKEMpIENvcHlyaWdodCAyMDE3LTIwMTggT3BlblZpZHUgKGh0dHBzOi8vb3BlbnZpZHUuaW8vKVxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKlxuICovXG5cbmltcG9ydCB7IFN0cmVhbSB9IGZyb20gJy4vU3RyZWFtJztcbmltcG9ydCB7IExvY2FsUmVjb3JkZXJTdGF0ZSB9IGZyb20gJy4uL09wZW5WaWR1SW50ZXJuYWwvRW51bXMvTG9jYWxSZWNvcmRlclN0YXRlJztcblxuLyoqXG4gKiBAaGlkZGVuXG4gKi9cbmRlY2xhcmUgdmFyIE1lZGlhUmVjb3JkZXI6IGFueTtcblxuXG4vKipcbiAqIEVhc3kgcmVjb3JkaW5nIG9mIFtbU3RyZWFtXV0gb2JqZWN0cyBzdHJhaWdodGF3YXkgZnJvbSB0aGUgYnJvd3Nlci5cbiAqXG4gKiA+IFdBUk5JTkc6IFBlcmZvcm1pbmcgYnJvd3NlciBsb2NhbCByZWNvcmRpbmcgb2YgKipyZW1vdGUgc3RyZWFtcyoqIG1heSBjYXVzZSBzb21lIHRyb3VibGVzLiBBIGxvbmcgd2FpdGluZyB0aW1lIG1heSBiZSByZXF1aXJlZCBhZnRlciBjYWxsaW5nIF9Mb2NhbFJlY29yZGVyLnN0b3AoKV8gaW4gdGhpcyBjYXNlXG4gKi9cbmV4cG9ydCBjbGFzcyBMb2NhbFJlY29yZGVyIHtcblxuICAgIHN0YXRlOiBMb2NhbFJlY29yZGVyU3RhdGU7XG5cbiAgICBwcml2YXRlIGNvbm5lY3Rpb25JZDogc3RyaW5nO1xuICAgIHByaXZhdGUgbWVkaWFSZWNvcmRlcjogYW55O1xuICAgIHByaXZhdGUgY2h1bmtzOiBhbnlbXSA9IFtdO1xuICAgIHByaXZhdGUgYmxvYjogQmxvYjtcbiAgICBwcml2YXRlIGNvdW50ID0gMDtcbiAgICBwcml2YXRlIGlkOiBzdHJpbmc7XG4gICAgcHJpdmF0ZSB2aWRlb1ByZXZpZXdTcmM6IHN0cmluZztcbiAgICBwcml2YXRlIGh0bWxQYXJlbnRFbGVtZW50SWQ6IHN0cmluZztcbiAgICBwcml2YXRlIHZpZGVvUHJldmlldzogSFRNTFZpZGVvRWxlbWVudDtcblxuICAgIC8qKlxuICAgICAqIEBoaWRkZW5cbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIHN0cmVhbTogU3RyZWFtKSB7XG4gICAgICAgIHRoaXMuY29ubmVjdGlvbklkID0gKCEhdGhpcy5zdHJlYW0uY29ubmVjdGlvbikgPyB0aGlzLnN0cmVhbS5jb25uZWN0aW9uLmNvbm5lY3Rpb25JZCA6ICdkZWZhdWx0LWNvbm5lY3Rpb24nO1xuICAgICAgICB0aGlzLmlkID0gdGhpcy5zdHJlYW0uc3RyZWFtSWQgKyAnXycgKyB0aGlzLmNvbm5lY3Rpb25JZCArICdfbG9jYWxyZWNvcmQnO1xuICAgICAgICB0aGlzLnN0YXRlID0gTG9jYWxSZWNvcmRlclN0YXRlLlJFQURZO1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICogU3RhcnRzIHRoZSByZWNvcmRpbmcgb2YgdGhlIFN0cmVhbS4gW1tzdGF0ZV1dIHByb3BlcnR5IG11c3QgYmUgYFJFQURZYC4gQWZ0ZXIgbWV0aG9kIHN1Y2NlZWRzIGlzIHNldCB0byBgUkVDT1JESU5HYFxuICAgICAqIEByZXR1cm5zIEEgUHJvbWlzZSAodG8gd2hpY2ggeW91IGNhbiBvcHRpb25hbGx5IHN1YnNjcmliZSB0bykgdGhhdCBpcyByZXNvbHZlZCBpZiB0aGUgcmVjb3JkaW5nIHN1Y2Nlc3NmdWxseSBzdGFydGVkIGFuZCByZWplY3RlZCB3aXRoIGFuIEVycm9yIG9iamVjdCBpZiBub3RcbiAgICAgKi9cbiAgICByZWNvcmQoKTogUHJvbWlzZTxhbnk+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcblxuICAgICAgICAgICAgdHJ5IHtcblxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgTWVkaWFSZWNvcmRlciA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignTWVkaWFSZWNvcmRlciBub3Qgc3VwcG9ydGVkIG9uIHlvdXIgYnJvd3Nlci4gU2VlIGNvbXBhdGliaWxpdHkgaW4gaHR0cHM6Ly9jYW5pdXNlLmNvbS8jc2VhcmNoPU1lZGlhUmVjb3JkZXInKTtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgKEVycm9yKCdNZWRpYVJlY29yZGVyIG5vdCBzdXBwb3J0ZWQgb24geW91ciBicm93c2VyLiBTZWUgY29tcGF0aWJpbGl0eSBpbiBodHRwczovL2Nhbml1c2UuY29tLyNzZWFyY2g9TWVkaWFSZWNvcmRlcicpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuc3RhdGUgIT09IExvY2FsUmVjb3JkZXJTdGF0ZS5SRUFEWSkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyAoRXJyb3IoJ1xcJ0xvY2FsUmVjb3JkLnJlY29yZCgpXFwnIG5lZWRzIFxcJ0xvY2FsUmVjb3JkLnN0YXRlXFwnIHRvIGJlIFxcJ1JFQURZXFwnIChjdXJyZW50IHZhbHVlOiBcXCcnICsgdGhpcy5zdGF0ZSArICdcXCcpLiBDYWxsIFxcJ0xvY2FsUmVjb3JkZXIuY2xlYW4oKVxcJyBvciBpbml0IGEgbmV3IExvY2FsUmVjb3JkZXIgYmVmb3JlJykpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlN0YXJ0aW5nIGxvY2FsIHJlY29yZGluZyBvZiBzdHJlYW0gJ1wiICsgdGhpcy5zdHJlYW0uc3RyZWFtSWQgKyBcIicgb2YgY29ubmVjdGlvbiAnXCIgKyB0aGlzLmNvbm5lY3Rpb25JZCArIFwiJ1wiKTtcblxuXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBNZWRpYVJlY29yZGVyLmlzVHlwZVN1cHBvcnRlZCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICBsZXQgb3B0aW9ucztcbiAgICAgICAgICAgICAgICAgICAgaWYgKE1lZGlhUmVjb3JkZXIuaXNUeXBlU3VwcG9ydGVkKCd2aWRlby93ZWJtO2NvZGVjcz12cDknKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucyA9IHsgbWltZVR5cGU6ICd2aWRlby93ZWJtO2NvZGVjcz12cDknIH07XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoTWVkaWFSZWNvcmRlci5pc1R5cGVTdXBwb3J0ZWQoJ3ZpZGVvL3dlYm07Y29kZWNzPWgyNjQnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucyA9IHsgbWltZVR5cGU6ICd2aWRlby93ZWJtO2NvZGVjcz1oMjY0JyB9O1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKE1lZGlhUmVjb3JkZXIuaXNUeXBlU3VwcG9ydGVkKCd2aWRlby93ZWJtO2NvZGVjcz12cDgnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucyA9IHsgbWltZVR5cGU6ICd2aWRlby93ZWJtO2NvZGVjcz12cDgnIH07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1VzaW5nIG1pbWVUeXBlICcgKyBvcHRpb25zLm1pbWVUeXBlKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tZWRpYVJlY29yZGVyID0gbmV3IE1lZGlhUmVjb3JkZXIodGhpcy5zdHJlYW0uZ2V0TWVkaWFTdHJlYW0oKSwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdpc1R5cGVTdXBwb3J0ZWQgaXMgbm90IHN1cHBvcnRlZCwgdXNpbmcgZGVmYXVsdCBjb2RlY3MgZm9yIGJyb3dzZXInKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tZWRpYVJlY29yZGVyID0gbmV3IE1lZGlhUmVjb3JkZXIodGhpcy5zdHJlYW0uZ2V0TWVkaWFTdHJlYW0oKSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdGhpcy5tZWRpYVJlY29yZGVyLnN0YXJ0KDEwKTtcblxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMubWVkaWFSZWNvcmRlci5vbmRhdGFhdmFpbGFibGUgPSAoZSkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuY2h1bmtzLnB1c2goZS5kYXRhKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHRoaXMubWVkaWFSZWNvcmRlci5vbmVycm9yID0gKGUpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdNZWRpYVJlY29yZGVyIGVycm9yOiAnLCBlKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHRoaXMubWVkaWFSZWNvcmRlci5vbnN0YXJ0ID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdNZWRpYVJlY29yZGVyIHN0YXJ0ZWQgKHN0YXRlPScgKyB0aGlzLm1lZGlhUmVjb3JkZXIuc3RhdGUgKyAnKScpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdGhpcy5tZWRpYVJlY29yZGVyLm9uc3RvcCA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLm9uU3RvcERlZmF1bHQoKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHRoaXMubWVkaWFSZWNvcmRlci5vbnBhdXNlID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdNZWRpYVJlY29yZGVyIHBhdXNlZCAoc3RhdGU9JyArIHRoaXMubWVkaWFSZWNvcmRlci5zdGF0ZSArICcpJyk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB0aGlzLm1lZGlhUmVjb3JkZXIub25yZXN1bWUgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ01lZGlhUmVjb3JkZXIgcmVzdW1lZCAoc3RhdGU9JyArIHRoaXMubWVkaWFSZWNvcmRlci5zdGF0ZSArICcpJyk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB0aGlzLm1lZGlhUmVjb3JkZXIub253YXJuaW5nID0gKGUpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnTWVkaWFSZWNvcmRlciB3YXJuaW5nOiAnICsgZSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gTG9jYWxSZWNvcmRlclN0YXRlLlJFQ09SRElORztcbiAgICAgICAgICAgIHJlc29sdmUoKTtcblxuICAgICAgICB9KTtcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqIEVuZHMgdGhlIHJlY29yZGluZyBvZiB0aGUgU3RyZWFtLiBbW3N0YXRlXV0gcHJvcGVydHkgbXVzdCBiZSBgUkVDT1JESU5HYCBvciBgUEFVU0VEYC4gQWZ0ZXIgbWV0aG9kIHN1Y2NlZWRzIGlzIHNldCB0byBgRklOSVNIRURgXG4gICAgICogQHJldHVybnMgQSBQcm9taXNlICh0byB3aGljaCB5b3UgY2FuIG9wdGlvbmFsbHkgc3Vic2NyaWJlIHRvKSB0aGF0IGlzIHJlc29sdmVkIGlmIHRoZSByZWNvcmRpbmcgc3VjY2Vzc2Z1bGx5IHN0b3BwZWQgYW5kIHJlamVjdGVkIHdpdGggYW4gRXJyb3Igb2JqZWN0IGlmIG5vdFxuICAgICAqL1xuICAgIHN0b3AoKTogUHJvbWlzZTxhbnk+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuc3RhdGUgPT09IExvY2FsUmVjb3JkZXJTdGF0ZS5SRUFEWSB8fCB0aGlzLnN0YXRlID09PSBMb2NhbFJlY29yZGVyU3RhdGUuRklOSVNIRUQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgKEVycm9yKCdcXCdMb2NhbFJlY29yZC5zdG9wKClcXCcgbmVlZHMgXFwnTG9jYWxSZWNvcmQuc3RhdGVcXCcgdG8gYmUgXFwnUkVDT1JESU5HXFwnIG9yIFxcJ1BBVVNFRFxcJyAoY3VycmVudCB2YWx1ZTogXFwnJyArIHRoaXMuc3RhdGUgKyAnXFwnKS4gQ2FsbCBcXCdMb2NhbFJlY29yZGVyLnN0YXJ0KClcXCcgYmVmb3JlJykpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLm1lZGlhUmVjb3JkZXIub25zdG9wID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm9uU3RvcERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgdGhpcy5tZWRpYVJlY29yZGVyLnN0b3AoKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICByZWplY3QoZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICogUGF1c2VzIHRoZSByZWNvcmRpbmcgb2YgdGhlIFN0cmVhbS4gW1tzdGF0ZV1dIHByb3BlcnR5IG11c3QgYmUgYFJFQ09SRElOR2AuIEFmdGVyIG1ldGhvZCBzdWNjZWVkcyBpcyBzZXQgdG8gYFBBVVNFRGBcbiAgICAgKiBAcmV0dXJucyBBIFByb21pc2UgKHRvIHdoaWNoIHlvdSBjYW4gb3B0aW9uYWxseSBzdWJzY3JpYmUgdG8pIHRoYXQgaXMgcmVzb2x2ZWQgaWYgdGhlIHJlY29yZGluZyB3YXMgc3VjY2Vzc2Z1bGx5IHBhdXNlZCBhbmQgcmVqZWN0ZWQgd2l0aCBhbiBFcnJvciBvYmplY3QgaWYgbm90XG4gICAgICovXG4gICAgcGF1c2UoKTogUHJvbWlzZTxhbnk+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuc3RhdGUgIT09IExvY2FsUmVjb3JkZXJTdGF0ZS5SRUNPUkRJTkcpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KEVycm9yKCdcXCdMb2NhbFJlY29yZC5wYXVzZSgpXFwnIG5lZWRzIFxcJ0xvY2FsUmVjb3JkLnN0YXRlXFwnIHRvIGJlIFxcJ1JFQ09SRElOR1xcJyAoY3VycmVudCB2YWx1ZTogXFwnJyArIHRoaXMuc3RhdGUgKyAnXFwnKS4gQ2FsbCBcXCdMb2NhbFJlY29yZGVyLnN0YXJ0KClcXCcgb3IgXFwnTG9jYWxSZWNvcmRlci5yZXN1bWUoKVxcJyBiZWZvcmUnKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMubWVkaWFSZWNvcmRlci5wYXVzZSgpO1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBMb2NhbFJlY29yZGVyU3RhdGUuUEFVU0VEO1xuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXN1bWVzIHRoZSByZWNvcmRpbmcgb2YgdGhlIFN0cmVhbS4gW1tzdGF0ZV1dIHByb3BlcnR5IG11c3QgYmUgYFBBVVNFRGAuIEFmdGVyIG1ldGhvZCBzdWNjZWVkcyBpcyBzZXQgdG8gYFJFQ09SRElOR2BcbiAgICAgKiBAcmV0dXJucyBBIFByb21pc2UgKHRvIHdoaWNoIHlvdSBjYW4gb3B0aW9uYWxseSBzdWJzY3JpYmUgdG8pIHRoYXQgaXMgcmVzb2x2ZWQgaWYgdGhlIHJlY29yZGluZyB3YXMgc3VjY2Vzc2Z1bGx5IHJlc3VtZWQgYW5kIHJlamVjdGVkIHdpdGggYW4gRXJyb3Igb2JqZWN0IGlmIG5vdFxuICAgICAqL1xuICAgIHJlc3VtZSgpOiBQcm9taXNlPGFueT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5zdGF0ZSAhPT0gTG9jYWxSZWNvcmRlclN0YXRlLlBBVVNFRCkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyAoRXJyb3IoJ1xcJ0xvY2FsUmVjb3JkLnJlc3VtZSgpXFwnIG5lZWRzIFxcJ0xvY2FsUmVjb3JkLnN0YXRlXFwnIHRvIGJlIFxcJ1BBVVNFRFxcJyAoY3VycmVudCB2YWx1ZTogXFwnJyArIHRoaXMuc3RhdGUgKyAnXFwnKS4gQ2FsbCBcXCdMb2NhbFJlY29yZGVyLnBhdXNlKClcXCcgYmVmb3JlJykpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLm1lZGlhUmVjb3JkZXIucmVzdW1lKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IExvY2FsUmVjb3JkZXJTdGF0ZS5SRUNPUkRJTkc7XG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICogUHJldmlld3MgdGhlIHJlY29yZGluZywgYXBwZW5kaW5nIGEgbmV3IEhUTUxWaWRlb0VsZW1lbnQgdG8gZWxlbWVudCB3aXRoIGlkIGBwYXJlbnRJZGAuIFtbc3RhdGVdXSBwcm9wZXJ0eSBtdXN0IGJlIGBGSU5JU0hFRGBcbiAgICAgKi9cbiAgICBwcmV2aWV3KHBhcmVudEVsZW1lbnQpOiBIVE1MVmlkZW9FbGVtZW50IHtcblxuICAgICAgICBpZiAodGhpcy5zdGF0ZSAhPT0gTG9jYWxSZWNvcmRlclN0YXRlLkZJTklTSEVEKSB7XG4gICAgICAgICAgICB0aHJvdyAoRXJyb3IoJ1xcJ0xvY2FsUmVjb3JkLnByZXZpZXcoKVxcJyBuZWVkcyBcXCdMb2NhbFJlY29yZC5zdGF0ZVxcJyB0byBiZSBcXCdGSU5JU0hFRFxcJyAoY3VycmVudCB2YWx1ZTogXFwnJyArIHRoaXMuc3RhdGUgKyAnXFwnKS4gQ2FsbCBcXCdMb2NhbFJlY29yZGVyLnN0b3AoKVxcJyBiZWZvcmUnKSk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnZpZGVvUHJldmlldyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3ZpZGVvJyk7XG5cbiAgICAgICAgdGhpcy52aWRlb1ByZXZpZXcuaWQgPSB0aGlzLmlkO1xuICAgICAgICB0aGlzLnZpZGVvUHJldmlldy5hdXRvcGxheSA9IHRydWU7XG5cbiAgICAgICAgaWYgKHR5cGVvZiBwYXJlbnRFbGVtZW50ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgdGhpcy5odG1sUGFyZW50RWxlbWVudElkID0gcGFyZW50RWxlbWVudDtcblxuICAgICAgICAgICAgY29uc3QgcGFyZW50RWxlbWVudERvbSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHBhcmVudEVsZW1lbnQpO1xuICAgICAgICAgICAgaWYgKHBhcmVudEVsZW1lbnREb20pIHtcbiAgICAgICAgICAgICAgICB0aGlzLnZpZGVvUHJldmlldyA9IHBhcmVudEVsZW1lbnREb20uYXBwZW5kQ2hpbGQodGhpcy52aWRlb1ByZXZpZXcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5odG1sUGFyZW50RWxlbWVudElkID0gcGFyZW50RWxlbWVudC5pZDtcbiAgICAgICAgICAgIHRoaXMudmlkZW9QcmV2aWV3ID0gcGFyZW50RWxlbWVudC5hcHBlbmRDaGlsZCh0aGlzLnZpZGVvUHJldmlldyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnZpZGVvUHJldmlldy5zcmMgPSB0aGlzLnZpZGVvUHJldmlld1NyYztcblxuICAgICAgICByZXR1cm4gdGhpcy52aWRlb1ByZXZpZXc7XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKiBHcmFjZWZ1bGx5IHN0b3BzIGFuZCBjbGVhbnMgdGhlIGN1cnJlbnQgcmVjb3JkaW5nIChXQVJOSU5HOiBpdCBpcyBjb21wbGV0ZWx5IGRpc21pc3NlZCkuIFNldHMgW1tzdGF0ZV1dIHRvIGBSRUFEWWAgc28gdGhlIHJlY29yZGluZyBjYW4gc3RhcnQgYWdhaW5cbiAgICAgKi9cbiAgICBjbGVhbigpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgZiA9ICgpID0+IHtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLmJsb2I7XG4gICAgICAgICAgICB0aGlzLmNodW5rcyA9IFtdO1xuICAgICAgICAgICAgdGhpcy5jb3VudCA9IDA7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5tZWRpYVJlY29yZGVyO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IExvY2FsUmVjb3JkZXJTdGF0ZS5SRUFEWTtcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKHRoaXMuc3RhdGUgPT09IExvY2FsUmVjb3JkZXJTdGF0ZS5SRUNPUkRJTkcgfHwgdGhpcy5zdGF0ZSA9PT0gTG9jYWxSZWNvcmRlclN0YXRlLlBBVVNFRCkge1xuICAgICAgICAgICAgdGhpcy5zdG9wKCkudGhlbigoKSA9PiBmKCkpLmNhdGNoKCgpID0+IGYoKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmKCk7XG4gICAgICAgIH1cbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqIERvd25sb2FkcyB0aGUgcmVjb3JkZWQgdmlkZW8gdGhyb3VnaCB0aGUgYnJvd3Nlci4gW1tzdGF0ZV1dIHByb3BlcnR5IG11c3QgYmUgYEZJTklTSEVEYFxuICAgICAqL1xuICAgIGRvd25sb2FkKCk6IHZvaWQge1xuICAgICAgICBpZiAodGhpcy5zdGF0ZSAhPT0gTG9jYWxSZWNvcmRlclN0YXRlLkZJTklTSEVEKSB7XG4gICAgICAgICAgICB0aHJvdyAoRXJyb3IoJ1xcJ0xvY2FsUmVjb3JkLmRvd25sb2FkKClcXCcgbmVlZHMgXFwnTG9jYWxSZWNvcmQuc3RhdGVcXCcgdG8gYmUgXFwnRklOSVNIRURcXCcgKGN1cnJlbnQgdmFsdWU6IFxcJycgKyB0aGlzLnN0YXRlICsgJ1xcJykuIENhbGwgXFwnTG9jYWxSZWNvcmRlci5zdG9wKClcXCcgYmVmb3JlJykpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgYTogSFRNTEFuY2hvckVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG4gICAgICAgICAgICBhLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gICAgICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGEpO1xuXG4gICAgICAgICAgICBjb25zdCB1cmwgPSB3aW5kb3cuVVJMLmNyZWF0ZU9iamVjdFVSTCh0aGlzLmJsb2IpO1xuICAgICAgICAgICAgYS5ocmVmID0gdXJsO1xuICAgICAgICAgICAgYS5kb3dubG9hZCA9IHRoaXMuaWQgKyAnLndlYm0nO1xuICAgICAgICAgICAgYS5jbGljaygpO1xuICAgICAgICAgICAgd2luZG93LlVSTC5yZXZva2VPYmplY3RVUkwodXJsKTtcblxuICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZChhKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldHMgdGhlIHJhdyBCbG9iIGZpbGUuIE1ldGhvZHMgcHJldmlldywgZG93bmxvYWQsIHVwbG9hZEFzQmluYXJ5IGFuZCB1cGxvYWRBc011bHRpcGFydGZpbGUgdXNlIHRoaXMgc2FtZSBmaWxlIHRvIHBlcmZvcm0gdGhlaXIgc3BlY2lmaWMgYWN0aW9ucy4gW1tzdGF0ZV1dIHByb3BlcnR5IG11c3QgYmUgYEZJTklTSEVEYFxuICAgICAqL1xuICAgIGdldEJsb2IoKTogQmxvYiB7XG4gICAgICAgIGlmICh0aGlzLnN0YXRlICE9PSBMb2NhbFJlY29yZGVyU3RhdGUuRklOSVNIRUQpIHtcbiAgICAgICAgICAgIHRocm93IChFcnJvcignQ2FsbCBcXCdMb2NhbFJlY29yZC5zdG9wKClcXCcgYmVmb3JlIGdldHRpbmcgQmxvYiBmaWxlJykpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYmxvYjtcbiAgICAgICAgfVxuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICogVXBsb2FkcyB0aGUgcmVjb3JkZWQgdmlkZW8gYXMgYSBiaW5hcnkgZmlsZSBwZXJmb3JtaW5nIGFuIEhUVFAvUE9TVCBvcGVyYXRpb24gdG8gVVJMIGBlbmRwb2ludGAuIFtbc3RhdGVdXSBwcm9wZXJ0eSBtdXN0IGJlIGBGSU5JU0hFRGAuIE9wdGlvbmFsIEhUVFAgaGVhZGVycyBjYW4gYmUgcGFzc2VkIGFzIHNlY29uZCBwYXJhbWV0ZXIuIEZvciBleGFtcGxlOlxuICAgICAqIGBgYFxuICAgICAqIHZhciBoZWFkZXJzID0ge1xuICAgICAqICBcIkNvb2tpZVwiOiBcIiRWZXJzaW9uPTE7IFNraW49bmV3O1wiLFxuICAgICAqICBcIkF1dGhvcml6YXRpb25cIjpcIkJhc2ljIFFXeGhaR3BianB1SUhObGN0WlE9PVwiXG4gICAgICogfVxuICAgICAqIGBgYFxuICAgICAqIEByZXR1cm5zIEEgUHJvbWlzZSAodG8gd2hpY2ggeW91IGNhbiBvcHRpb25hbGx5IHN1YnNjcmliZSB0bykgdGhhdCBpcyByZXNvbHZlZCB3aXRoIHRoZSBgaHR0cC5yZXNwb25zZVRleHRgIGZyb20gc2VydmVyIGlmIHRoZSBvcGVyYXRpb24gd2FzIHN1Y2Nlc3NmdWwgYW5kIHJlamVjdGVkIHdpdGggdGhlIGZhaWxlZCBgaHR0cC5zdGF0dXNgIGlmIG5vdFxuICAgICAqL1xuICAgIHVwbG9hZEFzQmluYXJ5KGVuZHBvaW50OiBzdHJpbmcsIGhlYWRlcnM/OiBhbnkpOiBQcm9taXNlPGFueT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgaWYgKHRoaXMuc3RhdGUgIT09IExvY2FsUmVjb3JkZXJTdGF0ZS5GSU5JU0hFRCkge1xuICAgICAgICAgICAgICAgIHJlamVjdChFcnJvcignXFwnTG9jYWxSZWNvcmQudXBsb2FkQXNCaW5hcnkoKVxcJyBuZWVkcyBcXCdMb2NhbFJlY29yZC5zdGF0ZVxcJyB0byBiZSBcXCdGSU5JU0hFRFxcJyAoY3VycmVudCB2YWx1ZTogXFwnJyArIHRoaXMuc3RhdGUgKyAnXFwnKS4gQ2FsbCBcXCdMb2NhbFJlY29yZGVyLnN0b3AoKVxcJyBiZWZvcmUnKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0IGh0dHAgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICAgICAgICAgICAgICBodHRwLm9wZW4oJ1BPU1QnLCBlbmRwb2ludCwgdHJ1ZSk7XG5cbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGhlYWRlcnMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKGhlYWRlcnMpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBodHRwLnNldFJlcXVlc3RIZWFkZXIoa2V5LCBoZWFkZXJzW2tleV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaHR0cC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChodHRwLnJlYWR5U3RhdGUgPT09IDQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChodHRwLnN0YXR1cy50b1N0cmluZygpLmNoYXJBdCgwKSA9PT0gJzInKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU3VjY2VzcyByZXNwb25zZSBmcm9tIHNlcnZlciAoSFRUUCBzdGF0dXMgc3RhbmRhcmQ6IDJYWCBpcyBzdWNjZXNzKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoaHR0cC5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoaHR0cC5zdGF0dXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBodHRwLnNlbmQodGhpcy5ibG9iKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKiBVcGxvYWRzIHRoZSByZWNvcmRlZCB2aWRlbyBhcyBhIG11bHRpcGFydCBmaWxlIHBlcmZvcm1pbmcgYW4gSFRUUC9QT1NUIG9wZXJhdGlvbiB0byBVUkwgYGVuZHBvaW50YC4gW1tzdGF0ZV1dIHByb3BlcnR5IG11c3QgYmUgYEZJTklTSEVEYC4gT3B0aW9uYWwgSFRUUCBoZWFkZXJzIGNhbiBiZSBwYXNzZWQgYXMgc2Vjb25kIHBhcmFtZXRlci4gRm9yIGV4YW1wbGU6XG4gICAgICogYGBgXG4gICAgICogdmFyIGhlYWRlcnMgPSB7XG4gICAgICogIFwiQ29va2llXCI6IFwiJFZlcnNpb249MTsgU2tpbj1uZXc7XCIsXG4gICAgICogIFwiQXV0aG9yaXphdGlvblwiOlwiQmFzaWMgUVd4aFpHcGJqcHVJSE5sY3RaUT09XCJcbiAgICAgKiB9XG4gICAgICogYGBgXG4gICAgICogQHJldHVybnMgQSBQcm9taXNlICh0byB3aGljaCB5b3UgY2FuIG9wdGlvbmFsbHkgc3Vic2NyaWJlIHRvKSB0aGF0IGlzIHJlc29sdmVkIHdpdGggdGhlIGBodHRwLnJlc3BvbnNlVGV4dGAgZnJvbSBzZXJ2ZXIgaWYgdGhlIG9wZXJhdGlvbiB3YXMgc3VjY2Vzc2Z1bCBhbmQgcmVqZWN0ZWQgd2l0aCB0aGUgZmFpbGVkIGBodHRwLnN0YXR1c2AgaWYgbm90OlxuICAgICAqL1xuICAgIHVwbG9hZEFzTXVsdGlwYXJ0ZmlsZShlbmRwb2ludDogc3RyaW5nLCBoZWFkZXJzPzogYW55KTogUHJvbWlzZTxhbnk+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGlmICh0aGlzLnN0YXRlICE9PSBMb2NhbFJlY29yZGVyU3RhdGUuRklOSVNIRUQpIHtcbiAgICAgICAgICAgICAgICByZWplY3QoRXJyb3IoJ1xcJ0xvY2FsUmVjb3JkLnVwbG9hZEFzTXVsdGlwYXJ0ZmlsZSgpXFwnIG5lZWRzIFxcJ0xvY2FsUmVjb3JkLnN0YXRlXFwnIHRvIGJlIFxcJ0ZJTklTSEVEXFwnIChjdXJyZW50IHZhbHVlOiBcXCcnICsgdGhpcy5zdGF0ZSArICdcXCcpLiBDYWxsIFxcJ0xvY2FsUmVjb3JkZXIuc3RvcCgpXFwnIGJlZm9yZScpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaHR0cCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICAgICAgICAgIGh0dHAub3BlbignUE9TVCcsIGVuZHBvaW50LCB0cnVlKTtcblxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaGVhZGVycyA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoaGVhZGVycykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGh0dHAuc2V0UmVxdWVzdEhlYWRlcihrZXksIGhlYWRlcnNba2V5XSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zdCBzZW5kYWJsZSA9IG5ldyBGb3JtRGF0YSgpO1xuICAgICAgICAgICAgICAgIHNlbmRhYmxlLmFwcGVuZCgnZmlsZScsIHRoaXMuYmxvYiwgdGhpcy5pZCArICcud2VibScpO1xuXG4gICAgICAgICAgICAgICAgaHR0cC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChodHRwLnJlYWR5U3RhdGUgPT09IDQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChodHRwLnN0YXR1cy50b1N0cmluZygpLmNoYXJBdCgwKSA9PT0gJzInKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU3VjY2VzcyByZXNwb25zZSBmcm9tIHNlcnZlciAoSFRUUCBzdGF0dXMgc3RhbmRhcmQ6IDJYWCBpcyBzdWNjZXNzKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoaHR0cC5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoaHR0cC5zdGF0dXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIGh0dHAuc2VuZChzZW5kYWJsZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuXG4gICAgLyogUHJpdmF0ZSBtZXRob2RzICovXG5cbiAgICBwcml2YXRlIG9uU3RvcERlZmF1bHQoKTogdm9pZCB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdNZWRpYVJlY29yZGVyIHN0b3BwZWQgIChzdGF0ZT0nICsgdGhpcy5tZWRpYVJlY29yZGVyLnN0YXRlICsgJyknKTtcblxuICAgICAgICB0aGlzLmJsb2IgPSBuZXcgQmxvYih0aGlzLmNodW5rcywgeyB0eXBlOiAndmlkZW8vd2VibScgfSk7XG4gICAgICAgIHRoaXMuY2h1bmtzID0gW107XG5cbiAgICAgICAgdGhpcy52aWRlb1ByZXZpZXdTcmMgPSB3aW5kb3cuVVJMLmNyZWF0ZU9iamVjdFVSTCh0aGlzLmJsb2IpO1xuXG4gICAgICAgIHRoaXMuc3RhdGUgPSBMb2NhbFJlY29yZGVyU3RhdGUuRklOSVNIRUQ7XG4gICAgfVxuXG59XG4iLCIvKlxuICogKEMpIENvcHlyaWdodCAyMDE3LTIwMTggT3BlblZpZHUgKGh0dHBzOi8vb3BlbnZpZHUuaW8vKVxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKlxuICovXG5cbmltcG9ydCB7IExvY2FsUmVjb3JkZXIgfSBmcm9tICcuL0xvY2FsUmVjb3JkZXInO1xuaW1wb3J0IHsgUHVibGlzaGVyIH0gZnJvbSAnLi9QdWJsaXNoZXInO1xuaW1wb3J0IHsgU2Vzc2lvbiB9IGZyb20gJy4vU2Vzc2lvbic7XG5pbXBvcnQgeyBTdHJlYW0gfSBmcm9tICcuL1N0cmVhbSc7XG5pbXBvcnQgeyBEZXZpY2UgfSBmcm9tICcuLi9PcGVuVmlkdUludGVybmFsL0ludGVyZmFjZXMvUHVibGljL0RldmljZSc7XG5pbXBvcnQgeyBPcGVuVmlkdUFkdmFuY2VkQ29uZmlndXJhdGlvbiB9IGZyb20gJy4uL09wZW5WaWR1SW50ZXJuYWwvSW50ZXJmYWNlcy9QdWJsaWMvT3BlblZpZHVBZHZhbmNlZENvbmZpZ3VyYXRpb24nO1xuaW1wb3J0IHsgUHVibGlzaGVyUHJvcGVydGllcyB9IGZyb20gJy4uL09wZW5WaWR1SW50ZXJuYWwvSW50ZXJmYWNlcy9QdWJsaWMvUHVibGlzaGVyUHJvcGVydGllcyc7XG5pbXBvcnQgeyBPcGVuVmlkdUVycm9yLCBPcGVuVmlkdUVycm9yTmFtZSB9IGZyb20gJy4uL09wZW5WaWR1SW50ZXJuYWwvRW51bXMvT3BlblZpZHVFcnJvcic7XG5pbXBvcnQgeyBWaWRlb0luc2VydE1vZGUgfSBmcm9tICcuLi9PcGVuVmlkdUludGVybmFsL0VudW1zL1ZpZGVvSW5zZXJ0TW9kZSc7XG5cbmltcG9ydCAqIGFzIHNjcmVlblNoYXJpbmdBdXRvIGZyb20gJy4uL09wZW5WaWR1SW50ZXJuYWwvU2NyZWVuU2hhcmluZy9TY3JlZW4tQ2FwdHVyaW5nLUF1dG8nO1xuaW1wb3J0ICogYXMgc2NyZWVuU2hhcmluZyBmcm9tICcuLi9PcGVuVmlkdUludGVybmFsL1NjcmVlblNoYXJpbmcvU2NyZWVuLUNhcHR1cmluZyc7XG5cbmltcG9ydCBScGNCdWlsZGVyID0gcmVxdWlyZSgnLi4vT3BlblZpZHVJbnRlcm5hbC9LdXJlbnRvVXRpbHMva3VyZW50by1qc29ucnBjJyk7XG5pbXBvcnQgcGxhdGZvcm0gPSByZXF1aXJlKCdwbGF0Zm9ybScpO1xuXG5cbi8qKlxuICogRW50cnlwb2ludCBvZiBPcGVuVmlkdSBCcm93c2VyIGxpYnJhcnkuXG4gKiBVc2UgaXQgdG8gaW5pdGlhbGl6ZSBvYmplY3RzIG9mIHR5cGUgW1tTZXNzaW9uXV0sIFtbUHVibGlzaGVyXV0gYW5kIFtbTG9jYWxSZWNvcmRlcl1dXG4gKi9cbmV4cG9ydCBjbGFzcyBPcGVuVmlkdSB7XG5cbiAgcHJpdmF0ZSBqc29uUnBjQ2xpZW50OiBhbnk7XG5cbiAgLyoqXG4gICAqIEBoaWRkZW5cbiAgICovXG4gIHNlc3Npb246IFNlc3Npb247XG4gIC8qKlxuICAgKiBAaGlkZGVuXG4gICAqL1xuICB3c1VyaTogc3RyaW5nO1xuICAvKipcbiAgICogQGhpZGRlblxuICAgKi9cbiAgc2VjcmV0ID0gJyc7XG4gIC8qKlxuICAgKiBAaGlkZGVuXG4gICAqL1xuICByZWNvcmRlciA9IGZhbHNlO1xuICAvKipcbiAgICogQGhpZGRlblxuICAgKi9cbiAgaWNlU2VydmVyczogUlRDSWNlU2VydmVyW107XG4gIC8qKlxuICAgKiBAaGlkZGVuXG4gICAqL1xuICByb2xlOiBzdHJpbmc7XG4gIC8qKlxuICAgKiBAaGlkZGVuXG4gICAqL1xuICBhZHZhbmNlZENvbmZpZ3VyYXRpb246IE9wZW5WaWR1QWR2YW5jZWRDb25maWd1cmF0aW9uID0ge307XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgY29uc29sZS5pbmZvKFwiJ09wZW5WaWR1JyBpbml0aWFsaXplZFwiKTtcbiAgfVxuXG5cbiAgLyoqXG4gICAqIFJldHVybnMgbmV3IHNlc3Npb25cbiAgICovXG4gIGluaXRTZXNzaW9uKCk6IFNlc3Npb24ge1xuICAgIHRoaXMuc2Vzc2lvbiA9IG5ldyBTZXNzaW9uKHRoaXMpO1xuICAgIHJldHVybiB0aGlzLnNlc3Npb247XG4gIH1cblxuXG4gIGluaXRQdWJsaXNoZXIodGFyZ2V0RWxlbWVudDogc3RyaW5nIHwgSFRNTEVsZW1lbnQpOiBQdWJsaXNoZXI7XG4gIGluaXRQdWJsaXNoZXIodGFyZ2V0RWxlbWVudDogc3RyaW5nIHwgSFRNTEVsZW1lbnQsIHByb3BlcnRpZXM6IFB1Ymxpc2hlclByb3BlcnRpZXMpOiBQdWJsaXNoZXI7XG4gIGluaXRQdWJsaXNoZXIodGFyZ2V0RWxlbWVudDogc3RyaW5nIHwgSFRNTEVsZW1lbnQsIGNvbXBsZXRpb25IYW5kbGVyOiAoZXJyb3I6IEVycm9yIHwgdW5kZWZpbmVkKSA9PiB2b2lkKTogUHVibGlzaGVyO1xuICBpbml0UHVibGlzaGVyKHRhcmdldEVsZW1lbnQ6IHN0cmluZyB8IEhUTUxFbGVtZW50LCBwcm9wZXJ0aWVzOiBQdWJsaXNoZXJQcm9wZXJ0aWVzLCBjb21wbGV0aW9uSGFuZGxlcjogKGVycm9yOiBFcnJvciB8IHVuZGVmaW5lZCkgPT4gdm9pZCk6IFB1Ymxpc2hlcjtcblxuICAvKipcbiAgICogUmV0dXJucyBhIG5ldyBwdWJsaXNoZXJcbiAgICpcbiAgICogIyMjIyBFdmVudHMgZGlzcGF0Y2hlZFxuICAgKlxuICAgKiBUaGUgW1tQdWJsaXNoZXJdXSBvYmplY3Qgd2lsbCBkaXNwYXRjaCBhbiBgYWNjZXNzRGlhbG9nT3BlbmVkYCBldmVudCwgb25seSBpZiB0aGUgcG9wLXVwIHNob3duIGJ5IHRoZSBicm93c2VyIHRvIHJlcXVlc3QgcGVybWlzc2lvbnMgZm9yIHRoZSBjYW1lcmEgaXMgb3BlbmVkLiBZb3UgY2FuIHVzZSB0aGlzIGV2ZW50IHRvIGFsZXJ0IHRoZSB1c2VyIGFib3V0IGdyYW50aW5nIHBlcm1pc3Npb25zXG4gICAqIGZvciB5b3VyIHdlYnNpdGUuIEFuIGBhY2Nlc3NEaWFsb2dDbG9zZWRgIGV2ZW50IHdpbGwgYWxzbyBiZSBkaXNwYXRjaGVkIGFmdGVyIHVzZXIgY2xpY2tzIG9uIFwiQWxsb3dcIiBvciBcIkJsb2NrXCIgaW4gdGhlIHBvcC11cC5cbiAgICpcbiAgICogVGhlIFtbUHVibGlzaGVyXV0gb2JqZWN0IHdpbGwgZGlzcGF0Y2ggYW4gYGFjY2Vzc0FsbG93ZWRgIG9yIGBhY2Nlc3NEZW5pZWRgIGV2ZW50IG9uY2UgaXQgaGFzIGJlZW4gZ3JhbnRlZCBhY2Nlc3MgdG8gdGhlIHJlcXVlc3RlZCBpbnB1dCBkZXZpY2VzIG9yIG5vdC5cbiAgICpcbiAgICogVGhlIFtbUHVibGlzaGVyXV0gb2JqZWN0IHdpbGwgZGlzcGF0Y2ggYSBgdmlkZW9FbGVtZW50Q3JlYXRlZGAgZXZlbnQgb25jZSBhIEhUTUwgdmlkZW8gZWxlbWVudCBoYXMgYmVlbiBhZGRlZCB0byBET00gKG9ubHkgaWYgeW91XG4gICAqIFtsZXQgT3BlblZpZHUgdGFrZSBjYXJlIG9mIHRoZSB2aWRlbyBwbGF5ZXJzXSgvZG9jcy9ob3ctZG8taS9tYW5hZ2UtdmlkZW9zLyNsZXQtb3BlbnZpZHUtdGFrZS1jYXJlLW9mLXRoZS12aWRlby1wbGF5ZXJzKSkuIFNlZSBbW1ZpZGVvRWxlbWVudEV2ZW50XV0gdG8gbGVhcm4gbW9yZS5cbiAgICpcbiAgICogVGhlIFtbUHVibGlzaGVyXV0gb2JqZWN0IHdpbGwgZGlzcGF0Y2ggYSBgc3RyZWFtUGxheWluZ2AgZXZlbnQgb25jZSB0aGUgbG9jYWwgc3RyZWFtcyBzdGFydHMgcGxheWluZy4gU2VlIFtbU3RyZWFtTWFuYWdlckV2ZW50XV0gdG8gbGVhcm4gbW9yZS5cbiAgICpcbiAgICogQHBhcmFtIHRhcmdldEVsZW1lbnQgIEhUTUwgRE9NIGVsZW1lbnQgKG9yIGl0cyBgaWRgIGF0dHJpYnV0ZSkgaW4gd2hpY2ggdGhlIHZpZGVvIGVsZW1lbnQgb2YgdGhlIFB1Ymxpc2hlciB3aWxsIGJlIGluc2VydGVkIChzZWUgW1tQdWJsaXNoZXJQcm9wZXJ0aWVzLmluc2VydE1vZGVdXSkuIElmICpudWxsKiBvciAqdW5kZWZpbmVkKiBubyBkZWZhdWx0IHZpZGVvIHdpbGwgYmUgY3JlYXRlZCBmb3IgdGhpcyBQdWJsaXNoZXIuXG4gICAqIFlvdSBjYW4gYWx3YXlzIGNhbGwgbWV0aG9kIFtbUHVibGlzaGVyLmFkZFZpZGVvRWxlbWVudF1dIG9yIFtbUHVibGlzaGVyLmNyZWF0ZVZpZGVvRWxlbWVudF1dIHRvIG1hbmFnZSB0aGUgdmlkZW8gZWxlbWVudHMgb24geW91ciBvd24gKHNlZSBbTWFuYWdlIHZpZGVvIHBsYXllcnNdKC9kb2NzL2hvdy1kby1pL21hbmFnZS12aWRlb3MpIHNlY3Rpb24pXG4gICAqIEBwYXJhbSBjb21wbGV0aW9uSGFuZGxlciBgZXJyb3JgIHBhcmFtZXRlciBpcyBudWxsIGlmIGBpbml0UHVibGlzaGVyYCBzdWNjZWVkcywgYW5kIGlzIGRlZmluZWQgaWYgaXQgZmFpbHMuXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICBgY29tcGxldGlvbkhhbmRsZXJgIGZ1bmN0aW9uIGlzIGNhbGxlZCBiZWZvcmUgdGhlIFB1Ymxpc2hlciBkaXNwYXRjaGVzIGFuIGBhY2Nlc3NBbGxvd2VkYCBvciBhbiBgYWNjZXNzRGVuaWVkYCBldmVudFxuICAgKi9cbiAgaW5pdFB1Ymxpc2hlcih0YXJnZXRFbGVtZW50OiBzdHJpbmcgfCBIVE1MRWxlbWVudCwgcGFyYW0yPywgcGFyYW0zPyk6IFB1Ymxpc2hlciB7XG5cbiAgICBsZXQgcHJvcGVydGllczogUHVibGlzaGVyUHJvcGVydGllcztcblxuICAgIGlmICghIXBhcmFtMiAmJiAodHlwZW9mIHBhcmFtMiAhPT0gJ2Z1bmN0aW9uJykpIHtcblxuICAgICAgLy8gTWF0Y2hlcyAnaW5pdFB1Ymxpc2hlcih0YXJnZXRFbGVtZW50LCBwcm9wZXJ0aWVzKScgb3IgJ2luaXRQdWJsaXNoZXIodGFyZ2V0RWxlbWVudCwgcHJvcGVydGllcywgY29tcGxldGlvbkhhbmRsZXIpJ1xuXG4gICAgICBwcm9wZXJ0aWVzID0gKDxQdWJsaXNoZXJQcm9wZXJ0aWVzPnBhcmFtMik7XG5cbiAgICAgIHByb3BlcnRpZXMgPSB7XG4gICAgICAgIGF1ZGlvU291cmNlOiAodHlwZW9mIHByb3BlcnRpZXMuYXVkaW9Tb3VyY2UgIT09ICd1bmRlZmluZWQnKSA/IHByb3BlcnRpZXMuYXVkaW9Tb3VyY2UgOiB1bmRlZmluZWQsXG4gICAgICAgIGZyYW1lUmF0ZTogdGhpcy5pc01lZGlhU3RyZWFtVHJhY2socHJvcGVydGllcy52aWRlb1NvdXJjZSkgPyB1bmRlZmluZWQgOiAoKHR5cGVvZiBwcm9wZXJ0aWVzLmZyYW1lUmF0ZSAhPT0gJ3VuZGVmaW5lZCcpID8gcHJvcGVydGllcy5mcmFtZVJhdGUgOiB1bmRlZmluZWQpLFxuICAgICAgICBpbnNlcnRNb2RlOiAodHlwZW9mIHByb3BlcnRpZXMuaW5zZXJ0TW9kZSAhPT0gJ3VuZGVmaW5lZCcpID8gKCh0eXBlb2YgcHJvcGVydGllcy5pbnNlcnRNb2RlID09PSAnc3RyaW5nJykgPyBWaWRlb0luc2VydE1vZGVbcHJvcGVydGllcy5pbnNlcnRNb2RlXSA6IHByb3BlcnRpZXMuaW5zZXJ0TW9kZSkgOiBWaWRlb0luc2VydE1vZGUuQVBQRU5ELFxuICAgICAgICBtaXJyb3I6ICh0eXBlb2YgcHJvcGVydGllcy5taXJyb3IgIT09ICd1bmRlZmluZWQnKSA/IHByb3BlcnRpZXMubWlycm9yIDogdHJ1ZSxcbiAgICAgICAgcHVibGlzaEF1ZGlvOiAodHlwZW9mIHByb3BlcnRpZXMucHVibGlzaEF1ZGlvICE9PSAndW5kZWZpbmVkJykgPyBwcm9wZXJ0aWVzLnB1Ymxpc2hBdWRpbyA6IHRydWUsXG4gICAgICAgIHB1Ymxpc2hWaWRlbzogKHR5cGVvZiBwcm9wZXJ0aWVzLnB1Ymxpc2hWaWRlbyAhPT0gJ3VuZGVmaW5lZCcpID8gcHJvcGVydGllcy5wdWJsaXNoVmlkZW8gOiB0cnVlLFxuICAgICAgICByZXNvbHV0aW9uOiB0aGlzLmlzTWVkaWFTdHJlYW1UcmFjayhwcm9wZXJ0aWVzLnZpZGVvU291cmNlKSA/IHVuZGVmaW5lZCA6ICgodHlwZW9mIHByb3BlcnRpZXMucmVzb2x1dGlvbiAhPT0gJ3VuZGVmaW5lZCcpID8gcHJvcGVydGllcy5yZXNvbHV0aW9uIDogJzY0MHg0ODAnKSxcbiAgICAgICAgdmlkZW9Tb3VyY2U6ICh0eXBlb2YgcHJvcGVydGllcy52aWRlb1NvdXJjZSAhPT0gJ3VuZGVmaW5lZCcpID8gcHJvcGVydGllcy52aWRlb1NvdXJjZSA6IHVuZGVmaW5lZFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuXG4gICAgICAvLyBNYXRjaGVzICdpbml0UHVibGlzaGVyKHRhcmdldEVsZW1lbnQpJyBvciAnaW5pdFB1Ymxpc2hlcih0YXJnZXRFbGVtZW50LCBjb21wbGV0aW9uSGFuZGxlciknXG5cbiAgICAgIHByb3BlcnRpZXMgPSB7XG4gICAgICAgIGluc2VydE1vZGU6IFZpZGVvSW5zZXJ0TW9kZS5BUFBFTkQsXG4gICAgICAgIG1pcnJvcjogdHJ1ZSxcbiAgICAgICAgcHVibGlzaEF1ZGlvOiB0cnVlLFxuICAgICAgICBwdWJsaXNoVmlkZW86IHRydWUsXG4gICAgICAgIHJlc29sdXRpb246ICc2NDB4NDgwJ1xuICAgICAgfTtcbiAgICB9XG5cbiAgICBjb25zdCBwdWJsaXNoZXI6IFB1Ymxpc2hlciA9IG5ldyBQdWJsaXNoZXIodGFyZ2V0RWxlbWVudCwgcHJvcGVydGllcywgdGhpcyk7XG5cbiAgICBsZXQgY29tcGxldGlvbkhhbmRsZXI6IChlcnJvcjogRXJyb3IgfCB1bmRlZmluZWQpID0+IHZvaWQ7XG4gICAgaWYgKCEhcGFyYW0yICYmICh0eXBlb2YgcGFyYW0yID09PSAnZnVuY3Rpb24nKSkge1xuICAgICAgY29tcGxldGlvbkhhbmRsZXIgPSBwYXJhbTI7XG4gICAgfSBlbHNlIGlmICghIXBhcmFtMykge1xuICAgICAgY29tcGxldGlvbkhhbmRsZXIgPSBwYXJhbTM7XG4gICAgfVxuXG4gICAgcHVibGlzaGVyLmluaXRpYWxpemUoKVxuICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICBpZiAoY29tcGxldGlvbkhhbmRsZXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNvbXBsZXRpb25IYW5kbGVyKHVuZGVmaW5lZCk7XG4gICAgICAgIH1cbiAgICAgICAgcHVibGlzaGVyLmVtaXRFdmVudCgnYWNjZXNzQWxsb3dlZCcsIFtdKTtcbiAgICAgIH0pLmNhdGNoKChlcnJvcikgPT4ge1xuICAgICAgICBpZiAoY29tcGxldGlvbkhhbmRsZXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNvbXBsZXRpb25IYW5kbGVyKGVycm9yKTtcbiAgICAgICAgfVxuICAgICAgICBwdWJsaXNoZXIuZW1pdEV2ZW50KCdhY2Nlc3NEZW5pZWQnLCBbXSk7XG4gICAgICB9KTtcblxuICAgIHJldHVybiBwdWJsaXNoZXI7XG4gIH1cblxuXG4gIC8qKlxuICAgKiBQcm9taXNpZmllZCB2ZXJzaW9uIG9mIFtbT3BlblZpZHUuaW5pdFB1Ymxpc2hlcl1dXG4gICAqXG4gICAqID4gV0FSTklORzogZXZlbnRzIGBhY2Nlc3NEaWFsb2dPcGVuZWRgIGFuZCBgYWNjZXNzRGlhbG9nQ2xvc2VkYCB3aWxsIG5vdCBiZSBkaXNwYXRjaGVkIGlmIHVzaW5nIHRoaXMgbWV0aG9kIGluc3RlYWQgb2YgW1tPcGVuVmlkdS5pbml0UHVibGlzaGVyXV1cbiAgICovXG4gIGluaXRQdWJsaXNoZXJBc3luYyh0YXJnZXRFbGVtZW50OiBzdHJpbmcgfCBIVE1MRWxlbWVudCk6IFByb21pc2U8UHVibGlzaGVyPjtcbiAgaW5pdFB1Ymxpc2hlckFzeW5jKHRhcmdldEVsZW1lbnQ6IHN0cmluZyB8IEhUTUxFbGVtZW50LCBwcm9wZXJ0aWVzOiBQdWJsaXNoZXJQcm9wZXJ0aWVzKTogUHJvbWlzZTxQdWJsaXNoZXI+O1xuXG4gIGluaXRQdWJsaXNoZXJBc3luYyh0YXJnZXRFbGVtZW50OiBzdHJpbmcgfCBIVE1MRWxlbWVudCwgcHJvcGVydGllcz86IFB1Ymxpc2hlclByb3BlcnRpZXMpOiBQcm9taXNlPFB1Ymxpc2hlcj4ge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZTxQdWJsaXNoZXI+KChyZXNvbHZlLCByZWplY3QpID0+IHtcblxuICAgICAgbGV0IHB1Ymxpc2hlcjogUHVibGlzaGVyO1xuXG4gICAgICBjb25zdCBjYWxsYmFjayA9IChlcnJvcjogRXJyb3IpID0+IHtcbiAgICAgICAgaWYgKCEhZXJyb3IpIHtcbiAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc29sdmUocHVibGlzaGVyKTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgaWYgKCEhcHJvcGVydGllcykge1xuICAgICAgICBwdWJsaXNoZXIgPSB0aGlzLmluaXRQdWJsaXNoZXIodGFyZ2V0RWxlbWVudCwgcHJvcGVydGllcywgY2FsbGJhY2spO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcHVibGlzaGVyID0gdGhpcy5pbml0UHVibGlzaGVyKHRhcmdldEVsZW1lbnQsIGNhbGxiYWNrKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG5cbiAgLyoqXG4gICAqIFJldHVybnMgYSBuZXcgbG9jYWwgcmVjb3JkZXIgZm9yIHJlY29yZGluZyBzdHJlYW1zIHN0cmFpZ2h0IGF3YXkgZnJvbSB0aGUgYnJvd3NlclxuICAgKiBAcGFyYW0gc3RyZWFtICBTdHJlYW0gdG8gcmVjb3JkXG4gICAqL1xuICBpbml0TG9jYWxSZWNvcmRlcihzdHJlYW06IFN0cmVhbSk6IExvY2FsUmVjb3JkZXIge1xuICAgIHJldHVybiBuZXcgTG9jYWxSZWNvcmRlcihzdHJlYW0pO1xuICB9XG5cblxuICAvKipcbiAgICogQ2hlY2tzIGlmIHRoZSBicm93c2VyIHN1cHBvcnRzIE9wZW5WaWR1XG4gICAqIEByZXR1cm5zIDEgaWYgdGhlIGJyb3dzZXIgc3VwcG9ydHMgT3BlblZpZHUsIDAgb3RoZXJ3aXNlXG4gICAqL1xuICBjaGVja1N5c3RlbVJlcXVpcmVtZW50cygpOiBudW1iZXIge1xuICAgIGNvbnN0IGJyb3dzZXIgPSBwbGF0Zm9ybS5uYW1lO1xuICAgIGNvbnN0IHZlcnNpb24gPSBwbGF0Zm9ybS52ZXJzaW9uO1xuXG4gICAgaWYgKChicm93c2VyICE9PSAnQ2hyb21lJykgJiYgKGJyb3dzZXIgIT09ICdDaHJvbWUgTW9iaWxlJykgJiZcbiAgICAgIChicm93c2VyICE9PSAnRmlyZWZveCcpICYmIChicm93c2VyICE9PSAnRmlyZWZveCBNb2JpbGUnKSAmJiAoYnJvd3NlciAhPT0gJ0ZpcmVmb3ggZm9yIGlPUycpICYmXG4gICAgICAoYnJvd3NlciAhPT0gJ09wZXJhJykgJiYgKGJyb3dzZXIgIT09ICdPcGVyYSBNb2JpbGUnKSAmJlxuICAgICAgKGJyb3dzZXIgIT09ICdTYWZhcmknKSkge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiAxO1xuICAgIH1cbiAgfVxuXG5cbiAgLyoqXG4gICAqIENvbGxlY3RzIGluZm9ybWF0aW9uIGFib3V0IHRoZSBtZWRpYSBpbnB1dCBkZXZpY2VzIGF2YWlsYWJsZSBvbiB0aGUgc3lzdGVtLiBZb3UgY2FuIHBhc3MgcHJvcGVydHkgYGRldmljZUlkYCBvZiBhIFtbRGV2aWNlXV0gb2JqZWN0IGFzIHZhbHVlIG9mIGBhdWRpb1NvdXJjZWAgb3IgYHZpZGVvU291cmNlYCBwcm9wZXJ0aWVzIGluIFtbaW5pdFB1Ymxpc2hlcl1dIG1ldGhvZFxuICAgKi9cbiAgZ2V0RGV2aWNlcygpOiBQcm9taXNlPERldmljZVtdPiB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPERldmljZVtdPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmVudW1lcmF0ZURldmljZXMoKS50aGVuKChkZXZpY2VJbmZvcykgPT4ge1xuICAgICAgICBjb25zdCBkZXZpY2VzOiBEZXZpY2VbXSA9IFtdO1xuICAgICAgICBkZXZpY2VJbmZvcy5mb3JFYWNoKGRldmljZUluZm8gPT4ge1xuICAgICAgICAgIGlmIChkZXZpY2VJbmZvLmtpbmQgPT09ICdhdWRpb2lucHV0JyB8fCBkZXZpY2VJbmZvLmtpbmQgPT09ICd2aWRlb2lucHV0Jykge1xuICAgICAgICAgICAgZGV2aWNlcy5wdXNoKHtcbiAgICAgICAgICAgICAga2luZDogZGV2aWNlSW5mby5raW5kLFxuICAgICAgICAgICAgICBkZXZpY2VJZDogZGV2aWNlSW5mby5kZXZpY2VJZCxcbiAgICAgICAgICAgICAgbGFiZWw6IGRldmljZUluZm8ubGFiZWxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJlc29sdmUoZGV2aWNlcyk7XG4gICAgICB9KS5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgZ2V0dGluZyBkZXZpY2VzJywgZXJyb3IpO1xuICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuXG4gIC8qKlxuICAgKiBHZXQgYSBNZWRpYVN0cmVhbSBvYmplY3QgdGhhdCB5b3UgY2FuIGN1c3RvbWl6ZSBiZWZvcmUgY2FsbGluZyBbW2luaXRQdWJsaXNoZXJdXSAocGFzcyBfTWVkaWFTdHJlYW1UcmFja18gcHJvcGVydHkgb2YgdGhlIF9NZWRpYVN0cmVhbV8gdmFsdWUgcmVzb2x2ZWQgYnkgdGhlIFByb21pc2UgYXMgYGF1ZGlvU291cmNlYCBvciBgdmlkZW9Tb3VyY2VgIHByb3BlcnRpZXMgaW4gW1tpbml0UHVibGlzaGVyXV0pXG4gICAqXG4gICAqIFBhcmFtZXRlciBgb3B0aW9uc2AgaXMgdGhlIHNhbWUgYXMgaW4gW1tpbml0UHVibGlzaGVyXV0gc2Vjb25kIHBhcmFtZXRlciAob2YgdHlwZSBbW1B1Ymxpc2hlclByb3BlcnRpZXNdXSksIGJ1dCBvbmx5IHRoZSBmb2xsb3dpbmcgcHJvcGVydGllcyB3aWxsIGJlIGFwcGxpZWQ6IGBhdWRpb1NvdXJjZWAsIGB2aWRlb1NvdXJjZWAsIGBmcmFtZVJhdGVgLCBgcmVzb2x1dGlvbmBcbiAgICpcbiAgICogVG8gY3VzdG9taXplIHRoZSBQdWJsaXNoZXIncyB2aWRlbywgdGhlIEFQSSBmb3IgSFRNTENhbnZhc0VsZW1lbnQgaXMgdmVyeSB1c2VmdWwuIEZvciBleGFtcGxlLCB0byBnZXQgYSBibGFjay1hbmQtd2hpdGUgdmlkZW8gYXQgMTAgZnBzIGFuZCBIRCByZXNvbHV0aW9uIHdpdGggbm8gc291bmQ6XG4gICAqIGBgYFxuICAgKiB2YXIgT1YgPSBuZXcgT3BlblZpZHUoKTtcbiAgICogdmFyIEZSQU1FX1JBVEUgPSAxMDtcbiAgICpcbiAgICogT1YuZ2V0VXNlck1lZGlhKHtcbiAgICogICAgYXVkaW9Tb3VyY2U6IGZhbHNlO1xuICAgKiAgICB2aWRlb1NvdXJjZTogdW5kZWZpbmVkLFxuICAgKiAgICByZXNvbHV0aW9uOiAnMTI4MHg3MjAnLFxuICAgKiAgICBmcmFtZVJhdGU6IEZSQU1FX1JBVEVcbiAgICogfSlcbiAgICogLnRoZW4obWVkaWFTdHJlYW0gPT4ge1xuICAgKlxuICAgKiAgICB2YXIgdmlkZW9UcmFjayA9IG1lZGlhU3RyZWFtLmdldFZpZGVvVHJhY2tzKClbMF07XG4gICAqICAgIHZhciB2aWRlbyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3ZpZGVvJyk7XG4gICAqICAgIHZpZGVvLnNyY09iamVjdCA9IG5ldyBNZWRpYVN0cmVhbShbdmlkZW9UcmFja10pO1xuICAgKlxuICAgKiAgICB2YXIgY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAqICAgIHZhciBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICogICAgY3R4LmZpbHRlciA9ICdncmF5c2NhbGUoMTAwJSknO1xuICAgKlxuICAgKiAgICB2aWRlby5hZGRFdmVudExpc3RlbmVyKCdwbGF5JywgKCkgPT4ge1xuICAgKiAgICAgIHZhciBsb29wID0gKCkgPT4ge1xuICAgKiAgICAgICAgaWYgKCF2aWRlby5wYXVzZWQgJiYgIXZpZGVvLmVuZGVkKSB7XG4gICAqICAgICAgICAgIGN0eC5kcmF3SW1hZ2UodmlkZW8sIDAsIDAsIDMwMCwgMTcwKTtcbiAgICogICAgICAgICAgc2V0VGltZW91dChsb29wLCAxMDAwLyBGUkFNRV9SQVRFKTsgLy8gRHJhd2luZyBhdCAxMCBmcHNcbiAgICogICAgICAgIH1cbiAgICogICAgICB9O1xuICAgKiAgICAgIGxvb3AoKTtcbiAgICogICAgfSk7XG4gICAqICAgIHZpZGVvLnBsYXkoKTtcbiAgICpcbiAgICogICAgdmFyIGdyYXlWaWRlb1RyYWNrID0gY2FudmFzLmNhcHR1cmVTdHJlYW0oRlJBTUVfUkFURSkuZ2V0VmlkZW9UcmFja3MoKVswXTtcbiAgICogICAgdmFyIHB1Ymxpc2hlciA9IHRoaXMuT1YuaW5pdFB1Ymxpc2hlcihcbiAgICogICAgICBteUh0bWxUYXJnZXQsXG4gICAqICAgICAge1xuICAgKiAgICAgICAgYXVkaW9Tb3VyY2U6IGZhbHNlLFxuICAgKiAgICAgICAgdmlkZW9Tb3VyY2U6IGdyYXlWaWRlb1RyYWNrXG4gICAqICAgICAgfSk7XG4gICAqIH0pO1xuICAgKiBgYGBcbiAgICovXG4gIGdldFVzZXJNZWRpYShvcHRpb25zOiBQdWJsaXNoZXJQcm9wZXJ0aWVzKTogUHJvbWlzZTxNZWRpYVN0cmVhbT4ge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZTxNZWRpYVN0cmVhbT4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgdGhpcy5nZW5lcmF0ZU1lZGlhQ29uc3RyYWludHMob3B0aW9ucylcbiAgICAgICAgLnRoZW4oY29uc3RyYWludHMgPT4ge1xuICAgICAgICAgIG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhKGNvbnN0cmFpbnRzKVxuICAgICAgICAgICAgLnRoZW4obWVkaWFTdHJlYW0gPT4ge1xuICAgICAgICAgICAgICByZXNvbHZlKG1lZGlhU3RyZWFtKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuY2F0Y2goZXJyb3IgPT4ge1xuICAgICAgICAgICAgICBsZXQgZXJyb3JOYW1lOiBPcGVuVmlkdUVycm9yTmFtZTtcbiAgICAgICAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gZXJyb3IudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgaWYgKCEob3B0aW9ucy52aWRlb1NvdXJjZSA9PT0gJ3NjcmVlbicpKSB7XG4gICAgICAgICAgICAgICAgZXJyb3JOYW1lID0gT3BlblZpZHVFcnJvck5hbWUuREVWSUNFX0FDQ0VTU19ERU5JRUQ7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZXJyb3JOYW1lID0gT3BlblZpZHVFcnJvck5hbWUuU0NSRUVOX0NBUFRVUkVfREVOSUVEO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHJlamVjdChuZXcgT3BlblZpZHVFcnJvcihlcnJvck5hbWUsIGVycm9yTWVzc2FnZSkpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaCgoZXJyb3I6IE9wZW5WaWR1RXJyb3IpID0+IHtcbiAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG5cbiAgLyogdHNsaW50OmRpc2FibGU6bm8tZW1wdHkgKi9cbiAgLyoqXG4gICAqIERpc2FibGUgYWxsIGxvZ2dpbmcgZXhjZXB0IGVycm9yIGxldmVsXG4gICAqL1xuICBlbmFibGVQcm9kTW9kZSgpOiB2b2lkIHtcbiAgICBjb25zb2xlLmxvZyA9ICgpID0+IHsgfTtcbiAgICBjb25zb2xlLmRlYnVnID0gKCkgPT4geyB9O1xuICAgIGNvbnNvbGUuaW5mbyA9ICgpID0+IHsgfTtcbiAgICBjb25zb2xlLndhcm4gPSAoKSA9PiB7IH07XG4gIH1cbiAgLyogdHNsaW50OmVuYWJsZTpuby1lbXB0eSAqL1xuXG5cbiAgLyoqXG4gICAqIFNldCBPcGVuVmlkdSBhZHZhbmNlZCBjb25maWd1cmF0aW9uIG9wdGlvbnMuIEN1cnJlbnRseSBgY29uZmlndXJhdGlvbmAgaXMgYW4gb2JqZWN0IHdpdGggdGhlIGZvbGxvd2luZyBvcHRpb25hbCBwcm9wZXJ0aWVzIChzZWUgW1tPcGVuVmlkdUFkdmFuY2VkQ29uZmlndXJhdGlvbl1dIGZvciBtb3JlIGRldGFpbHMpOlxuICAgKiAtIGBpY2VTZXJ2ZXJzYDogc2V0IGN1c3RvbSBTVFVOL1RVUk4gc2VydmVycyB0byBiZSB1c2VkIGJ5IE9wZW5WaWR1IEJyb3dzZXJcbiAgICogLSBgc2NyZWVuU2hhcmVDaHJvbWVFeHRlbnNpb25gOiB1cmwgdG8gYSBjdXN0b20gc2NyZWVuIHNoYXJlIGV4dGVuc2lvbiBmb3IgQ2hyb21lIHRvIGJlIHVzZWQgaW5zdGVhZCBvZiB0aGUgZGVmYXVsdCBvbmUsIGJhc2VkIG9uIG91cnMgW2h0dHBzOi8vZ2l0aHViLmNvbS9PcGVuVmlkdS9vcGVudmlkdS1zY3JlZW4tc2hhcmluZy1jaHJvbWUtZXh0ZW5zaW9uXShodHRwczovL2dpdGh1Yi5jb20vT3BlblZpZHUvb3BlbnZpZHUtc2NyZWVuLXNoYXJpbmctY2hyb21lLWV4dGVuc2lvbilcbiAgICogLSBgcHVibGlzaGVyU3BlYWtpbmdFdmVudHNPcHRpb25zYDogY3VzdG9tIGNvbmZpZ3VyYXRpb24gZm9yIHRoZSBbW1B1Ymxpc2hlclNwZWFraW5nRXZlbnRdXSBmZWF0dXJlXG4gICAqL1xuICBzZXRBZHZhbmNlZENvbmZpZ3VyYXRpb24oY29uZmlndXJhdGlvbjogT3BlblZpZHVBZHZhbmNlZENvbmZpZ3VyYXRpb24pOiB2b2lkIHtcbiAgICB0aGlzLmFkdmFuY2VkQ29uZmlndXJhdGlvbiA9IGNvbmZpZ3VyYXRpb247XG4gIH1cblxuXG4gIC8qIEhpZGRlbiBtZXRob2RzICovXG5cbiAgLyoqXG4gICAqIEBoaWRkZW5cbiAgICovXG4gIGdlbmVyYXRlTWVkaWFDb25zdHJhaW50cyhwdWJsaXNoZXJQcm9wZXJ0aWVzOiBQdWJsaXNoZXJQcm9wZXJ0aWVzKTogUHJvbWlzZTxNZWRpYVN0cmVhbUNvbnN0cmFpbnRzPiB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPE1lZGlhU3RyZWFtQ29uc3RyYWludHM+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGxldCBhdWRpbywgdmlkZW87XG5cbiAgICAgIGlmIChwdWJsaXNoZXJQcm9wZXJ0aWVzLmF1ZGlvU291cmNlID09PSBudWxsIHx8IHB1Ymxpc2hlclByb3BlcnRpZXMuYXVkaW9Tb3VyY2UgPT09IGZhbHNlKSB7XG4gICAgICAgIGF1ZGlvID0gZmFsc2U7XG4gICAgICB9IGVsc2UgaWYgKHB1Ymxpc2hlclByb3BlcnRpZXMuYXVkaW9Tb3VyY2UgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBhdWRpbyA9IHRydWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhdWRpbyA9IHB1Ymxpc2hlclByb3BlcnRpZXMuYXVkaW9Tb3VyY2U7XG4gICAgICB9XG5cbiAgICAgIGlmIChwdWJsaXNoZXJQcm9wZXJ0aWVzLnZpZGVvU291cmNlID09PSBudWxsIHx8IHB1Ymxpc2hlclByb3BlcnRpZXMudmlkZW9Tb3VyY2UgPT09IGZhbHNlKSB7XG4gICAgICAgIHZpZGVvID0gZmFsc2U7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2aWRlbyA9IHtcbiAgICAgICAgICBoZWlnaHQ6IHtcbiAgICAgICAgICAgIGlkZWFsOiA0ODBcbiAgICAgICAgICB9LFxuICAgICAgICAgIHdpZHRoOiB7XG4gICAgICAgICAgICBpZGVhbDogNjQwXG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICBjb25zdCBtZWRpYUNvbnN0cmFpbnRzOiBNZWRpYVN0cmVhbUNvbnN0cmFpbnRzID0ge1xuICAgICAgICBhdWRpbyxcbiAgICAgICAgdmlkZW9cbiAgICAgIH07XG5cbiAgICAgIGlmICh0eXBlb2YgbWVkaWFDb25zdHJhaW50cy5hdWRpbyA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgbWVkaWFDb25zdHJhaW50cy5hdWRpbyA9IHsgZGV2aWNlSWQ6IHsgZXhhY3Q6IG1lZGlhQ29uc3RyYWludHMuYXVkaW8gfSB9O1xuICAgICAgfVxuXG4gICAgICBpZiAobWVkaWFDb25zdHJhaW50cy52aWRlbykge1xuXG4gICAgICAgIGlmICghIXB1Ymxpc2hlclByb3BlcnRpZXMucmVzb2x1dGlvbikge1xuICAgICAgICAgIGNvbnN0IHdpZHRoQW5kSGVpZ2h0ID0gcHVibGlzaGVyUHJvcGVydGllcy5yZXNvbHV0aW9uLnRvTG93ZXJDYXNlKCkuc3BsaXQoJ3gnKTtcbiAgICAgICAgICBjb25zdCB3aWR0aCA9IE51bWJlcih3aWR0aEFuZEhlaWdodFswXSk7XG4gICAgICAgICAgY29uc3QgaGVpZ2h0ID0gTnVtYmVyKHdpZHRoQW5kSGVpZ2h0WzFdKTtcbiAgICAgICAgICAobWVkaWFDb25zdHJhaW50cy52aWRlbyBhcyBhbnkpLndpZHRoLmlkZWFsID0gd2lkdGg7XG4gICAgICAgICAgKG1lZGlhQ29uc3RyYWludHMudmlkZW8gYXMgYW55KS5oZWlnaHQuaWRlYWwgPSBoZWlnaHQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoISFwdWJsaXNoZXJQcm9wZXJ0aWVzLmZyYW1lUmF0ZSkge1xuICAgICAgICAgIChtZWRpYUNvbnN0cmFpbnRzLnZpZGVvIGFzIGFueSkuZnJhbWVSYXRlID0geyBpZGVhbDogcHVibGlzaGVyUHJvcGVydGllcy5mcmFtZVJhdGUgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghIXB1Ymxpc2hlclByb3BlcnRpZXMudmlkZW9Tb3VyY2UgJiYgdHlwZW9mIHB1Ymxpc2hlclByb3BlcnRpZXMudmlkZW9Tb3VyY2UgPT09ICdzdHJpbmcnKSB7XG5cbiAgICAgICAgICBpZiAocHVibGlzaGVyUHJvcGVydGllcy52aWRlb1NvdXJjZSA9PT0gJ3NjcmVlbicpIHtcblxuICAgICAgICAgICAgaWYgKHBsYXRmb3JtLm5hbWUgIT09ICdDaHJvbWUnICYmIHBsYXRmb3JtLm5hbWUhLmluZGV4T2YoJ0ZpcmVmb3gnKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgY29uc3QgZXJyb3IgPSBuZXcgT3BlblZpZHVFcnJvcihPcGVuVmlkdUVycm9yTmFtZS5TQ1JFRU5fU0hBUklOR19OT1RfU1VQUE9SVEVELCAnWW91IGNhbiBvbmx5IHNjcmVlbiBzaGFyZSBpbiBkZXNrdG9wIENocm9tZSBhbmQgRmlyZWZveC4gRGV0ZWN0ZWQgYnJvd3NlcjogJyArIHBsYXRmb3JtLm5hbWUpO1xuICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcbiAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICAgICAgaWYgKCEhdGhpcy5hZHZhbmNlZENvbmZpZ3VyYXRpb24uc2NyZWVuU2hhcmVDaHJvbWVFeHRlbnNpb24gJiYgIShwbGF0Zm9ybS5uYW1lIS5pbmRleE9mKCdGaXJlZm94JykgIT09IC0xKSkge1xuXG4gICAgICAgICAgICAgICAgLy8gQ3VzdG9tIHNjcmVlbiBzaGFyaW5nIGV4dGVuc2lvbiBmb3IgQ2hyb21lXG5cbiAgICAgICAgICAgICAgICBzY3JlZW5TaGFyaW5nLmdldFNjcmVlbkNvbnN0cmFpbnRzKChlcnJvciwgc2NyZWVuQ29uc3RyYWludHMpID0+IHtcbiAgICAgICAgICAgICAgICAgIGlmICghIWVycm9yIHx8ICEhc2NyZWVuQ29uc3RyYWludHMubWFuZGF0b3J5ICYmIHNjcmVlbkNvbnN0cmFpbnRzLm1hbmRhdG9yeS5jaHJvbWVNZWRpYVNvdXJjZSA9PT0gJ3NjcmVlbicpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycm9yID09PSAncGVybWlzc2lvbi1kZW5pZWQnIHx8IGVycm9yID09PSAnUGVybWlzc2lvbkRlbmllZEVycm9yJykge1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGVycm9yID0gbmV3IE9wZW5WaWR1RXJyb3IoT3BlblZpZHVFcnJvck5hbWUuU0NSRUVOX0NBUFRVUkVfREVOSUVELCAnWW91IG11c3QgYWxsb3cgYWNjZXNzIHRvIG9uZSB3aW5kb3cgb2YgeW91ciBkZXNrdG9wJyk7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBleHRlbnNpb25JZCA9IHRoaXMuYWR2YW5jZWRDb25maWd1cmF0aW9uLnNjcmVlblNoYXJlQ2hyb21lRXh0ZW5zaW9uIS5zcGxpdCgnLycpLnBvcCgpISEudHJpbSgpO1xuICAgICAgICAgICAgICAgICAgICAgIHNjcmVlblNoYXJpbmcuZ2V0Q2hyb21lRXh0ZW5zaW9uU3RhdHVzKGV4dGVuc2lvbklkLCAoc3RhdHVzKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc3RhdHVzID09PSAnaW5zdGFsbGVkLWRpc2FibGVkJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBlcnJvciA9IG5ldyBPcGVuVmlkdUVycm9yKE9wZW5WaWR1RXJyb3JOYW1lLlNDUkVFTl9FWFRFTlNJT05fRElTQUJMRUQsICdZb3UgbXVzdCBlbmFibGUgdGhlIHNjcmVlbiBleHRlbnNpb24nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc3RhdHVzID09PSAnbm90LWluc3RhbGxlZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZXJyb3IgPSBuZXcgT3BlblZpZHVFcnJvcihPcGVuVmlkdUVycm9yTmFtZS5TQ1JFRU5fRVhURU5TSU9OX05PVF9JTlNUQUxMRUQsICg8c3RyaW5nPnRoaXMuYWR2YW5jZWRDb25maWd1cmF0aW9uLnNjcmVlblNoYXJlQ2hyb21lRXh0ZW5zaW9uKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBtZWRpYUNvbnN0cmFpbnRzLnZpZGVvID0gc2NyZWVuQ29uc3RyYWludHM7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUobWVkaWFDb25zdHJhaW50cyk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICAgICAgICAvLyBEZWZhdWx0IHNjcmVlbiBzaGFyaW5nIGV4dGVuc2lvbiBmb3IgQ2hyb21lXG5cbiAgICAgICAgICAgICAgICBzY3JlZW5TaGFyaW5nQXV0by5nZXRTY3JlZW5JZCgoZXJyb3IsIHNvdXJjZUlkLCBzY3JlZW5Db25zdHJhaW50cykgPT4ge1xuICAgICAgICAgICAgICAgICAgaWYgKCEhZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycm9yID09PSAnbm90LWluc3RhbGxlZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBleHRlbnNpb25VcmwgPSAhIXRoaXMuYWR2YW5jZWRDb25maWd1cmF0aW9uLnNjcmVlblNoYXJlQ2hyb21lRXh0ZW5zaW9uID8gdGhpcy5hZHZhbmNlZENvbmZpZ3VyYXRpb24uc2NyZWVuU2hhcmVDaHJvbWVFeHRlbnNpb24gOlxuICAgICAgICAgICAgICAgICAgICAgICAgJ2h0dHBzOi8vY2hyb21lLmdvb2dsZS5jb20vd2Vic3RvcmUvZGV0YWlsL29wZW52aWR1LXNjcmVlbnNoYXJpbmcvbGZjZ2ZlcGFmbm9iZGxvZWNjaG5mYWNsaWJlbmpvbGQnO1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGVycm9yID0gbmV3IE9wZW5WaWR1RXJyb3IoT3BlblZpZHVFcnJvck5hbWUuU0NSRUVOX0VYVEVOU0lPTl9OT1RfSU5TVEFMTEVELCBleHRlbnNpb25VcmwpO1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZXJyb3IgPT09ICdpbnN0YWxsZWQtZGlzYWJsZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgZXJyb3IgPSBuZXcgT3BlblZpZHVFcnJvcihPcGVuVmlkdUVycm9yTmFtZS5TQ1JFRU5fRVhURU5TSU9OX0RJU0FCTEVELCAnWW91IG11c3QgZW5hYmxlIHRoZSBzY3JlZW4gZXh0ZW5zaW9uJyk7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChlcnJvciA9PT0gJ3Blcm1pc3Npb24tZGVuaWVkJykge1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGVycm9yID0gbmV3IE9wZW5WaWR1RXJyb3IoT3BlblZpZHVFcnJvck5hbWUuU0NSRUVOX0NBUFRVUkVfREVOSUVELCAnWW91IG11c3QgYWxsb3cgYWNjZXNzIHRvIG9uZSB3aW5kb3cgb2YgeW91ciBkZXNrdG9wJyk7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbWVkaWFDb25zdHJhaW50cy52aWRlbyA9IHNjcmVlbkNvbnN0cmFpbnRzLnZpZGVvO1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKG1lZGlhQ29uc3RyYWludHMpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgcHVibGlzaGVyUHJvcGVydGllcy52aWRlb1NvdXJjZSA9ICdzY3JlZW4nO1xuXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1zdHJpbmctbGl0ZXJhbFxuICAgICAgICAgICAgbWVkaWFDb25zdHJhaW50cy52aWRlb1snZGV2aWNlSWQnXSA9IHsgZXhhY3Q6IHB1Ymxpc2hlclByb3BlcnRpZXMudmlkZW9Tb3VyY2UgfTtcbiAgICAgICAgICAgIHJlc29sdmUobWVkaWFDb25zdHJhaW50cyk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc29sdmUobWVkaWFDb25zdHJhaW50cyk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc29sdmUobWVkaWFDb25zdHJhaW50cyk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQGhpZGRlblxuICAgKi9cbiAgc3RhcnRXcyhvbkNvbm5lY3RTdWNjZXM6IChlcnJvcjogRXJyb3IpID0+IHZvaWQpOiB2b2lkIHtcbiAgICBjb25zdCBjb25maWcgPSB7XG4gICAgICBoZWFydGJlYXQ6IDUwMDAsXG4gICAgICBzZW5kQ2xvc2VNZXNzYWdlOiBmYWxzZSxcbiAgICAgIHdzOiB7XG4gICAgICAgIHVyaTogdGhpcy53c1VyaSxcbiAgICAgICAgdXNlU29ja0pTOiBmYWxzZSxcbiAgICAgICAgb25jb25uZWN0ZWQ6IG9uQ29ubmVjdFN1Y2NlcyxcbiAgICAgICAgb25kaXNjb25uZWN0OiB0aGlzLmRpc2Nvbm5lY3RDYWxsYmFjay5iaW5kKHRoaXMpLFxuICAgICAgICBvbnJlY29ubmVjdGluZzogdGhpcy5yZWNvbm5lY3RpbmdDYWxsYmFjay5iaW5kKHRoaXMpLFxuICAgICAgICBvbnJlY29ubmVjdGVkOiB0aGlzLnJlY29ubmVjdGVkQ2FsbGJhY2suYmluZCh0aGlzKVxuICAgICAgfSxcbiAgICAgIHJwYzoge1xuICAgICAgICByZXF1ZXN0VGltZW91dDogMTAwMDAsXG4gICAgICAgIHBhcnRpY2lwYW50Sm9pbmVkOiB0aGlzLnNlc3Npb24ub25QYXJ0aWNpcGFudEpvaW5lZC5iaW5kKHRoaXMuc2Vzc2lvbiksXG4gICAgICAgIHBhcnRpY2lwYW50UHVibGlzaGVkOiB0aGlzLnNlc3Npb24ub25QYXJ0aWNpcGFudFB1Ymxpc2hlZC5iaW5kKHRoaXMuc2Vzc2lvbiksXG4gICAgICAgIHBhcnRpY2lwYW50VW5wdWJsaXNoZWQ6IHRoaXMuc2Vzc2lvbi5vblBhcnRpY2lwYW50VW5wdWJsaXNoZWQuYmluZCh0aGlzLnNlc3Npb24pLFxuICAgICAgICBwYXJ0aWNpcGFudExlZnQ6IHRoaXMuc2Vzc2lvbi5vblBhcnRpY2lwYW50TGVmdC5iaW5kKHRoaXMuc2Vzc2lvbiksXG4gICAgICAgIHBhcnRpY2lwYW50RXZpY3RlZDogdGhpcy5zZXNzaW9uLm9uUGFydGljaXBhbnRFdmljdGVkLmJpbmQodGhpcy5zZXNzaW9uKSxcbiAgICAgICAgcmVjb3JkaW5nU3RhcnRlZDogdGhpcy5zZXNzaW9uLm9uUmVjb3JkaW5nU3RhcnRlZC5iaW5kKHRoaXMuc2Vzc2lvbiksXG4gICAgICAgIHJlY29yZGluZ1N0b3BwZWQ6IHRoaXMuc2Vzc2lvbi5vblJlY29yZGluZ1N0b3BwZWQuYmluZCh0aGlzLnNlc3Npb24pLFxuICAgICAgICBzZW5kTWVzc2FnZTogdGhpcy5zZXNzaW9uLm9uTmV3TWVzc2FnZS5iaW5kKHRoaXMuc2Vzc2lvbiksXG4gICAgICAgIGljZUNhbmRpZGF0ZTogdGhpcy5zZXNzaW9uLnJlY3ZJY2VDYW5kaWRhdGUuYmluZCh0aGlzLnNlc3Npb24pLFxuICAgICAgICBtZWRpYUVycm9yOiB0aGlzLnNlc3Npb24ub25NZWRpYUVycm9yLmJpbmQodGhpcy5zZXNzaW9uKVxuICAgICAgfVxuICAgIH07XG4gICAgdGhpcy5qc29uUnBjQ2xpZW50ID0gbmV3IFJwY0J1aWxkZXIuY2xpZW50cy5Kc29uUnBjQ2xpZW50KGNvbmZpZyk7XG4gIH1cblxuICAvKipcbiAgICogQGhpZGRlblxuICAgKi9cbiAgY2xvc2VXcygpOiB2b2lkIHtcbiAgICB0aGlzLmpzb25ScGNDbGllbnQuY2xvc2UoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAaGlkZGVuXG4gICAqL1xuICBzZW5kUmVxdWVzdChtZXRob2Q6IHN0cmluZywgcGFyYW1zOiBhbnksIGNhbGxiYWNrPyk6IHZvaWQge1xuICAgIGlmIChwYXJhbXMgJiYgcGFyYW1zIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICAgIGNhbGxiYWNrID0gcGFyYW1zO1xuICAgICAgcGFyYW1zID0ge307XG4gICAgfVxuICAgIGNvbnNvbGUuZGVidWcoJ1NlbmRpbmcgcmVxdWVzdDoge21ldGhvZDpcIicgKyBtZXRob2QgKyAnXCIsIHBhcmFtczogJyArIEpTT04uc3RyaW5naWZ5KHBhcmFtcykgKyAnfScpO1xuICAgIHRoaXMuanNvblJwY0NsaWVudC5zZW5kKG1ldGhvZCwgcGFyYW1zLCBjYWxsYmFjayk7XG4gIH1cblxuICAvKipcbiAgICogQGhpZGRlblxuICAgKi9cbiAgaXNNZWRpYVN0cmVhbVRyYWNrKG1lZGlhU291cmNlOiBhbnkpOiBib29sZWFuIHtcbiAgICBjb25zdCBpcyA9ICghIW1lZGlhU291cmNlICYmXG4gICAgICBtZWRpYVNvdXJjZS5lbmFibGVkICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mIG1lZGlhU291cmNlLmVuYWJsZWQgPT09ICdib29sZWFuJyAmJlxuICAgICAgbWVkaWFTb3VyY2UuaWQgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2YgbWVkaWFTb3VyY2UuaWQgPT09ICdzdHJpbmcnICYmXG4gICAgICBtZWRpYVNvdXJjZS5raW5kICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mIG1lZGlhU291cmNlLmtpbmQgPT09ICdzdHJpbmcnICYmXG4gICAgICBtZWRpYVNvdXJjZS5sYWJlbCAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiBtZWRpYVNvdXJjZS5sYWJlbCA9PT0gJ3N0cmluZycgJiZcbiAgICAgIG1lZGlhU291cmNlLm11dGVkICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mIG1lZGlhU291cmNlLm11dGVkID09PSAnYm9vbGVhbicgJiZcbiAgICAgIG1lZGlhU291cmNlLnJlYWR5U3RhdGUgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2YgbWVkaWFTb3VyY2UucmVhZHlTdGF0ZSA9PT0gJ3N0cmluZycpO1xuICAgIHJldHVybiBpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBAaGlkZGVuXG4gICAqL1xuICBnZXRXc1VyaSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLndzVXJpO1xuICB9XG5cbiAgLyoqXG4gICAqIEBoaWRkZW5cbiAgICovXG4gIGdldFNlY3JldCgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLnNlY3JldDtcbiAgfVxuXG4gIC8qKlxuICAgKiBAaGlkZGVuXG4gICAqL1xuICBnZXRSZWNvcmRlcigpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5yZWNvcmRlcjtcbiAgfVxuXG5cbiAgLyogUHJpdmF0ZSBtZXRob2RzICovXG5cbiAgcHJpdmF0ZSBkaXNjb25uZWN0Q2FsbGJhY2soKTogdm9pZCB7XG4gICAgY29uc29sZS53YXJuKCdXZWJzb2NrZXQgY29ubmVjdGlvbiBsb3N0Jyk7XG4gICAgaWYgKHRoaXMuaXNSb29tQXZhaWxhYmxlKCkpIHtcbiAgICAgIHRoaXMuc2Vzc2lvbi5vbkxvc3RDb25uZWN0aW9uKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGFsZXJ0KCdDb25uZWN0aW9uIGVycm9yLiBQbGVhc2UgcmVsb2FkIHBhZ2UuJyk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZWNvbm5lY3RpbmdDYWxsYmFjaygpOiB2b2lkIHtcbiAgICBjb25zb2xlLndhcm4oJ1dlYnNvY2tldCBjb25uZWN0aW9uIGxvc3QgKHJlY29ubmVjdGluZyknKTtcbiAgICBpZiAodGhpcy5pc1Jvb21BdmFpbGFibGUoKSkge1xuICAgICAgdGhpcy5zZXNzaW9uLm9uTG9zdENvbm5lY3Rpb24oKTtcbiAgICB9IGVsc2Uge1xuICAgICAgYWxlcnQoJ0Nvbm5lY3Rpb24gZXJyb3IuIFBsZWFzZSByZWxvYWQgcGFnZS4nKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHJlY29ubmVjdGVkQ2FsbGJhY2soKTogdm9pZCB7XG4gICAgY29uc29sZS53YXJuKCdXZWJzb2NrZXQgcmVjb25uZWN0ZWQnKTtcbiAgfVxuXG4gIHByaXZhdGUgaXNSb29tQXZhaWxhYmxlKCk6IGJvb2xlYW4ge1xuICAgIGlmICh0aGlzLnNlc3Npb24gIT09IHVuZGVmaW5lZCAmJiB0aGlzLnNlc3Npb24gaW5zdGFuY2VvZiBTZXNzaW9uKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS53YXJuKCdTZXNzaW9uIGluc3RhbmNlIG5vdCBmb3VuZCcpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG59IiwiLypcbiAqIChDKSBDb3B5cmlnaHQgMjAxNy0yMDE4IE9wZW5WaWR1IChodHRwczovL29wZW52aWR1LmlvLylcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICpcbiAqL1xuXG5pbXBvcnQgeyBPcGVuVmlkdSB9IGZyb20gJy4vT3BlblZpZHUnO1xuaW1wb3J0IHsgU2Vzc2lvbiB9IGZyb20gJy4vU2Vzc2lvbic7XG5pbXBvcnQgeyBTdHJlYW0gfSBmcm9tICcuL1N0cmVhbSc7XG5pbXBvcnQgeyBTdHJlYW1NYW5hZ2VyIH0gZnJvbSAnLi9TdHJlYW1NYW5hZ2VyJztcbmltcG9ydCB7IEV2ZW50RGlzcGF0Y2hlciB9IGZyb20gJy4uL09wZW5WaWR1SW50ZXJuYWwvSW50ZXJmYWNlcy9QdWJsaWMvRXZlbnREaXNwYXRjaGVyJztcbmltcG9ydCB7IFB1Ymxpc2hlclByb3BlcnRpZXMgfSBmcm9tICcuLi9PcGVuVmlkdUludGVybmFsL0ludGVyZmFjZXMvUHVibGljL1B1Ymxpc2hlclByb3BlcnRpZXMnO1xuaW1wb3J0IHsgRXZlbnQgfSBmcm9tICcuLi9PcGVuVmlkdUludGVybmFsL0V2ZW50cy9FdmVudCc7XG5pbXBvcnQgeyBTdHJlYW1FdmVudCB9IGZyb20gJy4uL09wZW5WaWR1SW50ZXJuYWwvRXZlbnRzL1N0cmVhbUV2ZW50JztcbmltcG9ydCB7IFZpZGVvRWxlbWVudEV2ZW50IH0gZnJvbSAnLi4vT3BlblZpZHVJbnRlcm5hbC9FdmVudHMvVmlkZW9FbGVtZW50RXZlbnQnO1xuaW1wb3J0IHsgT3BlblZpZHVFcnJvciwgT3BlblZpZHVFcnJvck5hbWUgfSBmcm9tICcuLi9PcGVuVmlkdUludGVybmFsL0VudW1zL09wZW5WaWR1RXJyb3InO1xuaW1wb3J0IHsgVmlkZW9JbnNlcnRNb2RlIH0gZnJvbSAnLi4vT3BlblZpZHVJbnRlcm5hbC9FbnVtcy9WaWRlb0luc2VydE1vZGUnO1xuXG5cbi8qKlxuICogUGFja3MgbG9jYWwgbWVkaWEgc3RyZWFtcy4gUGFydGljaXBhbnRzIGNhbiBwdWJsaXNoIGl0IHRvIGEgc2Vzc2lvbi4gSW5pdGlhbGl6ZWQgd2l0aCBbW09wZW5WaWR1LmluaXRQdWJsaXNoZXJdXSBtZXRob2RcbiAqL1xuZXhwb3J0IGNsYXNzIFB1Ymxpc2hlciBleHRlbmRzIFN0cmVhbU1hbmFnZXIge1xuXG4gICAgLyoqXG4gICAgICogV2hldGhlciB0aGUgUHVibGlzaGVyIGhhcyBiZWVuIGdyYW50ZWQgYWNjZXNzIHRvIHRoZSByZXF1ZXN0ZWQgaW5wdXQgZGV2aWNlcyBvciBub3RcbiAgICAgKi9cbiAgICBhY2Nlc3NBbGxvd2VkID0gZmFsc2U7XG5cbiAgICAvKipcbiAgICAgKiBXaGV0aGVyIHlvdSBoYXZlIGNhbGxlZCBbW1B1Ymxpc2hlci5zdWJzY3JpYmVUb1JlbW90ZV1dIHdpdGggdmFsdWUgYHRydWVgIG9yIGBmYWxzZWAgKCpmYWxzZSogYnkgZGVmYXVsdClcbiAgICAgKi9cbiAgICBpc1N1YnNjcmliZWRUb1JlbW90ZSA9IGZhbHNlO1xuXG4gICAgLyoqXG4gICAgICogVGhlIFtbU2Vzc2lvbl1dIHRvIHdoaWNoIHRoZSBQdWJsaXNoZXIgYmVsb25nc1xuICAgICAqL1xuICAgIHNlc3Npb246IFNlc3Npb247IC8vIEluaXRpYWxpemVkIGJ5IFNlc3Npb24ucHVibGlzaChQdWJsaXNoZXIpXG5cbiAgICBwcml2YXRlIGFjY2Vzc0RlbmllZCA9IGZhbHNlO1xuICAgIHByaXZhdGUgcHJvcGVydGllczogUHVibGlzaGVyUHJvcGVydGllcztcbiAgICBwcml2YXRlIHBlcm1pc3Npb25EaWFsb2dUaW1lb3V0OiBOb2RlSlMuVGltZXI7XG5cbiAgICAvKipcbiAgICAgKiBAaGlkZGVuXG4gICAgICovXG4gICAgY29uc3RydWN0b3IodGFyZ0VsOiBzdHJpbmcgfCBIVE1MRWxlbWVudCwgcHJvcGVydGllczogUHVibGlzaGVyUHJvcGVydGllcywgcHJpdmF0ZSBvcGVudmlkdTogT3BlblZpZHUpIHtcbiAgICAgICAgc3VwZXIobmV3IFN0cmVhbSgoISFvcGVudmlkdS5zZXNzaW9uKSA/IG9wZW52aWR1LnNlc3Npb24gOiBuZXcgU2Vzc2lvbihvcGVudmlkdSksIHsgcHVibGlzaGVyUHJvcGVydGllczogcHJvcGVydGllcywgbWVkaWFDb25zdHJhaW50czoge30gfSksIHRhcmdFbCk7XG4gICAgICAgIHRoaXMucHJvcGVydGllcyA9IHByb3BlcnRpZXM7XG5cbiAgICAgICAgdGhpcy5zdHJlYW0uZWUub24oJ2xvY2FsLXN0cmVhbS1kZXN0cm95ZWQtYnktZGlzY29ubmVjdCcsIChyZWFzb246IHN0cmluZykgPT4ge1xuICAgICAgICAgICAgY29uc3Qgc3RyZWFtRXZlbnQgPSBuZXcgU3RyZWFtRXZlbnQodHJ1ZSwgdGhpcywgJ3N0cmVhbURlc3Ryb3llZCcsIHRoaXMuc3RyZWFtLCByZWFzb24pO1xuICAgICAgICAgICAgdGhpcy5lZS5lbWl0RXZlbnQoJ3N0cmVhbURlc3Ryb3llZCcsIFtzdHJlYW1FdmVudF0pO1xuICAgICAgICAgICAgc3RyZWFtRXZlbnQuY2FsbERlZmF1bHRCZWhhdmlvdXIoKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKiBQdWJsaXNoIG9yIHVucHVibGlzaCB0aGUgYXVkaW8gc3RyZWFtIChpZiBhdmFpbGFibGUpLiBDYWxsaW5nIHRoaXMgbWV0aG9kIHR3aWNlIGluIGEgcm93IHBhc3Npbmcgc2FtZSB2YWx1ZSB3aWxsIGhhdmUgbm8gZWZmZWN0XG4gICAgICogQHBhcmFtIHZhbHVlIGB0cnVlYCB0byBwdWJsaXNoIHRoZSBhdWRpbyBzdHJlYW0sIGBmYWxzZWAgdG8gdW5wdWJsaXNoIGl0XG4gICAgICovXG4gICAgcHVibGlzaEF1ZGlvKHZhbHVlOiBib29sZWFuKTogdm9pZCB7XG4gICAgICAgIHRoaXMuc3RyZWFtLmdldE1lZGlhU3RyZWFtKCkuZ2V0QXVkaW9UcmFja3MoKS5mb3JFYWNoKCh0cmFjaykgPT4ge1xuICAgICAgICAgICAgdHJhY2suZW5hYmxlZCA9IHZhbHVlO1xuICAgICAgICB9KTtcbiAgICAgICAgY29uc29sZS5pbmZvKFwiJ1B1Ymxpc2hlcicgaGFzIFwiICsgKHZhbHVlID8gJ3B1Ymxpc2hlZCcgOiAndW5wdWJsaXNoZWQnKSArICcgaXRzIGF1ZGlvIHN0cmVhbScpO1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICogUHVibGlzaCBvciB1bnB1Ymxpc2ggdGhlIHZpZGVvIHN0cmVhbSAoaWYgYXZhaWxhYmxlKS4gQ2FsbGluZyB0aGlzIG1ldGhvZCB0d2ljZSBpbiBhIHJvdyBwYXNzaW5nIHNhbWUgdmFsdWUgd2lsbCBoYXZlIG5vIGVmZmVjdFxuICAgICAqIEBwYXJhbSB2YWx1ZSBgdHJ1ZWAgdG8gcHVibGlzaCB0aGUgdmlkZW8gc3RyZWFtLCBgZmFsc2VgIHRvIHVucHVibGlzaCBpdFxuICAgICAqL1xuICAgIHB1Ymxpc2hWaWRlbyh2YWx1ZTogYm9vbGVhbik6IHZvaWQge1xuICAgICAgICB0aGlzLnN0cmVhbS5nZXRNZWRpYVN0cmVhbSgpLmdldFZpZGVvVHJhY2tzKCkuZm9yRWFjaCgodHJhY2spID0+IHtcbiAgICAgICAgICAgIHRyYWNrLmVuYWJsZWQgPSB2YWx1ZTtcbiAgICAgICAgfSk7XG4gICAgICAgIGNvbnNvbGUuaW5mbyhcIidQdWJsaXNoZXInIGhhcyBcIiArICh2YWx1ZSA/ICdwdWJsaXNoZWQnIDogJ3VucHVibGlzaGVkJykgKyAnIGl0cyB2aWRlbyBzdHJlYW0nKTtcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqIENhbGwgdGhpcyBtZXRob2QgYmVmb3JlIFtbU2Vzc2lvbi5wdWJsaXNoXV0gdG8gc3Vic2NyaWJlIHRvIHlvdXIgUHVibGlzaGVyJ3MgcmVtb3RlIHN0cmVhbSBpbnN0ZWFkIG9mIHVzaW5nIHRoZSBsb2NhbCBzdHJlYW0sIGFzIGFueSBvdGhlciB1c2VyIHdvdWxkIGRvLlxuICAgICAqL1xuICAgIHN1YnNjcmliZVRvUmVtb3RlKHZhbHVlPzogYm9vbGVhbik6IHZvaWQge1xuICAgICAgICB2YWx1ZSA9ICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSA/IHZhbHVlIDogdHJ1ZTtcbiAgICAgICAgdGhpcy5pc1N1YnNjcmliZWRUb1JlbW90ZSA9IHZhbHVlO1xuICAgICAgICB0aGlzLnN0cmVhbS5zdWJzY3JpYmVUb015UmVtb3RlKHZhbHVlKTtcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqIFNlZSBbW0V2ZW50RGlzcGF0Y2hlci5vbl1dXG4gICAgICovXG4gICAgb24odHlwZTogc3RyaW5nLCBoYW5kbGVyOiAoZXZlbnQ6IEV2ZW50KSA9PiB2b2lkKTogRXZlbnREaXNwYXRjaGVyIHtcbiAgICAgICAgc3VwZXIub24odHlwZSwgaGFuZGxlcik7XG4gICAgICAgIGlmICh0eXBlID09PSAnc3RyZWFtQ3JlYXRlZCcpIHtcbiAgICAgICAgICAgIGlmICghIXRoaXMuc3RyZWFtICYmIHRoaXMuc3RyZWFtLmlzTG9jYWxTdHJlYW1QdWJsaXNoZWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmVlLmVtaXRFdmVudCgnc3RyZWFtQ3JlYXRlZCcsIFtuZXcgU3RyZWFtRXZlbnQoZmFsc2UsIHRoaXMsICdzdHJlYW1DcmVhdGVkJywgdGhpcy5zdHJlYW0sICcnKV0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnN0cmVhbS5lZS5vbignc3RyZWFtLWNyZWF0ZWQtYnktcHVibGlzaGVyJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmVlLmVtaXRFdmVudCgnc3RyZWFtQ3JlYXRlZCcsIFtuZXcgU3RyZWFtRXZlbnQoZmFsc2UsIHRoaXMsICdzdHJlYW1DcmVhdGVkJywgdGhpcy5zdHJlYW0sICcnKV0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlID09PSAncmVtb3RlVmlkZW9QbGF5aW5nJykge1xuICAgICAgICAgICAgaWYgKHRoaXMuc3RyZWFtLmRpc3BsYXlNeVJlbW90ZSgpICYmIHRoaXMudmlkZW9zWzBdICYmIHRoaXMudmlkZW9zWzBdLnZpZGVvICYmXG4gICAgICAgICAgICAgICAgdGhpcy52aWRlb3NbMF0udmlkZW8uY3VycmVudFRpbWUgPiAwICYmXG4gICAgICAgICAgICAgICAgdGhpcy52aWRlb3NbMF0udmlkZW8ucGF1c2VkID09PSBmYWxzZSAmJlxuICAgICAgICAgICAgICAgIHRoaXMudmlkZW9zWzBdLnZpZGVvLmVuZGVkID09PSBmYWxzZSAmJlxuICAgICAgICAgICAgICAgIHRoaXMudmlkZW9zWzBdLnZpZGVvLnJlYWR5U3RhdGUgPT09IDQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmVlLmVtaXRFdmVudCgncmVtb3RlVmlkZW9QbGF5aW5nJywgW25ldyBWaWRlb0VsZW1lbnRFdmVudCh0aGlzLnZpZGVvc1swXS52aWRlbywgdGhpcywgJ3JlbW90ZVZpZGVvUGxheWluZycpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGUgPT09ICdhY2Nlc3NBbGxvd2VkJykge1xuICAgICAgICAgICAgaWYgKHRoaXMuYWNjZXNzQWxsb3dlZCkge1xuICAgICAgICAgICAgICAgIHRoaXMuZWUuZW1pdEV2ZW50KCdhY2Nlc3NBbGxvd2VkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGUgPT09ICdhY2Nlc3NEZW5pZWQnKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5hY2Nlc3NEZW5pZWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmVlLmVtaXRFdmVudCgnYWNjZXNzRGVuaWVkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKiBTZWUgW1tFdmVudERpc3BhdGNoZXIub25jZV1dXG4gICAgICovXG4gICAgb25jZSh0eXBlOiBzdHJpbmcsIGhhbmRsZXI6IChldmVudDogRXZlbnQpID0+IHZvaWQpOiBQdWJsaXNoZXIge1xuICAgICAgICBzdXBlci5vbmNlKHR5cGUsIGhhbmRsZXIpO1xuICAgICAgICBpZiAodHlwZSA9PT0gJ3N0cmVhbUNyZWF0ZWQnKSB7XG4gICAgICAgICAgICBpZiAoISF0aGlzLnN0cmVhbSAmJiB0aGlzLnN0cmVhbS5pc0xvY2FsU3RyZWFtUHVibGlzaGVkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5lZS5lbWl0RXZlbnQoJ3N0cmVhbUNyZWF0ZWQnLCBbbmV3IFN0cmVhbUV2ZW50KGZhbHNlLCB0aGlzLCAnc3RyZWFtQ3JlYXRlZCcsIHRoaXMuc3RyZWFtLCAnJyldKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zdHJlYW0uZWUub25jZSgnc3RyZWFtLWNyZWF0ZWQtYnktcHVibGlzaGVyJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmVlLmVtaXRFdmVudCgnc3RyZWFtQ3JlYXRlZCcsIFtuZXcgU3RyZWFtRXZlbnQoZmFsc2UsIHRoaXMsICdzdHJlYW1DcmVhdGVkJywgdGhpcy5zdHJlYW0sICcnKV0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlID09PSAncmVtb3RlVmlkZW9QbGF5aW5nJykge1xuICAgICAgICAgICAgaWYgKHRoaXMuc3RyZWFtLmRpc3BsYXlNeVJlbW90ZSgpICYmIHRoaXMudmlkZW9zWzBdICYmIHRoaXMudmlkZW9zWzBdLnZpZGVvICYmXG4gICAgICAgICAgICAgICAgdGhpcy52aWRlb3NbMF0udmlkZW8uY3VycmVudFRpbWUgPiAwICYmXG4gICAgICAgICAgICAgICAgdGhpcy52aWRlb3NbMF0udmlkZW8ucGF1c2VkID09PSBmYWxzZSAmJlxuICAgICAgICAgICAgICAgIHRoaXMudmlkZW9zWzBdLnZpZGVvLmVuZGVkID09PSBmYWxzZSAmJlxuICAgICAgICAgICAgICAgIHRoaXMudmlkZW9zWzBdLnZpZGVvLnJlYWR5U3RhdGUgPT09IDQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmVlLmVtaXRFdmVudCgncmVtb3RlVmlkZW9QbGF5aW5nJywgW25ldyBWaWRlb0VsZW1lbnRFdmVudCh0aGlzLnZpZGVvc1swXS52aWRlbywgdGhpcywgJ3JlbW90ZVZpZGVvUGxheWluZycpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGUgPT09ICdhY2Nlc3NBbGxvd2VkJykge1xuICAgICAgICAgICAgaWYgKHRoaXMuYWNjZXNzQWxsb3dlZCkge1xuICAgICAgICAgICAgICAgIHRoaXMuZWUuZW1pdEV2ZW50KCdhY2Nlc3NBbGxvd2VkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGUgPT09ICdhY2Nlc3NEZW5pZWQnKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5hY2Nlc3NEZW5pZWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmVlLmVtaXRFdmVudCgnYWNjZXNzRGVuaWVkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG5cbiAgICAvKiBIaWRkZW4gbWV0aG9kcyAqL1xuXG4gICAgLyoqXG4gICAgICogQGhpZGRlblxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKTogUHJvbWlzZTxhbnk+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcblxuICAgICAgICAgICAgY29uc3QgZXJyb3JDYWxsYmFjayA9IChvcGVuVmlkdUVycm9yOiBPcGVuVmlkdUVycm9yKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5hY2Nlc3NEZW5pZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRoaXMuYWNjZXNzQWxsb3dlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHJlamVjdChvcGVuVmlkdUVycm9yKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGNvbnN0IHN1Y2Nlc3NDYWxsYmFjayA9IChtZWRpYVN0cmVhbTogTWVkaWFTdHJlYW0pID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmFjY2Vzc0FsbG93ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRoaXMuYWNjZXNzRGVuaWVkID0gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5vcGVudmlkdS5pc01lZGlhU3RyZWFtVHJhY2sodGhpcy5wcm9wZXJ0aWVzLmF1ZGlvU291cmNlKSkge1xuICAgICAgICAgICAgICAgICAgICBtZWRpYVN0cmVhbS5yZW1vdmVUcmFjayhtZWRpYVN0cmVhbS5nZXRBdWRpb1RyYWNrcygpWzBdKTtcbiAgICAgICAgICAgICAgICAgICAgbWVkaWFTdHJlYW0uYWRkVHJhY2soKDxNZWRpYVN0cmVhbVRyYWNrPnRoaXMucHJvcGVydGllcy5hdWRpb1NvdXJjZSkpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmICh0aGlzLm9wZW52aWR1LmlzTWVkaWFTdHJlYW1UcmFjayh0aGlzLnByb3BlcnRpZXMudmlkZW9Tb3VyY2UpKSB7XG4gICAgICAgICAgICAgICAgICAgIG1lZGlhU3RyZWFtLnJlbW92ZVRyYWNrKG1lZGlhU3RyZWFtLmdldFZpZGVvVHJhY2tzKClbMF0pO1xuICAgICAgICAgICAgICAgICAgICBtZWRpYVN0cmVhbS5hZGRUcmFjaygoPE1lZGlhU3RyZWFtVHJhY2s+dGhpcy5wcm9wZXJ0aWVzLnZpZGVvU291cmNlKSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gQXBwbHkgUHVibGlzaGVyUHJvcGVydGllcy5wdWJsaXNoQXVkaW8gYW5kIFB1Ymxpc2hlclByb3BlcnRpZXMucHVibGlzaFZpZGVvXG4gICAgICAgICAgICAgICAgaWYgKCEhbWVkaWFTdHJlYW0uZ2V0QXVkaW9UcmFja3MoKVswXSkge1xuICAgICAgICAgICAgICAgICAgICBtZWRpYVN0cmVhbS5nZXRBdWRpb1RyYWNrcygpWzBdLmVuYWJsZWQgPSAhIXRoaXMuc3RyZWFtLm91dGJvdW5kU3RyZWFtT3B0cy5wdWJsaXNoZXJQcm9wZXJ0aWVzLnB1Ymxpc2hBdWRpbztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCEhbWVkaWFTdHJlYW0uZ2V0VmlkZW9UcmFja3MoKVswXSkge1xuICAgICAgICAgICAgICAgICAgICBtZWRpYVN0cmVhbS5nZXRWaWRlb1RyYWNrcygpWzBdLmVuYWJsZWQgPSAhIXRoaXMuc3RyZWFtLm91dGJvdW5kU3RyZWFtT3B0cy5wdWJsaXNoZXJQcm9wZXJ0aWVzLnB1Ymxpc2hWaWRlbztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0aGlzLnN0cmVhbS5zZXRNZWRpYVN0cmVhbShtZWRpYVN0cmVhbSk7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLnN0cmVhbS5kaXNwbGF5TXlSZW1vdGUoKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBzdWJzY3JpYmVkIHRvIG91ciByZW1vdGUgd2UgZG9uJ3Qgc3RpbGwgc2V0IHRoZSBNZWRpYVN0cmVhbSBvYmplY3QgaW4gdGhlIHZpZGVvIGVsZW1lbnRzIHRvXG4gICAgICAgICAgICAgICAgICAgIC8vIGF2b2lkIGVhcmx5ICdzdHJlYW1QbGF5aW5nJyBldmVudFxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN0cmVhbS51cGRhdGVNZWRpYVN0cmVhbUluVmlkZW9zKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMuc3RyZWFtLmlzTG9jYWxTdHJlYW1SZWFkeVRvUHVibGlzaCA9IHRydWU7XG4gICAgICAgICAgICAgICAgdGhpcy5zdHJlYW0uZWUuZW1pdEV2ZW50KCdzdHJlYW0tcmVhZHktdG8tcHVibGlzaCcsIFtdKTtcblxuICAgICAgICAgICAgICAgIGlmICghIXRoaXMuZmlyc3RWaWRlb0VsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jcmVhdGVWaWRlb0VsZW1lbnQodGhpcy5maXJzdFZpZGVvRWxlbWVudC50YXJnZXRFbGVtZW50LCA8VmlkZW9JbnNlcnRNb2RlPnRoaXMucHJvcGVydGllcy5pbnNlcnRNb2RlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuZmlyc3RWaWRlb0VsZW1lbnQ7XG5cbiAgICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB0aGlzLm9wZW52aWR1LmdlbmVyYXRlTWVkaWFDb25zdHJhaW50cyh0aGlzLnByb3BlcnRpZXMpXG4gICAgICAgICAgICAgICAgLnRoZW4oY29uc3RyYWludHMgPT4ge1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG91dGJvdW5kU3RyZWFtT3B0aW9ucyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lZGlhQ29uc3RyYWludHM6IGNvbnN0cmFpbnRzLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHVibGlzaGVyUHJvcGVydGllczogdGhpcy5wcm9wZXJ0aWVzXG4gICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zdHJlYW0uc2V0T3V0Ym91bmRTdHJlYW1PcHRpb25zKG91dGJvdW5kU3RyZWFtT3B0aW9ucyk7XG5cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY29uc3RyYWludHNBdXg6IE1lZGlhU3RyZWFtQ29uc3RyYWludHMgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGltZUZvckRpYWxvZ0V2ZW50ID0gMTI1MDtcblxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5zdHJlYW0uaXNTZW5kVmlkZW8oKSB8fCB0aGlzLnN0cmVhbS5pc1NlbmRBdWRpbygpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkZWZpbmVkQXVkaW9Db25zdHJhaW50ID0gKChjb25zdHJhaW50cy5hdWRpbyA9PT0gdW5kZWZpbmVkKSA/IHRydWUgOiBjb25zdHJhaW50cy5hdWRpbyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdHJhaW50c0F1eC5hdWRpbyA9IHRoaXMuc3RyZWFtLmlzU2VuZFNjcmVlbigpID8gZmFsc2UgOiBkZWZpbmVkQXVkaW9Db25zdHJhaW50O1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3RyYWludHNBdXgudmlkZW8gPSBjb25zdHJhaW50cy52aWRlbztcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRQZXJtaXNzaW9uRGlhbG9nVGltZXIodGltZUZvckRpYWxvZ0V2ZW50KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEoY29uc3RyYWludHNBdXgpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLnRoZW4obWVkaWFTdHJlYW0gPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNsZWFyUGVybWlzc2lvbkRpYWxvZ1RpbWVyKHN0YXJ0VGltZSwgdGltZUZvckRpYWxvZ0V2ZW50KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5zdHJlYW0uaXNTZW5kU2NyZWVuKCkgJiYgdGhpcy5zdHJlYW0uaXNTZW5kQXVkaW8oKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gV2hlbiBnZXR0aW5nIGRlc2t0b3AgYXMgdXNlciBtZWRpYSBhdWRpbyBjb25zdHJhaW50IG11c3QgYmUgZmFsc2UuIE5vdyB3ZSBjYW4gYXNrIGZvciBpdCBpZiByZXF1aXJlZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3RyYWludHNBdXguYXVkaW8gPSBkZWZpbmVkQXVkaW9Db25zdHJhaW50O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3RyYWludHNBdXgudmlkZW8gPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0VGltZSA9IERhdGUubm93KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNldFBlcm1pc3Npb25EaWFsb2dUaW1lcih0aW1lRm9yRGlhbG9nRXZlbnQpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmdldFVzZXJNZWRpYShjb25zdHJhaW50c0F1eClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAudGhlbihhdWRpb09ubHlTdHJlYW0gPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNsZWFyUGVybWlzc2lvbkRpYWxvZ1RpbWVyKHN0YXJ0VGltZSwgdGltZUZvckRpYWxvZ0V2ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVkaWFTdHJlYW0uYWRkVHJhY2soYXVkaW9Pbmx5U3RyZWFtLmdldEF1ZGlvVHJhY2tzKClbMF0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzQ2FsbGJhY2sobWVkaWFTdHJlYW0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmNhdGNoKGVycm9yID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jbGVhclBlcm1pc3Npb25EaWFsb2dUaW1lcihzdGFydFRpbWUsIHRpbWVGb3JEaWFsb2dFdmVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBlcnJvck5hbWUsIGVycm9yTWVzc2FnZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChlcnJvci5uYW1lLnRvTG93ZXJDYXNlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ25vdGZvdW5kZXJyb3InOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yTmFtZSA9IE9wZW5WaWR1RXJyb3JOYW1lLklOUFVUX0FVRElPX0RFVklDRV9OT1RfRk9VTkQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3JNZXNzYWdlID0gZXJyb3IudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvckNhbGxiYWNrKG5ldyBPcGVuVmlkdUVycm9yKGVycm9yTmFtZSwgZXJyb3JNZXNzYWdlKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdub3RhbGxvd2VkZXJyb3InOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yTmFtZSA9IE9wZW5WaWR1RXJyb3JOYW1lLkRFVklDRV9BQ0NFU1NfREVOSUVEO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yTWVzc2FnZSA9IGVycm9yLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3JDYWxsYmFjayhuZXcgT3BlblZpZHVFcnJvcihlcnJvck5hbWUsIGVycm9yTWVzc2FnZSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnb3ZlcmNvbnN0cmFpbmVkZXJyb3InOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnJvci5jb25zdHJhaW50LnRvTG93ZXJDYXNlKCkgPT09ICdkZXZpY2VpZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3JOYW1lID0gT3BlblZpZHVFcnJvck5hbWUuSU5QVVRfQVVESU9fREVWSUNFX05PVF9GT1VORDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3JNZXNzYWdlID0gXCJBdWRpbyBpbnB1dCBkZXZpY2Ugd2l0aCBkZXZpY2VJZCAnXCIgKyAoPENvbnN0cmFpbkRPTVN0cmluZ1BhcmFtZXRlcnM+KDxNZWRpYVRyYWNrQ29uc3RyYWludHM+Y29uc3RyYWludHMudmlkZW8pLmRldmljZUlkISEpLmV4YWN0ICsgXCInIG5vdCBmb3VuZFwiO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yTmFtZSA9IE9wZW5WaWR1RXJyb3JOYW1lLlBVQkxJU0hFUl9QUk9QRVJUSUVTX0VSUk9SO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvck1lc3NhZ2UgPSBcIkF1ZGlvIGlucHV0IGRldmljZSBkb2Vzbid0IHN1cHBvcnQgdGhlIHZhbHVlIHBhc3NlZCBmb3IgY29uc3RyYWludCAnXCIgKyBlcnJvci5jb25zdHJhaW50ICsgXCInXCI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yQ2FsbGJhY2sobmV3IE9wZW5WaWR1RXJyb3IoZXJyb3JOYW1lLCBlcnJvck1lc3NhZ2UpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc0NhbGxiYWNrKG1lZGlhU3RyZWFtKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLmNhdGNoKGVycm9yID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jbGVhclBlcm1pc3Npb25EaWFsb2dUaW1lcihzdGFydFRpbWUsIHRpbWVGb3JEaWFsb2dFdmVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBlcnJvck5hbWUsIGVycm9yTWVzc2FnZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChlcnJvci5uYW1lLnRvTG93ZXJDYXNlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ25vdGZvdW5kZXJyb3InOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXVkaW86IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWRlbzogY29uc3RyYWludHMudmlkZW9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAudGhlbihtZWRpYVN0cmVhbSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZWRpYVN0cmVhbS5nZXRWaWRlb1RyYWNrcygpLmZvckVhY2goKHRyYWNrKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJhY2suc3RvcCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvck5hbWUgPSBPcGVuVmlkdUVycm9yTmFtZS5JTlBVVF9BVURJT19ERVZJQ0VfTk9UX0ZPVU5EO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3JNZXNzYWdlID0gZXJyb3IudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yQ2FsbGJhY2sobmV3IE9wZW5WaWR1RXJyb3IoZXJyb3JOYW1lLCBlcnJvck1lc3NhZ2UpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvck5hbWUgPSBPcGVuVmlkdUVycm9yTmFtZS5JTlBVVF9WSURFT19ERVZJQ0VfTk9UX0ZPVU5EO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3JNZXNzYWdlID0gZXJyb3IudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yQ2FsbGJhY2sobmV3IE9wZW5WaWR1RXJyb3IoZXJyb3JOYW1lLCBlcnJvck1lc3NhZ2UpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdub3RhbGxvd2VkZXJyb3InOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yTmFtZSA9IHRoaXMuc3RyZWFtLmlzU2VuZFNjcmVlbigpID8gT3BlblZpZHVFcnJvck5hbWUuU0NSRUVOX0NBUFRVUkVfREVOSUVEIDogT3BlblZpZHVFcnJvck5hbWUuREVWSUNFX0FDQ0VTU19ERU5JRUQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3JNZXNzYWdlID0gZXJyb3IudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvckNhbGxiYWNrKG5ldyBPcGVuVmlkdUVycm9yKGVycm9yTmFtZSwgZXJyb3JNZXNzYWdlKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdvdmVyY29uc3RyYWluZWRlcnJvcic6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdWRpbzogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZGVvOiBjb25zdHJhaW50cy52aWRlb1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC50aGVuKG1lZGlhU3RyZWFtID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lZGlhU3RyZWFtLmdldFZpZGVvVHJhY2tzKCkuZm9yRWFjaCgodHJhY2spID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmFjay5zdG9wKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnJvci5jb25zdHJhaW50LnRvTG93ZXJDYXNlKCkgPT09ICdkZXZpY2VpZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvck5hbWUgPSBPcGVuVmlkdUVycm9yTmFtZS5JTlBVVF9BVURJT19ERVZJQ0VfTk9UX0ZPVU5EO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yTWVzc2FnZSA9IFwiQXVkaW8gaW5wdXQgZGV2aWNlIHdpdGggZGV2aWNlSWQgJ1wiICsgKDxDb25zdHJhaW5ET01TdHJpbmdQYXJhbWV0ZXJzPig8TWVkaWFUcmFja0NvbnN0cmFpbnRzPmNvbnN0cmFpbnRzLmF1ZGlvKS5kZXZpY2VJZCEhKS5leGFjdCArIFwiJyBub3QgZm91bmRcIjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3JOYW1lID0gT3BlblZpZHVFcnJvck5hbWUuUFVCTElTSEVSX1BST1BFUlRJRVNfRVJST1I7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3JNZXNzYWdlID0gXCJBdWRpbyBpbnB1dCBkZXZpY2UgZG9lc24ndCBzdXBwb3J0IHRoZSB2YWx1ZSBwYXNzZWQgZm9yIGNvbnN0cmFpbnQgJ1wiICsgZXJyb3IuY29uc3RyYWludCArIFwiJ1wiO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3JDYWxsYmFjayhuZXcgT3BlblZpZHVFcnJvcihlcnJvck5hbWUsIGVycm9yTWVzc2FnZSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChlID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnJvci5jb25zdHJhaW50LnRvTG93ZXJDYXNlKCkgPT09ICdkZXZpY2VpZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvck5hbWUgPSBPcGVuVmlkdUVycm9yTmFtZS5JTlBVVF9WSURFT19ERVZJQ0VfTk9UX0ZPVU5EO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yTWVzc2FnZSA9IFwiVmlkZW8gaW5wdXQgZGV2aWNlIHdpdGggZGV2aWNlSWQgJ1wiICsgKDxDb25zdHJhaW5ET01TdHJpbmdQYXJhbWV0ZXJzPig8TWVkaWFUcmFja0NvbnN0cmFpbnRzPmNvbnN0cmFpbnRzLnZpZGVvKS5kZXZpY2VJZCEhKS5leGFjdCArIFwiJyBub3QgZm91bmRcIjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3JOYW1lID0gT3BlblZpZHVFcnJvck5hbWUuUFVCTElTSEVSX1BST1BFUlRJRVNfRVJST1I7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3JNZXNzYWdlID0gXCJWaWRlbyBpbnB1dCBkZXZpY2UgZG9lc24ndCBzdXBwb3J0IHRoZSB2YWx1ZSBwYXNzZWQgZm9yIGNvbnN0cmFpbnQgJ1wiICsgZXJyb3IuY29uc3RyYWludCArIFwiJ1wiO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3JDYWxsYmFjayhuZXcgT3BlblZpZHVFcnJvcihlcnJvck5hbWUsIGVycm9yTWVzc2FnZSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KG5ldyBPcGVuVmlkdUVycm9yKE9wZW5WaWR1RXJyb3JOYW1lLk5PX0lOUFVUX1NPVVJDRV9TRVQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJQcm9wZXJ0aWVzICdhdWRpb1NvdXJjZScgYW5kICd2aWRlb1NvdXJjZScgY2Fubm90IGJlIHNldCB0byBmYWxzZSBvciBudWxsIGF0IHRoZSBzYW1lIHRpbWUgd2hlbiBjYWxsaW5nICdPcGVuVmlkdS5pbml0UHVibGlzaGVyJ1wiKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5jYXRjaCgoZXJyb3I6IE9wZW5WaWR1RXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgZXJyb3JDYWxsYmFjayhlcnJvcik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBoaWRkZW5cbiAgICAgKi9cbiAgICB1cGRhdGVTZXNzaW9uKHNlc3Npb246IFNlc3Npb24pOiB2b2lkIHtcbiAgICAgICAgdGhpcy5zZXNzaW9uID0gc2Vzc2lvbjtcbiAgICAgICAgdGhpcy5zdHJlYW0uc2Vzc2lvbiA9IHNlc3Npb247XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGhpZGRlblxuICAgICAqL1xuICAgIGVtaXRFdmVudCh0eXBlOiBzdHJpbmcsIGV2ZW50QXJyYXk6IGFueVtdKTogdm9pZCB7XG4gICAgICAgIHRoaXMuZWUuZW1pdEV2ZW50KHR5cGUsIGV2ZW50QXJyYXkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBoaWRkZW5cbiAgICAgKi9cbiAgICByZWVzdGFibGlzaFN0cmVhbVBsYXlpbmdFdmVudCgpIHtcbiAgICAgICAgaWYgKHRoaXMuZWUuZ2V0TGlzdGVuZXJzKCdzdHJlYW1QbGF5aW5nJykubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgdGhpcy5hZGRQbGF5RXZlbnRUb0ZpcnN0VmlkZW8oKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG4gICAgLyogUHJpdmF0ZSBtZXRob2RzICovXG5cbiAgICBwcml2YXRlIHNldFBlcm1pc3Npb25EaWFsb2dUaW1lcih3YWl0VGltZTogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIHRoaXMucGVybWlzc2lvbkRpYWxvZ1RpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuZWUuZW1pdEV2ZW50KCdhY2Nlc3NEaWFsb2dPcGVuZWQnLCBbXSk7XG4gICAgICAgIH0sIHdhaXRUaW1lKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGNsZWFyUGVybWlzc2lvbkRpYWxvZ1RpbWVyKHN0YXJ0VGltZTogbnVtYmVyLCB3YWl0VGltZTogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIGNsZWFyVGltZW91dCh0aGlzLnBlcm1pc3Npb25EaWFsb2dUaW1lb3V0KTtcbiAgICAgICAgaWYgKChEYXRlLm5vdygpIC0gc3RhcnRUaW1lKSA+IHdhaXRUaW1lKSB7XG4gICAgICAgICAgICAvLyBQZXJtaXNzaW9uIGRpYWxvZyB3YXMgc2hvd24gYW5kIG5vdyBpcyBjbG9zZWRcbiAgICAgICAgICAgIHRoaXMuZWUuZW1pdEV2ZW50KCdhY2Nlc3NEaWFsb2dDbG9zZWQnLCBbXSk7XG4gICAgICAgIH1cbiAgICB9XG5cbn0iLCIvKlxuICogKEMpIENvcHlyaWdodCAyMDE3LTIwMTggT3BlblZpZHUgKGh0dHBzOi8vb3BlbnZpZHUuaW8vKVxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKlxuICovXG5cbmltcG9ydCB7IENvbm5lY3Rpb24gfSBmcm9tICcuL0Nvbm5lY3Rpb24nO1xuaW1wb3J0IHsgT3BlblZpZHUgfSBmcm9tICcuL09wZW5WaWR1JztcbmltcG9ydCB7IFB1Ymxpc2hlciB9IGZyb20gJy4vUHVibGlzaGVyJztcbmltcG9ydCB7IFN0cmVhbSB9IGZyb20gJy4vU3RyZWFtJztcbmltcG9ydCB7IFN0cmVhbU1hbmFnZXIgfSBmcm9tICcuL1N0cmVhbU1hbmFnZXInO1xuaW1wb3J0IHsgU3Vic2NyaWJlciB9IGZyb20gJy4vU3Vic2NyaWJlcic7XG5pbXBvcnQgeyBFdmVudERpc3BhdGNoZXIgfSBmcm9tICcuLi9PcGVuVmlkdUludGVybmFsL0ludGVyZmFjZXMvUHVibGljL0V2ZW50RGlzcGF0Y2hlcic7XG5pbXBvcnQgeyBTaWduYWxPcHRpb25zIH0gZnJvbSAnLi4vT3BlblZpZHVJbnRlcm5hbC9JbnRlcmZhY2VzL1B1YmxpYy9TaWduYWxPcHRpb25zJztcbmltcG9ydCB7IFN1YnNjcmliZXJQcm9wZXJ0aWVzIH0gZnJvbSAnLi4vT3BlblZpZHVJbnRlcm5hbC9JbnRlcmZhY2VzL1B1YmxpYy9TdWJzY3JpYmVyUHJvcGVydGllcyc7XG5pbXBvcnQgeyBDb25uZWN0aW9uT3B0aW9ucyB9IGZyb20gJy4uL09wZW5WaWR1SW50ZXJuYWwvSW50ZXJmYWNlcy9Qcml2YXRlL0Nvbm5lY3Rpb25PcHRpb25zJztcbmltcG9ydCB7IE9iak1hcCB9IGZyb20gJy4uL09wZW5WaWR1SW50ZXJuYWwvSW50ZXJmYWNlcy9Qcml2YXRlL09iak1hcCc7XG5pbXBvcnQgeyBTZXNzaW9uT3B0aW9ucyB9IGZyb20gJy4uL09wZW5WaWR1SW50ZXJuYWwvSW50ZXJmYWNlcy9Qcml2YXRlL1Nlc3Npb25PcHRpb25zJztcbmltcG9ydCB7IENvbm5lY3Rpb25FdmVudCB9IGZyb20gJy4uL09wZW5WaWR1SW50ZXJuYWwvRXZlbnRzL0Nvbm5lY3Rpb25FdmVudCc7XG5pbXBvcnQgeyBQdWJsaXNoZXJTcGVha2luZ0V2ZW50IH0gZnJvbSAnLi4vT3BlblZpZHVJbnRlcm5hbC9FdmVudHMvUHVibGlzaGVyU3BlYWtpbmdFdmVudCc7XG5pbXBvcnQgeyBSZWNvcmRpbmdFdmVudCB9IGZyb20gJy4uL09wZW5WaWR1SW50ZXJuYWwvRXZlbnRzL1JlY29yZGluZ0V2ZW50JztcbmltcG9ydCB7IFNlc3Npb25EaXNjb25uZWN0ZWRFdmVudCB9IGZyb20gJy4uL09wZW5WaWR1SW50ZXJuYWwvRXZlbnRzL1Nlc3Npb25EaXNjb25uZWN0ZWRFdmVudCc7XG5pbXBvcnQgeyBTaWduYWxFdmVudCB9IGZyb20gJy4uL09wZW5WaWR1SW50ZXJuYWwvRXZlbnRzL1NpZ25hbEV2ZW50JztcbmltcG9ydCB7IFN0cmVhbUV2ZW50IH0gZnJvbSAnLi4vT3BlblZpZHVJbnRlcm5hbC9FdmVudHMvU3RyZWFtRXZlbnQnO1xuaW1wb3J0IHsgT3BlblZpZHVFcnJvciwgT3BlblZpZHVFcnJvck5hbWUgfSBmcm9tICcuLi9PcGVuVmlkdUludGVybmFsL0VudW1zL09wZW5WaWR1RXJyb3InO1xuaW1wb3J0IHsgVmlkZW9JbnNlcnRNb2RlIH0gZnJvbSAnLi4vT3BlblZpZHVJbnRlcm5hbC9FbnVtcy9WaWRlb0luc2VydE1vZGUnO1xuXG5pbXBvcnQgcGxhdGZvcm0gPSByZXF1aXJlKCdwbGF0Zm9ybScpO1xuaW1wb3J0IEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ3dvbGZ5ODctZXZlbnRlbWl0dGVyJyk7XG5cblxuLyoqXG4gKiBSZXByZXNlbnRzIGEgdmlkZW8gY2FsbC4gSXQgY2FuIGFsc28gYmUgc2VlbiBhcyBhIHZpZGVvY29uZmVyZW5jZSByb29tIHdoZXJlIG11bHRpcGxlIHVzZXJzIGNhbiBjb25uZWN0LlxuICogUGFydGljaXBhbnRzIHdobyBwdWJsaXNoIHRoZWlyIHZpZGVvcyB0byBhIHNlc3Npb24gY2FuIGJlIHNlZW4gYnkgdGhlIHJlc3Qgb2YgdXNlcnMgY29ubmVjdGVkIHRvIHRoYXQgc3BlY2lmaWMgc2Vzc2lvbi5cbiAqIEluaXRpYWxpemVkIHdpdGggW1tPcGVuVmlkdS5pbml0U2Vzc2lvbl1dIG1ldGhvZFxuICovXG5leHBvcnQgY2xhc3MgU2Vzc2lvbiBpbXBsZW1lbnRzIEV2ZW50RGlzcGF0Y2hlciB7XG5cbiAgICAvKipcbiAgICAgKiBMb2NhbCBjb25uZWN0aW9uIHRvIHRoZSBTZXNzaW9uLiBUaGlzIG9iamVjdCBpcyBkZWZpbmVkIG9ubHkgYWZ0ZXIgW1tTZXNzaW9uLmNvbm5lY3RdXSBoYXMgYmVlbiBzdWNjZXNzZnVsbHkgZXhlY3V0ZWQsIGFuZCBjYW4gYmUgcmV0cmlldmVkIHN1YnNjcmliaW5nIHRvIGBjb25uZWN0aW9uQ3JlYXRlZGAgZXZlbnRcbiAgICAgKi9cbiAgICBjb25uZWN0aW9uOiBDb25uZWN0aW9uO1xuXG4gICAgLyoqXG4gICAgICogVW5pcXVlIGlkZW50aWZpZXIgb2YgdGhlIFNlc3Npb25cbiAgICAgKi9cbiAgICBzZXNzaW9uSWQ6IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIENvbGxlY3Rpb24gb2YgYWxsIFN0cmVhbU1hbmFnZXJzIG9mIHRoaXMgU2Vzc2lvbiAoW1tQdWJsaXNoZXJdXSBhbmQgW1tTdWJzY3JpYmVyXV0pXG4gICAgICovXG4gICAgc3RyZWFtTWFuYWdlcnM6IFN0cmVhbU1hbmFnZXJbXSA9IFtdO1xuXG4gICAgLy8gVGhpcyBtYXAgaXMgb25seSB1c2VkIHRvIGF2b2lkIHJhY2UgY29uZGl0aW9uIGJldHdlZW4gJ2pvaW5Sb29tJyByZXNwb25zZSBhbmQgJ29uUGFydGljaXBhbnRQdWJsaXNoZWQnIG5vdGlmaWNhdGlvblxuICAgIC8qKlxuICAgICAqIEBoaWRkZW5cbiAgICAgKi9cbiAgICByZW1vdGVTdHJlYW1zQ3JlYXRlZDogT2JqTWFwPGJvb2xlYW4+ID0ge307XG5cbiAgICAvKipcbiAgICAgKiBAaGlkZGVuXG4gICAgICovXG4gICAgcmVtb3RlQ29ubmVjdGlvbnM6IE9iak1hcDxDb25uZWN0aW9uPiA9IHt9O1xuICAgIC8qKlxuICAgICAqIEBoaWRkZW5cbiAgICAgKi9cbiAgICBvcGVudmlkdTogT3BlblZpZHU7XG4gICAgLyoqXG4gICAgICogQGhpZGRlblxuICAgICAqL1xuICAgIG9wdGlvbnM6IFNlc3Npb25PcHRpb25zO1xuICAgIC8qKlxuICAgICAqIEBoaWRkZW5cbiAgICAgKi9cbiAgICBzcGVha2luZ0V2ZW50c0VuYWJsZWQgPSBmYWxzZTtcblxuICAgIHByaXZhdGUgZWUgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG5cbiAgICAvKipcbiAgICAgKiBAaGlkZGVuXG4gICAgICovXG4gICAgY29uc3RydWN0b3Iob3BlbnZpZHU6IE9wZW5WaWR1KSB7XG4gICAgICAgIHRoaXMub3BlbnZpZHUgPSBvcGVudmlkdTtcbiAgICB9XG5cbiAgICBjb25uZWN0KHRva2VuOiBzdHJpbmcpOiBQcm9taXNlPGFueT47XG4gICAgY29ubmVjdCh0b2tlbjogc3RyaW5nLCBtZXRhZGF0YTogYW55KTogUHJvbWlzZTxhbnk+O1xuXG4gICAgLyoqXG4gICAgICogQ29ubmVjdHMgdG8gdGhlIHNlc3Npb24gdXNpbmcgYHRva2VuYC4gUGFyYW1ldGVyIGBtZXRhZGF0YWAgYWxsb3dzIHlvdSB0byBwYXNzIGV4dHJhIGRhdGEgdG8gc2hhcmUgd2l0aCBvdGhlciB1c2VycyB3aGVuXG4gICAgICogdGhleSByZWNlaXZlIGBzdHJlYW1DcmVhdGVkYCBldmVudC4gVGhlIHN0cnVjdHVyZSBvZiBgbWV0YWRhdGFgIHN0cmluZyBpcyB1cCB0byB5b3UgKG1heWJlIHNvbWUgc3RhbmRhcml6ZWQgZm9ybWF0XG4gICAgICogYXMgSlNPTiBvciBYTUwgaXMgYSBnb29kIGlkZWEpLCB0aGUgb25seSByZXN0cmljdGlvbiBpcyBhIG1heGltdW0gbGVuZ3RoIG9mIDEwMDAwIGNoYXJzLlxuICAgICAqXG4gICAgICogVGhpcyBtZXRhZGF0YSBpcyBub3QgY29uc2lkZXJlZCBzZWN1cmUsIGFzIGl0IGlzIGdlbmVyYXRlZCBpbiB0aGUgY2xpZW50IHNpZGUuIFRvIHBhc3Mgc2VjdXJpemVkIGRhdGEsIGFkZCBpdCBhcyBhIHBhcmFtZXRlciBpbiB0aGVcbiAgICAgKiB0b2tlbiBnZW5lcmF0aW9uIG9wZXJhdGlvbiAodGhyb3VnaCB0aGUgQVBJIFJFU1QsIG9wZW52aWR1LWphdmEtY2xpZW50IG9yIG9wZW52aWR1LW5vZGUtY2xpZW50KS5cbiAgICAgKlxuICAgICAqIE9ubHkgYWZ0ZXIgdGhlIHJldHVybmVkIFByb21pc2UgaXMgc3VjY2Vzc2Z1bGx5IHJlc29sdmVkIFtbU2Vzc2lvbi5jb25uZWN0aW9uXV0gb2JqZWN0IHdpbGwgYmUgYXZhaWxhYmxlIGFuZCBwcm9wZXJseSBkZWZpbmVkLlxuICAgICAqXG4gICAgICogIyMjIyBFdmVudHMgZGlzcGF0Y2hlZFxuICAgICAqXG4gICAgICogVGhlIFtbU2Vzc2lvbl1dIG9iamVjdCBvZiB0aGUgbG9jYWwgcGFydGljaXBhbnQgd2lsbCBmaXJzdCBkaXNwYXRjaCBvbmUgb3IgbW9yZSBgY29ubmVjdGlvbkNyZWF0ZWRgIGV2ZW50cyB1cG9uIHN1Y2Nlc3NmdWwgdGVybWluYXRpb24gb2YgdGhpcyBtZXRob2Q6XG4gICAgICogLSBGaXJzdCBvbmUgZm9yIHlvdXIgb3duIGxvY2FsIENvbm5lY3Rpb24gb2JqZWN0LCBzbyB5b3UgY2FuIHJldHJpZXZlIFtbU2Vzc2lvbi5jb25uZWN0aW9uXV0gcHJvcGVydHkuXG4gICAgICogLSBUaGVuIG9uZSBmb3IgZWFjaCByZW1vdGUgQ29ubmVjdGlvbiBwcmV2aW91c2x5IGNvbm5lY3RlZCB0byB0aGUgU2Vzc2lvbiwgaWYgYW55LiBBbnkgb3RoZXIgcmVtb3RlIHVzZXIgY29ubmVjdGluZyB0byB0aGUgU2Vzc2lvbiBhZnRlciB5b3UgaGF2ZVxuICAgICAqIHN1Y2Nlc3NmdWxseSBjb25uZWN0ZWQgd2lsbCBhbHNvIGRpc3BhdGNoIGEgYGNvbm5lY3Rpb25DcmVhdGVkYCBldmVudCB3aGVuIHRoZXkgZG8gc28uXG4gICAgICpcbiAgICAgKiBUaGUgW1tTZXNzaW9uXV0gb2JqZWN0IG9mIHRoZSBsb2NhbCBwYXJ0aWNpcGFudCB3aWxsIGFsc28gZGlzcGF0Y2ggYSBgc3RyZWFtQ3JlYXRlZGAgZXZlbnQgZm9yIGVhY2ggcmVtb3RlIGFjdGl2ZSBbW1B1Ymxpc2hlcl1dIHRoYXQgd2FzIGFscmVhZHkgc3RyZWFtaW5nXG4gICAgICogd2hlbiBjb25uZWN0aW5nLCBqdXN0IGFmdGVyIGRpc3BhdGNoaW5nIGFsbCByZW1vdGUgYGNvbm5lY3Rpb25DcmVhdGVkYCBldmVudHMuXG4gICAgICpcbiAgICAgKiBUaGUgW1tTZXNzaW9uXV0gb2JqZWN0IG9mIGV2ZXJ5IG90aGVyIHBhcnRpY2lwYW50IGNvbm5lY3RlZCB0byB0aGUgc2Vzc2lvbiB3aWxsIGRpc3BhdGNoIGEgYGNvbm5lY3Rpb25DcmVhdGVkYCBldmVudC5cbiAgICAgKlxuICAgICAqIFNlZSBbW0Nvbm5lY3Rpb25FdmVudF1dIGFuZCBbW1N0cmVhbUV2ZW50XV0gdG8gbGVhcm4gbW9yZS5cbiAgICAgKlxuICAgICAqIEByZXR1cm5zIEEgUHJvbWlzZSB0byB3aGljaCB5b3UgbXVzdCBzdWJzY3JpYmUgdGhhdCBpcyByZXNvbHZlZCBpZiB0aGUgdGhlIGNvbm5lY3Rpb24gdG8gdGhlIFNlc3Npb24gd2FzIHN1Y2Nlc3NmdWwgYW5kIHJlamVjdGVkIHdpdGggYW4gRXJyb3Igb2JqZWN0IGlmIG5vdFxuICAgICAqXG4gICAgICovXG4gICAgY29ubmVjdCh0b2tlbjogc3RyaW5nLCBtZXRhZGF0YT86IGFueSk6IFByb21pc2U8YW55PiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cbiAgICAgICAgICAgIHRoaXMucHJvY2Vzc1Rva2VuKHRva2VuKTtcblxuICAgICAgICAgICAgaWYgKHRoaXMub3BlbnZpZHUuY2hlY2tTeXN0ZW1SZXF1aXJlbWVudHMoKSkge1xuICAgICAgICAgICAgICAgIC8vIEVhcmx5IGNvbmZpZ3VyYXRpb24gdG8gZGVhY3RpdmF0ZSBhdXRvbWF0aWMgc3Vic2NyaXB0aW9uIHRvIHN0cmVhbXNcbiAgICAgICAgICAgICAgICB0aGlzLm9wdGlvbnMgPSB7XG4gICAgICAgICAgICAgICAgICAgIHNlc3Npb25JZDogdGhpcy5zZXNzaW9uSWQsXG4gICAgICAgICAgICAgICAgICAgIHBhcnRpY2lwYW50SWQ6IHRva2VuLFxuICAgICAgICAgICAgICAgICAgICBtZXRhZGF0YTogISFtZXRhZGF0YSA/IHRoaXMuc3RyaW5nQ2xpZW50TWV0YWRhdGEobWV0YWRhdGEpIDogJydcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHRoaXMuY29ubmVjdEF1eCh0b2tlbikudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgICAgICB9KS5jYXRjaChlcnJvciA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlamVjdChuZXcgT3BlblZpZHVFcnJvcihPcGVuVmlkdUVycm9yTmFtZS5CUk9XU0VSX05PVF9TVVBQT1JURUQsICdCcm93c2VyICcgKyBwbGF0Zm9ybS5uYW1lICsgJyAnICsgcGxhdGZvcm0udmVyc2lvbiArICcgaXMgbm90IHN1cHBvcnRlZCBpbiBPcGVuVmlkdScpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTGVhdmVzIHRoZSBzZXNzaW9uLCBkZXN0cm95aW5nIGFsbCBzdHJlYW1zIGFuZCBkZWxldGluZyB0aGUgdXNlciBhcyBhIHBhcnRpY2lwYW50LlxuICAgICAqXG4gICAgICogIyMjIyBFdmVudHMgZGlzcGF0Y2hlZFxuICAgICAqXG4gICAgICogVGhlIFtbU2Vzc2lvbl1dIG9iamVjdCBvZiB0aGUgbG9jYWwgcGFydGljaXBhbnQgd2lsbCBkaXNwYXRjaCBhIGBzZXNzaW9uRGlzY29ubmVjdGVkYCBldmVudC5cbiAgICAgKiBUaGlzIGV2ZW50IHdpbGwgYXV0b21hdGljYWxseSB1bnN1YnNjcmliZSB0aGUgbGVhdmluZyBwYXJ0aWNpcGFudCBmcm9tIGV2ZXJ5IFN1YnNjcmliZXIgb2JqZWN0IG9mIHRoZSBzZXNzaW9uICh0aGlzIGluY2x1ZGVzIGNsb3NpbmcgdGhlIFdlYlJUQ1BlZXIgY29ubmVjdGlvbiBhbmQgZGlzcG9zaW5nIGFsbCBNZWRpYVN0cmVhbVRyYWNrcylcbiAgICAgKiBhbmQgYWxzbyBkZWxldGVzIGFueSBIVE1MIHZpZGVvIGVsZW1lbnQgYXNzb2NpYXRlZCB0byBlYWNoIFN1YnNjcmliZXIgKG9ubHkgdGhvc2UgW2NyZWF0ZWQgYnkgT3BlblZpZHUgQnJvd3Nlcl0oL2RvY3MvaG93LWRvLWkvbWFuYWdlLXZpZGVvcy8jbGV0LW9wZW52aWR1LXRha2UtY2FyZS1vZi10aGUtdmlkZW8tcGxheWVycykpLlxuICAgICAqIEZvciBldmVyeSB2aWRlbyByZW1vdmVkLCBlYWNoIFN1YnNjcmliZXIgb2JqZWN0IHdpbGwgZGlzcGF0Y2ggYSBgdmlkZW9FbGVtZW50RGVzdHJveWVkYCBldmVudC5cbiAgICAgKiBDYWxsIGBldmVudC5wcmV2ZW50RGVmYXVsdCgpYCB1cHBvbiBldmVudCBgc2Vzc2lvbkRpc2Nvbm5lY3RlZGAgdG8gYXZvaWQgdGhpcyBiZWhhdmlvdXIgYW5kIHRha2UgY2FyZSBvZiBkaXNwb3NpbmcgYW5kIGNsZWFuaW5nIGFsbCB0aGUgU3Vic2NyaWJlciBvYmplY3RzIHlvdXJzZWxmLlxuICAgICAqIFNlZSBbW1Nlc3Npb25EaXNjb25uZWN0ZWRFdmVudF1dIGFuZCBbW1ZpZGVvRWxlbWVudEV2ZW50XV0gdG8gbGVhcm4gbW9yZSB0byBsZWFybiBtb3JlLlxuICAgICAqXG4gICAgICogVGhlIFtbUHVibGlzaGVyXV0gb2JqZWN0IG9mIHRoZSBsb2NhbCBwYXJ0aWNpcGFudCB3aWxsIGRpc3BhdGNoIGEgYHN0cmVhbURlc3Ryb3llZGAgZXZlbnQgaWYgdGhlcmUgaXMgYSBbW1B1Ymxpc2hlcl1dIG9iamVjdCBwdWJsaXNoaW5nIHRvIHRoZSBzZXNzaW9uLlxuICAgICAqIFRoaXMgZXZlbnQgd2lsbCBhdXRvbWF0aWNhbGx5IHN0b3AgYWxsIG1lZGlhIHRyYWNrcyBhbmQgZGVsZXRlIGFueSBIVE1MIHZpZGVvIGVsZW1lbnQgYXNzb2NpYXRlZCB0byBpdCAob25seSB0aG9zZSBbY3JlYXRlZCBieSBPcGVuVmlkdSBCcm93c2VyXSgvZG9jcy9ob3ctZG8taS9tYW5hZ2UtdmlkZW9zLyNsZXQtb3BlbnZpZHUtdGFrZS1jYXJlLW9mLXRoZS12aWRlby1wbGF5ZXJzKSkuXG4gICAgICogRm9yIGV2ZXJ5IHZpZGVvIHJlbW92ZWQsIHRoZSBQdWJsaXNoZXIgb2JqZWN0IHdpbGwgZGlzcGF0Y2ggYSBgdmlkZW9FbGVtZW50RGVzdHJveWVkYCBldmVudC5cbiAgICAgKiBDYWxsIGBldmVudC5wcmV2ZW50RGVmYXVsdCgpYCB1cHBvbiBldmVudCBgc3RyZWFtRGVzdHJveWVkYCBpZiB5b3Ugd2FudCB0byBjbGVhbiB0aGUgUHVibGlzaGVyIG9iamVjdCBvbiB5b3VyIG93biBvciByZS1wdWJsaXNoIGl0IGluIGEgZGlmZmVyZW50IFNlc3Npb24gKHRvIGRvIHNvIGl0IGlzIGEgbWFuZGF0b3J5IHJlcXVpcmVtZW50IHRvIGNhbGwgYFNlc3Npb24udW5wdWJsaXNoKClgXG4gICAgICogb3IvYW5kIGBTZXNzaW9uLmRpc2Nvbm5lY3QoKWAgaW4gdGhlIHByZXZpb3VzIHNlc3Npb24pLiBTZWUgW1tTdHJlYW1FdmVudF1dIGFuZCBbW1ZpZGVvRWxlbWVudEV2ZW50XV0gdG8gbGVhcm4gbW9yZS5cbiAgICAgKlxuICAgICAqIFRoZSBbW1Nlc3Npb25dXSBvYmplY3Qgb2YgZXZlcnkgb3RoZXIgcGFydGljaXBhbnQgY29ubmVjdGVkIHRvIHRoZSBzZXNzaW9uIHdpbGwgZGlzcGF0Y2ggYSBgc3RyZWFtRGVzdHJveWVkYCBldmVudCBpZiB0aGUgZGlzY29ubmVjdGVkIHBhcnRpY2lwYW50IHdhcyBwdWJsaXNoaW5nLlxuICAgICAqIFRoaXMgZXZlbnQgd2lsbCBhdXRvbWF0aWNhbGx5IHVuc3Vic2NyaWJlIHRoZSBTdWJzY3JpYmVyIG9iamVjdCBmcm9tIHRoZSBzZXNzaW9uICh0aGlzIGluY2x1ZGVzIGNsb3NpbmcgdGhlIFdlYlJUQ1BlZXIgY29ubmVjdGlvbiBhbmQgZGlzcG9zaW5nIGFsbCBNZWRpYVN0cmVhbVRyYWNrcylcbiAgICAgKiBhbmQgYWxzbyBkZWxldGVzIGFueSBIVE1MIHZpZGVvIGVsZW1lbnQgYXNzb2NpYXRlZCB0byB0aGF0IFN1YnNjcmliZXIgKG9ubHkgdGhvc2UgW2NyZWF0ZWQgYnkgT3BlblZpZHUgQnJvd3Nlcl0oL2RvY3MvaG93LWRvLWkvbWFuYWdlLXZpZGVvcy8jbGV0LW9wZW52aWR1LXRha2UtY2FyZS1vZi10aGUtdmlkZW8tcGxheWVycykpLlxuICAgICAqIEZvciBldmVyeSB2aWRlbyByZW1vdmVkLCB0aGUgU3Vic2NyaWJlciBvYmplY3Qgd2lsbCBkaXNwYXRjaCBhIGB2aWRlb0VsZW1lbnREZXN0cm95ZWRgIGV2ZW50LlxuICAgICAqIENhbGwgYGV2ZW50LnByZXZlbnREZWZhdWx0KClgIHVwcG9uIGV2ZW50IGBzdHJlYW1EZXN0cm95ZWRgIHRvIGF2b2lkIHRoaXMgZGVmYXVsdCBiZWhhdmlvdXIgYW5kIHRha2UgY2FyZSBvZiBkaXNwb3NpbmcgYW5kIGNsZWFuaW5nIHRoZSBTdWJzY3JpYmVyIG9iamVjdCB5b3Vyc2VsZi5cbiAgICAgKiBTZWUgW1tTdHJlYW1FdmVudF1dIGFuZCBbW1ZpZGVvRWxlbWVudEV2ZW50XV0gdG8gbGVhcm4gbW9yZS5cbiAgICAgKlxuICAgICAqIFRoZSBbW1Nlc3Npb25dXSBvYmplY3Qgb2YgZXZlcnkgb3RoZXIgcGFydGljaXBhbnQgY29ubmVjdGVkIHRvIHRoZSBzZXNzaW9uIHdpbGwgZGlzcGF0Y2ggYSBgY29ubmVjdGlvbkRlc3Ryb3llZGAgZXZlbnQgaW4gYW55IGNhc2UuIFNlZSBbW0Nvbm5lY3Rpb25FdmVudF1dIHRvIGxlYXJuIG1vcmUuXG4gICAgICovXG4gICAgZGlzY29ubmVjdCgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5sZWF2ZShmYWxzZSwgJ2Rpc2Nvbm5lY3QnKTtcbiAgICB9XG5cbiAgICBzdWJzY3JpYmUoc3RyZWFtOiBTdHJlYW0sIHRhcmdldEVsZW1lbnQ6IHN0cmluZyB8IEhUTUxFbGVtZW50KTogU3Vic2NyaWJlcjtcbiAgICBzdWJzY3JpYmUoc3RyZWFtOiBTdHJlYW0sIHRhcmdldEVsZW1lbnQ6IHN0cmluZyB8IEhUTUxFbGVtZW50LCBwcm9wZXJ0aWVzOiBTdWJzY3JpYmVyUHJvcGVydGllcyk6IFN1YnNjcmliZXI7XG4gICAgc3Vic2NyaWJlKHN0cmVhbTogU3RyZWFtLCB0YXJnZXRFbGVtZW50OiBzdHJpbmcgfCBIVE1MRWxlbWVudCwgY29tcGxldGlvbkhhbmRsZXI6IChlcnJvcjogRXJyb3IgfCB1bmRlZmluZWQpID0+IHZvaWQpOiBTdWJzY3JpYmVyO1xuICAgIHN1YnNjcmliZShzdHJlYW06IFN0cmVhbSwgdGFyZ2V0RWxlbWVudDogc3RyaW5nIHwgSFRNTEVsZW1lbnQsIHByb3BlcnRpZXM6IFN1YnNjcmliZXJQcm9wZXJ0aWVzLCBjb21wbGV0aW9uSGFuZGxlcjogKGVycm9yOiBFcnJvciB8IHVuZGVmaW5lZCkgPT4gdm9pZCk6IFN1YnNjcmliZXI7XG5cbiAgICAvKipcbiAgICAgKiBTdWJzY3JpYmVzIHRvIGEgYHN0cmVhbWAsIGFkZGluZyBhIG5ldyBIVE1MIHZpZGVvIGVsZW1lbnQgdG8gRE9NIHdpdGggYHN1YnNjcmliZXJQcm9wZXJ0aWVzYCBzZXR0aW5ncy4gVGhpcyBtZXRob2QgaXMgdXN1YWxseSBjYWxsZWQgaW4gdGhlIGNhbGxiYWNrIG9mIGBzdHJlYW1DcmVhdGVkYCBldmVudC5cbiAgICAgKlxuICAgICAqICMjIyMgRXZlbnRzIGRpc3BhdGNoZWRcbiAgICAgKlxuICAgICAqIFRoZSBbW1N1YnNjcmliZXJdXSBvYmplY3Qgd2lsbCBkaXNwYXRjaCBhIGB2aWRlb0VsZW1lbnRDcmVhdGVkYCBldmVudCBvbmNlIHRoZSBIVE1MIHZpZGVvIGVsZW1lbnQgaGFzIGJlZW4gYWRkZWQgdG8gRE9NIChvbmx5IGlmIHlvdVxuICAgICAqIFtsZXQgT3BlblZpZHUgdGFrZSBjYXJlIG9mIHRoZSB2aWRlbyBwbGF5ZXJzXSgvZG9jcy9ob3ctZG8taS9tYW5hZ2UtdmlkZW9zLyNsZXQtb3BlbnZpZHUtdGFrZS1jYXJlLW9mLXRoZS12aWRlby1wbGF5ZXJzKSkuIFNlZSBbW1ZpZGVvRWxlbWVudEV2ZW50XV0gdG8gbGVhcm4gbW9yZS5cbiAgICAgKlxuICAgICAqIFRoZSBbW1N1YnNjcmliZXJdXSBvYmplY3Qgd2lsbCBkaXNwYXRjaCBhIGBzdHJlYW1QbGF5aW5nYCBldmVudCBvbmNlIHRoZSByZW1vdGUgc3RyZWFtIHN0YXJ0cyBwbGF5aW5nLiBTZWUgW1tTdHJlYW1NYW5hZ2VyRXZlbnRdXSB0byBsZWFybiBtb3JlLlxuICAgICAqXG4gICAgICogQHBhcmFtIHN0cmVhbSBTdHJlYW0gb2JqZWN0IHRvIHN1YnNjcmliZSB0b1xuICAgICAqIEBwYXJhbSB0YXJnZXRFbGVtZW50IEhUTUwgRE9NIGVsZW1lbnQgKG9yIGl0cyBgaWRgIGF0dHJpYnV0ZSkgaW4gd2hpY2ggdGhlIHZpZGVvIGVsZW1lbnQgb2YgdGhlIFN1YnNjcmliZXIgd2lsbCBiZSBpbnNlcnRlZCAoc2VlIFtbU3Vic2NyaWJlclByb3BlcnRpZXMuaW5zZXJ0TW9kZV1dKS4gSWYgKm51bGwqIG9yICp1bmRlZmluZWQqIG5vIGRlZmF1bHQgdmlkZW8gd2lsbCBiZSBjcmVhdGVkIGZvciB0aGlzIFN1YnNjcmliZXIuXG4gICAgICogWW91IGNhbiBhbHdheXMgY2FsbCBtZXRob2QgW1tTdWJzY3JpYmVyLmFkZFZpZGVvRWxlbWVudF1dIG9yIFtbU3Vic2NyaWJlci5jcmVhdGVWaWRlb0VsZW1lbnRdXSB0byBtYW5hZ2UgdGhlIHZpZGVvIGVsZW1lbnRzIG9uIHlvdXIgb3duIChzZWUgW01hbmFnZSB2aWRlbyBwbGF5ZXJzXSgvZG9jcy9ob3ctZG8taS9tYW5hZ2UtdmlkZW9zKSBzZWN0aW9uKVxuICAgICAqIEBwYXJhbSBjb21wbGV0aW9uSGFuZGxlciBgZXJyb3JgIHBhcmFtZXRlciBpcyBudWxsIGlmIGBzdWJzY3JpYmVgIHN1Y2NlZWRzLCBhbmQgaXMgZGVmaW5lZCBpZiBpdCBmYWlscy5cbiAgICAgKi9cbiAgICBzdWJzY3JpYmUoc3RyZWFtOiBTdHJlYW0sIHRhcmdldEVsZW1lbnQ6IHN0cmluZyB8IEhUTUxFbGVtZW50LCBwYXJhbTM/OiAoKGVycm9yOiBFcnJvciB8IHVuZGVmaW5lZCkgPT4gdm9pZCkgfCBTdWJzY3JpYmVyUHJvcGVydGllcywgcGFyYW00PzogKChlcnJvcjogRXJyb3IgfCB1bmRlZmluZWQpID0+IHZvaWQpKTogU3Vic2NyaWJlciB7XG4gICAgICAgIGxldCBwcm9wZXJ0aWVzOiBTdWJzY3JpYmVyUHJvcGVydGllcyA9IHt9O1xuICAgICAgICBpZiAoISFwYXJhbTMgJiYgdHlwZW9mIHBhcmFtMyAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgcHJvcGVydGllcyA9IHtcbiAgICAgICAgICAgICAgICBpbnNlcnRNb2RlOiAodHlwZW9mIHBhcmFtMy5pbnNlcnRNb2RlICE9PSAndW5kZWZpbmVkJykgPyAoKHR5cGVvZiBwYXJhbTMuaW5zZXJ0TW9kZSA9PT0gJ3N0cmluZycpID8gVmlkZW9JbnNlcnRNb2RlW3BhcmFtMy5pbnNlcnRNb2RlXSA6IHByb3BlcnRpZXMuaW5zZXJ0TW9kZSkgOiBWaWRlb0luc2VydE1vZGUuQVBQRU5ELFxuICAgICAgICAgICAgICAgIHN1YnNjcmliZVRvQXVkaW86ICh0eXBlb2YgcGFyYW0zLnN1YnNjcmliZVRvQXVkaW8gIT09ICd1bmRlZmluZWQnKSA/IHBhcmFtMy5zdWJzY3JpYmVUb0F1ZGlvIDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzdWJzY3JpYmVUb1ZpZGVvOiAodHlwZW9mIHBhcmFtMy5zdWJzY3JpYmVUb1ZpZGVvICE9PSAndW5kZWZpbmVkJykgPyBwYXJhbTMuc3Vic2NyaWJlVG9WaWRlbyA6IHRydWVcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwcm9wZXJ0aWVzID0ge1xuICAgICAgICAgICAgICAgIGluc2VydE1vZGU6IFZpZGVvSW5zZXJ0TW9kZS5BUFBFTkQsXG4gICAgICAgICAgICAgICAgc3Vic2NyaWJlVG9BdWRpbzogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzdWJzY3JpYmVUb1ZpZGVvOiB0cnVlXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IGNvbXBsZXRpb25IYW5kbGVyOiAoZXJyb3I6IEVycm9yIHwgdW5kZWZpbmVkKSA9PiB2b2lkO1xuICAgICAgICBpZiAoISFwYXJhbTMgJiYgKHR5cGVvZiBwYXJhbTMgPT09ICdmdW5jdGlvbicpKSB7XG4gICAgICAgICAgICBjb21wbGV0aW9uSGFuZGxlciA9IHBhcmFtMztcbiAgICAgICAgfSBlbHNlIGlmICghIXBhcmFtNCkge1xuICAgICAgICAgICAgY29tcGxldGlvbkhhbmRsZXIgPSBwYXJhbTQ7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zb2xlLmluZm8oJ1N1YnNjcmliaW5nIHRvICcgKyBzdHJlYW0uY29ubmVjdGlvbi5jb25uZWN0aW9uSWQpO1xuXG4gICAgICAgIHN0cmVhbS5zdWJzY3JpYmUoKVxuICAgICAgICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuaW5mbygnU3Vic2NyaWJlZCBjb3JyZWN0bHkgdG8gJyArIHN0cmVhbS5jb25uZWN0aW9uLmNvbm5lY3Rpb25JZCk7XG4gICAgICAgICAgICAgICAgaWYgKGNvbXBsZXRpb25IYW5kbGVyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgY29tcGxldGlvbkhhbmRsZXIodW5kZWZpbmVkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmNhdGNoKGVycm9yID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoY29tcGxldGlvbkhhbmRsZXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBjb21wbGV0aW9uSGFuZGxlcihlcnJvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIGNvbnN0IHN1YnNjcmliZXIgPSBuZXcgU3Vic2NyaWJlcihzdHJlYW0sIHRhcmdldEVsZW1lbnQsIHByb3BlcnRpZXMpO1xuICAgICAgICBpZiAoISFzdWJzY3JpYmVyLnRhcmdldEVsZW1lbnQpIHtcbiAgICAgICAgICAgIHN0cmVhbS5zdHJlYW1NYW5hZ2VyLmNyZWF0ZVZpZGVvRWxlbWVudChzdWJzY3JpYmVyLnRhcmdldEVsZW1lbnQsIDxWaWRlb0luc2VydE1vZGU+cHJvcGVydGllcy5pbnNlcnRNb2RlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3Vic2NyaWJlcjtcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqIFByb21pc2lmaWVkIHZlcnNpb24gb2YgW1tTZXNzaW9uLnN1YnNjcmliZV1dXG4gICAgICovXG4gICAgc3Vic2NyaWJlQXN5bmMoc3RyZWFtOiBTdHJlYW0sIHRhcmdldEVsZW1lbnQ6IHN0cmluZyB8IEhUTUxFbGVtZW50KTogUHJvbWlzZTxTdWJzY3JpYmVyPjtcbiAgICBzdWJzY3JpYmVBc3luYyhzdHJlYW06IFN0cmVhbSwgdGFyZ2V0RWxlbWVudDogc3RyaW5nIHwgSFRNTEVsZW1lbnQsIHByb3BlcnRpZXM6IFN1YnNjcmliZXJQcm9wZXJ0aWVzKTogUHJvbWlzZTxTdWJzY3JpYmVyPjtcblxuICAgIHN1YnNjcmliZUFzeW5jKHN0cmVhbTogU3RyZWFtLCB0YXJnZXRFbGVtZW50OiBzdHJpbmcgfCBIVE1MRWxlbWVudCwgcHJvcGVydGllcz86IFN1YnNjcmliZXJQcm9wZXJ0aWVzKTogUHJvbWlzZTxTdWJzY3JpYmVyPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxTdWJzY3JpYmVyPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cbiAgICAgICAgICAgIGxldCBzdWJzY3JpYmVyOiBTdWJzY3JpYmVyO1xuXG4gICAgICAgICAgICBjb25zdCBjYWxsYmFjayA9IChlcnJvcjogRXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoISFlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoc3Vic2NyaWJlcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgaWYgKCEhcHJvcGVydGllcykge1xuICAgICAgICAgICAgICAgIHN1YnNjcmliZXIgPSB0aGlzLnN1YnNjcmliZShzdHJlYW0sIHRhcmdldEVsZW1lbnQsIHByb3BlcnRpZXMsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc3Vic2NyaWJlciA9IHRoaXMuc3Vic2NyaWJlKHN0cmVhbSwgdGFyZ2V0RWxlbWVudCwgY2FsbGJhY2spO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0pO1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICogVW5zdWJzY3JpYmVzIGZyb20gYHN1YnNjcmliZXJgLCBhdXRvbWF0aWNhbGx5IHJlbW92aW5nIGl0cyBhc3NvY2lhdGVkIEhUTUwgdmlkZW8gZWxlbWVudHMuXG4gICAgICpcbiAgICAgKiAjIyMjIEV2ZW50cyBkaXNwYXRjaGVkXG4gICAgICpcbiAgICAgKiBUaGUgW1tTdWJzY3JpYmVyXV0gb2JqZWN0IHdpbGwgZGlzcGF0Y2ggYSBgdmlkZW9FbGVtZW50RGVzdHJveWVkYCBldmVudCBmb3IgZWFjaCB2aWRlbyBhc3NvY2lhdGVkIHRvIGl0IHRoYXQgd2FzIHJlbW92ZWQgZnJvbSBET00uXG4gICAgICogT25seSB2aWRlb3MgW2NyZWF0ZWQgYnkgT3BlblZpZHUgQnJvd3Nlcl0oL2RvY3MvaG93LWRvLWkvbWFuYWdlLXZpZGVvcy8jbGV0LW9wZW52aWR1LXRha2UtY2FyZS1vZi10aGUtdmlkZW8tcGxheWVycykpIHdpbGwgYmUgYXV0b21hdGljYWxseSByZW1vdmVkXG4gICAgICpcbiAgICAgKiBTZWUgW1tWaWRlb0VsZW1lbnRFdmVudF1dIHRvIGxlYXJuIG1vcmVcbiAgICAgKi9cbiAgICB1bnN1YnNjcmliZShzdWJzY3JpYmVyOiBTdWJzY3JpYmVyKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGNvbm5lY3Rpb25JZCA9IHN1YnNjcmliZXIuc3RyZWFtLmNvbm5lY3Rpb24uY29ubmVjdGlvbklkO1xuXG4gICAgICAgIGNvbnNvbGUuaW5mbygnVW5zdWJzY3JpYmluZyBmcm9tICcgKyBjb25uZWN0aW9uSWQpO1xuXG4gICAgICAgIHRoaXMub3BlbnZpZHUuc2VuZFJlcXVlc3QoXG4gICAgICAgICAgICAndW5zdWJzY3JpYmVGcm9tVmlkZW8nLFxuICAgICAgICAgICAgeyBzZW5kZXI6IHN1YnNjcmliZXIuc3RyZWFtLmNvbm5lY3Rpb24uY29ubmVjdGlvbklkIH0sXG4gICAgICAgICAgICAoZXJyb3IsIHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHVuc3Vic2NyaWJpbmcgZnJvbSAnICsgY29ubmVjdGlvbklkLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5pbmZvKCdVbnN1YnNjcmliZWQgY29ycmVjdGx5IGZyb20gJyArIGNvbm5lY3Rpb25JZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHN1YnNjcmliZXIuc3RyZWFtLmRpc3Bvc2VXZWJSdGNQZWVyKCk7XG4gICAgICAgICAgICAgICAgc3Vic2NyaWJlci5zdHJlYW0uZGlzcG9zZU1lZGlhU3RyZWFtKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgICAgIHN1YnNjcmliZXIuc3RyZWFtLnN0cmVhbU1hbmFnZXIucmVtb3ZlQWxsVmlkZW9zKCk7XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKiBQdWJsaXNoZXMgdG8gdGhlIFNlc3Npb24gdGhlIFB1Ymxpc2hlciBvYmplY3RcbiAgICAgKlxuICAgICAqICMjIyMgRXZlbnRzIGRpc3BhdGNoZWRcbiAgICAgKlxuICAgICAqIFRoZSBsb2NhbCBbW1B1Ymxpc2hlcl1dIG9iamVjdCB3aWxsIGRpc3BhdGNoIGEgYHN0cmVhbUNyZWF0ZWRgIGV2ZW50IHVwb24gc3VjY2Vzc2Z1bCB0ZXJtaW5hdGlvbiBvZiB0aGlzIG1ldGhvZC4gU2VlIFtbU3RyZWFtRXZlbnRdXSB0byBsZWFybiBtb3JlLlxuICAgICAqXG4gICAgICogVGhlIGxvY2FsIFtbUHVibGlzaGVyXV0gb2JqZWN0IHdpbGwgZGlzcGF0Y2ggYSBgc3RyZWFtUGxheWluZ2Agb25jZSB0aGUgbWVkaWEgc3RyZWFtIHN0YXJ0cyBwbGF5aW5nLiBTZWUgW1tTdHJlYW1NYW5hZ2VyRXZlbnRdXSB0byBsZWFybiBtb3JlLlxuICAgICAqXG4gICAgICogVGhlIFtbU2Vzc2lvbl1dIG9iamVjdCBvZiBldmVyeSBvdGhlciBwYXJ0aWNpcGFudCBjb25uZWN0ZWQgdG8gdGhlIHNlc3Npb24gd2lsbCBkaXNwYXRjaCBhIGBzdHJlYW1DcmVhdGVkYCBldmVudCBzbyB0aGV5IGNhbiBzdWJzY3JpYmUgdG8gaXQuIFNlZSBbW1N0cmVhbUV2ZW50XV0gdG8gbGVhcm4gbW9yZS5cbiAgICAgKlxuICAgICAqIEByZXR1cm5zIEEgUHJvbWlzZSAodG8gd2hpY2ggeW91IGNhbiBvcHRpb25hbGx5IHN1YnNjcmliZSB0bykgdGhhdCBpcyByZXNvbHZlZCBvbmx5IGFmdGVyIHRoZSBwdWJsaXNoZXIgd2FzIHN1Y2Nlc3NmdWxseSBwdWJsaXNoZWQgYW5kIHJlamVjdGVkIHdpdGggYW4gRXJyb3Igb2JqZWN0IGlmIG5vdFxuICAgICAqL1xuICAgIHB1Ymxpc2gocHVibGlzaGVyOiBQdWJsaXNoZXIpOiBQcm9taXNlPGFueT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgcHVibGlzaGVyLnNlc3Npb24gPSB0aGlzO1xuICAgICAgICAgICAgcHVibGlzaGVyLnN0cmVhbS5zZXNzaW9uID0gdGhpcztcblxuICAgICAgICAgICAgaWYgKCFwdWJsaXNoZXIuc3RyZWFtLmlzTG9jYWxTdHJlYW1QdWJsaXNoZWQpIHtcbiAgICAgICAgICAgICAgICAvLyAnU2Vzc2lvbi51bnB1Ymxpc2goUHVibGlzaGVyKScgaGFzIE5PVCBiZWVuIGNhbGxlZFxuICAgICAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5hZGRTdHJlYW0ocHVibGlzaGVyLnN0cmVhbSk7XG4gICAgICAgICAgICAgICAgcHVibGlzaGVyLnN0cmVhbS5wdWJsaXNoKClcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAuY2F0Y2goZXJyb3IgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vICdTZXNzaW9uLnVucHVibGlzaChQdWJsaXNoZXIpJyBoYXMgYmVlbiBjYWxsZWQuIE11c3QgaW5pdGlhbGl6ZSBhZ2FpbiBQdWJsaXNoZXJcbiAgICAgICAgICAgICAgICBwdWJsaXNoZXIuaW5pdGlhbGl6ZSgpXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5hZGRTdHJlYW0ocHVibGlzaGVyLnN0cmVhbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBwdWJsaXNoZXIucmVlc3RhYmxpc2hTdHJlYW1QbGF5aW5nRXZlbnQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHB1Ymxpc2hlci5zdHJlYW0ucHVibGlzaCgpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAuY2F0Y2goZXJyb3IgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqIFVucHVibGlzaGVzIGZyb20gdGhlIFNlc3Npb24gdGhlIFB1Ymxpc2hlciBvYmplY3QuXG4gICAgICpcbiAgICAgKiAjIyMjIEV2ZW50cyBkaXNwYXRjaGVkXG4gICAgICpcbiAgICAgKiBUaGUgW1tQdWJsaXNoZXJdXSBvYmplY3Qgb2YgdGhlIGxvY2FsIHBhcnRpY2lwYW50IHdpbGwgZGlzcGF0Y2ggYSBgc3RyZWFtRGVzdHJveWVkYCBldmVudC5cbiAgICAgKiBUaGlzIGV2ZW50IHdpbGwgYXV0b21hdGljYWxseSBzdG9wIGFsbCBtZWRpYSB0cmFja3MgYW5kIGRlbGV0ZSBhbnkgSFRNTCB2aWRlbyBlbGVtZW50IGFzc29jaWF0ZWQgdG8gdGhpcyBQdWJsaXNoZXJcbiAgICAgKiAob25seSB0aG9zZSB2aWRlb3MgW2NyZWF0ZWQgYnkgT3BlblZpZHUgQnJvd3Nlcl0oL2RvY3MvaG93LWRvLWkvbWFuYWdlLXZpZGVvcy8jbGV0LW9wZW52aWR1LXRha2UtY2FyZS1vZi10aGUtdmlkZW8tcGxheWVycykpLlxuICAgICAqIEZvciBldmVyeSB2aWRlbyByZW1vdmVkLCB0aGUgUHVibGlzaGVyIG9iamVjdCB3aWxsIGRpc3BhdGNoIGEgYHZpZGVvRWxlbWVudERlc3Ryb3llZGAgZXZlbnQuXG4gICAgICogQ2FsbCBgZXZlbnQucHJldmVudERlZmF1bHQoKWAgdXBwb24gZXZlbnQgYHN0cmVhbURlc3Ryb3llZGAgaWYgeW91IHdhbnQgdG8gY2xlYW4gdGhlIFB1Ymxpc2hlciBvYmplY3Qgb24geW91ciBvd24gb3IgcmUtcHVibGlzaCBpdCBpbiBhIGRpZmZlcmVudCBTZXNzaW9uLlxuICAgICAqXG4gICAgICogVGhlIFtbU2Vzc2lvbl1dIG9iamVjdCBvZiBldmVyeSBvdGhlciBwYXJ0aWNpcGFudCBjb25uZWN0ZWQgdG8gdGhlIHNlc3Npb24gd2lsbCBkaXNwYXRjaCBhIGBzdHJlYW1EZXN0cm95ZWRgIGV2ZW50LlxuICAgICAqIFRoaXMgZXZlbnQgd2lsbCBhdXRvbWF0aWNhbGx5IHVuc3Vic2NyaWJlIHRoZSBTdWJzY3JpYmVyIG9iamVjdCBmcm9tIHRoZSBzZXNzaW9uICh0aGlzIGluY2x1ZGVzIGNsb3NpbmcgdGhlIFdlYlJUQ1BlZXIgY29ubmVjdGlvbiBhbmQgZGlzcG9zaW5nIGFsbCBNZWRpYVN0cmVhbVRyYWNrcykgYW5kXG4gICAgICogZGVsZXRlIGFueSBIVE1MIHZpZGVvIGVsZW1lbnQgYXNzb2NpYXRlZCB0byBpdCAob25seSB0aG9zZSBbY3JlYXRlZCBieSBPcGVuVmlkdSBCcm93c2VyXSgvZG9jcy9ob3ctZG8taS9tYW5hZ2UtdmlkZW9zLyNsZXQtb3BlbnZpZHUtdGFrZS1jYXJlLW9mLXRoZS12aWRlby1wbGF5ZXJzKSkuXG4gICAgICogRm9yIGV2ZXJ5IHZpZGVvIHJlbW92ZWQsIHRoZSBTdWJzY3JpYmVyIG9iamVjdCB3aWxsIGRpc3BhdGNoIGEgYHZpZGVvRWxlbWVudERlc3Ryb3llZGAgZXZlbnQuXG4gICAgICogQ2FsbCBgZXZlbnQucHJldmVudERlZmF1bHQoKWAgdXBwb24gZXZlbnQgYHN0cmVhbURlc3Ryb3llZGAgdG8gYXZvaWQgdGhpcyBkZWZhdWx0IGJlaGF2aW91ciBhbmQgdGFrZSBjYXJlIG9mIGRpc3Bvc2luZyBhbmQgY2xlYW5pbmcgdGhlIFN1YnNjcmliZXIgb2JqZWN0IG9uIHlvdXIgb3duLlxuICAgICAqXG4gICAgICogU2VlIFtbU3RyZWFtRXZlbnRdXSBhbmQgW1tWaWRlb0VsZW1lbnRFdmVudF1dIHRvIGxlYXJuIG1vcmUuXG4gICAgICovXG4gICAgdW5wdWJsaXNoKHB1Ymxpc2hlcjogUHVibGlzaGVyKTogdm9pZCB7XG5cbiAgICAgICAgY29uc3Qgc3RyZWFtID0gcHVibGlzaGVyLnN0cmVhbTtcblxuICAgICAgICBpZiAoIXN0cmVhbS5jb25uZWN0aW9uKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdUaGUgYXNzb2NpYXRlZCBDb25uZWN0aW9uIG9iamVjdCBvZiB0aGlzIFB1Ymxpc2hlciBpcyBudWxsJywgc3RyZWFtKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfSBlbHNlIGlmIChzdHJlYW0uY29ubmVjdGlvbiAhPT0gdGhpcy5jb25uZWN0aW9uKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdUaGUgYXNzb2NpYXRlZCBDb25uZWN0aW9uIG9iamVjdCBvZiB0aGlzIFB1Ymxpc2hlciBpcyBub3QgeW91ciBsb2NhbCBDb25uZWN0aW9uLicgK1xuICAgICAgICAgICAgICAgIFwiT25seSBtb2RlcmF0b3JzIGNhbiBmb3JjZSB1bnB1Ymxpc2ggb24gcmVtb3RlIFN0cmVhbXMgdmlhICdmb3JjZVVucHVibGlzaCcgbWV0aG9kXCIsIHN0cmVhbSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICAgIGNvbnNvbGUuaW5mbygnVW5wdWJsaXNoaW5nIGxvY2FsIG1lZGlhICgnICsgc3RyZWFtLmNvbm5lY3Rpb24uY29ubmVjdGlvbklkICsgJyknKTtcblxuICAgICAgICAgICAgdGhpcy5vcGVudmlkdS5zZW5kUmVxdWVzdCgndW5wdWJsaXNoVmlkZW8nLCAoZXJyb3IsIHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuaW5mbygnTWVkaWEgdW5wdWJsaXNoZWQgY29ycmVjdGx5Jyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHN0cmVhbS5kaXNwb3NlV2ViUnRjUGVlcigpO1xuICAgICAgICAgICAgZGVsZXRlIHN0cmVhbS5jb25uZWN0aW9uLnN0cmVhbTtcblxuICAgICAgICAgICAgY29uc3Qgc3RyZWFtRXZlbnQgPSBuZXcgU3RyZWFtRXZlbnQodHJ1ZSwgcHVibGlzaGVyLCAnc3RyZWFtRGVzdHJveWVkJywgcHVibGlzaGVyLnN0cmVhbSwgJ3VucHVibGlzaCcpO1xuICAgICAgICAgICAgcHVibGlzaGVyLmVtaXRFdmVudCgnc3RyZWFtRGVzdHJveWVkJywgW3N0cmVhbUV2ZW50XSk7XG4gICAgICAgICAgICBzdHJlYW1FdmVudC5jYWxsRGVmYXVsdEJlaGF2aW91cigpO1xuICAgICAgICB9XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKiBTZW5kcyBvbmUgc2lnbmFsLiBgc2lnbmFsYCBvYmplY3QgaGFzIHRoZSBmb2xsb3dpbmcgb3B0aW9uYWwgcHJvcGVydGllczpcbiAgICAgKiBgYGBqc29uXG4gICAgICoge2RhdGE6c3RyaW5nLCB0bzpDb25uZWN0aW9uW10sIHR5cGU6c3RyaW5nfVxuICAgICAqIGBgYFxuICAgICAqIEFsbCB1c2VycyBzdWJzY3JpYmVkIHRvIHRoYXQgc2lnbmFsIChgc2Vzc2lvbi5vbignc2lnbmFsOnR5cGUnLCAuLi4pYCBvciBgc2Vzc2lvbi5vbignc2lnbmFsJywgLi4uKWAgZm9yIGFsbCBzaWduYWxzKSBhbmQgd2hvc2UgQ29ubmVjdGlvbiBvYmplY3RzIGFyZSBpbiBgdG9gIGFycmF5IHdpbGwgcmVjZWl2ZSBpdC4gVGhlaXIgbG9jYWxcbiAgICAgKiBTZXNzaW9uIG9iamVjdHMgd2lsbCBkaXNwYXRjaCBhIGBzaWduYWxgIG9yIGBzaWduYWw6dHlwZWAgZXZlbnQuIFNlZSBbW1NpZ25hbEV2ZW50XV0gdG8gbGVhcm4gbW9yZS5cbiAgICAgKlxuICAgICAqIEByZXR1cm5zIEEgUHJvbWlzZSAodG8gd2hpY2ggeW91IGNhbiBvcHRpb25hbGx5IHN1YnNjcmliZSB0bykgdGhhdCBpcyByZXNvbHZlZCBpZiB0aGUgbWVzc2FnZSBzdWNjZXNzZnVsbHkgcmVhY2hlZCBvcGVudmlkdS1zZXJ2ZXIgYW5kIHJlamVjdGVkIHdpdGggYW4gRXJyb3Igb2JqZWN0IGlmIG5vdC4gX1RoaXMgZG9lc24ndFxuICAgICAqIG1lYW4gdGhhdCBvcGVudmlkdS1zZXJ2ZXIgY291bGQgcmVzZW5kIHRoZSBtZXNzYWdlIHRvIGFsbCB0aGUgbGlzdGVkIHJlY2VpdmVycy5fXG4gICAgICovXG4gICAgLyogdHNsaW50OmRpc2FibGU6bm8tc3RyaW5nLWxpdGVyYWwgKi9cbiAgICBzaWduYWwoc2lnbmFsOiBTaWduYWxPcHRpb25zKTogUHJvbWlzZTxhbnk+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcblxuICAgICAgICAgICAgY29uc3Qgc2lnbmFsTWVzc2FnZSA9IHt9O1xuXG4gICAgICAgICAgICBpZiAoc2lnbmFsLnRvICYmIHNpZ25hbC50by5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY29ubmVjdGlvbklkczogc3RyaW5nW10gPSBbXTtcblxuICAgICAgICAgICAgICAgIHNpZ25hbC50by5mb3JFYWNoKGNvbm5lY3Rpb24gPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25uZWN0aW9uSWRzLnB1c2goY29ubmVjdGlvbi5jb25uZWN0aW9uSWQpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHNpZ25hbE1lc3NhZ2VbJ3RvJ10gPSBjb25uZWN0aW9uSWRzO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzaWduYWxNZXNzYWdlWyd0byddID0gW107XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNpZ25hbE1lc3NhZ2VbJ2RhdGEnXSA9IHNpZ25hbC5kYXRhID8gc2lnbmFsLmRhdGEgOiAnJztcbiAgICAgICAgICAgIHNpZ25hbE1lc3NhZ2VbJ3R5cGUnXSA9IHNpZ25hbC50eXBlID8gc2lnbmFsLnR5cGUgOiAnJztcblxuICAgICAgICAgICAgdGhpcy5vcGVudmlkdS5zZW5kUmVxdWVzdCgnc2VuZE1lc3NhZ2UnLCB7XG4gICAgICAgICAgICAgICAgbWVzc2FnZTogSlNPTi5zdHJpbmdpZnkoc2lnbmFsTWVzc2FnZSlcbiAgICAgICAgICAgIH0sIChlcnJvciwgcmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoISFlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIC8qIHRzbGludDplbmFibGU6bm8tc3RyaW5nLWxpdGVyYWwgKi9cblxuXG4gICAgLyoqXG4gICAgICogU2VlIFtbRXZlbnREaXNwYXRjaGVyLm9uXV1cbiAgICAgKi9cbiAgICBvbih0eXBlOiBzdHJpbmcsIGhhbmRsZXI6IChldmVudDogU2Vzc2lvbkRpc2Nvbm5lY3RlZEV2ZW50IHwgU2lnbmFsRXZlbnQgfCBTdHJlYW1FdmVudCB8IENvbm5lY3Rpb25FdmVudCB8IFB1Ymxpc2hlclNwZWFraW5nRXZlbnQgfCBSZWNvcmRpbmdFdmVudCkgPT4gdm9pZCk6IEV2ZW50RGlzcGF0Y2hlciB7XG5cbiAgICAgICAgdGhpcy5lZS5vbih0eXBlLCBldmVudCA9PiB7XG4gICAgICAgICAgICBpZiAoZXZlbnQpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmluZm8oXCJFdmVudCAnXCIgKyB0eXBlICsgXCInIHRyaWdnZXJlZCBieSAnU2Vzc2lvbidcIiwgZXZlbnQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmluZm8oXCJFdmVudCAnXCIgKyB0eXBlICsgXCInIHRyaWdnZXJlZCBieSAnU2Vzc2lvbidcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBoYW5kbGVyKGV2ZW50KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKHR5cGUgPT09ICdwdWJsaXNoZXJTdGFydFNwZWFraW5nJyB8fCB0eXBlID09PSAncHVibGlzaGVyU3RvcFNwZWFraW5nJykge1xuICAgICAgICAgICAgdGhpcy5zcGVha2luZ0V2ZW50c0VuYWJsZWQgPSB0cnVlO1xuICAgICAgICAgICAgLy8gSWYgdGhlcmUgYXJlIGFscmVhZHkgYXZhaWxhYmxlIHJlbW90ZSBzdHJlYW1zLCBlbmFibGUgaGFyayAnc3BlYWtpbmcnIGV2ZW50IGluIGFsbCBvZiB0aGVtXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGNvbm5lY3Rpb25JZCBpbiB0aGlzLnJlbW90ZUNvbm5lY3Rpb25zKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3RyID0gdGhpcy5yZW1vdGVDb25uZWN0aW9uc1tjb25uZWN0aW9uSWRdLnN0cmVhbTtcbiAgICAgICAgICAgICAgICBpZiAoISFzdHIgJiYgIXN0ci5zcGVlY2hFdmVudCAmJiBzdHIuaGFzQXVkaW8pIHtcbiAgICAgICAgICAgICAgICAgICAgc3RyLmVuYWJsZVNwZWFraW5nRXZlbnRzKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKiBTZWUgW1tFdmVudERpc3BhdGNoZXIub25jZV1dXG4gICAgICovXG4gICAgb25jZSh0eXBlOiBzdHJpbmcsIGhhbmRsZXI6IChldmVudDogU2Vzc2lvbkRpc2Nvbm5lY3RlZEV2ZW50IHwgU2lnbmFsRXZlbnQgfCBTdHJlYW1FdmVudCB8IENvbm5lY3Rpb25FdmVudCB8IFB1Ymxpc2hlclNwZWFraW5nRXZlbnQgfCBSZWNvcmRpbmdFdmVudCkgPT4gdm9pZCk6IFNlc3Npb24ge1xuICAgICAgICB0aGlzLmVlLm9uY2UodHlwZSwgZXZlbnQgPT4ge1xuICAgICAgICAgICAgaWYgKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5pbmZvKFwiRXZlbnQgJ1wiICsgdHlwZSArIFwiJyB0cmlnZ2VyZWQgYnkgJ1Nlc3Npb24nXCIsIGV2ZW50KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5pbmZvKFwiRXZlbnQgJ1wiICsgdHlwZSArIFwiJyB0cmlnZ2VyZWQgYnkgJ1Nlc3Npb24nXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaGFuZGxlcihldmVudCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICh0eXBlID09PSAncHVibGlzaGVyU3RhcnRTcGVha2luZycgfHwgdHlwZSA9PT0gJ3B1Ymxpc2hlclN0b3BTcGVha2luZycpIHtcbiAgICAgICAgICAgIHRoaXMuc3BlYWtpbmdFdmVudHNFbmFibGVkID0gdHJ1ZTtcblxuICAgICAgICAgICAgLy8gSWYgdGhlcmUgYXJlIGFscmVhZHkgYXZhaWxhYmxlIHJlbW90ZSBzdHJlYW1zLCBlbmFibGUgaGFyayBpbiBhbGwgb2YgdGhlbVxuICAgICAgICAgICAgZm9yIChjb25zdCBjb25uZWN0aW9uSWQgaW4gdGhpcy5yZW1vdGVDb25uZWN0aW9ucykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHN0ciA9IHRoaXMucmVtb3RlQ29ubmVjdGlvbnNbY29ubmVjdGlvbklkXS5zdHJlYW07XG4gICAgICAgICAgICAgICAgaWYgKCEhc3RyICYmICFzdHIuc3BlZWNoRXZlbnQgJiYgc3RyLmhhc0F1ZGlvKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0ci5lbmFibGVPbmNlU3BlYWtpbmdFdmVudHMoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqIFNlZSBbW0V2ZW50RGlzcGF0Y2hlci5vZmZdXVxuICAgICAqL1xuICAgIG9mZih0eXBlOiBzdHJpbmcsIGhhbmRsZXI/OiAoZXZlbnQ6IFNlc3Npb25EaXNjb25uZWN0ZWRFdmVudCB8IFNpZ25hbEV2ZW50IHwgU3RyZWFtRXZlbnQgfCBDb25uZWN0aW9uRXZlbnQgfCBQdWJsaXNoZXJTcGVha2luZ0V2ZW50IHwgUmVjb3JkaW5nRXZlbnQpID0+IHZvaWQpOiBTZXNzaW9uIHtcblxuICAgICAgICBpZiAoIWhhbmRsZXIpIHtcbiAgICAgICAgICAgIHRoaXMuZWUucmVtb3ZlQWxsTGlzdGVuZXJzKHR5cGUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5lZS5vZmYodHlwZSwgaGFuZGxlcik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZSA9PT0gJ3B1Ymxpc2hlclN0YXJ0U3BlYWtpbmcnIHx8IHR5cGUgPT09ICdwdWJsaXNoZXJTdG9wU3BlYWtpbmcnKSB7XG4gICAgICAgICAgICB0aGlzLnNwZWFraW5nRXZlbnRzRW5hYmxlZCA9IGZhbHNlO1xuXG4gICAgICAgICAgICAvLyBJZiB0aGVyZSBhcmUgYWxyZWFkeSBhdmFpbGFibGUgcmVtb3RlIHN0cmVhbXMsIGRpc2FibGFlIGhhcmsgaW4gYWxsIG9mIHRoZW1cbiAgICAgICAgICAgIGZvciAoY29uc3QgY29ubmVjdGlvbklkIGluIHRoaXMucmVtb3RlQ29ubmVjdGlvbnMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzdHIgPSB0aGlzLnJlbW90ZUNvbm5lY3Rpb25zW2Nvbm5lY3Rpb25JZF0uc3RyZWFtO1xuICAgICAgICAgICAgICAgIGlmICghIXN0ciAmJiAhIXN0ci5zcGVlY2hFdmVudCkge1xuICAgICAgICAgICAgICAgICAgICBzdHIuZGlzYWJsZVNwZWFraW5nRXZlbnRzKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuXG4gICAgLyogSGlkZGVuIG1ldGhvZHMgKi9cblxuICAgIC8qKlxuICAgICAqIEBoaWRkZW5cbiAgICAgKi9cbiAgICBvblBhcnRpY2lwYW50Sm9pbmVkKHJlc3BvbnNlOiBDb25uZWN0aW9uT3B0aW9ucyk6IHZvaWQge1xuICAgICAgICAvLyBDb25uZWN0aW9uIHNob3VsZG4ndCBleGlzdFxuICAgICAgICB0aGlzLmdldENvbm5lY3Rpb24ocmVzcG9uc2UuaWQsICcnKVxuXG4gICAgICAgICAgICAudGhlbihjb25uZWN0aW9uID0+IHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ0Nvbm5lY3Rpb24gJyArIHJlc3BvbnNlLmlkICsgJyBhbHJlYWR5IGV4aXN0cyBpbiBjb25uZWN0aW9ucyBsaXN0Jyk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmNhdGNoKG9wZW5WaWR1RXJyb3IgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbm5lY3Rpb24gPSBuZXcgQ29ubmVjdGlvbih0aGlzLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgdGhpcy5yZW1vdGVDb25uZWN0aW9uc1tyZXNwb25zZS5pZF0gPSBjb25uZWN0aW9uO1xuICAgICAgICAgICAgICAgIHRoaXMuZWUuZW1pdEV2ZW50KCdjb25uZWN0aW9uQ3JlYXRlZCcsIFtuZXcgQ29ubmVjdGlvbkV2ZW50KGZhbHNlLCB0aGlzLCAnY29ubmVjdGlvbkNyZWF0ZWQnLCBjb25uZWN0aW9uLCAnJyldKTtcbiAgICAgICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBoaWRkZW5cbiAgICAgKi9cbiAgICBvblBhcnRpY2lwYW50TGVmdChtc2cpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5nZXRSZW1vdGVDb25uZWN0aW9uKG1zZy5uYW1lLCAnUmVtb3RlIGNvbm5lY3Rpb24gJyArIG1zZy5uYW1lICsgXCIgdW5rbm93biB3aGVuICdvblBhcnRpY2lwYW50TGVmdCcuIFwiICtcbiAgICAgICAgICAgICdFeGlzdGluZyByZW1vdGUgY29ubmVjdGlvbnM6ICcgKyBKU09OLnN0cmluZ2lmeShPYmplY3Qua2V5cyh0aGlzLnJlbW90ZUNvbm5lY3Rpb25zKSkpXG5cbiAgICAgICAgICAgIC50aGVuKGNvbm5lY3Rpb24gPT4ge1xuICAgICAgICAgICAgICAgIGlmICghIWNvbm5lY3Rpb24uc3RyZWFtKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0cmVhbSA9IGNvbm5lY3Rpb24uc3RyZWFtO1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0cmVhbUV2ZW50ID0gbmV3IFN0cmVhbUV2ZW50KHRydWUsIHRoaXMsICdzdHJlYW1EZXN0cm95ZWQnLCBzdHJlYW0sIG1zZy5yZWFzb24pO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmVlLmVtaXRFdmVudCgnc3RyZWFtRGVzdHJveWVkJywgW3N0cmVhbUV2ZW50XSk7XG4gICAgICAgICAgICAgICAgICAgIHN0cmVhbUV2ZW50LmNhbGxEZWZhdWx0QmVoYXZpb3VyKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMucmVtb3RlU3RyZWFtc0NyZWF0ZWRbc3RyZWFtLnN0cmVhbUlkXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMucmVtb3RlQ29ubmVjdGlvbnNbY29ubmVjdGlvbi5jb25uZWN0aW9uSWRdO1xuICAgICAgICAgICAgICAgIHRoaXMuZWUuZW1pdEV2ZW50KCdjb25uZWN0aW9uRGVzdHJveWVkJywgW25ldyBDb25uZWN0aW9uRXZlbnQoZmFsc2UsIHRoaXMsICdjb25uZWN0aW9uRGVzdHJveWVkJywgY29ubmVjdGlvbiwgbXNnLnJlYXNvbildKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuY2F0Y2gob3BlblZpZHVFcnJvciA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihvcGVuVmlkdUVycm9yKTtcbiAgICAgICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBoaWRkZW5cbiAgICAgKi9cbiAgICBvblBhcnRpY2lwYW50UHVibGlzaGVkKHJlc3BvbnNlOiBDb25uZWN0aW9uT3B0aW9ucyk6IHZvaWQge1xuXG4gICAgICAgIGNvbnN0IGFmdGVyQ29ubmVjdGlvbkZvdW5kID0gKGNvbm5lY3Rpb24pID0+IHtcbiAgICAgICAgICAgIHRoaXMucmVtb3RlQ29ubmVjdGlvbnNbY29ubmVjdGlvbi5jb25uZWN0aW9uSWRdID0gY29ubmVjdGlvbjtcblxuICAgICAgICAgICAgaWYgKCF0aGlzLnJlbW90ZVN0cmVhbXNDcmVhdGVkW2Nvbm5lY3Rpb24uc3RyZWFtLnN0cmVhbUlkXSkge1xuICAgICAgICAgICAgICAgIC8vIEF2b2lkIHJhY2UgY29uZGl0aW9uIGJldHdlZW4gc3RyZWFtLnN1YnNjcmliZSgpIGluIFwib25QYXJ0aWNpcGFudFB1Ymxpc2hlZFwiIGFuZCBpbiBcImpvaW5Sb29tXCIgcnBjIGNhbGxiYWNrXG4gICAgICAgICAgICAgICAgLy8gVGhpcyBjb25kaXRpb24gaXMgZmFsc2UgaWYgb3BlbnZpZHUtc2VydmVyIHNlbmRzIFwicGFydGljaXBhbnRQdWJsaXNoZWRcIiBldmVudCB0byBhIHN1YnNjcmliZXIgcGFydGljaXBhbnQgdGhhdCBoYXNcbiAgICAgICAgICAgICAgICAvLyBhbHJlYWR5IHN1YnNjcmliZWQgdG8gY2VydGFpbiBzdHJlYW0gaW4gdGhlIGNhbGxiYWNrIG9mIFwiam9pblJvb21cIiBtZXRob2RcblxuICAgICAgICAgICAgICAgIHRoaXMuZWUuZW1pdEV2ZW50KCdzdHJlYW1DcmVhdGVkJywgW25ldyBTdHJlYW1FdmVudChmYWxzZSwgdGhpcywgJ3N0cmVhbUNyZWF0ZWQnLCBjb25uZWN0aW9uLnN0cmVhbSwgJycpXSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMucmVtb3RlU3RyZWFtc0NyZWF0ZWRbY29ubmVjdGlvbi5zdHJlYW0uc3RyZWFtSWRdID0gdHJ1ZTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBHZXQgdGhlIGV4aXN0aW5nIENvbm5lY3Rpb24gY3JlYXRlZCBvbiAnb25QYXJ0aWNpcGFudEpvaW5lZCcgZm9yXG4gICAgICAgIC8vIGV4aXN0aW5nIHBhcnRpY2lwYW50cyBvciBjcmVhdGUgYSBuZXcgb25lIGZvciBuZXcgcGFydGljaXBhbnRzXG4gICAgICAgIGxldCBjb25uZWN0aW9uOiBDb25uZWN0aW9uO1xuICAgICAgICB0aGlzLmdldFJlbW90ZUNvbm5lY3Rpb24ocmVzcG9uc2UuaWQsIFwiUmVtb3RlIGNvbm5lY3Rpb24gJ1wiICsgcmVzcG9uc2UuaWQgKyBcIicgdW5rbm93biB3aGVuICdvblBhcnRpY2lwYW50UHVibGlzaGVkJy4gXCIgK1xuICAgICAgICAgICAgJ0V4aXN0aW5nIHJlbW90ZSBjb25uZWN0aW9uczogJyArIEpTT04uc3RyaW5naWZ5KE9iamVjdC5rZXlzKHRoaXMucmVtb3RlQ29ubmVjdGlvbnMpKSlcblxuICAgICAgICAgICAgLnRoZW4oY29uID0+IHtcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgZXhpc3RpbmcgQ29ubmVjdGlvblxuICAgICAgICAgICAgICAgIGNvbm5lY3Rpb24gPSBjb247XG4gICAgICAgICAgICAgICAgcmVzcG9uc2UubWV0YWRhdGEgPSBjb24uZGF0YTtcbiAgICAgICAgICAgICAgICBjb25uZWN0aW9uLm9wdGlvbnMgPSByZXNwb25zZTtcbiAgICAgICAgICAgICAgICBjb25uZWN0aW9uLmluaXRSZW1vdGVTdHJlYW1zKHJlc3BvbnNlLnN0cmVhbXMpO1xuICAgICAgICAgICAgICAgIGFmdGVyQ29ubmVjdGlvbkZvdW5kKGNvbm5lY3Rpb24pO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5jYXRjaChvcGVuVmlkdUVycm9yID0+IHtcbiAgICAgICAgICAgICAgICAvLyBDcmVhdGUgbmV3IENvbm5lY3Rpb25cbiAgICAgICAgICAgICAgICBjb25uZWN0aW9uID0gbmV3IENvbm5lY3Rpb24odGhpcywgcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIGFmdGVyQ29ubmVjdGlvbkZvdW5kKGNvbm5lY3Rpb24pO1xuICAgICAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGhpZGRlblxuICAgICAqL1xuICAgIG9uUGFydGljaXBhbnRVbnB1Ymxpc2hlZChtc2cpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5nZXRSZW1vdGVDb25uZWN0aW9uKG1zZy5uYW1lLCBcIlJlbW90ZSBjb25uZWN0aW9uICdcIiArIG1zZy5uYW1lICsgXCInIHVua25vd24gd2hlbiAnb25QYXJ0aWNpcGFudFVucHVibGlzaGVkJy4gXCIgK1xuICAgICAgICAgICAgJ0V4aXN0aW5nIHJlbW90ZSBjb25uZWN0aW9uczogJyArIEpTT04uc3RyaW5naWZ5KE9iamVjdC5rZXlzKHRoaXMucmVtb3RlQ29ubmVjdGlvbnMpKSlcblxuICAgICAgICAgICAgLnRoZW4oY29ubmVjdGlvbiA9PiB7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBzdHJlYW1FdmVudCA9IG5ldyBTdHJlYW1FdmVudCh0cnVlLCB0aGlzLCAnc3RyZWFtRGVzdHJveWVkJywgY29ubmVjdGlvbi5zdHJlYW0sIG1zZy5yZWFzb24pO1xuICAgICAgICAgICAgICAgIHRoaXMuZWUuZW1pdEV2ZW50KCdzdHJlYW1EZXN0cm95ZWQnLCBbc3RyZWFtRXZlbnRdKTtcbiAgICAgICAgICAgICAgICBzdHJlYW1FdmVudC5jYWxsRGVmYXVsdEJlaGF2aW91cigpO1xuXG4gICAgICAgICAgICAgICAgLy8gRGVsZXRpbmcgdGhlIHJlbW90ZSBzdHJlYW1cbiAgICAgICAgICAgICAgICBjb25zdCBzdHJlYW1JZDogc3RyaW5nID0gY29ubmVjdGlvbi5zdHJlYW0uc3RyZWFtSWQ7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMucmVtb3RlU3RyZWFtc0NyZWF0ZWRbc3RyZWFtSWRdO1xuICAgICAgICAgICAgICAgIGNvbm5lY3Rpb24ucmVtb3ZlU3RyZWFtKHN0cmVhbUlkKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuY2F0Y2gob3BlblZpZHVFcnJvciA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihvcGVuVmlkdUVycm9yKTtcbiAgICAgICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBoaWRkZW5cbiAgICAgKi9cbiAgICBvblBhcnRpY2lwYW50RXZpY3RlZChtc2cpOiB2b2lkIHtcbiAgICAgICAgLyp0aGlzLmdldFJlbW90ZUNvbm5lY3Rpb24obXNnLm5hbWUsICdSZW1vdGUgY29ubmVjdGlvbiAnICsgbXNnLm5hbWUgKyBcIiB1bmtub3duIHdoZW4gJ29uUGFydGljaXBhbnRMZWZ0Jy4gXCIgK1xuICAgICAgICAgICAgJ0V4aXN0aW5nIHJlbW90ZSBjb25uZWN0aW9uczogJyArIEpTT04uc3RyaW5naWZ5KE9iamVjdC5rZXlzKHRoaXMucmVtb3RlQ29ubmVjdGlvbnMpKSlcblxuICAgICAgICAgICAgLnRoZW4oY29ubmVjdGlvbiA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCEhY29ubmVjdGlvbi5zdHJlYW0pIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3RyZWFtID0gY29ubmVjdGlvbi5zdHJlYW07XG5cbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3RyZWFtRXZlbnQgPSBuZXcgU3RyZWFtRXZlbnQodHJ1ZSwgdGhpcywgJ3N0cmVhbURlc3Ryb3llZCcsIHN0cmVhbSwgJ2ZvcmNlRGlzY29ubmVjdCcpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmVlLmVtaXRFdmVudCgnc3RyZWFtRGVzdHJveWVkJywgW3N0cmVhbUV2ZW50XSk7XG4gICAgICAgICAgICAgICAgICAgIHN0cmVhbUV2ZW50LmNhbGxEZWZhdWx0QmVoYXZpb3VyKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMucmVtb3RlU3RyZWFtc0NyZWF0ZWRbc3RyZWFtLnN0cmVhbUlkXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29ubmVjdGlvbi5kaXNwb3NlKCk7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMucmVtb3RlQ29ubmVjdGlvbnNbY29ubmVjdGlvbi5jb25uZWN0aW9uSWRdO1xuICAgICAgICAgICAgICAgIHRoaXMuZWUuZW1pdEV2ZW50KCdjb25uZWN0aW9uRGVzdHJveWVkJywgW25ldyBDb25uZWN0aW9uRXZlbnQoZmFsc2UsIHRoaXMsICdjb25uZWN0aW9uRGVzdHJveWVkJywgY29ubmVjdGlvbiwgJ2ZvcmNlRGlzY29ubmVjdCcpXSk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmNhdGNoKG9wZW5WaWR1RXJyb3IgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3Iob3BlblZpZHVFcnJvcik7XG4gICAgICAgICAgICB9KTsqL1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBoaWRkZW5cbiAgICAgKi9cbiAgICBvbk5ld01lc3NhZ2UobXNnKTogdm9pZCB7XG5cbiAgICAgICAgY29uc29sZS5pbmZvKCdOZXcgc2lnbmFsOiAnICsgSlNPTi5zdHJpbmdpZnkobXNnKSk7XG5cbiAgICAgICAgdGhpcy5nZXRDb25uZWN0aW9uKG1zZy5mcm9tLCBcIkNvbm5lY3Rpb24gJ1wiICsgbXNnLmZyb20gKyBcIicgdW5rbm93IHdoZW4gJ29uTmV3TWVzc2FnZScuIEV4aXN0aW5nIHJlbW90ZSBjb25uZWN0aW9uczogXCJcbiAgICAgICAgICAgICsgSlNPTi5zdHJpbmdpZnkoT2JqZWN0LmtleXModGhpcy5yZW1vdGVDb25uZWN0aW9ucykpICsgJy4gRXhpc3RpbmcgbG9jYWwgY29ubmVjdGlvbjogJyArIHRoaXMuY29ubmVjdGlvbi5jb25uZWN0aW9uSWQpXG5cbiAgICAgICAgICAgIC50aGVuKGNvbm5lY3Rpb24gPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuZWUuZW1pdEV2ZW50KCdzaWduYWwnLCBbbmV3IFNpZ25hbEV2ZW50KHRoaXMsIG1zZy50eXBlLCBtc2cuZGF0YSwgY29ubmVjdGlvbildKTtcbiAgICAgICAgICAgICAgICB0aGlzLmVlLmVtaXRFdmVudCgnc2lnbmFsOicgKyBtc2cudHlwZSwgW25ldyBTaWduYWxFdmVudCh0aGlzLCBtc2cudHlwZSwgbXNnLmRhdGEsIGNvbm5lY3Rpb24pXSk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmNhdGNoKG9wZW5WaWR1RXJyb3IgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3Iob3BlblZpZHVFcnJvcik7XG4gICAgICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAaGlkZGVuXG4gICAgICovXG4gICAgcmVjdkljZUNhbmRpZGF0ZShtc2cpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgY2FuZGlkYXRlID0ge1xuICAgICAgICAgICAgY2FuZGlkYXRlOiBtc2cuY2FuZGlkYXRlLFxuICAgICAgICAgICAgc2RwTWlkOiBtc2cuc2RwTWlkLFxuICAgICAgICAgICAgc2RwTUxpbmVJbmRleDogbXNnLnNkcE1MaW5lSW5kZXgsXG4gICAgICAgICAgICB0b0pTT046ICgpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBjYW5kaWRhdGU6IG1zZy5jYW5kaWRhdGUgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5nZXRDb25uZWN0aW9uKG1zZy5lbmRwb2ludE5hbWUsICdDb25uZWN0aW9uIG5vdCBmb3VuZCBmb3IgZW5kcG9pbnQgJyArIG1zZy5lbmRwb2ludE5hbWUgKyAnLiBJY2UgY2FuZGlkYXRlIHdpbGwgYmUgaWdub3JlZDogJyArIGNhbmRpZGF0ZSlcbiAgICAgICAgICAgIC50aGVuKGNvbm5lY3Rpb24gPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHN0cmVhbSA9IGNvbm5lY3Rpb24uc3RyZWFtO1xuICAgICAgICAgICAgICAgIHN0cmVhbS5nZXRXZWJSdGNQZWVyKCkuYWRkSWNlQ2FuZGlkYXRlKGNhbmRpZGF0ZSkuY2F0Y2goZXJyb3IgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBhZGRpbmcgY2FuZGlkYXRlIGZvciAnICsgc3RyZWFtLnN0cmVhbUlkXG4gICAgICAgICAgICAgICAgICAgICAgICArICcgc3RyZWFtIG9mIGVuZHBvaW50ICcgKyBtc2cuZW5kcG9pbnROYW1lICsgJzogJyArIGVycm9yKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuY2F0Y2gob3BlblZpZHVFcnJvciA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihvcGVuVmlkdUVycm9yKTtcbiAgICAgICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBoaWRkZW5cbiAgICAgKi9cbiAgICBvblNlc3Npb25DbG9zZWQobXNnKTogdm9pZCB7XG4gICAgICAgIGNvbnNvbGUuaW5mbygnU2Vzc2lvbiBjbG9zZWQ6ICcgKyBKU09OLnN0cmluZ2lmeShtc2cpKTtcbiAgICAgICAgY29uc3QgcyA9IG1zZy5yb29tO1xuICAgICAgICBpZiAocyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aGlzLmVlLmVtaXRFdmVudCgnc2Vzc2lvbi1jbG9zZWQnLCBbe1xuICAgICAgICAgICAgICAgIHNlc3Npb246IHNcbiAgICAgICAgICAgIH1dKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignU2Vzc2lvbiB1bmRlZmluZWQgb24gc2Vzc2lvbiBjbG9zZWQnLCBtc2cpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGhpZGRlblxuICAgICAqL1xuICAgIG9uTG9zdENvbm5lY3Rpb24oKTogdm9pZCB7XG5cbiAgICAgICAgLyppZiAoIXRoaXMuY29ubmVjdGlvbikge1xuXG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ05vdCBjb25uZWN0ZWQgdG8gc2Vzc2lvbjogaWYgeW91IGFyZSBub3QgZGVidWdnaW5nLCB0aGlzIGlzIHByb2JhYmx5IGEgY2VydGlmaWNhdGUgZXJyb3InKTtcblxuICAgICAgICAgICAgY29uc3QgdXJsID0gJ2h0dHBzOi8vJyArIHRoaXMub3BlbnZpZHUuZ2V0V3NVcmkoKS5zcGxpdCgnd3NzOi8vJylbMV0uc3BsaXQoJy9vcGVudmlkdScpWzBdO1xuICAgICAgICAgICAgaWYgKHdpbmRvdy5jb25maXJtKCdJZiB5b3UgYXJlIG5vdCBkZWJ1Z2dpbmcsIHRoaXMgaXMgcHJvYmFibHkgYSBjZXJ0aWZpY2F0ZSBlcnJvciBhdCBcXFwiJyArIHVybCArICdcXFwiXFxuXFxuQ2xpY2sgT0sgdG8gbmF2aWdhdGUgYW5kIGFjY2VwdCBpdCcpKSB7XG4gICAgICAgICAgICAgICAgbG9jYXRpb24uYXNzaWduKHVybCArICcvYWNjZXB0LWNlcnRpZmljYXRlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH0qL1xuXG4gICAgICAgIGNvbnNvbGUud2FybignTG9zdCBjb25uZWN0aW9uIGluIFNlc3Npb24gJyArIHRoaXMuc2Vzc2lvbklkKTtcbiAgICAgICAgaWYgKCEhdGhpcy5zZXNzaW9uSWQgJiYgIXRoaXMuY29ubmVjdGlvbi5kaXNwb3NlZCkge1xuICAgICAgICAgICAgdGhpcy5sZWF2ZSh0cnVlLCAnbmV0d29ya0Rpc2Nvbm5lY3QnKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBoaWRkZW5cbiAgICAgKi9cbiAgICBvbk1lZGlhRXJyb3IocGFyYW1zKTogdm9pZCB7XG5cbiAgICAgICAgY29uc29sZS5lcnJvcignTWVkaWEgZXJyb3I6ICcgKyBKU09OLnN0cmluZ2lmeShwYXJhbXMpKTtcbiAgICAgICAgY29uc3QgZXJyID0gcGFyYW1zLmVycm9yO1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICB0aGlzLmVlLmVtaXRFdmVudCgnZXJyb3ItbWVkaWEnLCBbe1xuICAgICAgICAgICAgICAgIGVycm9yOiBlcnJcbiAgICAgICAgICAgIH1dKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignUmVjZWl2ZWQgdW5kZWZpbmVkIG1lZGlhIGVycm9yLiBQYXJhbXM6JywgcGFyYW1zKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBoaWRkZW5cbiAgICAgKi9cbiAgICBvblJlY29yZGluZ1N0YXJ0ZWQocmVzcG9uc2UpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5lZS5lbWl0RXZlbnQoJ3JlY29yZGluZ1N0YXJ0ZWQnLCBbbmV3IFJlY29yZGluZ0V2ZW50KHRoaXMsICdyZWNvcmRpbmdTdGFydGVkJywgcmVzcG9uc2UuaWQsIHJlc3BvbnNlLm5hbWUpXSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGhpZGRlblxuICAgICAqL1xuICAgIG9uUmVjb3JkaW5nU3RvcHBlZChyZXNwb25zZSk6IHZvaWQge1xuICAgICAgICB0aGlzLmVlLmVtaXRFdmVudCgncmVjb3JkaW5nU3RvcHBlZCcsIFtuZXcgUmVjb3JkaW5nRXZlbnQodGhpcywgJ3JlY29yZGluZ1N0b3BwZWQnLCByZXNwb25zZS5pZCwgcmVzcG9uc2UubmFtZSldKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAaGlkZGVuXG4gICAgICovXG4gICAgZW1pdEV2ZW50KHR5cGU6IHN0cmluZywgZXZlbnRBcnJheTogYW55W10pOiB2b2lkIHtcbiAgICAgICAgdGhpcy5lZS5lbWl0RXZlbnQodHlwZSwgZXZlbnRBcnJheSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGhpZGRlblxuICAgICAqL1xuICAgIGxlYXZlKGZvcmNlZDogYm9vbGVhbiwgcmVhc29uOiBzdHJpbmcpOiB2b2lkIHtcblxuICAgICAgICBmb3JjZWQgPSAhIWZvcmNlZDtcbiAgICAgICAgY29uc29sZS5pbmZvKCdMZWF2aW5nIFNlc3Npb24gKGZvcmNlZD0nICsgZm9yY2VkICsgJyknKTtcblxuICAgICAgICBpZiAoISF0aGlzLmNvbm5lY3Rpb24pIHtcbiAgICAgICAgICAgIGlmICghdGhpcy5jb25uZWN0aW9uLmRpc3Bvc2VkICYmICFmb3JjZWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm9wZW52aWR1LnNlbmRSZXF1ZXN0KCdsZWF2ZVJvb20nLCAoZXJyb3IsIHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vcGVudmlkdS5jbG9zZVdzKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMub3BlbnZpZHUuY2xvc2VXcygpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoISF0aGlzLmNvbm5lY3Rpb24uc3RyZWFtKSB7XG4gICAgICAgICAgICAgICAgLy8gRGlzcG9zZSBQdWJsaXNoZXIncyAgbG9jYWwgc3RyZWFtXG4gICAgICAgICAgICAgICAgdGhpcy5jb25uZWN0aW9uLnN0cmVhbS5kaXNwb3NlV2ViUnRjUGVlcigpO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbm5lY3Rpb24uc3RyZWFtLmlzTG9jYWxTdHJlYW1QdWJsaXNoZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gTWFrZSBQdWJsaXNoZXIgb2JqZWN0IGRpc3BhdGNoICdzdHJlYW1EZXN0cm95ZWQnIGV2ZW50IGlmIHRoZSBTdHJlYW0gd2FzIHB1Ymxpc2hlZFxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb24uc3RyZWFtLmVlLmVtaXRFdmVudCgnbG9jYWwtc3RyZWFtLWRlc3Ryb3llZC1ieS1kaXNjb25uZWN0JywgW3JlYXNvbl0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCF0aGlzLmNvbm5lY3Rpb24uZGlzcG9zZWQpIHtcbiAgICAgICAgICAgICAgICAvLyBNYWtlIFNlc3Npb24gb2JqZWN0IGRpc3BhdGNoICdzZXNzaW9uRGlzY29ubmVjdGVkJyBldmVudCAoaWYgaXQgaXMgbm90IGFscmVhZHkgZGlzcG9zZWQpXG4gICAgICAgICAgICAgICAgY29uc3Qgc2Vzc2lvbkRpc2Nvbm5lY3RFdmVudCA9IG5ldyBTZXNzaW9uRGlzY29ubmVjdGVkRXZlbnQodGhpcywgcmVhc29uKTtcbiAgICAgICAgICAgICAgICB0aGlzLmVlLmVtaXRFdmVudCgnc2Vzc2lvbkRpc2Nvbm5lY3RlZCcsIFtzZXNzaW9uRGlzY29ubmVjdEV2ZW50XSk7XG4gICAgICAgICAgICAgICAgc2Vzc2lvbkRpc2Nvbm5lY3RFdmVudC5jYWxsRGVmYXVsdEJlaGF2aW91cigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdZb3Ugd2VyZSBub3QgY29ubmVjdGVkIHRvIHRoZSBzZXNzaW9uICcgKyB0aGlzLnNlc3Npb25JZCk7XG4gICAgICAgIH1cbiAgICB9XG5cblxuICAgIC8qIFByaXZhdGUgbWV0aG9kcyAqL1xuXG4gICAgcHJpdmF0ZSBjb25uZWN0QXV4KHRva2VuOiBzdHJpbmcpOiBQcm9taXNlPGFueT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5vcGVudmlkdS5zdGFydFdzKChlcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgIGlmICghIWVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgICAgICAgICBjb25zdCBqb2luUGFyYW1zID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdG9rZW46ICghIXRva2VuKSA/IHRva2VuIDogJycsXG4gICAgICAgICAgICAgICAgICAgICAgICBzZXNzaW9uOiB0aGlzLnNlc3Npb25JZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1ldGFkYXRhOiAhIXRoaXMub3B0aW9ucy5tZXRhZGF0YSA/IHRoaXMub3B0aW9ucy5tZXRhZGF0YSA6ICcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgc2VjcmV0OiB0aGlzLm9wZW52aWR1LmdldFNlY3JldCgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVjb3JkZXI6IHRoaXMub3BlbnZpZHUuZ2V0UmVjb3JkZXIoKSxcbiAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICB0aGlzLm9wZW52aWR1LnNlbmRSZXF1ZXN0KCdqb2luUm9vbScsIGpvaW5QYXJhbXMsIChlcnJvciwgcmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghIWVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGxvY2FsIENvbm5lY3Rpb24gb2JqZWN0IHdpdGggdmFsdWVzIHJldHVybmVkIGJ5IG9wZW52aWR1LXNlcnZlclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbiA9IG5ldyBDb25uZWN0aW9uKHRoaXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbi5jb25uZWN0aW9uSWQgPSByZXNwb25zZS5pZDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb24uZGF0YSA9IHJlc3BvbnNlLm1ldGFkYXRhO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSByZW1vdGUgQ29ubmVjdGlvbnMgd2l0aCB2YWx1ZSByZXR1cm5lZCBieSBvcGVudmlkdS1zZXJ2ZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBldmVudHMgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbm5lY3Rpb25zOiBuZXcgQXJyYXk8Q29ubmVjdGlvbj4oKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RyZWFtczogbmV3IEFycmF5PFN0cmVhbT4oKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZXhpc3RpbmdQYXJ0aWNpcGFudHM6IENvbm5lY3Rpb25PcHRpb25zW10gPSByZXNwb25zZS52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBleGlzdGluZ1BhcnRpY2lwYW50cy5mb3JFYWNoKHBhcnRpY2lwYW50ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY29ubmVjdGlvbiA9IG5ldyBDb25uZWN0aW9uKHRoaXMsIHBhcnRpY2lwYW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW1vdGVDb25uZWN0aW9uc1tjb25uZWN0aW9uLmNvbm5lY3Rpb25JZF0gPSBjb25uZWN0aW9uO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudHMuY29ubmVjdGlvbnMucHVzaChjb25uZWN0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCEhY29ubmVjdGlvbi5zdHJlYW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVtb3RlU3RyZWFtc0NyZWF0ZWRbY29ubmVjdGlvbi5zdHJlYW0uc3RyZWFtSWRdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50cy5zdHJlYW1zLnB1c2goY29ubmVjdGlvbi5zdHJlYW0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBPd24gJ2Nvbm5lY3Rpb25DcmVhdGVkJyBldmVudFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZWUuZW1pdEV2ZW50KCdjb25uZWN0aW9uQ3JlYXRlZCcsIFtuZXcgQ29ubmVjdGlvbkV2ZW50KGZhbHNlLCB0aGlzLCAnY29ubmVjdGlvbkNyZWF0ZWQnLCB0aGlzLmNvbm5lY3Rpb24sICcnKV0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gT25lICdjb25uZWN0aW9uQ3JlYXRlZCcgZXZlbnQgZm9yIGVhY2ggZXhpc3RpbmcgY29ubmVjdGlvbiBpbiB0aGUgc2Vzc2lvblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50cy5jb25uZWN0aW9ucy5mb3JFYWNoKGNvbm5lY3Rpb24gPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmVlLmVtaXRFdmVudCgnY29ubmVjdGlvbkNyZWF0ZWQnLCBbbmV3IENvbm5lY3Rpb25FdmVudChmYWxzZSwgdGhpcywgJ2Nvbm5lY3Rpb25DcmVhdGVkJywgY29ubmVjdGlvbiwgJycpXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBPbmUgJ3N0cmVhbUNyZWF0ZWQnIGV2ZW50IGZvciBlYWNoIGFjdGl2ZSBzdHJlYW0gaW4gdGhlIHNlc3Npb25cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudHMuc3RyZWFtcy5mb3JFYWNoKHN0cmVhbSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZWUuZW1pdEV2ZW50KCdzdHJlYW1DcmVhdGVkJywgW25ldyBTdHJlYW1FdmVudChmYWxzZSwgdGhpcywgJ3N0cmVhbUNyZWF0ZWQnLCBzdHJlYW0sICcnKV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBzdHJpbmdDbGllbnRNZXRhZGF0YShtZXRhZGF0YTogYW55KTogc3RyaW5nIHtcbiAgICAgICAgaWYgKHR5cGVvZiBtZXRhZGF0YSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShtZXRhZGF0YSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gbWV0YWRhdGE7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGdldENvbm5lY3Rpb24oY29ubmVjdGlvbklkOiBzdHJpbmcsIGVycm9yTWVzc2FnZTogc3RyaW5nKTogUHJvbWlzZTxDb25uZWN0aW9uPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxDb25uZWN0aW9uPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjb25uZWN0aW9uID0gdGhpcy5yZW1vdGVDb25uZWN0aW9uc1tjb25uZWN0aW9uSWRdO1xuICAgICAgICAgICAgaWYgKCEhY29ubmVjdGlvbikge1xuICAgICAgICAgICAgICAgIC8vIFJlc29sdmUgcmVtb3RlIGNvbm5lY3Rpb25cbiAgICAgICAgICAgICAgICByZXNvbHZlKGNvbm5lY3Rpb24pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jb25uZWN0aW9uLmNvbm5lY3Rpb25JZCA9PT0gY29ubmVjdGlvbklkKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFJlc29sdmUgbG9jYWwgY29ubmVjdGlvblxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRoaXMuY29ubmVjdGlvbik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ29ubmVjdGlvbiBub3QgZm91bmQuIFJlamVjdCB3aXRoIE9wZW5WaWR1RXJyb3JcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KG5ldyBPcGVuVmlkdUVycm9yKE9wZW5WaWR1RXJyb3JOYW1lLkdFTkVSSUNfRVJST1IsIGVycm9yTWVzc2FnZSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBnZXRSZW1vdGVDb25uZWN0aW9uKGNvbm5lY3Rpb25JZDogc3RyaW5nLCBlcnJvck1lc3NhZ2U6IHN0cmluZyk6IFByb21pc2U8Q29ubmVjdGlvbj4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8Q29ubmVjdGlvbj4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgY29ubmVjdGlvbiA9IHRoaXMucmVtb3RlQ29ubmVjdGlvbnNbY29ubmVjdGlvbklkXTtcbiAgICAgICAgICAgIGlmICghIWNvbm5lY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAvLyBSZXNvbHZlIHJlbW90ZSBjb25uZWN0aW9uXG4gICAgICAgICAgICAgICAgcmVzb2x2ZShjb25uZWN0aW9uKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gUmVtb3RlIGNvbm5lY3Rpb24gbm90IGZvdW5kLiBSZWplY3Qgd2l0aCBPcGVuVmlkdUVycm9yXG4gICAgICAgICAgICAgICAgcmVqZWN0KG5ldyBPcGVuVmlkdUVycm9yKE9wZW5WaWR1RXJyb3JOYW1lLkdFTkVSSUNfRVJST1IsIGVycm9yTWVzc2FnZSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIHByb2Nlc3NUb2tlbih0b2tlbjogc3RyaW5nKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHVybCA9IG5ldyBVUkwodG9rZW4pO1xuICAgICAgICB0aGlzLnNlc3Npb25JZCA9IDxzdHJpbmc+dXJsLnNlYXJjaFBhcmFtcy5nZXQoJ3Nlc3Npb25JZCcpO1xuICAgICAgICBjb25zdCBzZWNyZXQgPSB1cmwuc2VhcmNoUGFyYW1zLmdldCgnc2VjcmV0Jyk7XG4gICAgICAgIGNvbnN0IHJlY29yZGVyID0gdXJsLnNlYXJjaFBhcmFtcy5nZXQoJ3JlY29yZGVyJyk7XG4gICAgICAgIGNvbnN0IHR1cm5Vc2VybmFtZSA9IHVybC5zZWFyY2hQYXJhbXMuZ2V0KCd0dXJuVXNlcm5hbWUnKTtcbiAgICAgICAgY29uc3QgdHVybkNyZWRlbnRpYWwgPSB1cmwuc2VhcmNoUGFyYW1zLmdldCgndHVybkNyZWRlbnRpYWwnKTtcbiAgICAgICAgY29uc3Qgcm9sZSA9IHVybC5zZWFyY2hQYXJhbXMuZ2V0KCdyb2xlJyk7XG5cbiAgICAgICAgaWYgKCEhc2VjcmV0KSB7XG4gICAgICAgICAgICB0aGlzLm9wZW52aWR1LnNlY3JldCA9IHNlY3JldDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoISFyZWNvcmRlcikge1xuICAgICAgICAgICAgdGhpcy5vcGVudmlkdS5yZWNvcmRlciA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCEhdHVyblVzZXJuYW1lICYmICEhdHVybkNyZWRlbnRpYWwpIHtcbiAgICAgICAgICAgIGNvbnN0IHN0dW5VcmwgPSAnc3R1bjonICsgdXJsLmhvc3RuYW1lICsgJzozNDc4JztcbiAgICAgICAgICAgIGNvbnN0IHR1cm5VcmwxID0gJ3R1cm46JyArIHVybC5ob3N0bmFtZSArICc6MzQ3OCc7XG4gICAgICAgICAgICBjb25zdCB0dXJuVXJsMiA9IHR1cm5VcmwxICsgJz90cmFuc3BvcnQ9dGNwJztcbiAgICAgICAgICAgIHRoaXMub3BlbnZpZHUuaWNlU2VydmVycyA9IFtcbiAgICAgICAgICAgICAgICB7IHVybHM6IFtzdHVuVXJsXSB9LFxuICAgICAgICAgICAgICAgIHsgdXJsczogW3R1cm5VcmwxLCB0dXJuVXJsMl0sIHVzZXJuYW1lOiB0dXJuVXNlcm5hbWUsIGNyZWRlbnRpYWw6IHR1cm5DcmVkZW50aWFsIH1cbiAgICAgICAgICAgIF07XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnVFVSTiB0ZW1wIGNyZWRlbnRpYWxzIFsnICsgdHVyblVzZXJuYW1lICsgJzonICsgdHVybkNyZWRlbnRpYWwgKyAnXScpXG4gICAgICAgIH1cbiAgICAgICAgaWYgKCEhcm9sZSkge1xuICAgICAgICAgICAgdGhpcy5vcGVudmlkdS5yb2xlID0gcm9sZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMub3BlbnZpZHUud3NVcmkgPSAnd3NzOi8vJyArIHVybC5ob3N0ICsgJy9vcGVudmlkdSc7XG4gICAgfVxuXG59IiwiLypcbiAqIChDKSBDb3B5cmlnaHQgMjAxNy0yMDE4IE9wZW5WaWR1IChodHRwczovL29wZW52aWR1LmlvLylcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICpcbiAqL1xuXG5pbXBvcnQgeyBDb25uZWN0aW9uIH0gZnJvbSAnLi9Db25uZWN0aW9uJztcbmltcG9ydCB7IFNlc3Npb24gfSBmcm9tICcuL1Nlc3Npb24nO1xuaW1wb3J0IHsgU3RyZWFtTWFuYWdlciB9IGZyb20gJy4vU3RyZWFtTWFuYWdlcic7XG5pbXBvcnQgeyBJbmJvdW5kU3RyZWFtT3B0aW9ucyB9IGZyb20gJy4uL09wZW5WaWR1SW50ZXJuYWwvSW50ZXJmYWNlcy9Qcml2YXRlL0luYm91bmRTdHJlYW1PcHRpb25zJztcbmltcG9ydCB7IE91dGJvdW5kU3RyZWFtT3B0aW9ucyB9IGZyb20gJy4uL09wZW5WaWR1SW50ZXJuYWwvSW50ZXJmYWNlcy9Qcml2YXRlL091dGJvdW5kU3RyZWFtT3B0aW9ucyc7XG5pbXBvcnQgeyBXZWJSdGNQZWVyLCBXZWJSdGNQZWVyU2VuZG9ubHksIFdlYlJ0Y1BlZXJSZWN2b25seSwgV2ViUnRjUGVlclNlbmRyZWN2IH0gZnJvbSAnLi4vT3BlblZpZHVJbnRlcm5hbC9XZWJSdGNQZWVyL1dlYlJ0Y1BlZXInO1xuaW1wb3J0IHsgV2ViUnRjU3RhdHMgfSBmcm9tICcuLi9PcGVuVmlkdUludGVybmFsL1dlYlJ0Y1N0YXRzL1dlYlJ0Y1N0YXRzJztcbmltcG9ydCB7IFB1Ymxpc2hlclNwZWFraW5nRXZlbnQgfSBmcm9tICcuLi9PcGVuVmlkdUludGVybmFsL0V2ZW50cy9QdWJsaXNoZXJTcGVha2luZ0V2ZW50JztcblxuaW1wb3J0IEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ3dvbGZ5ODctZXZlbnRlbWl0dGVyJyk7XG5pbXBvcnQgaGFyayA9IHJlcXVpcmUoJ2hhcmsnKTtcblxuXG4vKipcbiAqIFJlcHJlc2VudHMgZWFjaCBvbmUgb2YgdGhlIG1lZGlhIHN0cmVhbXMgYXZhaWxhYmxlIGluIE9wZW5WaWR1IFNlcnZlciBmb3IgY2VydGFpbiBzZXNzaW9uLlxuICogRWFjaCBbW1B1Ymxpc2hlcl1dIGFuZCBbW1N1YnNjcmliZXJdXSBoYXMgYW4gYXR0cmlidXRlIG9mIHR5cGUgU3RyZWFtLCBhcyB0aGV5IGdpdmUgYWNjZXNzXG4gKiB0byBvbmUgb2YgdGhlbSAoc2VuZGluZyBhbmQgcmVjZWl2aW5nIGl0LCByZXNwZWN0aXZlbHkpXG4gKi9cbmV4cG9ydCBjbGFzcyBTdHJlYW0ge1xuXG4gICAgLyoqXG4gICAgICogVGhlIENvbm5lY3Rpb24gb2JqZWN0IHRoYXQgaXMgcHVibGlzaGluZyB0aGUgc3RyZWFtXG4gICAgICovXG4gICAgY29ubmVjdGlvbjogQ29ubmVjdGlvbjtcblxuICAgIC8qKlxuICAgICAqIEZyYW1lIHJhdGUgb2YgdGhlIHZpZGVvIGluIGZyYW1lcyBwZXIgc2Vjb25kLiBUaGlzIHByb3BlcnR5IGlzIG9ubHkgZGVmaW5lZCBpZiB0aGUgW1tQdWJsaXNoZXJdXSBvZlxuICAgICAqIHRoZSBzdHJlYW0gd2FzIGluaXRpYWxpemVkIHBhc3NpbmcgYSBfZnJhbWVSYXRlXyBwcm9wZXJ0eSBvbiBbW09wZW5WaWR1LmluaXRQdWJsaXNoZXJdXSBtZXRob2RcbiAgICAgKi9cbiAgICBmcmFtZVJhdGU/OiBudW1iZXI7XG5cbiAgICAvKipcbiAgICAgKiBXaGV0aGVyIHRoZSBzdHJlYW0gaGFzIGEgdmlkZW8gdHJhY2sgb3Igbm90XG4gICAgICovXG4gICAgaGFzVmlkZW86IGJvb2xlYW47XG5cbiAgICAvKipcbiAgICAgKiBXaGV0aGVyIHRoZSBzdHJlYW0gaGFzIGFuIGF1ZGlvIHRyYWNrIG9yIG5vdFxuICAgICAqL1xuICAgIGhhc0F1ZGlvOiBib29sZWFuO1xuXG4gICAgLyoqXG4gICAgICogVW5pcXVlIGlkZW50aWZpZXIgb2YgdGhlIHN0cmVhbVxuICAgICAqL1xuICAgIHN0cmVhbUlkOiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBgXCJDQU1FUkFcImAgb3IgYFwiU0NSRUVOXCJgLiAqdW5kZWZpbmVkKiBpZiBzdHJlYW0gaXMgYXVkaW8tb25seVxuICAgICAqL1xuICAgIHR5cGVPZlZpZGVvPzogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogU3RyZWFtTWFuYWdlciBvYmplY3QgKFtbUHVibGlzaGVyXV0gb3IgW1tTdWJzY3JpYmVyXV0pIGluIGNoYXJnZSBvZiBkaXNwbGF5aW5nIHRoaXMgc3RyZWFtIGluIHRoZSBET01cbiAgICAgKi9cbiAgICBzdHJlYW1NYW5hZ2VyOiBTdHJlYW1NYW5hZ2VyO1xuXG4gICAgLyoqXG4gICAgICogQGhpZGRlblxuICAgICAqL1xuICAgIGVlID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuXG4gICAgcHJpdmF0ZSB3ZWJSdGNQZWVyOiBXZWJSdGNQZWVyO1xuICAgIHByaXZhdGUgbWVkaWFTdHJlYW06IE1lZGlhU3RyZWFtO1xuICAgIHByaXZhdGUgd2ViUnRjU3RhdHM6IFdlYlJ0Y1N0YXRzO1xuXG4gICAgcHJpdmF0ZSBpc1N1YnNjcmliZVRvUmVtb3RlID0gZmFsc2U7XG5cbiAgICAvKipcbiAgICAgKiBAaGlkZGVuXG4gICAgICovXG4gICAgaXNMb2NhbFN0cmVhbVJlYWR5VG9QdWJsaXNoID0gZmFsc2U7XG4gICAgLyoqXG4gICAgICogQGhpZGRlblxuICAgICAqL1xuICAgIGlzTG9jYWxTdHJlYW1QdWJsaXNoZWQgPSBmYWxzZTtcbiAgICAvKipcbiAgICAgKiBAaGlkZGVuXG4gICAgICovXG4gICAgc2Vzc2lvbjogU2Vzc2lvbjtcbiAgICAvKipcbiAgICAgKiBAaGlkZGVuXG4gICAgICovXG4gICAgaW5ib3VuZFN0cmVhbU9wdHM6IEluYm91bmRTdHJlYW1PcHRpb25zO1xuICAgIC8qKlxuICAgICAqIEBoaWRkZW5cbiAgICAgKi9cbiAgICBvdXRib3VuZFN0cmVhbU9wdHM6IE91dGJvdW5kU3RyZWFtT3B0aW9ucztcbiAgICAvKipcbiAgICAgKiBAaGlkZGVuXG4gICAgICovXG4gICAgc3BlZWNoRXZlbnQ6IGFueTtcblxuXG4gICAgLyoqXG4gICAgICogQGhpZGRlblxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHNlc3Npb246IFNlc3Npb24sIG9wdGlvbnM6IEluYm91bmRTdHJlYW1PcHRpb25zIHwgT3V0Ym91bmRTdHJlYW1PcHRpb25zIHwge30pIHtcblxuICAgICAgICB0aGlzLnNlc3Npb24gPSBzZXNzaW9uO1xuXG4gICAgICAgIGlmIChvcHRpb25zLmhhc093blByb3BlcnR5KCdpZCcpKSB7XG4gICAgICAgICAgICAvLyBJbmJvdW5kU3RyZWFtT3B0aW9uczogc3RyZWFtIGJlbG9uZ3MgdG8gYSBTdWJzY3JpYmVyXG4gICAgICAgICAgICB0aGlzLmluYm91bmRTdHJlYW1PcHRzID0gPEluYm91bmRTdHJlYW1PcHRpb25zPm9wdGlvbnM7XG4gICAgICAgICAgICB0aGlzLnN0cmVhbUlkID0gdGhpcy5pbmJvdW5kU3RyZWFtT3B0cy5pZDtcbiAgICAgICAgICAgIHRoaXMuaGFzQXVkaW8gPSB0aGlzLmluYm91bmRTdHJlYW1PcHRzLnJlY3ZBdWRpbztcbiAgICAgICAgICAgIHRoaXMuaGFzVmlkZW8gPSB0aGlzLmluYm91bmRTdHJlYW1PcHRzLnJlY3ZWaWRlbztcbiAgICAgICAgICAgIHRoaXMudHlwZU9mVmlkZW8gPSAoIXRoaXMuaW5ib3VuZFN0cmVhbU9wdHMudHlwZU9mVmlkZW8pID8gdW5kZWZpbmVkIDogdGhpcy5pbmJvdW5kU3RyZWFtT3B0cy50eXBlT2ZWaWRlbztcbiAgICAgICAgICAgIHRoaXMuZnJhbWVSYXRlID0gKHRoaXMuaW5ib3VuZFN0cmVhbU9wdHMuZnJhbWVSYXRlID09PSAtMSkgPyB1bmRlZmluZWQgOiB0aGlzLmluYm91bmRTdHJlYW1PcHRzLmZyYW1lUmF0ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIE91dGJvdW5kU3RyZWFtT3B0aW9uczogc3RyZWFtIGJlbG9uZ3MgdG8gYSBQdWJsaXNoZXJcbiAgICAgICAgICAgIHRoaXMub3V0Ym91bmRTdHJlYW1PcHRzID0gPE91dGJvdW5kU3RyZWFtT3B0aW9ucz5vcHRpb25zO1xuXG4gICAgICAgICAgICBpZiAodGhpcy5pc1NlbmRWaWRlbygpKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaXNTZW5kU2NyZWVuKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50eXBlT2ZWaWRlbyA9ICdTQ1JFRU4nO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudHlwZU9mVmlkZW8gPSAnQ0FNRVJBJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5mcmFtZVJhdGUgPSB0aGlzLm91dGJvdW5kU3RyZWFtT3B0cy5wdWJsaXNoZXJQcm9wZXJ0aWVzLmZyYW1lUmF0ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMudHlwZU9mVmlkZW87XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmhhc0F1ZGlvID0gdGhpcy5pc1NlbmRBdWRpbygpO1xuICAgICAgICAgICAgdGhpcy5oYXNWaWRlbyA9IHRoaXMuaXNTZW5kVmlkZW8oKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuZWUub24oJ21lZGlhc3RyZWFtLXVwZGF0ZWQnLCAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnN0cmVhbU1hbmFnZXIudXBkYXRlTWVkaWFTdHJlYW0odGhpcy5tZWRpYVN0cmVhbSk7XG4gICAgICAgICAgICBjb25zb2xlLmRlYnVnKCdWaWRlbyBzcmNPYmplY3QgWycgKyB0aGlzLm1lZGlhU3RyZWFtICsgJ10gdXBkYXRlZCBpbiBzdHJlYW0gWycgKyB0aGlzLnN0cmVhbUlkICsgJ10nKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG5cbiAgICAvKiBIaWRkZW4gbWV0aG9kcyAqL1xuXG4gICAgLyoqXG4gICAgICogQGhpZGRlblxuICAgICAqL1xuICAgIGdldE1lZGlhU3RyZWFtKCk6IE1lZGlhU3RyZWFtIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubWVkaWFTdHJlYW07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGhpZGRlblxuICAgICAqL1xuICAgIHNldE1lZGlhU3RyZWFtKG1lZGlhU3RyZWFtOiBNZWRpYVN0cmVhbSk6IHZvaWQge1xuICAgICAgICB0aGlzLm1lZGlhU3RyZWFtID0gbWVkaWFTdHJlYW07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGhpZGRlblxuICAgICAqL1xuICAgIHVwZGF0ZU1lZGlhU3RyZWFtSW5WaWRlb3MoKSB7XG4gICAgICAgIHRoaXMuZWUuZW1pdEV2ZW50KCdtZWRpYXN0cmVhbS11cGRhdGVkJyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGhpZGRlblxuICAgICAqL1xuICAgIGdldFdlYlJ0Y1BlZXIoKTogV2ViUnRjUGVlciB7XG4gICAgICAgIHJldHVybiB0aGlzLndlYlJ0Y1BlZXI7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGhpZGRlblxuICAgICAqL1xuICAgIGdldFJUQ1BlZXJDb25uZWN0aW9uKCk6IFJUQ1BlZXJDb25uZWN0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMud2ViUnRjUGVlci5wYztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAaGlkZGVuXG4gICAgICovXG4gICAgc3Vic2NyaWJlVG9NeVJlbW90ZSh2YWx1ZTogYm9vbGVhbik6IHZvaWQge1xuICAgICAgICB0aGlzLmlzU3Vic2NyaWJlVG9SZW1vdGUgPSB2YWx1ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAaGlkZGVuXG4gICAgICovXG4gICAgc2V0T3V0Ym91bmRTdHJlYW1PcHRpb25zKG91dGJvdW5kU3RyZWFtT3B0czogT3V0Ym91bmRTdHJlYW1PcHRpb25zKTogdm9pZCB7XG4gICAgICAgIHRoaXMub3V0Ym91bmRTdHJlYW1PcHRzID0gb3V0Ym91bmRTdHJlYW1PcHRzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBoaWRkZW5cbiAgICAgKi9cbiAgICBzdWJzY3JpYmUoKTogUHJvbWlzZTxhbnk+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIHRoaXMuaW5pdFdlYlJ0Y1BlZXJSZWNlaXZlKClcbiAgICAgICAgICAgICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5jYXRjaChlcnJvciA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBoaWRkZW5cbiAgICAgKi9cbiAgICBwdWJsaXNoKCk6IFByb21pc2U8YW55PiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBpZiAodGhpcy5pc0xvY2FsU3RyZWFtUmVhZHlUb1B1Ymxpc2gpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmluaXRXZWJSdGNQZWVyU2VuZCgpXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgLmNhdGNoKGVycm9yID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmVlLm9uY2UoJ3N0cmVhbS1yZWFkeS10by1wdWJsaXNoJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnB1Ymxpc2goKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAuY2F0Y2goZXJyb3IgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGhpZGRlblxuICAgICAqL1xuICAgIGRpc3Bvc2VXZWJSdGNQZWVyKCk6IHZvaWQge1xuICAgICAgICBpZiAodGhpcy53ZWJSdGNQZWVyKSB7XG4gICAgICAgICAgICB0aGlzLndlYlJ0Y1BlZXIuZGlzcG9zZSgpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLnNwZWVjaEV2ZW50KSB7XG4gICAgICAgICAgICB0aGlzLnNwZWVjaEV2ZW50LnN0b3AoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuc3RvcFdlYlJ0Y1N0YXRzKCk7XG5cbiAgICAgICAgY29uc29sZS5pbmZvKCghIXRoaXMub3V0Ym91bmRTdHJlYW1PcHRzID8gJ091dGJvdW5kICcgOiAnSW5ib3VuZCAnKSArIFwiV2ViUlRDUGVlciBmcm9tICdTdHJlYW0nIHdpdGggaWQgW1wiICsgdGhpcy5zdHJlYW1JZCArICddIGlzIG5vdyBjbG9zZWQnKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAaGlkZGVuXG4gICAgICovXG4gICAgZGlzcG9zZU1lZGlhU3RyZWFtKCk6IHZvaWQge1xuICAgICAgICBpZiAodGhpcy5tZWRpYVN0cmVhbSkge1xuICAgICAgICAgICAgdGhpcy5tZWRpYVN0cmVhbS5nZXRBdWRpb1RyYWNrcygpLmZvckVhY2goKHRyYWNrKSA9PiB7XG4gICAgICAgICAgICAgICAgdHJhY2suc3RvcCgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB0aGlzLm1lZGlhU3RyZWFtLmdldFZpZGVvVHJhY2tzKCkuZm9yRWFjaCgodHJhY2spID0+IHtcbiAgICAgICAgICAgICAgICB0cmFjay5zdG9wKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLm1lZGlhU3RyZWFtO1xuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUuaW5mbygoISF0aGlzLm91dGJvdW5kU3RyZWFtT3B0cyA/ICdMb2NhbCAnIDogJ1JlbW90ZSAnKSArIFwiTWVkaWFTdHJlYW0gZnJvbSAnU3RyZWFtJyB3aXRoIGlkIFtcIiArIHRoaXMuc3RyZWFtSWQgKyAnXSBpcyBub3cgZGlzcG9zZWQnKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAaGlkZGVuXG4gICAgICovXG4gICAgZGlzcGxheU15UmVtb3RlKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pc1N1YnNjcmliZVRvUmVtb3RlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBoaWRkZW5cbiAgICAgKi9cbiAgICBpc1NlbmRBdWRpbygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICghIXRoaXMub3V0Ym91bmRTdHJlYW1PcHRzICYmXG4gICAgICAgICAgICB0aGlzLm91dGJvdW5kU3RyZWFtT3B0cy5wdWJsaXNoZXJQcm9wZXJ0aWVzLmF1ZGlvU291cmNlICE9PSBudWxsICYmXG4gICAgICAgICAgICB0aGlzLm91dGJvdW5kU3RyZWFtT3B0cy5wdWJsaXNoZXJQcm9wZXJ0aWVzLmF1ZGlvU291cmNlICE9PSBmYWxzZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGhpZGRlblxuICAgICAqL1xuICAgIGlzU2VuZFZpZGVvKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gKCEhdGhpcy5vdXRib3VuZFN0cmVhbU9wdHMgJiZcbiAgICAgICAgICAgIHRoaXMub3V0Ym91bmRTdHJlYW1PcHRzLnB1Ymxpc2hlclByb3BlcnRpZXMudmlkZW9Tb3VyY2UgIT09IG51bGwgJiZcbiAgICAgICAgICAgIHRoaXMub3V0Ym91bmRTdHJlYW1PcHRzLnB1Ymxpc2hlclByb3BlcnRpZXMudmlkZW9Tb3VyY2UgIT09IGZhbHNlKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAaGlkZGVuXG4gICAgICovXG4gICAgaXNTZW5kU2NyZWVuKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gKCEhdGhpcy5vdXRib3VuZFN0cmVhbU9wdHMgJiZcbiAgICAgICAgICAgIHRoaXMub3V0Ym91bmRTdHJlYW1PcHRzLnB1Ymxpc2hlclByb3BlcnRpZXMudmlkZW9Tb3VyY2UgPT09ICdzY3JlZW4nKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAaGlkZGVuXG4gICAgICovXG4gICAgc2V0U3BlZWNoRXZlbnRJZk5vdEV4aXN0cygpOiB2b2lkIHtcbiAgICAgICAgaWYgKCF0aGlzLnNwZWVjaEV2ZW50KSB7XG4gICAgICAgICAgICBjb25zdCBoYXJrT3B0aW9ucyA9IHRoaXMuc2Vzc2lvbi5vcGVudmlkdS5hZHZhbmNlZENvbmZpZ3VyYXRpb24ucHVibGlzaGVyU3BlYWtpbmdFdmVudHNPcHRpb25zIHx8IHt9O1xuICAgICAgICAgICAgaGFya09wdGlvbnMuaW50ZXJ2YWwgPSAodHlwZW9mIGhhcmtPcHRpb25zLmludGVydmFsID09PSAnbnVtYmVyJykgPyBoYXJrT3B0aW9ucy5pbnRlcnZhbCA6IDUwO1xuICAgICAgICAgICAgaGFya09wdGlvbnMudGhyZXNob2xkID0gKHR5cGVvZiBoYXJrT3B0aW9ucy50aHJlc2hvbGQgPT09ICdudW1iZXInKSA/IGhhcmtPcHRpb25zLnRocmVzaG9sZCA6IC01MDtcblxuICAgICAgICAgICAgdGhpcy5zcGVlY2hFdmVudCA9IGhhcmsodGhpcy5tZWRpYVN0cmVhbSwgaGFya09wdGlvbnMpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGhpZGRlblxuICAgICAqL1xuICAgIGVuYWJsZVNwZWFraW5nRXZlbnRzKCk6IHZvaWQge1xuICAgICAgICB0aGlzLnNldFNwZWVjaEV2ZW50SWZOb3RFeGlzdHMoKTtcbiAgICAgICAgdGhpcy5zcGVlY2hFdmVudC5vbignc3BlYWtpbmcnLCAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNlc3Npb24uZW1pdEV2ZW50KCdwdWJsaXNoZXJTdGFydFNwZWFraW5nJywgW25ldyBQdWJsaXNoZXJTcGVha2luZ0V2ZW50KHRoaXMuc2Vzc2lvbiwgJ3B1Ymxpc2hlclN0YXJ0U3BlYWtpbmcnLCB0aGlzLmNvbm5lY3Rpb24sIHRoaXMuc3RyZWFtSWQpXSk7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLnNwZWVjaEV2ZW50Lm9uKCdzdG9wcGVkX3NwZWFraW5nJywgKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5zZXNzaW9uLmVtaXRFdmVudCgncHVibGlzaGVyU3RvcFNwZWFraW5nJywgW25ldyBQdWJsaXNoZXJTcGVha2luZ0V2ZW50KHRoaXMuc2Vzc2lvbiwgJ3B1Ymxpc2hlclN0b3BTcGVha2luZycsIHRoaXMuY29ubmVjdGlvbiwgdGhpcy5zdHJlYW1JZCldKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGhpZGRlblxuICAgICAqL1xuICAgIGVuYWJsZU9uY2VTcGVha2luZ0V2ZW50cygpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5zZXRTcGVlY2hFdmVudElmTm90RXhpc3RzKCk7XG4gICAgICAgIHRoaXMuc3BlZWNoRXZlbnQub24oJ3NwZWFraW5nJywgKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5zZXNzaW9uLmVtaXRFdmVudCgncHVibGlzaGVyU3RhcnRTcGVha2luZycsIFtuZXcgUHVibGlzaGVyU3BlYWtpbmdFdmVudCh0aGlzLnNlc3Npb24sICdwdWJsaXNoZXJTdGFydFNwZWFraW5nJywgdGhpcy5jb25uZWN0aW9uLCB0aGlzLnN0cmVhbUlkKV0pO1xuICAgICAgICAgICAgdGhpcy5kaXNhYmxlU3BlYWtpbmdFdmVudHMoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuc3BlZWNoRXZlbnQub24oJ3N0b3BwZWRfc3BlYWtpbmcnLCAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNlc3Npb24uZW1pdEV2ZW50KCdwdWJsaXNoZXJTdG9wU3BlYWtpbmcnLCBbbmV3IFB1Ymxpc2hlclNwZWFraW5nRXZlbnQodGhpcy5zZXNzaW9uLCAncHVibGlzaGVyU3RvcFNwZWFraW5nJywgdGhpcy5jb25uZWN0aW9uLCB0aGlzLnN0cmVhbUlkKV0pO1xuICAgICAgICAgICAgdGhpcy5kaXNhYmxlU3BlYWtpbmdFdmVudHMoKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGhpZGRlblxuICAgICAqL1xuICAgIGRpc2FibGVTcGVha2luZ0V2ZW50cygpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5zcGVlY2hFdmVudC5zdG9wKCk7XG4gICAgICAgIHRoaXMuc3BlZWNoRXZlbnQgPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGhpZGRlblxuICAgICAqL1xuICAgIGlzTG9jYWwoKTogYm9vbGVhbiB7XG4gICAgICAgIC8vIGluYm91bmQgb3B0aW9ucyB1bmRlZmluZWQgYW5kIG91dGJvdW5kIG9wdGlvbnMgZGVmaW5lZFxuICAgICAgICByZXR1cm4gKCF0aGlzLmluYm91bmRTdHJlYW1PcHRzICYmICEhdGhpcy5vdXRib3VuZFN0cmVhbU9wdHMpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBoaWRkZW5cbiAgICAgKi9cbiAgICBnZXRTZWxlY3RlZEljZUNhbmRpZGF0ZSgpOiBQcm9taXNlPGFueT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgdGhpcy53ZWJSdGNTdGF0cy5nZXRTZWxlY3RlZEljZUNhbmRpZGF0ZUluZm8oKVxuICAgICAgICAgICAgICAgIC50aGVuKHJlcG9ydCA9PiByZXNvbHZlKHJlcG9ydCkpXG4gICAgICAgICAgICAgICAgLmNhdGNoKGVycm9yID0+IHJlamVjdChlcnJvcikpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAaGlkZGVuXG4gICAgICovXG4gICAgZ2V0UmVtb3RlSWNlQ2FuZGlkYXRlTGlzdCgpOiBSVENJY2VDYW5kaWRhdGVbXSB7XG4gICAgICAgIHJldHVybiB0aGlzLndlYlJ0Y1BlZXIucmVtb3RlQ2FuZGlkYXRlc1F1ZXVlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBoaWRkZW5cbiAgICAgKi9cbiAgICBnZXRMb2NhbEljZUNhbmRpZGF0ZUxpc3QoKTogUlRDSWNlQ2FuZGlkYXRlW10ge1xuICAgICAgICByZXR1cm4gdGhpcy53ZWJSdGNQZWVyLmxvY2FsQ2FuZGlkYXRlc1F1ZXVlO1xuICAgIH1cblxuICAgIC8qIFByaXZhdGUgbWV0aG9kcyAqL1xuXG4gICAgcHJpdmF0ZSBpbml0V2ViUnRjUGVlclNlbmQoKTogUHJvbWlzZTxhbnk+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcblxuICAgICAgICAgICAgY29uc3QgdXNlck1lZGlhQ29uc3RyYWludHMgPSB7XG4gICAgICAgICAgICAgICAgYXVkaW86IHRoaXMuaXNTZW5kQXVkaW8oKSxcbiAgICAgICAgICAgICAgICB2aWRlbzogdGhpcy5pc1NlbmRWaWRlbygpXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgICAgICAgICAgIG1lZGlhU3RyZWFtOiB0aGlzLm1lZGlhU3RyZWFtLFxuICAgICAgICAgICAgICAgIG1lZGlhQ29uc3RyYWludHM6IHVzZXJNZWRpYUNvbnN0cmFpbnRzLFxuICAgICAgICAgICAgICAgIG9uaWNlY2FuZGlkYXRlOiB0aGlzLmNvbm5lY3Rpb24uc2VuZEljZUNhbmRpZGF0ZS5iaW5kKHRoaXMuY29ubmVjdGlvbiksXG4gICAgICAgICAgICAgICAgaWNlU2VydmVyczogdGhpcy5nZXRJY2VTZXJ2ZXJzQ29uZigpLFxuICAgICAgICAgICAgICAgIHNpbXVsY2FzdDogZmFsc2VcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGNvbnN0IHN1Y2Nlc3NDYWxsYmFjayA9IChzZHBPZmZlclBhcmFtKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5kZWJ1ZygnU2VuZGluZyBTRFAgb2ZmZXIgdG8gcHVibGlzaCBhcyAnXG4gICAgICAgICAgICAgICAgICAgICsgdGhpcy5zdHJlYW1JZCwgc2RwT2ZmZXJQYXJhbSk7XG5cbiAgICAgICAgICAgICAgICB0aGlzLnNlc3Npb24ub3BlbnZpZHUuc2VuZFJlcXVlc3QoJ3B1Ymxpc2hWaWRlbycsIHtcbiAgICAgICAgICAgICAgICAgICAgc2RwT2ZmZXI6IHNkcE9mZmVyUGFyYW0sXG4gICAgICAgICAgICAgICAgICAgIGRvTG9vcGJhY2s6IHRoaXMuZGlzcGxheU15UmVtb3RlKCkgfHwgZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGF1ZGlvQWN0aXZlOiB0aGlzLmlzU2VuZEF1ZGlvKCksXG4gICAgICAgICAgICAgICAgICAgIHZpZGVvQWN0aXZlOiB0aGlzLmlzU2VuZFZpZGVvKCksXG4gICAgICAgICAgICAgICAgICAgIHR5cGVPZlZpZGVvOiAoKHRoaXMuaXNTZW5kVmlkZW8oKSkgPyAodGhpcy5pc1NlbmRTY3JlZW4oKSA/ICdTQ1JFRU4nIDogJ0NBTUVSQScpIDogJycpLFxuICAgICAgICAgICAgICAgICAgICBmcmFtZVJhdGU6ICEhdGhpcy5mcmFtZVJhdGUgPyB0aGlzLmZyYW1lUmF0ZSA6IC0xXG4gICAgICAgICAgICAgICAgfSwgKGVycm9yLCByZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdCgnRXJyb3Igb24gcHVibGlzaFZpZGVvOiAnICsgSlNPTi5zdHJpbmdpZnkoZXJyb3IpKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMud2ViUnRjUGVlci5wcm9jZXNzQW5zd2VyKHJlc3BvbnNlLnNkcEFuc3dlcilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc3RyZWFtSWQgPSByZXNwb25zZS5pZDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pc0xvY2FsU3RyZWFtUHVibGlzaGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuZGlzcGxheU15UmVtb3RlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVtb3RlUGVlclN1Y2Nlc2Z1bGx5RXN0YWJsaXNoZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmVlLmVtaXRFdmVudCgnc3RyZWFtLWNyZWF0ZWQtYnktcHVibGlzaGVyJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaW5pdFdlYlJ0Y1N0YXRzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5jYXRjaChlcnJvciA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmluZm8oXCInUHVibGlzaGVyJyBzdWNjZXNzZnVsbHkgcHVibGlzaGVkIHRvIHNlc3Npb25cIik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGlmICh0aGlzLmRpc3BsYXlNeVJlbW90ZSgpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy53ZWJSdGNQZWVyID0gbmV3IFdlYlJ0Y1BlZXJTZW5kcmVjdihvcHRpb25zKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy53ZWJSdGNQZWVyID0gbmV3IFdlYlJ0Y1BlZXJTZW5kb25seShvcHRpb25zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMud2ViUnRjUGVlci5nZW5lcmF0ZU9mZmVyKCkudGhlbihvZmZlciA9PiB7XG4gICAgICAgICAgICAgICAgc3VjY2Vzc0NhbGxiYWNrKG9mZmVyKTtcbiAgICAgICAgICAgIH0pLmNhdGNoKGVycm9yID0+IHtcbiAgICAgICAgICAgICAgICByZWplY3QobmV3IEVycm9yKCcocHVibGlzaCkgU0RQIG9mZmVyIGVycm9yOiAnICsgSlNPTi5zdHJpbmdpZnkoZXJyb3IpKSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBpbml0V2ViUnRjUGVlclJlY2VpdmUoKTogUHJvbWlzZTxhbnk+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcblxuICAgICAgICAgICAgY29uc3Qgb2ZmZXJDb25zdHJhaW50cyA9IHtcbiAgICAgICAgICAgICAgICBhdWRpbzogdGhpcy5pbmJvdW5kU3RyZWFtT3B0cy5yZWN2QXVkaW8sXG4gICAgICAgICAgICAgICAgdmlkZW86IHRoaXMuaW5ib3VuZFN0cmVhbU9wdHMucmVjdlZpZGVvXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgY29uc29sZS5kZWJ1ZyhcIidTZXNzaW9uLnN1YnNjcmliZShTdHJlYW0pJyBjYWxsZWQuIENvbnN0cmFpbnRzIG9mIGdlbmVyYXRlIFNEUCBvZmZlclwiLFxuICAgICAgICAgICAgICAgIG9mZmVyQ29uc3RyYWludHMpO1xuICAgICAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHtcbiAgICAgICAgICAgICAgICBvbmljZWNhbmRpZGF0ZTogdGhpcy5jb25uZWN0aW9uLnNlbmRJY2VDYW5kaWRhdGUuYmluZCh0aGlzLmNvbm5lY3Rpb24pLFxuICAgICAgICAgICAgICAgIG1lZGlhQ29uc3RyYWludHM6IG9mZmVyQ29uc3RyYWludHMsXG4gICAgICAgICAgICAgICAgaWNlU2VydmVyczogdGhpcy5nZXRJY2VTZXJ2ZXJzQ29uZigpLFxuICAgICAgICAgICAgICAgIHNpbXVsY2FzdDogZmFsc2VcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGNvbnN0IHN1Y2Nlc3NDYWxsYmFjayA9IChzZHBPZmZlclBhcmFtKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5kZWJ1ZygnU2VuZGluZyBTRFAgb2ZmZXIgdG8gc3Vic2NyaWJlIHRvICdcbiAgICAgICAgICAgICAgICAgICAgKyB0aGlzLnN0cmVhbUlkLCBzZHBPZmZlclBhcmFtKTtcbiAgICAgICAgICAgICAgICB0aGlzLnNlc3Npb24ub3BlbnZpZHUuc2VuZFJlcXVlc3QoJ3JlY2VpdmVWaWRlb0Zyb20nLCB7XG4gICAgICAgICAgICAgICAgICAgIHNlbmRlcjogdGhpcy5zdHJlYW1JZCxcbiAgICAgICAgICAgICAgICAgICAgc2RwT2ZmZXI6IHNkcE9mZmVyUGFyYW1cbiAgICAgICAgICAgICAgICB9LCAoZXJyb3IsIHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcignRXJyb3Igb24gcmVjdlZpZGVvRnJvbTogJyArIEpTT04uc3RyaW5naWZ5KGVycm9yKSkpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy53ZWJSdGNQZWVyLnByb2Nlc3NBbnN3ZXIocmVzcG9uc2Uuc2RwQW5zd2VyKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbW90ZVBlZXJTdWNjZXNmdWxseUVzdGFibGlzaGVkKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pbml0V2ViUnRjU3RhdHMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChlcnJvciA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB0aGlzLndlYlJ0Y1BlZXIgPSBuZXcgV2ViUnRjUGVlclJlY3Zvbmx5KG9wdGlvbnMpO1xuICAgICAgICAgICAgdGhpcy53ZWJSdGNQZWVyLmdlbmVyYXRlT2ZmZXIoKVxuICAgICAgICAgICAgICAgIC50aGVuKG9mZmVyID0+IHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc0NhbGxiYWNrKG9mZmVyKTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5jYXRjaChlcnJvciA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoJyhzdWJzY3JpYmUpIFNEUCBvZmZlciBlcnJvcjogJyArIEpTT04uc3RyaW5naWZ5KGVycm9yKSkpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIHJlbW90ZVBlZXJTdWNjZXNmdWxseUVzdGFibGlzaGVkKCk6IHZvaWQge1xuICAgICAgICB0aGlzLm1lZGlhU3RyZWFtID0gdGhpcy53ZWJSdGNQZWVyLnBjLmdldFJlbW90ZVN0cmVhbXMoKVswXTtcbiAgICAgICAgY29uc29sZS5kZWJ1ZygnUGVlciByZW1vdGUgc3RyZWFtJywgdGhpcy5tZWRpYVN0cmVhbSk7XG5cbiAgICAgICAgaWYgKCEhdGhpcy5tZWRpYVN0cmVhbSkge1xuICAgICAgICAgICAgdGhpcy5lZS5lbWl0RXZlbnQoJ21lZGlhc3RyZWFtLXVwZGF0ZWQnKTtcbiAgICAgICAgICAgIGlmICghdGhpcy5kaXNwbGF5TXlSZW1vdGUoKSAmJiAhIXRoaXMubWVkaWFTdHJlYW0uZ2V0QXVkaW9UcmFja3MoKVswXSAmJiB0aGlzLnNlc3Npb24uc3BlYWtpbmdFdmVudHNFbmFibGVkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5lbmFibGVTcGVha2luZ0V2ZW50cygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBpbml0V2ViUnRjU3RhdHMoKTogdm9pZCB7XG4gICAgICAgIHRoaXMud2ViUnRjU3RhdHMgPSBuZXcgV2ViUnRjU3RhdHModGhpcyk7XG4gICAgICAgIHRoaXMud2ViUnRjU3RhdHMuaW5pdFdlYlJ0Y1N0YXRzKCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBzdG9wV2ViUnRjU3RhdHMoKTogdm9pZCB7XG4gICAgICAgIGlmICghIXRoaXMud2ViUnRjU3RhdHMgJiYgdGhpcy53ZWJSdGNTdGF0cy5pc0VuYWJsZWQoKSkge1xuICAgICAgICAgICAgdGhpcy53ZWJSdGNTdGF0cy5zdG9wV2ViUnRjU3RhdHMoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgZ2V0SWNlU2VydmVyc0NvbmYoKTogUlRDSWNlU2VydmVyW10gfCB1bmRlZmluZWQge1xuICAgICAgICBsZXQgcmV0dXJuVmFsdWU7XG4gICAgICAgIGlmICghIXRoaXMuc2Vzc2lvbi5vcGVudmlkdS5hZHZhbmNlZENvbmZpZ3VyYXRpb24uaWNlU2VydmVycykge1xuICAgICAgICAgICAgcmV0dXJuVmFsdWUgPSB0aGlzLnNlc3Npb24ub3BlbnZpZHUuYWR2YW5jZWRDb25maWd1cmF0aW9uLmljZVNlcnZlcnMgPT09ICdmcmVlaWNlJyA/XG4gICAgICAgICAgICAgICAgdW5kZWZpbmVkIDpcbiAgICAgICAgICAgICAgICB0aGlzLnNlc3Npb24ub3BlbnZpZHUuYWR2YW5jZWRDb25maWd1cmF0aW9uLmljZVNlcnZlcnM7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5zZXNzaW9uLm9wZW52aWR1LmljZVNlcnZlcnMpIHtcbiAgICAgICAgICAgIHJldHVyblZhbHVlID0gdGhpcy5zZXNzaW9uLm9wZW52aWR1LmljZVNlcnZlcnM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm5WYWx1ZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0dXJuVmFsdWU7XG4gICAgfVxuXG59IiwiLypcbiAqIChDKSBDb3B5cmlnaHQgMjAxNy0yMDE4IE9wZW5WaWR1IChodHRwczovL29wZW52aWR1LmlvLylcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICpcbiAqL1xuXG5pbXBvcnQgeyBTdHJlYW0gfSBmcm9tICcuL1N0cmVhbSc7XG5pbXBvcnQgeyBFdmVudERpc3BhdGNoZXIgfSBmcm9tICcuLi9PcGVuVmlkdUludGVybmFsL0ludGVyZmFjZXMvUHVibGljL0V2ZW50RGlzcGF0Y2hlcic7XG5pbXBvcnQgeyBTdHJlYW1NYW5hZ2VyVmlkZW8gfSBmcm9tICcuLi9PcGVuVmlkdUludGVybmFsL0ludGVyZmFjZXMvUHVibGljL1N0cmVhbU1hbmFnZXJWaWRlbyc7XG5pbXBvcnQgeyBFdmVudCB9IGZyb20gJy4uL09wZW5WaWR1SW50ZXJuYWwvRXZlbnRzL0V2ZW50JztcbmltcG9ydCB7IFN0cmVhbU1hbmFnZXJFdmVudCB9IGZyb20gJy4uL09wZW5WaWR1SW50ZXJuYWwvRXZlbnRzL1N0cmVhbU1hbmFnZXJFdmVudCc7XG5pbXBvcnQgeyBWaWRlb0VsZW1lbnRFdmVudCB9IGZyb20gJy4uL09wZW5WaWR1SW50ZXJuYWwvRXZlbnRzL1ZpZGVvRWxlbWVudEV2ZW50JztcbmltcG9ydCB7IFZpZGVvSW5zZXJ0TW9kZSB9IGZyb20gJy4uL09wZW5WaWR1SW50ZXJuYWwvRW51bXMvVmlkZW9JbnNlcnRNb2RlJztcblxuaW1wb3J0IEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ3dvbGZ5ODctZXZlbnRlbWl0dGVyJyk7XG5cblxuLyoqXG4gKiBJbnRlcmZhY2UgaW4gY2hhcmdlIG9mIGRpc3BsYXlpbmcgdGhlIG1lZGlhIHN0cmVhbXMgaW4gdGhlIEhUTUwgRE9NLiBUaGlzIHdyYXBzIGFueSBbW1B1Ymxpc2hlcl1dIGFuZCBbW1N1YnNjcmliZXJdXSBvYmplY3QuXG4gKiBZb3UgY2FuIGluc2VydCBhcyBtYW55IHZpZGVvIHBsYXllcnMgZm8gdGhlIHNhbWUgU3RyZWFtIGFzIHlvdSB3YW50IGJ5IGNhbGxpbmcgW1tTdHJlYW1NYW5hZ2VyLmFkZFZpZGVvRWxlbWVudF1dIG9yXG4gKiBbW1N0cmVhbU1hbmFnZXIuY3JlYXRlVmlkZW9FbGVtZW50XV0uXG4gKlxuICogVGhlIHVzZSBvZiBTdHJlYW1NYW5hZ2VyIHdyYXBwZXIgaXMgcGFydGljdWxhcmx5IHVzZWZ1bCB3aGVuIHlvdSBkb24ndCBuZWVkIHRvIGRpZmZlcmVudGlhdGUgYmV0d2VlbiBQdWJsaXNoZXIgb3IgU3Vic2NyaWJlciBzdHJlYW1zIG9yIGp1c3RcbiAqIHdhbnQgdG8gZGlyZWN0bHkgbWFuYWdlIHlvdXIgb3duIHZpZGVvIGVsZW1lbnRzIChldmVuIG1vcmUgdGhhbiBvbmUgdmlkZW8gZWxlbWVudCBwZXIgU3RyZWFtKS4gVGhpcyBzY2VuYXJpbyBpcyBwcmV0dHkgY29tbW9uIGluXG4gKiBkZWNsYXJhdGl2ZSwgTVZDIGZyb250ZW5kIGZyYW1ld29ya3Mgc3VjaCBhcyBBbmd1bGFyLCBSZWFjdCBvciBWdWUuanNcbiAqL1xuZXhwb3J0IGNsYXNzIFN0cmVhbU1hbmFnZXIgaW1wbGVtZW50cyBFdmVudERpc3BhdGNoZXIge1xuXG4gICAgLyoqXG4gICAgICogVGhlIFN0cmVhbSByZXByZXNlbnRlZCBpbiB0aGUgRE9NIGJ5IHRoZSBQdWJsaXNoZXIvU3Vic2NyaWJlclxuICAgICAqL1xuICAgIHN0cmVhbTogU3RyZWFtO1xuXG4gICAgLyoqXG4gICAgICogQWxsIHRoZSB2aWRlb3MgZGlzcGxheWluZyB0aGUgU3RyZWFtIG9mIHRoaXMgUHVibGlzaGVyL1N1YnNjcmliZXJcbiAgICAgKi9cbiAgICB2aWRlb3M6IFN0cmVhbU1hbmFnZXJWaWRlb1tdID0gW107XG5cbiAgICAvKipcbiAgICAgKiBXaGV0aGVyIHRoZSBTdHJlYW0gcmVwcmVzZW50ZWQgaW4gdGhlIERPTSBpcyBsb2NhbCBvciByZW1vdGVcbiAgICAgKiAtIGBmYWxzZWAgZm9yIFtbUHVibGlzaGVyXV1cbiAgICAgKiAtIGB0cnVlYCBmb3IgW1tTdWJzY3JpYmVyXV1cbiAgICAgKi9cbiAgICByZW1vdGU6IGJvb2xlYW47XG5cbiAgICAvKipcbiAgICAgKiBUaGUgRE9NIEhUTUxFbGVtZW50IGFzc2lnbmVkIGFzIHRhcmdldCBlbGVtZW50IHdoZW4gY3JlYXRpbmcgdGhlIHZpZGVvIGZvciB0aGUgUHVibGlzaGVyL1N1YnNjcmliZXIuIFRoaXMgcHJvcGVydHkgaXMgb25seSBkZWZpbmVkIGlmOlxuICAgICAqIC0gW1tQdWJsaXNoZXJdXSBoYXMgYmVlbiBpbml0aWFsaXplZCBieSBjYWxsaW5nIG1ldGhvZCBbW09wZW5WaWR1LmluaXRQdWJsaXNoZXJdXSB3aXRoIGEgdmFsaWQgYHRhcmdldEVsZW1lbnRgIHBhcmFtZXRlclxuICAgICAqIC0gW1tTdWJzY3JpYmVyXV0gaGFzIGJlZW4gaW5pdGlhbGl6ZWQgYnkgY2FsbGluZyBtZXRob2QgW1tTZXNzaW9uLnN1YnNjcmliZV1dIHdpdGggYSB2YWxpZCBgdGFyZ2V0RWxlbWVudGAgcGFyYW1ldGVyXG4gICAgICovXG4gICAgdGFyZ2V0RWxlbWVudDogSFRNTEVsZW1lbnQ7XG5cbiAgICAvKipcbiAgICAgKiBgaWRgIGF0dHJpYnV0ZSBvZiB0aGUgRE9NIHZpZGVvIGVsZW1lbnQgZGlzcGxheWluZyB0aGUgUHVibGlzaGVyL1N1YnNjcmliZXIncyBzdHJlYW0uIFRoaXMgcHJvcGVydHkgaXMgb25seSBkZWZpbmVkIGlmOlxuICAgICAqIC0gW1tQdWJsaXNoZXJdXSBoYXMgYmVlbiBpbml0aWFsaXplZCBieSBjYWxsaW5nIG1ldGhvZCBbW09wZW5WaWR1LmluaXRQdWJsaXNoZXJdXSB3aXRoIGEgdmFsaWQgYHRhcmdldEVsZW1lbnRgIHBhcmFtZXRlclxuICAgICAqIC0gW1tTdWJzY3JpYmVyXV0gaGFzIGJlZW4gaW5pdGlhbGl6ZWQgYnkgY2FsbGluZyBtZXRob2QgW1tTZXNzaW9uLnN1YnNjcmliZV1dIHdpdGggYSB2YWxpZCBgdGFyZ2V0RWxlbWVudGAgcGFyYW1ldGVyXG4gICAgICovXG4gICAgaWQ6IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIEBoaWRkZW5cbiAgICAgKi9cbiAgICBmaXJzdFZpZGVvRWxlbWVudDogU3RyZWFtTWFuYWdlclZpZGVvO1xuICAgIC8qKlxuICAgICAqIEBoaWRkZW5cbiAgICAgKi9cbiAgICBsYXp5TGF1bmNoVmlkZW9FbGVtZW50Q3JlYXRlZEV2ZW50ID0gZmFsc2U7XG4gICAgLyoqXG4gICAgICogQGhpZGRlblxuICAgICAqL1xuICAgIGVsZW1lbnQ6IEhUTUxFbGVtZW50O1xuICAgIC8qKlxuICAgICAqIEBoaWRkZW5cbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZWUgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG4gICAgLyoqXG4gICAgICogQGhpZGRlblxuICAgICAqL1xuICAgIHByb3RlY3RlZCBjYW5QbGF5TGlzdGVuZXI6IEV2ZW50TGlzdGVuZXJPckV2ZW50TGlzdGVuZXJPYmplY3Q7XG5cblxuICAgIC8qKlxuICAgICAqIEBoaWRkZW5cbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihzdHJlYW06IFN0cmVhbSwgdGFyZ2V0RWxlbWVudD86IEhUTUxFbGVtZW50IHwgc3RyaW5nKSB7XG4gICAgICAgIHRoaXMuc3RyZWFtID0gc3RyZWFtO1xuICAgICAgICB0aGlzLnN0cmVhbS5zdHJlYW1NYW5hZ2VyID0gdGhpcztcbiAgICAgICAgdGhpcy5yZW1vdGUgPSAhdGhpcy5zdHJlYW0uaXNMb2NhbCgpO1xuXG4gICAgICAgIGlmICghIXRhcmdldEVsZW1lbnQpIHtcbiAgICAgICAgICAgIGxldCB0YXJnRWw7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHRhcmdldEVsZW1lbnQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgdGFyZ0VsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQodGFyZ2V0RWxlbWVudCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRhcmdldEVsZW1lbnQgaW5zdGFuY2VvZiBIVE1MRWxlbWVudCkge1xuICAgICAgICAgICAgICAgIHRhcmdFbCA9IHRhcmdldEVsZW1lbnQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghIXRhcmdFbCkge1xuICAgICAgICAgICAgICAgIHRoaXMuZmlyc3RWaWRlb0VsZW1lbnQgPSB7XG4gICAgICAgICAgICAgICAgICAgIHRhcmdldEVsZW1lbnQ6IHRhcmdFbCxcbiAgICAgICAgICAgICAgICAgICAgdmlkZW86IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3ZpZGVvJyksXG4gICAgICAgICAgICAgICAgICAgIGlkOiAnJ1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgdGhpcy50YXJnZXRFbGVtZW50ID0gdGFyZ0VsO1xuICAgICAgICAgICAgICAgIHRoaXMuZWxlbWVudCA9IHRhcmdFbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLmNhblBsYXlMaXN0ZW5lciA9ICgpID0+IHtcbiAgICAgICAgICAgIGlmICh0aGlzLnN0cmVhbS5pc0xvY2FsKCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuc3RyZWFtLmRpc3BsYXlNeVJlbW90ZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuaW5mbyhcIllvdXIgbG9jYWwgJ1N0cmVhbScgd2l0aCBpZCBbXCIgKyB0aGlzLnN0cmVhbS5zdHJlYW1JZCArICddIHZpZGVvIGlzIG5vdyBwbGF5aW5nJyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZWUuZW1pdEV2ZW50KCd2aWRlb1BsYXlpbmcnLCBbbmV3IFZpZGVvRWxlbWVudEV2ZW50KHRoaXMudmlkZW9zWzBdLnZpZGVvLCB0aGlzLCAndmlkZW9QbGF5aW5nJyldKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmluZm8oXCJZb3VyIG93biByZW1vdGUgJ1N0cmVhbScgd2l0aCBpZCBbXCIgKyB0aGlzLnN0cmVhbS5zdHJlYW1JZCArICddIHZpZGVvIGlzIG5vdyBwbGF5aW5nJyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZWUuZW1pdEV2ZW50KCdyZW1vdGVWaWRlb1BsYXlpbmcnLCBbbmV3IFZpZGVvRWxlbWVudEV2ZW50KHRoaXMudmlkZW9zWzBdLnZpZGVvLCB0aGlzLCAncmVtb3RlVmlkZW9QbGF5aW5nJyldKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuaW5mbyhcIlJlbW90ZSAnU3RyZWFtJyB3aXRoIGlkIFtcIiArIHRoaXMuc3RyZWFtLnN0cmVhbUlkICsgJ10gdmlkZW8gaXMgbm93IHBsYXlpbmcnKTtcbiAgICAgICAgICAgICAgICB0aGlzLmVlLmVtaXRFdmVudCgndmlkZW9QbGF5aW5nJywgW25ldyBWaWRlb0VsZW1lbnRFdmVudCh0aGlzLnZpZGVvc1swXS52aWRlbywgdGhpcywgJ3ZpZGVvUGxheWluZycpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmVlLmVtaXRFdmVudCgnc3RyZWFtUGxheWluZycsIFtuZXcgU3RyZWFtTWFuYWdlckV2ZW50KHRoaXMpXSk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2VlIFtbRXZlbnREaXNwYXRjaGVyLm9uXV1cbiAgICAgKi9cbiAgICBvbih0eXBlOiBzdHJpbmcsIGhhbmRsZXI6IChldmVudDogRXZlbnQpID0+IHZvaWQpOiBFdmVudERpc3BhdGNoZXIge1xuICAgICAgICB0aGlzLmVlLm9uKHR5cGUsIGV2ZW50ID0+IHtcbiAgICAgICAgICAgIGlmIChldmVudCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuaW5mbyhcIkV2ZW50ICdcIiArIHR5cGUgKyBcIicgdHJpZ2dlcmVkXCIsIGV2ZW50KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5pbmZvKFwiRXZlbnQgJ1wiICsgdHlwZSArIFwiJyB0cmlnZ2VyZWRcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBoYW5kbGVyKGV2ZW50KTtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmICh0eXBlID09PSAndmlkZW9FbGVtZW50Q3JlYXRlZCcpIHtcbiAgICAgICAgICAgIGlmICghIXRoaXMuc3RyZWFtICYmIHRoaXMubGF6eUxhdW5jaFZpZGVvRWxlbWVudENyZWF0ZWRFdmVudCkge1xuICAgICAgICAgICAgICAgIHRoaXMuZWUuZW1pdEV2ZW50KCd2aWRlb0VsZW1lbnRDcmVhdGVkJywgW25ldyBWaWRlb0VsZW1lbnRFdmVudCh0aGlzLnZpZGVvc1swXS52aWRlbywgdGhpcywgJ3ZpZGVvRWxlbWVudENyZWF0ZWQnKV0pO1xuICAgICAgICAgICAgICAgIHRoaXMubGF6eUxhdW5jaFZpZGVvRWxlbWVudENyZWF0ZWRFdmVudCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlID09PSAnc3RyZWFtUGxheWluZycgfHwgdHlwZSA9PT0gJ3ZpZGVvUGxheWluZycpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnZpZGVvc1swXSAmJiB0aGlzLnZpZGVvc1swXS52aWRlbyAmJlxuICAgICAgICAgICAgICAgIHRoaXMudmlkZW9zWzBdLnZpZGVvLmN1cnJlbnRUaW1lID4gMCAmJlxuICAgICAgICAgICAgICAgIHRoaXMudmlkZW9zWzBdLnZpZGVvLnBhdXNlZCA9PT0gZmFsc2UgJiZcbiAgICAgICAgICAgICAgICB0aGlzLnZpZGVvc1swXS52aWRlby5lbmRlZCA9PT0gZmFsc2UgJiZcbiAgICAgICAgICAgICAgICB0aGlzLnZpZGVvc1swXS52aWRlby5yZWFkeVN0YXRlID09PSA0KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5lZS5lbWl0RXZlbnQoJ3N0cmVhbVBsYXlpbmcnLCBbbmV3IFN0cmVhbU1hbmFnZXJFdmVudCh0aGlzKV0pO1xuICAgICAgICAgICAgICAgIHRoaXMuZWUuZW1pdEV2ZW50KCd2aWRlb1BsYXlpbmcnLCBbbmV3IFZpZGVvRWxlbWVudEV2ZW50KHRoaXMudmlkZW9zWzBdLnZpZGVvLCB0aGlzLCAndmlkZW9QbGF5aW5nJyldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTZWUgW1tFdmVudERpc3BhdGNoZXIub25jZV1dXG4gICAgICovXG4gICAgb25jZSh0eXBlOiBzdHJpbmcsIGhhbmRsZXI6IChldmVudDogRXZlbnQpID0+IHZvaWQpOiBTdHJlYW1NYW5hZ2VyIHtcbiAgICAgICAgdGhpcy5lZS5vbmNlKHR5cGUsIGV2ZW50ID0+IHtcbiAgICAgICAgICAgIGlmIChldmVudCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuaW5mbyhcIkV2ZW50ICdcIiArIHR5cGUgKyBcIicgdHJpZ2dlcmVkIG9uY2VcIiwgZXZlbnQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmluZm8oXCJFdmVudCAnXCIgKyB0eXBlICsgXCInIHRyaWdnZXJlZCBvbmNlXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaGFuZGxlcihldmVudCk7XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAodHlwZSA9PT0gJ3ZpZGVvRWxlbWVudENyZWF0ZWQnKSB7XG4gICAgICAgICAgICBpZiAoISF0aGlzLnN0cmVhbSAmJiB0aGlzLmxhenlMYXVuY2hWaWRlb0VsZW1lbnRDcmVhdGVkRXZlbnQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmVlLmVtaXRFdmVudCgndmlkZW9FbGVtZW50Q3JlYXRlZCcsIFtuZXcgVmlkZW9FbGVtZW50RXZlbnQodGhpcy52aWRlb3NbMF0udmlkZW8sIHRoaXMsICd2aWRlb0VsZW1lbnRDcmVhdGVkJyldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZSA9PT0gJ3N0cmVhbVBsYXlpbmcnIHx8IHR5cGUgPT09ICd2aWRlb1BsYXlpbmcnKSB7XG4gICAgICAgICAgICBpZiAodGhpcy52aWRlb3NbMF0gJiYgdGhpcy52aWRlb3NbMF0udmlkZW8gJiZcbiAgICAgICAgICAgICAgICB0aGlzLnZpZGVvc1swXS52aWRlby5jdXJyZW50VGltZSA+IDAgJiZcbiAgICAgICAgICAgICAgICB0aGlzLnZpZGVvc1swXS52aWRlby5wYXVzZWQgPT09IGZhbHNlICYmXG4gICAgICAgICAgICAgICAgdGhpcy52aWRlb3NbMF0udmlkZW8uZW5kZWQgPT09IGZhbHNlICYmXG4gICAgICAgICAgICAgICAgdGhpcy52aWRlb3NbMF0udmlkZW8ucmVhZHlTdGF0ZSA9PT0gNCkge1xuICAgICAgICAgICAgICAgIHRoaXMuZWUuZW1pdEV2ZW50KCdzdHJlYW1QbGF5aW5nJywgW25ldyBTdHJlYW1NYW5hZ2VyRXZlbnQodGhpcyldKTtcbiAgICAgICAgICAgICAgICB0aGlzLmVlLmVtaXRFdmVudCgndmlkZW9QbGF5aW5nJywgW25ldyBWaWRlb0VsZW1lbnRFdmVudCh0aGlzLnZpZGVvc1swXS52aWRlbywgdGhpcywgJ3ZpZGVvUGxheWluZycpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2VlIFtbRXZlbnREaXNwYXRjaGVyLm9mZl1dXG4gICAgICovXG4gICAgb2ZmKHR5cGU6IHN0cmluZywgaGFuZGxlcj86IChldmVudDogRXZlbnQpID0+IHZvaWQpOiBTdHJlYW1NYW5hZ2VyIHtcbiAgICAgICAgaWYgKCFoYW5kbGVyKSB7XG4gICAgICAgICAgICB0aGlzLmVlLnJlbW92ZUFsbExpc3RlbmVycyh0eXBlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuZWUub2ZmKHR5cGUsIGhhbmRsZXIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1ha2VzIGB2aWRlb2AgZWxlbWVudCBwYXJhbWV0ZXIgZGlzcGxheSB0aGlzIFtbc3RyZWFtXV0uIFRoaXMgaXMgdXNlZnVsIHdoZW4geW91IGFyZVxuICAgICAqIFttYW5hZ2luZyB0aGUgdmlkZW8gZWxlbWVudHMgb24geW91ciBvd25dKC9kb2NzL2hvdy1kby1pL21hbmFnZS12aWRlb3MvI3lvdS10YWtlLWNhcmUtb2YtdGhlLXZpZGVvLXBsYXllcnMpXG4gICAgICpcbiAgICAgKiBDYWxsaW5nIHRoaXMgbWV0aG9kIHdpdGggYSB2aWRlbyBhbHJlYWR5IGFkZGVkIHRvIG90aGVyIFB1Ymxpc2hlci9TdWJzY3JpYmVyIHdpbGwgY2F1c2UgdGhlIHZpZGVvIGVsZW1lbnQgdG8gYmVcbiAgICAgKiBkaXNhc3NvY2lhdGVkIGZyb20gdGhhdCBwcmV2aW91cyBQdWJsaXNoZXIvU3Vic2NyaWJlciBhbmQgdG8gYmUgYXNzb2NpYXRlZCB0byB0aGlzIG9uZS5cbiAgICAgKlxuICAgICAqIEByZXR1cm5zIDEgaWYgdGhlIHZpZGVvIHdhc24ndCBhc3NvY2lhdGVkIHRvIGFueSBvdGhlciBQdWJsaXNoZXIvU3Vic2NyaWJlciBhbmQgaGFzIGJlZW4gc3VjY2Vzc2Z1bGx5IGFkZGVkIHRvIHRoaXMgb25lLlxuICAgICAqIDAgaWYgdGhlIHZpZGVvIHdhcyBhbHJlYWR5IGFkZGVkIHRvIHRoaXMgUHVibGlzaGVyL1N1YnNjcmliZXIuIC0xIGlmIHRoZSB2aWRlbyB3YXMgcHJldmlvdXNseSBhc3NvY2lhdGVkIHRvIGFueSBvdGhlclxuICAgICAqIFB1Ymxpc2hlci9TdWJzY3JpYmVyIGFuZCBoYXMgYmVlbiBzdWNjZXNzZnVsbHkgZGlzYXNzb2NpYXRlZCBmcm9tIHRoYXQgb25lIGFuZCBwcm9wZXJseSBhZGRlZCB0byB0aGlzIG9uZS5cbiAgICAgKi9cbiAgICBhZGRWaWRlb0VsZW1lbnQodmlkZW86IEhUTUxWaWRlb0VsZW1lbnQpOiBudW1iZXIge1xuXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVZpZGVvUHJvcGVydGllcyh2aWRlbyk7XG5cbiAgICAgICAgLy8gSWYgdGhlIHZpZGVvIGVsZW1lbnQgaXMgYWxyZWFkeSBwYXJ0IG9mIHRoaXMgU3RyZWFtTWFuYWdlciBkbyBub3RoaW5nXG4gICAgICAgIGZvciAoY29uc3QgdiBvZiB0aGlzLnZpZGVvcykge1xuICAgICAgICAgICAgaWYgKHYudmlkZW8gPT09IHZpZGVvKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgcmV0dXJuTnVtYmVyID0gMTtcblxuICAgICAgICB0aGlzLmluaXRpYWxpemVWaWRlb1Byb3BlcnRpZXModmlkZW8pO1xuXG4gICAgICAgIGZvciAoY29uc3Qgc3RyZWFtTWFuYWdlciBvZiB0aGlzLnN0cmVhbS5zZXNzaW9uLnN0cmVhbU1hbmFnZXJzKSB7XG4gICAgICAgICAgICBpZiAoc3RyZWFtTWFuYWdlci5kaXNhc3NvY2lhdGVWaWRlbyh2aWRlbykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm5OdW1iZXIgPSAtMTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuc3RyZWFtLnNlc3Npb24uc3RyZWFtTWFuYWdlcnMuZm9yRWFjaChzdHJlYW1NYW5hZ2VyID0+IHtcbiAgICAgICAgICAgIHN0cmVhbU1hbmFnZXIuZGlzYXNzb2NpYXRlVmlkZW8odmlkZW8pO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLnB1c2hOZXdTdHJlYW1NYW5hZ2VyVmlkZW8oe1xuICAgICAgICAgICAgdmlkZW8sXG4gICAgICAgICAgICBpZDogdmlkZW8uaWRcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY29uc29sZS5pbmZvKCdOZXcgdmlkZW8gZWxlbWVudCBhc3NvY2lhdGVkIHRvICcsIHRoaXMpO1xuXG4gICAgICAgIHJldHVybiByZXR1cm5OdW1iZXI7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIG5ldyB2aWRlbyBlbGVtZW50IGRpc3BsYXlpbmcgdGhpcyBbW3N0cmVhbV1dLiBUaGlzIGFsbG93cyB5b3UgdG8gaGF2ZSBtdWx0aXBsZSB2aWRlbyBlbGVtZW50cyBkaXNwbGF5aW5nIHRoZSBzYW1lIG1lZGlhIHN0cmVhbS5cbiAgICAgKlxuICAgICAqICMjIyMgRXZlbnRzIGRpc3BhdGNoZWRcbiAgICAgKlxuICAgICAqIFRoZSBQdWJsaXNoZXIvU3Vic2NyaWJlciBvYmplY3Qgd2lsbCBkaXNwYXRjaCBhIGB2aWRlb0VsZW1lbnRDcmVhdGVkYCBldmVudCBvbmNlIHRoZSBIVE1MIHZpZGVvIGVsZW1lbnQgaGFzIGJlZW4gYWRkZWQgdG8gRE9NLiBTZWUgW1tWaWRlb0VsZW1lbnRFdmVudF1dXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdGFyZ2V0RWxlbWVudCBIVE1MIERPTSBlbGVtZW50IChvciBpdHMgYGlkYCBhdHRyaWJ1dGUpIGluIHdoaWNoIHRoZSB2aWRlbyBlbGVtZW50IG9mIHRoZSBQdWJsaXNoZXIvU3Vic2NyaWJlciB3aWxsIGJlIGluc2VydGVkXG4gICAgICogQHBhcmFtIGluc2VydE1vZGUgSG93IHRoZSB2aWRlbyBlbGVtZW50IHdpbGwgYmUgaW5zZXJ0ZWQgYWNjb3JkaW5nbHkgdG8gYHRhcmdldEVsZW1ldGBcbiAgICAgKi9cbiAgICBjcmVhdGVWaWRlb0VsZW1lbnQodGFyZ2V0RWxlbWVudD86IHN0cmluZyB8IEhUTUxFbGVtZW50LCBpbnNlcnRNb2RlPzogVmlkZW9JbnNlcnRNb2RlKTogSFRNTFZpZGVvRWxlbWVudCB7XG4gICAgICAgIGxldCB0YXJnRWw7XG4gICAgICAgIGlmICh0eXBlb2YgdGFyZ2V0RWxlbWVudCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHRhcmdFbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHRhcmdFbCk7XG4gICAgICAgICAgICBpZiAoIXRhcmdFbCkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRoZSBwcm92aWRlZCAndGFyZ2V0RWxlbWVudCcgY291bGRuJ3QgYmUgcmVzb2x2ZWQgdG8gYW55IEhUTUwgZWxlbWVudDogXCIgKyB0YXJnZXRFbGVtZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICh0YXJnZXRFbGVtZW50IGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgICAgIHRhcmdFbCA9IHRhcmdldEVsZW1lbnQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUaGUgcHJvdmlkZWQgJ3RhcmdldEVsZW1lbnQnIGNvdWxkbid0IGJlIHJlc29sdmVkIHRvIGFueSBIVE1MIGVsZW1lbnQ6IFwiICsgdGFyZ2V0RWxlbWVudCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB2aWRlbyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3ZpZGVvJyk7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVZpZGVvUHJvcGVydGllcyh2aWRlbyk7XG5cbiAgICAgICAgbGV0IGluc01vZGUgPSAhIWluc2VydE1vZGUgPyBpbnNlcnRNb2RlIDogVmlkZW9JbnNlcnRNb2RlLkFQUEVORDtcbiAgICAgICAgc3dpdGNoIChpbnNNb2RlKSB7XG4gICAgICAgICAgICBjYXNlIFZpZGVvSW5zZXJ0TW9kZS5BRlRFUjpcbiAgICAgICAgICAgICAgICB0YXJnRWwucGFyZW50Tm9kZSEhLmluc2VydEJlZm9yZSh2aWRlbywgdGFyZ0VsLm5leHRTaWJsaW5nKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgVmlkZW9JbnNlcnRNb2RlLkFQUEVORDpcbiAgICAgICAgICAgICAgICB0YXJnRWwuYXBwZW5kQ2hpbGQodmlkZW8pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBWaWRlb0luc2VydE1vZGUuQkVGT1JFOlxuICAgICAgICAgICAgICAgIHRhcmdFbC5wYXJlbnROb2RlISEuaW5zZXJ0QmVmb3JlKHZpZGVvLCB0YXJnRWwpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBWaWRlb0luc2VydE1vZGUuUFJFUEVORDpcbiAgICAgICAgICAgICAgICB0YXJnRWwuaW5zZXJ0QmVmb3JlKHZpZGVvLCB0YXJnRWwuY2hpbGROb2Rlc1swXSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFZpZGVvSW5zZXJ0TW9kZS5SRVBMQUNFOlxuICAgICAgICAgICAgICAgIHRhcmdFbC5wYXJlbnROb2RlISEucmVwbGFjZUNoaWxkKHZpZGVvLCB0YXJnRWwpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBpbnNNb2RlID0gVmlkZW9JbnNlcnRNb2RlLkFQUEVORDtcbiAgICAgICAgICAgICAgICB0YXJnRWwuYXBwZW5kQ2hpbGQodmlkZW8pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgdjogU3RyZWFtTWFuYWdlclZpZGVvID0ge1xuICAgICAgICAgICAgdGFyZ2V0RWxlbWVudDogdGFyZ0VsLFxuICAgICAgICAgICAgdmlkZW8sXG4gICAgICAgICAgICBpbnNlcnRNb2RlOiBpbnNNb2RlLFxuICAgICAgICAgICAgaWQ6IHZpZGVvLmlkXG4gICAgICAgIH07XG4gICAgICAgIHRoaXMucHVzaE5ld1N0cmVhbU1hbmFnZXJWaWRlbyh2KTtcblxuICAgICAgICB0aGlzLmVlLmVtaXRFdmVudCgndmlkZW9FbGVtZW50Q3JlYXRlZCcsIFtuZXcgVmlkZW9FbGVtZW50RXZlbnQodi52aWRlbywgdGhpcywgJ3ZpZGVvRWxlbWVudENyZWF0ZWQnKV0pO1xuXG4gICAgICAgIHRoaXMubGF6eUxhdW5jaFZpZGVvRWxlbWVudENyZWF0ZWRFdmVudCA9ICEhdGhpcy5maXJzdFZpZGVvRWxlbWVudDtcblxuICAgICAgICByZXR1cm4gdmlkZW87XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGhpZGRlblxuICAgICAqL1xuICAgIGluaXRpYWxpemVWaWRlb1Byb3BlcnRpZXModmlkZW86IEhUTUxWaWRlb0VsZW1lbnQpOiB2b2lkIHtcbiAgICAgICAgdmlkZW8uc3JjT2JqZWN0ID0gdGhpcy5zdHJlYW0uZ2V0TWVkaWFTdHJlYW0oKTtcbiAgICAgICAgdmlkZW8uYXV0b3BsYXkgPSB0cnVlO1xuICAgICAgICB2aWRlby5jb250cm9scyA9IGZhbHNlO1xuICAgICAgICBpZiAoIXZpZGVvLmlkKSB7XG4gICAgICAgICAgICB2aWRlby5pZCA9ICh0aGlzLnJlbW90ZSA/ICdyZW1vdGUtJyA6ICdsb2NhbC0nKSArICd2aWRlby0nICsgdGhpcy5zdHJlYW0uc3RyZWFtSWQ7XG4gICAgICAgICAgICAvLyBERVBSRUNBVEVEIHByb3BlcnR5OiBhc3NpZ24gb25jZSB0aGUgcHJvcGVydHkgaWQgaWYgdGhlIHVzZXIgcHJvdmlkZWQgYSB2YWxpZCB0YXJnZXRFbGVtZW50XG4gICAgICAgICAgICBpZiAoIXRoaXMuaWQgJiYgISF0aGlzLnRhcmdldEVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmlkID0gdmlkZW8uaWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0aGlzLnJlbW90ZSAmJiAhdGhpcy5zdHJlYW0uZGlzcGxheU15UmVtb3RlKCkpIHtcbiAgICAgICAgICAgIHZpZGVvLm11dGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIGlmICh0aGlzLnN0cmVhbS5vdXRib3VuZFN0cmVhbU9wdHMucHVibGlzaGVyUHJvcGVydGllcy5taXJyb3IpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm1pcnJvclZpZGVvKHZpZGVvKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBoaWRkZW5cbiAgICAgKi9cbiAgICByZW1vdmVBbGxWaWRlb3MoKTogdm9pZCB7XG4gICAgICAgIGZvciAobGV0IGkgPSB0aGlzLnN0cmVhbS5zZXNzaW9uLnN0cmVhbU1hbmFnZXJzLmxlbmd0aCAtIDE7IGkgPj0gMDsgLS1pKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5zdHJlYW0uc2Vzc2lvbi5zdHJlYW1NYW5hZ2Vyc1tpXSA9PT0gdGhpcykge1xuICAgICAgICAgICAgICAgIHRoaXMuc3RyZWFtLnNlc3Npb24uc3RyZWFtTWFuYWdlcnMuc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy52aWRlb3Muc2xpY2UoKS5yZXZlcnNlKCkuZm9yRWFjaCgoc3RyZWFtTWFuYWdlclZpZGVvLCBpbmRleCwgdmlkZW9zKSA9PiB7XG4gICAgICAgICAgICAvLyBSZW1vdmUgb25jYW5wbGF5IGV2ZW50IGxpc3RlbmVyIChvbmx5IE9wZW5WaWR1IGJyb3dzZXIgb25lLCBub3QgdGhlIHVzZXIgb25lcylcbiAgICAgICAgICAgIHN0cmVhbU1hbmFnZXJWaWRlby52aWRlby5yZW1vdmVFdmVudExpc3RlbmVyKCdjYW5wbGF5JywgdGhpcy5jYW5QbGF5TGlzdGVuZXIpO1xuICAgICAgICAgICAgaWYgKCEhc3RyZWFtTWFuYWdlclZpZGVvLnRhcmdldEVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICAvLyBPbmx5IHJlbW92ZSB2aWRlb3MgY3JlYXRlZCBieSBPcGVuVmlkdSBCcm93c2VyICh0aG9zZSBnZW5lcmF0ZWQgYnkgcGFzc2luZyBhIHZhbGlkIHRhcmdldEVsZW1lbnQgaW4gT3BlblZpZHUuaW5pdFB1Ymxpc2hlciBhbmQgU2Vzc2lvbi5zdWJzY3JpYmVcbiAgICAgICAgICAgICAgICAvLyBvciB0aG9zZSBjcmVhdGVkIGJ5IFN0cmVhbU1hbmFnZXIuY3JlYXRlVmlkZW9FbGVtZW50KS4gVGhlc2UgYXJlIGFsc28gdGhlIHZpZGVvcyB0aGF0IHRyaWdnZXJlZCBhIHZpZGVvRWxlbWVudENyZWF0ZWQgZXZlbnRcbiAgICAgICAgICAgICAgICBzdHJlYW1NYW5hZ2VyVmlkZW8udmlkZW8ucGFyZW50Tm9kZSEucmVtb3ZlQ2hpbGQoc3RyZWFtTWFuYWdlclZpZGVvLnZpZGVvKTtcbiAgICAgICAgICAgICAgICB0aGlzLmVlLmVtaXRFdmVudCgndmlkZW9FbGVtZW50RGVzdHJveWVkJywgW25ldyBWaWRlb0VsZW1lbnRFdmVudChzdHJlYW1NYW5hZ2VyVmlkZW8udmlkZW8sIHRoaXMsICd2aWRlb0VsZW1lbnREZXN0cm95ZWQnKV0pO1xuICAgICAgICAgICAgICAgIHRoaXMudmlkZW9zLnNwbGljZSh2aWRlb3MubGVuZ3RoIC0gMSAtIGluZGV4LCAxKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIHNyY09iamVjdCBpbiBhbGwgdmlkZW9zIG1hbmFnZWQgYnkgdGhlIHVzZXJcbiAgICAgICAgICAgICAgICBzdHJlYW1NYW5hZ2VyVmlkZW8udmlkZW8uc3JjT2JqZWN0ID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGhpZGRlblxuICAgICAqL1xuICAgIGRpc2Fzc29jaWF0ZVZpZGVvKHZpZGVvOiBIVE1MVmlkZW9FbGVtZW50KTogYm9vbGVhbiB7XG4gICAgICAgIGxldCBkaXNhc3NvY2lhdGVkID0gZmFsc2U7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy52aWRlb3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnZpZGVvc1tpXS52aWRlbyA9PT0gdmlkZW8pIHtcbiAgICAgICAgICAgICAgICB0aGlzLnZpZGVvcy5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICAgICAgZGlzYXNzb2NpYXRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgY29uc29sZS5pbmZvKCdWaWRlbyBlbGVtZW50IGRpc2Fzc29jaWF0ZWQgZnJvbSAnLCB0aGlzKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGlzYXNzb2NpYXRlZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAaGlkZGVuXG4gICAgICovXG4gICAgYWRkUGxheUV2ZW50VG9GaXJzdFZpZGVvKCkge1xuICAgICAgICBpZiAoKCEhdGhpcy52aWRlb3NbMF0pICYmICghIXRoaXMudmlkZW9zWzBdLnZpZGVvKSAmJiAodGhpcy52aWRlb3NbMF0udmlkZW8ub25jYW5wbGF5ID09PSBudWxsKSkge1xuICAgICAgICAgICAgdGhpcy52aWRlb3NbMF0udmlkZW8uYWRkRXZlbnRMaXN0ZW5lcignY2FucGxheScsIHRoaXMuY2FuUGxheUxpc3RlbmVyKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBoaWRkZW5cbiAgICAgKi9cbiAgICB1cGRhdGVNZWRpYVN0cmVhbShtZWRpYVN0cmVhbTogTWVkaWFTdHJlYW0pIHtcbiAgICAgICAgdGhpcy52aWRlb3MuZm9yRWFjaChzdHJlYW1NYW5hZ2VyVmlkZW8gPT4ge1xuICAgICAgICAgICAgc3RyZWFtTWFuYWdlclZpZGVvLnZpZGVvLnNyY09iamVjdCA9IG1lZGlhU3RyZWFtO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIHB1c2hOZXdTdHJlYW1NYW5hZ2VyVmlkZW8oc3RyZWFtTWFuYWdlclZpZGVvOiBTdHJlYW1NYW5hZ2VyVmlkZW8pIHtcbiAgICAgICAgdGhpcy52aWRlb3MucHVzaChzdHJlYW1NYW5hZ2VyVmlkZW8pO1xuICAgICAgICB0aGlzLmFkZFBsYXlFdmVudFRvRmlyc3RWaWRlbygpO1xuICAgICAgICBpZiAodGhpcy5zdHJlYW0uc2Vzc2lvbi5zdHJlYW1NYW5hZ2Vycy5pbmRleE9mKHRoaXMpID09PSAtMSkge1xuICAgICAgICAgICAgdGhpcy5zdHJlYW0uc2Vzc2lvbi5zdHJlYW1NYW5hZ2Vycy5wdXNoKHRoaXMpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBtaXJyb3JWaWRlbyh2aWRlbyk6IHZvaWQge1xuICAgICAgICB2aWRlby5zdHlsZS50cmFuc2Zvcm0gPSAncm90YXRlWSgxODBkZWcpJztcbiAgICAgICAgdmlkZW8uc3R5bGUud2Via2l0VHJhbnNmb3JtID0gJ3JvdGF0ZVkoMTgwZGVnKSc7XG4gICAgfVxuXG59IiwiLypcbiAqIChDKSBDb3B5cmlnaHQgMjAxNy0yMDE4IE9wZW5WaWR1IChodHRwczovL29wZW52aWR1LmlvLylcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICpcbiAqL1xuXG5pbXBvcnQgeyBTdHJlYW0gfSBmcm9tICcuL1N0cmVhbSc7XG5pbXBvcnQgeyBTdHJlYW1NYW5hZ2VyIH0gZnJvbSAnLi9TdHJlYW1NYW5hZ2VyJztcbmltcG9ydCB7IFN1YnNjcmliZXJQcm9wZXJ0aWVzIH0gZnJvbSAnLi4vT3BlblZpZHVJbnRlcm5hbC9JbnRlcmZhY2VzL1B1YmxpYy9TdWJzY3JpYmVyUHJvcGVydGllcyc7XG5cblxuLyoqXG4gKiBQYWNrcyByZW1vdGUgbWVkaWEgc3RyZWFtcy4gUGFydGljaXBhbnRzIGF1dG9tYXRpY2FsbHkgcmVjZWl2ZSB0aGVtIHdoZW4gb3RoZXJzIHB1Ymxpc2ggdGhlaXIgc3RyZWFtcy4gSW5pdGlhbGl6ZWQgd2l0aCBbW1Nlc3Npb24uc3Vic2NyaWJlXV0gbWV0aG9kXG4gKi9cbmV4cG9ydCBjbGFzcyBTdWJzY3JpYmVyIGV4dGVuZHMgU3RyZWFtTWFuYWdlciB7XG5cbiAgICBwcml2YXRlIHByb3BlcnRpZXM6IFN1YnNjcmliZXJQcm9wZXJ0aWVzO1xuXG4gICAgLyoqXG4gICAgICogQGhpZGRlblxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHN0cmVhbTogU3RyZWFtLCB0YXJnRWw6IHN0cmluZyB8IEhUTUxFbGVtZW50LCBwcm9wZXJ0aWVzOiBTdWJzY3JpYmVyUHJvcGVydGllcykge1xuICAgICAgICBzdXBlcihzdHJlYW0sIHRhcmdFbCk7XG4gICAgICAgIHRoaXMuZWxlbWVudCA9IHRoaXMudGFyZ2V0RWxlbWVudDtcbiAgICAgICAgdGhpcy5zdHJlYW0gPSBzdHJlYW07XG4gICAgICAgIHRoaXMucHJvcGVydGllcyA9IHByb3BlcnRpZXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU3Vic2NyaWJlIG9yIHVuc3Vic2NyaWJlIGZyb20gdGhlIGF1ZGlvIHN0cmVhbSAoaWYgYXZhaWxhYmxlKS4gQ2FsbGluZyB0aGlzIG1ldGhvZCB0d2ljZSBpbiBhIHJvdyBwYXNzaW5nIHNhbWUgdmFsdWUgd2lsbCBoYXZlIG5vIGVmZmVjdFxuICAgICAqIEBwYXJhbSB2YWx1ZSBgdHJ1ZWAgdG8gc3Vic2NyaWJlIHRvIHRoZSBhdWRpbyBzdHJlYW0sIGBmYWxzZWAgdG8gdW5zdWJzY3JpYmUgZnJvbSBpdFxuICAgICAqL1xuICAgIHN1YnNjcmliZVRvQXVkaW8odmFsdWU6IGJvb2xlYW4pOiBTdWJzY3JpYmVyIHtcbiAgICAgICAgdGhpcy5zdHJlYW0uZ2V0TWVkaWFTdHJlYW0oKS5nZXRBdWRpb1RyYWNrcygpLmZvckVhY2goKHRyYWNrKSA9PiB7XG4gICAgICAgICAgICB0cmFjay5lbmFibGVkID0gdmFsdWU7XG4gICAgICAgIH0pO1xuICAgICAgICBjb25zb2xlLmluZm8oXCInU3Vic2NyaWJlcicgaGFzIFwiICsgKHZhbHVlID8gJ3N1YnNjcmliZWQgdG8nIDogJ3Vuc3Vic2NyaWJlZCBmcm9tJykgKyAnIGl0cyBhdWRpbyBzdHJlYW0nKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU3Vic2NyaWJlIG9yIHVuc3Vic2NyaWJlIGZyb20gdGhlIHZpZGVvIHN0cmVhbSAoaWYgYXZhaWxhYmxlKS4gQ2FsbGluZyB0aGlzIG1ldGhvZCB0d2ljZSBpbiBhIHJvdyBwYXNzaW5nIHNhbWUgdmFsdWUgd2lsbCBoYXZlIG5vIGVmZmVjdFxuICAgICAqIEBwYXJhbSB2YWx1ZSBgdHJ1ZWAgdG8gc3Vic2NyaWJlIHRvIHRoZSB2aWRlbyBzdHJlYW0sIGBmYWxzZWAgdG8gdW5zdWJzY3JpYmUgZnJvbSBpdFxuICAgICAqL1xuICAgIHN1YnNjcmliZVRvVmlkZW8odmFsdWU6IGJvb2xlYW4pOiBTdWJzY3JpYmVyIHtcbiAgICAgICAgdGhpcy5zdHJlYW0uZ2V0TWVkaWFTdHJlYW0oKS5nZXRWaWRlb1RyYWNrcygpLmZvckVhY2goKHRyYWNrKSA9PiB7XG4gICAgICAgICAgICB0cmFjay5lbmFibGVkID0gdmFsdWU7XG4gICAgICAgIH0pO1xuICAgICAgICBjb25zb2xlLmluZm8oXCInU3Vic2NyaWJlcicgaGFzIFwiICsgKHZhbHVlID8gJ3N1YnNjcmliZWQgdG8nIDogJ3Vuc3Vic2NyaWJlZCBmcm9tJykgKyAnIGl0cyB2aWRlbyBzdHJlYW0nKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG59IiwiLypcbiAqIChDKSBDb3B5cmlnaHQgMjAxNy0yMDE4IE9wZW5WaWR1IChodHRwczovL29wZW52aWR1LmlvLylcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICpcbiAqL1xuXG5leHBvcnQgZW51bSBMb2NhbFJlY29yZGVyU3RhdGUge1xuICAgIFJFQURZID0gJ1JFQURZJyxcbiAgICBSRUNPUkRJTkcgPSAnUkVDT1JESU5HJyxcbiAgICBQQVVTRUQgPSAnUEFVU0VEJyxcbiAgICBGSU5JU0hFRCA9ICdGSU5JU0hFRCdcbn0iLCIvKlxuICogKEMpIENvcHlyaWdodCAyMDE3LTIwMTggT3BlblZpZHUgKGh0dHBzOi8vb3BlbnZpZHUuaW8vKVxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKlxuICovXG5cbi8qKlxuICogRGVmaW5lcyBwcm9wZXJ0eSBbW09wZW5WaWR1RXJyb3IubmFtZV1dXG4gKi9cbmV4cG9ydCBlbnVtIE9wZW5WaWR1RXJyb3JOYW1lIHtcblxuICAgIC8qKlxuICAgICAqIEJyb3dzZXIgaXMgbm90IHN1cHBvcnRlZCBieSBPcGVuVmlkdS5cbiAgICAgKiBSZXR1cm5lZCB1cHBvbiB1bnN1Y2Nlc3NmdWwgW1tTZXNzaW9uLmNvbm5lY3RdXVxuICAgICAqL1xuICAgIEJST1dTRVJfTk9UX1NVUFBPUlRFRCA9ICdCUk9XU0VSX05PVF9TVVBQT1JURUQnLFxuXG4gICAgLyoqXG4gICAgICogVGhlIHVzZXIgaGFzbid0IGdyYW50ZWQgcGVybWlzc2lvbnMgdG8gdGhlIHJlcXVpcmVkIGlucHV0IGRldmljZSB3aGVuIHRoZSBicm93c2VyIGFza2VkIGZvciB0aGVtLlxuICAgICAqIFJldHVybmVkIHVwcG9uIHVuc3VjY2Vzc2Z1bCBbW09wZW5WaWR1LmluaXRQdWJsaXNoZXJdXSBvciBbW09wZW5WaWR1LmdldFVzZXJNZWRpYV1dXG4gICAgICovXG4gICAgREVWSUNFX0FDQ0VTU19ERU5JRUQgPSAnREVWSUNFX0FDQ0VTU19ERU5JRUQnLFxuXG4gICAgLyoqXG4gICAgICogVGhlIHVzZXIgaGFzbid0IGdyYW50ZWQgcGVybWlzc2lvbnMgdG8gY2FwdHVyZSBzb21lIGRlc2t0b3Agc2NyZWVuIHdoZW4gdGhlIGJyb3dzZXIgYXNrZWQgZm9yIHRoZW0uXG4gICAgICogUmV0dXJuZWQgdXBwb24gdW5zdWNjZXNzZnVsIFtbT3BlblZpZHUuaW5pdFB1Ymxpc2hlcl1dIG9yIFtbT3BlblZpZHUuZ2V0VXNlck1lZGlhXV1cbiAgICAgKi9cbiAgICBTQ1JFRU5fQ0FQVFVSRV9ERU5JRUQgPSAnU0NSRUVOX0NBUFRVUkVfREVOSUVEJyxcblxuICAgIC8qKlxuICAgICAqIEJyb3dzZXIgZG9lcyBub3Qgc3VwcG9ydCBzY3JlZW4gc2hhcmluZy5cbiAgICAgKiBSZXR1cm5lZCB1cHBvbiB1bnN1Y2Nlc3NmdWwgW1tPcGVuVmlkdS5pbml0UHVibGlzaGVyXV1cbiAgICAgKi9cbiAgICBTQ1JFRU5fU0hBUklOR19OT1RfU1VQUE9SVEVEID0gJ1NDUkVFTl9TSEFSSU5HX05PVF9TVVBQT1JURUQnLFxuXG4gICAgLyoqXG4gICAgICogT25seSBmb3IgQ2hyb21lLCB0aGVyZSdzIG5vIHNjcmVlbiBzaGFyaW5nIGV4dGVuc2lvbiBpbnN0YWxsZWRcbiAgICAgKiBSZXR1cm5lZCB1cHBvbiB1bnN1Y2Nlc3NmdWwgW1tPcGVuVmlkdS5pbml0UHVibGlzaGVyXV1cbiAgICAgKi9cbiAgICBTQ1JFRU5fRVhURU5TSU9OX05PVF9JTlNUQUxMRUQgPSAnU0NSRUVOX0VYVEVOU0lPTl9OT1RfSU5TVEFMTEVEJyxcblxuICAgIC8qKlxuICAgICAqIE9ubHkgZm9yIENocm9tZSwgdGhlIHNjcmVlbiBzaGFyaW5nIGV4dGVuc2lvbiBpcyBpbnN0YWxsZWQgYnV0IGlzIGRpc2FibGVkXG4gICAgICogUmV0dXJuZWQgdXBwb24gdW5zdWNjZXNzZnVsIFtbT3BlblZpZHUuaW5pdFB1Ymxpc2hlcl1dXG4gICAgICovXG4gICAgU0NSRUVOX0VYVEVOU0lPTl9ESVNBQkxFRCA9ICdTQ1JFRU5fRVhURU5TSU9OX0RJU0FCTEVEJyxcblxuICAgIC8qKlxuICAgICAqIE5vIHZpZGVvIGlucHV0IGRldmljZSBmb3VuZCB3aXRoIHRoZSBwcm92aWRlZCBkZXZpY2VJZCAocHJvcGVydHkgW1tQdWJsaXNoZXJQcm9wZXJ0aWVzLnZpZGVvU291cmNlXV0pXG4gICAgICogUmV0dXJuZWQgdXBwb24gdW5zdWNjZXNzZnVsIFtbT3BlblZpZHUuaW5pdFB1Ymxpc2hlcl1dXG4gICAgICovXG4gICAgSU5QVVRfVklERU9fREVWSUNFX05PVF9GT1VORCA9ICdJTlBVVF9WSURFT19ERVZJQ0VfTk9UX0ZPVU5EJyxcblxuICAgIC8qKlxuICAgICAqIE5vIGF1ZGlvIGlucHV0IGRldmljZSBmb3VuZCB3aXRoIHRoZSBwcm92aWRlZCBkZXZpY2VJZCAocHJvcGVydHkgW1tQdWJsaXNoZXJQcm9wZXJ0aWVzLmF1ZGlvU291cmNlXV0pXG4gICAgICogUmV0dXJuZWQgdXBwb24gdW5zdWNjZXNzZnVsIFtbT3BlblZpZHUuaW5pdFB1Ymxpc2hlcl1dXG4gICAgICovXG4gICAgSU5QVVRfQVVESU9fREVWSUNFX05PVF9GT1VORCA9ICdJTlBVVF9BVURJT19ERVZJQ0VfTk9UX0ZPVU5EJyxcblxuICAgIC8qKlxuICAgICAqIE1ldGhvZCBbW09wZW5WaWR1LmluaXRQdWJsaXNoZXJdXSBoYXMgYmVlbiBjYWxsZWQgd2l0aCBwcm9wZXJ0aWVzIGB2aWRlb1NvdXJjZWAgYW5kIGBhdWRpb1NvdXJjZWAgb2ZcbiAgICAgKiBbW1B1Ymxpc2hlclByb3BlcnRpZXNdXSBwYXJhbWV0ZXIgYm90aCBzZXQgdG8gKmZhbHNlKiBvciAqbnVsbCpcbiAgICAgKi9cbiAgICBOT19JTlBVVF9TT1VSQ0VfU0VUID0gJ05PX0lOUFVUX1NPVVJDRV9TRVQnLFxuXG4gICAgLyoqXG4gICAgICogU29tZSBtZWRpYSBwcm9wZXJ0eSBvZiBbW1B1Ymxpc2hlclByb3BlcnRpZXNdXSBzdWNoIGFzIGBmcmFtZVJhdGVgIG9yIGByZXNvbHV0aW9uYCBpcyBub3Qgc3VwcG9ydGVkXG4gICAgICogYnkgdGhlIGlucHV0IGRldmljZXMgKHdoZW5ldmVyIGl0IGlzIHBvc3NpYmxlIHRoZXkgYXJlIGF1dG9tYXRpY2FsbHkgYWRqdXN0ZWQgdG8gdGhlIG1vc3Qgc2ltaWxhciB2YWx1ZSkuXG4gICAgICogUmV0dXJuZWQgdXBwb24gdW5zdWNjZXNzZnVsIFtbT3BlblZpZHUuaW5pdFB1Ymxpc2hlcl1dXG4gICAgICovXG4gICAgUFVCTElTSEVSX1BST1BFUlRJRVNfRVJST1IgPSAnUFVCTElTSEVSX1BST1BFUlRJRVNfRVJST1InLFxuXG4gICAgLyoqXG4gICAgICogX05vdCBpbiB1c2UgeWV0X1xuICAgICAqL1xuICAgIE9QRU5WSURVX1BFUk1JU1NJT05fREVOSUVEID0gJ09QRU5WSURVX1BFUk1JU1NJT05fREVOSUVEJyxcblxuICAgIC8qKlxuICAgICAqIF9Ob3QgaW4gdXNlIHlldF9cbiAgICAgKi9cbiAgICBPUEVOVklEVV9OT1RfQ09OTkVDVEVEID0gJ09QRU5WSURVX05PVF9DT05ORUNURUQnLFxuXG4gICAgLyoqXG4gICAgICogX05vdCBpbiB1c2UgeWV0X1xuICAgICAqL1xuICAgIEdFTkVSSUNfRVJST1IgPSAnR0VORVJJQ19FUlJPUidcbn1cblxuLyoqXG4gKiBTaW1wbGUgb2JqZWN0IHRvIGlkZW50aWZ5IHJ1bnRpbWUgZXJyb3JzIG9uIHRoZSBjbGllbnQgc2lkZVxuICovXG5leHBvcnQgY2xhc3MgT3BlblZpZHVFcnJvciB7XG5cbiAgICBuYW1lOiBPcGVuVmlkdUVycm9yTmFtZTtcbiAgICBtZXNzYWdlOiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBAaGlkZGVuXG4gICAgICovXG4gICAgY29uc3RydWN0b3IobmFtZTogT3BlblZpZHVFcnJvck5hbWUsIG1lc3NhZ2U6IHN0cmluZykge1xuICAgICAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgICAgICB0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlO1xuICAgIH1cblxufSIsIi8qXG4gKiAoQykgQ29weXJpZ2h0IDIwMTctMjAxOCBPcGVuVmlkdSAoaHR0cHM6Ly9vcGVudmlkdS5pby8pXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqXG4gKi9cblxuLyoqXG4gKiBIb3cgdGhlIHZpZGVvIHdpbGwgYmUgaW5zZXJ0ZWQgaW4gdGhlIERPTSBmb3IgUHVibGlzaGVycyBhbmQgU3Vic2NyaWJlcnMuIFNlZSBbW1B1Ymxpc2hlclByb3BlcnRpZXMuaW5zZXJ0TW9kZV1dIGFuZCBbW1N1YnNjcmliZXJQcm9wZXJ0aWVzLmluc2VydE1vZGVdXVxuICovXG5leHBvcnQgZW51bSBWaWRlb0luc2VydE1vZGUge1xuXG4gICAgLyoqXG4gICAgICogVmlkZW8gaW5zZXJ0ZWQgYWZ0ZXIgdGhlIHRhcmdldCBlbGVtZW50IChhcyBuZXh0IHNpYmxpbmcpXG4gICAgICovXG4gICAgQUZURVIgPSAnQUZURVInLFxuICAgIC8qKlxuICAgICAqIFZpZGVvIGluc2VydGVkIGFzIGxhc3QgY2hpbGQgb2YgdGhlIHRhcmdldCBlbGVtZW50XG4gICAgICovXG4gICAgQVBQRU5EID0gJ0FQUEVORCcsXG4gICAgLyoqXG4gICAgICogVmlkZW8gaW5zZXJ0ZWQgYmVmb3JlIHRoZSB0YXJnZXQgZWxlbWVudCAoYXMgcHJldmlvdXMgc2libGluZylcbiAgICAgKi9cbiAgICBCRUZPUkUgPSAnQkVGT1JFJyxcbiAgICAvKipcbiAgICAgKiBWaWRlbyBpbnNlcnRlZCBhcyBmaXJzdCBjaGlsZCBvZiB0aGUgdGFyZ2V0IGVsZW1lbnRcbiAgICAgKi9cbiAgICBQUkVQRU5EID0gJ1BSRVBFTkQnLFxuICAgIC8qKlxuICAgICAqIFZpZGVvIHJlcGxhY2VzIHRhcmdldCBlbGVtZW50XG4gICAgICovXG4gICAgUkVQTEFDRSA9ICdSRVBMQUNFJ1xuXG59IiwiLypcbiAqIChDKSBDb3B5cmlnaHQgMjAxNy0yMDE4IE9wZW5WaWR1IChodHRwczovL29wZW52aWR1LmlvLylcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICpcbiAqL1xuXG5pbXBvcnQgeyBFdmVudCB9IGZyb20gJy4vRXZlbnQnO1xuaW1wb3J0IHsgQ29ubmVjdGlvbiB9IGZyb20gJy4uLy4uL09wZW5WaWR1L0Nvbm5lY3Rpb24nO1xuaW1wb3J0IHsgU2Vzc2lvbiB9IGZyb20gJy4uLy4uL09wZW5WaWR1L1Nlc3Npb24nO1xuXG5cbi8qKlxuICogRGVmaW5lcyB0aGUgZm9sbG93aW5nIGV2ZW50czpcbiAqIC0gYGNvbm5lY3Rpb25DcmVhdGVkYDogZGlzcGF0Y2hlZCBieSBbW1Nlc3Npb25dXVxuICogLSBgY29ubmVjdGlvbkRlc3Ryb3llZGA6IGRpc3BhdGNoZWQgYnkgW1tTZXNzaW9uXV1cbiAqL1xuZXhwb3J0IGNsYXNzIENvbm5lY3Rpb25FdmVudCBleHRlbmRzIEV2ZW50IHtcblxuICAgIC8qKlxuICAgICAqIENvbm5lY3Rpb24gb2JqZWN0IHRoYXQgd2FzIGNyZWF0ZWQgb3IgZGVzdHJveWVkXG4gICAgICovXG4gICAgY29ubmVjdGlvbjogQ29ubmVjdGlvbjtcblxuICAgIC8qKlxuICAgICAqIEZvciAnY29ubmVjdGlvbkRlc3Ryb3llZCcgZXZlbnQ6XG4gICAgICogLSBcImRpc2Nvbm5lY3RcIjogdGhlIHJlbW90ZSB1c2VyIGhhcyBjYWxsZWQgYFNlc3Npb24uZGlzY29ubmVjdCgpYFxuICAgICAqIC0gXCJuZXR3b3JrRGlzY29ubmVjdFwiOiB0aGUgcmVtb3RlIHVzZXIgbmV0d29yayBjb25uZWN0aW9uIGhhcyBkcm9wcGVkXG4gICAgICpcbiAgICAgKiBGb3IgJ2Nvbm5lY3Rpb25DcmVhdGVkJyBlbXB0eSBzdHJpbmdcbiAgICAgKi9cbiAgICByZWFzb246IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIEBoaWRkZW5cbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihjYW5jZWxhYmxlOiBib29sZWFuLCB0YXJnZXQ6IFNlc3Npb24sIHR5cGU6IHN0cmluZywgY29ubmVjdGlvbjogQ29ubmVjdGlvbiwgcmVhc29uOiBzdHJpbmcpIHtcbiAgICAgICAgc3VwZXIoY2FuY2VsYWJsZSwgdGFyZ2V0LCB0eXBlKTtcbiAgICAgICAgdGhpcy5jb25uZWN0aW9uID0gY29ubmVjdGlvbjtcbiAgICAgICAgdGhpcy5yZWFzb24gPSByZWFzb247XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGhpZGRlblxuICAgICAqL1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1lbXB0eVxuICAgIGNhbGxEZWZhdWx0QmVoYXZpb3VyKCkgeyB9XG5cbn0iLCIvKlxuICogKEMpIENvcHlyaWdodCAyMDE3LTIwMTggT3BlblZpZHUgKGh0dHBzOi8vb3BlbnZpZHUuaW8vKVxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKlxuICovXG5cbmltcG9ydCB7IFN0cmVhbU1hbmFnZXIgfSBmcm9tICcuLi8uLi9PcGVuVmlkdS9TdHJlYW1NYW5hZ2VyJztcbmltcG9ydCB7IFNlc3Npb24gfSBmcm9tICcuLi8uLi9PcGVuVmlkdS9TZXNzaW9uJztcblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEV2ZW50IHtcblxuICAgIC8qKlxuICAgICAqIFdoZXRoZXIgdGhlIGV2ZW50IGhhcyBhIGRlZmF1bHQgYmVoYXZpb3VyIHRoYXQgbWF5IGJlIHByZXZlbnRlZCBieSBjYWxsaW5nIFtbRXZlbnQucHJldmVudERlZmF1bHRdXVxuICAgICAqL1xuICAgIGNhbmNlbGFibGU6IGJvb2xlYW47XG5cbiAgICAvKipcbiAgICAgKiBUaGUgb2JqZWN0IHRoYXQgZGlzcGF0Y2hlZCB0aGUgZXZlbnRcbiAgICAgKi9cbiAgICB0YXJnZXQ6IFNlc3Npb24gfCBTdHJlYW1NYW5hZ2VyO1xuXG4gICAgLyoqXG4gICAgICogVGhlIHR5cGUgb2YgZXZlbnQuIFRoaXMgaXMgdGhlIHNhbWUgc3RyaW5nIHlvdSBwYXNzIGFzIGZpcnN0IHBhcmFtZXRlciB3aGVuIGNhbGxpbmcgbWV0aG9kIGBvbigpYCBvZiBhbnkgb2JqZWN0IGltcGxlbWVudGluZyBbW0V2ZW50RGlzcGF0Y2hlcl1dIGludGVyZmFjZVxuICAgICAqL1xuICAgIHR5cGU6IHN0cmluZztcblxuICAgIHByaXZhdGUgaGFzQmVlblByZXZlbnRlZCA9IGZhbHNlO1xuXG4gICAgLyoqXG4gICAgICogQGhpZGRlblxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGNhbmNlbGFibGU6IGJvb2xlYW4sIHRhcmdldDogU2Vzc2lvbiB8IFN0cmVhbU1hbmFnZXIsIHR5cGU6IHN0cmluZykge1xuICAgICAgICB0aGlzLmNhbmNlbGFibGUgPSBjYW5jZWxhYmxlO1xuICAgICAgICB0aGlzLnRhcmdldCA9IHRhcmdldDtcbiAgICAgICAgdGhpcy50eXBlID0gdHlwZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBXaGV0aGVyIHRoZSBkZWZhdWx0IGJlYWhpdm91ciBvZiB0aGUgZXZlbnQgaGFzIGJlZW4gcHJldmVudGVkIG9yIG5vdC4gQ2FsbCBbW0V2ZW50LnByZXZlbnREZWZhdWx0XV0gdG8gcHJldmVudCBpdFxuICAgICAqL1xuICAgIGlzRGVmYXVsdFByZXZlbnRlZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaGFzQmVlblByZXZlbnRlZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQcmV2ZW50cyB0aGUgZGVmYXVsdCBiZWhhdmlvdXIgb2YgdGhlIGV2ZW50LiBUaGUgZm9sbG93aW5nIGV2ZW50cyBoYXZlIGEgZGVmYXVsdCBiZWhhdmlvdXI6XG4gICAgICpcbiAgICAgKiAtIGBzZXNzaW9uRGlzY29ubmVjdGVkYDogZGlzcGF0Y2hlZCBieSBbW1Nlc3Npb25dXSBvYmplY3QsIGF1dG9tYXRpY2FsbHkgdW5zdWJzY3JpYmVzIHRoZSBsZWF2aW5nIHBhcnRpY2lwYW50IGZyb20gZXZlcnkgU3Vic2NyaWJlciBvYmplY3Qgb2YgdGhlIHNlc3Npb24gKHRoaXMgaW5jbHVkZXMgY2xvc2luZyB0aGUgV2ViUlRDUGVlciBjb25uZWN0aW9uIGFuZCBkaXNwb3NpbmcgYWxsIE1lZGlhU3RyZWFtVHJhY2tzKVxuICAgICAqIGFuZCBhbHNvIGRlbGV0ZXMgYW55IEhUTUwgdmlkZW8gZWxlbWVudCBhc3NvY2lhdGVkIHRvIGVhY2ggU3Vic2NyaWJlciAob25seSB0aG9zZSBjcmVhdGVkIGJ5IE9wZW5WaWR1IEJyb3dzZXIsIGVpdGhlciBieSBwYXNzaW5nIGEgdmFsaWQgcGFyYW1ldGVyIGFzIGB0YXJnZXRFbGVtZW50YCBpbiBtZXRob2QgW1tTZXNzaW9uLnN1YnNjcmliZV1dIG9yXG4gICAgICogYnkgY2FsbGluZyBbW1N1YnNjcmliZXIuY3JlYXRlVmlkZW9FbGVtZW50XV0pLiBGb3IgZXZlcnkgdmlkZW8gcmVtb3ZlZCwgZWFjaCBTdWJzY3JpYmVyIG9iamVjdCB3aWxsIGFsc28gZGlzcGF0Y2ggYSBgdmlkZW9FbGVtZW50RGVzdHJveWVkYCBldmVudC5cbiAgICAgKlxuICAgICAqIC0gYHN0cmVhbURlc3Ryb3llZGA6XG4gICAgICogICAtIElmIGRpc3BhdGNoZWQgYnkgYSBbW1B1Ymxpc2hlcl1dICgqeW91KiBoYXZlIHVucHVibGlzaGVkKTogYXV0b21hdGljYWxseSBzdG9wcyBhbGwgbWVkaWEgdHJhY2tzIGFuZCBkZWxldGVzIGFueSBIVE1MIHZpZGVvIGVsZW1lbnQgYXNzb2NpYXRlZCB0byBpdCAob25seSB0aG9zZSBjcmVhdGVkIGJ5IE9wZW5WaWR1IEJyb3dzZXIsIGVpdGhlciBieSBwYXNzaW5nIGEgdmFsaWQgcGFyYW1ldGVyIGFzIGB0YXJnZXRFbGVtZW50YFxuICAgICAqIGluIG1ldGhvZCBbW09wZW5WaWR1LmluaXRQdWJsaXNoZXJdXSBvciBieSBjYWxsaW5nIFtbUHVibGlzaGVyLmNyZWF0ZVZpZGVvRWxlbWVudF1dKS4gRm9yIGV2ZXJ5IHZpZGVvIHJlbW92ZWQsIHRoZSBQdWJsaXNoZXIgb2JqZWN0IHdpbGwgYWxzbyBkaXNwYXRjaCBhIGB2aWRlb0VsZW1lbnREZXN0cm95ZWRgIGV2ZW50LlxuICAgICAqICAgLSBJZiBkaXNwYXRjaGVkIGJ5IFtbU2Vzc2lvbl1dICgqb3RoZXIgdXNlciogaGFzIHVucHVibGlzaGVkKTogYXV0b21hdGljYWxseSB1bnN1YnNjcmliZXMgdGhlIHByb3BlciBTdWJzY3JpYmVyIG9iamVjdCBmcm9tIHRoZSBzZXNzaW9uICh0aGlzIGluY2x1ZGVzIGNsb3NpbmcgdGhlIFdlYlJUQ1BlZXIgY29ubmVjdGlvbiBhbmQgZGlzcG9zaW5nIGFsbCBNZWRpYVN0cmVhbVRyYWNrcylcbiAgICAgKiBhbmQgYWxzbyBkZWxldGVzIGFueSBIVE1MIHZpZGVvIGVsZW1lbnQgYXNzb2NpYXRlZCB0byB0aGF0IFN1YnNjcmliZXIgKG9ubHkgdGhvc2UgY3JlYXRlZCBieSBPcGVuVmlkdSBCcm93c2VyLCBlaXRoZXIgYnkgcGFzc2luZyBhIHZhbGlkIHBhcmFtZXRlciBhcyBgdGFyZ2V0RWxlbWVudGAgaW4gbWV0aG9kIFtbU2Vzc2lvbi5zdWJzY3JpYmVdXSBvclxuICAgICAqIGJ5IGNhbGxpbmcgW1tTdWJzY3JpYmVyLmNyZWF0ZVZpZGVvRWxlbWVudF1dKS4gRm9yIGV2ZXJ5IHZpZGVvIHJlbW92ZWQsIHRoZSBTdWJzY3JpYmVyIG9iamVjdCB3aWxsIGFsc28gZGlzcGF0Y2ggYSBgdmlkZW9FbGVtZW50RGVzdHJveWVkYCBldmVudC5cbiAgICAgKi9cbiAgICBwcmV2ZW50RGVmYXVsdCgpIHtcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWVtcHR5XG4gICAgICAgIHRoaXMuY2FsbERlZmF1bHRCZWhhdmlvdXIgPSAoKSA9PiB7IH07XG4gICAgICAgIHRoaXMuaGFzQmVlblByZXZlbnRlZCA9IHRydWU7XG4gICAgfVxuXG4gICAgcHJvdGVjdGVkIGFic3RyYWN0IGNhbGxEZWZhdWx0QmVoYXZpb3VyKCk7XG5cbn0iLCIvKlxuICogKEMpIENvcHlyaWdodCAyMDE3LTIwMTggT3BlblZpZHUgKGh0dHBzOi8vb3BlbnZpZHUuaW8vKVxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKlxuICovXG5cbmltcG9ydCB7IEV2ZW50IH0gZnJvbSAnLi9FdmVudCc7XG5pbXBvcnQgeyBDb25uZWN0aW9uIH0gZnJvbSAnLi4vLi4vT3BlblZpZHUvQ29ubmVjdGlvbic7XG5pbXBvcnQgeyBTZXNzaW9uIH0gZnJvbSAnLi4vLi4nO1xuXG5cbi8qKlxuICogRGVmaW5lcyB0aGUgZm9sbG93aW5nIGV2ZW50czpcbiAqIC0gYHB1Ymxpc2hlclN0YXJ0U3BlYWtpbmdgOiBkaXNwYXRjaGVkIGJ5IFtbU2Vzc2lvbl1dXG4gKiAtIGBwdWJsaXNoZXJTdG9wU3BlYWtpbmdgOiBkaXNwYXRjaGVkIGJ5IFtbU2Vzc2lvbl1dXG4gKlxuICogTW9yZSBpbmZvcm1hdGlvbjpcbiAqIC0gVGhpcyBldmVudHMgd2lsbCBvbmx5IGJlIHRyaWdnZXJlZCBmb3IgKipyZW1vdGUgc3RyZWFtcyB0aGF0IGhhdmUgYXVkaW8gdHJhY2tzKipcbiAqIC0gQm90aCBldmVudHMgc2hhcmUgdGhlIHNhbWUgbGlmZWN5Y2xlLiBUaGF0IG1lYW5zIHRoYXQgeW91IGNhbiBzdWJzY3JpYmUgdG8gb25seSBvbmUgb2YgdGhlbSBpZiB5b3Ugd2FudCwgYnV0IGlmIHlvdSBjYWxsIGBTZXNzaW9uLm9mZigncHVibGlzaGVyU3RvcFNwZWFraW5nJylgLFxuICoga2VlcCBpbiBtaW5kIHRoYXQgdGhpcyB3aWxsIGFsc28gaW50ZXJuYWxseSByZW1vdmUgYW55ICdwdWJsaXNoZXJTdGFydFNwZWFraW5nJyBldmVudFxuICogLSBZb3UgY2FuIGZ1cnRoZXIgY29uZmlndXJlIGhvdyB0aGUgZXZlbnRzIGFyZSBkaXNwYXRjaGVkIGJ5IHNldHRpbmcgcHJvcGVydHkgYHB1Ymxpc2hlclNwZWFraW5nRXZlbnRzT3B0aW9uc2AgaW4gdGhlIGNhbGwgb2YgW1tPcGVuVmlkdS5zZXRBZHZhbmNlZENvbmZpZ3VyYXRpb25dXVxuICovXG5leHBvcnQgY2xhc3MgUHVibGlzaGVyU3BlYWtpbmdFdmVudCBleHRlbmRzIEV2ZW50IHtcblxuICAgIC8qKlxuICAgICAqIFRoZSBjbGllbnQgdGhhdCBzdGFydGVkIG9yIHN0b3BwZWQgc3BlYWtpbmdcbiAgICAgKi9cbiAgICBjb25uZWN0aW9uOiBDb25uZWN0aW9uO1xuXG4gICAgLyoqXG4gICAgICogVGhlIHN0cmVhbUlkIG9mIHRoZSBTdHJlYW0gYWZmZWN0ZWQgYnkgdGhlIHNwZWFraW5nIGV2ZW50XG4gICAgICovXG4gICAgc3RyZWFtSWQ6IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIEBoaWRkZW5cbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcih0YXJnZXQ6IFNlc3Npb24sIHR5cGU6IHN0cmluZywgY29ubmVjdGlvbjogQ29ubmVjdGlvbiwgc3RyZWFtSWQ6IHN0cmluZykge1xuICAgICAgICBzdXBlcihmYWxzZSwgdGFyZ2V0LCB0eXBlKTtcbiAgICAgICAgdGhpcy50eXBlID0gdHlwZTtcbiAgICAgICAgdGhpcy5jb25uZWN0aW9uID0gY29ubmVjdGlvbjtcbiAgICAgICAgdGhpcy5zdHJlYW1JZCA9IHN0cmVhbUlkO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBoaWRkZW5cbiAgICAgKi9cbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tZW1wdHlcbiAgICBjYWxsRGVmYXVsdEJlaGF2aW91cigpIHsgfVxuXG59IiwiLypcbiAqIChDKSBDb3B5cmlnaHQgMjAxNy0yMDE4IE9wZW5WaWR1IChodHRwczovL29wZW52aWR1LmlvLylcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICpcbiAqL1xuXG5pbXBvcnQgeyBFdmVudCB9IGZyb20gJy4vRXZlbnQnO1xuaW1wb3J0IHsgU2Vzc2lvbiB9IGZyb20gJy4uLy4uL09wZW5WaWR1L1Nlc3Npb24nO1xuXG5cbi8qKlxuICogRGVmaW5lcyB0aGUgZm9sbG93aW5nIGV2ZW50czpcbiAqIC0gYHJlY29yZGluZ1N0YXJ0ZWRgOiBkaXNwYXRjaGVkIGJ5IFtbU2Vzc2lvbl1dXG4gKiAtIGByZWNvcmRpbmdTdG9wcGVkYDogZGlzcGF0Y2hlZCBieSBbW1Nlc3Npb25dXVxuICovXG5leHBvcnQgY2xhc3MgUmVjb3JkaW5nRXZlbnQgZXh0ZW5kcyBFdmVudCB7XG5cbiAgICAvKipcbiAgICAgKiBUaGUgcmVjb3JkaW5nIElEIGdlbmVyYXRlZCBpbiBvcGVudmlkdS1zZXJ2ZXJcbiAgICAgKi9cbiAgICBpZDogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogVGhlIHJlY29yZGluZyBuYW1lIHlvdSBzdXBwbGllZCB0byBvcGVudmlkdS1zZXJ2ZXIuIEZvciBleGFtcGxlLCB0byBuYW1lIHlvdXIgcmVjb3JkaW5nIGZpbGUgTVlfUkVDT1JESU5HOlxuICAgICAqIC0gV2l0aCAqKkFQSSBSRVNUKio6IFBPU1QgdG8gYC9hcGkvcmVjb3JkaW5ncy9zdGFydGAgcGFzc2luZyBKU09OIGJvZHkgYHtcInNlc3Npb25cIjpcInNlc3Npb25JZFwiLFwibmFtZVwiOlwiTVlfUkVDT1JESU5HXCJ9YFxuICAgICAqIC0gV2l0aCAqKm9wZW52aWR1LWphdmEtY2xpZW50Kio6IGBPcGVuVmlkdS5zdGFydFJlY29yZGluZyhzZXNzaW9uSWQsIE1ZX1JFQ09SRElORylgIG9yIGBPcGVuVmlkdS5zdGFydFJlY29yZGluZyhzZXNzaW9uSWQsIG5ldyBSZWNvcmRpbmdQcm9wZXJ0aWVzLkJ1aWxkZXIoKS5uYW1lKE1ZX1JFQ09SRElORykuYnVpbGQoKSlgXG4gICAgICogLSBXaXRoICoqb3BlbnZpZHUtbm9kZS1jbGllbnQqKjogYE9wZW5WaWR1LnN0YXJ0UmVjb3JkaW5nKHNlc3Npb25JZCwgTVlfUkVDT1JESU5HKWAgb3IgYE9wZW5WaWR1LnN0YXJ0UmVjb3JkaW5nKHNlc3Npb25JZCwgbmV3IFJlY29yZGluZ1Byb3BlcnRpZXMuQnVpbGRlcigpLm5hbWUoTVlfUkVDT1JESU5HKS5idWlsZCgpKWBcbiAgICAgKlxuICAgICAqIElmIG5vIG5hbWUgaXMgc3VwcGxpZWQsIHRoaXMgcHJvcGVydHkgd2lsbCBiZSB1bmRlZmluZWQgYW5kIHRoZSByZWNvcmRlZCBmaWxlIHdpbGwgYmUgbmFtZWQgYWZ0ZXIgcHJvcGVydHkgW1tpZF1dXG4gICAgICovXG4gICAgbmFtZT86IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIEBoaWRkZW5cbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcih0YXJnZXQ6IFNlc3Npb24sIHR5cGU6IHN0cmluZywgaWQ6IHN0cmluZywgbmFtZTogc3RyaW5nKSB7XG4gICAgICAgIHN1cGVyKGZhbHNlLCB0YXJnZXQsIHR5cGUpO1xuICAgICAgICB0aGlzLmlkID0gaWQ7XG4gICAgICAgIGlmIChuYW1lICE9PSBpZCkge1xuICAgICAgICAgICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBoaWRkZW5cbiAgICAgKi9cbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tZW1wdHlcbiAgICBjYWxsRGVmYXVsdEJlaGF2aW91cigpIHsgfVxuXG59IiwiLypcbiAqIChDKSBDb3B5cmlnaHQgMjAxNy0yMDE4IE9wZW5WaWR1IChodHRwczovL29wZW52aWR1LmlvLylcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICpcbiAqL1xuXG5pbXBvcnQgeyBFdmVudCB9IGZyb20gJy4vRXZlbnQnO1xuaW1wb3J0IHsgU2Vzc2lvbiB9IGZyb20gJy4uLy4uL09wZW5WaWR1L1Nlc3Npb24nO1xuXG5cbi8qKlxuICogRGVmaW5lcyBldmVudCBgc2Vzc2lvbkRpc2Nvbm5lY3RlZGAgZGlzcGF0Y2hlZCBieSBbW1Nlc3Npb25dXVxuICovXG5leHBvcnQgY2xhc3MgU2Vzc2lvbkRpc2Nvbm5lY3RlZEV2ZW50IGV4dGVuZHMgRXZlbnQge1xuXG4gICAgLyoqXG4gICAgICogLSBcImRpc2Nvbm5lY3RcIjogeW91IGhhdmUgY2FsbGVkIGBTZXNzaW9uLmRpc2Nvbm5lY3QoKWBcbiAgICAgKiAtIFwibmV0d29ya0Rpc2Nvbm5lY3RcIjogeW91ciBuZXR3b3JrIGNvbm5lY3Rpb24gaGFzIGRyb3BwZWRcbiAgICAgKi9cbiAgICByZWFzb246IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIEBoaWRkZW5cbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcih0YXJnZXQ6IFNlc3Npb24sIHJlYXNvbjogc3RyaW5nKSB7XG4gICAgICAgIHN1cGVyKHRydWUsIHRhcmdldCwgJ3Nlc3Npb25EaXNjb25uZWN0ZWQnKTtcbiAgICAgICAgdGhpcy5yZWFzb24gPSByZWFzb247XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGhpZGRlblxuICAgICAqL1xuICAgIGNhbGxEZWZhdWx0QmVoYXZpb3VyKCkge1xuXG4gICAgICAgIGNvbnNvbGUuaW5mbyhcIkNhbGxpbmcgZGVmYXVsdCBiZWhhdmlvdXIgdXBvbiAnXCIgKyB0aGlzLnR5cGUgKyBcIicgZXZlbnQgZGlzcGF0Y2hlZCBieSAnU2Vzc2lvbidcIik7XG5cbiAgICAgICAgY29uc3Qgc2Vzc2lvbiA9IDxTZXNzaW9uPnRoaXMudGFyZ2V0O1xuXG4gICAgICAgIC8vIERpc3Bvc2UgYW5kIGRlbGV0ZSBhbGwgcmVtb3RlIENvbm5lY3Rpb25zXG4gICAgICAgIGZvciAoY29uc3QgY29ubmVjdGlvbklkIGluIHNlc3Npb24ucmVtb3RlQ29ubmVjdGlvbnMpIHtcbiAgICAgICAgICAgIGlmICghIXNlc3Npb24ucmVtb3RlQ29ubmVjdGlvbnNbY29ubmVjdGlvbklkXS5zdHJlYW0pIHtcbiAgICAgICAgICAgICAgICBzZXNzaW9uLnJlbW90ZUNvbm5lY3Rpb25zW2Nvbm5lY3Rpb25JZF0uc3RyZWFtLmRpc3Bvc2VXZWJSdGNQZWVyKCk7XG4gICAgICAgICAgICAgICAgc2Vzc2lvbi5yZW1vdGVDb25uZWN0aW9uc1tjb25uZWN0aW9uSWRdLnN0cmVhbS5kaXNwb3NlTWVkaWFTdHJlYW0oKTtcbiAgICAgICAgICAgICAgICBpZiAoc2Vzc2lvbi5yZW1vdGVDb25uZWN0aW9uc1tjb25uZWN0aW9uSWRdLnN0cmVhbS5zdHJlYW1NYW5hZ2VyKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlc3Npb24ucmVtb3RlQ29ubmVjdGlvbnNbY29ubmVjdGlvbklkXS5zdHJlYW0uc3RyZWFtTWFuYWdlci5yZW1vdmVBbGxWaWRlb3MoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZGVsZXRlIHNlc3Npb24ucmVtb3RlU3RyZWFtc0NyZWF0ZWRbc2Vzc2lvbi5yZW1vdGVDb25uZWN0aW9uc1tjb25uZWN0aW9uSWRdLnN0cmVhbS5zdHJlYW1JZF07XG4gICAgICAgICAgICAgICAgc2Vzc2lvbi5yZW1vdGVDb25uZWN0aW9uc1tjb25uZWN0aW9uSWRdLmRpc3Bvc2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlbGV0ZSBzZXNzaW9uLnJlbW90ZUNvbm5lY3Rpb25zW2Nvbm5lY3Rpb25JZF07XG4gICAgICAgIH1cbiAgICB9XG5cbn0iLCIvKlxuICogKEMpIENvcHlyaWdodCAyMDE3LTIwMTggT3BlblZpZHUgKGh0dHBzOi8vb3BlbnZpZHUuaW8vKVxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKlxuICovXG5cbmltcG9ydCB7IEV2ZW50IH0gZnJvbSAnLi9FdmVudCc7XG5pbXBvcnQgeyBDb25uZWN0aW9uIH0gZnJvbSAnLi4vLi4vT3BlblZpZHUvQ29ubmVjdGlvbic7XG5pbXBvcnQgeyBTZXNzaW9uIH0gZnJvbSAnLi4vLi4vT3BlblZpZHUvU2Vzc2lvbic7XG5cblxuLyoqXG4gKiBEZWZpbmVzIHRoZSBmb2xsb3dpbmcgZXZlbnRzOlxuICogLSBgc2lnbmFsYDogZGlzcGF0Y2hlZCBieSBbW1Nlc3Npb25dXVxuICogLSBgc2lnbmFsOlRZUEVgOiBkaXNwYXRjaGVkIGJ5IFtbU2Vzc2lvbl1dXG4gKi9cbmV4cG9ydCBjbGFzcyBTaWduYWxFdmVudCBleHRlbmRzIEV2ZW50IHtcblxuICAgIC8qKlxuICAgICAqIFRoZSB0eXBlIG9mIHNpZ25hbCAoY2FuIGJlIGVtcHR5KS5cbiAgICAgKlxuICAgICAqIFRoZSBjbGllbnQgbXVzdCBiZSBzdWJzY3JpYmVkIHRvIGBTZXNzaW9uLm9uKCdzaWduYWw6dHlwZScsIGZ1bmN0aW9uKHNpZ25hbEV2ZW50KSB7Li4ufSlgIHRvIHJlY2VpdmUgdGhpcyBvYmplY3QgaW4gdGhlIGNhbGxiYWNrLlxuICAgICAqXG4gICAgICogU3Vic2NyaWJpbmcgdG8gYFNlc3Npb24ub24oJ3NpZ25hbCcsIGZ1bmN0aW9uKHNpZ25hbEV2ZW50KSB7Li4ufSlgIHdpbGwgdHJpZ2dlciBhbGwgdHlwZXMgb2Ygc2lnbmFscy5cbiAgICAgKi9cbiAgICB0eXBlOiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBUaGUgbWVzc2FnZSBvZiB0aGUgc2lnbmFsIChjYW4gYmUgZW10cHkpXG4gICAgICovXG4gICAgZGF0YTogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogVGhlIGNsaWVudCB0aGF0IHNlbnQgdGhlIHNpZ25hbFxuICAgICAqL1xuICAgIGZyb206IENvbm5lY3Rpb247XG5cbiAgICAvKipcbiAgICAgKiBAaGlkZGVuXG4gICAgICovXG4gICAgY29uc3RydWN0b3IodGFyZ2V0OiBTZXNzaW9uLCB0eXBlOiBzdHJpbmcsIGRhdGE6IHN0cmluZywgZnJvbTogQ29ubmVjdGlvbikge1xuICAgICAgICBzdXBlcihmYWxzZSwgdGFyZ2V0LCB0eXBlKTtcbiAgICAgICAgdGhpcy50eXBlID0gdHlwZTtcbiAgICAgICAgdGhpcy5kYXRhID0gZGF0YTtcbiAgICAgICAgdGhpcy5mcm9tID0gZnJvbTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAaGlkZGVuXG4gICAgICovXG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWVtcHR5XG4gICAgY2FsbERlZmF1bHRCZWhhdmlvdXIoKSB7IH1cblxufSIsIi8qXG4gKiAoQykgQ29weXJpZ2h0IDIwMTctMjAxOCBPcGVuVmlkdSAoaHR0cHM6Ly9vcGVudmlkdS5pby8pXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqXG4gKi9cblxuaW1wb3J0IHsgRXZlbnQgfSBmcm9tICcuL0V2ZW50JztcbmltcG9ydCB7IFB1Ymxpc2hlciB9IGZyb20gJy4uLy4uL09wZW5WaWR1L1B1Ymxpc2hlcic7XG5pbXBvcnQgeyBTZXNzaW9uIH0gZnJvbSAnLi4vLi4vT3BlblZpZHUvU2Vzc2lvbic7XG5pbXBvcnQgeyBTdHJlYW0gfSBmcm9tICcuLi8uLi9PcGVuVmlkdS9TdHJlYW0nO1xuXG5cbi8qKlxuICogRGVmaW5lcyB0aGUgZm9sbG93aW5nIGV2ZW50czpcbiAqIC0gYHN0cmVhbUNyZWF0ZWRgOiBkaXNwYXRjaGVkIGJ5IFtbU2Vzc2lvbl1dIGFuZCBbW1B1Ymxpc2hlcl1dXG4gKiAtIGBzdHJlYW1EZXN0cm95ZWRgOiBkaXNwYXRjaGVkIGJ5IFtbU2Vzc2lvbl1dIGFuZCBbW1B1Ymxpc2hlcl1dXG4gKi9cbmV4cG9ydCBjbGFzcyBTdHJlYW1FdmVudCBleHRlbmRzIEV2ZW50IHtcblxuICAgIC8qKlxuICAgICAqIFN0cmVhbSBvYmplY3QgdGhhdCB3YXMgY3JlYXRlZCBvciBkZXN0cm95ZWRcbiAgICAgKi9cbiAgICBzdHJlYW06IFN0cmVhbTtcblxuICAgIC8qKlxuICAgICAqIEZvciAnc3RyZWFtRGVzdHJveWVkJyBldmVudDpcbiAgICAgKiAtIFwidW5wdWJsaXNoXCI6IG1ldGhvZCBgU2Vzc2lvbi51bnB1Ymxpc2goKWAgaGFzIGJlZW4gY2FsbGVkXG4gICAgICogLSBcImRpc2Nvbm5lY3RcIjogbWV0aG9kIGBTZXNzaW9uLmRpc2Nvbm5lY3QoKWAgaGFzIGJlZW4gY2FsbGVkXG4gICAgICogLSBcIm5ldHdvcmtEaXNjb25uZWN0XCI6IHRoZSB1c2VyJ3MgbmV0d29yayBjb25uZWN0aW9uIGhhcyBkcm9wcGVkXG4gICAgICpcbiAgICAgKiBGb3IgJ3N0cmVhbUNyZWF0ZWQnIGVtcHR5IHN0cmluZ1xuICAgICAqL1xuICAgIHJlYXNvbjogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogQGhpZGRlblxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGNhbmNlbGFibGU6IGJvb2xlYW4sIHRhcmdldDogU2Vzc2lvbiB8IFB1Ymxpc2hlciwgdHlwZTogc3RyaW5nLCBzdHJlYW06IFN0cmVhbSwgcmVhc29uOiBzdHJpbmcpIHtcbiAgICAgICAgc3VwZXIoY2FuY2VsYWJsZSwgdGFyZ2V0LCB0eXBlKTtcbiAgICAgICAgdGhpcy5zdHJlYW0gPSBzdHJlYW07XG4gICAgICAgIHRoaXMucmVhc29uID0gcmVhc29uO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBoaWRkZW5cbiAgICAgKi9cbiAgICBjYWxsRGVmYXVsdEJlaGF2aW91cigpIHtcbiAgICAgICAgaWYgKHRoaXMudHlwZSA9PT0gJ3N0cmVhbURlc3Ryb3llZCcpIHtcblxuICAgICAgICAgICAgaWYgKHRoaXMudGFyZ2V0IGluc3RhbmNlb2YgU2Vzc2lvbikge1xuICAgICAgICAgICAgICAgIC8vIFJlbW90ZSBTdHJlYW1cbiAgICAgICAgICAgICAgICBjb25zb2xlLmluZm8oXCJDYWxsaW5nIGRlZmF1bHQgYmVoYXZpb3VyIHVwb24gJ1wiICsgdGhpcy50eXBlICsgXCInIGV2ZW50IGRpc3BhdGNoZWQgYnkgJ1Nlc3Npb24nXCIpO1xuICAgICAgICAgICAgICAgIHRoaXMuc3RyZWFtLmRpc3Bvc2VXZWJSdGNQZWVyKCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMudGFyZ2V0IGluc3RhbmNlb2YgUHVibGlzaGVyKSB7XG4gICAgICAgICAgICAgICAgLy8gTG9jYWwgU3RyZWFtXG4gICAgICAgICAgICAgICAgY29uc29sZS5pbmZvKFwiQ2FsbGluZyBkZWZhdWx0IGJlaGF2aW91ciB1cG9uICdcIiArIHRoaXMudHlwZSArIFwiJyBldmVudCBkaXNwYXRjaGVkIGJ5ICdQdWJsaXNoZXInXCIpO1xuICAgICAgICAgICAgICAgIHRoaXMuc3RyZWFtLmlzTG9jYWxTdHJlYW1SZWFkeVRvUHVibGlzaCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBEaXNwb3NlIHRoZSBNZWRpYVN0cmVhbSBsb2NhbCBvYmplY3RcbiAgICAgICAgICAgIHRoaXMuc3RyZWFtLmRpc3Bvc2VNZWRpYVN0cmVhbSgpO1xuXG4gICAgICAgICAgICAvLyBSZW1vdmUgZnJvbSBET00gYWxsIHZpZGVvIGVsZW1lbnRzIGFzc29jaWF0ZWQgdG8gdGhpcyBTdHJlYW0sIGlmIHRoZXJlJ3MgYSBTdHJlYW1NYW5hZ2VyIGRlZmluZWRcbiAgICAgICAgICAgIC8vIChtZXRob2QgU2Vzc2lvbi5zdWJzY3JpYmUgbXVzdCBoYXZlIGJlZW4gY2FsbGVkKVxuICAgICAgICAgICAgaWYgKHRoaXMuc3RyZWFtLnN0cmVhbU1hbmFnZXIpIHRoaXMuc3RyZWFtLnN0cmVhbU1hbmFnZXIucmVtb3ZlQWxsVmlkZW9zKCk7XG5cbiAgICAgICAgICAgIC8vIERlbGV0ZSBzdHJlYW0gZnJvbSBTZXNzaW9uLnJlbW90ZVN0cmVhbXNDcmVhdGVkIG1hcFxuICAgICAgICAgICAgZGVsZXRlIHRoaXMuc3RyZWFtLnNlc3Npb24ucmVtb3RlU3RyZWFtc0NyZWF0ZWRbdGhpcy5zdHJlYW0uc3RyZWFtSWRdO1xuXG4gICAgICAgICAgICAvLyBEZWxldGUgU3RyZWFtT3B0aW9uc1NlcnZlciBmcm9tIHJlbW90ZSBDb25uZWN0aW9uXG4gICAgICAgICAgICBjb25zdCByZW1vdGVDb25uZWN0aW9uID0gdGhpcy5zdHJlYW0uc2Vzc2lvbi5yZW1vdGVDb25uZWN0aW9uc1t0aGlzLnN0cmVhbS5jb25uZWN0aW9uLmNvbm5lY3Rpb25JZF07XG4gICAgICAgICAgICBpZiAoISFyZW1vdGVDb25uZWN0aW9uICYmICEhcmVtb3RlQ29ubmVjdGlvbi5vcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3RyZWFtT3B0aW9uc1NlcnZlciA9IHJlbW90ZUNvbm5lY3Rpb24ub3B0aW9ucy5zdHJlYW1zO1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSBzdHJlYW1PcHRpb25zU2VydmVyLmxlbmd0aCAtIDE7IGkgPj0gMDsgLS1pKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdHJlYW1PcHRpb25zU2VydmVyW2ldLmlkID09PSB0aGlzLnN0cmVhbS5zdHJlYW1JZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RyZWFtT3B0aW9uc1NlcnZlci5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfVxuICAgIH1cblxufSIsIi8qXG4gKiAoQykgQ29weXJpZ2h0IDIwMTctMjAxOCBPcGVuVmlkdSAoaHR0cHM6Ly9vcGVudmlkdS5pby8pXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqXG4gKi9cblxuaW1wb3J0IHsgRXZlbnQgfSBmcm9tICcuL0V2ZW50JztcbmltcG9ydCB7IFN0cmVhbU1hbmFnZXIgfSBmcm9tICcuLi8uLi9PcGVuVmlkdS9TdHJlYW1NYW5hZ2VyJztcblxuLyoqXG4gKiBEZWZpbmVzIHRoZSBmb2xsb3dpbmcgZXZlbnRzOlxuICogLSBgc3RyZWFtUGxheWluZ2A6IGRpc3BhdGNoZWQgYnkgW1tTdHJlYW1NYW5hZ2VyXV0gKFtbUHVibGlzaGVyXV0gYW5kIFtbU3Vic2NyaWJlcl1dKVxuICovXG5leHBvcnQgY2xhc3MgU3RyZWFtTWFuYWdlckV2ZW50IGV4dGVuZHMgRXZlbnQge1xuXG4gICAgLyoqXG4gICAgICogQGhpZGRlblxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHRhcmdldDogU3RyZWFtTWFuYWdlcikge1xuICAgICAgICBzdXBlcihmYWxzZSwgdGFyZ2V0LCAnc3RyZWFtUGxheWluZycpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBoaWRkZW5cbiAgICAgKi9cbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tZW1wdHlcbiAgICBjYWxsRGVmYXVsdEJlaGF2aW91cigpIHsgfVxuXG59IiwiLypcbiAqIChDKSBDb3B5cmlnaHQgMjAxNy0yMDE4IE9wZW5WaWR1IChodHRwczovL29wZW52aWR1LmlvLylcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICpcbiAqL1xuXG5pbXBvcnQgeyBFdmVudCB9IGZyb20gJy4vRXZlbnQnO1xuaW1wb3J0IHsgU3RyZWFtTWFuYWdlciB9IGZyb20gJy4uLy4uL09wZW5WaWR1L1N0cmVhbU1hbmFnZXInO1xuXG5cbi8qKlxuICogRGVmaW5lcyB0aGUgZm9sbG93aW5nIGV2ZW50czpcbiAqIC0gYHZpZGVvRWxlbWVudENyZWF0ZWRgOiBkaXNwYXRjaGVkIGJ5IFtbUHVibGlzaGVyXV0gYW5kIFtbU3Vic2NyaWJlcl1dIHdoZW5ldmVyIGEgbmV3IEhUTUwgdmlkZW8gZWxlbWVudCBoYXMgYmVlbiBpbnNlcnRlZCBpbnRvIERPTSBieSBPcGVuVmlkdSBCcm93c2VyIGxpYnJhcnkuIFNlZVxuICogW01hbmFnZSB2aWRlbyBwbGF5ZXJzXSgvZG9jcy9ob3ctZG8taS9tYW5hZ2UtdmlkZW9zKSBzZWN0aW9uLlxuICogLSBgdmlkZW9FbGVtZW50RGVzdHJveWVkYDogZGlzcGF0Y2hlZCBieSBbW1B1Ymxpc2hlcl1dIGFuZCBbW1N1YnNjcmliZXJdXSB3aGVuZXZlciBhbiBIVE1MIHZpZGVvIGVsZW1lbnQgaGFzIGJlZW4gcmVtb3ZlZCBmcm9tIERPTSBieSBPcGVuVmlkdSBCcm93c2VyIGxpYnJhcnkuXG4gKi9cbmV4cG9ydCBjbGFzcyBWaWRlb0VsZW1lbnRFdmVudCBleHRlbmRzIEV2ZW50IHtcblxuICAgIC8qKlxuICAgICAqIFZpZGVvIGVsZW1lbnQgdGhhdCB3YXMgY3JlYXRlZCBvciBkZXN0cm95ZWRcbiAgICAgKi9cbiAgICBlbGVtZW50OiBIVE1MVmlkZW9FbGVtZW50O1xuXG4gICAgLyoqXG4gICAgICogQGhpZGRlblxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGVsZW1lbnQ6IEhUTUxWaWRlb0VsZW1lbnQsIHRhcmdldDogU3RyZWFtTWFuYWdlciwgdHlwZTogc3RyaW5nKSB7XG4gICAgICAgIHN1cGVyKGZhbHNlLCB0YXJnZXQsIHR5cGUpO1xuICAgICAgICB0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBoaWRkZW5cbiAgICAgKi9cbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tZW1wdHlcbiAgICBjYWxsRGVmYXVsdEJlaGF2aW91cigpIHsgfVxuXG59IiwiZnVuY3Rpb24gTWFwcGVyKClcbntcbiAgdmFyIHNvdXJjZXMgPSB7fTtcblxuXG4gIHRoaXMuZm9yRWFjaCA9IGZ1bmN0aW9uKGNhbGxiYWNrKVxuICB7XG4gICAgZm9yKHZhciBrZXkgaW4gc291cmNlcylcbiAgICB7XG4gICAgICB2YXIgc291cmNlID0gc291cmNlc1trZXldO1xuXG4gICAgICBmb3IodmFyIGtleTIgaW4gc291cmNlKVxuICAgICAgICBjYWxsYmFjayhzb3VyY2Vba2V5Ml0pO1xuICAgIH07XG4gIH07XG5cbiAgdGhpcy5nZXQgPSBmdW5jdGlvbihpZCwgc291cmNlKVxuICB7XG4gICAgdmFyIGlkcyA9IHNvdXJjZXNbc291cmNlXTtcbiAgICBpZihpZHMgPT0gdW5kZWZpbmVkKVxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcblxuICAgIHJldHVybiBpZHNbaWRdO1xuICB9O1xuXG4gIHRoaXMucmVtb3ZlID0gZnVuY3Rpb24oaWQsIHNvdXJjZSlcbiAge1xuICAgIHZhciBpZHMgPSBzb3VyY2VzW3NvdXJjZV07XG4gICAgaWYoaWRzID09IHVuZGVmaW5lZClcbiAgICAgIHJldHVybjtcblxuICAgIGRlbGV0ZSBpZHNbaWRdO1xuXG4gICAgLy8gQ2hlY2sgaXQncyBlbXB0eVxuICAgIGZvcih2YXIgaSBpbiBpZHMpe3JldHVybiBmYWxzZX1cblxuICAgIGRlbGV0ZSBzb3VyY2VzW3NvdXJjZV07XG4gIH07XG5cbiAgdGhpcy5zZXQgPSBmdW5jdGlvbih2YWx1ZSwgaWQsIHNvdXJjZSlcbiAge1xuICAgIGlmKHZhbHVlID09IHVuZGVmaW5lZClcbiAgICAgIHJldHVybiB0aGlzLnJlbW92ZShpZCwgc291cmNlKTtcblxuICAgIHZhciBpZHMgPSBzb3VyY2VzW3NvdXJjZV07XG4gICAgaWYoaWRzID09IHVuZGVmaW5lZClcbiAgICAgIHNvdXJjZXNbc291cmNlXSA9IGlkcyA9IHt9O1xuXG4gICAgaWRzW2lkXSA9IHZhbHVlO1xuICB9O1xufTtcblxuXG5NYXBwZXIucHJvdG90eXBlLnBvcCA9IGZ1bmN0aW9uKGlkLCBzb3VyY2UpXG57XG4gIHZhciB2YWx1ZSA9IHRoaXMuZ2V0KGlkLCBzb3VyY2UpO1xuICBpZih2YWx1ZSA9PSB1bmRlZmluZWQpXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcblxuICB0aGlzLnJlbW92ZShpZCwgc291cmNlKTtcblxuICByZXR1cm4gdmFsdWU7XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gTWFwcGVyO1xuIiwiLypcbiAqIChDKSBDb3B5cmlnaHQgMjAxNCBLdXJlbnRvIChodHRwOi8va3VyZW50by5vcmcvKVxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKlxuICovXG5cbnZhciBKc29uUnBjQ2xpZW50ICA9IHJlcXVpcmUoJy4vanNvbnJwY2NsaWVudCcpO1xuXG5cbmV4cG9ydHMuSnNvblJwY0NsaWVudCAgPSBKc29uUnBjQ2xpZW50OyIsIi8qXG4gKiAoQykgQ29weXJpZ2h0IDIwMTQgS3VyZW50byAoaHR0cDovL2t1cmVudG8ub3JnLylcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICpcbiAqL1xuXG52YXIgUnBjQnVpbGRlciA9IHJlcXVpcmUoJy4uLycpO1xudmFyIFdlYlNvY2tldFdpdGhSZWNvbm5lY3Rpb24gPSByZXF1aXJlKCcuL3RyYW5zcG9ydHMvd2ViU29ja2V0V2l0aFJlY29ubmVjdGlvbicpO1xuXG5EYXRlLm5vdyA9IERhdGUubm93IHx8IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiArbmV3IERhdGU7XG59O1xuXG52YXIgUElOR19JTlRFUlZBTCA9IDUwMDA7XG5cbnZhciBSRUNPTk5FQ1RJTkcgPSAnUkVDT05ORUNUSU5HJztcbnZhciBDT05ORUNURUQgPSAnQ09OTkVDVEVEJztcbnZhciBESVNDT05ORUNURUQgPSAnRElTQ09OTkVDVEVEJztcblxudmFyIExvZ2dlciA9IGNvbnNvbGU7XG5cbi8qKlxuICpcbiAqIGhlYXJ0YmVhdDogaW50ZXJ2YWwgaW4gbXMgZm9yIGVhY2ggaGVhcnRiZWF0IG1lc3NhZ2UsXG4gKiBzZW5kQ2xvc2VNZXNzYWdlIDogdHJ1ZSAvIGZhbHNlLCBiZWZvcmUgY2xvc2luZyB0aGUgY29ubmVjdGlvbiwgaXQgc2VuZHMgYSBjbG9zZVNlc3Npb24gbWVzc2FnZVxuICogPHByZT5cbiAqIHdzIDoge1xuICogXHR1cmkgOiBVUkkgdG8gY29ubnRlY3QgdG8sXG4gKiAgdXNlU29ja0pTIDogdHJ1ZSAodXNlIFNvY2tKUykgLyBmYWxzZSAodXNlIFdlYlNvY2tldCkgYnkgZGVmYXVsdCxcbiAqIFx0b25jb25uZWN0ZWQgOiBjYWxsYmFjayBtZXRob2QgdG8gaW52b2tlIHdoZW4gY29ubmVjdGlvbiBpcyBzdWNjZXNzZnVsLFxuICogXHRvbmRpc2Nvbm5lY3QgOiBjYWxsYmFjayBtZXRob2QgdG8gaW52b2tlIHdoZW4gdGhlIGNvbm5lY3Rpb24gaXMgbG9zdCxcbiAqIFx0b25yZWNvbm5lY3RpbmcgOiBjYWxsYmFjayBtZXRob2QgdG8gaW52b2tlIHdoZW4gdGhlIGNsaWVudCBpcyByZWNvbm5lY3RpbmcsXG4gKiBcdG9ucmVjb25uZWN0ZWQgOiBjYWxsYmFjayBtZXRob2QgdG8gaW52b2tlIHdoZW4gdGhlIGNsaWVudCBzdWNjZXNzZnVsbHkgcmVjb25uZWN0cyxcbiAqIFx0b25lcnJvciA6IGNhbGxiYWNrIG1ldGhvZCB0byBpbnZva2Ugd2hlbiB0aGVyZSBpcyBhbiBlcnJvclxuICogfSxcbiAqIHJwYyA6IHtcbiAqIFx0cmVxdWVzdFRpbWVvdXQgOiB0aW1lb3V0IGZvciBhIHJlcXVlc3QsXG4gKiBcdHNlc3Npb25TdGF0dXNDaGFuZ2VkOiBjYWxsYmFjayBtZXRob2QgZm9yIGNoYW5nZXMgaW4gc2Vzc2lvbiBzdGF0dXMsXG4gKiBcdG1lZGlhUmVuZWdvdGlhdGlvbjogbWVkaWFSZW5lZ290aWF0aW9uXG4gKiB9XG4gKiA8L3ByZT5cbiAqL1xuZnVuY3Rpb24gSnNvblJwY0NsaWVudChjb25maWd1cmF0aW9uKSB7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICB2YXIgd3NDb25maWcgPSBjb25maWd1cmF0aW9uLndzO1xuXG4gICAgdmFyIG5vdFJlY29ubmVjdElmTnVtTGVzc1RoYW4gPSAtMTtcblxuICAgIHZhciBwaW5nTmV4dE51bSA9IDA7XG4gICAgdmFyIGVuYWJsZWRQaW5ncyA9IHRydWU7XG4gICAgdmFyIHBpbmdQb25nU3RhcnRlZCA9IGZhbHNlO1xuICAgIHZhciBwaW5nSW50ZXJ2YWw7XG5cbiAgICB2YXIgc3RhdHVzID0gRElTQ09OTkVDVEVEO1xuXG4gICAgdmFyIG9ucmVjb25uZWN0aW5nID0gd3NDb25maWcub25yZWNvbm5lY3Rpbmc7XG4gICAgdmFyIG9ucmVjb25uZWN0ZWQgPSB3c0NvbmZpZy5vbnJlY29ubmVjdGVkO1xuICAgIHZhciBvbmNvbm5lY3RlZCA9IHdzQ29uZmlnLm9uY29ubmVjdGVkO1xuICAgIHZhciBvbmVycm9yID0gd3NDb25maWcub25lcnJvcjtcblxuICAgIGNvbmZpZ3VyYXRpb24ucnBjLnB1bGwgPSBmdW5jdGlvbihwYXJhbXMsIHJlcXVlc3QpIHtcbiAgICAgICAgcmVxdWVzdC5yZXBseShudWxsLCBcInB1c2hcIik7XG4gICAgfVxuXG4gICAgd3NDb25maWcub25yZWNvbm5lY3RpbmcgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgTG9nZ2VyLmRlYnVnKFwiLS0tLS0tLS0tIE9OUkVDT05ORUNUSU5HIC0tLS0tLS0tLS0tXCIpO1xuICAgICAgICBpZiAoc3RhdHVzID09PSBSRUNPTk5FQ1RJTkcpIHtcbiAgICAgICAgICAgIExvZ2dlci5lcnJvcihcIldlYnNvY2tldCBhbHJlYWR5IGluIFJFQ09OTkVDVElORyBzdGF0ZSB3aGVuIHJlY2VpdmluZyBhIG5ldyBPTlJFQ09OTkVDVElORyBtZXNzYWdlLiBJZ25vcmluZyBpdFwiKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHN0YXR1cyA9IFJFQ09OTkVDVElORztcbiAgICAgICAgaWYgKG9ucmVjb25uZWN0aW5nKSB7XG4gICAgICAgICAgICBvbnJlY29ubmVjdGluZygpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgd3NDb25maWcub25yZWNvbm5lY3RlZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBMb2dnZXIuZGVidWcoXCItLS0tLS0tLS0gT05SRUNPTk5FQ1RFRCAtLS0tLS0tLS0tLVwiKTtcbiAgICAgICAgaWYgKHN0YXR1cyA9PT0gQ09OTkVDVEVEKSB7XG4gICAgICAgICAgICBMb2dnZXIuZXJyb3IoXCJXZWJzb2NrZXQgYWxyZWFkeSBpbiBDT05ORUNURUQgc3RhdGUgd2hlbiByZWNlaXZpbmcgYSBuZXcgT05SRUNPTk5FQ1RFRCBtZXNzYWdlLiBJZ25vcmluZyBpdFwiKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBzdGF0dXMgPSBDT05ORUNURUQ7XG5cbiAgICAgICAgZW5hYmxlZFBpbmdzID0gdHJ1ZTtcbiAgICAgICAgdXBkYXRlTm90UmVjb25uZWN0SWZMZXNzVGhhbigpO1xuICAgICAgICB1c2VQaW5nKCk7XG5cbiAgICAgICAgaWYgKG9ucmVjb25uZWN0ZWQpIHtcbiAgICAgICAgICAgIG9ucmVjb25uZWN0ZWQoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHdzQ29uZmlnLm9uY29ubmVjdGVkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIExvZ2dlci5kZWJ1ZyhcIi0tLS0tLS0tLSBPTkNPTk5FQ1RFRCAtLS0tLS0tLS0tLVwiKTtcbiAgICAgICAgaWYgKHN0YXR1cyA9PT0gQ09OTkVDVEVEKSB7XG4gICAgICAgICAgICBMb2dnZXIuZXJyb3IoXCJXZWJzb2NrZXQgYWxyZWFkeSBpbiBDT05ORUNURUQgc3RhdGUgd2hlbiByZWNlaXZpbmcgYSBuZXcgT05DT05ORUNURUQgbWVzc2FnZS4gSWdub3JpbmcgaXRcIik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgc3RhdHVzID0gQ09OTkVDVEVEO1xuXG4gICAgICAgIGVuYWJsZWRQaW5ncyA9IHRydWU7XG4gICAgICAgIHVzZVBpbmcoKTtcblxuICAgICAgICBpZiAob25jb25uZWN0ZWQpIHtcbiAgICAgICAgICAgIG9uY29ubmVjdGVkKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB3c0NvbmZpZy5vbmVycm9yID0gZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgICAgTG9nZ2VyLmRlYnVnKFwiLS0tLS0tLS0tIE9ORVJST1IgLS0tLS0tLS0tLS1cIik7XG5cbiAgICAgICAgc3RhdHVzID0gRElTQ09OTkVDVEVEO1xuXG4gICAgICAgIGlmIChvbmVycm9yKSB7XG4gICAgICAgICAgICBvbmVycm9yKGVycm9yKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciB3cyA9IG5ldyBXZWJTb2NrZXRXaXRoUmVjb25uZWN0aW9uKHdzQ29uZmlnKTtcblxuICAgIExvZ2dlci5kZWJ1ZygnQ29ubmVjdGluZyB3ZWJzb2NrZXQgdG8gVVJJOiAnICsgd3NDb25maWcudXJpKTtcblxuICAgIHZhciBycGNCdWlsZGVyT3B0aW9ucyA9IHtcbiAgICAgICAgcmVxdWVzdF90aW1lb3V0OiBjb25maWd1cmF0aW9uLnJwYy5yZXF1ZXN0VGltZW91dCxcbiAgICAgICAgcGluZ19yZXF1ZXN0X3RpbWVvdXQ6IGNvbmZpZ3VyYXRpb24ucnBjLmhlYXJ0YmVhdFJlcXVlc3RUaW1lb3V0XG4gICAgfTtcblxuICAgIHZhciBycGMgPSBuZXcgUnBjQnVpbGRlcihScGNCdWlsZGVyLnBhY2tlcnMuSnNvblJQQywgcnBjQnVpbGRlck9wdGlvbnMsIHdzLFxuICAgICAgICBmdW5jdGlvbihyZXF1ZXN0KSB7XG5cbiAgICAgICAgICAgIExvZ2dlci5kZWJ1ZygnUmVjZWl2ZWQgcmVxdWVzdDogJyArIEpTT04uc3RyaW5naWZ5KHJlcXVlc3QpKTtcblxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICB2YXIgZnVuYyA9IGNvbmZpZ3VyYXRpb24ucnBjW3JlcXVlc3QubWV0aG9kXTtcblxuICAgICAgICAgICAgICAgIGlmIChmdW5jID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgTG9nZ2VyLmVycm9yKFwiTWV0aG9kIFwiICsgcmVxdWVzdC5tZXRob2QgKyBcIiBub3QgcmVnaXN0ZXJlZCBpbiBjbGllbnRcIik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZnVuYyhyZXF1ZXN0LnBhcmFtcywgcmVxdWVzdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAgICAgTG9nZ2VyLmVycm9yKCdFeGNlcHRpb24gcHJvY2Vzc2luZyByZXF1ZXN0OiAnICsgSlNPTi5zdHJpbmdpZnkocmVxdWVzdCkpO1xuICAgICAgICAgICAgICAgIExvZ2dlci5lcnJvcihlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgIHRoaXMuc2VuZCA9IGZ1bmN0aW9uKG1ldGhvZCwgcGFyYW1zLCBjYWxsYmFjaykge1xuICAgICAgICBpZiAobWV0aG9kICE9PSAncGluZycpIHtcbiAgICAgICAgICAgIExvZ2dlci5kZWJ1ZygnUmVxdWVzdDogbWV0aG9kOicgKyBtZXRob2QgKyBcIiBwYXJhbXM6XCIgKyBKU09OLnN0cmluZ2lmeShwYXJhbXMpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciByZXF1ZXN0VGltZSA9IERhdGUubm93KCk7XG5cbiAgICAgICAgcnBjLmVuY29kZShtZXRob2QsIHBhcmFtcywgZnVuY3Rpb24oZXJyb3IsIHJlc3VsdCkge1xuICAgICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgTG9nZ2VyLmVycm9yKFwiRVJST1I6XCIgKyBlcnJvci5tZXNzYWdlICsgXCIgaW4gUmVxdWVzdDogbWV0aG9kOlwiICtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1ldGhvZCArIFwiIHBhcmFtczpcIiArIEpTT04uc3RyaW5naWZ5KHBhcmFtcykgKyBcIiByZXF1ZXN0OlwiICtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yLnJlcXVlc3QpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyb3IuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgTG9nZ2VyLmVycm9yKFwiRVJST1IgREFUQTpcIiArIEpTT04uc3RyaW5naWZ5KGVycm9yLmRhdGEpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHt9XG4gICAgICAgICAgICAgICAgZXJyb3IucmVxdWVzdFRpbWUgPSByZXF1ZXN0VGltZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQgIT0gdW5kZWZpbmVkICYmIHJlc3VsdC52YWx1ZSAhPT0gJ3BvbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgIExvZ2dlci5kZWJ1ZygnUmVzcG9uc2U6ICcgKyBKU09OLnN0cmluZ2lmeShyZXN1bHQpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyb3IsIHJlc3VsdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHVwZGF0ZU5vdFJlY29ubmVjdElmTGVzc1RoYW4oKSB7XG4gICAgICAgIExvZ2dlci5kZWJ1ZyhcIm5vdFJlY29ubmVjdElmTnVtTGVzc1RoYW4gPSBcIiArIHBpbmdOZXh0TnVtICsgJyAob2xkPScgK1xuICAgICAgICAgICAgbm90UmVjb25uZWN0SWZOdW1MZXNzVGhhbiArICcpJyk7XG4gICAgICAgIG5vdFJlY29ubmVjdElmTnVtTGVzc1RoYW4gPSBwaW5nTmV4dE51bTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZW5kUGluZygpIHtcbiAgICAgICAgaWYgKGVuYWJsZWRQaW5ncykge1xuICAgICAgICAgICAgdmFyIHBhcmFtcyA9IG51bGw7XG4gICAgICAgICAgICBpZiAocGluZ05leHROdW0gPT0gMCB8fCBwaW5nTmV4dE51bSA9PSBub3RSZWNvbm5lY3RJZk51bUxlc3NUaGFuKSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zID0ge1xuICAgICAgICAgICAgICAgICAgICBpbnRlcnZhbDogY29uZmlndXJhdGlvbi5oZWFydGJlYXQgfHwgUElOR19JTlRFUlZBTFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBwaW5nTmV4dE51bSsrO1xuXG4gICAgICAgICAgICBzZWxmLnNlbmQoJ3BpbmcnLCBwYXJhbXMsIChmdW5jdGlvbihwaW5nTnVtKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGVycm9yLCByZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBMb2dnZXIuZGVidWcoXCJFcnJvciBpbiBwaW5nIHJlcXVlc3QgI1wiICsgcGluZ051bSArIFwiIChcIiArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3IubWVzc2FnZSArIFwiKVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwaW5nTnVtID4gbm90UmVjb25uZWN0SWZOdW1MZXNzVGhhbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWRQaW5ncyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVwZGF0ZU5vdFJlY29ubmVjdElmTGVzc1RoYW4oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBMb2dnZXIuZGVidWcoXCJTZXJ2ZXIgZGlkIG5vdCByZXNwb25kIHRvIHBpbmcgbWVzc2FnZSAjXCIgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwaW5nTnVtICsgXCIuIFJlY29ubmVjdGluZy4uLiBcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd3MucmVjb25uZWN0V3MoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pKHBpbmdOZXh0TnVtKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBMb2dnZXIuZGVidWcoXCJUcnlpbmcgdG8gc2VuZCBwaW5nLCBidXQgcGluZyBpcyBub3QgZW5hYmxlZFwiKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qXG4gICAgKiBJZiBjb25maWd1cmF0aW9uLmhlYXJiZWF0IGhhcyBhbnkgdmFsdWUsIHRoZSBwaW5nLXBvbmcgd2lsbCB3b3JrIHdpdGggdGhlIGludGVydmFsXG4gICAgKiBvZiBjb25maWd1cmF0aW9uLmhlYXJiZWF0XG4gICAgKi9cbiAgICBmdW5jdGlvbiB1c2VQaW5nKCkge1xuICAgICAgICBpZiAoIXBpbmdQb25nU3RhcnRlZCkge1xuICAgICAgICAgICAgTG9nZ2VyLmRlYnVnKFwiU3RhcnRpbmcgcGluZyAoaWYgY29uZmlndXJlZClcIilcbiAgICAgICAgICAgIHBpbmdQb25nU3RhcnRlZCA9IHRydWU7XG5cbiAgICAgICAgICAgIGlmIChjb25maWd1cmF0aW9uLmhlYXJ0YmVhdCAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBwaW5nSW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChzZW5kUGluZywgY29uZmlndXJhdGlvbi5oZWFydGJlYXQpO1xuICAgICAgICAgICAgICAgIHNlbmRQaW5nKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmNsb3NlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIExvZ2dlci5kZWJ1ZyhcIkNsb3NpbmcganNvblJwY0NsaWVudCBleHBsaWNpdGx5IGJ5IGNsaWVudFwiKTtcblxuICAgICAgICBpZiAocGluZ0ludGVydmFsICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgTG9nZ2VyLmRlYnVnKFwiQ2xlYXJpbmcgcGluZyBpbnRlcnZhbFwiKTtcbiAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwocGluZ0ludGVydmFsKTtcbiAgICAgICAgfVxuICAgICAgICBwaW5nUG9uZ1N0YXJ0ZWQgPSBmYWxzZTtcbiAgICAgICAgZW5hYmxlZFBpbmdzID0gZmFsc2U7XG5cbiAgICAgICAgaWYgKGNvbmZpZ3VyYXRpb24uc2VuZENsb3NlTWVzc2FnZSkge1xuICAgICAgICAgICAgTG9nZ2VyLmRlYnVnKFwiU2VuZGluZyBjbG9zZSBtZXNzYWdlXCIpXG4gICAgICAgICAgICB0aGlzLnNlbmQoJ2Nsb3NlU2Vzc2lvbicsIG51bGwsIGZ1bmN0aW9uKGVycm9yLCByZXN1bHQpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgTG9nZ2VyLmVycm9yKFwiRXJyb3Igc2VuZGluZyBjbG9zZSBtZXNzYWdlOiBcIiArIEpTT04uc3RyaW5naWZ5KGVycm9yKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHdzLmNsb3NlKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcblx0XHRcdHdzLmNsb3NlKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBUaGlzIG1ldGhvZCBpcyBvbmx5IGZvciB0ZXN0aW5nXG4gICAgdGhpcy5mb3JjZUNsb3NlID0gZnVuY3Rpb24obWlsbGlzKSB7XG4gICAgICAgIHdzLmZvcmNlQ2xvc2UobWlsbGlzKTtcbiAgICB9XG5cbiAgICB0aGlzLnJlY29ubmVjdCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB3cy5yZWNvbm5lY3RXcygpO1xuICAgIH1cbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IEpzb25ScGNDbGllbnQ7XG4iLCIvKlxuICogKEMpIENvcHlyaWdodCAyMDE0IEt1cmVudG8gKGh0dHA6Ly9rdXJlbnRvLm9yZy8pXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqXG4gKi9cblxudmFyIFdlYlNvY2tldFdpdGhSZWNvbm5lY3Rpb24gID0gcmVxdWlyZSgnLi93ZWJTb2NrZXRXaXRoUmVjb25uZWN0aW9uJyk7XG5cblxuZXhwb3J0cy5XZWJTb2NrZXRXaXRoUmVjb25uZWN0aW9uICA9IFdlYlNvY2tldFdpdGhSZWNvbm5lY3Rpb247IiwiLypcbiAqIChDKSBDb3B5cmlnaHQgMjAxMy0yMDE1IEt1cmVudG8gKGh0dHA6Ly9rdXJlbnRvLm9yZy8pXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuXG5cInVzZSBzdHJpY3RcIjtcblxudmFyIEJyb3dzZXJXZWJTb2NrZXQgPSBnbG9iYWwuV2ViU29ja2V0IHx8IGdsb2JhbC5Nb3pXZWJTb2NrZXQ7XG5cbnZhciBMb2dnZXIgPSBjb25zb2xlO1xuXG4vKipcbiAqIEdldCBlaXRoZXIgdGhlIGBXZWJTb2NrZXRgIG9yIGBNb3pXZWJTb2NrZXRgIGdsb2JhbHNcbiAqIGluIHRoZSBicm93c2VyIG9yIHRyeSB0byByZXNvbHZlIFdlYlNvY2tldC1jb21wYXRpYmxlXG4gKiBpbnRlcmZhY2UgZXhwb3NlZCBieSBgd3NgIGZvciBOb2RlLWxpa2UgZW52aXJvbm1lbnQuXG4gKi9cblxuLyp2YXIgV2ViU29ja2V0ID0gQnJvd3NlcldlYlNvY2tldDtcbmlmICghV2ViU29ja2V0ICYmIHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgV2ViU29ja2V0ID0gcmVxdWlyZSgnd3MnKTtcbiAgICB9IGNhdGNoIChlKSB7IH1cbn0qL1xuXG4vL3ZhciBTb2NrSlMgPSByZXF1aXJlKCdzb2NranMtY2xpZW50Jyk7XG5cbnZhciBNQVhfUkVUUklFUyA9IDIwMDA7IC8vIEZvcmV2ZXIuLi5cbnZhciBSRVRSWV9USU1FX01TID0gMzAwMDsgLy8gRklYTUU6IEltcGxlbWVudCBleHBvbmVudGlhbCB3YWl0IHRpbWVzLi4uXG5cbnZhciBDT05ORUNUSU5HID0gMDtcbnZhciBPUEVOID0gMTtcbnZhciBDTE9TSU5HID0gMjtcbnZhciBDTE9TRUQgPSAzO1xuXG4vKlxuY29uZmlnID0ge1xuXHRcdHVyaSA6IHdzVXJpLFxuXHRcdHVzZVNvY2tKUyA6IHRydWUgKHVzZSBTb2NrSlMpIC8gZmFsc2UgKHVzZSBXZWJTb2NrZXQpIGJ5IGRlZmF1bHQsXG5cdFx0b25jb25uZWN0ZWQgOiBjYWxsYmFjayBtZXRob2QgdG8gaW52b2tlIHdoZW4gY29ubmVjdGlvbiBpcyBzdWNjZXNzZnVsLFxuXHRcdG9uZGlzY29ubmVjdCA6IGNhbGxiYWNrIG1ldGhvZCB0byBpbnZva2Ugd2hlbiB0aGUgY29ubmVjdGlvbiBpcyBsb3N0LFxuXHRcdG9ucmVjb25uZWN0aW5nIDogY2FsbGJhY2sgbWV0aG9kIHRvIGludm9rZSB3aGVuIHRoZSBjbGllbnQgaXMgcmVjb25uZWN0aW5nLFxuXHRcdG9ucmVjb25uZWN0ZWQgOiBjYWxsYmFjayBtZXRob2QgdG8gaW52b2tlIHdoZW4gdGhlIGNsaWVudCBzdWNjZXNzZnVsbHkgcmVjb25uZWN0cyxcblx0fTtcbiovXG5mdW5jdGlvbiBXZWJTb2NrZXRXaXRoUmVjb25uZWN0aW9uKGNvbmZpZykge1xuXG4gICAgdmFyIGNsb3NpbmcgPSBmYWxzZTtcbiAgICB2YXIgcmVnaXN0ZXJNZXNzYWdlSGFuZGxlcjtcbiAgICB2YXIgd3NVcmkgPSBjb25maWcudXJpO1xuICAgIHZhciB1c2VTb2NrSlMgPSBjb25maWcudXNlU29ja0pTO1xuICAgIHZhciByZWNvbm5lY3RpbmcgPSBmYWxzZTtcblxuICAgIHZhciBmb3JjaW5nRGlzY29ubmVjdGlvbiA9IGZhbHNlO1xuXG4gICAgdmFyIHdzO1xuXG4gICAgaWYgKHVzZVNvY2tKUykge1xuICAgICAgICB3cyA9IG5ldyBTb2NrSlMod3NVcmkpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHdzID0gbmV3IFdlYlNvY2tldCh3c1VyaSk7XG4gICAgfVxuXG4gICAgd3Mub25vcGVuID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGxvZ0Nvbm5lY3RlZCh3cywgd3NVcmkpO1xuICAgICAgICBpZiAoY29uZmlnLm9uY29ubmVjdGVkKSB7XG4gICAgICAgICAgICBjb25maWcub25jb25uZWN0ZWQoKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB3cy5vbmVycm9yID0gZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgICAgTG9nZ2VyLmVycm9yKFwiQ291bGQgbm90IGNvbm5lY3QgdG8gXCIgKyB3c1VyaSArIFwiIChpbnZva2luZyBvbmVycm9yIGlmIGRlZmluZWQpXCIsIGVycm9yKTtcbiAgICAgICAgaWYgKGNvbmZpZy5vbmVycm9yKSB7XG4gICAgICAgICAgICBjb25maWcub25lcnJvcihlcnJvcik7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gbG9nQ29ubmVjdGVkKHdzLCB3c1VyaSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgTG9nZ2VyLmRlYnVnKFwiV2ViU29ja2V0IGNvbm5lY3RlZCB0byBcIiArIHdzVXJpKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgTG9nZ2VyLmVycm9yKGUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIHJlY29ubmVjdGlvbk9uQ2xvc2UgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHdzLnJlYWR5U3RhdGUgPT09IENMT1NFRCkge1xuICAgICAgICAgICAgaWYgKGNsb3NpbmcpIHtcbiAgICAgICAgICAgICAgICBMb2dnZXIuZGVidWcoXCJDb25uZWN0aW9uIGNsb3NlZCBieSB1c2VyXCIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBMb2dnZXIuZGVidWcoXCJDb25uZWN0aW9uIGNsb3NlZCB1bmV4cGVjdGVjbHkuIFJlY29ubmVjdGluZy4uLlwiKTtcbiAgICAgICAgICAgICAgICByZWNvbm5lY3RUb1NhbWVVcmkoTUFYX1JFVFJJRVMsIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgTG9nZ2VyLmRlYnVnKFwiQ2xvc2UgY2FsbGJhY2sgZnJvbSBwcmV2aW91cyB3ZWJzb2NrZXQuIElnbm9yaW5nIGl0XCIpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHdzLm9uY2xvc2UgPSByZWNvbm5lY3Rpb25PbkNsb3NlO1xuXG4gICAgZnVuY3Rpb24gcmVjb25uZWN0VG9TYW1lVXJpKG1heFJldHJpZXMsIG51bVJldHJpZXMpIHtcbiAgICAgICAgTG9nZ2VyLmRlYnVnKFwicmVjb25uZWN0VG9TYW1lVXJpIChhdHRlbXB0ICNcIiArIG51bVJldHJpZXMgKyBcIiwgbWF4PVwiICsgbWF4UmV0cmllcyArIFwiKVwiKTtcblxuICAgICAgICBpZiAobnVtUmV0cmllcyA9PT0gMSkge1xuICAgICAgICAgICAgaWYgKHJlY29ubmVjdGluZykge1xuICAgICAgICAgICAgICAgIExvZ2dlci53YXJuKFwiVHJ5aW5nIHRvIHJlY29ubmVjdFRvTmV3VXJpIHdoZW4gcmVjb25uZWN0aW5nLi4uIElnbm9yaW5nIHRoaXMgcmVjb25uZWN0aW9uLlwiKVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVjb25uZWN0aW5nID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGNvbmZpZy5vbnJlY29ubmVjdGluZykge1xuICAgICAgICAgICAgICAgIGNvbmZpZy5vbnJlY29ubmVjdGluZygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGZvcmNpbmdEaXNjb25uZWN0aW9uKSB7XG4gICAgICAgICAgICByZWNvbm5lY3RUb05ld1VyaShtYXhSZXRyaWVzLCBudW1SZXRyaWVzLCB3c1VyaSk7XG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChjb25maWcubmV3V3NVcmlPblJlY29ubmVjdGlvbikge1xuICAgICAgICAgICAgICAgIGNvbmZpZy5uZXdXc1VyaU9uUmVjb25uZWN0aW9uKGZ1bmN0aW9uKGVycm9yLCBuZXdXc1VyaSkge1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgTG9nZ2VyLmRlYnVnKGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVjb25uZWN0VG9TYW1lVXJpKG1heFJldHJpZXMsIG51bVJldHJpZXMgKyAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sIFJFVFJZX1RJTUVfTVMpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVjb25uZWN0VG9OZXdVcmkobWF4UmV0cmllcywgbnVtUmV0cmllcywgbmV3V3NVcmkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVjb25uZWN0VG9OZXdVcmkobWF4UmV0cmllcywgbnVtUmV0cmllcywgd3NVcmkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gVE9ETyBUZXN0IHJldHJpZXMuIEhvdyB0byBmb3JjZSBub3QgY29ubmVjdGlvbj9cbiAgICBmdW5jdGlvbiByZWNvbm5lY3RUb05ld1VyaShtYXhSZXRyaWVzLCBudW1SZXRyaWVzLCByZWNvbm5lY3RXc1VyaSkge1xuICAgICAgICBMb2dnZXIuZGVidWcoXCJSZWNvbm5lY3Rpb24gYXR0ZW1wdCAjXCIgKyBudW1SZXRyaWVzKTtcblxuICAgICAgICB3cy5jbG9zZSgpO1xuXG4gICAgICAgIHdzVXJpID0gcmVjb25uZWN0V3NVcmkgfHwgd3NVcmk7XG5cbiAgICAgICAgdmFyIG5ld1dzO1xuICAgICAgICBpZiAodXNlU29ja0pTKSB7XG4gICAgICAgICAgICBuZXdXcyA9IG5ldyBTb2NrSlMod3NVcmkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbmV3V3MgPSBuZXcgV2ViU29ja2V0KHdzVXJpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIG5ld1dzLm9ub3BlbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgTG9nZ2VyLmRlYnVnKFwiUmVjb25uZWN0ZWQgYWZ0ZXIgXCIgKyBudW1SZXRyaWVzICsgXCIgYXR0ZW1wdHMuLi5cIik7XG4gICAgICAgICAgICBsb2dDb25uZWN0ZWQobmV3V3MsIHdzVXJpKTtcbiAgICAgICAgICAgIHJlY29ubmVjdGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgcmVnaXN0ZXJNZXNzYWdlSGFuZGxlcigpO1xuICAgICAgICAgICAgaWYgKGNvbmZpZy5vbnJlY29ubmVjdGVkKCkpIHtcbiAgICAgICAgICAgICAgICBjb25maWcub25yZWNvbm5lY3RlZCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBuZXdXcy5vbmNsb3NlID0gcmVjb25uZWN0aW9uT25DbG9zZTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgb25FcnJvck9yQ2xvc2UgPSBmdW5jdGlvbihlcnJvcikge1xuICAgICAgICAgICAgTG9nZ2VyLndhcm4oXCJSZWNvbm5lY3Rpb24gZXJyb3I6IFwiLCBlcnJvcik7XG5cbiAgICAgICAgICAgIGlmIChudW1SZXRyaWVzID09PSBtYXhSZXRyaWVzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNvbmZpZy5vbmRpc2Nvbm5lY3QpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnLm9uZGlzY29ubmVjdCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVjb25uZWN0VG9TYW1lVXJpKG1heFJldHJpZXMsIG51bVJldHJpZXMgKyAxKTtcbiAgICAgICAgICAgICAgICB9LCBSRVRSWV9USU1FX01TKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBuZXdXcy5vbmVycm9yID0gb25FcnJvck9yQ2xvc2U7XG5cbiAgICAgICAgd3MgPSBuZXdXcztcbiAgICB9XG5cbiAgICB0aGlzLmNsb3NlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGNsb3NpbmcgPSB0cnVlO1xuICAgICAgICB3cy5jbG9zZSgpO1xuICAgIH07XG5cblxuICAgIC8vIFRoaXMgbWV0aG9kIGlzIG9ubHkgZm9yIHRlc3RpbmdcbiAgICB0aGlzLmZvcmNlQ2xvc2UgPSBmdW5jdGlvbihtaWxsaXMpIHtcbiAgICAgICAgTG9nZ2VyLmRlYnVnKFwiVGVzdGluZzogRm9yY2UgV2ViU29ja2V0IGNsb3NlXCIpO1xuXG4gICAgICAgIGlmIChtaWxsaXMpIHtcbiAgICAgICAgICAgIExvZ2dlci5kZWJ1ZyhcIlRlc3Rpbmc6IENoYW5nZSB3c1VyaSBmb3IgXCIgKyBtaWxsaXMgKyBcIiBtaWxsaXMgdG8gc2ltdWxhdGUgbmV0IGZhaWx1cmVcIik7XG4gICAgICAgICAgICB2YXIgZ29vZFdzVXJpID0gd3NVcmk7XG4gICAgICAgICAgICB3c1VyaSA9IFwid3NzOi8vMjEuMjM0LjEyLjM0LjQ6NDQzL1wiO1xuXG4gICAgICAgICAgICBmb3JjaW5nRGlzY29ubmVjdGlvbiA9IHRydWU7XG5cbiAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgTG9nZ2VyLmRlYnVnKFwiVGVzdGluZzogUmVjb3ZlciBnb29kIHdzVXJpIFwiICsgZ29vZFdzVXJpKTtcbiAgICAgICAgICAgICAgICB3c1VyaSA9IGdvb2RXc1VyaTtcblxuICAgICAgICAgICAgICAgIGZvcmNpbmdEaXNjb25uZWN0aW9uID0gZmFsc2U7XG5cbiAgICAgICAgICAgIH0sIG1pbGxpcyk7XG4gICAgICAgIH1cblxuICAgICAgICB3cy5jbG9zZSgpO1xuICAgIH07XG5cbiAgICB0aGlzLnJlY29ubmVjdFdzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIExvZ2dlci5kZWJ1ZyhcInJlY29ubmVjdFdzXCIpO1xuICAgICAgICByZWNvbm5lY3RUb1NhbWVVcmkoTUFYX1JFVFJJRVMsIDEsIHdzVXJpKTtcbiAgICB9O1xuXG4gICAgdGhpcy5zZW5kID0gZnVuY3Rpb24obWVzc2FnZSkge1xuICAgICAgICB3cy5zZW5kKG1lc3NhZ2UpO1xuICAgIH07XG5cbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBjYWxsYmFjaykge1xuICAgICAgICByZWdpc3Rlck1lc3NhZ2VIYW5kbGVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB3cy5hZGRFdmVudExpc3RlbmVyKHR5cGUsIGNhbGxiYWNrKTtcbiAgICAgICAgfTtcblxuICAgICAgICByZWdpc3Rlck1lc3NhZ2VIYW5kbGVyKCk7XG4gICAgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBXZWJTb2NrZXRXaXRoUmVjb25uZWN0aW9uO1xuIiwiLypcbiAqIChDKSBDb3B5cmlnaHQgMjAxNCBLdXJlbnRvIChodHRwOi8va3VyZW50by5vcmcvKVxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKlxuICovXG5cblxudmFyIGRlZmluZVByb3BlcnR5X0lFOCA9IGZhbHNlXG5pZihPYmplY3QuZGVmaW5lUHJvcGVydHkpXG57XG4gIHRyeVxuICB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHt9LCBcInhcIiwge30pO1xuICB9XG4gIGNhdGNoKGUpXG4gIHtcbiAgICBkZWZpbmVQcm9wZXJ0eV9JRTggPSB0cnVlXG4gIH1cbn1cblxuLy8gaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvRnVuY3Rpb24vYmluZFxuaWYgKCFGdW5jdGlvbi5wcm90b3R5cGUuYmluZCkge1xuICBGdW5jdGlvbi5wcm90b3R5cGUuYmluZCA9IGZ1bmN0aW9uKG9UaGlzKSB7XG4gICAgaWYgKHR5cGVvZiB0aGlzICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAvLyBjbG9zZXN0IHRoaW5nIHBvc3NpYmxlIHRvIHRoZSBFQ01BU2NyaXB0IDVcbiAgICAgIC8vIGludGVybmFsIElzQ2FsbGFibGUgZnVuY3Rpb25cbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0Z1bmN0aW9uLnByb3RvdHlwZS5iaW5kIC0gd2hhdCBpcyB0cnlpbmcgdG8gYmUgYm91bmQgaXMgbm90IGNhbGxhYmxlJyk7XG4gICAgfVxuXG4gICAgdmFyIGFBcmdzICAgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpLFxuICAgICAgICBmVG9CaW5kID0gdGhpcyxcbiAgICAgICAgZk5PUCAgICA9IGZ1bmN0aW9uKCkge30sXG4gICAgICAgIGZCb3VuZCAgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4gZlRvQmluZC5hcHBseSh0aGlzIGluc3RhbmNlb2YgZk5PUCAmJiBvVGhpc1xuICAgICAgICAgICAgICAgICA/IHRoaXNcbiAgICAgICAgICAgICAgICAgOiBvVGhpcyxcbiAgICAgICAgICAgICAgICAgYUFyZ3MuY29uY2F0KEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbiAgICAgICAgfTtcblxuICAgIGZOT1AucHJvdG90eXBlID0gdGhpcy5wcm90b3R5cGU7XG4gICAgZkJvdW5kLnByb3RvdHlwZSA9IG5ldyBmTk9QKCk7XG5cbiAgICByZXR1cm4gZkJvdW5kO1xuICB9O1xufVxuXG5cbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXI7XG5cbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJyk7XG5cbnZhciBwYWNrZXJzID0gcmVxdWlyZSgnLi9wYWNrZXJzJyk7XG52YXIgTWFwcGVyID0gcmVxdWlyZSgnLi9NYXBwZXInKTtcblxuXG52YXIgQkFTRV9USU1FT1VUID0gNTAwMDtcblxuXG5mdW5jdGlvbiB1bmlmeVJlc3BvbnNlTWV0aG9kcyhyZXNwb25zZU1ldGhvZHMpXG57XG4gIGlmKCFyZXNwb25zZU1ldGhvZHMpIHJldHVybiB7fTtcblxuICBmb3IodmFyIGtleSBpbiByZXNwb25zZU1ldGhvZHMpXG4gIHtcbiAgICB2YXIgdmFsdWUgPSByZXNwb25zZU1ldGhvZHNba2V5XTtcblxuICAgIGlmKHR5cGVvZiB2YWx1ZSA9PSAnc3RyaW5nJylcbiAgICAgIHJlc3BvbnNlTWV0aG9kc1trZXldID1cbiAgICAgIHtcbiAgICAgICAgcmVzcG9uc2U6IHZhbHVlXG4gICAgICB9XG4gIH07XG5cbiAgcmV0dXJuIHJlc3BvbnNlTWV0aG9kcztcbn07XG5cbmZ1bmN0aW9uIHVuaWZ5VHJhbnNwb3J0KHRyYW5zcG9ydClcbntcbiAgaWYoIXRyYW5zcG9ydCkgcmV0dXJuO1xuXG4gIC8vIFRyYW5zcG9ydCBhcyBhIGZ1bmN0aW9uXG4gIGlmKHRyYW5zcG9ydCBpbnN0YW5jZW9mIEZ1bmN0aW9uKVxuICAgIHJldHVybiB7c2VuZDogdHJhbnNwb3J0fTtcblxuICAvLyBXZWJTb2NrZXQgJiBEYXRhQ2hhbm5lbFxuICBpZih0cmFuc3BvcnQuc2VuZCBpbnN0YW5jZW9mIEZ1bmN0aW9uKVxuICAgIHJldHVybiB0cmFuc3BvcnQ7XG5cbiAgLy8gTWVzc2FnZSBBUEkgKEludGVyLXdpbmRvdyAmIFdlYldvcmtlcilcbiAgaWYodHJhbnNwb3J0LnBvc3RNZXNzYWdlIGluc3RhbmNlb2YgRnVuY3Rpb24pXG4gIHtcbiAgICB0cmFuc3BvcnQuc2VuZCA9IHRyYW5zcG9ydC5wb3N0TWVzc2FnZTtcbiAgICByZXR1cm4gdHJhbnNwb3J0O1xuICB9XG5cbiAgLy8gU3RyZWFtIEFQSVxuICBpZih0cmFuc3BvcnQud3JpdGUgaW5zdGFuY2VvZiBGdW5jdGlvbilcbiAge1xuICAgIHRyYW5zcG9ydC5zZW5kID0gdHJhbnNwb3J0LndyaXRlO1xuICAgIHJldHVybiB0cmFuc3BvcnQ7XG4gIH1cblxuICAvLyBUcmFuc3BvcnRzIHRoYXQgb25seSBjYW4gcmVjZWl2ZSBtZXNzYWdlcywgYnV0IG5vdCBzZW5kXG4gIGlmKHRyYW5zcG9ydC5vbm1lc3NhZ2UgIT09IHVuZGVmaW5lZCkgcmV0dXJuO1xuICBpZih0cmFuc3BvcnQucGF1c2UgaW5zdGFuY2VvZiBGdW5jdGlvbikgcmV0dXJuO1xuXG4gIHRocm93IG5ldyBTeW50YXhFcnJvcihcIlRyYW5zcG9ydCBpcyBub3QgYSBmdW5jdGlvbiBub3IgYSB2YWxpZCBvYmplY3RcIik7XG59O1xuXG5cbi8qKlxuICogUmVwcmVzZW50YXRpb24gb2YgYSBSUEMgbm90aWZpY2F0aW9uXG4gKlxuICogQGNsYXNzXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG1ldGhvZCAtbWV0aG9kIG9mIHRoZSBub3RpZmljYXRpb25cbiAqIEBwYXJhbSBwYXJhbXMgLSBwYXJhbWV0ZXJzIG9mIHRoZSBub3RpZmljYXRpb25cbiAqL1xuZnVuY3Rpb24gUnBjTm90aWZpY2F0aW9uKG1ldGhvZCwgcGFyYW1zKVxue1xuICBpZihkZWZpbmVQcm9wZXJ0eV9JRTgpXG4gIHtcbiAgICB0aGlzLm1ldGhvZCA9IG1ldGhvZFxuICAgIHRoaXMucGFyYW1zID0gcGFyYW1zXG4gIH1cbiAgZWxzZVxuICB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdtZXRob2QnLCB7dmFsdWU6IG1ldGhvZCwgZW51bWVyYWJsZTogdHJ1ZX0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAncGFyYW1zJywge3ZhbHVlOiBwYXJhbXMsIGVudW1lcmFibGU6IHRydWV9KTtcbiAgfVxufTtcblxuXG4vKipcbiAqIEBjbGFzc1xuICpcbiAqIEBjb25zdHJ1Y3RvclxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBwYWNrZXJcbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gW29wdGlvbnNdXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IFt0cmFuc3BvcnRdXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW29uUmVxdWVzdF1cbiAqL1xuZnVuY3Rpb24gUnBjQnVpbGRlcihwYWNrZXIsIG9wdGlvbnMsIHRyYW5zcG9ydCwgb25SZXF1ZXN0KVxue1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgaWYoIXBhY2tlcilcbiAgICB0aHJvdyBuZXcgU3ludGF4RXJyb3IoJ1BhY2tlciBpcyBub3QgZGVmaW5lZCcpO1xuXG4gIGlmKCFwYWNrZXIucGFjayB8fCAhcGFja2VyLnVucGFjaylcbiAgICB0aHJvdyBuZXcgU3ludGF4RXJyb3IoJ1BhY2tlciBpcyBpbnZhbGlkJyk7XG5cbiAgdmFyIHJlc3BvbnNlTWV0aG9kcyA9IHVuaWZ5UmVzcG9uc2VNZXRob2RzKHBhY2tlci5yZXNwb25zZU1ldGhvZHMpO1xuXG5cbiAgaWYob3B0aW9ucyBpbnN0YW5jZW9mIEZ1bmN0aW9uKVxuICB7XG4gICAgaWYodHJhbnNwb3J0ICE9IHVuZGVmaW5lZClcbiAgICAgIHRocm93IG5ldyBTeW50YXhFcnJvcihcIlRoZXJlIGNhbid0IGJlIHBhcmFtZXRlcnMgYWZ0ZXIgb25SZXF1ZXN0XCIpO1xuXG4gICAgb25SZXF1ZXN0ID0gb3B0aW9ucztcbiAgICB0cmFuc3BvcnQgPSB1bmRlZmluZWQ7XG4gICAgb3B0aW9ucyAgID0gdW5kZWZpbmVkO1xuICB9O1xuXG4gIGlmKG9wdGlvbnMgJiYgb3B0aW9ucy5zZW5kIGluc3RhbmNlb2YgRnVuY3Rpb24pXG4gIHtcbiAgICBpZih0cmFuc3BvcnQgJiYgISh0cmFuc3BvcnQgaW5zdGFuY2VvZiBGdW5jdGlvbikpXG4gICAgICB0aHJvdyBuZXcgU3ludGF4RXJyb3IoXCJPbmx5IGEgZnVuY3Rpb24gY2FuIGJlIGFmdGVyIHRyYW5zcG9ydFwiKTtcblxuICAgIG9uUmVxdWVzdCA9IHRyYW5zcG9ydDtcbiAgICB0cmFuc3BvcnQgPSBvcHRpb25zO1xuICAgIG9wdGlvbnMgICA9IHVuZGVmaW5lZDtcbiAgfTtcblxuICBpZih0cmFuc3BvcnQgaW5zdGFuY2VvZiBGdW5jdGlvbilcbiAge1xuICAgIGlmKG9uUmVxdWVzdCAhPSB1bmRlZmluZWQpXG4gICAgICB0aHJvdyBuZXcgU3ludGF4RXJyb3IoXCJUaGVyZSBjYW4ndCBiZSBwYXJhbWV0ZXJzIGFmdGVyIG9uUmVxdWVzdFwiKTtcblxuICAgIG9uUmVxdWVzdCA9IHRyYW5zcG9ydDtcbiAgICB0cmFuc3BvcnQgPSB1bmRlZmluZWQ7XG4gIH07XG5cbiAgaWYodHJhbnNwb3J0ICYmIHRyYW5zcG9ydC5zZW5kIGluc3RhbmNlb2YgRnVuY3Rpb24pXG4gICAgaWYob25SZXF1ZXN0ICYmICEob25SZXF1ZXN0IGluc3RhbmNlb2YgRnVuY3Rpb24pKVxuICAgICAgdGhyb3cgbmV3IFN5bnRheEVycm9yKFwiT25seSBhIGZ1bmN0aW9uIGNhbiBiZSBhZnRlciB0cmFuc3BvcnRcIik7XG5cbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cblxuICBFdmVudEVtaXR0ZXIuY2FsbCh0aGlzKTtcblxuICBpZihvblJlcXVlc3QpXG4gICAgdGhpcy5vbigncmVxdWVzdCcsIG9uUmVxdWVzdCk7XG5cblxuICBpZihkZWZpbmVQcm9wZXJ0eV9JRTgpXG4gICAgdGhpcy5wZWVySUQgPSBvcHRpb25zLnBlZXJJRFxuICBlbHNlXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdwZWVySUQnLCB7dmFsdWU6IG9wdGlvbnMucGVlcklEfSk7XG5cbiAgdmFyIG1heF9yZXRyaWVzID0gb3B0aW9ucy5tYXhfcmV0cmllcyB8fCAwO1xuXG5cbiAgZnVuY3Rpb24gdHJhbnNwb3J0TWVzc2FnZShldmVudClcbiAge1xuICAgIHNlbGYuZGVjb2RlKGV2ZW50LmRhdGEgfHwgZXZlbnQpO1xuICB9O1xuXG4gIHRoaXMuZ2V0VHJhbnNwb3J0ID0gZnVuY3Rpb24oKVxuICB7XG4gICAgcmV0dXJuIHRyYW5zcG9ydDtcbiAgfVxuICB0aGlzLnNldFRyYW5zcG9ydCA9IGZ1bmN0aW9uKHZhbHVlKVxuICB7XG4gICAgLy8gUmVtb3ZlIGxpc3RlbmVyIGZyb20gb2xkIHRyYW5zcG9ydFxuICAgIGlmKHRyYW5zcG9ydClcbiAgICB7XG4gICAgICAvLyBXM0MgdHJhbnNwb3J0c1xuICAgICAgaWYodHJhbnNwb3J0LnJlbW92ZUV2ZW50TGlzdGVuZXIpXG4gICAgICAgIHRyYW5zcG9ydC5yZW1vdmVFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgdHJhbnNwb3J0TWVzc2FnZSk7XG5cbiAgICAgIC8vIE5vZGUuanMgU3RyZWFtcyBBUElcbiAgICAgIGVsc2UgaWYodHJhbnNwb3J0LnJlbW92ZUxpc3RlbmVyKVxuICAgICAgICB0cmFuc3BvcnQucmVtb3ZlTGlzdGVuZXIoJ2RhdGEnLCB0cmFuc3BvcnRNZXNzYWdlKTtcbiAgICB9O1xuXG4gICAgLy8gU2V0IGxpc3RlbmVyIG9uIG5ldyB0cmFuc3BvcnRcbiAgICBpZih2YWx1ZSlcbiAgICB7XG4gICAgICAvLyBXM0MgdHJhbnNwb3J0c1xuICAgICAgaWYodmFsdWUuYWRkRXZlbnRMaXN0ZW5lcilcbiAgICAgICAgdmFsdWUuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIHRyYW5zcG9ydE1lc3NhZ2UpO1xuXG4gICAgICAvLyBOb2RlLmpzIFN0cmVhbXMgQVBJXG4gICAgICBlbHNlIGlmKHZhbHVlLmFkZExpc3RlbmVyKVxuICAgICAgICB2YWx1ZS5hZGRMaXN0ZW5lcignZGF0YScsIHRyYW5zcG9ydE1lc3NhZ2UpO1xuICAgIH07XG5cbiAgICB0cmFuc3BvcnQgPSB1bmlmeVRyYW5zcG9ydCh2YWx1ZSk7XG4gIH1cblxuICBpZighZGVmaW5lUHJvcGVydHlfSUU4KVxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAndHJhbnNwb3J0JyxcbiAgICB7XG4gICAgICBnZXQ6IHRoaXMuZ2V0VHJhbnNwb3J0LmJpbmQodGhpcyksXG4gICAgICBzZXQ6IHRoaXMuc2V0VHJhbnNwb3J0LmJpbmQodGhpcylcbiAgICB9KVxuXG4gIHRoaXMuc2V0VHJhbnNwb3J0KHRyYW5zcG9ydCk7XG5cblxuICB2YXIgcmVxdWVzdF90aW1lb3V0ICAgICAgPSBvcHRpb25zLnJlcXVlc3RfdGltZW91dCAgICAgIHx8IEJBU0VfVElNRU9VVDtcbiAgdmFyIHBpbmdfcmVxdWVzdF90aW1lb3V0ID0gb3B0aW9ucy5waW5nX3JlcXVlc3RfdGltZW91dCB8fCByZXF1ZXN0X3RpbWVvdXQ7XG4gIHZhciByZXNwb25zZV90aW1lb3V0ICAgICA9IG9wdGlvbnMucmVzcG9uc2VfdGltZW91dCAgICAgfHwgQkFTRV9USU1FT1VUO1xuICB2YXIgZHVwbGljYXRlc190aW1lb3V0ICAgPSBvcHRpb25zLmR1cGxpY2F0ZXNfdGltZW91dCAgIHx8IEJBU0VfVElNRU9VVDtcblxuXG4gIHZhciByZXF1ZXN0SUQgPSAwO1xuXG4gIHZhciByZXF1ZXN0cyAgPSBuZXcgTWFwcGVyKCk7XG4gIHZhciByZXNwb25zZXMgPSBuZXcgTWFwcGVyKCk7XG4gIHZhciBwcm9jZXNzZWRSZXNwb25zZXMgPSBuZXcgTWFwcGVyKCk7XG5cbiAgdmFyIG1lc3NhZ2UyS2V5ID0ge307XG5cblxuICAvKipcbiAgICogU3RvcmUgdGhlIHJlc3BvbnNlIHRvIHByZXZlbnQgdG8gcHJvY2VzcyBkdXBsaWNhdGUgcmVxdWVzdCBsYXRlclxuICAgKi9cbiAgZnVuY3Rpb24gc3RvcmVSZXNwb25zZShtZXNzYWdlLCBpZCwgZGVzdClcbiAge1xuICAgIHZhciByZXNwb25zZSA9XG4gICAge1xuICAgICAgbWVzc2FnZTogbWVzc2FnZSxcbiAgICAgIC8qKiBUaW1lb3V0IHRvIGF1dG8tY2xlYW4gb2xkIHJlc3BvbnNlcyAqL1xuICAgICAgdGltZW91dDogc2V0VGltZW91dChmdW5jdGlvbigpXG4gICAgICB7XG4gICAgICAgIHJlc3BvbnNlcy5yZW1vdmUoaWQsIGRlc3QpO1xuICAgICAgfSxcbiAgICAgIHJlc3BvbnNlX3RpbWVvdXQpXG4gICAgfTtcblxuICAgIHJlc3BvbnNlcy5zZXQocmVzcG9uc2UsIGlkLCBkZXN0KTtcbiAgfTtcblxuICAvKipcbiAgICogU3RvcmUgdGhlIHJlc3BvbnNlIHRvIGlnbm9yZSBkdXBsaWNhdGVkIG1lc3NhZ2VzIGxhdGVyXG4gICAqL1xuICBmdW5jdGlvbiBzdG9yZVByb2Nlc3NlZFJlc3BvbnNlKGFjaywgZnJvbSlcbiAge1xuICAgIHZhciB0aW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbigpXG4gICAge1xuICAgICAgcHJvY2Vzc2VkUmVzcG9uc2VzLnJlbW92ZShhY2ssIGZyb20pO1xuICAgIH0sXG4gICAgZHVwbGljYXRlc190aW1lb3V0KTtcblxuICAgIHByb2Nlc3NlZFJlc3BvbnNlcy5zZXQodGltZW91dCwgYWNrLCBmcm9tKTtcbiAgfTtcblxuXG4gIC8qKlxuICAgKiBSZXByZXNlbnRhdGlvbiBvZiBhIFJQQyByZXF1ZXN0XG4gICAqXG4gICAqIEBjbGFzc1xuICAgKiBAZXh0ZW5kcyBScGNOb3RpZmljYXRpb25cbiAgICpcbiAgICogQGNvbnN0cnVjdG9yXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBtZXRob2QgLW1ldGhvZCBvZiB0aGUgbm90aWZpY2F0aW9uXG4gICAqIEBwYXJhbSBwYXJhbXMgLSBwYXJhbWV0ZXJzIG9mIHRoZSBub3RpZmljYXRpb25cbiAgICogQHBhcmFtIHtJbnRlZ2VyfSBpZCAtIGlkZW50aWZpZXIgb2YgdGhlIHJlcXVlc3RcbiAgICogQHBhcmFtIFtmcm9tXSAtIHNvdXJjZSBvZiB0aGUgbm90aWZpY2F0aW9uXG4gICAqL1xuICBmdW5jdGlvbiBScGNSZXF1ZXN0KG1ldGhvZCwgcGFyYW1zLCBpZCwgZnJvbSwgdHJhbnNwb3J0KVxuICB7XG4gICAgUnBjTm90aWZpY2F0aW9uLmNhbGwodGhpcywgbWV0aG9kLCBwYXJhbXMpO1xuXG4gICAgdGhpcy5nZXRUcmFuc3BvcnQgPSBmdW5jdGlvbigpXG4gICAge1xuICAgICAgcmV0dXJuIHRyYW5zcG9ydDtcbiAgICB9XG4gICAgdGhpcy5zZXRUcmFuc3BvcnQgPSBmdW5jdGlvbih2YWx1ZSlcbiAgICB7XG4gICAgICB0cmFuc3BvcnQgPSB1bmlmeVRyYW5zcG9ydCh2YWx1ZSk7XG4gICAgfVxuXG4gICAgaWYoIWRlZmluZVByb3BlcnR5X0lFOClcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAndHJhbnNwb3J0JyxcbiAgICAgIHtcbiAgICAgICAgZ2V0OiB0aGlzLmdldFRyYW5zcG9ydC5iaW5kKHRoaXMpLFxuICAgICAgICBzZXQ6IHRoaXMuc2V0VHJhbnNwb3J0LmJpbmQodGhpcylcbiAgICAgIH0pXG5cbiAgICB2YXIgcmVzcG9uc2UgPSByZXNwb25zZXMuZ2V0KGlkLCBmcm9tKTtcblxuICAgIC8qKlxuICAgICAqIEBjb25zdGFudCB7Qm9vbGVhbn0gZHVwbGljYXRlZFxuICAgICAqL1xuICAgIGlmKCEodHJhbnNwb3J0IHx8IHNlbGYuZ2V0VHJhbnNwb3J0KCkpKVxuICAgIHtcbiAgICAgIGlmKGRlZmluZVByb3BlcnR5X0lFOClcbiAgICAgICAgdGhpcy5kdXBsaWNhdGVkID0gQm9vbGVhbihyZXNwb25zZSlcbiAgICAgIGVsc2VcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdkdXBsaWNhdGVkJyxcbiAgICAgICAge1xuICAgICAgICAgIHZhbHVlOiBCb29sZWFuKHJlc3BvbnNlKVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICB2YXIgcmVzcG9uc2VNZXRob2QgPSByZXNwb25zZU1ldGhvZHNbbWV0aG9kXTtcblxuICAgIHRoaXMucGFjayA9IHBhY2tlci5wYWNrLmJpbmQocGFja2VyLCB0aGlzLCBpZClcblxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlIGEgcmVzcG9uc2UgdG8gdGhpcyByZXF1ZXN0XG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0Vycm9yfSBbZXJyb3JdXG4gICAgICogQHBhcmFtIHsqfSBbcmVzdWx0XVxuICAgICAqXG4gICAgICogQHJldHVybnMge3N0cmluZ31cbiAgICAgKi9cbiAgICB0aGlzLnJlcGx5ID0gZnVuY3Rpb24oZXJyb3IsIHJlc3VsdCwgdHJhbnNwb3J0KVxuICAgIHtcbiAgICAgIC8vIEZpeCBvcHRpb25hbCBwYXJhbWV0ZXJzXG4gICAgICBpZihlcnJvciBpbnN0YW5jZW9mIEZ1bmN0aW9uIHx8IGVycm9yICYmIGVycm9yLnNlbmQgaW5zdGFuY2VvZiBGdW5jdGlvbilcbiAgICAgIHtcbiAgICAgICAgaWYocmVzdWx0ICE9IHVuZGVmaW5lZClcbiAgICAgICAgICB0aHJvdyBuZXcgU3ludGF4RXJyb3IoXCJUaGVyZSBjYW4ndCBiZSBwYXJhbWV0ZXJzIGFmdGVyIGNhbGxiYWNrXCIpO1xuXG4gICAgICAgIHRyYW5zcG9ydCA9IGVycm9yO1xuICAgICAgICByZXN1bHQgPSBudWxsO1xuICAgICAgICBlcnJvciA9IHVuZGVmaW5lZDtcbiAgICAgIH1cblxuICAgICAgZWxzZSBpZihyZXN1bHQgaW5zdGFuY2VvZiBGdW5jdGlvblxuICAgICAgfHwgcmVzdWx0ICYmIHJlc3VsdC5zZW5kIGluc3RhbmNlb2YgRnVuY3Rpb24pXG4gICAgICB7XG4gICAgICAgIGlmKHRyYW5zcG9ydCAhPSB1bmRlZmluZWQpXG4gICAgICAgICAgdGhyb3cgbmV3IFN5bnRheEVycm9yKFwiVGhlcmUgY2FuJ3QgYmUgcGFyYW1ldGVycyBhZnRlciBjYWxsYmFja1wiKTtcblxuICAgICAgICB0cmFuc3BvcnQgPSByZXN1bHQ7XG4gICAgICAgIHJlc3VsdCA9IG51bGw7XG4gICAgICB9O1xuXG4gICAgICB0cmFuc3BvcnQgPSB1bmlmeVRyYW5zcG9ydCh0cmFuc3BvcnQpO1xuXG4gICAgICAvLyBEdXBsaWNhdGVkIHJlcXVlc3QsIHJlbW92ZSBvbGQgcmVzcG9uc2UgdGltZW91dFxuICAgICAgaWYocmVzcG9uc2UpXG4gICAgICAgIGNsZWFyVGltZW91dChyZXNwb25zZS50aW1lb3V0KTtcblxuICAgICAgaWYoZnJvbSAhPSB1bmRlZmluZWQpXG4gICAgICB7XG4gICAgICAgIGlmKGVycm9yKVxuICAgICAgICAgIGVycm9yLmRlc3QgPSBmcm9tO1xuXG4gICAgICAgIGlmKHJlc3VsdClcbiAgICAgICAgICByZXN1bHQuZGVzdCA9IGZyb207XG4gICAgICB9O1xuXG4gICAgICB2YXIgbWVzc2FnZTtcblxuICAgICAgLy8gTmV3IHJlcXVlc3Qgb3Igb3ZlcnJpZGVuIG9uZSwgY3JlYXRlIG5ldyByZXNwb25zZSB3aXRoIHByb3ZpZGVkIGRhdGFcbiAgICAgIGlmKGVycm9yIHx8IHJlc3VsdCAhPSB1bmRlZmluZWQpXG4gICAgICB7XG4gICAgICAgIGlmKHNlbGYucGVlcklEICE9IHVuZGVmaW5lZClcbiAgICAgICAge1xuICAgICAgICAgIGlmKGVycm9yKVxuICAgICAgICAgICAgZXJyb3IuZnJvbSA9IHNlbGYucGVlcklEO1xuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIHJlc3VsdC5mcm9tID0gc2VsZi5wZWVySUQ7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBQcm90b2NvbCBpbmRpY2F0ZXMgdGhhdCByZXNwb25zZXMgaGFzIG93biByZXF1ZXN0IG1ldGhvZHNcbiAgICAgICAgaWYocmVzcG9uc2VNZXRob2QpXG4gICAgICAgIHtcbiAgICAgICAgICBpZihyZXNwb25zZU1ldGhvZC5lcnJvciA9PSB1bmRlZmluZWQgJiYgZXJyb3IpXG4gICAgICAgICAgICBtZXNzYWdlID1cbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgZXJyb3I6IGVycm9yXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgZWxzZVxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHZhciBtZXRob2QgPSBlcnJvclxuICAgICAgICAgICAgICAgICAgICAgICA/IHJlc3BvbnNlTWV0aG9kLmVycm9yXG4gICAgICAgICAgICAgICAgICAgICAgIDogcmVzcG9uc2VNZXRob2QucmVzcG9uc2U7XG5cbiAgICAgICAgICAgIG1lc3NhZ2UgPVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBtZXRob2Q6IG1ldGhvZCxcbiAgICAgICAgICAgICAgcGFyYW1zOiBlcnJvciB8fCByZXN1bHRcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2VcbiAgICAgICAgICBtZXNzYWdlID1cbiAgICAgICAgICB7XG4gICAgICAgICAgICBlcnJvcjogIGVycm9yLFxuICAgICAgICAgICAgcmVzdWx0OiByZXN1bHRcbiAgICAgICAgICB9O1xuXG4gICAgICAgIG1lc3NhZ2UgPSBwYWNrZXIucGFjayhtZXNzYWdlLCBpZCk7XG4gICAgICB9XG5cbiAgICAgIC8vIER1cGxpY2F0ZSAmIG5vdC1vdmVycmlkZW4gcmVxdWVzdCwgcmUtc2VuZCBvbGQgcmVzcG9uc2VcbiAgICAgIGVsc2UgaWYocmVzcG9uc2UpXG4gICAgICAgIG1lc3NhZ2UgPSByZXNwb25zZS5tZXNzYWdlO1xuXG4gICAgICAvLyBOZXcgZW1wdHkgcmVwbHksIHJlc3BvbnNlIG51bGwgdmFsdWVcbiAgICAgIGVsc2VcbiAgICAgICAgbWVzc2FnZSA9IHBhY2tlci5wYWNrKHtyZXN1bHQ6IG51bGx9LCBpZCk7XG5cbiAgICAgIC8vIFN0b3JlIHRoZSByZXNwb25zZSB0byBwcmV2ZW50IHRvIHByb2Nlc3MgYSBkdXBsaWNhdGVkIHJlcXVlc3QgbGF0ZXJcbiAgICAgIHN0b3JlUmVzcG9uc2UobWVzc2FnZSwgaWQsIGZyb20pO1xuXG4gICAgICAvLyBSZXR1cm4gdGhlIHN0b3JlZCByZXNwb25zZSBzbyBpdCBjYW4gYmUgZGlyZWN0bHkgc2VuZCBiYWNrXG4gICAgICB0cmFuc3BvcnQgPSB0cmFuc3BvcnQgfHwgdGhpcy5nZXRUcmFuc3BvcnQoKSB8fCBzZWxmLmdldFRyYW5zcG9ydCgpO1xuXG4gICAgICBpZih0cmFuc3BvcnQpXG4gICAgICAgIHJldHVybiB0cmFuc3BvcnQuc2VuZChtZXNzYWdlKTtcblxuICAgICAgcmV0dXJuIG1lc3NhZ2U7XG4gICAgfVxuICB9O1xuICBpbmhlcml0cyhScGNSZXF1ZXN0LCBScGNOb3RpZmljYXRpb24pO1xuXG5cbiAgZnVuY3Rpb24gY2FuY2VsKG1lc3NhZ2UpXG4gIHtcbiAgICB2YXIga2V5ID0gbWVzc2FnZTJLZXlbbWVzc2FnZV07XG4gICAgaWYoIWtleSkgcmV0dXJuO1xuXG4gICAgZGVsZXRlIG1lc3NhZ2UyS2V5W21lc3NhZ2VdO1xuXG4gICAgdmFyIHJlcXVlc3QgPSByZXF1ZXN0cy5wb3Aoa2V5LmlkLCBrZXkuZGVzdCk7XG4gICAgaWYoIXJlcXVlc3QpIHJldHVybjtcblxuICAgIGNsZWFyVGltZW91dChyZXF1ZXN0LnRpbWVvdXQpO1xuXG4gICAgLy8gU3RhcnQgZHVwbGljYXRlZCByZXNwb25zZXMgdGltZW91dFxuICAgIHN0b3JlUHJvY2Vzc2VkUmVzcG9uc2Uoa2V5LmlkLCBrZXkuZGVzdCk7XG4gIH07XG5cbiAgLyoqXG4gICAqIEFsbG93IHRvIGNhbmNlbCBhIHJlcXVlc3QgYW5kIGRvbid0IHdhaXQgZm9yIGEgcmVzcG9uc2VcbiAgICpcbiAgICogSWYgYG1lc3NhZ2VgIGlzIG5vdCBnaXZlbiwgY2FuY2VsIGFsbCB0aGUgcmVxdWVzdFxuICAgKi9cbiAgdGhpcy5jYW5jZWwgPSBmdW5jdGlvbihtZXNzYWdlKVxuICB7XG4gICAgaWYobWVzc2FnZSkgcmV0dXJuIGNhbmNlbChtZXNzYWdlKTtcblxuICAgIGZvcih2YXIgbWVzc2FnZSBpbiBtZXNzYWdlMktleSlcbiAgICAgIGNhbmNlbChtZXNzYWdlKTtcbiAgfTtcblxuXG4gIHRoaXMuY2xvc2UgPSBmdW5jdGlvbigpXG4gIHtcbiAgICAvLyBQcmV2ZW50IHRvIHJlY2VpdmUgbmV3IG1lc3NhZ2VzXG4gICAgdmFyIHRyYW5zcG9ydCA9IHRoaXMuZ2V0VHJhbnNwb3J0KCk7XG4gICAgaWYodHJhbnNwb3J0ICYmIHRyYW5zcG9ydC5jbG9zZSlcbiAgICAgICB0cmFuc3BvcnQuY2xvc2UoKTtcblxuICAgIC8vIFJlcXVlc3QgJiBwcm9jZXNzZWQgcmVzcG9uc2VzXG4gICAgdGhpcy5jYW5jZWwoKTtcblxuICAgIHByb2Nlc3NlZFJlc3BvbnNlcy5mb3JFYWNoKGNsZWFyVGltZW91dCk7XG5cbiAgICAvLyBSZXNwb25zZXNcbiAgICByZXNwb25zZXMuZm9yRWFjaChmdW5jdGlvbihyZXNwb25zZSlcbiAgICB7XG4gICAgICBjbGVhclRpbWVvdXQocmVzcG9uc2UudGltZW91dCk7XG4gICAgfSk7XG4gIH07XG5cblxuICAvKipcbiAgICogR2VuZXJhdGVzIGFuZCBlbmNvZGUgYSBKc29uUlBDIDIuMCBtZXNzYWdlXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBtZXRob2QgLW1ldGhvZCBvZiB0aGUgbm90aWZpY2F0aW9uXG4gICAqIEBwYXJhbSBwYXJhbXMgLSBwYXJhbWV0ZXJzIG9mIHRoZSBub3RpZmljYXRpb25cbiAgICogQHBhcmFtIFtkZXN0XSAtIGRlc3RpbmF0aW9uIG9mIHRoZSBub3RpZmljYXRpb25cbiAgICogQHBhcmFtIHtvYmplY3R9IFt0cmFuc3BvcnRdIC0gdHJhbnNwb3J0IHdoZXJlIHRvIHNlbmQgdGhlIG1lc3NhZ2VcbiAgICogQHBhcmFtIFtjYWxsYmFja10gLSBmdW5jdGlvbiBjYWxsZWQgd2hlbiBhIHJlc3BvbnNlIHRvIHRoaXMgcmVxdWVzdCBpc1xuICAgKiAgIHJlY2VpdmVkLiBJZiBub3QgZGVmaW5lZCwgYSBub3RpZmljYXRpb24gd2lsbCBiZSBzZW5kIGluc3RlYWRcbiAgICpcbiAgICogQHJldHVybnMge3N0cmluZ30gQSByYXcgSnNvblJQQyAyLjAgcmVxdWVzdCBvciBub3RpZmljYXRpb24gc3RyaW5nXG4gICAqL1xuICB0aGlzLmVuY29kZSA9IGZ1bmN0aW9uKG1ldGhvZCwgcGFyYW1zLCBkZXN0LCB0cmFuc3BvcnQsIGNhbGxiYWNrKVxuICB7XG4gICAgLy8gRml4IG9wdGlvbmFsIHBhcmFtZXRlcnNcbiAgICBpZihwYXJhbXMgaW5zdGFuY2VvZiBGdW5jdGlvbilcbiAgICB7XG4gICAgICBpZihkZXN0ICE9IHVuZGVmaW5lZClcbiAgICAgICAgdGhyb3cgbmV3IFN5bnRheEVycm9yKFwiVGhlcmUgY2FuJ3QgYmUgcGFyYW1ldGVycyBhZnRlciBjYWxsYmFja1wiKTtcblxuICAgICAgY2FsbGJhY2sgID0gcGFyYW1zO1xuICAgICAgdHJhbnNwb3J0ID0gdW5kZWZpbmVkO1xuICAgICAgZGVzdCAgICAgID0gdW5kZWZpbmVkO1xuICAgICAgcGFyYW1zICAgID0gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGVsc2UgaWYoZGVzdCBpbnN0YW5jZW9mIEZ1bmN0aW9uKVxuICAgIHtcbiAgICAgIGlmKHRyYW5zcG9ydCAhPSB1bmRlZmluZWQpXG4gICAgICAgIHRocm93IG5ldyBTeW50YXhFcnJvcihcIlRoZXJlIGNhbid0IGJlIHBhcmFtZXRlcnMgYWZ0ZXIgY2FsbGJhY2tcIik7XG5cbiAgICAgIGNhbGxiYWNrICA9IGRlc3Q7XG4gICAgICB0cmFuc3BvcnQgPSB1bmRlZmluZWQ7XG4gICAgICBkZXN0ICAgICAgPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgZWxzZSBpZih0cmFuc3BvcnQgaW5zdGFuY2VvZiBGdW5jdGlvbilcbiAgICB7XG4gICAgICBpZihjYWxsYmFjayAhPSB1bmRlZmluZWQpXG4gICAgICAgIHRocm93IG5ldyBTeW50YXhFcnJvcihcIlRoZXJlIGNhbid0IGJlIHBhcmFtZXRlcnMgYWZ0ZXIgY2FsbGJhY2tcIik7XG5cbiAgICAgIGNhbGxiYWNrICA9IHRyYW5zcG9ydDtcbiAgICAgIHRyYW5zcG9ydCA9IHVuZGVmaW5lZDtcbiAgICB9O1xuXG4gICAgaWYoc2VsZi5wZWVySUQgIT0gdW5kZWZpbmVkKVxuICAgIHtcbiAgICAgIHBhcmFtcyA9IHBhcmFtcyB8fCB7fTtcblxuICAgICAgcGFyYW1zLmZyb20gPSBzZWxmLnBlZXJJRDtcbiAgICB9O1xuXG4gICAgaWYoZGVzdCAhPSB1bmRlZmluZWQpXG4gICAge1xuICAgICAgcGFyYW1zID0gcGFyYW1zIHx8IHt9O1xuXG4gICAgICBwYXJhbXMuZGVzdCA9IGRlc3Q7XG4gICAgfTtcblxuICAgIC8vIEVuY29kZSBtZXNzYWdlXG4gICAgdmFyIG1lc3NhZ2UgPVxuICAgIHtcbiAgICAgIG1ldGhvZDogbWV0aG9kLFxuICAgICAgcGFyYW1zOiBwYXJhbXNcbiAgICB9O1xuXG4gICAgaWYoY2FsbGJhY2spXG4gICAge1xuICAgICAgdmFyIGlkID0gcmVxdWVzdElEKys7XG4gICAgICB2YXIgcmV0cmllZCA9IDA7XG5cbiAgICAgIG1lc3NhZ2UgPSBwYWNrZXIucGFjayhtZXNzYWdlLCBpZCk7XG5cbiAgICAgIGZ1bmN0aW9uIGRpc3BhdGNoQ2FsbGJhY2soZXJyb3IsIHJlc3VsdClcbiAgICAgIHtcbiAgICAgICAgc2VsZi5jYW5jZWwobWVzc2FnZSk7XG5cbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIHJlc3VsdCk7XG4gICAgICB9O1xuXG4gICAgICB2YXIgcmVxdWVzdCA9XG4gICAgICB7XG4gICAgICAgIG1lc3NhZ2U6ICAgICAgICAgbWVzc2FnZSxcbiAgICAgICAgY2FsbGJhY2s6ICAgICAgICBkaXNwYXRjaENhbGxiYWNrLFxuICAgICAgICByZXNwb25zZU1ldGhvZHM6IHJlc3BvbnNlTWV0aG9kc1ttZXRob2RdIHx8IHt9XG4gICAgICB9O1xuXG4gICAgICB2YXIgZW5jb2RlX3RyYW5zcG9ydCA9IHVuaWZ5VHJhbnNwb3J0KHRyYW5zcG9ydCk7XG5cbiAgICAgIGZ1bmN0aW9uIHNlbmRSZXF1ZXN0KHRyYW5zcG9ydClcbiAgICAgIHtcbiAgICAgICAgdmFyIHJ0ID0gKG1ldGhvZCA9PT0gJ3BpbmcnID8gcGluZ19yZXF1ZXN0X3RpbWVvdXQgOiByZXF1ZXN0X3RpbWVvdXQpO1xuICAgICAgICByZXF1ZXN0LnRpbWVvdXQgPSBzZXRUaW1lb3V0KHRpbWVvdXQsIHJ0Kk1hdGgucG93KDIsIHJldHJpZWQrKykpO1xuICAgICAgICBtZXNzYWdlMktleVttZXNzYWdlXSA9IHtpZDogaWQsIGRlc3Q6IGRlc3R9O1xuICAgICAgICByZXF1ZXN0cy5zZXQocmVxdWVzdCwgaWQsIGRlc3QpO1xuXG4gICAgICAgIHRyYW5zcG9ydCA9IHRyYW5zcG9ydCB8fCBlbmNvZGVfdHJhbnNwb3J0IHx8IHNlbGYuZ2V0VHJhbnNwb3J0KCk7XG4gICAgICAgIGlmKHRyYW5zcG9ydClcbiAgICAgICAgICByZXR1cm4gdHJhbnNwb3J0LnNlbmQobWVzc2FnZSk7XG5cbiAgICAgICAgcmV0dXJuIG1lc3NhZ2U7XG4gICAgICB9O1xuXG4gICAgICBmdW5jdGlvbiByZXRyeSh0cmFuc3BvcnQpXG4gICAgICB7XG4gICAgICAgIHRyYW5zcG9ydCA9IHVuaWZ5VHJhbnNwb3J0KHRyYW5zcG9ydCk7XG5cbiAgICAgICAgY29uc29sZS53YXJuKHJldHJpZWQrJyByZXRyeSBmb3IgcmVxdWVzdCBtZXNzYWdlOicsbWVzc2FnZSk7XG5cbiAgICAgICAgdmFyIHRpbWVvdXQgPSBwcm9jZXNzZWRSZXNwb25zZXMucG9wKGlkLCBkZXN0KTtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuXG4gICAgICAgIHJldHVybiBzZW5kUmVxdWVzdCh0cmFuc3BvcnQpO1xuICAgICAgfTtcblxuICAgICAgZnVuY3Rpb24gdGltZW91dCgpXG4gICAgICB7XG4gICAgICAgIGlmKHJldHJpZWQgPCBtYXhfcmV0cmllcylcbiAgICAgICAgICByZXR1cm4gcmV0cnkodHJhbnNwb3J0KTtcblxuICAgICAgICB2YXIgZXJyb3IgPSBuZXcgRXJyb3IoJ1JlcXVlc3QgaGFzIHRpbWVkIG91dCcpO1xuICAgICAgICAgICAgZXJyb3IucmVxdWVzdCA9IG1lc3NhZ2U7XG5cbiAgICAgICAgZXJyb3IucmV0cnkgPSByZXRyeTtcblxuICAgICAgICBkaXNwYXRjaENhbGxiYWNrKGVycm9yKVxuICAgICAgfTtcblxuICAgICAgcmV0dXJuIHNlbmRSZXF1ZXN0KHRyYW5zcG9ydCk7XG4gICAgfTtcblxuICAgIC8vIFJldHVybiB0aGUgcGFja2VkIG1lc3NhZ2VcbiAgICBtZXNzYWdlID0gcGFja2VyLnBhY2sobWVzc2FnZSk7XG5cbiAgICB0cmFuc3BvcnQgPSB0cmFuc3BvcnQgfHwgdGhpcy5nZXRUcmFuc3BvcnQoKTtcbiAgICBpZih0cmFuc3BvcnQpXG4gICAgICByZXR1cm4gdHJhbnNwb3J0LnNlbmQobWVzc2FnZSk7XG5cbiAgICByZXR1cm4gbWVzc2FnZTtcbiAgfTtcblxuICAvKipcbiAgICogRGVjb2RlIGFuZCBwcm9jZXNzIGEgSnNvblJQQyAyLjAgbWVzc2FnZVxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gbWVzc2FnZSAtIHN0cmluZyB3aXRoIHRoZSBjb250ZW50IG9mIHRoZSBtZXNzYWdlXG4gICAqXG4gICAqIEByZXR1cm5zIHtScGNOb3RpZmljYXRpb258UnBjUmVxdWVzdHx1bmRlZmluZWR9IC0gdGhlIHJlcHJlc2VudGF0aW9uIG9mIHRoZVxuICAgKiAgIG5vdGlmaWNhdGlvbiBvciB0aGUgcmVxdWVzdC4gSWYgYSByZXNwb25zZSB3YXMgcHJvY2Vzc2VkLCBpdCB3aWxsIHJldHVyblxuICAgKiAgIGB1bmRlZmluZWRgIHRvIG5vdGlmeSB0aGF0IGl0IHdhcyBwcm9jZXNzZWRcbiAgICpcbiAgICogQHRocm93cyB7VHlwZUVycm9yfSAtIE1lc3NhZ2UgaXMgbm90IGRlZmluZWRcbiAgICovXG4gIHRoaXMuZGVjb2RlID0gZnVuY3Rpb24obWVzc2FnZSwgdHJhbnNwb3J0KVxuICB7XG4gICAgaWYoIW1lc3NhZ2UpXG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiTWVzc2FnZSBpcyBub3QgZGVmaW5lZFwiKTtcblxuICAgIHRyeVxuICAgIHtcbiAgICAgIG1lc3NhZ2UgPSBwYWNrZXIudW5wYWNrKG1lc3NhZ2UpO1xuICAgIH1cbiAgICBjYXRjaChlKVxuICAgIHtcbiAgICAgIC8vIElnbm9yZSBpbnZhbGlkIG1lc3NhZ2VzXG4gICAgICByZXR1cm4gY29uc29sZS5kZWJ1ZyhlLCBtZXNzYWdlKTtcbiAgICB9O1xuXG4gICAgdmFyIGlkICAgICA9IG1lc3NhZ2UuaWQ7XG4gICAgdmFyIGFjayAgICA9IG1lc3NhZ2UuYWNrO1xuICAgIHZhciBtZXRob2QgPSBtZXNzYWdlLm1ldGhvZDtcbiAgICB2YXIgcGFyYW1zID0gbWVzc2FnZS5wYXJhbXMgfHwge307XG5cbiAgICB2YXIgZnJvbSA9IHBhcmFtcy5mcm9tO1xuICAgIHZhciBkZXN0ID0gcGFyYW1zLmRlc3Q7XG5cbiAgICAvLyBJZ25vcmUgbWVzc2FnZXMgc2VuZCBieSB1c1xuICAgIGlmKHNlbGYucGVlcklEICE9IHVuZGVmaW5lZCAmJiBmcm9tID09IHNlbGYucGVlcklEKSByZXR1cm47XG5cbiAgICAvLyBOb3RpZmljYXRpb25cbiAgICBpZihpZCA9PSB1bmRlZmluZWQgJiYgYWNrID09IHVuZGVmaW5lZClcbiAgICB7XG4gICAgICB2YXIgbm90aWZpY2F0aW9uID0gbmV3IFJwY05vdGlmaWNhdGlvbihtZXRob2QsIHBhcmFtcyk7XG5cbiAgICAgIGlmKHNlbGYuZW1pdCgncmVxdWVzdCcsIG5vdGlmaWNhdGlvbikpIHJldHVybjtcbiAgICAgIHJldHVybiBub3RpZmljYXRpb247XG4gICAgfTtcblxuXG4gICAgZnVuY3Rpb24gcHJvY2Vzc1JlcXVlc3QoKVxuICAgIHtcbiAgICAgIC8vIElmIHdlIGhhdmUgYSB0cmFuc3BvcnQgYW5kIGl0J3MgYSBkdXBsaWNhdGVkIHJlcXVlc3QsIHJlcGx5IGlubWVkaWF0bHlcbiAgICAgIHRyYW5zcG9ydCA9IHVuaWZ5VHJhbnNwb3J0KHRyYW5zcG9ydCkgfHwgc2VsZi5nZXRUcmFuc3BvcnQoKTtcbiAgICAgIGlmKHRyYW5zcG9ydClcbiAgICAgIHtcbiAgICAgICAgdmFyIHJlc3BvbnNlID0gcmVzcG9uc2VzLmdldChpZCwgZnJvbSk7XG4gICAgICAgIGlmKHJlc3BvbnNlKVxuICAgICAgICAgIHJldHVybiB0cmFuc3BvcnQuc2VuZChyZXNwb25zZS5tZXNzYWdlKTtcbiAgICAgIH07XG5cbiAgICAgIHZhciBpZEFjayA9IChpZCAhPSB1bmRlZmluZWQpID8gaWQgOiBhY2s7XG4gICAgICB2YXIgcmVxdWVzdCA9IG5ldyBScGNSZXF1ZXN0KG1ldGhvZCwgcGFyYW1zLCBpZEFjaywgZnJvbSwgdHJhbnNwb3J0KTtcblxuICAgICAgaWYoc2VsZi5lbWl0KCdyZXF1ZXN0JywgcmVxdWVzdCkpIHJldHVybjtcbiAgICAgIHJldHVybiByZXF1ZXN0O1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBwcm9jZXNzUmVzcG9uc2UocmVxdWVzdCwgZXJyb3IsIHJlc3VsdClcbiAgICB7XG4gICAgICByZXF1ZXN0LmNhbGxiYWNrKGVycm9yLCByZXN1bHQpO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBkdXBsaWNhdGVkUmVzcG9uc2UodGltZW91dClcbiAgICB7XG4gICAgICBjb25zb2xlLndhcm4oXCJSZXNwb25zZSBhbHJlYWR5IHByb2Nlc3NlZFwiLCBtZXNzYWdlKTtcblxuICAgICAgLy8gVXBkYXRlIGR1cGxpY2F0ZWQgcmVzcG9uc2VzIHRpbWVvdXRcbiAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICAgIHN0b3JlUHJvY2Vzc2VkUmVzcG9uc2UoYWNrLCBmcm9tKTtcbiAgICB9O1xuXG5cbiAgICAvLyBSZXF1ZXN0LCBvciByZXNwb25zZSB3aXRoIG93biBtZXRob2RcbiAgICBpZihtZXRob2QpXG4gICAge1xuICAgICAgLy8gQ2hlY2sgaWYgaXQncyBhIHJlc3BvbnNlIHdpdGggb3duIG1ldGhvZFxuICAgICAgaWYoZGVzdCA9PSB1bmRlZmluZWQgfHwgZGVzdCA9PSBzZWxmLnBlZXJJRClcbiAgICAgIHtcbiAgICAgICAgdmFyIHJlcXVlc3QgPSByZXF1ZXN0cy5nZXQoYWNrLCBmcm9tKTtcbiAgICAgICAgaWYocmVxdWVzdClcbiAgICAgICAge1xuICAgICAgICAgIHZhciByZXNwb25zZU1ldGhvZHMgPSByZXF1ZXN0LnJlc3BvbnNlTWV0aG9kcztcblxuICAgICAgICAgIGlmKG1ldGhvZCA9PSByZXNwb25zZU1ldGhvZHMuZXJyb3IpXG4gICAgICAgICAgICByZXR1cm4gcHJvY2Vzc1Jlc3BvbnNlKHJlcXVlc3QsIHBhcmFtcyk7XG5cbiAgICAgICAgICBpZihtZXRob2QgPT0gcmVzcG9uc2VNZXRob2RzLnJlc3BvbnNlKVxuICAgICAgICAgICAgcmV0dXJuIHByb2Nlc3NSZXNwb25zZShyZXF1ZXN0LCBudWxsLCBwYXJhbXMpO1xuXG4gICAgICAgICAgcmV0dXJuIHByb2Nlc3NSZXF1ZXN0KCk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgcHJvY2Vzc2VkID0gcHJvY2Vzc2VkUmVzcG9uc2VzLmdldChhY2ssIGZyb20pO1xuICAgICAgICBpZihwcm9jZXNzZWQpXG4gICAgICAgICAgcmV0dXJuIGR1cGxpY2F0ZWRSZXNwb25zZShwcm9jZXNzZWQpO1xuICAgICAgfVxuXG4gICAgICAvLyBSZXF1ZXN0XG4gICAgICByZXR1cm4gcHJvY2Vzc1JlcXVlc3QoKTtcbiAgICB9O1xuXG4gICAgdmFyIGVycm9yICA9IG1lc3NhZ2UuZXJyb3I7XG4gICAgdmFyIHJlc3VsdCA9IG1lc3NhZ2UucmVzdWx0O1xuXG4gICAgLy8gSWdub3JlIHJlc3BvbnNlcyBub3Qgc2VuZCB0byB1c1xuICAgIGlmKGVycm9yICAmJiBlcnJvci5kZXN0ICAmJiBlcnJvci5kZXN0ICAhPSBzZWxmLnBlZXJJRCkgcmV0dXJuO1xuICAgIGlmKHJlc3VsdCAmJiByZXN1bHQuZGVzdCAmJiByZXN1bHQuZGVzdCAhPSBzZWxmLnBlZXJJRCkgcmV0dXJuO1xuXG4gICAgLy8gUmVzcG9uc2VcbiAgICB2YXIgcmVxdWVzdCA9IHJlcXVlc3RzLmdldChhY2ssIGZyb20pO1xuICAgIGlmKCFyZXF1ZXN0KVxuICAgIHtcbiAgICAgIHZhciBwcm9jZXNzZWQgPSBwcm9jZXNzZWRSZXNwb25zZXMuZ2V0KGFjaywgZnJvbSk7XG4gICAgICBpZihwcm9jZXNzZWQpXG4gICAgICAgIHJldHVybiBkdXBsaWNhdGVkUmVzcG9uc2UocHJvY2Vzc2VkKTtcblxuICAgICAgcmV0dXJuIGNvbnNvbGUud2FybihcIk5vIGNhbGxiYWNrIHdhcyBkZWZpbmVkIGZvciB0aGlzIG1lc3NhZ2VcIiwgbWVzc2FnZSk7XG4gICAgfTtcblxuICAgIC8vIFByb2Nlc3MgcmVzcG9uc2VcbiAgICBwcm9jZXNzUmVzcG9uc2UocmVxdWVzdCwgZXJyb3IsIHJlc3VsdCk7XG4gIH07XG59O1xuaW5oZXJpdHMoUnBjQnVpbGRlciwgRXZlbnRFbWl0dGVyKTtcblxuXG5ScGNCdWlsZGVyLlJwY05vdGlmaWNhdGlvbiA9IFJwY05vdGlmaWNhdGlvbjtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IFJwY0J1aWxkZXI7XG5cbnZhciBjbGllbnRzID0gcmVxdWlyZSgnLi9jbGllbnRzJyk7XG52YXIgdHJhbnNwb3J0cyA9IHJlcXVpcmUoJy4vY2xpZW50cy90cmFuc3BvcnRzJyk7XG5cblJwY0J1aWxkZXIuY2xpZW50cyA9IGNsaWVudHM7XG5ScGNCdWlsZGVyLmNsaWVudHMudHJhbnNwb3J0cyA9IHRyYW5zcG9ydHM7XG5ScGNCdWlsZGVyLnBhY2tlcnMgPSBwYWNrZXJzO1xuIiwiLyoqXG4gKiBKc29uUlBDIDIuMCBwYWNrZXJcbiAqL1xuXG4vKipcbiAqIFBhY2sgYSBKc29uUlBDIDIuMCBtZXNzYWdlXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG1lc3NhZ2UgLSBvYmplY3QgdG8gYmUgcGFja2FnZWQuIEl0IHJlcXVpcmVzIHRvIGhhdmUgYWxsIHRoZVxuICogICBmaWVsZHMgbmVlZGVkIGJ5IHRoZSBKc29uUlBDIDIuMCBtZXNzYWdlIHRoYXQgaXQncyBnb2luZyB0byBiZSBnZW5lcmF0ZWRcbiAqXG4gKiBAcmV0dXJuIHtTdHJpbmd9IC0gdGhlIHN0cmluZ2lmaWVkIEpzb25SUEMgMi4wIG1lc3NhZ2VcbiAqL1xuZnVuY3Rpb24gcGFjayhtZXNzYWdlLCBpZClcbntcbiAgdmFyIHJlc3VsdCA9XG4gIHtcbiAgICBqc29ucnBjOiBcIjIuMFwiXG4gIH07XG5cbiAgLy8gUmVxdWVzdFxuICBpZihtZXNzYWdlLm1ldGhvZClcbiAge1xuICAgIHJlc3VsdC5tZXRob2QgPSBtZXNzYWdlLm1ldGhvZDtcblxuICAgIGlmKG1lc3NhZ2UucGFyYW1zKVxuICAgICAgcmVzdWx0LnBhcmFtcyA9IG1lc3NhZ2UucGFyYW1zO1xuXG4gICAgLy8gUmVxdWVzdCBpcyBhIG5vdGlmaWNhdGlvblxuICAgIGlmKGlkICE9IHVuZGVmaW5lZClcbiAgICAgIHJlc3VsdC5pZCA9IGlkO1xuICB9XG5cbiAgLy8gUmVzcG9uc2VcbiAgZWxzZSBpZihpZCAhPSB1bmRlZmluZWQpXG4gIHtcbiAgICBpZihtZXNzYWdlLmVycm9yKVxuICAgIHtcbiAgICAgIGlmKG1lc3NhZ2UucmVzdWx0ICE9PSB1bmRlZmluZWQpXG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJCb3RoIHJlc3VsdCBhbmQgZXJyb3IgYXJlIGRlZmluZWRcIik7XG5cbiAgICAgIHJlc3VsdC5lcnJvciA9IG1lc3NhZ2UuZXJyb3I7XG4gICAgfVxuICAgIGVsc2UgaWYobWVzc2FnZS5yZXN1bHQgIT09IHVuZGVmaW5lZClcbiAgICAgIHJlc3VsdC5yZXN1bHQgPSBtZXNzYWdlLnJlc3VsdDtcbiAgICBlbHNlXG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiTm8gcmVzdWx0IG9yIGVycm9yIGlzIGRlZmluZWRcIik7XG5cbiAgICByZXN1bHQuaWQgPSBpZDtcbiAgfTtcblxuICByZXR1cm4gSlNPTi5zdHJpbmdpZnkocmVzdWx0KTtcbn07XG5cbi8qKlxuICogVW5wYWNrIGEgSnNvblJQQyAyLjAgbWVzc2FnZVxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBtZXNzYWdlIC0gc3RyaW5nIHdpdGggdGhlIGNvbnRlbnQgb2YgdGhlIEpzb25SUEMgMi4wIG1lc3NhZ2VcbiAqXG4gKiBAdGhyb3dzIHtUeXBlRXJyb3J9IC0gSW52YWxpZCBKc29uUlBDIHZlcnNpb25cbiAqXG4gKiBAcmV0dXJuIHtPYmplY3R9IC0gb2JqZWN0IGZpbGxlZCB3aXRoIHRoZSBKc29uUlBDIDIuMCBtZXNzYWdlIGNvbnRlbnRcbiAqL1xuZnVuY3Rpb24gdW5wYWNrKG1lc3NhZ2UpXG57XG4gIHZhciByZXN1bHQgPSBtZXNzYWdlO1xuXG4gIGlmKHR5cGVvZiBtZXNzYWdlID09PSAnc3RyaW5nJyB8fCBtZXNzYWdlIGluc3RhbmNlb2YgU3RyaW5nKSB7XG4gICAgcmVzdWx0ID0gSlNPTi5wYXJzZShtZXNzYWdlKTtcbiAgfVxuXG4gIC8vIENoZWNrIGlmIGl0J3MgYSB2YWxpZCBtZXNzYWdlXG5cbiAgdmFyIHZlcnNpb24gPSByZXN1bHQuanNvbnJwYztcbiAgaWYodmVyc2lvbiAhPT0gJzIuMCcpXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkludmFsaWQgSnNvblJQQyB2ZXJzaW9uICdcIiArIHZlcnNpb24gKyBcIic6IFwiICsgbWVzc2FnZSk7XG5cbiAgLy8gUmVzcG9uc2VcbiAgaWYocmVzdWx0Lm1ldGhvZCA9PSB1bmRlZmluZWQpXG4gIHtcbiAgICBpZihyZXN1bHQuaWQgPT0gdW5kZWZpbmVkKVxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkludmFsaWQgbWVzc2FnZTogXCIrbWVzc2FnZSk7XG5cbiAgICB2YXIgcmVzdWx0X2RlZmluZWQgPSByZXN1bHQucmVzdWx0ICE9PSB1bmRlZmluZWQ7XG4gICAgdmFyIGVycm9yX2RlZmluZWQgID0gcmVzdWx0LmVycm9yICAhPT0gdW5kZWZpbmVkO1xuXG4gICAgLy8gQ2hlY2sgb25seSByZXN1bHQgb3IgZXJyb3IgaXMgZGVmaW5lZCwgbm90IGJvdGggb3Igbm9uZVxuICAgIGlmKHJlc3VsdF9kZWZpbmVkICYmIGVycm9yX2RlZmluZWQpXG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQm90aCByZXN1bHQgYW5kIGVycm9yIGFyZSBkZWZpbmVkOiBcIittZXNzYWdlKTtcblxuICAgIGlmKCFyZXN1bHRfZGVmaW5lZCAmJiAhZXJyb3JfZGVmaW5lZClcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJObyByZXN1bHQgb3IgZXJyb3IgaXMgZGVmaW5lZDogXCIrbWVzc2FnZSk7XG5cbiAgICByZXN1bHQuYWNrID0gcmVzdWx0LmlkO1xuICAgIGRlbGV0ZSByZXN1bHQuaWQ7XG4gIH1cblxuICAvLyBSZXR1cm4gdW5wYWNrZWQgbWVzc2FnZVxuICByZXR1cm4gcmVzdWx0O1xufTtcblxuXG5leHBvcnRzLnBhY2sgICA9IHBhY2s7XG5leHBvcnRzLnVucGFjayA9IHVucGFjaztcbiIsImZ1bmN0aW9uIHBhY2sobWVzc2FnZSlcbntcbiAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk5vdCB5ZXQgaW1wbGVtZW50ZWRcIik7XG59O1xuXG5mdW5jdGlvbiB1bnBhY2sobWVzc2FnZSlcbntcbiAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk5vdCB5ZXQgaW1wbGVtZW50ZWRcIik7XG59O1xuXG5cbmV4cG9ydHMucGFjayAgID0gcGFjaztcbmV4cG9ydHMudW5wYWNrID0gdW5wYWNrO1xuIiwidmFyIEpzb25SUEMgPSByZXF1aXJlKCcuL0pzb25SUEMnKTtcbnZhciBYbWxSUEMgID0gcmVxdWlyZSgnLi9YbWxSUEMnKTtcblxuXG5leHBvcnRzLkpzb25SUEMgPSBKc29uUlBDO1xuZXhwb3J0cy5YbWxSUEMgID0gWG1sUlBDO1xuIiwiLy8gTGFzdCB0aW1lIHVwZGF0ZWQgb24gSnVuZSAwOCwgMjAxOFxuXG4vLyBMYXRlc3QgZmlsZSBjYW4gYmUgZm91bmQgaGVyZTogaHR0cHM6Ly9jZG4ud2VicnRjLWV4cGVyaW1lbnQuY29tL2dldFNjcmVlbklkLmpzXG5cbi8vIE11YXogS2hhbiAgICAgICAgIC0gd3d3Lk11YXpLaGFuLmNvbVxuLy8gTUlUIExpY2Vuc2UgICAgICAgLSB3d3cuV2ViUlRDLUV4cGVyaW1lbnQuY29tL2xpY2VuY2Vcbi8vIERvY3VtZW50YXRpb24gICAgIC0gaHR0cHM6Ly9naXRodWIuY29tL211YXota2hhbi9nZXRTY3JlZW5JZC5cblxuLy8gX19fX19fX19fX19fX19cbi8vIGdldFNjcmVlbklkLmpzXG5cbi8qXG5nZXRTY3JlZW5JZChmdW5jdGlvbiAoZXJyb3IsIHNvdXJjZUlkLCBzY3JlZW5fY29uc3RyYWludHMpIHtcbiAgICAvLyBlcnJvciAgICA9PSBudWxsIHx8ICdwZXJtaXNzaW9uLWRlbmllZCcgfHwgJ25vdC1pbnN0YWxsZWQnIHx8ICdpbnN0YWxsZWQtZGlzYWJsZWQnIHx8ICdub3QtY2hyb21lJ1xuICAgIC8vIHNvdXJjZUlkID09IG51bGwgfHwgJ3N0cmluZycgfHwgJ2ZpcmVmb3gnXG4gICAgXG4gICAgaWYobWljcm9zb2Z0RWRnZSkge1xuICAgICAgICBuYXZpZ2F0b3IuZ2V0RGlzcGxheU1lZGlhKHNjcmVlbl9jb25zdHJhaW50cykudGhlbihvblN1Y2Nlc3MsIG9uRmFpbHVyZSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmdldFVzZXJNZWRpYShzY3JlZW5fY29uc3RyYWludHMpLnRoZW4ob25TdWNjZXNzKWNhdGNoKG9uRmFpbHVyZSk7XG4gICAgfVxufSwgJ3Bhc3Mgc2Vjb25kIHBhcmFtZXRlciBvbmx5IGlmIHlvdSB3YW50IHN5c3RlbSBhdWRpbycpO1xuKi9cblxud2luZG93LmdldFNjcmVlbklkID0gZnVuY3Rpb24gKGNhbGxiYWNrLCBjdXN0b21fcGFyYW1ldGVyKSB7XG4gICAgaWYgKG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZignRWRnZScpICE9PSAtMSAmJiAoISFuYXZpZ2F0b3IubXNTYXZlT3JPcGVuQmxvYiB8fCAhIW5hdmlnYXRvci5tc1NhdmVCbG9iKSkge1xuICAgICAgICAvLyBtaWNyb3NvZnQgZWRnZSA9PiBuYXZpZ2F0b3IuZ2V0RGlzcGxheU1lZGlhKHNjcmVlbl9jb25zdHJhaW50cykudGhlbihvblN1Y2Nlc3MsIG9uRmFpbHVyZSk7XG4gICAgICAgIGNhbGxiYWNrKHtcbiAgICAgICAgICAgIHZpZGVvOiB0cnVlXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gZm9yIEZpcmVmb3g6XG4gICAgLy8gc291cmNlSWQgPT0gJ2ZpcmVmb3gnXG4gICAgLy8gc2NyZWVuX2NvbnN0cmFpbnRzID0gey4uLn1cbiAgICBpZiAoISFuYXZpZ2F0b3IubW96R2V0VXNlck1lZGlhKSB7XG4gICAgICAgIGNhbGxiYWNrKG51bGwsICdmaXJlZm94Jywge1xuICAgICAgICAgICAgdmlkZW86IHtcbiAgICAgICAgICAgICAgICBtb3pNZWRpYVNvdXJjZTogJ3dpbmRvdycsXG4gICAgICAgICAgICAgICAgbWVkaWFTb3VyY2U6ICd3aW5kb3cnXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBvbklGcmFtZUNhbGxiYWNrKTtcblxuICAgIGZ1bmN0aW9uIG9uSUZyYW1lQ2FsbGJhY2soZXZlbnQpIHtcbiAgICAgICAgaWYgKCFldmVudC5kYXRhKSByZXR1cm47XG5cbiAgICAgICAgaWYgKGV2ZW50LmRhdGEuY2hyb21lTWVkaWFTb3VyY2VJZCkge1xuICAgICAgICAgICAgaWYgKGV2ZW50LmRhdGEuY2hyb21lTWVkaWFTb3VyY2VJZCA9PT0gJ1Blcm1pc3Npb25EZW5pZWRFcnJvcicpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjaygncGVybWlzc2lvbi1kZW5pZWQnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgZXZlbnQuZGF0YS5jaHJvbWVNZWRpYVNvdXJjZUlkLCBnZXRTY3JlZW5Db25zdHJhaW50cyhudWxsLCBldmVudC5kYXRhLmNocm9tZU1lZGlhU291cmNlSWQsIGV2ZW50LmRhdGEuY2FuUmVxdWVzdEF1ZGlvVHJhY2spKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gdGhpcyBldmVudCBsaXN0ZW5lciBpcyBubyBtb3JlIG5lZWRlZFxuICAgICAgICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBvbklGcmFtZUNhbGxiYWNrKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChldmVudC5kYXRhLmNocm9tZUV4dGVuc2lvblN0YXR1cykge1xuICAgICAgICAgICAgY2FsbGJhY2soZXZlbnQuZGF0YS5jaHJvbWVFeHRlbnNpb25TdGF0dXMsIG51bGwsIGdldFNjcmVlbkNvbnN0cmFpbnRzKGV2ZW50LmRhdGEuY2hyb21lRXh0ZW5zaW9uU3RhdHVzKSk7XG5cbiAgICAgICAgICAgIC8vIHRoaXMgZXZlbnQgbGlzdGVuZXIgaXMgbm8gbW9yZSBuZWVkZWRcbiAgICAgICAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgb25JRnJhbWVDYWxsYmFjayk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIWN1c3RvbV9wYXJhbWV0ZXIpIHtcbiAgICAgICAgc2V0VGltZW91dChwb3N0R2V0U291cmNlSWRNZXNzYWdlLCAxMDApO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBwb3N0R2V0U291cmNlSWRNZXNzYWdlKGN1c3RvbV9wYXJhbWV0ZXIpO1xuICAgICAgICB9LCAxMDApO1xuICAgIH1cbn07XG5cbmZ1bmN0aW9uIGdldFNjcmVlbkNvbnN0cmFpbnRzKGVycm9yLCBzb3VyY2VJZCwgY2FuUmVxdWVzdEF1ZGlvVHJhY2spIHtcbiAgICB2YXIgc2NyZWVuX2NvbnN0cmFpbnRzID0ge1xuICAgICAgICBhdWRpbzogZmFsc2UsXG4gICAgICAgIHZpZGVvOiB7XG4gICAgICAgICAgICBtYW5kYXRvcnk6IHtcbiAgICAgICAgICAgICAgICBjaHJvbWVNZWRpYVNvdXJjZTogZXJyb3IgPyAnc2NyZWVuJyA6ICdkZXNrdG9wJyxcbiAgICAgICAgICAgICAgICBtYXhXaWR0aDogd2luZG93LnNjcmVlbi53aWR0aCA+IDE5MjAgPyB3aW5kb3cuc2NyZWVuLndpZHRoIDogMTkyMCxcbiAgICAgICAgICAgICAgICBtYXhIZWlnaHQ6IHdpbmRvdy5zY3JlZW4uaGVpZ2h0ID4gMTA4MCA/IHdpbmRvdy5zY3JlZW4uaGVpZ2h0IDogMTA4MFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9wdGlvbmFsOiBbXVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIGlmICghIWNhblJlcXVlc3RBdWRpb1RyYWNrKSB7XG4gICAgICAgIHNjcmVlbl9jb25zdHJhaW50cy5hdWRpbyA9IHtcbiAgICAgICAgICAgIG1hbmRhdG9yeToge1xuICAgICAgICAgICAgICAgIGNocm9tZU1lZGlhU291cmNlOiBlcnJvciA/ICdzY3JlZW4nIDogJ2Rlc2t0b3AnLFxuICAgICAgICAgICAgICAgIC8vIGVjaG9DYW5jZWxsYXRpb246IHRydWVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvcHRpb25hbDogW11cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBpZiAoc291cmNlSWQpIHtcbiAgICAgICAgc2NyZWVuX2NvbnN0cmFpbnRzLnZpZGVvLm1hbmRhdG9yeS5jaHJvbWVNZWRpYVNvdXJjZUlkID0gc291cmNlSWQ7XG5cbiAgICAgICAgaWYgKHNjcmVlbl9jb25zdHJhaW50cy5hdWRpbyAmJiBzY3JlZW5fY29uc3RyYWludHMuYXVkaW8ubWFuZGF0b3J5KSB7XG4gICAgICAgICAgICBzY3JlZW5fY29uc3RyYWludHMuYXVkaW8ubWFuZGF0b3J5LmNocm9tZU1lZGlhU291cmNlSWQgPSBzb3VyY2VJZDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBzY3JlZW5fY29uc3RyYWludHM7XG59XG5cbmZ1bmN0aW9uIHBvc3RHZXRTb3VyY2VJZE1lc3NhZ2UoY3VzdG9tX3BhcmFtZXRlcikge1xuICAgIGlmICghaWZyYW1lKSB7XG4gICAgICAgIGxvYWRJRnJhbWUoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcG9zdEdldFNvdXJjZUlkTWVzc2FnZShjdXN0b21fcGFyYW1ldGVyKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoIWlmcmFtZS5pc0xvYWRlZCkge1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHBvc3RHZXRTb3VyY2VJZE1lc3NhZ2UoY3VzdG9tX3BhcmFtZXRlcik7XG4gICAgICAgIH0sIDEwMCk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoIWN1c3RvbV9wYXJhbWV0ZXIpIHtcbiAgICAgICAgaWZyYW1lLmNvbnRlbnRXaW5kb3cucG9zdE1lc3NhZ2Uoe1xuICAgICAgICAgICAgY2FwdHVyZVNvdXJjZUlkOiB0cnVlXG4gICAgICAgIH0sICcqJyk7XG4gICAgfVxuICAgIGVsc2UgaWYgKCEhY3VzdG9tX3BhcmFtZXRlci5mb3JFYWNoKSB7XG4gICAgICAgIGlmcmFtZS5jb250ZW50V2luZG93LnBvc3RNZXNzYWdlKHtcbiAgICAgICAgICAgIGNhcHR1cmVDdXN0b21Tb3VyY2VJZDogY3VzdG9tX3BhcmFtZXRlclxuICAgICAgICB9LCAnKicpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgaWZyYW1lLmNvbnRlbnRXaW5kb3cucG9zdE1lc3NhZ2Uoe1xuICAgICAgICAgICAgY2FwdHVyZVNvdXJjZUlkV2l0aEF1ZGlvOiB0cnVlXG4gICAgICAgIH0sICcqJyk7XG4gICAgfVxufVxuXG52YXIgaWZyYW1lO1xuXG4vLyB0aGlzIGZ1bmN0aW9uIGlzIHVzZWQgaW4gUlRDTXVsdGlDb25uZWN0aW9uIHYzXG53aW5kb3cuZ2V0U2NyZWVuQ29uc3RyYWludHMgPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICBsb2FkSUZyYW1lKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZ2V0U2NyZWVuSWQoZnVuY3Rpb24gKGVycm9yLCBzb3VyY2VJZCwgc2NyZWVuX2NvbnN0cmFpbnRzKSB7XG4gICAgICAgICAgICBpZiAoIXNjcmVlbl9jb25zdHJhaW50cykge1xuICAgICAgICAgICAgICAgIHNjcmVlbl9jb25zdHJhaW50cyA9IHtcbiAgICAgICAgICAgICAgICAgICAgdmlkZW86IHRydWVcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjYWxsYmFjayhlcnJvciwgc2NyZWVuX2NvbnN0cmFpbnRzLnZpZGVvKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59O1xuXG5mdW5jdGlvbiBsb2FkSUZyYW1lKGxvYWRDYWxsYmFjaykge1xuICAgIGlmIChpZnJhbWUpIHtcbiAgICAgICAgbG9hZENhbGxiYWNrKCk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZnJhbWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpZnJhbWUnKTtcbiAgICBpZnJhbWUub25sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZnJhbWUuaXNMb2FkZWQgPSB0cnVlO1xuICAgICAgICBsb2FkQ2FsbGJhY2soKTtcbiAgICB9O1xuICAgIGlmcmFtZS5zcmMgPSAnaHR0cHM6Ly9vcGVudmlkdS5naXRodWIuaW8vb3BlbnZpZHUtc2NyZWVuLXNoYXJpbmctY2hyb21lLWV4dGVuc2lvbi8nO1xuICAgIGlmcmFtZS5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgIChkb2N1bWVudC5ib2R5IHx8IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCkuYXBwZW5kQ2hpbGQoaWZyYW1lKTtcbn1cblxud2luZG93LmdldENocm9tZUV4dGVuc2lvblN0YXR1cyA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgIC8vIGZvciBGaXJlZm94OlxuICAgIGlmICghIW5hdmlnYXRvci5tb3pHZXRVc2VyTWVkaWEpIHtcbiAgICAgICAgY2FsbGJhY2soJ2luc3RhbGxlZC1lbmFibGVkJyk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIG9uSUZyYW1lQ2FsbGJhY2spO1xuXG4gICAgZnVuY3Rpb24gb25JRnJhbWVDYWxsYmFjayhldmVudCkge1xuICAgICAgICBpZiAoIWV2ZW50LmRhdGEpIHJldHVybjtcblxuICAgICAgICBpZiAoZXZlbnQuZGF0YS5jaHJvbWVFeHRlbnNpb25TdGF0dXMpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKGV2ZW50LmRhdGEuY2hyb21lRXh0ZW5zaW9uU3RhdHVzKTtcblxuICAgICAgICAgICAgLy8gdGhpcyBldmVudCBsaXN0ZW5lciBpcyBubyBtb3JlIG5lZWRlZFxuICAgICAgICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBvbklGcmFtZUNhbGxiYWNrKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHNldFRpbWVvdXQocG9zdEdldENocm9tZUV4dGVuc2lvblN0YXR1c01lc3NhZ2UsIDEwMCk7XG59O1xuXG5mdW5jdGlvbiBwb3N0R2V0Q2hyb21lRXh0ZW5zaW9uU3RhdHVzTWVzc2FnZSgpIHtcbiAgICBpZiAoIWlmcmFtZSkge1xuICAgICAgICBsb2FkSUZyYW1lKHBvc3RHZXRDaHJvbWVFeHRlbnNpb25TdGF0dXNNZXNzYWdlKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICghaWZyYW1lLmlzTG9hZGVkKSB7XG4gICAgICAgIHNldFRpbWVvdXQocG9zdEdldENocm9tZUV4dGVuc2lvblN0YXR1c01lc3NhZ2UsIDEwMCk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZnJhbWUuY29udGVudFdpbmRvdy5wb3N0TWVzc2FnZSh7XG4gICAgICAgIGdldENocm9tZUV4dGVuc2lvblN0YXR1czogdHJ1ZVxuICAgIH0sICcqJyk7XG59XG5cbmV4cG9ydHMuZ2V0U2NyZWVuSWQgPSBnZXRTY3JlZW5JZDsiLCIvLyBnbG9iYWwgdmFyaWFibGVzXG52YXIgY2hyb21lTWVkaWFTb3VyY2UgPSAnc2NyZWVuJztcbnZhciBzb3VyY2VJZDtcbnZhciBzY3JlZW5DYWxsYmFjaztcbnZhciBpc0ZpcmVmb3ggPSB0eXBlb2Ygd2luZG93Lkluc3RhbGxUcmlnZ2VyICE9PSAndW5kZWZpbmVkJztcbnZhciBpc09wZXJhID0gISF3aW5kb3cub3BlcmEgfHwgbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKCcgT1BSLycpID49IDA7XG52YXIgaXNDaHJvbWUgPSAhIXdpbmRvdy5jaHJvbWUgJiYgIWlzT3BlcmE7XG5cbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgaWYgKGV2ZW50Lm9yaWdpbiAhPSB3aW5kb3cubG9jYXRpb24ub3JpZ2luKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgb25NZXNzYWdlQ2FsbGJhY2soZXZlbnQuZGF0YSk7XG59KTtcblxuLy8gYW5kIHRoZSBmdW5jdGlvbiB0aGF0IGhhbmRsZXMgcmVjZWl2ZWQgbWVzc2FnZXNcbmZ1bmN0aW9uIG9uTWVzc2FnZUNhbGxiYWNrKGRhdGEpIHtcbiAgICAvLyBcImNhbmNlbFwiIGJ1dHRvbiBpcyBjbGlja2VkXG4gICAgaWYgKGRhdGEgPT0gJ1Blcm1pc3Npb25EZW5pZWRFcnJvcicpIHtcbiAgICAgICAgaWYgKHNjcmVlbkNhbGxiYWNrKVxuICAgICAgICAgICAgcmV0dXJuIHNjcmVlbkNhbGxiYWNrKCdQZXJtaXNzaW9uRGVuaWVkRXJyb3InKTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdQZXJtaXNzaW9uRGVuaWVkRXJyb3InKTtcbiAgICB9XG4gICAgLy8gZXh0ZW5zaW9uIG5vdGlmaWVkIGhpcyBwcmVzZW5jZVxuICAgIGlmIChkYXRhID09ICdydGNtdWx0aWNvbm5lY3Rpb24tZXh0ZW5zaW9uLWxvYWRlZCcpIHtcbiAgICAgICAgY2hyb21lTWVkaWFTb3VyY2UgPSAnZGVza3RvcCc7XG4gICAgfVxuICAgIC8vIGV4dGVuc2lvbiBzaGFyZWQgdGVtcCBzb3VyY2VJZFxuICAgIGlmIChkYXRhLnNvdXJjZUlkICYmIHNjcmVlbkNhbGxiYWNrKSB7XG4gICAgICAgIHNjcmVlbkNhbGxiYWNrKHNvdXJjZUlkID0gZGF0YS5zb3VyY2VJZCwgZGF0YS5jYW5SZXF1ZXN0QXVkaW9UcmFjayA9PT0gdHJ1ZSk7XG4gICAgfVxufVxuXG4vLyB0aGlzIG1ldGhvZCBjYW4gYmUgdXNlZCB0byBjaGVjayBpZiBjaHJvbWUgZXh0ZW5zaW9uIGlzIGluc3RhbGxlZCAmIGVuYWJsZWQuXG5mdW5jdGlvbiBpc0Nocm9tZUV4dGVuc2lvbkF2YWlsYWJsZShjYWxsYmFjaykge1xuICAgIGlmICghY2FsbGJhY2spIHJldHVybjtcbiAgICBpZiAoY2hyb21lTWVkaWFTb3VyY2UgPT0gJ2Rlc2t0b3AnKSByZXR1cm4gY2FsbGJhY2sodHJ1ZSk7XG5cbiAgICAvLyBhc2sgZXh0ZW5zaW9uIGlmIGl0IGlzIGF2YWlsYWJsZVxuICAgIHdpbmRvdy5wb3N0TWVzc2FnZSgnYXJlLXlvdS10aGVyZScsICcqJyk7XG4gICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChjaHJvbWVNZWRpYVNvdXJjZSA9PSAnc2NyZWVuJykge1xuICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICB9IGVsc2UgY2FsbGJhY2sodHJ1ZSk7XG4gICAgfSwgMjAwMCk7XG59XG5cbi8vIHRoaXMgZnVuY3Rpb24gY2FuIGJlIHVzZWQgdG8gZ2V0IFwic291cmNlLWlkXCIgZnJvbSB0aGUgZXh0ZW5zaW9uXG5mdW5jdGlvbiBnZXRTb3VyY2VJZChjYWxsYmFjaykge1xuICAgIGlmICghY2FsbGJhY2spXG4gICAgICAgIHRocm93ICdcImNhbGxiYWNrXCIgcGFyYW1ldGVyIGlzIG1hbmRhdG9yeS4nO1xuICAgIGlmIChzb3VyY2VJZClcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKHNvdXJjZUlkKTtcbiAgICBzY3JlZW5DYWxsYmFjayA9IGNhbGxiYWNrO1xuICAgIHdpbmRvdy5wb3N0TWVzc2FnZSgnZ2V0LXNvdXJjZUlkJywgJyonKTtcbn1cblxuLy8gdGhpcyBmdW5jdGlvbiBjYW4gYmUgdXNlZCB0byBnZXQgXCJzb3VyY2UtaWRcIiBmcm9tIHRoZSBleHRlbnNpb25cbmZ1bmN0aW9uIGdldEN1c3RvbVNvdXJjZUlkKGFyciwgY2FsbGJhY2spIHtcbiAgICBpZiAoIWFyciB8fCAhYXJyLmZvckVhY2gpIHRocm93ICdcImFyclwiIHBhcmFtZXRlciBpcyBtYW5kYXRvcnkgYW5kIGl0IG11c3QgYmUgYW4gYXJyYXkuJztcbiAgICBpZiAoIWNhbGxiYWNrKSB0aHJvdyAnXCJjYWxsYmFja1wiIHBhcmFtZXRlciBpcyBtYW5kYXRvcnkuJztcblxuICAgIGlmIChzb3VyY2VJZCkgcmV0dXJuIGNhbGxiYWNrKHNvdXJjZUlkKTtcblxuICAgIHNjcmVlbkNhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgd2luZG93LnBvc3RNZXNzYWdlKHtcbiAgICAgICAgJ2dldC1jdXN0b20tc291cmNlSWQnOiBhcnJcbiAgICB9LCAnKicpO1xufVxuXG4vLyB0aGlzIGZ1bmN0aW9uIGNhbiBiZSB1c2VkIHRvIGdldCBcInNvdXJjZS1pZFwiIGZyb20gdGhlIGV4dGVuc2lvblxuZnVuY3Rpb24gZ2V0U291cmNlSWRXaXRoQXVkaW8oY2FsbGJhY2spIHtcbiAgICBpZiAoIWNhbGxiYWNrKSB0aHJvdyAnXCJjYWxsYmFja1wiIHBhcmFtZXRlciBpcyBtYW5kYXRvcnkuJztcbiAgICBpZiAoc291cmNlSWQpIHJldHVybiBjYWxsYmFjayhzb3VyY2VJZCk7XG5cbiAgICBzY3JlZW5DYWxsYmFjayA9IGNhbGxiYWNrO1xuICAgIHdpbmRvdy5wb3N0TWVzc2FnZSgnYXVkaW8tcGx1cy10YWInLCAnKicpO1xufVxuXG5mdW5jdGlvbiBnZXRDaHJvbWVFeHRlbnNpb25TdGF0dXMoZXh0ZW5zaW9uaWQsIGNhbGxiYWNrKSB7XG4gICAgaWYgKGlzRmlyZWZveClcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCdub3QtY2hyb21lJyk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggIT0gMikge1xuICAgICAgICBjYWxsYmFjayA9IGV4dGVuc2lvbmlkO1xuICAgICAgICBleHRlbnNpb25pZCA9ICdsZmNnZmVwYWZub2JkbG9lY2NobmZhY2xpYmVuam9sZCc7IC8vIGRlZmF1bHQgZXh0ZW5zaW9uLWlkXG4gICAgfVxuICAgIHZhciBpbWFnZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2ltZycpO1xuICAgIGltYWdlLnNyYyA9ICdjaHJvbWUtZXh0ZW5zaW9uOi8vJyArIGV4dGVuc2lvbmlkICsgJy9pY29uLnBuZyc7XG4gICAgaW1hZ2Uub25sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBjaHJvbWVNZWRpYVNvdXJjZSA9ICdzY3JlZW4nO1xuICAgICAgICB3aW5kb3cucG9zdE1lc3NhZ2UoJ2FyZS15b3UtdGhlcmUnLCAnKicpO1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChjaHJvbWVNZWRpYVNvdXJjZSA9PSAnc2NyZWVuJykge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKCdpbnN0YWxsZWQtZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIH0gZWxzZVxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKCdpbnN0YWxsZWQtZW5hYmxlZCcpO1xuICAgICAgICB9LCAyMDAwKTtcbiAgICB9O1xuICAgIGltYWdlLm9uZXJyb3IgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNhbGxiYWNrKCdub3QtaW5zdGFsbGVkJyk7XG4gICAgfTtcbn1cblxuZnVuY3Rpb24gZ2V0U2NyZWVuQ29uc3RyYWludHNXaXRoQXVkaW8oY2FsbGJhY2spIHtcbiAgICBnZXRTY3JlZW5Db25zdHJhaW50cyhjYWxsYmFjaywgdHJ1ZSk7XG59XG5cbi8vIHRoaXMgZnVuY3Rpb24gZXhwbGFpbnMgaG93IHRvIHVzZSBhYm92ZSBtZXRob2RzL29iamVjdHNcbmZ1bmN0aW9uIGdldFNjcmVlbkNvbnN0cmFpbnRzKGNhbGxiYWNrLCBjYXB0dXJlU291cmNlSWRXaXRoQXVkaW8pIHtcbiAgICBzb3VyY2VJZCA9ICcnO1xuICAgIHZhciBmaXJlZm94U2NyZWVuQ29uc3RyYWludHMgPSB7XG4gICAgICAgIG1vek1lZGlhU291cmNlOiAnd2luZG93JyxcbiAgICAgICAgbWVkaWFTb3VyY2U6ICd3aW5kb3cnXG4gICAgfTtcbiAgICBpZiAoaXNGaXJlZm94KVxuICAgICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgZmlyZWZveFNjcmVlbkNvbnN0cmFpbnRzKTtcbiAgICAvLyB0aGlzIHN0YXRlbWVudCBkZWZpbmVzIGdldFVzZXJNZWRpYSBjb25zdHJhaW50c1xuICAgIC8vIHRoYXQgd2lsbCBiZSB1c2VkIHRvIGNhcHR1cmUgY29udGVudCBvZiBzY3JlZW5cbiAgICB2YXIgc2NyZWVuX2NvbnN0cmFpbnRzID0ge1xuICAgICAgICBtYW5kYXRvcnk6IHtcbiAgICAgICAgICAgIGNocm9tZU1lZGlhU291cmNlOiBjaHJvbWVNZWRpYVNvdXJjZSxcbiAgICAgICAgICAgIG1heFdpZHRoOiBzY3JlZW4ud2lkdGggPiAxOTIwID8gc2NyZWVuLndpZHRoIDogMTkyMCxcbiAgICAgICAgICAgIG1heEhlaWdodDogc2NyZWVuLmhlaWdodCA+IDEwODAgPyBzY3JlZW4uaGVpZ2h0IDogMTA4MFxuICAgICAgICB9LFxuICAgICAgICBvcHRpb25hbDogW11cbiAgICB9O1xuICAgIC8vIHRoaXMgc3RhdGVtZW50IHZlcmlmaWVzIGNocm9tZSBleHRlbnNpb24gYXZhaWxhYmlsaXR5XG4gICAgLy8gaWYgaW5zdGFsbGVkIGFuZCBhdmFpbGFibGUgdGhlbiBpdCB3aWxsIGludm9rZSBleHRlbnNpb24gQVBJXG4gICAgLy8gb3RoZXJ3aXNlIGl0IHdpbGwgZmFsbGJhY2sgdG8gY29tbWFuZC1saW5lIGJhc2VkIHNjcmVlbiBjYXB0dXJpbmcgQVBJXG4gICAgaWYgKGNocm9tZU1lZGlhU291cmNlID09ICdkZXNrdG9wJyAmJiAhc291cmNlSWQpIHtcbiAgICAgICAgaWYgKGNhcHR1cmVTb3VyY2VJZFdpdGhBdWRpbykge1xuICAgICAgICAgICAgZ2V0U291cmNlSWRXaXRoQXVkaW8oZnVuY3Rpb24gKHNvdXJjZUlkLCBjYW5SZXF1ZXN0QXVkaW9UcmFjaykge1xuICAgICAgICAgICAgICAgIHNjcmVlbl9jb25zdHJhaW50cy5tYW5kYXRvcnkuY2hyb21lTWVkaWFTb3VyY2VJZCA9IHNvdXJjZUlkO1xuXG4gICAgICAgICAgICAgICAgaWYgKGNhblJlcXVlc3RBdWRpb1RyYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgIHNjcmVlbl9jb25zdHJhaW50cy5jYW5SZXF1ZXN0QXVkaW9UcmFjayA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHNvdXJjZUlkID09ICdQZXJtaXNzaW9uRGVuaWVkRXJyb3InID8gc291cmNlSWQgOiBudWxsLCBzY3JlZW5fY29uc3RyYWludHMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBnZXRTb3VyY2VJZChmdW5jdGlvbiAoc291cmNlSWQpIHtcbiAgICAgICAgICAgICAgICBzY3JlZW5fY29uc3RyYWludHMubWFuZGF0b3J5LmNocm9tZU1lZGlhU291cmNlSWQgPSBzb3VyY2VJZDtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhzb3VyY2VJZCA9PSAnUGVybWlzc2lvbkRlbmllZEVycm9yJyA/IHNvdXJjZUlkIDogbnVsbCwgc2NyZWVuX2NvbnN0cmFpbnRzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyB0aGlzIHN0YXRlbWVudCBzZXRzIGdldHMgJ3NvdXJjZUlkXCIgYW5kIHNldHMgXCJjaHJvbWVNZWRpYVNvdXJjZUlkXCIgXG4gICAgaWYgKGNocm9tZU1lZGlhU291cmNlID09ICdkZXNrdG9wJykge1xuICAgICAgICBzY3JlZW5fY29uc3RyYWludHMubWFuZGF0b3J5LmNocm9tZU1lZGlhU291cmNlSWQgPSBzb3VyY2VJZDtcbiAgICB9XG5cbiAgICAvLyBub3cgaW52b2tpbmcgbmF0aXZlIGdldFVzZXJNZWRpYSBBUElcbiAgICBjYWxsYmFjayhudWxsLCBzY3JlZW5fY29uc3RyYWludHMpO1xufVxuXG5leHBvcnRzLmdldFNjcmVlbkNvbnN0cmFpbnRzID0gZ2V0U2NyZWVuQ29uc3RyYWludHM7XG5leHBvcnRzLmdldFNjcmVlbkNvbnN0cmFpbnRzV2l0aEF1ZGlvID0gZ2V0U2NyZWVuQ29uc3RyYWludHNXaXRoQXVkaW87XG5leHBvcnRzLmlzQ2hyb21lRXh0ZW5zaW9uQXZhaWxhYmxlID0gaXNDaHJvbWVFeHRlbnNpb25BdmFpbGFibGU7XG5leHBvcnRzLmdldENocm9tZUV4dGVuc2lvblN0YXR1cyA9IGdldENocm9tZUV4dGVuc2lvblN0YXR1cztcbmV4cG9ydHMuZ2V0U291cmNlSWQgPSBnZXRTb3VyY2VJZDsiLCIvKlxuICogKEMpIENvcHlyaWdodCAyMDE3LTIwMTggT3BlblZpZHUgKGh0dHBzOi8vb3BlbnZpZHUuaW8vKVxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKlxuICovXG5cbmltcG9ydCBmcmVlaWNlID0gcmVxdWlyZSgnZnJlZWljZScpO1xuaW1wb3J0IHV1aWQgPSByZXF1aXJlKCd1dWlkJyk7XG5pbXBvcnQgcGxhdGZvcm0gPSByZXF1aXJlKCdwbGF0Zm9ybScpO1xuXG5cbmV4cG9ydCBpbnRlcmZhY2UgV2ViUnRjUGVlckNvbmZpZ3VyYXRpb24ge1xuICAgIG1lZGlhQ29uc3RyYWludHM6IHtcbiAgICAgICAgYXVkaW86IGJvb2xlYW4sXG4gICAgICAgIHZpZGVvOiBib29sZWFuXG4gICAgfTtcbiAgICBzaW11bGNhc3Q6IGJvb2xlYW47XG4gICAgb25pY2VjYW5kaWRhdGU6IChldmVudCkgPT4gdm9pZDtcbiAgICBpY2VTZXJ2ZXJzOiBSVENJY2VTZXJ2ZXJbXSB8IHVuZGVmaW5lZDtcbiAgICBtZWRpYVN0cmVhbT86IE1lZGlhU3RyZWFtO1xuICAgIG1vZGU/OiBzdHJpbmc7IC8vIHNlbmRvbmx5LCByZWNvbmx5LCBzZW5kcmVjdlxuICAgIGlkPzogc3RyaW5nO1xufVxuXG5leHBvcnQgY2xhc3MgV2ViUnRjUGVlciB7XG5cbiAgICBwYzogUlRDUGVlckNvbm5lY3Rpb247XG4gICAgaWQ6IHN0cmluZztcbiAgICByZW1vdGVDYW5kaWRhdGVzUXVldWU6IFJUQ0ljZUNhbmRpZGF0ZVtdID0gW107XG4gICAgbG9jYWxDYW5kaWRhdGVzUXVldWU6IFJUQ0ljZUNhbmRpZGF0ZVtdID0gW107XG5cbiAgICBpY2VDYW5kaWRhdGVMaXN0OiBSVENJY2VDYW5kaWRhdGVbXSA9IFtdO1xuXG4gICAgcHJpdmF0ZSBjYW5kaWRhdGVnYXRoZXJpbmdkb25lID0gZmFsc2U7XG5cbiAgICBjb25zdHJ1Y3Rvcihwcml2YXRlIGNvbmZpZ3VyYXRpb246IFdlYlJ0Y1BlZXJDb25maWd1cmF0aW9uKSB7XG4gICAgICAgIHRoaXMuY29uZmlndXJhdGlvbi5pY2VTZXJ2ZXJzID0gKCEhdGhpcy5jb25maWd1cmF0aW9uLmljZVNlcnZlcnMgJiYgdGhpcy5jb25maWd1cmF0aW9uLmljZVNlcnZlcnMubGVuZ3RoID4gMCkgPyB0aGlzLmNvbmZpZ3VyYXRpb24uaWNlU2VydmVycyA6IGZyZWVpY2UoKTtcblxuICAgICAgICB0aGlzLnBjID0gbmV3IFJUQ1BlZXJDb25uZWN0aW9uKHsgaWNlU2VydmVyczogdGhpcy5jb25maWd1cmF0aW9uLmljZVNlcnZlcnMgfSk7XG4gICAgICAgIHRoaXMuaWQgPSAhIWNvbmZpZ3VyYXRpb24uaWQgPyBjb25maWd1cmF0aW9uLmlkIDogdXVpZC52NCgpO1xuXG4gICAgICAgIHRoaXMucGMub25pY2VjYW5kaWRhdGUgPSBldmVudCA9PiB7XG4gICAgICAgICAgICBjb25zdCBjYW5kaWRhdGU6IFJUQ0ljZUNhbmRpZGF0ZSA9IGV2ZW50LmNhbmRpZGF0ZTtcbiAgICAgICAgICAgIGlmIChjYW5kaWRhdGUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmxvY2FsQ2FuZGlkYXRlc1F1ZXVlLnB1c2goPFJUQ0ljZUNhbmRpZGF0ZT57IGNhbmRpZGF0ZTogY2FuZGlkYXRlLmNhbmRpZGF0ZSB9KTtcbiAgICAgICAgICAgICAgICB0aGlzLmNhbmRpZGF0ZWdhdGhlcmluZ2RvbmUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbmZpZ3VyYXRpb24ub25pY2VjYW5kaWRhdGUoZXZlbnQuY2FuZGlkYXRlKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIXRoaXMuY2FuZGlkYXRlZ2F0aGVyaW5nZG9uZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuY2FuZGlkYXRlZ2F0aGVyaW5nZG9uZSA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5wYy5vbnNpZ25hbGluZ3N0YXRlY2hhbmdlID0gKCkgPT4ge1xuICAgICAgICAgICAgaWYgKHRoaXMucGMuc2lnbmFsaW5nU3RhdGUgPT09ICdzdGFibGUnKSB7XG4gICAgICAgICAgICAgICAgd2hpbGUgKHRoaXMuaWNlQ2FuZGlkYXRlTGlzdC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGMuYWRkSWNlQ2FuZGlkYXRlKDxSVENJY2VDYW5kaWRhdGU+dGhpcy5pY2VDYW5kaWRhdGVMaXN0LnNoaWZ0KCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLnN0YXJ0KCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVGhpcyBmdW5jdGlvbiBjcmVhdGVzIHRoZSBSVENQZWVyQ29ubmVjdGlvbiBvYmplY3QgdGFraW5nIGludG8gYWNjb3VudCB0aGVcbiAgICAgKiBwcm9wZXJ0aWVzIHJlY2VpdmVkIGluIHRoZSBjb25zdHJ1Y3Rvci4gSXQgc3RhcnRzIHRoZSBTRFAgbmVnb3RpYXRpb25cbiAgICAgKiBwcm9jZXNzOiBnZW5lcmF0ZXMgdGhlIFNEUCBvZmZlciBhbmQgaW52b2tlcyB0aGUgb25zZHBvZmZlciBjYWxsYmFjay4gVGhpc1xuICAgICAqIGNhbGxiYWNrIGlzIGV4cGVjdGVkIHRvIHNlbmQgdGhlIFNEUCBvZmZlciwgaW4gb3JkZXIgdG8gb2J0YWluIGFuIFNEUFxuICAgICAqIGFuc3dlciBmcm9tIGFub3RoZXIgcGVlci5cbiAgICAgKi9cbiAgICBzdGFydCgpOiBQcm9taXNlPGFueT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgaWYgKHRoaXMucGMuc2lnbmFsaW5nU3RhdGUgPT09ICdjbG9zZWQnKSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KCdUaGUgcGVlciBjb25uZWN0aW9uIG9iamVjdCBpcyBpbiBcImNsb3NlZFwiIHN0YXRlLiBUaGlzIGlzIG1vc3QgbGlrZWx5IGR1ZSB0byBhbiBpbnZvY2F0aW9uIG9mIHRoZSBkaXNwb3NlIG1ldGhvZCBiZWZvcmUgYWNjZXB0aW5nIGluIHRoZSBkaWFsb2d1ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCEhdGhpcy5jb25maWd1cmF0aW9uLm1lZGlhU3RyZWFtKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wYy5hZGRTdHJlYW0odGhpcy5jb25maWd1cmF0aW9uLm1lZGlhU3RyZWFtKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gW0hhY2tdIGh0dHBzOi8vY29kZS5nb29nbGUuY29tL3AvY2hyb21pdW0vaXNzdWVzL2RldGFpbD9pZD00NDM1NThcbiAgICAgICAgICAgIGlmICh0aGlzLmNvbmZpZ3VyYXRpb24ubW9kZSA9PT0gJ3NlbmRvbmx5JyAmJlxuICAgICAgICAgICAgICAgIChwbGF0Zm9ybS5uYW1lID09PSAnQ2hyb21lJyAmJiBwbGF0Zm9ybS52ZXJzaW9uIS50b1N0cmluZygpLnN1YnN0cmluZygwLCAyKSA9PT0gJzM5JykpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbmZpZ3VyYXRpb24ubW9kZSA9ICdzZW5kcmVjdic7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVGhpcyBtZXRob2QgZnJlZXMgdGhlIHJlc291cmNlcyB1c2VkIGJ5IFdlYlJ0Y1BlZXJcbiAgICAgKi9cbiAgICBkaXNwb3NlKCkge1xuICAgICAgICBjb25zb2xlLmRlYnVnKCdEaXNwb3NpbmcgV2ViUnRjUGVlcicpO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKHRoaXMucGMpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5wYy5zaWduYWxpbmdTdGF0ZSA9PT0gJ2Nsb3NlZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLnJlbW90ZUNhbmRpZGF0ZXNRdWV1ZSA9IFtdO1xuICAgICAgICAgICAgICAgIHRoaXMubG9jYWxDYW5kaWRhdGVzUXVldWUgPSBbXTtcblxuICAgICAgICAgICAgICAgIHRoaXMucGMuZ2V0TG9jYWxTdHJlYW1zKCkuZm9yRWFjaChzdHIgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnN0cmVhbVN0b3Aoc3RyKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vIEZJWE1FIFRoaXMgaXMgbm90IHlldCBpbXBsZW1lbnRlZCBpbiBmaXJlZm94XG4gICAgICAgICAgICAgICAgLy8gaWYodmlkZW9TdHJlYW0pIHBjLnJlbW92ZVN0cmVhbSh2aWRlb1N0cmVhbSk7XG4gICAgICAgICAgICAgICAgLy8gaWYoYXVkaW9TdHJlYW0pIHBjLnJlbW92ZVN0cmVhbShhdWRpb1N0cmVhbSk7XG5cbiAgICAgICAgICAgICAgICB0aGlzLnBjLmNsb3NlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdFeGNlcHRpb24gZGlzcG9zaW5nIHdlYnJ0YyBwZWVyICcgKyBlcnIpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogMSkgRnVuY3Rpb24gdGhhdCBjcmVhdGVzIGFuIG9mZmVyLCBzZXRzIGl0IGFzIGxvY2FsIGRlc2NyaXB0aW9uIGFuZCByZXR1cm5zIHRoZSBvZmZlciBwYXJhbVxuICAgICAqIHRvIHNlbmQgdG8gT3BlblZpZHUgU2VydmVyICh3aWxsIGJlIHRoZSByZW1vdGUgZGVzY3JpcHRpb24gb2Ygb3RoZXIgcGVlcilcbiAgICAgKi9cbiAgICBnZW5lcmF0ZU9mZmVyKCk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBsZXQgb2ZmZXJBdWRpbywgb2ZmZXJWaWRlbyA9IHRydWU7XG5cbiAgICAgICAgICAgIC8vIENvbnN0cmFpbnRzIG11c3QgaGF2ZSBib3RoIGJsb2Nrc1xuICAgICAgICAgICAgaWYgKCEhdGhpcy5jb25maWd1cmF0aW9uLm1lZGlhQ29uc3RyYWludHMpIHtcbiAgICAgICAgICAgICAgICBvZmZlckF1ZGlvID0gKHR5cGVvZiB0aGlzLmNvbmZpZ3VyYXRpb24ubWVkaWFDb25zdHJhaW50cy5hdWRpbyA9PT0gJ2Jvb2xlYW4nKSA/XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29uZmlndXJhdGlvbi5tZWRpYUNvbnN0cmFpbnRzLmF1ZGlvIDogdHJ1ZTtcbiAgICAgICAgICAgICAgICBvZmZlclZpZGVvID0gKHR5cGVvZiB0aGlzLmNvbmZpZ3VyYXRpb24ubWVkaWFDb25zdHJhaW50cy52aWRlbyA9PT0gJ2Jvb2xlYW4nKSA/XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29uZmlndXJhdGlvbi5tZWRpYUNvbnN0cmFpbnRzLnZpZGVvIDogdHJ1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgY29uc3RyYWludHM6IFJUQ09mZmVyT3B0aW9ucyA9IHtcbiAgICAgICAgICAgICAgICBvZmZlclRvUmVjZWl2ZUF1ZGlvOiArICh0aGlzLmNvbmZpZ3VyYXRpb24ubW9kZSAhPT0gJ3NlbmRvbmx5JyAmJiBvZmZlckF1ZGlvKSxcbiAgICAgICAgICAgICAgICBvZmZlclRvUmVjZWl2ZVZpZGVvOiArICh0aGlzLmNvbmZpZ3VyYXRpb24ubW9kZSAhPT0gJ3NlbmRvbmx5JyAmJiBvZmZlclZpZGVvKVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgY29uc29sZS5kZWJ1ZygnUlRDUGVlckNvbm5lY3Rpb24gY29uc3RyYWludHM6ICcgKyBKU09OLnN0cmluZ2lmeShjb25zdHJhaW50cykpO1xuXG4gICAgICAgICAgICB0aGlzLnBjLmNyZWF0ZU9mZmVyKGNvbnN0cmFpbnRzKS50aGVuKG9mZmVyID0+IHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmRlYnVnKCdDcmVhdGVkIFNEUCBvZmZlcicpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnBjLnNldExvY2FsRGVzY3JpcHRpb24ob2ZmZXIpO1xuICAgICAgICAgICAgfSkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgbG9jYWxEZXNjcmlwdGlvbiA9IHRoaXMucGMubG9jYWxEZXNjcmlwdGlvbjtcbiAgICAgICAgICAgICAgICBpZiAoISFsb2NhbERlc2NyaXB0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZGVidWcoJ0xvY2FsIGRlc2NyaXB0aW9uIHNldCcsIGxvY2FsRGVzY3JpcHRpb24uc2RwKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSg8c3RyaW5nPmxvY2FsRGVzY3JpcHRpb24uc2RwKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoJ0xvY2FsIGRlc2NyaXB0aW9uIGlzIG5vdCBkZWZpbmVkJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkuY2F0Y2goZXJyb3IgPT4gcmVqZWN0KGVycm9yKSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIDIpIEZ1bmN0aW9uIHRvIGludm9rZSB3aGVuIGEgU0RQIG9mZmVyIGlzIHJlY2VpdmVkLiBTZXRzIGl0IGFzIHJlbW90ZSBkZXNjcmlwdGlvbixcbiAgICAgKiBnZW5lcmF0ZXMgYW5kIGFuc3dlciBhbmQgcmV0dXJucyBpdCB0byBzZW5kIGl0IHRvIE9wZW5WaWR1IFNlcnZlclxuICAgICAqL1xuICAgIHByb2Nlc3NPZmZlcihzZHBPZmZlcjogc3RyaW5nKTogUHJvbWlzZTxDb25zdHJhaW5ET01TdHJpbmc+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG9mZmVyOiBSVENTZXNzaW9uRGVzY3JpcHRpb25Jbml0ID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6ICdvZmZlcicsXG4gICAgICAgICAgICAgICAgc2RwOiBzZHBPZmZlclxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgY29uc29sZS5kZWJ1ZygnU0RQIG9mZmVyIHJlY2VpdmVkLCBzZXR0aW5nIHJlbW90ZSBkZXNjcmlwdGlvbicpO1xuXG4gICAgICAgICAgICBpZiAodGhpcy5wYy5zaWduYWxpbmdTdGF0ZSA9PT0gJ2Nsb3NlZCcpIHtcbiAgICAgICAgICAgICAgICByZWplY3QoJ1BlZXJDb25uZWN0aW9uIGlzIGNsb3NlZCcpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLnBjLnNldFJlbW90ZURlc2NyaXB0aW9uKG9mZmVyKVxuICAgICAgICAgICAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucGMuY3JlYXRlQW5zd2VyKCk7XG4gICAgICAgICAgICAgICAgfSkudGhlbihhbnN3ZXIgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmRlYnVnKCdDcmVhdGVkIFNEUCBhbnN3ZXInKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucGMuc2V0TG9jYWxEZXNjcmlwdGlvbihhbnN3ZXIpO1xuICAgICAgICAgICAgICAgIH0pLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBsb2NhbERlc2NyaXB0aW9uID0gdGhpcy5wYy5sb2NhbERlc2NyaXB0aW9uO1xuICAgICAgICAgICAgICAgICAgICBpZiAoISFsb2NhbERlc2NyaXB0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmRlYnVnKCdMb2NhbCBkZXNjcmlwdGlvbiBzZXQnLCBsb2NhbERlc2NyaXB0aW9uLnNkcCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKDxzdHJpbmc+bG9jYWxEZXNjcmlwdGlvbi5zZHApO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KCdMb2NhbCBkZXNjcmlwdGlvbiBpcyBub3QgZGVmaW5lZCcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goZXJyb3IgPT4gcmVqZWN0KGVycm9yKSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIDMpIEZ1bmN0aW9uIGludm9rZWQgd2hlbiBhIFNEUCBhbnN3ZXIgaXMgcmVjZWl2ZWQuIEZpbmFsIHN0ZXAgaW4gU0RQIG5lZ290aWF0aW9uLCB0aGUgcGVlclxuICAgICAqIGp1c3QgbmVlZHMgdG8gc2V0IHRoZSBhbnN3ZXIgYXMgaXRzIHJlbW90ZSBkZXNjcmlwdGlvblxuICAgICAqL1xuICAgIHByb2Nlc3NBbnN3ZXIoc2RwQW5zd2VyOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXG4gICAgICAgICAgICBjb25zdCBhbnN3ZXI6IFJUQ1Nlc3Npb25EZXNjcmlwdGlvbkluaXQgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogJ2Fuc3dlcicsXG4gICAgICAgICAgICAgICAgc2RwOiBzZHBBbnN3ZXJcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGNvbnNvbGUuZGVidWcoJ1NEUCBhbnN3ZXIgcmVjZWl2ZWQsIHNldHRpbmcgcmVtb3RlIGRlc2NyaXB0aW9uJyk7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLnBjLnNpZ25hbGluZ1N0YXRlID09PSAnY2xvc2VkJykge1xuICAgICAgICAgICAgICAgIHJlamVjdCgnUlRDUGVlckNvbm5lY3Rpb24gaXMgY2xvc2VkJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMucGMuc2V0UmVtb3RlRGVzY3JpcHRpb24oYW5zd2VyKS50aGVuKCgpID0+IHJlc29sdmUoKSkuY2F0Y2goZXJyb3IgPT4gcmVqZWN0KGVycm9yKSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGludm9rZWQgd2hlbiBhbiBJQ0UgY2FuZGlkYXRlIGlzIHJlY2VpdmVkXG4gICAgICovXG4gICAgYWRkSWNlQ2FuZGlkYXRlKGljZUNhbmRpZGF0ZTogUlRDSWNlQ2FuZGlkYXRlKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmRlYnVnKCdSZW1vdGUgSUNFIGNhbmRpZGF0ZSByZWNlaXZlZCcsIGljZUNhbmRpZGF0ZSk7XG4gICAgICAgICAgICB0aGlzLnJlbW90ZUNhbmRpZGF0ZXNRdWV1ZS5wdXNoKGljZUNhbmRpZGF0ZSk7XG4gICAgICAgICAgICBzd2l0Y2ggKHRoaXMucGMuc2lnbmFsaW5nU3RhdGUpIHtcbiAgICAgICAgICAgICAgICBjYXNlICdjbG9zZWQnOlxuICAgICAgICAgICAgICAgICAgICByZWplY3QobmV3IEVycm9yKCdQZWVyQ29ubmVjdGlvbiBvYmplY3QgaXMgY2xvc2VkJykpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdzdGFibGUnOlxuICAgICAgICAgICAgICAgICAgICBpZiAoISF0aGlzLnBjLnJlbW90ZURlc2NyaXB0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBjLmFkZEljZUNhbmRpZGF0ZShpY2VDYW5kaWRhdGUpLnRoZW4oKCkgPT4gcmVzb2x2ZSgpKS5jYXRjaChlcnJvciA9PiByZWplY3QoZXJyb3IpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICB0aGlzLmljZUNhbmRpZGF0ZUxpc3QucHVzaChpY2VDYW5kaWRhdGUpO1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgc3RyZWFtU3RvcChzdHJlYW06IE1lZGlhU3RyZWFtKTogdm9pZCB7XG4gICAgICAgIHN0cmVhbS5nZXRUcmFja3MoKS5mb3JFYWNoKHRyYWNrID0+IHtcbiAgICAgICAgICAgIHRyYWNrLnN0b3AoKTtcbiAgICAgICAgICAgIHN0cmVhbS5yZW1vdmVUcmFjayh0cmFjayk7XG4gICAgICAgIH0pO1xuICAgIH1cbn1cblxuXG5leHBvcnQgY2xhc3MgV2ViUnRjUGVlclJlY3Zvbmx5IGV4dGVuZHMgV2ViUnRjUGVlciB7XG4gICAgY29uc3RydWN0b3IoY29uZmlndXJhdGlvbjogV2ViUnRjUGVlckNvbmZpZ3VyYXRpb24pIHtcbiAgICAgICAgY29uZmlndXJhdGlvbi5tb2RlID0gJ3JlY3Zvbmx5JztcbiAgICAgICAgc3VwZXIoY29uZmlndXJhdGlvbik7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgV2ViUnRjUGVlclNlbmRvbmx5IGV4dGVuZHMgV2ViUnRjUGVlciB7XG4gICAgY29uc3RydWN0b3IoY29uZmlndXJhdGlvbjogV2ViUnRjUGVlckNvbmZpZ3VyYXRpb24pIHtcbiAgICAgICAgY29uZmlndXJhdGlvbi5tb2RlID0gJ3NlbmRvbmx5JztcbiAgICAgICAgc3VwZXIoY29uZmlndXJhdGlvbik7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgV2ViUnRjUGVlclNlbmRyZWN2IGV4dGVuZHMgV2ViUnRjUGVlciB7XG4gICAgY29uc3RydWN0b3IoY29uZmlndXJhdGlvbjogV2ViUnRjUGVlckNvbmZpZ3VyYXRpb24pIHtcbiAgICAgICAgY29uZmlndXJhdGlvbi5tb2RlID0gJ3NlbmRyZWN2JztcbiAgICAgICAgc3VwZXIoY29uZmlndXJhdGlvbik7XG4gICAgfVxufSIsIi8qXG4gKiAoQykgQ29weXJpZ2h0IDIwMTctMjAxOCBPcGVuVmlkdSAoaHR0cHM6Ly9vcGVudmlkdS5pby8pXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqXG4gKi9cblxuLy8gdHNsaW50OmRpc2FibGU6bm8tc3RyaW5nLWxpdGVyYWxcblxuaW1wb3J0IHsgU3RyZWFtIH0gZnJvbSAnLi4vLi4vT3BlblZpZHUvU3RyZWFtJztcbmltcG9ydCBwbGF0Zm9ybSA9IHJlcXVpcmUoJ3BsYXRmb3JtJyk7XG5cbmV4cG9ydCBjbGFzcyBXZWJSdGNTdGF0cyB7XG5cbiAgICBwcml2YXRlIHdlYlJ0Y1N0YXRzRW5hYmxlZCA9IGZhbHNlO1xuICAgIHByaXZhdGUgd2ViUnRjU3RhdHNJbnRlcnZhbElkOiBOb2RlSlMuVGltZXI7XG4gICAgcHJpdmF0ZSBzdGF0c0ludGVydmFsID0gMTtcbiAgICBwcml2YXRlIHN0YXRzOiBhbnkgPSB7XG4gICAgICAgIGluYm91bmQ6IHtcbiAgICAgICAgICAgIGF1ZGlvOiB7XG4gICAgICAgICAgICAgICAgYnl0ZXNSZWNlaXZlZDogMCxcbiAgICAgICAgICAgICAgICBwYWNrZXRzUmVjZWl2ZWQ6IDAsXG4gICAgICAgICAgICAgICAgcGFja2V0c0xvc3Q6IDBcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB2aWRlbzoge1xuICAgICAgICAgICAgICAgIGJ5dGVzUmVjZWl2ZWQ6IDAsXG4gICAgICAgICAgICAgICAgcGFja2V0c1JlY2VpdmVkOiAwLFxuICAgICAgICAgICAgICAgIHBhY2tldHNMb3N0OiAwLFxuICAgICAgICAgICAgICAgIGZyYW1lc0RlY29kZWQ6IDAsXG4gICAgICAgICAgICAgICAgbmFja0NvdW50OiAwXG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIG91dGJvdW5kOiB7XG4gICAgICAgICAgICBhdWRpbzoge1xuICAgICAgICAgICAgICAgIGJ5dGVzU2VudDogMCxcbiAgICAgICAgICAgICAgICBwYWNrZXRzU2VudDogMCxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB2aWRlbzoge1xuICAgICAgICAgICAgICAgIGJ5dGVzU2VudDogMCxcbiAgICAgICAgICAgICAgICBwYWNrZXRzU2VudDogMCxcbiAgICAgICAgICAgICAgICBmcmFtZXNFbmNvZGVkOiAwLFxuICAgICAgICAgICAgICAgIG5hY2tDb3VudDogMFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgc3RyZWFtOiBTdHJlYW0pIHsgfVxuXG4gICAgcHVibGljIGlzRW5hYmxlZCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMud2ViUnRjU3RhdHNFbmFibGVkO1xuICAgIH1cblxuICAgIHB1YmxpYyBpbml0V2ViUnRjU3RhdHMoKTogdm9pZCB7XG5cbiAgICAgICAgY29uc3QgZWxhc3Rlc3RJbnN0cnVtZW50YXRpb24gPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnZWxhc3Rlc3QtaW5zdHJ1bWVudGF0aW9uJyk7XG5cbiAgICAgICAgaWYgKGVsYXN0ZXN0SW5zdHJ1bWVudGF0aW9uKSB7XG4gICAgICAgICAgICAvLyBFbGFzVGVzdCBpbnN0cnVtZW50YXRpb24gb2JqZWN0IGZvdW5kIGluIGxvY2FsIHN0b3JhZ2VcblxuICAgICAgICAgICAgY29uc29sZS53YXJuKCdXZWJSdGMgc3RhdHMgZW5hYmxlZCBmb3Igc3RyZWFtICcgKyB0aGlzLnN0cmVhbS5zdHJlYW1JZCArICcgb2YgY29ubmVjdGlvbiAnICsgdGhpcy5zdHJlYW0uY29ubmVjdGlvbi5jb25uZWN0aW9uSWQpO1xuXG4gICAgICAgICAgICB0aGlzLndlYlJ0Y1N0YXRzRW5hYmxlZCA9IHRydWU7XG5cbiAgICAgICAgICAgIGNvbnN0IGluc3RydW1lbnRhdGlvbiA9IEpTT04ucGFyc2UoZWxhc3Rlc3RJbnN0cnVtZW50YXRpb24pO1xuICAgICAgICAgICAgdGhpcy5zdGF0c0ludGVydmFsID0gaW5zdHJ1bWVudGF0aW9uLndlYnJ0Yy5pbnRlcnZhbDsgIC8vIEludGVydmFsIGluIHNlY29uZHNcblxuICAgICAgICAgICAgY29uc29sZS53YXJuKCdsb2NhbFN0b3JhZ2UgaXRlbTogJyArIEpTT04uc3RyaW5naWZ5KGluc3RydW1lbnRhdGlvbikpO1xuXG4gICAgICAgICAgICB0aGlzLndlYlJ0Y1N0YXRzSW50ZXJ2YWxJZCA9IHNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnNlbmRTdGF0c1RvSHR0cEVuZHBvaW50KGluc3RydW1lbnRhdGlvbik7XG4gICAgICAgICAgICB9LCB0aGlzLnN0YXRzSW50ZXJ2YWwgKiAxMDAwKTtcblxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc29sZS5kZWJ1ZygnV2ViUnRjIHN0YXRzIG5vdCBlbmFibGVkJyk7XG4gICAgfVxuXG4gICAgcHVibGljIHN0b3BXZWJSdGNTdGF0cygpIHtcbiAgICAgICAgaWYgKHRoaXMud2ViUnRjU3RhdHNFbmFibGVkKSB7XG4gICAgICAgICAgICBjbGVhckludGVydmFsKHRoaXMud2ViUnRjU3RhdHNJbnRlcnZhbElkKTtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignV2ViUnRjIHN0YXRzIHN0b3BwZWQgZm9yIGRpc3Bvc2VkIHN0cmVhbSAnICsgdGhpcy5zdHJlYW0uc3RyZWFtSWQgKyAnIG9mIGNvbm5lY3Rpb24gJyArIHRoaXMuc3RyZWFtLmNvbm5lY3Rpb24uY29ubmVjdGlvbklkKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHB1YmxpYyBnZXRTZWxlY3RlZEljZUNhbmRpZGF0ZUluZm8oKTogUHJvbWlzZTxhbnk+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIHRoaXMuZ2V0U3RhdHNBZ25vc3RpYyh0aGlzLnN0cmVhbS5nZXRSVENQZWVyQ29ubmVjdGlvbigpLFxuICAgICAgICAgICAgICAgIChzdGF0cykgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoKHBsYXRmb3JtLm5hbWUhLmluZGV4T2YoJ0Nocm9tZScpICE9PSAtMSkgfHwgKHBsYXRmb3JtLm5hbWUhLmluZGV4T2YoJ09wZXJhJykgIT09IC0xKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGxvY2FsQ2FuZGlkYXRlSWQsIHJlbW90ZUNhbmRpZGF0ZUlkLCBnb29nQ2FuZGlkYXRlUGFpcjtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGxvY2FsQ2FuZGlkYXRlcyA9IHt9O1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVtb3RlQ2FuZGlkYXRlcyA9IHt9O1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBrZXkgaW4gc3RhdHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzdGF0ID0gc3RhdHNba2V5XTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoc3RhdC50eXBlID09PSAnbG9jYWxjYW5kaWRhdGUnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvY2FsQ2FuZGlkYXRlc1tzdGF0LmlkXSA9IHN0YXQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChzdGF0LnR5cGUgPT09ICdyZW1vdGVjYW5kaWRhdGUnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbW90ZUNhbmRpZGF0ZXNbc3RhdC5pZF0gPSBzdGF0O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoc3RhdC50eXBlID09PSAnZ29vZ0NhbmRpZGF0ZVBhaXInICYmIChzdGF0Lmdvb2dBY3RpdmVDb25uZWN0aW9uID09PSAndHJ1ZScpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdvb2dDYW5kaWRhdGVQYWlyID0gc3RhdDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9jYWxDYW5kaWRhdGVJZCA9IHN0YXQubG9jYWxDYW5kaWRhdGVJZDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVtb3RlQ2FuZGlkYXRlSWQgPSBzdGF0LnJlbW90ZUNhbmRpZGF0ZUlkO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBmaW5hbExvY2FsQ2FuZGlkYXRlID0gbG9jYWxDYW5kaWRhdGVzW2xvY2FsQ2FuZGlkYXRlSWRdO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCEhZmluYWxMb2NhbENhbmRpZGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNhbmRMaXN0ID0gdGhpcy5zdHJlYW0uZ2V0TG9jYWxJY2VDYW5kaWRhdGVMaXN0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY2FuZCA9IGNhbmRMaXN0LmZpbHRlcigoYzogUlRDSWNlQ2FuZGlkYXRlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAoISFjLmNhbmRpZGF0ZSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYy5jYW5kaWRhdGUuaW5kZXhPZihmaW5hbExvY2FsQ2FuZGlkYXRlLmlwQWRkcmVzcykgPj0gMCAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYy5jYW5kaWRhdGUuaW5kZXhPZihmaW5hbExvY2FsQ2FuZGlkYXRlLnBvcnROdW1iZXIpID49IDAgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGMuY2FuZGlkYXRlLmluZGV4T2YoZmluYWxMb2NhbENhbmRpZGF0ZS5wcmlvcml0eSkgPj0gMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmluYWxMb2NhbENhbmRpZGF0ZS5yYXcgPSAhIWNhbmRbMF0gPyBjYW5kWzBdLmNhbmRpZGF0ZSA6ICdFUlJPUjogQ2Fubm90IGZpbmQgbG9jYWwgY2FuZGlkYXRlIGluIGxpc3Qgb2Ygc2VudCBJQ0UgY2FuZGlkYXRlcyc7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbmFsTG9jYWxDYW5kaWRhdGUgPSAnRVJST1I6IE5vIGFjdGl2ZSBsb2NhbCBJQ0UgY2FuZGlkYXRlLiBQcm9iYWJseSBJQ0UtVENQIGlzIGJlaW5nIHVzZWQnO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgZmluYWxSZW1vdGVDYW5kaWRhdGUgPSByZW1vdGVDYW5kaWRhdGVzW3JlbW90ZUNhbmRpZGF0ZUlkXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghIWZpbmFsUmVtb3RlQ2FuZGlkYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY2FuZExpc3QgPSB0aGlzLnN0cmVhbS5nZXRSZW1vdGVJY2VDYW5kaWRhdGVMaXN0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY2FuZCA9IGNhbmRMaXN0LmZpbHRlcigoYzogUlRDSWNlQ2FuZGlkYXRlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAoISFjLmNhbmRpZGF0ZSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYy5jYW5kaWRhdGUuaW5kZXhPZihmaW5hbFJlbW90ZUNhbmRpZGF0ZS5pcEFkZHJlc3MpID49IDAgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGMuY2FuZGlkYXRlLmluZGV4T2YoZmluYWxSZW1vdGVDYW5kaWRhdGUucG9ydE51bWJlcikgPj0gMCAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYy5jYW5kaWRhdGUuaW5kZXhPZihmaW5hbFJlbW90ZUNhbmRpZGF0ZS5wcmlvcml0eSkgPj0gMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmluYWxSZW1vdGVDYW5kaWRhdGUucmF3ID0gISFjYW5kWzBdID8gY2FuZFswXS5jYW5kaWRhdGUgOiAnRVJST1I6IENhbm5vdCBmaW5kIHJlbW90ZSBjYW5kaWRhdGUgaW4gbGlzdCBvZiByZWNlaXZlZCBJQ0UgY2FuZGlkYXRlcyc7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbmFsUmVtb3RlQ2FuZGlkYXRlID0gJ0VSUk9SOiBObyBhY3RpdmUgcmVtb3RlIElDRSBjYW5kaWRhdGUuIFByb2JhYmx5IElDRS1UQ1AgaXMgYmVpbmcgdXNlZCc7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdvb2dDYW5kaWRhdGVQYWlyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvY2FsQ2FuZGlkYXRlOiBmaW5hbExvY2FsQ2FuZGlkYXRlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbW90ZUNhbmRpZGF0ZTogZmluYWxSZW1vdGVDYW5kaWRhdGVcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KCdTZWxlY3RlZCBJQ0UgY2FuZGlkYXRlIGluZm8gb25seSBhdmFpbGFibGUgZm9yIENocm9tZScpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAoZXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBzZW5kU3RhdHNUb0h0dHBFbmRwb2ludChpbnN0cnVtZW50YXRpb24pOiB2b2lkIHtcblxuICAgICAgICBjb25zdCBzZW5kUG9zdCA9IChqc29uKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBodHRwOiBYTUxIdHRwUmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICAgICAgY29uc3QgdXJsOiBzdHJpbmcgPSBpbnN0cnVtZW50YXRpb24ud2VicnRjLmh0dHBFbmRwb2ludDtcbiAgICAgICAgICAgIGh0dHAub3BlbignUE9TVCcsIHVybCwgdHJ1ZSk7XG5cbiAgICAgICAgICAgIGh0dHAuc2V0UmVxdWVzdEhlYWRlcignQ29udGVudC10eXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcblxuICAgICAgICAgICAgaHR0cC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSAoKSA9PiB7IC8vIENhbGwgYSBmdW5jdGlvbiB3aGVuIHRoZSBzdGF0ZSBjaGFuZ2VzLlxuICAgICAgICAgICAgICAgIGlmIChodHRwLnJlYWR5U3RhdGUgPT09IDQgJiYgaHR0cC5zdGF0dXMgPT09IDIwMCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnV2ViUnRjIHN0YXRzIHN1Y2Nlc3NmdWxseSBzZW50IHRvICcgKyB1cmwgKyAnIGZvciBzdHJlYW0gJyArIHRoaXMuc3RyZWFtLnN0cmVhbUlkICsgJyBvZiBjb25uZWN0aW9uICcgKyB0aGlzLnN0cmVhbS5jb25uZWN0aW9uLmNvbm5lY3Rpb25JZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGh0dHAuc2VuZChqc29uKTtcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBmID0gKHN0YXRzKSA9PiB7XG5cbiAgICAgICAgICAgIGlmIChwbGF0Zm9ybS5uYW1lIS5pbmRleE9mKCdGaXJlZm94JykgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgc3RhdHMuZm9yRWFjaCgoc3RhdCkgPT4ge1xuXG4gICAgICAgICAgICAgICAgICAgIGxldCBqc29uID0ge307XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKChzdGF0LnR5cGUgPT09ICdpbmJvdW5kLXJ0cCcpICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQXZvaWQgZmlyZWZveCBlbXB0eSBvdXRib3VuZC1ydHAgc3RhdGlzdGljc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXQubmFja0NvdW50ICE9PSBudWxsICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdC5pc1JlbW90ZSA9PT0gZmFsc2UgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGF0LmlkLnN0YXJ0c1dpdGgoJ2luYm91bmQnKSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXQucmVtb3RlSWQuc3RhcnRzV2l0aCgnaW5ib3VuZCcpXG4gICAgICAgICAgICAgICAgICAgICAgICApKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1ldHJpY0lkID0gJ3dlYnJ0Y19pbmJvdW5kXycgKyBzdGF0Lm1lZGlhVHlwZSArICdfJyArIHN0YXQuc3NyYztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGppdCA9IHN0YXQuaml0dGVyICogMTAwMDtcblxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbWV0cmljcyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBieXRlc1JlY2VpdmVkOiAoc3RhdC5ieXRlc1JlY2VpdmVkIC0gdGhpcy5zdGF0cy5pbmJvdW5kW3N0YXQubWVkaWFUeXBlXS5ieXRlc1JlY2VpdmVkKSAvIHRoaXMuc3RhdHNJbnRlcnZhbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBqaXR0ZXI6IGppdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYWNrZXRzUmVjZWl2ZWQ6IChzdGF0LnBhY2tldHNSZWNlaXZlZCAtIHRoaXMuc3RhdHMuaW5ib3VuZFtzdGF0Lm1lZGlhVHlwZV0ucGFja2V0c1JlY2VpdmVkKSAvIHRoaXMuc3RhdHNJbnRlcnZhbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYWNrZXRzTG9zdDogKHN0YXQucGFja2V0c0xvc3QgLSB0aGlzLnN0YXRzLmluYm91bmRbc3RhdC5tZWRpYVR5cGVdLnBhY2tldHNMb3N0KSAvIHRoaXMuc3RhdHNJbnRlcnZhbFxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHVuaXRzID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ5dGVzUmVjZWl2ZWQ6ICdieXRlcycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaml0dGVyOiAnbXMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhY2tldHNSZWNlaXZlZDogJ3BhY2tldHMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhY2tldHNMb3N0OiAncGFja2V0cydcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc3RhdC5tZWRpYVR5cGUgPT09ICd2aWRlbycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXRyaWNzWydmcmFtZXNEZWNvZGVkJ10gPSAoc3RhdC5mcmFtZXNEZWNvZGVkIC0gdGhpcy5zdGF0cy5pbmJvdW5kLnZpZGVvLmZyYW1lc0RlY29kZWQpIC8gdGhpcy5zdGF0c0ludGVydmFsO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ldHJpY3NbJ25hY2tDb3VudCddID0gKHN0YXQubmFja0NvdW50IC0gdGhpcy5zdGF0cy5pbmJvdW5kLnZpZGVvLm5hY2tDb3VudCkgLyB0aGlzLnN0YXRzSW50ZXJ2YWw7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5pdHNbJ2ZyYW1lc0RlY29kZWQnXSA9ICdmcmFtZXMnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVuaXRzWyduYWNrQ291bnQnXSA9ICdwYWNrZXRzJztcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc3RhdHMuaW5ib3VuZC52aWRlby5mcmFtZXNEZWNvZGVkID0gc3RhdC5mcmFtZXNEZWNvZGVkO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc3RhdHMuaW5ib3VuZC52aWRlby5uYWNrQ291bnQgPSBzdGF0Lm5hY2tDb3VudDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zdGF0cy5pbmJvdW5kW3N0YXQubWVkaWFUeXBlXS5ieXRlc1JlY2VpdmVkID0gc3RhdC5ieXRlc1JlY2VpdmVkO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zdGF0cy5pbmJvdW5kW3N0YXQubWVkaWFUeXBlXS5wYWNrZXRzUmVjZWl2ZWQgPSBzdGF0LnBhY2tldHNSZWNlaXZlZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc3RhdHMuaW5ib3VuZFtzdGF0Lm1lZGlhVHlwZV0ucGFja2V0c0xvc3QgPSBzdGF0LnBhY2tldHNMb3N0O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBqc29uID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdAdGltZXN0YW1wJzogbmV3IERhdGUoc3RhdC50aW1lc3RhbXApLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2V4ZWMnOiBpbnN0cnVtZW50YXRpb24uZXhlYyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnY29tcG9uZW50JzogaW5zdHJ1bWVudGF0aW9uLmNvbXBvbmVudCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnc3RyZWFtJzogJ3dlYlJ0YycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3R5cGUnOiBtZXRyaWNJZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnc3RyZWFtX3R5cGUnOiAnY29tcG9zZWRfbWV0cmljcycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3VuaXRzJzogdW5pdHNcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICBqc29uW21ldHJpY0lkXSA9IG1ldHJpY3M7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbmRQb3N0KEpTT04uc3RyaW5naWZ5KGpzb24pKTtcblxuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKChzdGF0LnR5cGUgPT09ICdvdXRib3VuZC1ydHAnKSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEF2b2lkIGZpcmVmb3ggZW1wdHkgaW5ib3VuZC1ydHAgc3RhdGlzdGljc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXQuaXNSZW1vdGUgPT09IGZhbHNlICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdC5pZC50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKCdvdXRib3VuZCcpXG4gICAgICAgICAgICAgICAgICAgICAgICApKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1ldHJpY0lkID0gJ3dlYnJ0Y19vdXRib3VuZF8nICsgc3RhdC5tZWRpYVR5cGUgKyAnXycgKyBzdGF0LnNzcmM7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1ldHJpY3MgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnl0ZXNTZW50OiAoc3RhdC5ieXRlc1NlbnQgLSB0aGlzLnN0YXRzLm91dGJvdW5kW3N0YXQubWVkaWFUeXBlXS5ieXRlc1NlbnQpIC8gdGhpcy5zdGF0c0ludGVydmFsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhY2tldHNTZW50OiAoc3RhdC5wYWNrZXRzU2VudCAtIHRoaXMuc3RhdHMub3V0Ym91bmRbc3RhdC5tZWRpYVR5cGVdLnBhY2tldHNTZW50KSAvIHRoaXMuc3RhdHNJbnRlcnZhbFxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHVuaXRzID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ5dGVzU2VudDogJ2J5dGVzJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYWNrZXRzU2VudDogJ3BhY2tldHMnXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHN0YXQubWVkaWFUeXBlID09PSAndmlkZW8nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWV0cmljc1snZnJhbWVzRW5jb2RlZCddID0gKHN0YXQuZnJhbWVzRW5jb2RlZCAtIHRoaXMuc3RhdHMub3V0Ym91bmQudmlkZW8uZnJhbWVzRW5jb2RlZCkgLyB0aGlzLnN0YXRzSW50ZXJ2YWw7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5pdHNbJ2ZyYW1lc0VuY29kZWQnXSA9ICdmcmFtZXMnO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zdGF0cy5vdXRib3VuZC52aWRlby5mcmFtZXNFbmNvZGVkID0gc3RhdC5mcmFtZXNFbmNvZGVkO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnN0YXRzLm91dGJvdW5kW3N0YXQubWVkaWFUeXBlXS5ieXRlc1NlbnQgPSBzdGF0LmJ5dGVzU2VudDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc3RhdHMub3V0Ym91bmRbc3RhdC5tZWRpYVR5cGVdLnBhY2tldHNTZW50ID0gc3RhdC5wYWNrZXRzU2VudDtcblxuICAgICAgICAgICAgICAgICAgICAgICAganNvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnQHRpbWVzdGFtcCc6IG5ldyBEYXRlKHN0YXQudGltZXN0YW1wKS50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdleGVjJzogaW5zdHJ1bWVudGF0aW9uLmV4ZWMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2NvbXBvbmVudCc6IGluc3RydW1lbnRhdGlvbi5jb21wb25lbnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3N0cmVhbSc6ICd3ZWJSdGMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICd0eXBlJzogbWV0cmljSWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3N0cmVhbV90eXBlJzogJ2NvbXBvc2VkX21ldHJpY3MnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICd1bml0cyc6IHVuaXRzXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAganNvblttZXRyaWNJZF0gPSBtZXRyaWNzO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBzZW5kUG9zdChKU09OLnN0cmluZ2lmeShqc29uKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoKHBsYXRmb3JtLm5hbWUhLmluZGV4T2YoJ0Nocm9tZScpICE9PSAtMSkgfHwgKHBsYXRmb3JtLm5hbWUhLmluZGV4T2YoJ09wZXJhJykgIT09IC0xKSkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKHN0YXRzKSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBzdGF0ID0gc3RhdHNba2V5XTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0YXQudHlwZSA9PT0gJ3NzcmMnKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBqc29uID0ge307XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgnYnl0ZXNSZWNlaXZlZCcgaW4gc3RhdCAmJiAoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKHN0YXQubWVkaWFUeXBlID09PSAnYXVkaW8nICYmICdhdWRpb091dHB1dExldmVsJyBpbiBzdGF0KSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIChzdGF0Lm1lZGlhVHlwZSA9PT0gJ3ZpZGVvJyAmJiAncXBTdW0nIGluIHN0YXQpXG4gICAgICAgICAgICAgICAgICAgICAgICApKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaW5ib3VuZC1ydHBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBtZXRyaWNJZCA9ICd3ZWJydGNfaW5ib3VuZF8nICsgc3RhdC5tZWRpYVR5cGUgKyAnXycgKyBzdGF0LnNzcmM7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBtZXRyaWNzID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBieXRlc1JlY2VpdmVkOiAoc3RhdC5ieXRlc1JlY2VpdmVkIC0gdGhpcy5zdGF0cy5pbmJvdW5kW3N0YXQubWVkaWFUeXBlXS5ieXRlc1JlY2VpdmVkKSAvIHRoaXMuc3RhdHNJbnRlcnZhbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaml0dGVyOiBzdGF0Lmdvb2dKaXR0ZXJCdWZmZXJNcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFja2V0c1JlY2VpdmVkOiAoc3RhdC5wYWNrZXRzUmVjZWl2ZWQgLSB0aGlzLnN0YXRzLmluYm91bmRbc3RhdC5tZWRpYVR5cGVdLnBhY2tldHNSZWNlaXZlZCkgLyB0aGlzLnN0YXRzSW50ZXJ2YWwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhY2tldHNMb3N0OiAoc3RhdC5wYWNrZXRzTG9zdCAtIHRoaXMuc3RhdHMuaW5ib3VuZFtzdGF0Lm1lZGlhVHlwZV0ucGFja2V0c0xvc3QpIC8gdGhpcy5zdGF0c0ludGVydmFsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB1bml0cyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnl0ZXNSZWNlaXZlZDogJ2J5dGVzJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaml0dGVyOiAnbXMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYWNrZXRzUmVjZWl2ZWQ6ICdwYWNrZXRzJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFja2V0c0xvc3Q6ICdwYWNrZXRzJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHN0YXQubWVkaWFUeXBlID09PSAndmlkZW8nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ldHJpY3NbJ2ZyYW1lc0RlY29kZWQnXSA9IChzdGF0LmZyYW1lc0RlY29kZWQgLSB0aGlzLnN0YXRzLmluYm91bmQudmlkZW8uZnJhbWVzRGVjb2RlZCkgLyB0aGlzLnN0YXRzSW50ZXJ2YWw7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ldHJpY3NbJ25hY2tDb3VudCddID0gKHN0YXQuZ29vZ05hY2tzU2VudCAtIHRoaXMuc3RhdHMuaW5ib3VuZC52aWRlby5uYWNrQ291bnQpIC8gdGhpcy5zdGF0c0ludGVydmFsO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bml0c1snZnJhbWVzRGVjb2RlZCddID0gJ2ZyYW1lcyc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVuaXRzWyduYWNrQ291bnQnXSA9ICdwYWNrZXRzJztcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnN0YXRzLmluYm91bmQudmlkZW8uZnJhbWVzRGVjb2RlZCA9IHN0YXQuZnJhbWVzRGVjb2RlZDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zdGF0cy5pbmJvdW5kLnZpZGVvLm5hY2tDb3VudCA9IHN0YXQuZ29vZ05hY2tzU2VudDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnN0YXRzLmluYm91bmRbc3RhdC5tZWRpYVR5cGVdLmJ5dGVzUmVjZWl2ZWQgPSBzdGF0LmJ5dGVzUmVjZWl2ZWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zdGF0cy5pbmJvdW5kW3N0YXQubWVkaWFUeXBlXS5wYWNrZXRzUmVjZWl2ZWQgPSBzdGF0LnBhY2tldHNSZWNlaXZlZDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnN0YXRzLmluYm91bmRbc3RhdC5tZWRpYVR5cGVdLnBhY2tldHNMb3N0ID0gc3RhdC5wYWNrZXRzTG9zdDtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGpzb24gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdAdGltZXN0YW1wJzogbmV3IERhdGUoc3RhdC50aW1lc3RhbXApLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdleGVjJzogaW5zdHJ1bWVudGF0aW9uLmV4ZWMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdjb21wb25lbnQnOiBpbnN0cnVtZW50YXRpb24uY29tcG9uZW50LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnc3RyZWFtJzogJ3dlYlJ0YycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICd0eXBlJzogbWV0cmljSWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdzdHJlYW1fdHlwZSc6ICdjb21wb3NlZF9tZXRyaWNzJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3VuaXRzJzogdW5pdHNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGpzb25bbWV0cmljSWRdID0gbWV0cmljcztcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbmRQb3N0KEpTT04uc3RyaW5naWZ5KGpzb24pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoJ2J5dGVzU2VudCcgaW4gc3RhdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG91dGJvdW5kLXJ0cFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1ldHJpY0lkID0gJ3dlYnJ0Y19vdXRib3VuZF8nICsgc3RhdC5tZWRpYVR5cGUgKyAnXycgKyBzdGF0LnNzcmM7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBtZXRyaWNzID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBieXRlc1NlbnQ6IChzdGF0LmJ5dGVzU2VudCAtIHRoaXMuc3RhdHMub3V0Ym91bmRbc3RhdC5tZWRpYVR5cGVdLmJ5dGVzU2VudCkgLyB0aGlzLnN0YXRzSW50ZXJ2YWwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhY2tldHNTZW50OiAoc3RhdC5wYWNrZXRzU2VudCAtIHRoaXMuc3RhdHMub3V0Ym91bmRbc3RhdC5tZWRpYVR5cGVdLnBhY2tldHNTZW50KSAvIHRoaXMuc3RhdHNJbnRlcnZhbFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdW5pdHMgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ5dGVzU2VudDogJ2J5dGVzJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFja2V0c1NlbnQ6ICdwYWNrZXRzJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHN0YXQubWVkaWFUeXBlID09PSAndmlkZW8nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ldHJpY3NbJ2ZyYW1lc0VuY29kZWQnXSA9IChzdGF0LmZyYW1lc0VuY29kZWQgLSB0aGlzLnN0YXRzLm91dGJvdW5kLnZpZGVvLmZyYW1lc0VuY29kZWQpIC8gdGhpcy5zdGF0c0ludGVydmFsO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bml0c1snZnJhbWVzRW5jb2RlZCddID0gJ2ZyYW1lcyc7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zdGF0cy5vdXRib3VuZC52aWRlby5mcmFtZXNFbmNvZGVkID0gc3RhdC5mcmFtZXNFbmNvZGVkO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc3RhdHMub3V0Ym91bmRbc3RhdC5tZWRpYVR5cGVdLmJ5dGVzU2VudCA9IHN0YXQuYnl0ZXNTZW50O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc3RhdHMub3V0Ym91bmRbc3RhdC5tZWRpYVR5cGVdLnBhY2tldHNTZW50ID0gc3RhdC5wYWNrZXRzU2VudDtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGpzb24gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdAdGltZXN0YW1wJzogbmV3IERhdGUoc3RhdC50aW1lc3RhbXApLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdleGVjJzogaW5zdHJ1bWVudGF0aW9uLmV4ZWMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdjb21wb25lbnQnOiBpbnN0cnVtZW50YXRpb24uY29tcG9uZW50LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnc3RyZWFtJzogJ3dlYlJ0YycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICd0eXBlJzogbWV0cmljSWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdzdHJlYW1fdHlwZSc6ICdjb21wb3NlZF9tZXRyaWNzJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3VuaXRzJzogdW5pdHNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGpzb25bbWV0cmljSWRdID0gbWV0cmljcztcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbmRQb3N0KEpTT04uc3RyaW5naWZ5KGpzb24pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmdldFN0YXRzQWdub3N0aWModGhpcy5zdHJlYW0uZ2V0UlRDUGVlckNvbm5lY3Rpb24oKSwgZiwgKGVycm9yKSA9PiB7IGNvbnNvbGUubG9nKGVycm9yKTsgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBzdGFuZGFyZGl6ZVJlcG9ydChyZXNwb25zZSkge1xuICAgICAgICBjb25zb2xlLmxvZyhyZXNwb25zZSk7XG4gICAgICAgIGNvbnN0IHN0YW5kYXJkUmVwb3J0ID0ge307XG5cbiAgICAgICAgaWYgKHBsYXRmb3JtLm5hbWUhLmluZGV4T2YoJ0ZpcmVmb3gnKSAhPT0gLTEpIHtcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKHJlc3BvbnNlKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cocmVzcG9uc2Vba2V5XSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiByZXNwb25zZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJlc3BvbnNlLnJlc3VsdCgpLmZvckVhY2gocmVwb3J0ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHN0YW5kYXJkU3RhdHMgPSB7XG4gICAgICAgICAgICAgICAgaWQ6IHJlcG9ydC5pZCxcbiAgICAgICAgICAgICAgICB0aW1lc3RhbXA6IHJlcG9ydC50aW1lc3RhbXAsXG4gICAgICAgICAgICAgICAgdHlwZTogcmVwb3J0LnR5cGVcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXBvcnQubmFtZXMoKS5mb3JFYWNoKChuYW1lKSA9PiB7XG4gICAgICAgICAgICAgICAgc3RhbmRhcmRTdGF0c1tuYW1lXSA9IHJlcG9ydC5zdGF0KG5hbWUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBzdGFuZGFyZFJlcG9ydFtzdGFuZGFyZFN0YXRzLmlkXSA9IHN0YW5kYXJkU3RhdHM7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBzdGFuZGFyZFJlcG9ydDtcbiAgICB9XG5cbiAgICBwcml2YXRlIGdldFN0YXRzQWdub3N0aWMocGMsIHN1Y2Nlc3NDYiwgZmFpbHVyZUNiKSB7XG4gICAgICAgIGlmIChwbGF0Zm9ybS5uYW1lIS5pbmRleE9mKCdGaXJlZm94JykgIT09IC0xKSB7XG4gICAgICAgICAgICAvLyBnZXRTdGF0cyB0YWtlcyBhcmdzIGluIGRpZmZlcmVudCBvcmRlciBpbiBDaHJvbWUgYW5kIEZpcmVmb3hcbiAgICAgICAgICAgIHJldHVybiBwYy5nZXRTdGF0cyhudWxsKS50aGVuKHJlc3BvbnNlID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCByZXBvcnQgPSB0aGlzLnN0YW5kYXJkaXplUmVwb3J0KHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICBzdWNjZXNzQ2IocmVwb3J0KTtcbiAgICAgICAgICAgIH0pLmNhdGNoKGZhaWx1cmVDYik7XG4gICAgICAgIH0gZWxzZSBpZiAoKHBsYXRmb3JtLm5hbWUhLmluZGV4T2YoJ0Nocm9tZScpICE9PSAtMSkgfHwgKHBsYXRmb3JtLm5hbWUhLmluZGV4T2YoJ09wZXJhJykgIT09IC0xKSkge1xuICAgICAgICAgICAgLy8gSW4gQ2hyb21lLCB0aGUgZmlyc3QgdHdvIGFyZ3VtZW50cyBhcmUgcmV2ZXJzZWRcbiAgICAgICAgICAgIHJldHVybiBwYy5nZXRTdGF0cygocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCByZXBvcnQgPSB0aGlzLnN0YW5kYXJkaXplUmVwb3J0KHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICBzdWNjZXNzQ2IocmVwb3J0KTtcbiAgICAgICAgICAgIH0sIG51bGwsIGZhaWx1cmVDYik7XG4gICAgICAgIH1cbiAgICB9XG5cbn0iXX0=
