import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';

import { Session, Stream, FilterEvent } from 'openvidu-browser';

@Component({
    selector: 'app-session-api-dialog',
    templateUrl: './filter-dialog.component.html',
    styleUrls: ['./filter-dialog.component.css'],
})
export class FilterDialogComponent {

    session: Session;
    stream: Stream;
    filterEventHandler: (FilterEvent) => void;

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
        this.filterEventHandler = data.filterEventHandler;
    }

    apply() {
        console.log('Applying filter');
        this.stream.applyFilter(this.filterType, JSON.parse(this.filterOptions))
            .then(() => {
                this.response = 'Filter applied';
            })
            .catch(error => {
                this.response = 'Error [' + error.message + ']';
            });
    }

    execMethod() {
        if (!!this.stream.filter) {
            console.log('Executing filter method');
            this.stream.filter.execMethod(this.filterMethod, this.filterParams)
                .then(() => {
                    this.response = 'Filter method executed';
                })
                .catch(error => {
                    this.response = 'Error [' + error.message + ']';
                });
        } else {
            console.warn('No filter applied to stream ' + this.stream.streamId);
            this.response = 'Error [Stream ' + this.stream.streamId + ' has no filter applied in session]';
        }
    }

    remove() {
        console.log('Removing filter');
        this.stream.removeFilter()
            .then(() => {
                this.response = 'Filter removed';
            })
            .catch(error => {
                this.response = 'Error [' + error.message + ']';
            });
    }

    subFilterEvent() {
        console.log('Adding filter event');
        if (!!this.stream.filter) {
            this.stream.filter.addEventListener(this.eventType, (event: FilterEvent) => {
                this.filterEventHandler(event);
            })
                .then(() => {
                    this.response = 'Filter event listener added';
                })
                .catch(error => {
                    this.response = 'Error [' + error.message + ']';
                });
        } else {
            this.response = 'Error [Stream ' + this.stream.streamId + ' has no filter applied in session]';
        }
    }

    unsubFilterEvent() {
        console.log('Removing filter event');
        if (!!this.stream.filter) {
            this.stream.filter.removeEventListener(this.eventType)
                .then(() => {
                    this.response = 'Filter event listener removed';
                })
                .catch(error => {
                    this.response = 'Error [' + error.message + ']';
                });
        } else {
            this.response = 'Error [Stream ' + this.stream.streamId + ' has no filter applied in session]';
        }
    }

}
