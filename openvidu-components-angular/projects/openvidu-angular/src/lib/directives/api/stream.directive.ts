import { AfterViewInit, Directive, ElementRef, Input } from '@angular/core';
import { OpenViduAngularConfigService } from '../../services/config/openvidu-angular.config.service';

const VIDEOCONFERENCE_COMPONENT_NAME = 'ov-videoconference';
const OV_STREAM_CLASS = 'ovStream';

@Directive({
	selector: 'ov-videoconference[streamDisplayParticipantName], [displayParticipantName]'
})
export class StreamDisplayParticipantNameDirective implements AfterViewInit {
	@Input() set streamDisplayParticipantName(value: boolean) {
		this.displayParticipantNameValue = value;
		this.update(this.displayParticipantNameValue);
	}
	@Input() set displayParticipantName(value: boolean) {
		const element = <HTMLElement>this.elementRef.nativeElement;
		// Checking if element is injected inside of an element with ovToolbar class
		const isExternalComponentInput = element.parentElement?.classList.contains(OV_STREAM_CLASS);

		if (isExternalComponentInput) {
			this.displayParticipantNameValue = value;
			this.update(this.displayParticipantNameValue);
		}
	}

	displayParticipantNameValue: boolean;

	constructor(public elementRef: ElementRef, private libService: OpenViduAngularConfigService) {}

	ngAfterViewInit() {
		const element = <HTMLElement>this.elementRef.nativeElement;
		// Checking if 'screenButton' attribute is in the 'ov-videoconference' element
		const isGlobalInput = element.localName === VIDEOCONFERENCE_COMPONENT_NAME;
		// Checking if element is injected inside of an element with ovToolbar class
		const isExternalComponentInput = element.parentElement?.classList.contains(OV_STREAM_CLASS);

		if (isGlobalInput || isExternalComponentInput) {
			this.update(this.displayParticipantNameValue);
		}
	}

	update(value: boolean) {
		if (this.libService.displayParticipantName.getValue() !== value) {
			this.libService.displayParticipantName.next(value);
		}
	}
}

@Directive({
	selector: 'ov-videoconference[streamDisplayAudioDetection], [displayAudioDetection]'
})
export class StreamDisplayAudioDetectionDirective implements AfterViewInit {
	@Input() set streamDisplayAudioDetection(value: boolean) {
		this.displayAudioDetectionValue = value;
		this.update(this.displayAudioDetectionValue);
	}
	@Input() set displayAudioDetection(value: boolean) {
		const element = <HTMLElement>this.elementRef.nativeElement;
		// Checking if element is injected inside of an element with ovToolbar class
		const isExternalComponentInput = element.parentElement?.classList.contains(OV_STREAM_CLASS);

		if (isExternalComponentInput) {
			this.displayAudioDetectionValue = value;
			this.update(this.displayAudioDetectionValue);
		}
	}

	displayAudioDetectionValue: boolean;

	constructor(public elementRef: ElementRef, private libService: OpenViduAngularConfigService) {}

	ngAfterViewInit() {
		const element = <HTMLElement>this.elementRef.nativeElement;
		// Checking if 'screenButton' attribute is in the 'ov-videoconference' element
		const isGlobalInput = element.localName === VIDEOCONFERENCE_COMPONENT_NAME;
		// Checking if element is injected inside of an element with ovToolbar class
		const isExternalComponentInput = element.parentElement?.classList.contains(OV_STREAM_CLASS);

		if (isGlobalInput || isExternalComponentInput) {
			this.update(this.displayAudioDetectionValue);
		}
	}

	update(value: boolean) {
		if (this.libService.displayAudioDetection.getValue() !== value) {
			this.libService.displayAudioDetection.next(value);
		}
	}
}

@Directive({
	selector: 'ov-videoconference[streamSettingsButton], [settingsButton]'
})
export class StreamSettingsButtonDirective implements AfterViewInit {
	@Input() set streamSettingsButton(value: boolean) {
		this.settingsValue = value;
		this.update(this.settingsValue);
	}
	@Input() set settingsButton(value: boolean) {
		const element = <HTMLElement>this.elementRef.nativeElement;
		// Checking if element is injected inside of an element with ovToolbar class
		const isExternalComponentInput = element.parentElement?.classList.contains(OV_STREAM_CLASS);

		if (isExternalComponentInput) {
			this.settingsValue = value;
			this.update(this.settingsValue);
		}
	}

	settingsValue: boolean;

	constructor(public elementRef: ElementRef, private libService: OpenViduAngularConfigService) {}

	ngAfterViewInit() {
		const element = <HTMLElement>this.elementRef.nativeElement;
		// Checking if 'screenButton' attribute is in the 'ov-videoconference' element
		const isGlobalInput = element.localName === VIDEOCONFERENCE_COMPONENT_NAME;
		// Checking if element is injected inside of an element with ovToolbar class
		const isExternalComponentInput = element.parentElement?.classList.contains(OV_STREAM_CLASS);

		if (isGlobalInput || isExternalComponentInput) {
			this.update(this.settingsValue);
		}
	}

	update(value: boolean) {
		if (this.libService.settingsButton.getValue() !== value) {
			this.libService.settingsButton.next(value);
		}
	}
}
