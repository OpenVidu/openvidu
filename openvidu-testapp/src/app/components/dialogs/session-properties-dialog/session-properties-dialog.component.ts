import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';

import { SessionProperties, MediaMode, Recording, RecordingMode, RecordingLayout, TokenOptions } from 'openvidu-node-client';

@Component({
    selector: 'app-session-properties-dialog',
    templateUrl: './session-properties-dialog.component.html',
    styleUrls: ['./session-properties-dialog.component.css']
})
export class SessionPropertiesDialogComponent {

    sessionProperties: SessionProperties;
    turnConf: string;
    manualTurnConf: RTCIceServer = { urls: [] };
    customToken: string;
    tokenOptions: TokenOptions;

    filterName = 'GStreamerFilter';
    filters: string[] = [];

    mediaMode = MediaMode;
    recordingMode = RecordingMode;
    defaultOutputMode = Recording.OutputMode;
    defaultRecordingLayout = RecordingLayout;

    constructor(public dialogRef: MatDialogRef<SessionPropertiesDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data) {
        this.sessionProperties = data.sessionProperties;
        this.turnConf = data.turnConf;
        this.manualTurnConf = data.manualTurnConf;
        this.tokenOptions = data.tokenOptions;
        this.customToken = data.customToken;
    }

    enumToArray(enumerator: any) {
        return Object.keys(enumerator);
    }

    generateTokenOptions(): TokenOptions {
        this.tokenOptions.kurentoOptions.allowedFilters = this.filters;
        return this.tokenOptions;
    }

}
