import { Directive, AfterViewInit, OnDestroy, Input, ElementRef } from '@angular/core';
import { RecordingInfo } from '../../models/recording.model';
import { OpenViduAngularConfigService } from '../../services/config/openvidu-angular.config.service';

/**
 * The **recordingsList** directive allows show the recordings available for the session in {@link RecordingActivityComponent}.
 *
 * Default: `[]`
 *
 * It can be used in the parent element {@link VideoconferenceComponent} specifying the name of the `recordingActivity` component:
 *
 * @example
 * <ov-videoconference [recordingActivityRecordingsList]="list"></ov-videoconference>
 *
 * \
 * And it also can be used in the {@link RecordingActivityComponent}.
 * @example
 * <ov-recording-activity [recordingsList]="list"></ov-recording-activity>
 */
@Directive({
	selector: 'ov-videoconference[recordingActivityRecordingsList], ov-recording-activity[recordingsList]'
})
export class RecordingActivityRecordingsListDirective implements AfterViewInit, OnDestroy {
	@Input() set recordingActivityRecordingsList(value: RecordingInfo[]) {
		this.recordingsValue = value;
		this.update(this.recordingsValue);
	}
	@Input() set recordingsList(value: RecordingInfo[]) {
		this.recordingsValue = value;
		this.update(this.recordingsValue);
	}

	recordingsValue: RecordingInfo [] = [];

	constructor(public elementRef: ElementRef, private libService: OpenViduAngularConfigService) {}

	ngAfterViewInit() {
		this.update(this.recordingsValue);
	}
	ngOnDestroy(): void {
		this.clear();
	}
	clear() {
		this.recordingsValue = null;
		this.update(null);
	}

	update(value: RecordingInfo[]) {
		if (this.libService.recordingsList.getValue() !== value) {
			this.libService.recordingsList.next(value);
		}
	}
}

/**
 * The **recordingError** directive allows to show any possible error with the recording in the {@link RecordingActivityComponent}.
 *
 * Default: `[]`
 *
 * It can be used in the parent element {@link VideoconferenceComponent} specifying the name of the `recordingActivity` component:
 *
 * @example
 * <ov-videoconference [recordingActivityRecordingError]="error"></ov-videoconference>
 *
 * \
 * And it also can be used in the {@link RecordingActivityComponent}.
 * @example
 * <ov-recording-activity [recordingError]="error"></ov-recording-activity>
 */
 @Directive({
	selector: 'ov-videoconference[recordingActivityRecordingError], ov-recording-activity[recordingError]'
})
export class RecordingActivityRecordingErrorDirective implements AfterViewInit, OnDestroy {
	@Input() set recordingActivityRecordingError(value: any) {
		this.recordingErrorValue = value;
		this.update(this.recordingErrorValue);
	}
	@Input() set recordingError(value: any) {
		this.recordingErrorValue = value;
		this.update(this.recordingErrorValue);
	}

	recordingErrorValue: RecordingInfo [] = [];

	constructor(public elementRef: ElementRef, private libService: OpenViduAngularConfigService) {}

	ngAfterViewInit() {
		this.update(this.recordingErrorValue);
	}
	ngOnDestroy(): void {
		this.clear();
	}
	clear() {
		this.recordingErrorValue = null;
		this.update(null);
	}

	update(value: any) {
		if (this.libService.recordingError.getValue() !== value) {
			this.libService.recordingError.next(value);
		}
	}
}
