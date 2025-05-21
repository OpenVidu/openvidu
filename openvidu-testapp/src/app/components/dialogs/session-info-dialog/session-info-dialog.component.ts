import {Component, Inject} from "@angular/core";
import {MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA, MatLegacyDialogRef as MatDialogRef} from "@angular/material/legacy-dialog";
import {Session as SessionAPI} from 'openvidu-node-client-v2compatibility';

@Component({
  selector: 'app-session-info-dialog',
  template: `
        <div id="app-session-info-dialog-container">
            <mat-form-field *ngIf="!!sessionAPIContent" id="response-text-area" appearance="fill">
              <textarea rows="30" id="session-text-area" [(ngModel)]="sessionAPIContent" matInput readonly></textarea>
            </mat-form-field>
        </div>
        <div id="app-session-info-dialog-container">
          <button mat-button id="close-dialog-btn" [mat-dialog-close]="{}">CLOSE</button>
        </div>
    `,
  styles: [`
        #app-session-info-dialog-container {
            text-align: center
        }
        #response-text-area {
          width: 100%;
        }
    `]
})
export class SessionInfoDialogComponent {

  sessionAPIContent: string;

  constructor(public dialogRef: MatDialogRef<SessionInfoDialogComponent>,
              @Inject(MAT_DIALOG_DATA) public data) {
    const sessionApi = data.sessionAPI;
    delete sessionApi.ov;
    this.sessionAPIContent = JSON.stringify(sessionApi, null, 4);
  }


}
