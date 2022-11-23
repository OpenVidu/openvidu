import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-codec-used-dialog',
  template: `
        <div id="app-codec-dialog-container">
            <h2 id="codec-used-title-dialog" mat-dialog-title>Used Codec: <span id="video-codec-used">{{usedVideoCodec}}</span></h2>
            <button mat-button id="close-dialog-btn" [mat-dialog-close]="{}">CLOSE</button>
        </div>
    `,
  styles: [`
        #app-codec-dialog-container {
            text-align: center
        }
    `]
})
export class ShowCodecDialogComponent {

  usedVideoCodec;

  constructor(public dialogRef: MatDialogRef<ShowCodecDialogComponent>,
              @Inject(MAT_DIALOG_DATA) public data) {
    this.usedVideoCodec = data.usedVideoCodec;
  }
}
