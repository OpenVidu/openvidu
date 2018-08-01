import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';

import { Session, Stream } from 'openvidu-browser';

@Component({
    selector: 'app-session-api-dialog',
    template: `
    <div>
        <h2 mat-dialog-title>Filter configuration</h2>
        <mat-dialog-content>
            <label class="label">Apply filter</label>
            <button mat-button id="apply-filter-btn" (click)="apply()">Apply</button>
            <mat-form-field class="inner-text-input">
                <input matInput id="filter-type-field" placeholder="Type" [(ngModel)]="filterType">
            </mat-form-field>
            <mat-form-field class="inner-text-input">
                <input matInput id="filter-options-field" placeholder="Options" [(ngModel)]="filterOptions">
            </mat-form-field>
            <mat-divider></mat-divider>
            <label class="label">Exec filter method</label>
            <button mat-button id="exec-filter-btn" (click)="execMethod()">Exec</button>
            <mat-form-field class="inner-text-input">
                <input matInput id="filter-method-field" placeholder="Method" [(ngModel)]="filterMethod">
            </mat-form-field>
            <mat-form-field class="inner-text-input">
                <input matInput id="filter-params-field" placeholder="Params" [(ngModel)]="filterParams">
            </mat-form-field>
            <mat-divider></mat-divider>
            <label class="label">Remove filter</label>
            <button mat-button id="remove-filter-btn" (click)="remove()">Remove</button>
            <mat-form-field *ngIf="!!response" id="response-text-area" appearance="fill">
                <textarea id="api-response-text-area" [(ngModel)]="response" matInput readonly></textarea>
            </mat-form-field>
        </mat-dialog-content>
        <mat-dialog-actions>
            <button mat-button id="close-dialog-btn"  [mat-dialog-close]="{session: session}">CLOSE</button>
        </mat-dialog-actions>
    </div>
    `,
    styles: [
        '#response-text-area { width: 100%; color: #808080; }',
        '#response-text-area textarea { resize: none; }',
        'mat-dialog-content button, mat-divider { margin-bottom: 5px; }',
        'mat-dialog-content button { height: 30px; line-height: 30px; padding-left: 12px; padding-right: 12px; display: inline-flex;}',
        '.label { display: block; font-size: 12px; color: rgba(0, 0, 0, 0.54); font-weight: 400; margin-bottom: 5px; margin-top: 13px}',
    ]
})
export class FilterDialogComponent {

    session: Session;
    stream: Stream;

    filterType = 'GStreamerFilter';
    filterOptions = '{"command": "pitch pitch=1.2 tempo=1.0"}';

    filterMethod = 'setElementProperty';
    filterParams = '{"propertyName":"pitch","propertyValue":"0.8"}';

    response: string;

    constructor(public dialogRef: MatDialogRef<FilterDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data) {
        this.session = data.session;
        this.stream = data.stream;
    }

    apply() {
        console.log('Applying filter');
        this.session.applyFilter(this.stream, this.filterType, JSON.parse(this.filterOptions))
            .then(() => {
                this.response = 'Filter applied';
            })
            .catch(error => {
                this.response = 'Error [' + error.message + ']';
            });
    }

    execMethod() {
        console.log('Executing filter method');
        this.session.execFilterMethod(this.stream, this.filterMethod, this.filterParams)
            .then(recording => {
                this.response = 'Filter method executed';
            })
            .catch(error => {
                this.response = 'Error [' + error.message + ']';
            });
    }

    remove() {
        console.log('Removing filter');
        this.session.removeFilter(this.stream)
            .then(() => {
                this.response = 'Filter removed';
            })
            .catch(error => {
                this.response = 'Error [' + error.message + ']';
            });
    }

}
