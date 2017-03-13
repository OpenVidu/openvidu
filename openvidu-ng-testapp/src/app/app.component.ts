import { Component } from '@angular/core';
import { OpenVidu, Session, Stream } from 'openvidu-browser';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent {

  private openVidu: OpenVidu;

  // Join form
  sessionId: string;
  participantId: string;

  // Session
  session: Session;
  streams: Stream[] = [];

  // Publish options
  joinWithVideo: boolean = true;
  joinWithAudio: boolean = true;
  toggleVideo: boolean;
  toggleAudio: boolean;

  constructor() {
    this.generateParticipantInfo();
    window.onbeforeunload = () => {
      this.openVidu.close(true);
    }
  }

  private generateParticipantInfo() {
    this.sessionId = "SessionA";
    this.participantId = "Participant" + Math.floor(Math.random() * 100);
  }

  private addVideoTag(stream: Stream) {
    console.log("Stream added");
    this.streams.push(stream);
  }

  private removeVideoTag(stream: Stream) {
    console.log("Stream removed");
    this.streams.slice(this.streams.indexOf(stream), 1);
  }

  joinSession() {
    var cameraOptions = {
      audio: this.joinWithAudio,
      video: this.joinWithVideo,
      data: true,
      mediaConstraints: {}
    }
    this.joinSessionShared(cameraOptions);
  }

  joinSessionShared(cameraOptions) {

    this.toggleVideo = this.joinWithVideo;
    this.toggleAudio = this.joinWithAudio;

    this.openVidu = new OpenVidu("wss://" + location.hostname + ":8443/");

    this.openVidu.connect((error, openVidu) => {

      if (error)
        return console.log(error);

      let camera = openVidu.getCamera(cameraOptions);

      camera.requestCameraAccess((error, camera) => {

        if (error)
          return console.log(error);

        var sessionOptions = {
          sessionId: this.sessionId,
          participantId: this.participantId
        }

        openVidu.joinSession(sessionOptions, (error, session) => {

          if (error)
            return console.log(error);

          this.session = session;

          this.addVideoTag(camera);

          camera.publish();

          session.addEventListener("stream-added", streamEvent => {
            this.addVideoTag(streamEvent.stream);
            console.log("Stream " + streamEvent.stream + " added");
          });

          session.addEventListener("stream-removed", streamEvent => {
            this.removeVideoTag(streamEvent.stream);
            console.log("Stream " + streamEvent.stream + " removed");
          });

        });
      });
    });
  }

  leaveSession() {
    this.session = null;
    this.streams = [];
    this.openVidu.close(true);
    this.generateParticipantInfo();
  }

  updateToggleVideo(event) {
    this.openVidu.toggleLocalVideoTrack(event.target.checked);
    let msg = (event.target.checked) ? 'Publishing video...' : 'Unpublishing video...'
    console.log(msg);
  }

  updateToggleAudio(event) {
    this.openVidu.toggleLocalAudioTrack(event.target.checked);
    let msg = (event.target.checked) ? 'Publishing audio...' : 'Unpublishing audio...'
    console.log(msg);
  }

}
