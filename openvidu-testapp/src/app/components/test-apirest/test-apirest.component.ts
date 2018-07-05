import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { OpenviduRestService } from '../../services/openvidu-rest.service';
import { OpenviduParamsService } from '../../services/openvidu-params.service';
import { SessionProperties, RecordingMode, RecordingLayout, MediaMode } from 'openvidu-node-client';

import * as colormap from 'colormap';
const numColors = 64;

@Component({
  selector: 'app-test-apirest',
  templateUrl: './test-apirest.component.html',
  styleUrls: ['./test-apirest.component.css']
})
export class TestApirestComponent implements OnInit, OnDestroy {

  openviduUrl: string;
  openviduSecret: string;

  paramsSubscription: Subscription;

  // API REST params
  serverData = 'data_test';
  selectedRadioIndex = 0;

  openViduRoles = ['SUBSCRIBER', 'PUBLISHER', 'MODERATOR'];
  selectedRole = 'PUBLISHER';

  recordingModes = ['ALWAYS', 'MANUAL'];
  selectedRecordingMode = 'MANUAL';

  defaultRecordingLayouts = ['BEST_FIT', 'CUSTOM'];
  selectedDefaultRecordingLayout = 'BEST_FIT';

  mediaModes = ['ROUTED'];
  selectedMediaMode = 'ROUTED';

  customLayout = '';
  customSessionId = '';


  // API REST data collected
  data = [];

  cg;

  constructor(private openviduRestService: OpenviduRestService, private openviduParamsService: OpenviduParamsService) {
    const options = {
      colormap: [
        { 'index': 0, 'rgb': [135, 196, 213] },
        { 'index': 1, 'rgb': [255, 230, 151] }],
      nshades: numColors,
      format: 'hex'
    };
    this.cg = colormap(options);
  }

  ngOnInit() {
    const openviduParams = this.openviduParamsService.getParams();
    this.openviduUrl = openviduParams.openviduUrl;
    this.openviduSecret = openviduParams.openviduSecret;

    this.paramsSubscription = this.openviduParamsService.newParams$.subscribe(
      params => {
        this.openviduUrl = params.openviduUrl;
        this.openviduSecret = params.openviduSecret;
      });
  }

  ngOnDestroy() {
    if (!!this.paramsSubscription) { this.paramsSubscription.unsubscribe(); }
  }

  getSessionId() {
    this.openviduRestService.getSessionId(this.openviduUrl, this.openviduSecret,
      {
        recordingMode: RecordingMode[this.selectedRecordingMode],
        defaultRecordingLayout: RecordingLayout[this.selectedDefaultRecordingLayout],
        defaultCustomLayout: this.customLayout,
        mediaMode: MediaMode[this.selectedMediaMode],
        customSessionId: this.customSessionId
      })
      .then((sessionId) => {
        this.updateData();
      })
      .catch((error) => {
        console.error('Error getting a sessionId', error);
      });
  }

  getToken() {
    const sessionId = this.data[this.selectedRadioIndex][0];

    this.openviduRestService.getToken(this.openviduUrl, this.openviduSecret, sessionId, this.selectedRole, this.serverData)
      .then((token) => {
        this.updateData();
      })
      .catch((error) => {
        console.error('Error getting a token', error);
      });
  }

  updateData() {
    this.data = Array.from(this.openviduRestService.getAvailableParams());
  }

  getTokenDisabled(): boolean {
    return ((this.data.length === 0) || this.selectedRadioIndex === undefined);
  }

  getBackgroundColor(index: number) {
    return this.cg[((index + 1) * 15) % numColors];
  }

  cleanAllSessions() {
    this.data = [];
    this.openviduRestService.sessionIdSession.clear();
    this.openviduRestService.sessionIdTokenOpenViduRole.clear();
  }

}
