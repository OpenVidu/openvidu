import {
  Component, Input, HostListener, ChangeDetectorRef, SimpleChanges,
  OnInit, OnDestroy, OnChanges
} from '@angular/core';

import {
  OpenVidu, Session, Subscriber, Publisher, Event, StreamEvent, ConnectionEvent,
  SessionDisconnectedEvent, SignalEvent, RecordingEvent,
  PublisherSpeakingEvent, PublisherProperties, StreamPropertyChangedEvent, ConnectionPropertyChangedEvent, OpenViduError, NetworkQualityLevelChangedEvent, ExceptionEvent, OpenViduAdvancedConfiguration
} from 'openvidu-browser';
import {
  OpenVidu as OpenViduAPI,
  Session as SessionAPI,
  SessionProperties as SessionPropertiesAPI,
  MediaMode,
  RecordingMode,
  RecordingLayout,
  Connection,
  ConnectionProperties,
  OpenViduRole,
  RecordingProperties,
  Recording,
} from 'openvidu-node-client';
import { MatDialog, MAT_CHECKBOX_CLICK_ACTION } from '@angular/material';
import { ExtensionDialogComponent } from '../dialogs/extension-dialog/extension-dialog.component';
import { TestFeedService } from '../../services/test-feed.service';
import { EventsDialogComponent } from '../dialogs/events-dialog/events-dialog.component';
import { SessionPropertiesDialogComponent } from '../dialogs/session-properties-dialog/session-properties-dialog.component';
import { SessionApiDialogComponent } from '../dialogs/session-api-dialog/session-api-dialog.component';
import { PublisherPropertiesDialogComponent } from '../dialogs/publisher-properties-dialog/publisher-properties-dialog.component';
import { SessionInfoDialogComponent } from "../dialogs/session-info-dialog/session-info-dialog.component";


export interface SessionConf {
  subscribeTo: boolean;
  publishTo: boolean;
  startSession: boolean;
}

export interface OpenViduEvent {
  eventName: string;
  eventContent: string;
  event: Event;
}

@Component({
  selector: 'app-openvidu-instance',
  templateUrl: './openvidu-instance.component.html',
  styleUrls: ['./openvidu-instance.component.css'],
  providers: [
    { provide: MAT_CHECKBOX_CLICK_ACTION, useValue: 'noop' }
  ]
})
export class OpenviduInstanceComponent implements OnInit, OnChanges, OnDestroy {

  @Input()
  openviduUrl: string;

  @Input()
  openviduSecret: string;

  @Input()
  sessionConf: SessionConf;

  @Input()
  useMediasoup: boolean;

  @Input()
  index: number;

  // Session join data
  clientData: string;
  sessionName: string;

  // Session options
  subscribeTo;
  publishTo;
  sendVideoRadio = true;
  subscribeToRemote = false;
  optionsVideo = 'video';

  // Recording options
  recordingProperties: RecordingProperties;

  // OpenVidu Browser objects
  OV: OpenVidu;
  session: Session;
  publisher: Publisher;
  subscribers: Subscriber[] = [];

  // OpenVidu Node Client objects
  OV_NodeClient: OpenViduAPI;
  sessionAPI: SessionAPI;
  sessionProperties: SessionPropertiesAPI = {
    mediaMode: MediaMode.ROUTED,
    recordingMode: RecordingMode.MANUAL,
    defaultRecordingProperties: {
      name: '',
      hasAudio: true,
      hasVideo: true,
      outputMode: Recording.OutputMode.COMPOSED,
      recordingLayout: RecordingLayout.BEST_FIT,
      resolution: '1280x720',
      frameRate: 25,
      shmSize: 536870912,
      customLayout: '',
      ignoreFailedStreams: false,
      mediaNode: {
        id: ''
      }
    },
    customSessionId: '',
    forcedVideoCodec: null,
    allowTranscoding: null
  };

