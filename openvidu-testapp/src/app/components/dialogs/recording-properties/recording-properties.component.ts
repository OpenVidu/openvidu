import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Recording, RecordingLayout, RecordingProperties } from 'openvidu-node-client';

@Component({
    selector: 'app-recording-properties',
    templateUrl: './recording-properties.component.html',
    styleUrls: ['./recording-properties.component.css']
})
export class RecordingPropertiesComponent {

    @Input()
    isBroadcast = false;

    @Input()
    recordingProperties: RecordingProperties;

    recMode = Recording.OutputMode;
    recLayouts = RecordingLayout;

    enumToArray(enumerator: any) {
        return Object.keys(enumerator);
    }

}
