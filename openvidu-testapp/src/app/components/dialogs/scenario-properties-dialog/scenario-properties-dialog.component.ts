import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MAT_CHECKBOX_CLICK_ACTION } from '@angular/material';

import { PublisherProperties, OpenVidu } from 'openvidu-browser';

@Component({
    selector: 'app-scenario-properties-dialog',
    templateUrl: './scenario-properties-dialog.component.html',
    styleUrls: ['./scenario-properties-dialog.component.css'],
    providers: [
        { provide: MAT_CHECKBOX_CLICK_ACTION, useValue: 'noop' }
    ]
})
export class ScenarioPropertiesDialogComponent {

    OV: OpenVidu;
    publisherProperties: PublisherProperties;
    initValue: PublisherProperties;

    audioSource;
    videoSource;

    audioSourceAux;
    videoSourceAux;

    audioDevices = [];
    videoDevices = [];

    turnConf: string;
    manualTurnConf: RTCIceServer = { urls: [] };

    constructor(public dialogRef: MatDialogRef<ScenarioPropertiesDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data) {
        this.publisherProperties = data.publisherProperties;
        this.OV = new OpenVidu();
        this.initValue = Object.assign({}, this.publisherProperties);
        this.audioSource = typeof this.publisherProperties.audioSource === 'string' ? this.publisherProperties.audioSource : undefined;
        this.videoSource = typeof this.publisherProperties.videoSource === 'string' ? this.publisherProperties.videoSource : undefined;
        this.turnConf = data.turnConf;
        this.manualTurnConf = data.manualTurnConf;
    }

    toggleAudio(): void {
        if (this.publisherProperties.audioSource === false) {
            this.publisherProperties.audioSource = this.audioSource;
            this.audioSource = this.audioSourceAux;
        } else {
            this.audioSourceAux = this.audioSource;
            this.audioSource = undefined;
            this.publisherProperties.audioSource = false;
        }
    }

    toggleVideo(): void {
        if (this.publisherProperties.videoSource === false) {
            this.publisherProperties.videoSource = this.videoSource;
            this.videoSource = this.videoSourceAux;
        } else {
            this.videoSourceAux = this.videoSource;
            this.videoSource = undefined;
            this.publisherProperties.videoSource = false;
        }
    }

    setCloseValue() {
        if (typeof this.audioSource === 'string') {
            if (!!this.audioSource) {
                this.publisherProperties.audioSource = this.audioSource;
            } else {
                this.publisherProperties.audioSource = undefined;
            }
        }
        if (typeof this.videoSource === 'string') {
            if (!!this.videoSource) {
                this.publisherProperties.videoSource = this.videoSource;
            } else {
                this.publisherProperties.videoSource = undefined;
            }
        }
        return {
            publisherProperties: this.publisherProperties,
            turnConf: this.turnConf,
            manualTurnConf: this.manualTurnConf
        };
    }

    listAudioDevices() {
        this.audioDevices = [];
        this.OV.getDevices().then(devices => {
            devices.forEach(device => {
                if (device.kind === 'audioinput') {
                    this.audioDevices.push(device);
                }
            });
        });
    }

    listVideoDevices() {
        this.videoDevices = [];
        this.OV.getDevices().then(devices => {
            devices.forEach(device => {
                if (device.kind === 'videoinput') {
                    this.videoDevices.push(device);
                }
            });
        });
    }

}
