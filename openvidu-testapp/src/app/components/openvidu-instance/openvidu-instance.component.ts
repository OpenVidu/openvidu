import {
  Component, Input, HostListener, ChangeDetectorRef, SimpleChanges, ElementRef, ViewChild,
  OnInit, OnDestroy, OnChanges
} from '@angular/core';
import { Subscription } from 'rxjs/Subscription';

import { OpenVidu, Session, Subscriber, Publisher, Stream, Connection, LocalRecorder } from 'openvidu-browser';
import { MatDialog, MatDialogRef } from '@angular/material';
import { ExtensionDialogComponent } from './extension-dialog.component';
import { LocalRecordingDialogComponent } from '../test-sessions/local-recording-dialog.component';
import { TestFeedService } from '../../services/test-feed.service';
import { MuteSubscribersService } from '../../services/mute-subscribers.service';

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

  private publisherRecorder: LocalRecorder;
  private publisherRecording = false;
  private publisherPaused = false;
  private muteSubscribersSubscription: Subscription;

  constructor(
    private changeDetector: ChangeDetectorRef,
    private extensionDialog: MatDialog,
    private recordDialog: MatDialog,
    private testFeedService: TestFeedService,
    private muteSubscribersService: MuteSubscribersService,
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

    this.muteSubscribersSubscription = this.muteSubscribersService.mutedEvent$.subscribe(
      muteOrUnmute => {
        Object.keys(this.subscribers).forEach((key) => {
          this.subscribers[key].videoElement.muted = muteOrUnmute;
        });
      });
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
    if (!!this.muteSubscribersSubscription) { this.muteSubscribersSubscription.unsubscribe(); }
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

        this.changeDetector.detectChanges();

        if (this.publishTo) {

          this.audioMuted = !this.activeAudio;
          this.videoMuted = !this.activeVideo;
          this.unpublished = false;
          this.updateAudioIcon();
          this.updateVideoIcon();
          this.updatePublishIcon();

          this.sendAudioChange = this.sendAudio;
          this.sendVideoChange = this.sendVideo;

          // this.asyncInitPublisher();
          this.syncInitPublisher();

        }
      } else {
        console.log('There was an error connecting to the session:', error.code, error.message);
      }
    });
  }


  private leaveSession(): void {
    if (!!this.publisherRecorder) {
      this.restartPublisherRecord();
    }
    Object.keys(this.subscribers).forEach((key) => {
      if (!!this.subscribers[key].recorder) {
        this.restartSubscriberRecord(key);
      }
    });
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

  private appendSubscriberData(videoElement: HTMLVideoElement, connection: Connection): void {
    const dataNode = document.createElement('div');
    dataNode.className = 'data-node';
    dataNode.id = 'data-' + this.session.connection.connectionId + '-' + connection.connectionId;
    dataNode.innerHTML = '<p class="name">' + connection.data + '</p>' +
      '<button id="sub-btn-' + this.session.connection.connectionId + '-' + connection.connectionId +
      '" class="sub-btn" title="Subscribe/Unsubscribe"><mat-icon id="icon-' + this.session.connection.connectionId +
      '-' + connection.connectionId + '" aria-label="Subscribe or unsubscribe" class="mat-icon material-icons" role="img"' +
      'aria-hidden="true">notifications</mat-icon></button>' +
      '<button id="record-btn-' + this.session.connection.connectionId + '-' + connection.connectionId +
      '" class="sub-btn rec-btn" title="Record"><mat-icon id="record-icon-' +
      this.session.connection.connectionId + '-' + connection.connectionId +
      '" aria-label="Start/Stop recording" class="mat-icon material-icons" role="img"' +
      'aria-hidden="true">fiber_manual_record</mat-icon></button>' +
      '<button style="display:none" id="pause-btn-' + this.session.connection.connectionId + '-' + connection.connectionId +
      '" class="sub-btn rec-btn" title="Pause/Resume"><mat-icon id="pause-icon-' +
      this.session.connection.connectionId + '-' + connection.connectionId +
      '" aria-label="Pause/Resume recording" class="mat-icon material-icons" role="img"' +
      'aria-hidden="true">pause</mat-icon></button>';
    videoElement.parentNode.insertBefore(dataNode, videoElement.nextSibling);
    document.getElementById('sub-btn-' + this.session.connection.connectionId + '-' + connection.connectionId).addEventListener('click',
      this.subUnsubFromSubscriber.bind(this, connection.connectionId));
    document.getElementById('record-btn-' + this.session.connection.connectionId + '-' + connection.connectionId).addEventListener('click',
      this.recordSubscriber.bind(this, connection.connectionId));
    document.getElementById('pause-btn-' + this.session.connection.connectionId + '-' + connection.connectionId).addEventListener('click',
      this.pauseSubscriber.bind(this, connection.connectionId));
  }

  private appendPublisherData(videoElement: HTMLVideoElement): void {
    const dataNode = document.createElement('div');
    dataNode.className = 'data-node';
    dataNode.id = 'data-' + this.session.connection.connectionId + '-' + this.session.connection.connectionId;
    dataNode.innerHTML =
      '<button id="local-record-btn-' + this.session.connection.connectionId +
      '" class="sub-btn rec-btn publisher-rec-btn" title="Record"><mat-icon id="local-record-icon-' + this.session.connection.connectionId +
      '" aria-label="Start/Stop local recording" class="mat-icon material-icons" role="img" aria-hidden="true">' +
      'fiber_manual_record</mat-icon></button>' +
      '<button style="display:none" id="local-pause-btn-' + this.session.connection.connectionId +
      '" class="sub-btn rec-btn publisher-rec-btn" title="Pause/Resume">' +
      '<mat-icon id="local-pause-icon-' + this.session.connection.connectionId +
      '" aria-label="Pause/Resume local recording" class="mat-icon material-icons" role="img" aria-hidden="true">' +
      'pause</mat-icon></button>';
    videoElement.parentNode.insertBefore(dataNode, videoElement.nextSibling);
    document.getElementById('local-record-btn-' + this.session.connection.connectionId).addEventListener('click',
      this.recordPublisher.bind(this));
    document.getElementById('local-pause-btn-' + this.session.connection.connectionId).addEventListener('click',
      this.pausePublisher.bind(this));
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
    },
      error => {
        if (error) {
          console.error(error);
        } else {
          console.log('Message succesfully sent');
        }
      });
      // this.initGrayVideo();
  }

  recordPublisher(): void {
    if (!this.publisherRecording) {
      this.publisherRecorder = this.OV.initLocalRecorder(this.publisher.stream);
      this.publisherRecorder.record();
      this.publisherRecording = true;
      document.getElementById('local-record-icon-' + this.session.connection.connectionId).innerHTML = 'stop';
      document.getElementById('local-pause-btn-' + this.session.connection.connectionId).style.display = 'block';
    } else {
      this.publisherRecorder.stop()
        .then(() => {
          let dialogRef: MatDialogRef<LocalRecordingDialogComponent>;
          dialogRef = this.recordDialog.open(LocalRecordingDialogComponent, {
            disableClose: true,
            data: {
              recorder: this.publisherRecorder
            }
          });
          dialogRef.componentInstance.myReference = dialogRef;

          dialogRef.afterOpen().subscribe(() => {
            this.afterOpenPreview(this.publisherRecorder);
          });
          dialogRef.afterClosed().subscribe(() => {
            this.afterClosePreview();
          });
        })
        .catch((error) => {
          console.error('Error stopping LocalRecorder: ' + error);
        });
    }
  }

  pausePublisher(): void {
    if (!this.publisherPaused) {
      this.publisherRecorder.pause();
      document.getElementById('local-pause-icon-' + this.session.connection.connectionId).innerHTML = 'play_arrow';
    } else {
      this.publisherRecorder.resume();
      document.getElementById('local-pause-icon-' + this.session.connection.connectionId).innerHTML = 'pause';
    }
    this.publisherPaused = !this.publisherPaused;
  }

  recordSubscriber(connectionId: string): void {
    const subscriber: Subscriber = this.subscribers[connectionId].subscriber;
    const recording = this.subscribers[connectionId].recording;
    if (!recording) {
      this.subscribers[connectionId].recorder = this.OV.initLocalRecorder(subscriber.stream);
      this.subscribers[connectionId].recorder.record();
      this.subscribers[connectionId].recording = true;
      document.getElementById('record-icon-' + this.session.connection.connectionId + '-' + connectionId).innerHTML = 'stop';
      document.getElementById('pause-btn-' + this.session.connection.connectionId + '-' + connectionId).style.display = 'block';
    } else {
      this.subscribers[connectionId].recorder.stop()
        .then(() => {
          let dialogRef: MatDialogRef<LocalRecordingDialogComponent>;
          dialogRef = this.recordDialog.open(LocalRecordingDialogComponent, {
            disableClose: true,
            data: {
              recorder: this.subscribers[connectionId].recorder
            }
          });
          dialogRef.componentInstance.myReference = dialogRef;

          dialogRef.afterOpen().subscribe(() => {
            this.afterOpenPreview(this.subscribers[connectionId].recorder);
          });
          dialogRef.afterClosed().subscribe(() => {
            this.afterClosePreview(connectionId);
          });
        })
        .catch((error) => {
          console.error('Error stopping LocalRecorder: ' + error);
        });
    }
  }

  pauseSubscriber(connectionId: string): void {
    const subscriber: Subscriber = this.subscribers[connectionId].subscriber;
    const subscriberPaused = this.subscribers[connectionId].paused;
    if (!subscriberPaused) {
      this.subscribers[connectionId].recorder.pause();
      document.getElementById('pause-icon-' + this.session.connection.connectionId + '-' + connectionId).innerHTML = 'play_arrow';
    } else {
      this.subscribers[connectionId].recorder.resume();
      document.getElementById('pause-icon-' + this.session.connection.connectionId + '-' + connectionId).innerHTML = 'pause';
    }
    this.subscribers[connectionId].paused = !this.subscribers[connectionId].paused;
  }

  publishUnpublish(): void {
    if (this.unpublished) {
      this.session.publish(this.publisher)
        .then(() => {
          console.log(this.publisher);
        })
        .catch(e => {
          console.error(e);
        });
    } else {
      this.session.unpublish(this.publisher);
      this.removeUserData(this.session.connection.connectionId);
      this.restartPublisherRecord();
    }
    this.unpublished = !this.unpublished;
    this.updatePublishIcon();
  }

  changePublisher() {
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

    const otherPublisher = this.OV.initPublisher(
      'local-vid-' + this.session.connection.connectionId,
      {
        audioSource: this.sendAudioChange ? undefined : false,
        videoSource: this.sendVideoChange ? (screenChange ? 'screen' : undefined) : false,
        publishAudio: (!this.publisherChanged) ? true : !this.audioMuted,
        publishVideo: (!this.publisherChanged) ? true : !this.videoMuted,
        resolution: '640x480',
        frameRate: 30,
        insertMode: 'APPEND'
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
    this.addPublisherEvents(otherPublisher);

    otherPublisher.once('accessAllowed', () => {
      if (!this.unpublished) {
        this.session.unpublish(this.publisher);
        this.publisher = otherPublisher;
        this.removeUserData(this.session.connection.connectionId);
        this.restartPublisherRecord();
      }
      this.session.publish(otherPublisher);
    });

    this.publisherChanged = !this.publisherChanged;
  }

  subUnsubFromSubscriber(connectionId: string) {
    let subscriber: Subscriber = this.subscribers[connectionId].subscriber;
    if (this.subscribers[connectionId].subbed) {
      this.session.unsubscribe(subscriber);
      this.restartSubscriberRecord(connectionId);
      document.getElementById('data-' + this.session.connection.connectionId + '-' + connectionId).style.marginLeft = '0';
      document.getElementById('icon-' + this.session.connection.connectionId + '-' + connectionId).innerHTML = 'notifications_off';
      document.getElementById('record-btn-' + this.session.connection.connectionId + '-' + connectionId).remove();
      document.getElementById('pause-btn-' + this.session.connection.connectionId + '-' + connectionId).remove();
    } else {


      this.session.subscribeAsync(subscriber.stream, 'remote-vid-' + this.session.connection.connectionId)
        .then(sub => {
          subscriber = sub;
          this.subscribers[connectionId].subscriber = subscriber;
          subscriber.on('videoElementCreated', (e) => {
            if (!subscriber.stream.hasVideo) {
              $(e.element).css({ 'background-color': '#4d4d4d' });
              $(e.element).attr('poster', 'assets/images/volume.png');
            }
            this.subscribers[connectionId].videoElement = e.element;
            this.updateEventList('videoElementCreated', e.element.id);
          });
          subscriber.on('videoPlaying', (e) => {
            this.removeUserData(connectionId);
            this.appendSubscriberData(e.element, subscriber.stream.connection);
            this.updateEventList('videoPlaying', e.element.id);
          });
        })
        .catch(err => {
          console.error(err);
        });


      /*subscriber = this.session.subscribe(subscriber.stream, 'remote-vid-' + this.session.connection.connectionId);
      this.subscribers[connectionId].subscriber = subscriber;
      subscriber.on('videoElementCreated', (e) => {
        if (!subscriber.stream.hasVideo) {
          $(e.element).css({ 'background-color': '#4d4d4d' });
          $(e.element).attr('poster', 'assets/images/volume.png');
        }
        this.subscribers[connectionId].videoElement = e.element;
        this.updateEventList('videoElementCreated', e.element.id);
      });
      subscriber.on('videoPlaying', (e) => {
        this.removeUserData(connectionId);
        this.appendSubscriberData(e.element, subscriber.stream.connection);
        this.updateEventList('videoPlaying', e.element.id);
      });*/


    }
    this.subscribers[connectionId].subbed = !this.subscribers[connectionId].subbed;
  }

  addSessionEvents(session: Session) {
    session.on('streamCreated', (event) => {

      this.changeDetector.detectChanges();

      if (this.subscribeTo) {
        // this.syncSubscribe(session, event);
        this.asyncSubscribe(session, event);
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
      if (event.reason === 'networkDisconnect') {
        this.session = null;
        this.OV = null;
      }
    });
    session.on('signal', (event) => {
      this.updateEventList('signal', event.from.connectionId + '-' + event.data);
    });

    session.on('recordingStarted', (event) => {
      this.updateEventList('recordingStarted', event.id);
    });

    session.on('recordingStopped', (event) => {
      this.updateEventList('recordingStopped', event.id);
    });

    /*session.on('publisherStartSpeaking', (event) => {
      console.log('Publisher start speaking');
    });

    session.on('publisherStopSpeaking', (event) => {
      console.log('Publisher stop speaking');
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

    publisher.on('accessDialogOpened', (e) => {
      this.updateEventList('accessDialogOpened', '');
    });

    publisher.on('accessDialogClosed', (e) => {
      this.updateEventList('accessDialogClosed', '');
    });

    publisher.on('videoPlaying', (e) => {
      this.appendPublisherData(e.element);
      this.updateEventList('videoPlaying', e.element.id);
    });

    publisher.on('remoteVideoPlaying', (e) => {
      this.appendPublisherData(e.element);
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

  private afterOpenPreview(recorder: LocalRecorder): void {
    this.muteSubscribersService.updateMuted(true);
    recorder.preview('recorder-preview').controls = true;
  }

  private afterClosePreview(connectionId?: string): void {
    this.muteSubscribersService.updateMuted(false);
    if (!!connectionId) {
      this.restartSubscriberRecord(connectionId);
    } else {
      this.restartPublisherRecord();
    }
  }

  private restartPublisherRecord(): void {
    if (!!this.session) {
      let el: HTMLElement = document.getElementById('local-record-icon-' + this.session.connection.connectionId);
      if (!!el) {
        el.innerHTML = 'fiber_manual_record';
      }
      el = document.getElementById('local-pause-icon-' + this.session.connection.connectionId);
      if (!!el) {
        el.innerHTML = 'pause';
      }
      el = document.getElementById('local-pause-btn-' + this.session.connection.connectionId);
      if (!!el) {
        el.style.display = 'none';
      }
    }
    this.publisherPaused = false;
    this.publisherRecording = false;
    if (!!this.publisherRecorder) {
      this.publisherRecorder.clean();
    }
  }

  private restartSubscriberRecord(connectionId: string): void {
    if (!!this.session) {
      let el: HTMLElement = document.getElementById('record-icon-' + this.session.connection.connectionId + '-' + connectionId);
      if (!!el) {
        el.innerHTML = 'fiber_manual_record';
      }
      el = document.getElementById('pause-icon-' + this.session.connection.connectionId + '-' + connectionId);
      if (!!el) {
        el.innerHTML = 'pause';
      }
      el = document.getElementById('pause-btn-' + this.session.connection.connectionId + '-' + connectionId);
      if (!!el) {
        el.style.display = 'none';
      }
    }
    this.subscribers[connectionId].recording = false;
    this.subscribers[connectionId].paused = false;

    if (!!this.subscribers[connectionId].recorder) {
      this.subscribers[connectionId].recorder.clean();
    }
  }

  syncInitPublisher() {
    this.publisher = this.OV.initPublisher(
      'local-vid-' + this.session.connection.connectionId,
      {
        audioSource: this.sendAudio ? undefined : false,
        videoSource: this.sendVideo ? (this.optionsVideo === 'screen' ? 'screen' : undefined) : false,
        publishAudio: this.activeAudio,
        publishVideo: this.activeVideo,
        resolution: '640x480',
        frameRate: 30,
        insertMode: 'APPEND'
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

  asyncInitPublisher() {
    this.OV.initPublisherAsync(
      'local-vid-' + this.session.connection.connectionId,
      {
        audioSource: this.sendAudio ? undefined : false,
        videoSource: this.sendVideo ? (this.optionsVideo === 'screen' ? 'screen' : undefined) : false,
        publishAudio: this.activeAudio,
        publishVideo: this.activeVideo,
        resolution: '640x480',
        frameRate: 30,
        insertMode: 'APPEND'
      })
      .then(publisher => {
        this.publisher = publisher;
        this.addPublisherEvents(this.publisher);
        if (this.subscribeToRemote) {
          this.publisher.subscribeToRemote();
        }
        this.session.publish(this.publisher)
          .then(() => {
            console.log(this.publisher);
          })
          .catch(e => {
            console.error(e);
          });
      })
      .catch(err => {
        if (err) {
          console.error(err);
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
  }

  syncSubscribe(session: Session, event) {
    const subscriber: Subscriber = session.subscribe(event.stream, 'remote-vid-' + session.connection.connectionId);
    this.subscribers[subscriber.stream.connection.connectionId] = {
      'subscriber': subscriber,
      'subbed': true,
      'recorder': undefined,
      'recording': false,
      'paused': false,
      'videoElement': undefined
    };
    subscriber.on('videoElementCreated', (e) => {
      if (!event.stream.hasVideo) {
        $(e.element).css({ 'background-color': '#4d4d4d' });
        $(e.element).attr('poster', 'assets/images/volume.png');
      }
      this.subscribers[subscriber.stream.connection.connectionId].videoElement = e.element;
      this.updateEventList('videoElementCreated', e.element.id);
    });
    subscriber.on('videoPlaying', (e) => {
      this.appendSubscriberData(e.element, subscriber.stream.connection);
      this.updateEventList('videoPlaying', e.element.id);
    });
    subscriber.on('videoElementDestroyed', (e) => {
      this.updateEventList('videoElementDestroyed', '(Subscriber)');
    });
  }

  asyncSubscribe(session: Session, event) {
    session.subscribeAsync(event.stream, 'remote-vid-' + session.connection.connectionId)
      .then(subscriber => {
        this.subscribers[subscriber.stream.connection.connectionId] = {
          'subscriber': subscriber,
          'subbed': true,
          'recorder': undefined,
          'recording': false,
          'paused': false,
          'videoElement': undefined
        };
        subscriber.on('videoElementCreated', (e) => {
          if (!event.stream.hasVideo) {
            $(e.element).css({ 'background-color': '#4d4d4d' });
            $(e.element).attr('poster', 'assets/images/volume.png');
          }
          this.subscribers[subscriber.stream.connection.connectionId].videoElement = e.element;
          this.updateEventList('videoElementCreated', e.element.id);
        });
        subscriber.on('videoPlaying', (e) => {
          this.appendSubscriberData(e.element, subscriber.stream.connection);
          this.updateEventList('videoPlaying', e.element.id);
        });
        subscriber.on('videoElementDestroyed', (e) => {
          this.updateEventList('videoElementDestroyed', '(Subscriber)');
        });
      })
      .catch(err => {
        console.error(err);
      });
  }

  enableSpeakingEvents() {
    this.session.on('publisherStartSpeaking', (event) => {
    });

    this.session.on('publisherStopSpeaking', (event) => {
    });
  }

  disableSpeakingEvents() {
    this.session.off('publisherStartSpeaking');
    this.session.off('publisherStopSpeaking');
  }

  initGrayVideo(): void {
    this.OV.getUserMedia(
      {
        videoSource: undefined,
        resolution: '1280x720',
        frameRate: 10,
      }
    )
    .then((mediaStream: MediaStream) => {
      const videoStreamTrack = mediaStream.getVideoTracks()[0];
      const video = document.createElement('video');
      video.srcObject = new MediaStream([videoStreamTrack]);
      video.play();
      const canvas = document.createElement('canvas') as any;
      const ctx = canvas.getContext('2d');
      ctx.filter = 'grayscale(100%)';

      video.addEventListener('play', () => {
        const loop = () => {
          if (!video.paused && !video.ended) {
            ctx.drawImage(video, 0, 0, 300, 170);
            setTimeout(loop, 100); // Drawing at 10fps
          }
        };
        loop();
      });
      const grayVideoTrack = canvas.captureStream(30).getVideoTracks()[0];
      this.OV.initPublisher(
          document.body,
        {
          audioSource: false,
          videoSource: grayVideoTrack,
          insertMode: 'APPEND'
        });
      })
    .catch(error => {
      console.error(error);
    });
  }

}
