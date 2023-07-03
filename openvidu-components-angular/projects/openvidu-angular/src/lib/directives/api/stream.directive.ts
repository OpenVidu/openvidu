import { AfterViewInit, Directive, ElementRef, Input, OnDestroy } from '@angular/core';
import { OpenViduAngularConfigService } from '../../services/config/openvidu-angular.config.service';


/**
 * The **frameRate** directive allows initialize the publisher with a specific frame rate in stream component.
 *
 * Default: `30`
 *
 * It can be used in the parent element {@link VideoconferenceComponent} specifying the name of the `stream` component:
 *
 * @example
 * <ov-videoconference [streamFrameRate]="10"></ov-videoconference>
 *
 * \
 * And it also can be used in the {@link StreamComponent}.
 * @example
 * <ov-stream [frameRate]="10"></ov-stream>
 */
@Directive({
	selector: 'ov-videoconference[streamFrameRate], ov-stream[frameRate]'
})
export class StreamFrameRateDirective implements AfterViewInit, OnDestroy {
	@Input() set streamFrameRate(value: number) {
		this._frameRate = value;
		this.update(this._frameRate);
	}
	@Input() set frameRate(value: number) {
		this._frameRate = value;
		this.update(this._frameRate);
	}

	_frameRate: number;

	constructor(public elementRef: ElementRef, private libService: OpenViduAngularConfigService) {}

	ngOnDestroy(): void {
		this.clear();
	}

	ngAfterViewInit() {
		this.update(this._frameRate);
	}

	update(value: number) {
		if (this.libService.streamFrameRate.getValue() !== value) {
			this.libService.streamFrameRate.next(value);
		}
	}

	clear() {
		this.update(30);
	}
}

/**
 * The **resolution** directive allows to set a specific participant resolution in stream component.
 *
 * Default: `640x480`
 *
 * It can be used in the parent element {@link VideoconferenceComponent} specifying the name of the `stream` component:
 *
 * @example
 * <ov-videoconference [streamResolution]="'320x240'"></ov-videoconference>
 *
 * \
 * And it also can be used in the {@link StreamComponent}.
 * @example
 * <ov-stream [resolution]="'320x240'"></ov-stream>
 */
@Directive({
	selector: 'ov-videoconference[streamResolution], ov-stream[resolution]'
})
export class StreamResolutionDirective implements AfterViewInit, OnDestroy {
	@Input() set streamResolution(value: string) {
		this._resolution = value;
		this.update(this._resolution);
	}
	@Input() set resolution(value: string) {
		this._resolution = value;
		this.update(this._resolution);
	}

	_resolution: string;

	constructor(public elementRef: ElementRef, private libService: OpenViduAngularConfigService) {}

	ngOnDestroy(): void {
		this.clear();
	}

	ngAfterViewInit() {
		this.update(this._resolution);
	}

	update(value: string) {
		if (this.libService.streamResolution.getValue() !== value) {
			this.libService.streamResolution.next(value);
		}
	}

	clear() {
		this.update('640x480');
	}
}
/**
 * The **displayParticipantName** directive allows show/hide the participants name in stream component.
 *
 * Default: `true`
 *
 * It can be used in the parent element {@link VideoconferenceComponent} specifying the name of the `stream` component:
 *
 * @example
 * <ov-videoconference [streamDisplayParticipantName]="false"></ov-videoconference>
 *
 * \
 * And it also can be used in the {@link StreamComponent}.
 * @example
 * <ov-stream [displayParticipantName]="false"></ov-stream>
 */
@Directive({
	selector: 'ov-videoconference[streamDisplayParticipantName], ov-stream[displayParticipantName]'
})
export class StreamDisplayParticipantNameDirective implements AfterViewInit, OnDestroy {
	@Input() set streamDisplayParticipantName(value: boolean) {
		this.displayParticipantNameValue = value;
		this.update(this.displayParticipantNameValue);
	}
	@Input() set displayParticipantName(value: boolean) {
		this.displayParticipantNameValue = value;
		this.update(this.displayParticipantNameValue);
	}

	displayParticipantNameValue: boolean;

	constructor(public elementRef: ElementRef, private libService: OpenViduAngularConfigService) {}

	ngOnDestroy(): void {
		this.clear();
	}

	ngAfterViewInit() {
		this.update(this.displayParticipantNameValue);
	}

	update(value: boolean) {
		if (this.libService.displayParticipantName.getValue() !== value) {
			this.libService.displayParticipantName.next(value);
		}
	}

	clear() {
		this.update(true);
	}
}

/**
 * The **displayAudioDetection** directive allows show/hide the participants audio detection in stream component.
 *
 * Default: `true`
 *
 * It can be used in the parent element {@link VideoconferenceComponent} specifying the name of the `stream` component:
 *
 * @example
 * <ov-videoconference [streamDisplayAudioDetection]="false"></ov-videoconference>
 *
 * \
 * And it also can be used in the {@link StreamComponent}.
 * @example
 * <ov-stream [displayAudioDetection]="false"></ov-stream>
 */
@Directive({
	selector: 'ov-videoconference[streamDisplayAudioDetection], ov-stream[displayAudioDetection]'
})
export class StreamDisplayAudioDetectionDirective implements AfterViewInit, OnDestroy {
	@Input() set streamDisplayAudioDetection(value: boolean) {
		this.displayAudioDetectionValue = value;
		this.update(this.displayAudioDetectionValue);
	}
	@Input() set displayAudioDetection(value: boolean) {
		this.displayAudioDetectionValue = value;
		this.update(this.displayAudioDetectionValue);
	}

	displayAudioDetectionValue: boolean;

	constructor(public elementRef: ElementRef, private libService: OpenViduAngularConfigService) {}

	ngAfterViewInit() {
		this.update(this.displayAudioDetectionValue);
	}
	ngOnDestroy(): void {
		this.clear();
	}

	update(value: boolean) {
		if (this.libService.displayAudioDetection.getValue() !== value) {
			this.libService.displayAudioDetection.next(value);
		}
	}
	clear() {
		this.update(true);
	}
}

/**
 * The **settingsButton** directive allows show/hide the participants settings button in stream component.
 *
 * Default: `true`
 *
 * It can be used in the parent element {@link VideoconferenceComponent} specifying the name of the `stream` component:
 *
 * @example
 * <ov-videoconference [streamSettingsButton]="false"></ov-videoconference>
 *
 * \
 * And it also can be used in the {@link StreamComponent}.
 * @example
 * <ov-stream [settingsButton]="false"></ov-stream>
 */
@Directive({
	selector: 'ov-videoconference[streamSettingsButton], ov-stream[settingsButton]'
})
export class StreamSettingsButtonDirective implements AfterViewInit, OnDestroy {
	@Input() set streamSettingsButton(value: boolean) {
		this.settingsValue = value;
		this.update(this.settingsValue);
	}
	@Input() set settingsButton(value: boolean) {
		this.settingsValue = value;
		this.update(this.settingsValue);
	}

	settingsValue: boolean;

	constructor(public elementRef: ElementRef, private libService: OpenViduAngularConfigService) {}

	ngAfterViewInit() {
		this.update(this.settingsValue);
	}

	ngOnDestroy(): void {
		this.clear();
	}

	update(value: boolean) {
		if (this.libService.streamSettingsButton.getValue() !== value) {
			this.libService.streamSettingsButton.next(value);
		}
	}

	clear() {
		this.update(true);
	}
}
