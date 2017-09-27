import { Component, OnInit } from '@angular/core';
import { OpenviduRestService } from '../../services/openvidu-rest.service';
import { DataSource } from '@angular/cdk/table';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';

import { OpenVidu, Session } from 'openvidu-browser';

import * as colormap from 'colormap';
const numColors = 64;

declare var $: any;

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {

  openviduURL = 'https://localhost:8443';
  openviduSecret = 'MY_SECRET';
  serverData = 'data_test';
  selectedRole = 'PUBLISHER';
  selectedRadioIndex = 0;

  openViduRoles = ['SUBSCRIBER', 'PUBLISHER', 'MODERATOR'];

  sendAudio = true;
  sendVideo = true;
  optionVideo = 'video';
  activeAudio = true;
  activeVideo = true;

  // Join form
  clientData: string;
  sessionName: string;

  // OpenVidu objects
  OV: OpenVidu;
  session: Session;

  // API REST data collected
  data = [];
  cg;

  constructor(private openviduRestService: OpenviduRestService) {
    this.generateSessionInfo();
    const options = {
      colormap: [
        { 'index': 0, 'rgb': [135, 196, 213] },
        { 'index': 1, 'rgb': [255, 230, 151] }],
      nshades: numColors,
      format: 'hex'
    };
    this.cg = colormap(options);
  }

  ngOnInit() { }




  /* TEST SESSION TAB */

  private generateSessionInfo() {
    this.sessionName = 'TestSession';
    this.clientData = 'TestClient';
  }

  private removeHttps = input => input.replace(/^https?:\/\//, '');

  private joinSession(): void {
    this.OV = new OpenVidu();

    this.session = this.OV.initSession('wss://'
      + this.removeHttps(this.openviduURL)
      + '/'
      + this.sessionName + '?secret='
      + this.openviduSecret);

    this.session.on('streamCreated', (event) => {
      const subscriber = this.session.subscribe(event.stream, 'video-container');
      subscriber.on('videoElementCreated', (e) => {
        this.appendUserData(e.element, subscriber.stream.connection.data, subscriber.stream.connection);
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
          this.appendUserData(event.element, this.clientData, null);
          event.element['muted'] = true;
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
  }

  private appendUserData(videoElement, data, connection) {
    const dataNode = document.createElement('div');
    dataNode.className = 'data-node';
    dataNode.id = 'data-' + (connection ? connection.connectionId : data);
    dataNode.innerHTML = '<p>' + data + '</p>';
    videoElement.parentNode.insertBefore(dataNode, videoElement.nextSibling);
  }

  private removeUserData(connection) {
    $('#data-' + connection.connectionId).remove();
  }

  private removeAllUserData() {
    const nicknameElements = $('.data-node');
    while (nicknameElements[0]) {
      nicknameElements[0].remove();
    }
  }

  /* TEST SESSION TAB */




  /* API REST TAB */

  private getSessionId() {
    this.openviduRestService.getSessionId(this.openviduURL, this.openviduSecret)
      .then((sessionId) => {
        this.updateData();
      })
      .catch((error) => {
        console.error('Error getting a sessionId', error);
      });
  }

  private getToken() {
    const sessionId = this.data[this.selectedRadioIndex][0];

    this.openviduRestService.getToken(this.openviduURL, this.openviduSecret, sessionId, this.selectedRole, this.serverData)
      .then((token) => {
        this.updateData();
      })
      .catch((error) => {
        console.error('Error getting a token', error);
      });
  }

  private updateData() {
    this.data = Array.from(this.openviduRestService.getAvailableParams());
  }

  private getTokenDisabled(): boolean {
    return ((this.data.length === 0) || this.selectedRadioIndex === undefined);
  }

  private getBackgroundColor(index: number) {
    return this.cg[((index + 1) * 15) % numColors];
  }

  private cleanAllSessions() {
    this.data = [];
    this.openviduRestService.sessionIdSession.clear();
    this.openviduRestService.sessionIdTokenOpenViduRole.clear();
  }

  /* API REST TAB */

}
