import { Directive, AfterViewInit, OnDestroy, Input, ElementRef } from '@angular/core';
import { RecordingInfo } from '../../models/recording.model';
import { OpenViduComponentsConfigService } from '../../services/config/directive-config.service';

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
export class AdminDashboardRecordingsListDirective implements AfterViewInit, OnDestroy {

	@Input() set recordingsList(value: RecordingInfo[]) {
		this.recordingsValue = value;
		this.update(this.recordingsValue);
	}

	recordingsValue: RecordingInfo [] = [];

	constructor(public elementRef: ElementRef, private libService: OpenViduComponentsConfigService) {}

	ngAfterViewInit() {
		this.update(this.recordingsValue);
	}
	ngOnDestroy(): void {
		this.clear();
	}
	clear() {
		this.recordingsValue = [];
		this.update([]);
	}

	update(value: RecordingInfo[]) {
		if (this.libService.getAdminRecordingsList() !== value) {
			this.libService.setAdminRecordingsList(value);
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
export class AdminLoginErrorDirective implements AfterViewInit, OnDestroy {

	@Input() set error(value: any) {
		this.errorValue = value;
		this.update(this.errorValue);
	}

	errorValue: any = null;

	constructor(public elementRef: ElementRef, private libService: OpenViduComponentsConfigService) {}

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
		if (this.libService.getAdminLoginError() !== value) {
			this.libService.setAdminLoginError(value);
		}
	}
}

