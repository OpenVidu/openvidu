import {
  Component, Input, HostListener, ChangeDetectorRef, SimpleChanges, ElementRef, ViewChild,
  OnInit, OnDestroy, OnChanges
} from '@angular/core';
import { OpenVidu, Session, Subscriber, Publisher, Stream } from 'openvidu-browser';

declare var $: any;

@Component({
  selector: 'app-openvidu-instance',
  templateUrl: './openvidu-instance.component.html',
  styleUrls: ['./openvidu-instance.component.css']
})
export class OpenviduInstanceComponent implements OnInit, OnChanges, OnDestroy {

  @Input()
  openviduUrl: string;

  @Input()
  openviduSecret: string;

  // Session join data
  clientData: string;
  sessionName: string;

  // Session options
  subscribeTo = true;
  publishTo = true;
  sendAudio = true;
  sendVideo = true;
  activeAudio = true;
  activeVideo = true;
  sendVideoRadio = true;
  subscribeToRemote = false;
  optionsVideo = 'video';

  // Form 'check' and 'disable' attributes
  checkSubscribeTo = true;
  checkPublishTo = true;
  checkSendAudio = true;
  checkSendVideo = true;
  checkActiveAudio = true;
  checkActiveVideo = true;
  checkRadioVideo = true;
  checkRadioScreen = false;
  disableSubscribeTo = false;
  disablePublishTo = false;
  disableSendAudio = false;
  disableSendVideo = false;
  disableActiveAudio = false;
  disableActiveVideo = false;
  disableRadioButtons = false;

  // OpenVidu objects
  OV: OpenVidu;
  session: Session;
  publisher: Publisher;

  // Session audio and video status
  audioMuted = false;
  videoMuted = false;
  audioIcon = 'mic';
  videoIcon = 'videocam';

  events: string[] = [];

  constructor(private changeDetector: ChangeDetectorRef) {
    this.generateSessionInfo();
  }

