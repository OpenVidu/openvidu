import { Component, OnInit, OnDestroy, HostListener, ViewEncapsulation, ApplicationRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { OpenVidu, Session, Stream, Subscriber } from 'openvidu-browser';

import { OpenViduLayout } from '../openvidu-layout';

@Component({
  selector: 'app-layout-best-fit',
  templateUrl: './layout-best-fit.component.html',
  styleUrls: ['./layout-best-fit.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class LayoutBestFitComponent implements OnInit, OnDestroy {

  openviduLayout: OpenViduLayout;
  sessionId: string;
  secret: string;

  session: Session;
  streams: Stream[] = [];

  layout: any;
  resizeTimeout;

  constructor(private route: ActivatedRoute, private appRef: ApplicationRef) {
    this.route.params.subscribe(params => {
      this.sessionId = params.sessionId;
      this.secret = params.secret;
    });
  }

  @HostListener('window:beforeunload')
  beforeunloadHandler() {
    this.leaveSession();
  }

  @HostListener('window:resize', ['$event'])
  sizeChange(event) {
    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
      this.openviduLayout.updateLayout();
    }, 20);
  }

  ngOnDestroy() {
    this.leaveSession();
  }

  ngOnInit() {
    const OV = new OpenVidu();
    const fullSessionId = 'wss://' + location.hostname + ':8443/' + this.sessionId + '?secret=' + this.secret + '&recorder=true';

    this.session = OV.initSession(fullSessionId);

    this.session.on('streamCreated', (event) => {
      const subscriber: Subscriber = this.session.subscribe(event.stream, '');
      this.addRemoteStream(event.stream);
    });

    this.session.on('streamDestroyed', (event) => {
      event.preventDefault();
      this.deleteRemoteStream(event.stream);
      this.openviduLayout.updateLayout();
    });

    this.session.connect(null, (error) => {
      if (error) {
        console.error(error);
      }
    });

    this.openviduLayout = new OpenViduLayout();
    this.openviduLayout.initLayoutContainer(document.getElementById('layout'), {
      maxRatio: 3 / 2,      // The narrowest ratio that will be used (default 2x3)
      minRatio: 9 / 16,     // The widest ratio that will be used (default 16x9)
      fixedRatio: false,    /* If this is true then the aspect ratio of the video is maintained
      and minRatio and maxRatio are ignored (default false) */
      bigClass: 'OV_big',   // The class to add to elements that should be sized bigger
      bigPercentage: 0.8,   // The maximum percentage of space the big ones should take up
      bigFixedRatio: false, // fixedRatio for the big ones
      bigMaxRatio: 3 / 2,   // The narrowest ratio to use for the big elements (default 2x3)
      bigMinRatio: 9 / 16,  // The widest ratio to use for the big elements (default 16x9)
      bigFirst: true,       // Whether to place the big one in the top left (true) or bottom right
      animate: true         // Whether you want to animate the transitions
    });
  }

  private addRemoteStream(stream: Stream): void {
    this.streams.push(stream);
    this.appRef.tick();
  }

  private deleteRemoteStream(stream: Stream): void {
    let index = -1;
    for (let i = 0; i < this.streams.length; i++) {
      if (this.streams[i].streamId === stream.streamId) {
        index = i;
        break;
      }
    }

    if (index > -1) {
      this.streams.splice(index, 1);
    }
    this.appRef.tick();
  }

  leaveSession() {
    if (this.session) { this.session.disconnect(); };
    this.streams = [];
    this.session = null;
  }

  onVideoPlaying(event) {
    const video: HTMLVideoElement = event.target;
    video.parentElement.parentElement.classList.remove('custom-class');
    this.openviduLayout.updateLayout();
  }

}
