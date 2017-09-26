import { OpenVidu, Session } from 'openvidu-browser';
import { Component, ElementRef, ViewChild, HostListener, OnDestroy } from '@angular/core';

declare var $: any;

@Component({
  selector: 'app-session',
  templateUrl: './session.component.html',
  styleUrls: ['./session.component.css']
})
export class SessionComponent implements OnDestroy {

  @ViewChild('mainVideoElement') elementRef: ElementRef;
  mainVideoElement: HTMLVideoElement;

  // OpenVidu objects
  OV: OpenVidu;
  session: Session;

  // Join form
  sessionName: string;
  clientData: string;

  constructor() { }

  @HostListener('window:beforeunload')
  beforeunloadHandler() {
    // On window closed leave session
    this.leaveSession();
  }

  ngOnDestroy() {
    // On component destroyed leave session
    this.leaveSession();
  }

  joinSession() {

    this.OV = new OpenVidu();

    this.session = this.OV.initSession('wss://' + location.hostname + ':8443/' + this.sessionName + '?secret=MY_SECRET');

    this.mainVideoElement = this.elementRef.nativeElement;

    this.session.on('streamCreated', (event) => {
      const subscriber = this.session.subscribe(event.stream, 'video-container');
      subscriber.on('videoElementCreated', (e) => {
        this.appendUserData(e.element, subscriber.stream.connection);
      });
    });

    this.session.on('streamDestroyed', (event) => {
      this.removeUserData(event.stream.connection);
    });

    this.session.connect(null, this.clientData, (error) => {

      if (!error) {
        const publisher = this.OV.initPublisher('video-container', {
          audio: true,
          video: true,
          quality: 'MEDIUM'
        });

        publisher.on('videoElementCreated', (event) => {
          this.initMainVideo(event.element, this.clientData);
          this.appendUserData(event.element, this.clientData);
          event.element['muted'] = true;
        });

        this.session.publish(publisher);

      } else {
        console.log('There was an error connecting to the session:', error.code, error.message);
      }
    });

    return false;
  }

  leaveSession() {
    if (this.OV) {
      this.session.disconnect();
    }
    this.removeAllUserData();
    this.session = null;
    this.OV = null;
  }

  private appendUserData(videoElement, connection) {
    let userData;
    let nodeId;
    if (typeof connection === 'string') {
      userData = connection;
      nodeId = connection;
    } else {
      userData = JSON.parse(connection.data).clientData;
      nodeId = connection.connectionId;
    }
    const dataNode = document.createElement('div');
    dataNode.className = 'data-node';
    dataNode.id = 'data-' + nodeId;
    dataNode.innerHTML = '<p>' + userData + '</p>';
    videoElement.parentNode.insertBefore(dataNode, videoElement.nextSibling);
    this.addClickListener(videoElement, userData);
  }

  private removeUserData(connection) {
    const dataNode = $('#data-' + connection.connectionId);
    dataNode.parentNode.removeChild(dataNode);
  }

  private removeAllUserData() {
    const nicknameElements = $('.data-node');
    while (nicknameElements[0]) {
      nicknameElements[0].parentNode.removeChild(nicknameElements[0]);
    }
  }

  private addClickListener(videoElement: HTMLVideoElement, userData) {
    videoElement.addEventListener('click', () => {
      const mainUserData = $('#main-video p');
      if (this.mainVideoElement.srcObject !== videoElement.srcObject) {
        mainUserData.innerHTML = userData;
        this.mainVideoElement.srcObject = videoElement.srcObject;
      }
    });
  }

  private initMainVideo(videoElement: HTMLVideoElement, userData) {
    this.mainVideoElement.srcObject = videoElement.srcObject;
    $('#main-video p').innerHTML = userData;
    this.mainVideoElement['muted'] = true;
  }
}
