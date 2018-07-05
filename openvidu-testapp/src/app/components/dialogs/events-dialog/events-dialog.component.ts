import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';

@Component({
    selector: 'app-events-dialog',
    template: `
        <h2 mat-dialog-title>{{target}} events</h2>
        <mat-dialog-content>
            <mat-slide-toggle [(ngModel)]="checkAll" (change)="updateAll()" [color]="'warn'"><i>ALL</i></mat-slide-toggle>
            <mat-divider></mat-divider>
            <mat-slide-toggle *ngFor="let event of eventNamesArray()"
                [(ngModel)]="eventCollection[event]"
                [color]="'warn'">{{event}}
            </mat-slide-toggle>
        </mat-dialog-content>
        <mat-dialog-actions>
            <button mat-button id="close-dialog-btn" [mat-dialog-close]="eventCollection">CLOSE</button>
        </mat-dialog-actions>
    `,
    styles: [
        'mat-dialog-content { display: inline; }',
        'mat-divider { margin-top: 5px; margin-bottom: 5px }'
    ]
})
export class EventsDialogComponent {

    target = '';
    checkAll = true;
    eventCollection: any = {};

    constructor(public dialogRef: MatDialogRef<EventsDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data) {
        this.target = data.target;
        this.eventCollection = data.eventCollection;
    }

    updateAll() {
        Object.keys(this.eventCollection).forEach(key => {
            this.eventCollection[key] = this.checkAll;
        });
    }

    eventNamesArray(): String[] {
        return Object.keys(this.eventCollection);
    }

}
