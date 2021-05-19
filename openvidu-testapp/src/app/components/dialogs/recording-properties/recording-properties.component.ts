import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Recording, RecordingLayout, RecordingProperties } from 'openvidu-node-client';

@Component({
    selector: 'app-recording-properties',
    templateUrl: './recording-properties.component.html',
    styleUrls: ['./recording-properties.component.css']
})
export class RecordingPropertiesComponent {

    recMode = Recording.OutputMode;
    recLayouts = RecordingLayout;

    getRecordingProperties: RecordingProperties;
    @Output() recordingPropertiesChange: EventEmitter<RecordingProperties> = new EventEmitter<RecordingProperties>();

    @Input()
    get recordingProperties(): RecordingProperties {
        return this.getRecordingProperties;
    }

    set recordingProperties(value: RecordingProperties) {
        this.getRecordingProperties = value;
        this.recordingPropertiesChange.emit(this.getRecordingProperties);
    }

    enumToArray(enumerator: any) {
        return Object.keys(enumerator);
    }

}
