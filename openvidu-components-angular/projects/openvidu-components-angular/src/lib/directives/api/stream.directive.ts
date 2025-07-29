import { AfterViewInit, Directive, ElementRef, Input, OnDestroy } from '@angular/core';
import { OpenViduComponentsConfigService } from '../../services/config/directive-config.service';

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
	selector: 'ov-videoconference[streamDisplayParticipantName], ov-stream[displayParticipantName]',
	standalone: false
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

	constructor(
		public elementRef: ElementRef,
		private libService: OpenViduComponentsConfigService
	) {}

	ngOnDestroy(): void {
		this.clear();
	}

	ngAfterViewInit() {
		this.update(this.displayParticipantNameValue);
	}

	update(value: boolean) {
		this.libService.updateStreamConfig({ displayParticipantName: value });
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
	selector: 'ov-videoconference[streamDisplayAudioDetection], ov-stream[displayAudioDetection]',
	standalone: false
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

	constructor(
		public elementRef: ElementRef,
		private libService: OpenViduComponentsConfigService
	) {}

	ngAfterViewInit() {
		this.update(this.displayAudioDetectionValue);
	}
	ngOnDestroy(): void {
		this.clear();
	}

	update(value: boolean) {
		this.libService.updateStreamConfig({ displayAudioDetection: value });
	}
	clear() {
		this.update(true);
	}
}

/**
 * The **videoControls** directive allows show/hide the participants video controls in stream component.
 *
 * Default: `true`
 *
 * It can be used in the parent element {@link VideoconferenceComponent} specifying the name of the `stream` component:
 *
 * @example
 * <ov-videoconference [streamVideoControls]="false"></ov-videoconference>
 *
 * \
 * And it also can be used in the {@link StreamComponent}.
 * @example
 * <ov-stream [videoControls]="false"></ov-stream>
 */
@Directive({
	selector: 'ov-videoconference[streamVideoControls], ov-stream[videoControls]',
	standalone: false
})
export class StreamVideoControlsDirective implements AfterViewInit, OnDestroy {
	@Input() set streamVideoControls(value: boolean) {
		this.videoControlsValue = value;
		this.update(this.videoControlsValue);
	}
	@Input() set videoControls(value: boolean) {
		this.videoControlsValue = value;
		this.update(this.videoControlsValue);
	}

	videoControlsValue: boolean;

	constructor(
		public elementRef: ElementRef,
		private libService: OpenViduComponentsConfigService
	) {}

	ngAfterViewInit() {
		this.update(this.videoControlsValue);
	}

	ngOnDestroy(): void {
		this.clear();
	}

	update(value: boolean) {
		this.libService.updateStreamConfig({ videoControls: value });
	}

	clear() {
		this.update(true);
	}
}
