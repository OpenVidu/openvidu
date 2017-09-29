import { Component, Input, HostListener, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { OpenVidu, Session, Subscriber, Publisher, Stream } from 'openvidu-browser';

declare var $: any;

@Component({
  selector: 'app-openvidu-instance',
  templateUrl: './openvidu-instance.component.html',
  styleUrls: ['./openvidu-instance.component.css']
})
export class OpenviduInstanceComponent implements OnInit, OnDestroy {

  @Input()
  openviduURL: string;

  @Input()
  openviduSecret: string;

  subscribeTo = true;
  publishTo = true;
  sendAudio = true;
  sendVideo = true;
  activeAudio = true;
  activeVideo = true;
  optionVideo = 'video';
  sendVideoRadio = true;
  subscribeToRemote = false;

  // Join form
  clientData: string;
  sessionName: string;

  // OpenVidu objects
  OV: OpenVidu;
  session: Session;
  publisher: Publisher;

  audioMuted = false;
  videoMuted = false;
  audioIcon = 'mic';
  videoIcon = 'videocam';

  constructor(private changeDetector: ChangeDetectorRef) {
    this.generateSessionInfo();
  }

  ngOnInit() { }

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
      + this.removeHttps(this.openviduURL)
      + '/'
      + this.sessionName + '?secret='
      + this.openviduSecret);

    this.session.on('streamCreated', (event) => {

      this.changeDetector.detectChanges();

      if (this.subscribeTo) {
        const subscriber: Subscriber = this.session.subscribe(event.stream, 'remote-vid-' + this.session.connection.connectionId);
        subscriber.on('videoElementCreated', (e) => {
          this.appendUserData(e.element, subscriber.stream.connection.data, subscriber.stream.connection);
        });
        subscriber.on('videoPlaying', (e) => {
        });
      }
    });

    this.session.on('streamDestroyed', (event) => {
      this.removeUserData(event.stream.connection);
    });

    this.session.on('connectionCreated', (event) => { });
    this.session.on('connetionDestroyed', (event) => { });
    this.session.on('sessionDisconnected', (event) => { });

    this.session.connect(null, this.clientData, (error) => {
      if (!error) {
        if (this.publishTo) {

          this.audioMuted = !this.activeAudio;
          this.videoMuted = !this.activeVideo;
          this.updateAudioIcon();
          this.updateVideoIcon();

          this.publisher = OV.initPublisher('local-vid-' + this.session.connection.connectionId, {
            audio: this.activeAudio,
            video: this.activeVideo,
            quality: 'MEDIUM'
          });

          this.publisher.on('videoElementCreated', (event) => {
          });

          this.publisher.on('videoPlaying', (e) => {
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

  private toggleRadio(): void {
    if (this.publishTo && this.sendVideo) {
      this.optionVideo = 'video';
    }
  }

}
