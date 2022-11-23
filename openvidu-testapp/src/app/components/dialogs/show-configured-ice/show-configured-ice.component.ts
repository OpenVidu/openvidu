import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';


@Component({
  selector: 'app-ice-configured-dialog',
  template: `
        <div id="app-ice-configured-dialog-container">
            <ul id="ice-server-list">
              <div class="ice-server" *ngFor="let iceServer of iceServerList; index as i">
                <li id="ice-server-{{i}}">
                  <p>
                  ICE Server URL: <span id="ice-server-url-{{i}}">{{iceServer.urls}}</span> -
                  Username: <span *ngIf="iceServer.username" id="ice-server-username-{{i}}">{{iceServer.username}}</span> -
                  Credential: <span *ngIf="iceServer.credential" id="ice-server-credential-{{i}}">{{iceServer.credential}}</span>
                  </p>
                </li>
              </div>
              <button mat-button id="close-dialog-btn" [mat-dialog-close]="{}">CLOSE</button>
          </ul>
        </div>
    `,
  styles: [`
        #app-ice-configured-dialog-container {
            text-align: center
        }
    `]
})
export class ShowIceServerConfiguredDialog {

  iceServerList: RTCIceServer[]

  constructor(public dialogRef: MatDialogRef<ShowIceServerConfiguredDialog>,
    @Inject(MAT_DIALOG_DATA) public data) {
    this.iceServerList = data.iceServerList;
  }
}
