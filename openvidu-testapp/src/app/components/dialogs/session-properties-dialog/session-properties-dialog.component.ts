import { Component, Inject } from '@angular/core';
import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';

import { ConnectionProperties, MediaMode, Recording, RecordingLayout, RecordingMode, SessionProperties, VideoCodec } from 'openvidu-node-client-v2compatibility';

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
    forcePublishing: boolean;
    targetElement: boolean;
    reconnectionOnServerFailure: boolean;
    connectionProperties: ConnectionProperties;
    forceVideoCodec = VideoCodec;

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
        this.targetElement = data.targetElement;
        this.reconnectionOnServerFailure = data.reconnectionOnServerFailure;
        this.connectionProperties = data.connectionProperties;
    }

    enumToArray(enumerator: any) {
        return Object.keys(enumerator);
    }

    generateConnectionProperties(): ConnectionProperties {
        this.connectionProperties.kurentoOptions.allowedFilters = this.filters;
        return this.connectionProperties;
    }

}
