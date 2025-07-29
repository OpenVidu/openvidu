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
	selector: 'ov-admin-dashboard[recordingsList]',
	standalone: false
})
export class AdminDashboardRecordingsListDirective implements AfterViewInit, OnDestroy {
	@Input() set recordingsList(value: RecordingInfo[]) {
		this.recordingsValue = value;
		this.update(this.recordingsValue);
	}

	recordingsValue: RecordingInfo[] = [];

	constructor(
		public elementRef: ElementRef,
		private libService: OpenViduComponentsConfigService
	) {}

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
		this.libService.updateAdminConfig({ recordingsList: value });
	}
}

/**
 * The **navbarTitle** directive allows customize the title of the navbar in {@link AdminLoginComponent}.
 *
 * Default: `'OpenVidu Call Dashboard'`
 *
 * @example
 * <ov-admin-dashboard [navbarTitle]="'My Dashboard'"></ov-admin-dashboard>
 *
 */
@Directive({
	selector: 'ov-admin-dashboard[navbarTitle]',
	standalone: false
})
export class AdminDashboardTitleDirective implements AfterViewInit, OnDestroy {
	@Input() set navbarTitle(value: string) {
		this.navbarTitleValue = value;
		this.update(this.navbarTitleValue);
	}

	navbarTitleValue: string = 'OpenVidu Dashboard';

	constructor(
		public elementRef: ElementRef,
		private libService: OpenViduComponentsConfigService
	) {}

	ngAfterViewInit() {
		this.update(this.navbarTitleValue);
	}
	ngOnDestroy(): void {
		this.clear();
	}
	clear() {
		this.navbarTitleValue = 'OpenVidu Dashboard';
		this.update(null);
	}

	update(value: any) {
		this.libService.updateAdminConfig({ dashboardTitle: value });
	}
}

/**
 * The **navbarTitle** directive allows customize the title of the navbar in {@link AdminLoginComponent}.
 *
 * Default: `'OpenVidu Call Dashboard'`
 *
 * @example
 * <ov-admin-login [navbarTitle]="'My login'"></ov-admin-login>
 *
 */
@Directive({
	selector: 'ov-admin-login[navbarTitle]',
	standalone: false
})
export class AdminLoginTitleDirective implements AfterViewInit, OnDestroy {
	@Input() set navbarTitle(value: any) {
		this.navbarTitleValue = value;
		this.update(this.navbarTitleValue);
	}

	navbarTitleValue: any = null;

	constructor(
		public elementRef: ElementRef,
		private libService: OpenViduComponentsConfigService
	) {}

	ngAfterViewInit() {
		this.update(this.navbarTitleValue);
	}
	ngOnDestroy(): void {
		this.clear();
	}
	clear() {
		this.navbarTitleValue = null;
		this.update(null);
	}

	update(value: any) {
		this.libService.updateAdminConfig({ loginTitle: value });
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
	selector: 'ov-admin-login[error]',
	standalone: false
})
export class AdminLoginErrorDirective implements AfterViewInit, OnDestroy {
	@Input() set error(value: any) {
		this.errorValue = value;
		this.update(this.errorValue);
	}

	errorValue: any = null;

	constructor(
		public elementRef: ElementRef,
		private libService: OpenViduComponentsConfigService
	) {}

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
		this.libService.updateAdminConfig({ loginError: value });
	}
}
