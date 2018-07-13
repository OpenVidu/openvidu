import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';

import { OpenVidu as OpenViduAPI, Session as SessionAPI } from 'openvidu-node-client';

@Component({
    selector: 'app-session-api-dialog',
    template: `
    <div>
        <h2 mat-dialog-title>API REST</h2>
        <mat-dialog-content>
            <button mat-button id="close-session-btn" (click)="closeSession()">Close session</button>
            <mat-divider></mat-divider>
            <button mat-button id="start-recording-btn" (click)="startRecording()">Start recording</button>
            <button mat-button id="list-recording-btn" (click)="listRecordings()">List recordings</button>
            <mat-divider></mat-divider>
            <mat-form-field>
                <input matInput id="recording-id-field" placeholder="recordingId" [(ngModel)]="recordingId">
            </mat-form-field>
            <button mat-button id="stop-recording-btn" (click)="stopRecording()" [disabled]="!recordingId">Stop recording</button>
            <button mat-button id="get-recording-btn" (click)="getRecording()" [disabled]="!recordingId">Get recording</button>
            <button mat-button id="delete-recording-btn" (click)="deleteRecording()" [disabled]="!recordingId">Delete recording</button>
            <mat-form-field *ngIf="!!response" id="response-text-area">
                <textarea id="api-response-text-area" [(ngModel)]="response" matInput readonly></textarea>
            </mat-form-field>
        </mat-dialog-content>
        <mat-dialog-actions>
            <button mat-button id="close-dialog-btn"  [mat-dialog-close]="{session: session}">CLOSE</button>
        </mat-dialog-actions>
    </div>
    `,
    styles: [
        '#response-text-area { width: 100%; color: #808080; }',
        '#response-text-area textarea { resize: none; }',
        'mat-dialog-content button, mat-divider { margin-bottom: 5px; }',
    ]
})
export class SessionApiDialogComponent {

    OV: OpenViduAPI;
    session: SessionAPI;
    sessionId: string;
    recordingId: string;
    response: string;

    constructor(public dialogRef: MatDialogRef<SessionApiDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data) {
        this.OV = data.openVidu;
        this.session = data.session;
        this.sessionId = data.sessionId;
    }

    closeSession() {
        console.log('Closing session');
        if (!this.session) {
            this.response = 'Error [Session undefined]';
            return;
        }
        this.session.close()
            .then(() => {
                this.response = 'Session closed';
                delete this.session;
            })
            .catch(error => {
                this.response = 'Error [' + error.message + ']';
            });
    }

    startRecording() {
        console.log('Starting recording');
        this.OV.startRecording(this.sessionId)
            .then(recording => {
                this.response = 'Recording started [' + recording.id + ']';
            })
            .catch(error => {
                this.response = 'Error [' + error.message + ']';
            });
    }

    stopRecording() {
        console.log('Stopping recording');
        this.OV.stopRecording(this.recordingId)
            .then(recording => {
                this.response = 'Recording stopped [' + recording.id + ']';
            })
            .catch(error => {
                this.response = 'Error [' + error.message + ']';
            });
    }

    getRecording() {
        console.log('Getting recording');
        this.OV.getRecording(this.recordingId)
            .then(recording => {
                this.response = 'Recording got [' + recording.id + ']';
            })
            .catch(error => {
                this.response = 'Error [' + error.message + ']';
            });
    }

    listRecordings() {
        console.log('Listing recordings');
        this.OV.listRecordings()
            .then(recordingList => {
                let recordingIds = '';
                recordingList.forEach((rec, index) => {
                    recordingIds += rec.id;
                    if (index !== recordingList.length - 1) {
                        recordingIds += ', ';
                    }
                });
                this.response = 'Recording list [' + recordingIds + ']';
            })
            .catch(error => {
                this.response = 'Error [' + error.message + ']';
            });
    }

    deleteRecording() {
        console.log('Deleting recording');
        this.OV.deleteRecording(this.recordingId)
            .then(() => {
                this.response = 'Recording deleted';
            })
            .catch(error => {
                this.response = 'Error [' + error.message + ']';
            });
    }

}
