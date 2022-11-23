import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { FilterEvent, Session, Stream } from 'openvidu-browser';

@Component({
    selector: 'app-session-api-dialog',
    templateUrl: './other-stream-operations-dialog.component.html',
    styleUrls: ['./other-stream-operations-dialog.component.css'],
})
export class OtherStreamOperationsDialogComponent {

    session: Session;
    stream: Stream;
    filterEventHandler: (FilterEvent) => void;

    filterType = 'GStreamerFilter'; // 'VB:image';
    filterOptions = '{"command": "videobalance saturation=0.0"}'; // '{"url": "https://openvidu.io/img/vb/office.jpeg"}';

    filterMethod = 'setElementProperty'; // 'update';
    filterParams = '{"propertyName":"saturation","propertyValue":"1.0"}'; // '{"url": "http://localhost:4443/virtual-background/backgrounds/mountain.jpeg", "maskRadius":0.1, "backgroundCoverage":0.6, "lightWrapping":0.3}';

    eventType: string;

    sttLang: string = 'en-US';

    response: string;

    constructor(public dialogRef: MatDialogRef<OtherStreamOperationsDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data) {
        this.session = data.session;
        this.stream = data.stream;
        this.filterEventHandler = data.filterEventHandler;
    }

    applyFilter() {
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

    async subStt() {
        try {
            await this.session.subscribeToSpeechToText(this.stream, this.sttLang);
            this.response = 'Subscribed to STT';
        } catch (error) {
            this.response = 'Error [' + error.message + ']';
        }
    }

    async unsubStt() {
        try {
            await this.session.unsubscribeFromSpeechToText(this.stream);
            this.response = 'Unsubscribed from STT';
        } catch (error) {
            this.response = 'Error [' + error.message + ']';
        }
    }

}
