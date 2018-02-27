import {
  Component, Input, HostListener, ChangeDetectorRef, SimpleChanges, ElementRef, ViewChild,
  OnInit, OnDestroy, OnChanges
} from '@angular/core';
import { OpenVidu, Session, Subscriber, Publisher, Stream, Connection } from 'openvidu-browser';
import { MatDialog } from '@angular/material';
import { ExtensionDialogComponent } from './extension-dialog.component';
import { TestFeedService } from '../../services/test-feed.service';

declare var $: any;

export interface SessionConf {
  subscribeTo: boolean;
  publishTo: boolean;
  sendAudio: boolean;
  sendVideo: boolean;
  startSession: boolean;
}

export interface OpenViduEvent {
  name: string;
  content: string;
}

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

  @Input()
  sessionConf: SessionConf;

  // Session join data
  secureSession = false;
  clientData: string;
  sessionName: string;
  sessionIdInput: string;
  tokenInput: string;

  // Session options
  subscribeTo;
  publishTo;
  sendAudio;
  sendVideo;
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
  subscribers = {};

  // Session audio and video status
  audioMuted = false;
  videoMuted = false;
  unpublished = false;
  publisherChanged = false;
  audioIcon = 'mic';
  videoIcon = 'videocam';
  publishIcon = 'stop';

  sendAudioChange: boolean;
  sendVideoChange: boolean;

  events: OpenViduEvent[] = [];

  openviduError: any;

  constructor(
    private changeDetector: ChangeDetectorRef,
    private extensionDialog: MatDialog,
    private testFeedService: TestFeedService
  ) {
    this.generateSessionInfo();
  }

  ngOnInit() {
    this.subscribeTo = this.sessionConf.subscribeTo;
    this.publishTo = this.sessionConf.publishTo;
    this.sendAudio = this.sessionConf.sendAudio;
    this.sendVideo = this.sessionConf.sendVideo;

    if (!this.publishTo) {
      this.publishTo = !this.publishTo;
      this.togglePublishTo();
    }

    if (this.sessionConf.startSession) {
      this.joinSession();
    }
  }

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

    let sessionId;
    let token;

    if (this.secureSession) {
      sessionId = this.sessionIdInput;
      token = this.tokenInput;
    } else {
      sessionId = 'wss://'
        + this.removeHttps(this.openviduUrl)
        + this.sessionName + '?secret='
        + this.openviduSecret;
      token = null;
    }
    this.joinSessionShared(sessionId, token);
  }

  private joinSessionShared(sId, token): void {

    this.OV = new OpenVidu();

    this.session = this.OV.initSession(sId);

    this.addSessionEvents(this.session);

    this.session.connect(token, this.clientData, (error) => {
      if (!error) {
        if (this.publishTo) {

          this.audioMuted = !this.activeAudio;
          this.videoMuted = !this.activeVideo;
          this.unpublished = false;
          this.updateAudioIcon();
          this.updateVideoIcon();
          this.updatePublishIcon();

          this.sendAudioChange = this.sendAudio;
          this.sendVideoChange = this.sendVideo;

          this.publisher = this.OV.initPublisher(
            'local-vid-' + this.session.connection.connectionId,
            {
              audio: this.sendAudio,
              video: this.sendVideo,
              audioActive: this.activeAudio,
              videoActive: this.activeVideo,
              quality: 'MEDIUM',
              screen: this.optionsVideo === 'screen' ? true : false
            },
            (err) => {
              if (err) {
                console.warn(err);
                this.openviduError = err;
                if (err.name === 'SCREEN_EXTENSION_NOT_INSTALLED') {
                  this.extensionDialog.open(ExtensionDialogComponent, {
                    data: { url: err.message },
                    disableClose: true,
                    width: '250px'
                  });
                }
              }
            });

          this.addPublisherEvents(this.publisher);

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

  private toggleVideo() {
    this.publisher.publishVideo(this.videoMuted);
    this.videoMuted = !this.videoMuted;
    this.updateVideoIcon();
  }

  private updateAudioIcon() {
    this.audioMuted ? this.audioIcon = 'mic_off' : this.audioIcon = 'mic';
  }

  private updateVideoIcon() {
    this.videoMuted ? this.videoIcon = 'videocam_off' : this.videoIcon = 'videocam';
  }

  private updatePublishIcon() {
    this.unpublished ? this.publishIcon = 'play_arrow' : this.publishIcon = 'stop';
  }

  private appendUserData(videoElement, connection): void {
    const dataNode = document.createElement('div');
    dataNode.className = 'data-node';
    dataNode.id = 'data-' + this.session.connection.connectionId + '-' + connection.connectionId;
    dataNode.innerHTML = '<p class="name">' + connection.data + '</p>' +
      '<button id="sub-btn-' + this.session.connection.connectionId + '-' + connection.connectionId + '" class="sub-btn">' +
      '<mat-icon id="icon-' + this.session.connection.connectionId + '-' + connection.connectionId +
      '" aria-label="Subscribe or unsubscribe" class="mat-icon material-icons" role="img"' +
      'aria-hidden="true">notifications</mat-icon></button>';
    videoElement.parentNode.insertBefore(dataNode, videoElement.nextSibling);
    document.getElementById('sub-btn-' + this.session.connection.connectionId + '-' + connection.connectionId).addEventListener('click',
      this.subUnsubFromSubscriber.bind(this, connection.connectionId));
  }

  private removeUserData(connectionId: string): void {
    $('#remote-vid-' + this.session.connection.connectionId)
      .find('#data-' + this.session.connection.connectionId + '-' + connectionId).remove();
  }

  private updateEventList(event: string, content: string) {
    this.events.push({ name: event, content: content });
    this.testFeedService.pushNewEvent(this.sessionName, this.session.connection.connectionId, event, content);
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

  sendMessage(): void {
    this.session.signal({
      data: 'Test message',
      to: [],
      type: 'chat'
    });
  }

  publishUnpublish(): void {
    if (this.unpublished) {
      this.session.publish(this.publisher);
    } else {
      this.session.unpublish(this.publisher);
    }
    this.unpublished = !this.unpublished;
    this.updatePublishIcon();
  }

  changePublisher() {

    if (!this.unpublished) {
      this.session.unpublish(this.publisher);
    }

    let screenChange;
    if (!this.publisherChanged) {
      if (this.sendAudio && !this.sendVideo) {
        this.sendAudioChange = false;
        this.sendVideoChange = true;
        screenChange = false;
      } else if (!this.sendAudio && this.sendVideo) {
        this.sendAudioChange = true;
        this.sendVideoChange = false;
      } else if (this.sendAudio && this.sendVideo && this.optionsVideo === 'video') {
        this.sendAudioChange = false;
        this.sendVideoChange = true;
        screenChange = true;
      } else if (this.sendAudio && this.sendVideo && this.optionsVideo === 'screen') {
        this.sendAudioChange = false;
        this.sendVideoChange = true;
        screenChange = false;
      }
    } else {
      this.sendAudioChange = this.sendAudio;
      this.sendVideoChange = this.sendVideo;
      screenChange = this.optionsVideo === 'screen' ? true : false;
    }

    this.audioMuted = false;
    this.videoMuted = false;
    this.unpublished = false;
    this.updateAudioIcon();
    this.updateVideoIcon();
    this.updatePublishIcon();

    this.publisher = this.OV.initPublisher(
      'local-vid-' + this.session.connection.connectionId,
      {
        audio: this.sendAudioChange,
        video: this.sendVideoChange,
        audioActive: (!this.publisherChanged) ? true : !this.audioMuted,
        videoActive: (!this.publisherChanged) ? true : !this.videoMuted,
        quality: 'MEDIUM',
        screen: screenChange
      },
      (err) => {
        if (err) {
          console.warn(err);
          this.openviduError = err;
          if (err.name === 'SCREEN_EXTENSION_NOT_INSTALLED') {
            this.extensionDialog.open(ExtensionDialogComponent, {
              data: { url: err.message },
              disableClose: true,
              width: '250px'
            });
          }
        }
      });
    this.addPublisherEvents(this.publisher);
    this.session.publish(this.publisher);

    this.publisherChanged = !this.publisherChanged;
  }

  subUnsubFromSubscriber(connectionId: string) {
    let subscriber: Subscriber = this.subscribers[connectionId].subscriber;
    if (this.subscribers[connectionId].subbed) {
      this.session.unsubscribe(subscriber);
      document.getElementById('data-' + this.session.connection.connectionId + '-' + connectionId).style.marginLeft = '0';
      document.getElementById('icon-' + this.session.connection.connectionId + '-' + connectionId).innerHTML = 'notifications_off';
    } else {
      subscriber = this.session.subscribe(subscriber.stream, 'remote-vid-' + this.session.connection.connectionId);
      this.subscribers[connectionId].subscriber = subscriber;
      subscriber.on('videoElementCreated', (e) => {
        if (!subscriber.stream.getRecvVideo()) {
          $(e.element).css({ 'background-color': '#4d4d4d' });
          $(e.element).attr('poster', 'assets/images/volume.png');
        }
        this.removeUserData(connectionId);
        this.appendUserData(e.element, subscriber.stream.connection);
        this.updateEventList('videoElementCreated', e.element.id);
      });
      subscriber.on('videoPlaying', (e) => {
        this.updateEventList('videoPlaying', e.element.id);
      });
    }
    this.subscribers[connectionId].subbed = !this.subscribers[connectionId].subbed;
  }

  addSessionEvents(session: Session) {
    session.on('streamCreated', (event) => {

      this.changeDetector.detectChanges();

      if (this.subscribeTo) {
        const subscriber: Subscriber = session.subscribe(event.stream, 'remote-vid-' + session.connection.connectionId);
        subscriber.on('videoElementCreated', (e) => {
          if (!event.stream.getRecvVideo()) {
            $(e.element).css({ 'background-color': '#4d4d4d' });
            $(e.element).attr('poster', 'assets/images/volume.png');
          }
          this.appendUserData(e.element, subscriber.stream.connection);
          this.updateEventList('videoElementCreated', e.element.id);
        });
        subscriber.on('videoPlaying', (e) => {
          this.updateEventList('videoPlaying', e.element.id);
        });
        subscriber.on('videoElementDestroyed', (e) => {
          this.updateEventList('videoElementDestroyed', '(Subscriber)');
        });
        this.subscribers[subscriber.stream.connection.connectionId] = { 'subscriber': subscriber, 'subbed': true };
      }
      this.updateEventList('streamCreated', event.stream.connection.connectionId);
    });

    session.on('streamDestroyed', (event) => {
      this.removeUserData(event.stream.connection.connectionId);
      this.updateEventList('streamDestroyed', event.stream.connection.connectionId);
    });
    session.on('connectionCreated', (event) => {
      this.updateEventList('connectionCreated', event.connection.connectionId);
    });
    session.on('connectionDestroyed', (event) => {
      this.updateEventList('connectionDestroyed', event.connection.connectionId);
    });
    session.on('sessionDisconnected', (event) => {
      this.updateEventList('sessionDisconnected', 'No data');
    });
    session.on('signal', (event) => {
      this.updateEventList('signal', event.from.connectionId + '-' + event.data);
    });

    /*session.on('publisherStartSpeaking', (event) => {
      console.log('Publisher start speaking');
      console.log(event);
    });

    session.on('publisherStopSpeaking', (event) => {
      console.log('Publisher stop speaking');
      console.log(event);
    });*/
  }

  addPublisherEvents(publisher: Publisher) {
    publisher.on('videoElementCreated', (event) => {
      if (this.publishTo &&
        (!this.sendVideoChange ||
          this.sendVideoChange &&
          !(this.optionsVideo !== 'screen') &&
          this.openviduError &&
          this.openviduError.name === 'NO_VIDEO_DEVICE')) {
        $(event.element).css({ 'background-color': '#4d4d4d' });
        $(event.element).attr('poster', 'assets/images/volume.png');
      }
      this.updateEventList('videoElementCreated', event.element.id);
    });

    publisher.on('accessAllowed', (e) => {
      this.updateEventList('accessAllowed', '');
    });

    publisher.on('accessDenied', (e) => {
      this.updateEventList('accessDenied', '');
    });


    publisher.on('videoPlaying', (e) => {
      this.updateEventList('videoPlaying', e.element.id);
    });

    publisher.on('remoteVideoPlaying', (e) => {
      this.updateEventList('remoteVideoPlaying', e.element.id);
    });

    publisher.on('streamCreated', (e) => {
      this.updateEventList('streamCreated', e.stream.connection.connectionId);
    });

    publisher.on('streamDestroyed', (e) => {
      this.updateEventList('streamDestroyed', e.stream.connection.connectionId);
    });

    publisher.on('videoElementDestroyed', (e) => {
      this.updateEventList('videoElementDestroyed', '(Publisher)');
    });
  }

}
