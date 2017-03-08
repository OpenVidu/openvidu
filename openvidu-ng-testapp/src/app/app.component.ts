import { Component } from '@angular/core';
import { OpenVidu, Session, Stream } from 'openvidu-browser';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent {

  private openVidu: OpenVidu;

  //Join form
  sessionId: string;
  participantId: string;

  //Session
  session: Session;
  streams: Stream[] = [];

  constructor() {
    this.generateParticipantInfo();
    window.onbeforeunload = () => {
      this.openVidu.close(true);
    }
  }

  private generateParticipantInfo(){
    this.sessionId = "SessionA";
    this.participantId = "Participant"+Math.floor(Math.random() * 100);
  }

  private addVideoTag(stream:Stream){
    console.log("Stream added");
    this.streams.push(stream);
  }

  private removeVideoTag(stream:Stream){
    console.log("Stream removed");
    this.streams.slice(this.streams.indexOf(stream), 1);
  }

  joinSession() {

    this.openVidu = new OpenVidu("wss://127.0.0.1:8443/");

    this.openVidu.connect((error, openVidu) => {

      if (error)
        return console.log(error);

      let camera = openVidu.getCamera();

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
          });

          session.addEventListener("stream-removed", streamEvent => {
            this.removeVideoTag(streamEvent.stream);            
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

}
