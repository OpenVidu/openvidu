import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';

import { Session, Stream } from 'openvidu-browser';

@Component({
    selector: 'app-session-api-dialog',
    templateUrl: './filter-dialog.component.html',
    styleUrls: ['./filter-dialog.component.css'],
})
export class FilterDialogComponent {

    session: Session;
    stream: Stream;

    filterType = 'GStreamerFilter';
    filterOptions = '{"command": "videobalance saturation=0.0"}';

    filterMethod = 'setElementProperty';
    filterParams = '{"propertyName":"saturation","propertyValue":"1.0"}';

    eventType: string;

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

    subFilterEvent() {
        console.log('Adding filter event');
        this.session.addFilterEventListener(this.stream, this.eventType)
            .then(() => {
                this.response = 'Filter event listener added';
            })
            .catch(error => {
                this.response = 'Error [' + error.message + ']';
            });
    }

    unsubFilterEvent() {
        console.log('Removing filter event');
        this.session.removeFilterEventListener(this.stream, this.eventType)
            .then(() => {
                this.response = 'Filter event listener removed';
            })
            .catch(error => {
                this.response = 'Error [' + error.message + ']';
            });
    }

}
