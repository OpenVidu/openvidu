import { Component } from '@angular/core';
import { MdDialogRef } from '@angular/material';

@Component({
    selector: 'app-credentials-dialog',
    template: `
        <div>
            <h1 md-dialog-title>
                Insert your secret
            </h1>
            <form #dialogForm (ngSubmit)="testVideo()">
                <md-dialog-content>
                    <md-input-container>
                        <input mdInput name="secret" type="password" [(ngModel)]="secret">
                    </md-input-container>
                </md-dialog-content>
                <md-dialog-actions>
                    <button md-button md-dialog-close>CANCEL</button>
                    <button md-button id="join-btn" type="submit">TEST</button>
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
export class CredentialsDialogComponent {

    public myReference: MdDialogRef<CredentialsDialogComponent>;
    secret: string;

    constructor() { }

    testVideo() {
        this.myReference.close(this.secret);
    }
}