  ngOnInit() { }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.openviduSecret) {
      this.openviduSecret = changes.openviduSecret.currentValue;
    }
    if (changes.openviduUrl) {
      this.openviduUrl = changes.openviduUrl.currentValue;
    }
  }

  ngOnDestroy() {
    this.leaveSession();
  }

  @HostListener('window:beforeunload')
  beforeunloadHandler() {
    this.leaveSession();
  }

  private generateSessionInfo(): void {
    this.sessionName = 'TestSession';
    this.clientData = 'TestClient';
  }

  private removeHttps = input => input.replace(/^https?:\/\//, '');

  private joinSession(): void {

    if (this.session) {
      this.leaveSession();
    }

    const OV: OpenVidu = new OpenVidu();

    this.session = OV.initSession('wss://'
      + this.removeHttps(this.openviduUrl)
      + '/'
      + this.sessionName + '?secret='
      + this.openviduSecret);

    this.session.on('streamCreated', (event) => {

      this.changeDetector.detectChanges();

      if (this.subscribeTo) {
        const subscriber: Subscriber = this.session.subscribe(event.stream, 'remote-vid-' + this.session.connection.connectionId);
        subscriber.on('videoElementCreated', (e) => {
          this.appendUserData(e.element, subscriber.stream.connection.data, subscriber.stream.connection);
          this.updateEventList('videoElementCreated');
        });
        subscriber.on('videoPlaying', (e) => {
          this.updateEventList('videoPlaying');
        });
      }
      this.updateEventList('streamCreated');
    });

    this.session.on('streamDestroyed', (event) => {
      this.removeUserData(event.stream.connection);
      this.updateEventList('streamDestroyed');
    });

    this.session.on('connectionCreated', (event) => {
      this.updateEventList('connectionCreated');
    });
    this.session.on('connetionDestroyed', (event) => {
      this.updateEventList('connetionDestroyed');
    });
    this.session.on('sessionDisconnected', (event) => {
      this.updateEventList('sessionDisconnected');
    });

    this.session.connect(null, this.clientData, (error) => {
      if (!error) {
        if (this.publishTo) {

          this.audioMuted = !this.activeAudio;
          this.videoMuted = !this.activeVideo;
          this.updateAudioIcon();
          this.updateVideoIcon();

          this.publisher = OV.initPublisher('local-vid-' + this.session.connection.connectionId, {
            audio: this.sendAudio,
            video: this.sendVideo,
            activeAudio: this.activeAudio,
            activeVideo: this.activeVideo,
            quality: 'MEDIUM'
          });

          this.publisher.on('videoElementCreated', (event) => {
            this.updateEventList('videoElementCreated');
          });

          this.publisher.on('videoPlaying', (e) => {
            this.updateEventList('videoPlaying');
          });

          this.publisher.on('remoteVideoPlaying', (e) => {
            this.updateEventList('remoteVideoPlaying');
          });

          if (this.subscribeToRemote) {
            this.publisher.subscribeToRemote();
          }

          this.session.publish(this.publisher);

        }
      } else {
        console.log('There was an error connecting to the session:', error.code, error.message);
      }
    });
  }


  private leaveSession(): void {
    if (this.session) {
      this.session.disconnect();
    }
    this.session = null;
    this.OV = null;
  }

  private toggleAudio() {
    this.publisher.publishAudio(this.audioMuted);
    this.audioMuted = !this.audioMuted;
    this.updateAudioIcon();
  }

  private updateAudioIcon() {
    this.audioMuted ? this.audioIcon = 'mic_off' : this.audioIcon = 'mic';
  }

  private toggleVideo() {
    this.publisher.publishVideo(this.videoMuted);
    this.videoMuted = !this.videoMuted;
    this.updateVideoIcon();
  }

  private updateVideoIcon() {
    this.videoMuted ? this.videoIcon = 'videocam_off' : this.videoIcon = 'videocam';
  }

  private appendUserData(videoElement, data, connection): void {
    const dataNode = document.createElement('div');
    dataNode.className = 'data-node';
    dataNode.id = 'data-' + (connection ? connection.connectionId : data);
    dataNode.innerHTML = '<p>' + data + '</p>';
    videoElement.parentNode.insertBefore(dataNode, videoElement.nextSibling);
  }

  private removeUserData(connection): void {
    $('#remote-vid-' + this.session.connection.connectionId).find('#data-' + connection.connectionId).remove();
  }

  private updateEventList(event: string) {
    this.events.push(event);
  }

  toggleSubscribeTo(): void {
    this.subscribeTo = !this.subscribeTo;
  }

  togglePublishTo(): void {
    this.publishTo = !this.publishTo;

    this.sendAudio = this.publishTo;
    this.sendVideo = this.publishTo;
    this.activeAudio = this.publishTo;
    this.activeVideo = this.publishTo;

    this.checkPublishTo = this.publishTo;
    this.checkSendAudio = this.publishTo;
    this.checkSendVideo = this.publishTo;
    this.checkActiveAudio = this.publishTo;
    this.checkActiveVideo = this.publishTo;

    if (this.publishTo) {
      this.checkRadioVideo = true;
      this.optionsVideo = 'video';
    } else {
      this.checkRadioVideo = false;
      this.optionsVideo = '';
    }

    this.disableSendAudio = !this.publishTo;
    this.disableSendVideo = !this.publishTo;
    this.disableActiveAudio = !this.publishTo;
    this.disableActiveVideo = !this.publishTo;
    this.disableRadioButtons = !this.publishTo;

    this.subscribeToRemote = false;
  }

  toggleSendAudio(): void {
    this.sendAudio = !this.sendAudio;

    this.activeAudio = this.sendAudio;
    this.checkActiveAudio = this.sendAudio;
    this.disableActiveAudio = !this.sendAudio;

    if (!this.sendAudio && !this.sendVideo && this.publishTo) {
      this.togglePublishTo();
    }
  }

  toggleSendVideo(): void {
    this.sendVideo = !this.sendVideo;

    this.activeVideo = this.sendVideo;

    this.checkActiveVideo = this.sendVideo;
    this.checkRadioScreen = false;
    if (this.sendVideo) {
      this.checkRadioVideo = true;
      this.optionsVideo = 'video';
    } else {
      this.checkRadioVideo = false;
      this.optionsVideo = '';
    }

    this.disableActiveVideo = !this.sendVideo;
    this.disableRadioButtons = !this.sendVideo;

    if (!this.sendAudio && !this.sendVideo && this.publishTo) {
      this.togglePublishTo();
    }
  }

  toggleActiveAudio(): void {
    this.activeAudio = !this.activeAudio;
  }

  toggleActiveVideo(): void {
    this.activeVideo = !this.activeVideo;
  }

}
