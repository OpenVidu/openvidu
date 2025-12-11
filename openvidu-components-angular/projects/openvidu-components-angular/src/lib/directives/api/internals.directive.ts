// * Internal directives *

import { AfterViewInit, Directive, ElementRef, HostListener, Input, OnDestroy, OnInit } from '@angular/core';
import { ParticipantModel } from '../../models/participant.model';
import { OpenViduComponentsConfigService } from '../../services/config/directive-config.service';

/**
 * Load default OpenVidu logo if custom one is not exist
 * @internal
 */
@Directive({
	selector: 'img[ovLogo]',
	standalone: true
})
export class FallbackLogoDirective implements OnInit {
	defaultLogo =
		'data:image/png;base64,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';
	assetsLogo = 'assets/images/logo.png';
	@Input() ovLogo: string;
	constructor(public elementRef: ElementRef) {}

	ngOnInit() {
		this.loadImage(this.ovLogo || this.assetsLogo);
	}

	private loadImage(url: string) {
		const element = this.elementRef.nativeElement as HTMLImageElement;
		const tempImage = new Image();

		const handleImageErrorOrLoad = (url: string) => {
			if (tempImage.width <= 1 && tempImage.height <= 1) {
				if (url === this.ovLogo) {
					this.loadImage(this.assetsLogo);
				} else if (url === this.assetsLogo) {
					element.src = this.defaultLogo;
				}
			} else {
				element.src = url;
			}
		};

		tempImage.onload = () => {
			handleImageErrorOrLoad(url);
		};

		tempImage.onerror = () => {
			handleImageErrorOrLoad(url);
		};
		tempImage.src = url;
	}
}

/**
 * @internal
 */
@Directive({
	selector: 'ov-layout[ovRemoteParticipants]',
	standalone: true
})
export class LayoutRemoteParticipantsDirective {
	private _ovRemoteParticipants: ParticipantModel[] | undefined;

	@Input() set ovRemoteParticipants(value: ParticipantModel[] | undefined) {
		this._ovRemoteParticipants = value;
		this.update(value);
	}
	constructor(
		public elementRef: ElementRef,
		private directiveService: OpenViduComponentsConfigService
	) {}

	ngOnDestroy(): void {
		this.clear();
	}

	ngAfterViewInit() {
		this.update(this._ovRemoteParticipants);
	}

	update(value: ParticipantModel[] | undefined) {
		this.directiveService.setLayoutRemoteParticipants(value);
	}

	clear() {
		this.update(undefined);
	}
}

/**
 * @internal
 */
@Directive({
	selector: 'ov-videoconference[brandingLogo], ov-toolbar[brandingLogo]',
	standalone: true
})
export class ToolbarBrandingLogoDirective implements AfterViewInit, OnDestroy {
	/**
	 * @ignore
	 */
	@Input() set brandingLogo(value: string) {
		this._brandingLogo = value;
		this.update(this._brandingLogo);
	}

	private _brandingLogo: string = '';

	/**
	 * @ignore
	 */
	constructor(
		public elementRef: ElementRef,
		private libService: OpenViduComponentsConfigService
	) {}

	ngAfterViewInit() {
		this.update(this._brandingLogo);
	}

	ngOnDestroy(): void {
		this.clear();
	}
	private clear() {
		this._brandingLogo = '';
		this.update(this._brandingLogo);
	}

	private update(value: string) {
		this.libService.updateToolbarConfig({ brandingLogo: value });
	}
}

/**
 * @internal
 */
@Directive({
	selector: 'ov-videoconference[prejoinDisplayParticipantName]',
	standalone: true
})
export class PrejoinDisplayParticipantName implements OnDestroy {
	/**
	 * @ignore
	 */
	@Input() set prejoinDisplayParticipantName(value: boolean) {
		this.update(value);
	}

	/**
	 * @ignore
	 */
	constructor(
		public elementRef: ElementRef,
		private libService: OpenViduComponentsConfigService
	) {}

