import { Component, OnInit } from '@angular/core';
import { OpenviduRestService } from '../../services/openvidu-rest.service';
import { DataSource } from '@angular/cdk/table';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';

import { OpenVidu } from 'openvidu-browser';

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

  // Join form
  sessionName: string;
  clientData: string;

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

  private generateSessionInfo() {
    this.sessionName = 'TestSession';
    this.clientData = 'RandomClient' + Math.floor(Math.random() * 100);
  }

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
}
