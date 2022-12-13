import {
  ApplicationRef,
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  ViewEncapsulation
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  OpenVidu,
  Session,
  StreamEvent,
  StreamManagerEvent,
  Subscriber
} from 'openvidu-browser';
import { OpenViduLayout, OpenViduLayoutOptions } from '../openvidu-layout';


@Component({
  selector: 'app-layout-base',
  templateUrl: './layout-base.component.html',
  styleUrls: ['./layout-base.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class LayoutBaseComponent implements OnInit, OnDestroy {

  openviduLayout: OpenViduLayout;
  sessionId: string;
  secret: string;
  onlyVideo = false;
  port: number;

  session: Session;
  subscribers: Subscriber[] = [];

  layout: any;
  resizeTimeout;
  numberOfScreenStreams = 0;

  layoutOptions: OpenViduLayoutOptions;

  constructor(private route: ActivatedRoute, private appRef: ApplicationRef) {
    this.route.params.subscribe(params => {
      this.sessionId = params.sessionId;
      this.secret = params.secret;
      if (params.onlyVideo != null) {
        this.onlyVideo = JSON.parse(params.onlyVideo);
      }
      if (params.port != null) {
        this.port = params.port;
      }
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
      if (!(this.onlyVideo && !event.stream.hasVideo)) {
        let changeFixedRatio = false;
        if (event.stream.typeOfVideo === 'SCREEN') {
          this.numberOfScreenStreams++;
          changeFixedRatio = true;
        }
        const subscriber: Subscriber = this.session.subscribe(
          event.stream,
          undefined,
          { subscribeToAudio: event.stream.hasAudio && !this.onlyVideo }
        );
        subscriber.on('streamPlaying', (e: StreamManagerEvent) => {
          const video: HTMLVideoElement = subscriber.videos[0].video;
          video.parentElement.parentElement.classList.remove('custom-class');
          this.updateLayout(changeFixedRatio);
        });
        this.addSubscriber(subscriber);
      }
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

    const p = !!this.port ? (':' + this.port) : (!!location.port ? (':' + location.port) : '');
    const protocol = location.protocol.includes('https') ? 'wss://' : 'ws://';
    const token = protocol + location.hostname + p + '?sessionId=' + this.sessionId + '&secret=' + this.secret + '&recorder=true';
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