	ngOnDestroy(): void {
		this.clear();
	}

	private clear() {
		this.update(true);
	}

	private update(value: boolean) {
		this.libService.updateGeneralConfig({ prejoinDisplayParticipantName: value });
	}
}

/**
 * @internal
 *
 * The **recordingActivityReadOnly** directive sets the recording activity panel to read-only mode.
 * In this mode, users can only view recordings without the ability to start, stop, or delete them.
 *
 * It is only available for {@link VideoconferenceComponent}.
 *
 * Default: `false`
 *
 * @example
 * <ov-videoconference [recordingActivityReadOnly]="true"></ov-videoconference>
 */
@Directive({
	selector: 'ov-videoconference[recordingActivityReadOnly]',
	standalone: true
})
export class RecordingActivityReadOnlyDirective implements OnDestroy {
	/**
	 * @ignore
	 */
	@Input() set recordingActivityReadOnly(value: boolean) {
		this.update(value);
	}

	/**
	 * @ignore
	 */
	constructor(
		public elementRef: ElementRef,
		private libService: OpenViduComponentsConfigService
	) {}

	/**
	 * @ignore
	 */
	ngOnDestroy(): void {
		this.clear();
	}

	/**
	 * @ignore
	 */
	clear() {
		this.update(false);
	}

	/**
	 * @ignore
	 */
	update(value: boolean) {
		this.libService.updateRecordingActivityConfig({ readOnly: value });
	}
}

/**
 *
 * @internal
 *
 * The **recordingActivityShowControls** directive allows to show/hide specific recording controls (play, download, delete, externalView).
 * You can pass an object with boolean properties to control which buttons are shown.
 *
 * It is only available for {@link VideoconferenceComponent}.
 *
 * Default: `{ play: true, download: true, delete: true, externalView: false }`
 *
 * @example
 * <ov-videoconference [recordingActivityShowControls]="{ play: false, download: true, delete: false }"></ov-videoconference>
 */
@Directive({
	selector: 'ov-videoconference[recordingActivityShowControls]',
	standalone: true
})
export class RecordingActivityShowControlsDirective implements OnDestroy {
	/**
	 * @ignore
	 */
	@Input() set recordingActivityShowControls(value: { play: boolean; download: boolean; delete: boolean; externalView: boolean }) {
		this.update(value);
	}

	/**
	 * @ignore
	 */
	constructor(
		public elementRef: ElementRef,
		private libService: OpenViduComponentsConfigService
	) {}

	/**
	 * @ignore
	 */
	ngOnDestroy(): void {
		this.clear();
	}

	/**
	 * @ignore
	 */
	clear() {
		this.update({ play: true, download: true, delete: true, externalView: false });
	}

	/**
	 * @ignore
	 */
	update(value: { play: boolean; download: boolean; delete: boolean; externalView: boolean }) {
		this.libService.updateRecordingActivityConfig({ showControls: value });
	}
}

/**
 * @internal
 * The **viewRecordingsButton** directive allows show/hide the view recordings toolbar button.
 *
 * Default: `false`
 *
 * It can be used in the parent element {@link VideoconferenceComponent} specifying the name of the `toolbar` component:
 *
 * @example
 * <ov-videoconference [toolbarViewRecordingsButton]="true"></ov-videoconference>
 *
 * \
 * And it also can be used in the {@link ToolbarComponent}.
 * @example
 * <ov-toolbar [viewRecordingsButton]="true"></ov-toolbar>
 *
 * When the button is clicked, it will fire the `onViewRecordingsClicked` event.
 */
