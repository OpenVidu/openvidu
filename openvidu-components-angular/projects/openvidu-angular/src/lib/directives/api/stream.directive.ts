import { AfterViewInit, Directive, ElementRef, Input, OnDestroy } from '@angular/core';
import { OpenViduAngularConfigService } from '../../services/config/openvidu-angular.config.service';

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
		if (this.libService.settingsButton.getValue() !== value) {
			this.libService.settingsButton.next(value);
		}
	}

	clear() {
		this.update(true);
	}
}
