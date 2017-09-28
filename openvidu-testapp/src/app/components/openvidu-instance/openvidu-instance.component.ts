import { Component, Input, HostListener, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { OpenVidu, Session, Subscriber, Stream } from 'openvidu-browser';

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

  sendAudio = true;
  sendVideo = true;
  optionVideo = 'video';
  activeAudio = true;
  activeVideo = true;
  sendVideoRadio = true;

  // Join form
  clientData: string;
  sessionName: string;

  // OpenVidu objects
  OV: OpenVidu;
  session: Session;

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

      const subscriber: Subscriber = this.session.subscribe(event.stream, 'remote-vid-' + this.session.connection.connectionId);
      subscriber.on('videoElementCreated', (e) => {
        this.appendUserData(e.element, subscriber.stream.connection.data, subscriber.stream.connection);
      });
      subscriber.on('videoPlaying', (e) => {
      });
    });

    this.session.on('streamDestroyed', (event) => {
      this.removeUserData(event.stream.connection);
    });

    this.session.on('connectionCreated', (event) => { });
    this.session.on('connetionDestroyed', (event) => { });
    this.session.on('sessionDisconnected', (event) => { });

    this.session.connect(null, this.clientData, (error) => {
      if (!error) {

        const publisher = OV.initPublisher('local-vid-' + this.session.connection.connectionId, {
          audio: true,
          video: true,
          quality: 'MEDIUM'
        });

        publisher.on('videoElementCreated', (event) => {
          this.appendUserData(event.element, this.clientData, null);
        });

        publisher.on('videoPlaying', (e) => {
        });

        this.session.publish(publisher);

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
    this.removeAllUserData();
  }

  private appendUserData(videoElement, data, connection): void {
    /*const dataNode = document.createElement('div');
    dataNode.className = 'data-node';
    dataNode.id = 'data-' + (connection ? connection.connectionId : data);
    dataNode.innerHTML = '<p>' + data + '</p>';
    videoElement.parentNode.insertBefore(dataNode, videoElement.nextSibling);*/
  }

  private removeUserData(connection): void {
    /*$('#data-' + connection.connectionId).remove();*/
  }

  private removeAllUserData() {
    /*const nicknameElements = $('.data-node');
    while (nicknameElements[0]) {
      nicknameElements[0].remove();
    }*/
  }

  private toggleRadio(): void {
    this.sendVideoRadio = !this.sendVideo;
  }

}
