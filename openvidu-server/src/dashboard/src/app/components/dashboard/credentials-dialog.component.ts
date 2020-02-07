import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
    selector: 'app-credentials-dialog',
    template: `
        <div>
            <h1 mat-dialog-title>
                Insert your secret
            </h1>
            <form #dialogForm (ngSubmit)="testVideo()">
                <mat-dialog-content>
                    <mat-form-field>
                        <input matInput name="secret" type="password" [(ngModel)]="secret" required>
                    </mat-form-field>
                </mat-dialog-content>
                <mat-dialog-actions>
                    <button mat-button mat-dialog-close>CANCEL</button>
                    <button mat-button id="join-btn" type="submit">TEST</button>
                </mat-dialog-actions>
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
        mat-dialog-actions {
            display: block;
        }
        #join-btn {
            float: right;
        }
    `],
})
export class CredentialsDialogComponent {

    public myReference: MatDialogRef<CredentialsDialogComponent>;
    secret: string;

    constructor() { }

    testVideo() {
        this.myReference.close(this.secret);
    }
}
