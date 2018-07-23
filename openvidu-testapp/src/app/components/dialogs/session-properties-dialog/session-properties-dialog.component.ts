import { Component, Inject } from '@angular/core';
import { MatDialog, MAT_DIALOG_DATA, MatDialogConfig, MatDialogRef } from '@angular/material';

import { SessionProperties, MediaMode, RecordingMode, RecordingLayout } from 'openvidu-node-client';

@Component({
    selector: 'app-session-properties-dialog',
    templateUrl: './session-properties-dialog.component.html',
    styleUrls: ['./session-properties-dialog.component.css']
})
export class SessionPropertiesDialogComponent {

    sessionProperties: SessionProperties;
    turnConf: string;
    manualTurnConf: RTCIceServer = {};
    participantRole: string;
    customToken: string;

    mediaMode = MediaMode;
    recordingMode = RecordingMode;
    defaultRecordingLayout = RecordingLayout;

    constructor(public dialogRef: MatDialogRef<SessionPropertiesDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data) {
        this.sessionProperties = data.sessionProperties;
        this.turnConf = data.turnConf;
        this.manualTurnConf = data.manualTurnConf;
        this.participantRole = data.participantRole;
        this.customToken = data.customToken;
    }

    enumToArray(enumerator: any) {
        return Object.keys(enumerator);
    }

}
