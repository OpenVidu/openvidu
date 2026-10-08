// Synthetic camera and microphone for OpenViduTestAppE2eEgressProTest (Participant Passthrough Egress).
//
// Replaces navigator.mediaDevices.getUserMedia and getDisplayMedia so that every
// track the testapp captures (at connect, when unmuting, when adding a track,
// when sharing the screen) comes from:
//   - a 640x480 canvas (the camera) or an 800x600 canvas (the screen) that is
//     dark with a moving bar, and white during the first 100 ms of every second
//     of the page clock. The bar crosses the canvas once every BAR_PERIOD_MS of
//     that clock, whatever its width, so the left edge of the bar in any frame
//     tells the page time it was drawn at, within 2 s and to a few ms (whole
//     seconds at 0 and half the width);
//   - a WebAudio 1 kHz tone that sounds during the first 100 ms of every second
//     of the same clock, and is silent otherwise.
// A recording keeps audio and video in sync when each white flash starts with
// a beep, whenever each track was published.
//
// A camera track that livekit-client stops (it does on every mute) is kept live
// and handed out again by the next getUserMedia. Chrome times every new canvas
// capture track afresh, so a camera reopened as a new track sent RTP timestamps
// 30-90 ms off its frames, which a real camera does not do (with Chrome's fake
// capture device they stay within 1 ms across reopens): the recordings would
// show an A/V offset that no SFU or egress introduced.
(function () {
  if (window.__ovSyncMedia) {
    return;
  }

  var WIDTH = 640;
  var HEIGHT = 480;
  var SCREEN_WIDTH = 800;
  var SCREEN_HEIGHT = 600;
  var MARKER_MS = 100;
  var BAR_PERIOD_MS = 2000; // a multiple of 1000: the bar also tells whole seconds
  var origin = performance.now();
  function clock() {
    return performance.now() - origin;
  }

  function createCanvas(width, height) {
    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  var camera = createCanvas(WIDTH, HEIGHT);
  var screen = createCanvas(SCREEN_WIDTH, SCREEN_HEIGHT);
  function drawOn(canvas, t) {
    var ctx = canvas.getContext('2d');
    var w = canvas.width;
    var h = canvas.height;
    if (t % 1000 < MARKER_MS) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      return;
    }
    ctx.fillStyle = '#202020';
    ctx.fillRect(0, 0, w, h);
    // something always moves, so that encoders keep producing frames
    ctx.fillStyle = '#3070c0';
    ctx.fillRect(((t % BAR_PERIOD_MS) / BAR_PERIOD_MS) * w, h / 3, 80, h / 3);
    ctx.fillStyle = '#c0c0c0';
    ctx.font = '40px sans-serif';
    ctx.fillText((t / 1000).toFixed(1), 20, 60);
  }
  function draw() {
    var t = clock();
    drawOn(camera, t);
    drawOn(screen, t);
  }
  // timers keep running (throttled) in background tabs, where requestAnimationFrame stops
  setInterval(draw, 1000 / 60);
  draw();
  var video = camera.captureStream(30).getVideoTracks()[0];
  var screenVideo = screen.captureStream(30).getVideoTracks()[0];

  var audioContext = new AudioContext({ sampleRate: 48000 });
  var destination = audioContext.createMediaStreamDestination();
  var oscillator = audioContext.createOscillator();
  oscillator.frequency.value = 1000;
  var gain = audioContext.createGain();
  gain.gain.value = 0;
  oscillator.connect(gain).connect(destination);
  oscillator.start();
  var audio = destination.stream.getAudioTracks()[0];

  // Beeps are scheduled on the audio clock, a few hundred ms ahead, mapping each
  // whole second of the page clock to audio time at the moment of scheduling.
  var nextBeep = Math.ceil(clock() / 1000) * 1000;
  setInterval(function () {
    var now = clock();
    var audioNow = audioContext.currentTime;
    while (nextBeep < now + 300) {
      if (nextBeep >= now) {
        var at = audioNow + (nextBeep - now) / 1000;
        gain.gain.setValueAtTime(0.5, at);
        gain.gain.setValueAtTime(0, at + MARKER_MS / 1000);
      }
      nextBeep += 1000;
    }
  }, 50);

  // Autoplay policies keep the context suspended until a user gesture: the
  // WebDriver clicks on the testapp buttons count as one.
  function resume() {
    if (audioContext.state !== 'running') {
      audioContext.resume();
    }
  }
  document.addEventListener('click', resume, true);
  document.addEventListener('keydown', resume, true);

  // camera tracks stopped by the page, still live, for the next getUserMedia
  var stoppedCameras = [];
  function cameraTrack() {
    var track = stoppedCameras.pop();
    if (!track) {
      track = video.clone();
      track.stop = function () {
        if (stoppedCameras.indexOf(track) < 0) {
          stoppedCameras.push(track);
        }
      };
    }
    track.enabled = true;
    return track;
  }

  var originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = function (constraints) {
    resume();
    var tracks = [];
    if (constraints && constraints.audio) {
      tracks.push(audio.clone());
    }
    if (constraints && constraints.video) {
      tracks.push(cameraTrack());
    }
    if (tracks.length === 0) {
      return originalGetUserMedia(constraints);
    }
    return Promise.resolve(new MediaStream(tracks));
  };
  // the screen flashes with the camera: it must be in sync with the microphone too
  navigator.mediaDevices.getDisplayMedia = function () {
    resume();
    return Promise.resolve(new MediaStream([screenVideo.clone()]));
  };

  window.__ovSyncMedia = true;
})();
