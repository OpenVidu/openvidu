import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';

import { OpenVidu as OpenViduAPI, Session as SessionAPI, Recording, RecordingProperties, RecordingLayout } from 'openvidu-node-client';

@Component({
    selector: 'app-session-api-dialog',
    templateUrl: './session-api-dialog.component.html',
    styleUrls: ['./session-api-dialog.component.css']
})
export class SessionApiDialogComponent {

    OV: OpenViduAPI;
    session: SessionAPI;
    sessionId: string;
    recordingId: string;
    resourceId: string;
    response: string;

    recordingProperties: RecordingProperties;
    recMode = Recording.OutputMode;
    recLayouts = RecordingLayout;
    customLayout = '';
    recPropertiesIcon = 'add_circle';
    showRecProperties = false;

    constructor(public dialogRef: MatDialogRef<SessionApiDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data) {
        this.OV = data.openVidu;
        this.session = data.session;
        this.sessionId = data.sessionId;
        this.recordingProperties = data.recordingProperties;
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
        this.OV.startRecording(this.sessionId, this.recordingProperties)
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

    enumToArray(enumerator: any) {
        return Object.keys(enumerator);
    }

    toggleRecProperties() {
        this.showRecProperties = !this.showRecProperties;
        this.recPropertiesIcon = this.showRecProperties ? 'remove_circle' : 'add_circle';
    }

}
