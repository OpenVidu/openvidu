import { Observable } from 'rxjs/Rx';
import { enableDebugTools } from '@angular/platform-browser';
import { Component } from '@angular/core';
import { OpenVidu, Session, Publisher, Stream } from 'openvidu-browser';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent {

  private openVidu: OpenVidu;
  private session: Session;
  private publisher: Publisher;

  cameraOptions: any;

  // Join form
  sessionId: string;
  participantId: string;

  // Session
  streams: Stream[] = [];

  // Publish options
  joinWithVideo: boolean = false;
  joinWithAudio: boolean = false;
  toggleVideo: boolean;
  toggleAudio: boolean;

  //Statistics
  stats = [];
  bytesPrev = [];
  framesPrev = [];
  timestampPrev = [];
  signalingState = [];
  iceConnectionState = [];


  constructor() {
    this.generateParticipantInfo();
    //this.obtainSupportedConstraints();
  }

  private generateParticipantInfo() {
    this.sessionId = "SessionA";
    this.participantId = "Participant" + Math.floor(Math.random() * 100);
  }

  private addVideoTag(stream: Stream) {
    console.log("Stream added");
    let ind = (this.streams.push(stream) - 1);

    this.signalingState[ind] = '';
    this.iceConnectionState[ind] = '';

    //Connection events
    stream.getRTCPeerConnection().onsignalingstatechange = (event) => {
      this.signalingState[ind] += " => " + stream.getRTCPeerConnection().signalingState;
      console.info("Stream " + stream.getId() + " signaling state: " + stream.getRTCPeerConnection().signalingState);
    }

    stream.getRTCPeerConnection().oniceconnectionstatechange = (event) => {
      /*if (stream.getRTCPeerConnection().iceconnectionstate === "failed" ||
          stream.getRTCPeerConnection().iceconnectionstate === "disconnected" ||
          stream.getRTCPeerConnection().iceconnectionstate === "closed") {
        // Handle the failure
    };*/
      this.iceConnectionState[ind] += " => " + stream.getRTCPeerConnection().iceConnectionState;
      console.info("Stream " + stream.getId() + " ice connection state: " + stream.getRTCPeerConnection().iceConnectionState);
    }

    //For statistics
    this.timestampPrev.push(0);
    this.bytesPrev.push(0);
    this.framesPrev.push(0);
  }

  private removeVideoTag(stream: Stream) {
    console.log("Stream removed");
    let index = this.streams.indexOf(stream);
    this.streams.splice(index, 1);

    this.stats.splice(index, 1);
    this.timestampPrev.splice(index, 1);
    this.bytesPrev.splice(index, 1);
    this.framesPrev.splice(index, 1);

    this.signalingState.splice(index, 1);
    this.iceConnectionState.splice(index, 1);
  }

  joinSession() {
    let mediaConstraints = this.generateMediaConstraints();

    console.log(mediaConstraints);

    this.cameraOptions = {
      audio: this.joinWithAudio,
      video: this.joinWithVideo,
      data: true,
      mediaConstraints: mediaConstraints
    }
    this.joinSessionShared();
  }

  joinSessionShared() {

    this.toggleVideo = this.joinWithVideo;
    this.toggleAudio = this.joinWithAudio;

    this.openVidu = new OpenVidu("wss://" + location.hostname + ":8443/");
    this.session = this.openVidu.initSession(this.sessionId);

    this.session.on('streamCreated', (event) => {
      this.session.subscribe(event.stream, 'subscriber', {
        insertMode: 'append',
        width: '100%',
        height: '100%'
      });
      this.addVideoTag(event.stream);
    });

    this.session.on('streamDestroyed', (event) => {
      this.removeVideoTag(event.stream);
    });

    this.session.connect(this.participantId, (error) => {

      // If the connection is successful, initialize a publisher and publish to the session
      if (!error) {

        // 4) Get your own camera stream with the desired resolution and publish it, only if the user is supposed to do so
        this.publisher = this.openVidu.initPublisher('publisher', this.cameraOptions);

        // 5) Publish your stream
        this.session.publish(this.publisher);

        this.intervalStats().subscribe();

      } else {
        console.log('There was an error connecting to the session:', error.code, error.message);
      }
    });
  }

  leaveSession() {
    this.session.disconnect();
    this.session = null;
    this.streams = [];
    this.generateParticipantInfo();
  }

  updateToggleVideo(event) {
    this.publisher.publishVideo(event.target.checked);
    let msg = (event.target.checked) ? 'Publishing video...' : 'Unpublishing video...'
    console.log(msg);
  }

  updateToggleAudio(event) {
    this.publisher.publishAudio(event.target.checked);
    let msg = (event.target.checked) ? 'Publishing audio...' : 'Unpublishing audio...'
    console.log(msg);
  }

  updateToggleStatistics(i) {
    let table = (<HTMLInputElement>document.getElementById('table-' + i));
    (table.style.display == "none") ? table.style.display = "block" : table.style.display = "none";
  }

  updateToggleState(i) {
    let state = (<HTMLInputElement>document.getElementById('state-' + i));
    (state.style.display == "none") ? state.style.display = "block" : state.style.display = "none";
  }

  /*obtainSupportedConstraints() {
    let constraints = Object.keys(navigator.mediaDevices.getSupportedConstraints());
    this.supportedVideoContstraints = constraints.filter((e) => {
      return this.mediaTrackSettingsVideo.indexOf(e) > -1;
    });
    this.supportedAudioContstraints = constraints.filter((e) => {
      return this.mediaTrackSettingsAudio.indexOf(e) > -1;
    });

    console.log(constraints);
    console.log(this.supportedVideoContstraints);
    console.log(this.supportedAudioContstraints);
  }*/

  generateMediaConstraints() {
    let mediaConstraints = {
      audio: true,
      video: {}
    }
    if (this.joinWithVideo) {
      mediaConstraints.video['width'] = { exact: Number((<HTMLInputElement>document.getElementById('width')).value) };
      mediaConstraints.video['height'] = { exact: Number((<HTMLInputElement>document.getElementById('height')).value) };
      mediaConstraints.video['frameRate'] = { ideal: Number((<HTMLInputElement>document.getElementById('frameRate')).value) };
    }

    return mediaConstraints;
  }


  intervalStats() {
    return Observable
      .interval(1000)
      .flatMap(() => {
        let i = 0;
        for (let str of this.streams) {
          if (str.getWebRtcPeer().peerConnection) {
            this.intervalStatsAux(i, str);
            i++;
          }
        }
        return [];
      });
  }

  intervalStatsAux(i: number, stream: Stream) {
    stream.getWebRtcPeer().peerConnection.getStats(null)
      .then((results) => {
        this.stats[i] = this.dumpStats(results, i);
        console.info(results);
      });
  }


  dumpStats(results, i) {
    var statsArray = [];
    let bitrate;
    let frames;

    results.forEach((res) => {
      let date = new Date(res.timestamp);
      statsArray.push({ res: res, type: res.type, timestamp: date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds() });

      let now = res.timestamp;

      if (res.type === 'inbound-rtp' && res.mediaType === 'video') {
        // firefox calculates the bitrate for us
        // https://bugzilla.mozilla.org/show_bug.cgi?id=951496
        bitrate = Math.floor(res.bitrateMean / 1024);
        if (res.framerateMean !== undefined && res.frameRate != "0") {
          frames = (res.framerateMean).toFixed(2);
        }

      } else if (res.type === 'ssrc' && res.bytesReceived && res.googFrameRateReceived) {
        // chrome does not so we need to do it ourselves
        var bytes = res.bytesReceived;
        frames = (res.googFrameRateOutput == "0") ? Number(this.framesPrev[i]) : Number(res.googFrameRateOutput);
        if (this.timestampPrev[i]) {
          bitrate = 8 * (bytes - this.bytesPrev[i]) / (now - this.timestampPrev[i]);
          bitrate = Math.floor(bitrate);
        }
        this.bytesPrev[i] = bytes;
        this.timestampPrev[i] = now;
      }

    });
    if (bitrate) {
      bitrate += ' kbits/sec';
    }
    if (frames) {
      this.framesPrev[i] = frames;
      frames += ' fps';
    }
    return { statsArray: statsArray, bitrate: bitrate, framerate: frames };
  }

  getStatAttributes(stat) {
    let s = '';
    Object.keys(stat).forEach((key) => {
      if (key != 'type' && key != 'timestamp') s += (' | ' + key + ' | ');
    });
    return s;
  }
}