import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { LocalRecorder } from 'openvidu-browser';

@Component({
    selector: 'app-local-recording-dialog',
    template: `
        <div mat-dialog-content>
            <div id="recorder-preview"></div>
        </div>
        <div mat-dialog-actions>
            <button id="close-record-btn" mat-button mat-dialog-close>Close</button>
            <button id="download-record-btn" mat-button (click)="recorder.download()">Download</button>
            <button id="upload-record-btn" mat-button [disabled]="endpoint == ''" (click)="uploadFile()">Upload to</button>
            <mat-form-field [style.font-size]="'14px'" [style.width]="'170px'">
                <input matInput name="endpoint" [(ngModel)]="endpoint">
            </mat-form-field>
            <mat-icon *ngIf="uploading" [ngClass]="iconClass"
            [style.margin-top]="'10px'" [style.color]="iconColor">{{uploadIcon}}</mat-icon>
        </div>
    `,
    styles: [`
        #quality-div {
            margin-top: 20px;
        }
    `],
})
export class LocalRecordingDialogComponent {

    public myReference: MatDialogRef<LocalRecordingDialogComponent>;

    recorder: LocalRecorder;

    uploading = false;
    endpoint = '';
    uploadIcon: string;
    iconColor: string;
    iconClass = '';

    constructor(@Inject(MAT_DIALOG_DATA) public data: any) {
        this.recorder = data.recorder;
    }

    close() {
        this.myReference.close();
    }

    uploadFile() {
        this.iconColor = 'black';
        this.iconClass = 'rotating';
        this.uploadIcon = 'cached';
        this.uploading = true;
        this.recorder.uploadAsBinary(this.endpoint)
            .then(() => {
                this.iconColor = 'green';
                this.uploadIcon = 'done';
                this.iconClass = '';
            })
            .catch((e) => {
                this.iconColor = 'red';
                this.uploadIcon = 'clear';
                this.iconClass = '';
            });
    }
}
