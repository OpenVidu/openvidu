import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';

import { SessionProperties, MediaMode, Recording, RecordingMode, RecordingLayout, ConnectionOptions } from 'openvidu-node-client';

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
    forcePublishing: boolean = false;
    connectionOptions: ConnectionOptions;

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
        this.customToken = data.customToken;
        this.forcePublishing = data.forcePublishing;
        this.connectionOptions = data.connectionOptions;
    }

    enumToArray(enumerator: any) {
        return Object.keys(enumerator);
    }

    generateConnectionOptions(): ConnectionOptions {
        this.connectionOptions.kurentoOptions.allowedFilters = this.filters;
        return this.connectionOptions;
    }

}
