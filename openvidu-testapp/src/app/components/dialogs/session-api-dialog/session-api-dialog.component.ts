import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { ConnectionProperties, OpenVidu as OpenViduAPI, OpenViduRole, RecordingProperties, Session as SessionAPI } from 'openvidu-node-client';

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
    connectionId: string;
    streamId: string;
    response: string;

    recordingProperties: RecordingProperties;
    recPropertiesIcon = 'add_circle';
    showRecProperties = false;

    broadcastProperties: RecordingProperties;
    broadcastPropertiesIcon = 'add_circle';
    showBroadcastProperties = false;
    broadcastUrl: string = 'rtmp://172.17.0.1/live';

    numCustomIceServers = 0;
    configuredCustomIceServers = []

    openviduRoles = OpenViduRole;
    connectionProperties: ConnectionProperties = {
        record: true,
        role: OpenViduRole.PUBLISHER,
        data: ''
    };

    constructor(public dialogRef: MatDialogRef<SessionApiDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data) {
        this.OV = data.openVidu;
        this.session = data.session;
        this.sessionId = data.sessionId;
        this.recordingProperties = data.recordingProperties;
        if (!this.recordingProperties.mediaNode) {
            this.recordingProperties.mediaNode = { id: '' };
        }
        this.broadcastProperties = data.broadcastProperties;
        if (!this.broadcastProperties.mediaNode) {
            this.broadcastProperties.mediaNode = { id: '' };
        }
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
        const finalRecordingProperties = {
            name: this.recordingProperties.name,
            outputMode: this.recordingProperties.outputMode,
            recordingLayout: this.recordingProperties.recordingLayout,
            customLayout: this.recordingProperties.customLayout,
            resolution: this.recordingProperties.resolution,
            frameRate: this.recordingProperties.frameRate,
            hasAudio: this.recordingProperties.hasAudio,
            hasVideo: this.recordingProperties.hasVideo,
            ignoreFailedStreams: this.recordingProperties.ignoreFailedStreams,
            shmSize: this.recordingProperties.shmSize,
            mediaNode: !this.recordingProperties.mediaNode.id ? undefined : this.recordingProperties.mediaNode
        }
        this.OV.startRecording(this.sessionId, finalRecordingProperties)
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
                const resp = {
                    activeConnections: <any>[],
                    sessionId: this.session.sessionId,
                    createdAt: this.session.createdAt,
                    properties: this.session.properties,
                    recording: this.session.recording
                };
                this.session.activeConnections.forEach(con => {
                    const publishers = <any>[];
                    con.publishers.forEach(pub => {
                        publishers.push(pub);
                    });
                    resp.activeConnections.push({
                        connectionId: con.connectionId,
                        activeAt: con.activeAt,
                        clientData: con.clientData,
                        createdAt: con.createdAt,
                        ip: con.ip,
                        platform: con.platform,
                        status: con.status,
                        publishers
                    })
                });
                this.response = 'Session info fetched ' + JSON.stringify(resp) + '. Changes: ' + anyChange;
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
        this.session.forceDisconnect(this.connectionId)
            .then(() => {
                this.response = 'User disconnected';
            })
            .catch(error => {
                this.response = 'Error [' + error.message + ']';
            });
    }

    forceUnpublish() {
        console.log('Forcing unpublish');
        this.session.forceUnpublish(this.streamId)
            .then(() => {
                this.response = 'Stream unpublished';
            })
            .catch(error => {
                this.response = 'Error [' + error.message + ']';
            });
    }

    createConnection() {
        console.log('Creating connection');
        this.connectionProperties.customIceServers = this.configuredCustomIceServers;
        this.session.createConnection(this.connectionProperties)
            .then(connection => {
                this.response = 'Connection created: ' + JSON.stringify(connection);
            })
            .catch(error => {
                this.response = 'Error [' + error.message + ']';
            });
    }

    updateConnection() {
        console.log('Updating connection');
        this.session.updateConnection(this.connectionId, this.connectionProperties)
            .then(modifiedConnection => {
                this.response = 'Connection updated: ' + JSON.stringify({
                    role: modifiedConnection.connectionProperties.role,
                    record: modifiedConnection.connectionProperties.record,
                    data: modifiedConnection.connectionProperties.data
                });
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
        this.showBroadcastProperties = false;
        this.broadcastPropertiesIcon = 'add_circle';
    }

    toggleBroadcastProperties() {
        this.showBroadcastProperties = !this.showBroadcastProperties;
        this.broadcastPropertiesIcon = this.showBroadcastProperties ? 'remove_circle' : 'add_circle';
        this.showRecProperties = false;
        this.recPropertiesIcon = 'add_circle';
    }

    changedNumIceServers(numIceServers: number) {
        // Save Previous Ice Servers
        let previousIceServers = [];
        for (let i = 0; i < this.configuredCustomIceServers.length; i++) {
            previousIceServers.push(this.configuredCustomIceServers[i]);
        }

        // Fill empty ice servers
        this.configuredCustomIceServers = []
        for (let i = 1; i <= numIceServers; i++) {
            this.configuredCustomIceServers.push({});
        }

        // Add previous items
        for (let i = 0; i < previousIceServers.length && i < this.configuredCustomIceServers.length; i++) {
            this.configuredCustomIceServers[0] = previousIceServers[0];
        }
    }

    startBroadcast() {
        console.log('Starting broadcast');
        const finalBroadcastProperties = {
            recordingLayout: this.broadcastProperties.recordingLayout,
            customLayout: this.broadcastProperties.customLayout,
            resolution: this.broadcastProperties.resolution,
            frameRate: this.broadcastProperties.frameRate,
            hasAudio: this.broadcastProperties.hasAudio,
            shmSize: this.broadcastProperties.shmSize,
            mediaNode: !this.broadcastProperties.mediaNode.id ? undefined : this.broadcastProperties.mediaNode
        }
        this.OV.startBroadcast(this.sessionId, this.broadcastUrl, finalBroadcastProperties)
            .then(() => {
                this.response = 'Broadcast started';
            })
            .catch(error => {
                this.response = 'Error [' + error.message + ']';
            });
    }

    stopBroadcast() {
        this.OV.stopBroadcast(this.sessionId)
            .then(() => {
                this.response = 'Broadcast stopped';
            })
            .catch(error => {
                this.response = 'Error [' + error.message + ']';
            });
    }

}
