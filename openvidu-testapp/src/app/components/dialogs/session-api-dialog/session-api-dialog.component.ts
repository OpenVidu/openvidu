import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';

import { OpenVidu as OpenViduAPI, Session as SessionAPI } from 'openvidu-node-client';

@Component({
    selector: 'app-session-api-dialog',
    template: `
    <div>
        <h2 mat-dialog-title>API REST</h2>
        <mat-dialog-content>
            <label class="label">Sessions</label>
            <button mat-button id="get-session-btn" (click)="fetchActiveConnections()">Fetch</button>
            <button mat-button id="list-sessions-btn" (click)="fetchActiveSessions()">Fetch all</button>
            <button mat-button id="close-session-btn" (click)="closeSession()">Close this session</button>
            <mat-form-field class="inner-text-input">
                <input matInput id="resource-id-field" placeholder="resourceId" [(ngModel)]="resourceId">
            </mat-form-field>
            <button mat-button id="force-disconnect-api-btn" (click)="forceDisconnect()" [disabled]="!resourceId">Force disconnect</button>
            <button mat-button id="force-unpublish-api-btn" (click)="forceUnpublish()" [disabled]="!resourceId">Force unpublish</button>
            <mat-divider></mat-divider>
            <label class="label">Recordings</label>
            <button mat-button id="start-recording-btn" (click)="startRecording()">Start recording</button>
            <button mat-button id="list-recording-btn" (click)="listRecordings()">List recordings</button>
            <mat-form-field class="inner-text-input">
                <input matInput id="recording-id-field" placeholder="recordingId" [(ngModel)]="recordingId">
            </mat-form-field>
            <button mat-button id="stop-recording-btn" (click)="stopRecording()" [disabled]="!recordingId">Stop recording</button>
            <button mat-button id="get-recording-btn" (click)="getRecording()" [disabled]="!recordingId">Get recording</button>
            <button mat-button id="delete-recording-btn" (click)="deleteRecording()" [disabled]="!recordingId">Delete recording</button>
            <mat-form-field *ngIf="!!response" id="response-text-area" appearance="fill">
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
        'mat-dialog-content button { height: 30px; line-height: 30px; padding-left: 12px; padding-right: 12px; display: inline-flex;}',
        '.label { display: block; font-size: 12px; color: rgba(0, 0, 0, 0.54); font-weight: 400; margin-bottom: 5px; margin-top: 13px}',
        '.inner-text-input { margin-left: 16px; }'
    ]
})
export class SessionApiDialogComponent {

    OV: OpenViduAPI;
    session: SessionAPI;
    sessionId: string;
    recordingId: string;
    resourceId: string;
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

    fetchActiveConnections() {
        console.log('Fetching session info');
        if (!this.session) {
            this.response = 'Error [Session undefined]';
            return;
        }
        this.session.fetch()
            .then(anyChange => {
                const resp = {};
                this.session.activeConnections.forEach(con => {
                    resp[con.connectionId] = [];
                    con.publishers.forEach(pub => {
                        resp[con.connectionId].push(pub);
                    });
                });
                this.response = 'Session info fetched %[' + JSON.stringify(resp) + ']%. Changes: ' + anyChange;
            })
            .catch(error => {
                this.response = 'Error [' + error.message + ']';
            });
    }

    fetchActiveSessions() {
        console.log('Fetching all sessions info');
        this.OV.fetch()
            .then(anyChange => {
                this.response = 'All sessions info fetched. Number: ' + this.OV.activeSessions.length + '. Changes: ' + anyChange;
            })
            .catch(error => {
                this.response = 'Error [' + error.message + ']';
            });
    }

    forceDisconnect() {
        console.log('Forcing disconnect');
        this.session.forceDisconnect(this.resourceId)
            .then(() => {
                this.response = 'User disconnected';
            })
            .catch(error => {
                this.response = 'Error [' + error.message + ']';
            });
    }

    forceUnpublish() {
        console.log('Forcing unpublish');
        this.session.forceUnpublish(this.resourceId)
            .then(() => {
                this.response = 'Stream unpublished';
            })
            .catch(error => {
                this.response = 'Error [' + error.message + ']';
            });
    }

}