  publisherProperties: PublisherProperties = {
    audioSource: undefined,
    videoSource: undefined,
    frameRate: 30,
    resolution: '640x480',
    mirror: true,
    publishAudio: true,
    publishVideo: true,
    videoSimulcast: true
  };

  publisherPropertiesAux: PublisherProperties;

  sessionEvents = {
    connectionCreated: true,
    connectionDestroyed: true,
    sessionDisconnected: true,
    streamCreated: true,
    streamDestroyed: true,
    streamPropertyChanged: true,
    connectionPropertyChanged: true,
    networkQualityLevelChanged: true,
    recordingStarted: true,
    recordingStopped: true,
    signal: true,
    publisherStartSpeaking: false,
    publisherStopSpeaking: false,
    reconnecting: true,
    reconnected: true,
    exception: true
  };

  // Session properties dialog
  turnConf = 'auto';
  manualTurnConf: RTCIceServer = { urls: [] };
  customToken: string;
  forcePublishing: boolean = false;
  reconnectionOnServerFailure: boolean = false;
  connectionProperties: ConnectionProperties = {
    role: OpenViduRole.PUBLISHER,
    record: true,
    kurentoOptions: {
      videoMaxRecvBandwidth: 1000,
      videoMinRecvBandwidth: 300,
      videoMaxSendBandwidth: 1000,
      videoMinSendBandwidth: 300,
      allowedFilters: []
    }
  };

  events: OpenViduEvent[] = [];

  republishPossible: boolean = false;
  openviduError: any;

  constructor(
    private changeDetector: ChangeDetectorRef,
    private dialog: MatDialog,
    private testFeedService: TestFeedService
  ) {
    this.generateSessionInfo();
  }

