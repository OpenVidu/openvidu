import { Directive, AfterViewInit, OnDestroy, Input, ElementRef } from '@angular/core';
import { RecordingInfo } from '../../models/recording.model';
import { OpenViduAngularConfigService } from '../../services/config/openvidu-angular.config.service';

/**
 * The **recordingsList** directive allows show all recordings saved in your OpenVidu deployment in {@link AdminDashboardComponent}.
 *
 * Default: `[]`
 *
 * @example
 * <ov-admin-dashboard [recordingsList]="recordings"></ov-admin-dashboard>
 *
 */
@Directive({
	selector: 'ov-admin-dashboard[recordingsList]'
})
export class AdminRecordingsListDirective implements AfterViewInit, OnDestroy {

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
		if (this.libService.adminRecordingsList.getValue() !== value) {
			this.libService.adminRecordingsList.next(value);
		}
	}
}

/**
 * The **error** directive allows show the authentication error in {@link AdminLoginComponent}.
 *
 * Default: `null`
 *
 * @example
 * <ov-admin-login [error]="error"></ov-admin-login>
 *
 */
 @Directive({
	selector: 'ov-admin-login[error]'
})
export class AdminLoginDirective implements AfterViewInit, OnDestroy {

	@Input() set error(value: any) {
		this.errorValue = value;
		this.update(this.errorValue);
	}

	errorValue: any = null;

	constructor(public elementRef: ElementRef, private libService: OpenViduAngularConfigService) {}

	ngAfterViewInit() {
		this.update(this.errorValue);
	}
	ngOnDestroy(): void {
		this.clear();
	}
	clear() {
		this.errorValue = null;
		this.update(null);
	}

	update(value: any) {
		if (this.libService.adminLoginError.getValue() !== value) {
			this.libService.adminLoginError.next(value);
		}
	}
}

