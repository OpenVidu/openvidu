import { Component } from '@angular/core';
import { MdDialogRef } from '@angular/material';

@Component({
    selector: 'app-join-session-dialog',
    template: `
        <div>
            <h1 md-dialog-title>
                Video options
            </h1>
            <form #dialogForm (ngSubmit)="joinSession()">
                <md-dialog-content>
                    <div id="quality-div">
                        <h5>Quality</h5>
                        <md-radio-group [(ngModel)]="quality" name="quality" id="quality">
                            <md-radio-button value='low' title="320x240">Low</md-radio-button>
                            <md-radio-button value='medium' title="640x480">Medium</md-radio-button>
                            <md-radio-button value='high' title="1280x720">High</md-radio-button>
                            <md-radio-button value='veryhigh' title="1920x1080">Very high</md-radio-button>
                        </md-radio-group>
                    </div>
                    <div id="join-div">
                        <h5>Enter with active...</h5>
                        <md-checkbox [(ngModel)]="joinWithVideo" name="joinWithVideo" id="joinWithVideo">Video</md-checkbox>
                        <md-checkbox [(ngModel)]="joinWithAudio" name="joinWithAudio">Audio</md-checkbox>
                    </div>
                </md-dialog-content>
                <md-dialog-actions>
                    <button md-button md-dialog-close>CANCEL</button>
                    <button md-button id="join-btn" type="submit">JOIN</button>
                </md-dialog-actions>
            </form>
        </div>
    `,
    styles: [`
        #quality-div {
            margin-top: 20px;
        }
        #join-div {
            margin-top: 25px;
            margin-bottom: 20px;
        }
        #quality-tag {
            display: block;
        }
        h5 {
            margin-bottom: 10px;
            text-align: left;
        }
        #joinWithVideo {
            margin-right: 50px;
        }
        md-dialog-actions {
            display: block;
        }
        #join-btn {
            float: right;
        }
    `],
})
export class JoinSessionDialogComponent {

    public myReference: MdDialogRef<JoinSessionDialogComponent>;
    private quality = 'medium';
    private joinWithVideo = true;
    private joinWithAudio = true;

    constructor() { }

    joinSession() {
        let cameraOptions = {
            audio: this.joinWithAudio,
            video: this.joinWithVideo,
            data: true,
            mediaConstraints: this.generateMediaConstraints()
        };
        this.myReference.close(cameraOptions);
    }

    generateMediaConstraints() {
        let mediaConstraints = {
            audio: true,
            video: {}
        }
        let w = 640;
        let h = 480;
        switch (this.quality) {
            case 'low':
                w = 320;
                h = 240;
                break;
            case 'medium':
                w = 640;
                h = 480;
                break;
            case 'high':
                w = 1280;
                h = 720;
                break;
            case 'veryhigh':
                w = 1920;
                h = 1080;
                break;
        }
        mediaConstraints.video['width'] = { exact: w };
        mediaConstraints.video['height'] = { exact: h };
        //mediaConstraints.video['frameRate'] = { ideal: Number((<HTMLInputElement>document.getElementById('frameRate')).value) };

        return mediaConstraints;
    }
}