  ngOnInit() {
    this.subscribeTo = this.sessionConf.subscribeTo;
    this.publishTo = this.sessionConf.publishTo;
    this.publisherPropertiesAux = Object.assign({}, this.publisherProperties);
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

  async joinSession(): Promise<void> {
    if (this.session) {
      this.leaveSession();
    }
    const sessionId = !!this.customToken ? this.getSessionIdFromToken(this.customToken) : this.sessionName;
    await this.initializeNodeClient(sessionId);
    if (!!this.customToken) {
      this.joinSessionShared(this.customToken);
    } else {
      const connection: Connection = await this.createConnection();
      this.joinSessionShared(connection.token);
    }
  }

  private joinSessionShared(token: string): void {

    this.OV = new OpenVidu();

    const advancedConfiguration: OpenViduAdvancedConfiguration = {};
    if (this.turnConf === 'freeice') {
      advancedConfiguration.iceServers = 'freeice';
    } else if (this.turnConf === 'manual') {
      advancedConfiguration.iceServers = [this.manualTurnConf];
    }
    this.OV.setAdvancedConfiguration(advancedConfiguration);

    this.session = this.OV.initSession();

    this.updateSessionEvents({
      connectionCreated: false,
      connectionDestroyed: false,
      sessionDisconnected: false,
      streamCreated: false,
      streamDestroyed: false,
      streamPropertyChanged: false,
      connectionPropertyChanged: false,
      networkQualityLevelChanged: false,
      recordingStarted: false,
      recordingStopped: false,
      signal: false,
      publisherStartSpeaking: true,
      publisherStopSpeaking: true,
      reconnecting: false,
      reconnected: false,
      exception: false
    }, true);

    if (this.useMediasoup) {
      const realProcessJoinRoomResponseFunction = this.session['processJoinRoomResponse'];
      this.session['processJoinRoomResponse'] = opts => {
        opts.mediaServer = 'mediasoup';
        realProcessJoinRoomResponseFunction.bind(this.session, opts)();
      };
    }

    this.session.connect(token, this.clientData)
      .then(() => {
        this.changeDetector.detectChanges();

        if (this.publishTo && this.session.capabilities.publish || this.forcePublishing) {
          // this.asyncInitPublisher();
          this.syncInitPublisher();
        }
      })
      .catch(error => {
        console.log('There was an error connecting to the session:', error.code, error.message);
        alert('Error connecting to the session: ' + error.message);
      });
  }

  private leaveSession(): void {
    if (this.session) {
      this.session.disconnect();
    }
    delete this.session;
    delete this.OV;
    delete this.publisher;
    this.subscribers = [];
  }

  updateEventList(eventName: string, eventContent: string, event: Event) {
    const eventInterface: OpenViduEvent = { eventName, eventContent, event };
    this.events.push(eventInterface);
    this.testFeedService.pushNewEvent(event);
  }

  toggleSubscribeTo(): void {
    this.subscribeTo = !this.subscribeTo;
  }

  togglePublishTo(): void {
    this.publishTo = !this.publishTo;
    if (this.publishTo) {
      this.publisherProperties = this.publisherPropertiesAux;
    } else {
      this.publisherPropertiesAux = Object.assign({}, this.publisherProperties);
      this.publisherProperties.publishAudio = false;
      this.publisherProperties.publishVideo = false;
      this.publisherProperties.audioSource = false;
      this.publisherProperties.videoSource = false;
    }

    if (this.publishTo) {
      this.optionsVideo = 'video';
    } else {
      this.optionsVideo = '';
    }

    this.subscribeToRemote = false;
  }

  toggleSendAudio(): void {
    if (this.publisherProperties.audioSource === false) {
      this.publisherProperties.audioSource = this.publisherPropertiesAux.audioSource;
    } else {
      this.publisherPropertiesAux.audioSource = this.publisherProperties.audioSource;
      this.publisherProperties.audioSource = false;
    }
  }

  toggleSendVideo(): void {
    if (this.publisherProperties.videoSource === false) {
      this.publisherProperties.videoSource = this.publisherPropertiesAux.videoSource;
    } else {
      this.publisherPropertiesAux.videoSource = this.publisherProperties.videoSource;
      this.publisherProperties.videoSource = false;
    }
  }

  toggleActiveAudio(): void {
    this.publisherProperties.publishAudio = !this.publisherProperties.publishAudio;
  }

  toggleActiveVideo(): void {
    this.publisherProperties.publishVideo = !this.publisherProperties.publishVideo;
  }

  sendMessage(): void {
    this.session.signal({
      data: 'Test message',
      to: [],
      type: 'chat'
    })
      .then(() => {
        console.log('Message successfully sent');
      })
      .catch(error => {
        console.error(error);
      });
    // this.initGrayVideo();
  }

  updateSessionEvents(oldValues, firstTime) {

    if (this.sessionEvents.streamCreated !== oldValues.streamCreated || firstTime) {
      this.session.off('streamCreated');
      if (this.sessionEvents.streamCreated) {
        this.session.on('streamCreated', (event: StreamEvent) => {
          this.changeDetector.detectChanges();
          if (this.subscribeTo) {
            this.syncSubscribe(this.session, event);
          }
          this.updateEventList('streamCreated', event.stream.streamId, event);
        });
      }
    }

    if (this.sessionEvents.streamDestroyed !== oldValues.streamDestroyed || firstTime) {
      this.session.off('streamDestroyed');
      if (this.sessionEvents.streamDestroyed) {
        this.session.on('streamDestroyed', (event: StreamEvent) => {
          const index = this.subscribers.indexOf(<Subscriber>event.stream.streamManager);
          if (index > -1) {
            this.subscribers.splice(index, 1);
          }
          this.updateEventList('streamDestroyed', event.stream.streamId, event);
        });
      }
    }

    if (this.sessionEvents.streamPropertyChanged !== oldValues.streamPropertyChanged || firstTime) {
      this.session.off('streamPropertyChanged');
      if (this.sessionEvents.streamPropertyChanged) {
        this.session.on('streamPropertyChanged', (event: StreamPropertyChangedEvent) => {
          let newValue: string;
          if (event.changedProperty === 'filter') {
            newValue = !event.newValue ? undefined : event.newValue.toString();
          } else {
            newValue = event.changedProperty === 'videoDimensions' ? JSON.stringify(event.newValue) : event.newValue.toString();
          }
          this.updateEventList('streamPropertyChanged', event.changedProperty + ' [' + newValue + ']', event);
        });
      }
    }

    if (this.sessionEvents.connectionPropertyChanged !== oldValues.connectionPropertyChanged || firstTime) {
      this.session.off('connectionPropertyChanged');
      if (this.sessionEvents.connectionPropertyChanged) {
        this.session.on('connectionPropertyChanged', (event: ConnectionPropertyChangedEvent) => {
          this.updateEventList('connectionPropertyChanged', event.changedProperty + ' [' + event.newValue + ']', event);
        });
      }
    }

    if (this.sessionEvents.networkQualityLevelChanged !== oldValues.networkQualityLevelChanged || firstTime) {
      this.session.off('networkQualityLevelChanged');
      if (this.sessionEvents.networkQualityLevelChanged) {
        this.session.on('networkQualityLevelChanged', (event: NetworkQualityLevelChangedEvent) => {
          this.updateEventList('networkQualityLevelChanged', event.connection.connectionId + ' [new:' + event.newValue + ',old:' + event.oldValue + ']', event);
        });
      }
    }

    if (this.sessionEvents.connectionCreated !== oldValues.connectionCreated || firstTime) {
      this.session.off('connectionCreated');
      if (this.sessionEvents.connectionCreated) {
        this.session.on('connectionCreated', (event: ConnectionEvent) => {
          this.updateEventList('connectionCreated', event.connection.connectionId, event);
        });
      }
    }

    if (this.sessionEvents.connectionDestroyed !== oldValues.connectionDestroyed || firstTime) {
      this.session.off('connectionDestroyed');
      if (this.sessionEvents.connectionDestroyed) {
        this.session.on('connectionDestroyed', (event: ConnectionEvent) => {
          delete this.subscribers[event.connection.connectionId];
          this.updateEventList('connectionDestroyed', event.connection.connectionId, event);
        });
      }
    }

    if (this.sessionEvents.sessionDisconnected !== oldValues.sessionDisconnected || firstTime) {
      this.session.off('sessionDisconnected');
      if (this.sessionEvents.sessionDisconnected) {
        this.session.on('sessionDisconnected', async (event: SessionDisconnectedEvent) => {
          this.updateEventList('sessionDisconnected', '', event);
          this.subscribers = [];
          delete this.publisher;
          delete this.session;
          delete this.OV;

          if (event.reason === 'nodeCrashed' && this.reconnectionOnServerFailure) {
            console.warn('Reconnecting after node crash');
            await this.initializeNodeClient((event.target as Session).sessionId);
            const connection: Connection = await this.createConnection();
            this.joinSessionShared(connection.token);
          }

        });
      }
    }

    if (this.sessionEvents.signal !== oldValues.signal || firstTime) {
      this.session.off('signal');
      if (this.sessionEvents.signal) {
        this.session.on('signal', (event: SignalEvent) => {
          this.updateEventList('signal', !!event.from ? event.from.connectionId : 'server'
            + ' - ' + event.type
            + ' - ' + event.data, event);
        });
      }
    }

    if (this.sessionEvents.recordingStarted !== oldValues.recordingStarted || firstTime) {
      this.session.off('recordingStarted');
      if (this.sessionEvents.recordingStarted) {
        this.session.on('recordingStarted', (event: RecordingEvent) => {
          this.updateEventList('recordingStarted', event.id, event);
        });
      }
    }

    if (this.sessionEvents.recordingStopped !== oldValues.recordingStopped || firstTime) {
      this.session.off('recordingStopped');
      if (this.sessionEvents.recordingStopped) {
        this.session.on('recordingStopped', (event: RecordingEvent) => {
          this.updateEventList('recordingStopped', event.id, event);
        });
      }
    }

    if (this.sessionEvents.publisherStartSpeaking !== oldValues.publisherStartSpeaking || firstTime) {
      this.session.off('publisherStartSpeaking');
      if (this.sessionEvents.publisherStartSpeaking) {
        this.session.on('publisherStartSpeaking', (event: PublisherSpeakingEvent) => {
          this.updateEventList('publisherStartSpeaking', event.connection.connectionId, event);
        });
      }
    }

    if (this.sessionEvents.publisherStopSpeaking !== oldValues.publisherStopSpeaking || firstTime) {
      if (!this.sessionEvents.publisherStartSpeaking) {
        this.session.off('publisherStopSpeaking');
      }
      if (this.sessionEvents.publisherStopSpeaking) {
        this.session.on('publisherStopSpeaking', (event: PublisherSpeakingEvent) => {
          this.updateEventList('publisherStopSpeaking', event.connection.connectionId, event);
        });
      }
    }

    if (this.sessionEvents.reconnecting !== oldValues.reconnecting || firstTime) {
      this.session.off('reconnecting');
      if (this.sessionEvents.reconnecting) {
        this.session.on('reconnecting', () => {
          this.updateEventList('reconnecting', '', { cancelable: false, target: this.session, type: 'reconnecting', hasBeenPrevented: false, isDefaultPrevented: undefined, preventDefault: undefined, callDefaultBehavior: undefined });
        });
      }
    }

    if (this.sessionEvents.reconnected !== oldValues.reconnected || firstTime) {
      this.session.off('reconnected');
      if (this.sessionEvents.reconnected) {
        this.session.on('reconnected', () => {
          this.updateEventList('reconnected', '', { cancelable: false, target: this.session, type: 'reconnected', hasBeenPrevented: false, isDefaultPrevented: undefined, preventDefault: undefined, callDefaultBehavior: undefined });
        });
      }
    }

    if (this.sessionEvents.exception !== oldValues.exception || firstTime) {
      this.session.off('exception');
      if (this.sessionEvents.exception) {
        this.session.on('exception', (event: ExceptionEvent) => {
          this.updateEventList('exception', event.name, event);
        });
      }
    }

  }

  syncInitPublisher() {
    this.publisher = this.OV.initPublisher(
      undefined,
      this.publisherProperties,
      err => {
        if (err) {
          console.warn(err);
          this.openviduError = err;
          if (err.name === 'SCREEN_EXTENSION_NOT_INSTALLED') {
            this.dialog.open(ExtensionDialogComponent, {
              data: { url: err.message },
              disableClose: true,
              width: '250px'
            });
          }
        }
      });

    if (this.subscribeToRemote) {
      this.publisher.subscribeToRemote();
    }

    this.session.publish(this.publisher).then(() => {
      this.republishPossible = false;
    }).catch((error: OpenViduError) => {
      console.error(error);
      if (!error.name) {
        alert(error);
      } else {
        alert(error.name + ": " + error.message);
      }

      this.republishPossible = true;
      this.session.unpublish(this.publisher);
      delete this.publisher;
    });
  }

  syncSubscribe(session: Session, event) {
    this.subscribers.push(session.subscribe(event.stream, undefined));
  }

  initGrayVideo(): void {

    this.OV.getUserMedia(
      {
        audioSource: undefined,
        videoSource: undefined,
        resolution: '1280x720',
        frameRate: 3,
      }
    )
      .then((mediaStream: MediaStream) => {

        const videoStreamTrack: MediaStreamTrack = mediaStream.getVideoTracks()[0];
        const video: HTMLVideoElement = document.createElement('video');
        video.srcObject = new MediaStream([videoStreamTrack]);
        video.play();
        const canvas = document.createElement('canvas') as any;
        const ctx = canvas.getContext('2d');
        ctx.filter = 'grayscale(100%)';

        video.addEventListener('play', () => {
          const loop = () => {
            if (!video.paused && !video.ended) {
              ctx.drawImage(video, 0, 0, 300, 170);
              setTimeout(loop, 33); // Drawing at 30fps
            }
          };
          loop();
        });
        const grayVideoTrack: MediaStreamTrack = (<MediaStream>canvas.captureStream(30)).getVideoTracks()[0];
        this.OV.getUserMedia({
          audioSource: false,
          videoSource: grayVideoTrack
        }).then(mediastream => {
          this.publisher.replaceTrack(mediastream.getVideoTracks()[0])
            .then(() => console.log('New track is being published'))
            .catch(error => {
              console.error('Error replacing track');
              console.error(error);
            });
        });
      })
      .catch(error => {
        console.error(error);
      });
  }

  openSessionPropertiesDialog() {
    this.sessionProperties.customSessionId = this.sessionName;
    const dialogRef = this.dialog.open(SessionPropertiesDialogComponent, {
      data: {
        sessionProperties: this.sessionProperties,
        turnConf: this.turnConf,
        manualTurnConf: this.manualTurnConf,
        customToken: this.customToken,
        forcePublishing: this.forcePublishing,
        reconnectionOnServerFailure: this.reconnectionOnServerFailure,
        connectionProperties: this.connectionProperties,
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (!!result) {
        this.sessionProperties = result.sessionProperties;
        if (!!this.sessionProperties.customSessionId) {
          this.sessionName = this.sessionProperties.customSessionId;
        }
        this.turnConf = result.turnConf;
        this.manualTurnConf = result.manualTurnConf;
        this.customToken = result.customToken;
        this.forcePublishing = result.forcePublishing;
        this.reconnectionOnServerFailure = result.reconnectionOnServerFailure;
        this.connectionProperties = result.connectionProperties;
      }
      document.getElementById('session-settings-btn-' + this.index).classList.remove('cdk-program-focused');
    });
  }

  openSessionApiDialog() {
    const dialogRef = this.dialog.open(SessionApiDialogComponent, {
      data: {
        openVidu: !!this.OV_NodeClient ? this.OV_NodeClient : new OpenViduAPI(this.openviduUrl, this.openviduSecret),
        session: this.sessionAPI,
        sessionId: !!this.session ? this.session.sessionId : this.sessionName,
        recordingProperties: !!this.recordingProperties ? this.recordingProperties : this.sessionProperties.defaultRecordingProperties
      },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (!result.session) {
        delete this.sessionAPI;
      }
      this.recordingProperties = result.recordingProperties;
      document.getElementById('session-api-btn-' + this.index).classList.remove('cdk-program-focused');
    });
  }

  openSessionEventsDialog() {

    const oldValues = {
      connectionCreated: this.sessionEvents.connectionCreated,
      connectionDestroyed: this.sessionEvents.connectionDestroyed,
      sessionDisconnected: this.sessionEvents.sessionDisconnected,
      streamCreated: this.sessionEvents.streamCreated,
      streamDestroyed: this.sessionEvents.streamDestroyed,
      streamPropertyChanged: this.sessionEvents.streamPropertyChanged,
      connectionPropertyChanged: this.sessionEvents.connectionPropertyChanged,
      networkQualityLevelChanged: this.sessionEvents.networkQualityLevelChanged,
      recordingStarted: this.sessionEvents.recordingStarted,
      recordingStopped: this.sessionEvents.recordingStopped,
      signal: this.sessionEvents.signal,
      publisherStartSpeaking: this.sessionEvents.publisherStartSpeaking,
      publisherStopSpeaking: this.sessionEvents.publisherStopSpeaking,
      reconnecting: this.sessionEvents.reconnecting,
      reconnected: this.sessionEvents.reconnected,
      exception: this.sessionEvents.exception
    };

    const dialogRef = this.dialog.open(EventsDialogComponent, {
      data: {
        eventCollection: this.sessionEvents,
        target: 'Session'
      },
      width: '280px',
      autoFocus: false,
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {

      if (!!this.session && JSON.stringify(this.sessionEvents) !== JSON.stringify(oldValues)) {
        this.updateSessionEvents(oldValues, false);
      }

      this.sessionEvents = {
        connectionCreated: result.connectionCreated,
        connectionDestroyed: result.connectionDestroyed,
        sessionDisconnected: result.sessionDisconnected,
        streamCreated: result.streamCreated,
        streamDestroyed: result.streamDestroyed,
        streamPropertyChanged: result.streamPropertyChanged,
        connectionPropertyChanged: result.connectionPropertyChanged,
        networkQualityLevelChanged: result.networkQualityLevelChanged,
        recordingStarted: result.recordingStarted,
        recordingStopped: result.recordingStopped,
        signal: result.signal,
        publisherStartSpeaking: result.publisherStartSpeaking,
        publisherStopSpeaking: result.publisherStopSpeaking,
        reconnecting: result.reconnecting,
        reconnected: result.reconnected,
        exception: result.exception
      };
      document.getElementById('session-events-btn-' + this.index).classList.remove('cdk-program-focused');
    });
  }

  openPublisherPropertiesDialog() {
    const dialogRef = this.dialog.open(PublisherPropertiesDialogComponent, {
      data: this.publisherProperties,
      width: '300px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe((result: PublisherProperties) => {
      if (!!result) {
        this.publisherProperties = result;
        this.optionsVideo = this.publisherProperties.videoSource === 'screen' ? 'screen' : 'video';
      }
      document.getElementById('publisher-settings-btn-' + this.index).classList.remove('cdk-program-focused');
    });
  }

  openSessionInfo() {
    this.dialog.open(SessionInfoDialogComponent, {
      data: {
        sessionAPI: this.sessionAPI
      },
      width: '450px'
    });
  }

  async initializeNodeClient(sessionId: string): Promise<any> {
    this.OV_NodeClient = new OpenViduAPI(this.openviduUrl, this.openviduSecret);
    this.sessionProperties.customSessionId = sessionId;
    this.sessionAPI = await this.OV_NodeClient.createSession(this.sessionProperties);
  }

  async createConnection(): Promise<Connection> {
    return this.sessionAPI.createConnection(this.connectionProperties);
  }

  updateEventFromChild(event: OpenViduEvent) {
    this.updateEventList(event.eventName, event.eventContent, event.event);
  }

  updateSubscriberFromChild(newSubscriber: Subscriber) {
    const oldSubscriber = this.subscribers.filter(sub => {
      return sub.stream.streamId === newSubscriber.stream.streamId;
    })[0];
    this.subscribers[this.subscribers.indexOf(oldSubscriber)] = newSubscriber;
  }

  updateOptionsVideo(change) {
    if (change.value === 'screen') {
      this.publisherPropertiesAux.videoSource = this.publisherProperties.videoSource;
      this.publisherProperties.videoSource = 'screen';
    } else {
      this.publisherProperties.videoSource = this.publisherPropertiesAux.videoSource;
    }
  }

  isVideo(): boolean {
    return (this.publisherProperties.videoSource === undefined ||
      typeof this.publisherProperties.videoSource === 'string' &&
      this.publisherProperties.videoSource !== 'screen');
  }

  republishAfterError() {
    this.syncInitPublisher();
  }

  private getSessionIdFromToken(token: string): string {
    const queryParams = decodeURI(token.split('?')[1])
      .split('&')
      .map(param => param.split('='))
      .reduce((values, [key, value]) => {
        values[key] = value
        return values
      }, {});
    return queryParams['sessionId'];
  }

}
