import { Component, OnInit, OnDestroy, HostListener, ViewEncapsulation, ApplicationRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { OpenVidu, Session, Stream, Subscriber, StreamEvent, StreamManagerEvent } from 'openvidu-browser';

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
  subscribers: Subscriber[] = [];

  layout: any;
  resizeTimeout;
  numberOfScreenStreams = 0;

  layoutOptions = {
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
  };

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
    this.session = OV.initSession();

    this.session.on('streamCreated', (event: StreamEvent) => {
      let changeFixedRatio = false;
      if (event.stream.typeOfVideo === 'SCREEN') {
        this.numberOfScreenStreams++;
        changeFixedRatio = true;
      }
      const subscriber: Subscriber = this.session.subscribe(event.stream, undefined);
      subscriber.on('streamPlaying', (e: StreamManagerEvent) => {
        const video: HTMLVideoElement = subscriber.videos[0].video;
        video.parentElement.parentElement.classList.remove('custom-class');
        this.updateLayout(changeFixedRatio);
      });
      this.addSubscriber(subscriber);
    });

    this.session.on('streamDestroyed', (event: StreamEvent) => {
      let changeFixedRatio = false;
      if (event.stream.typeOfVideo === 'SCREEN') {
        this.numberOfScreenStreams--;
        changeFixedRatio = true;
      }
      this.deleteSubscriber(<Subscriber>event.stream.streamManager);
      this.updateLayout(changeFixedRatio);
    });

    const port = !!location.port ? (':' + location.port) : '';
    const token = 'wss://' + location.hostname + port + '?sessionId=' + this.sessionId + '&secret=' + this.secret + '&recorder=true';
    this.session.connect(token)
      .catch(error => {
        console.error(error);
      })

    this.openviduLayout = new OpenViduLayout();
    this.openviduLayout.initLayoutContainer(document.getElementById('layout'), this.layoutOptions);
  }

  private addSubscriber(subscriber: Subscriber): void {
    this.subscribers.push(subscriber);
    this.appRef.tick();
  }

  private deleteSubscriber(subscriber: Subscriber): void {
    let index = -1;
    for (let i = 0; i < this.subscribers.length; i++) {
      if (this.subscribers[i] === subscriber) {
        index = i;
        break;
      }
    }
    if (index > -1) {
      this.subscribers.splice(index, 1);
    }
    this.appRef.tick();
  }

  leaveSession() {
    if (this.session) { this.session.disconnect(); };
    this.subscribers = [];
    this.session = null;
  }

  updateLayout(changeFixedRatio: boolean) {
    if (changeFixedRatio) {
      this.layoutOptions.fixedRatio = this.numberOfScreenStreams > 0;
      this.openviduLayout.setLayoutOptions(this.layoutOptions);
    }
    this.openviduLayout.updateLayout();
  }

}
