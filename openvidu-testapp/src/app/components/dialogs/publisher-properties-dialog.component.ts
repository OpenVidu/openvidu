import { Component, Inject } from '@angular/core';
import { MatDialog, MAT_DIALOG_DATA, MatDialogConfig, MatDialogRef, MAT_CHECKBOX_CLICK_ACTION } from '@angular/material';

import { SessionProperties, MediaMode, RecordingMode, RecordingLayout } from 'openvidu-node-client';
import { PublisherProperties, OpenVidu } from 'openvidu-browser';

@Component({
    selector: 'app-publisher-properties-dialog',
    templateUrl: './publisher-properties-dialog.component.html',
    styleUrls: ['./publisher-properties-dialog.component.css'],
    providers: [
        { provide: MAT_CHECKBOX_CLICK_ACTION, useValue: 'noop' }
    ]
})
export class PublisherPropertiesDialogComponent {

    OV: OpenVidu;
    publisherProperties: PublisherProperties;
    initValue: PublisherProperties;

    audioSource;
    videoSource;

    audioSourceAux;
    videoSourceAux;

    audioDevices = [];
    videoDevices = [];

    private mediaMode = MediaMode;
    private recordingMode = RecordingMode;
    private defaultRecordingLayout = RecordingLayout;

    constructor(public dialogRef: MatDialogRef<PublisherPropertiesDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: PublisherProperties) {
        this.publisherProperties = data;
        this.OV = new OpenVidu();
        this.initValue = Object.assign({}, this.publisherProperties);
        this.audioSource = typeof this.publisherProperties.audioSource === 'string' ? this.publisherProperties.audioSource : undefined;
        this.videoSource = typeof this.publisherProperties.videoSource === 'string' ? this.publisherProperties.videoSource : undefined;
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

    setCloseValue(): PublisherProperties {
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
        return this.publisherProperties;
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
