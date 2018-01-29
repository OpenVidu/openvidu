import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { OpenVidu, Session, Stream } from 'openvidu-browser';

@Component({
  selector: 'app-layout-best-fit',
  templateUrl: './layout-best-fit.component.html',
  styleUrls: ['./layout-best-fit.component.css']
})
export class LayoutBestFitComponent implements OnInit, OnDestroy {

  sessionId: string;
  secret: string;

  session: Session;
  numberOfVideos = 0;
  remoteStreams = [];

  constructor(private route: ActivatedRoute) {
    this.route.params.subscribe(params => {
      this.sessionId = params.sessionId;
      this.secret = params.secret;
    });
  }

  @HostListener('window:beforeunload')
  beforeunloadHandler() {
    this.leaveSession();
  }

  ngOnDestroy() {
    this.leaveSession();
  }

  ngOnInit() {
    const OV = new OpenVidu();
    const fullSessionId = 'wss://' + location.hostname + ':8443/' + this.sessionId + '?secret=' + this.secret + '&recorder=true';

    this.session = OV.initSession(fullSessionId);

    this.session.on('streamCreated', (event) => {
      this.numberOfVideos++;
      this.addRemoteStream(event.stream);
      this.session.subscribe(event.stream, '');
    });

    this.session.on('streamDestroyed', (event) => {
      this.numberOfVideos--;
      event.preventDefault();
      this.deleteRemoteStream(event.stream);
    });

    this.session.connect(null, (error) => {
      if (error) {
        console.error(error);
      }
    });
  }

  private addRemoteStream(stream: Stream): void {
    switch (true) {
      case (this.numberOfVideos <= 2):
        if (this.remoteStreams[0] == null) { this.remoteStreams[0] = []; }
        this.remoteStreams[0].push(stream);
        break;
      case (this.numberOfVideos <= 4):
        if (this.remoteStreams[1] == null) { this.remoteStreams[1] = []; }
        this.remoteStreams[1].push(stream);
        break;
      case (this.numberOfVideos <= 5):
        this.remoteStreams[0].push(stream);
        break;
      case (this.numberOfVideos <= 6):
        this.remoteStreams[1].push(stream);
        break;
      default:
        if (this.remoteStreams[2] == null) { this.remoteStreams[2] = []; }
        this.remoteStreams[2].push(stream);
        break;
    }
  }

  private deleteRemoteStream(stream: Stream): void {
    for (let i = 0; i < this.remoteStreams.length; i++) {
      const index = this.remoteStreams[i].indexOf(stream, 0);
      if (index > -1) {
        this.remoteStreams[i].splice(index, 1);
        this.reArrangeVideos();
        break;
      }
    }
  }

  private reArrangeVideos(): void {
    switch (true) {
      case (this.numberOfVideos === 1):
        if (this.remoteStreams[0].length === 0) {
          this.remoteStreams[0].push(this.remoteStreams[1].pop());
        }
        break;
      case (this.numberOfVideos === 2):
        if (this.remoteStreams[0].length === 1) {
          this.remoteStreams[0].push(this.remoteStreams[1].pop());
        }
        break;
      case (this.numberOfVideos === 3):
        if (this.remoteStreams[0].length === 1) {
          this.remoteStreams[0].push(this.remoteStreams[1].pop());
        }
        break;
      case (this.numberOfVideos === 4):
        if (this.remoteStreams[0].length === 3) {
          this.remoteStreams[1].unshift(this.remoteStreams[0].pop());
        }
        break;
      case (this.numberOfVideos === 5):
        if (this.remoteStreams[0].length === 2) {
          this.remoteStreams[0].push(this.remoteStreams[1].shift());
        }
        break;
    }
    this.remoteStreams = this.remoteStreams.filter((array) => { return array.length > 0 });

  }

  leaveSession() {
    if (this.session) { this.session.disconnect(); };
    this.remoteStreams = [];
    this.numberOfVideos = 0;
    this.session = null;
  }

}