@Directive({
	selector: 'ov-videoconference[toolbarViewRecordingsButton], ov-toolbar[viewRecordingsButton]',
	standalone: true
})
export class ToolbarViewRecordingsButtonDirective implements AfterViewInit, OnDestroy {
	/**
	 * @ignore
	 */
	@Input() set toolbarViewRecordingsButton(value: boolean) {
		this.viewRecordingsValue = value;
		this.update(this.viewRecordingsValue);
	}
	/**
	 * @ignore
	 */
	@Input() set viewRecordingsButton(value: boolean) {
		this.viewRecordingsValue = value;
		this.update(this.viewRecordingsValue);
	}

	private viewRecordingsValue: boolean = false;

	/**
	 * @ignore
	 */
	constructor(
		public elementRef: ElementRef,
		private libService: OpenViduComponentsConfigService
	) {}

	ngAfterViewInit() {
		this.update(this.viewRecordingsValue);
	}

	ngOnDestroy(): void {
		this.clear();
	}
	private clear() {
		this.viewRecordingsValue = false;
		this.update(true);
	}

	private update(value: boolean) {
		this.libService.updateToolbarConfig({ viewRecordings: value });
	}
}

/**
 * @internal
 *
 * The **recordingActivityStartStopRecordingButton** directive allows to show or hide the start/stop recording buttons in recording activity.
 *
 * Default: `true`
 *
 * It is only available for {@link VideoconferenceComponent}.
 *
 * @example
 * <ov-videoconference [recordingActivityStartStopRecordingButton]="false"></ov-videoconference>
 */
@Directive({
	selector: 'ov-videoconference[recordingActivityStartStopRecordingButton]',
	standalone: true
})
export class StartStopRecordingButtonsDirective implements OnDestroy {
	/**
	 * @ignore
	 */
	@Input() set recordingActivityStartStopRecordingButton(value: boolean) {
		this.update(value);
	}

	/**
	 * @ignore
	 */
	constructor(
		public elementRef: ElementRef,
		private libService: OpenViduComponentsConfigService
	) {}

	ngOnDestroy(): void {
		this.clear();
	}

	private clear() {
		this.update(true);
	}

	private update(value: boolean) {
		this.libService.updateRecordingActivityConfig({ startStopButton: value });
	}
}

/**
 * @internal
 * The **recordingActivityViewRecordingsButton** directive allows to show/hide the view recordings button in the recording activity panel.
 *
 * Default: `false`
 *
 * Can be used in {@link VideoconferenceComponent}.
 *
 * @example
 * <ov-videoconference [recordingActivityViewRecordingsButton]="true"></ov-videoconference>
 */
@Directive({
	selector: 'ov-videoconference[recordingActivityViewRecordingsButton]',
	standalone: true
})
export class RecordingActivityViewRecordingsButtonDirective implements AfterViewInit, OnDestroy {
	@Input() set recordingActivityViewRecordingsButton(value: boolean) {
		this._value = value;
		this.update(this._value);
	}

	private _value: boolean = false;

	constructor(
		public elementRef: ElementRef,
		private libService: OpenViduComponentsConfigService
	) {}

	ngAfterViewInit() {
		this.update(this._value);
	}

	ngOnDestroy(): void {
		this.clear();
	}

	private clear() {
		this._value = false;
		this.update(this._value);
	}

	private update(value: boolean) {
		this.libService.updateRecordingActivityConfig({ viewRecordingsButton: value });
	}
}

/**
 * @internal
 * The **recordingActivityShowRecordingsList** directive allows to show or hide the recordings list in the recording activity panel.
 *
 * Default: `true`
 *
 * Can be used in {@link VideoconferenceComponent}.
 *
 * @example
 * <ov-videoconference [recordingActivityShowRecordingsList]="false"></ov-videoconference>
 */
@Directive({
	selector: 'ov-videoconference[recordingActivityShowRecordingsList]',
	standalone: true
})
export class RecordingActivityShowRecordingsListDirective implements AfterViewInit, OnDestroy {
	@Input() set recordingActivityShowRecordingsList(value: boolean) {
		this._value = value;
		this.update(this._value);
	}

	private _value: boolean = true;

