import { Component, Inject } from '@angular/core';
import { MatDialog, MAT_DIALOG_DATA, MatDialogConfig, MatDialogRef } from '@angular/material';

import { Session } from 'openvidu-browser';
import { OpenVidu as OpenViduAPI } from 'openvidu-node-client';

@Component({
    selector: 'app-session-properties-dialog',
    template: `
    <div>
        <h2 mat-dialog-title>API REST</h2>
        <mat-dialog-content>
            <button mat-button (click)="startRecording()">Start recording</button>
            <button mat-button (click)="listRecordings()">List recordings</button>
            <mat-divider></mat-divider>
            <mat-form-field>
                <input matInput placeholder="recordingId" [(ngModel)]="recordingId">
            </mat-form-field>
            <button mat-button (click)="stopRecording()" [disabled]="!recordingId">Stop recording</button>
            <button mat-button (click)="getRecording()" [disabled]="!recordingId">Get recording</button>
            <button mat-button (click)="deleteRecording()" [disabled]="!recordingId">Delete recording</button>
            <mat-form-field *ngIf="!!response" id="response-text-area">
                <textarea [(ngModel)]="response" matInput readonly></textarea>
            </mat-form-field>
        </mat-dialog-content>
        <mat-dialog-actions>
            <button mat-button [mat-dialog-close]="undefined">CLOSE</button>
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
    sessionId: string;
    recordingId: string;
    response: string;

    constructor(public dialogRef: MatDialogRef<SessionApiDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data) {
        this.OV = data.openVidu;
        this.sessionId = data.sessionId;
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
