import { Component, Inject } from '@angular/core';
import { MatDialog, MAT_DIALOG_DATA, MatDialogConfig, MatDialogRef } from '@angular/material';

import { SessionProperties, MediaMode, RecordingMode, RecordingLayout } from 'openvidu-node-client';

@Component({
    selector: 'app-session-properties-dialog',
    template: `
    <div>
        <h2 mat-dialog-title>Session properties</h2>
        <mat-dialog-content>
            <mat-form-field>
                <mat-select placeholder="MediaMode" [(ngModel)]="sessionProperties.mediaMode">
                    <mat-option *ngFor="let enumerator of enumToArray(mediaMode)" [value]="enumerator">
                        {{ enumerator }}
                    </mat-option>
                </mat-select>
            </mat-form-field>
            <mat-form-field>
                <mat-select placeholder="RecordingMode" [(ngModel)]="sessionProperties.recordingMode">
                    <mat-option *ngFor="let enumerator of enumToArray(recordingMode)" [value]="enumerator">
                        {{ enumerator }}
                    </mat-option>
                </mat-select>
            </mat-form-field>
            <mat-form-field>
                <mat-select placeholder="DefaultRecordingLayout" [(ngModel)]="sessionProperties.defaultRecordingLayout">
                    <mat-option *ngFor="let enumerator of enumToArray(defaultRecordingLayout)" [value]="enumerator">
                        {{ enumerator }}
                    </mat-option>
                </mat-select>
            </mat-form-field>
            <mat-form-field *ngIf="this.sessionProperties.defaultRecordingLayout === 'CUSTOM'">
                <input matInput placeholder="DefaultCustomLayout" [(ngModel)]="sessionProperties.defaultCustomLayout">
            </mat-form-field>
            <mat-form-field>
                <input matInput placeholder="CustomSessionId" [(ngModel)]="sessionProperties.customSessionId">
            </mat-form-field>
        </mat-dialog-content>
        <mat-dialog-actions>
        <button mat-button [mat-dialog-close]="undefined">CANCEL</button>
        <button mat-button [mat-dialog-close]="sessionProperties">SAVE</button>
        </mat-dialog-actions>
    </div>
    `
})
export class SessionPropertiesDialogComponent {

    sessionProperties: SessionProperties;

    mediaMode = MediaMode;
    recordingMode = RecordingMode;
    defaultRecordingLayout = RecordingLayout;

    constructor(public dialogRef: MatDialogRef<SessionPropertiesDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: SessionProperties) {
        this.sessionProperties = data;
    }

    enumToArray(enumerator: any) {
        return Object.keys(enumerator);
    }

}