	constructor(
		public elementRef: ElementRef,
		private libService: OpenViduComponentsConfigService
	) {}

	ngAfterViewInit() {
		this.update(this._value);
	}

	ngOnDestroy(): void {
		this.clear();
	}

	private clear() {
		this._value = true;
		this.update(this._value);
	}

	private update(value: boolean) {
		this.libService.updateRecordingActivityConfig({ showRecordingsList: value });
	}
}

/**
 * @internal
 * The **toolbarRoomName** directive allows to display a specific room name in the toolbar.
 * If the room name is not set, it will display the room ID instead.
 *
 * Can be used in {@link ToolbarComponent}.
 *
 * @example
 * <ov-videoconference [toolbarRoomName]="roomName"></ov-videoconference>
 */
@Directive({
	selector: 'ov-videoconference[toolbarRoomName], ov-toolbar[roomName]',
	standalone: true
})
export class ToolbarRoomNameDirective implements AfterViewInit, OnDestroy {
	@Input() set toolbarRoomName(value: string | undefined) {
		this._roomName = value;
		this.updateRoomName();
	}

	@Input() set roomName(value: string | undefined) {
		this._roomName = value;
		this.updateRoomName();
	}

	private _roomName?: string;

	constructor(
		public elementRef: ElementRef,
		private libService: OpenViduComponentsConfigService
	) {}

	ngAfterViewInit() {
		this.updateRoomName();
	}

	ngOnDestroy(): void {
		this.clear();
	}

	private clear() {
		this._roomName = undefined;
		this.updateRoomName();
	}

	private updateRoomName() {
		this.libService.updateToolbarConfig({ roomName: this._roomName || '' });
	}
}

/**
 * @internal
 *
 * The **showThemeSelector** directive allows to enable or disable the theme selector control.
 * When disabled, users won't be able to change the UI theme.
 *
 * Default: `false`
 *
 * Usage:
 * <ov-videoconference [showThemeSelector]="false"></ov-videoconference>
 */
@Directive({
	selector: 'ov-videoconference[showThemeSelector]',
	standalone: true
})
export class ShowThemeSelectorDirective implements AfterViewInit, OnDestroy {
	@Input() set showThemeSelector(value: boolean) {
		this._value = value;
		this.update(this._value);
	}

	private _value: boolean = false;

	constructor(
		public elementRef: ElementRef,
		private libService: OpenViduComponentsConfigService
	) {}

	ngAfterViewInit() {
		this.update(this._value);
	}

	ngOnDestroy(): void {
		this.clear();
	}

	private clear() {
		this._value = true;
		this.update(this._value);
	}

	private update(value: boolean) {
		this.libService.updateGeneralConfig({ showThemeSelector: value });
	}
}

/**
 * @internal
 *
 * The **e2eeKey** directive allows to configure end-to-end encryption for the videoconference.
 * When provided, the room will be configured with E2EE using an external key provider.
 *
 * Default: `undefined`
 *
 * Usage:
 * <ov-videoconference [e2eeKey]="yourEncryptionKey"></ov-videoconference>
 */
@Directive({
	selector: 'ov-videoconference[e2eeKey]',
	standalone: true
})
export class E2EEKeyDirective implements AfterViewInit, OnDestroy {
	@Input() set e2eeKey(value: string | undefined) {
		this._value = value;
		this.update(this._value);
	}

	private _value: string | undefined;

	constructor(
		public elementRef: ElementRef,
		private libService: OpenViduComponentsConfigService
	) {}

	ngAfterViewInit() {
		this.update(this._value);
	}

	ngOnDestroy(): void {
		this.clear();
	}

	private clear() {
		this._value = undefined;
		this.update(this._value);
	}

	private update(value: string | undefined) {
		// Only update if value is valid (not undefined, not null, not empty string)
		const validValue = value && value.trim() !== '' ? value.trim() : undefined;
		this.libService.updateGeneralConfig({ e2eeKey: validValue });
	}
}
