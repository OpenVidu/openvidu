import { AfterViewInit, Directive, ElementRef, Input } from '@angular/core';
import { OpenViduAngularConfigService } from '../../services/config/openvidu-angular.config.service';

const VIDEOCONFERENCE_COMPONENT_NAME = 'ov-videoconference';
const OV_TOOLBAR_CLASS = 'ovToolbar';

@Directive({
	selector: 'ov-videoconference[toolbarScreenshareButton], [screenshareButton]'
})
export class ToolbarScreenshareButtonDirective implements AfterViewInit {
	@Input() set toolbarScreenshareButton(value: boolean) {
		this.screenshareValue = value;
		this.update(this.screenshareValue);
	}
	@Input() set screenshareButton(value: boolean) {
		const element = <HTMLElement>this.elementRef.nativeElement;
		// Checking if element is injected inside of an element with ovToolbar class
		const isExternalComponentInput = element.parentElement?.classList.contains(OV_TOOLBAR_CLASS);

		if (isExternalComponentInput) {
			this.screenshareValue = value;
			this.update(this.screenshareValue);
		}
	}

	screenshareValue: boolean = true;

	constructor(public elementRef: ElementRef, private libService: OpenViduAngularConfigService) {}

	ngAfterViewInit() {
		const element = <HTMLElement>this.elementRef.nativeElement;
		// We need to distinguish where the directive is being used
		// Checking if 'screenButton' attribute is in the 'ov-videoconference' element
		const isGlobalInput = element.localName === VIDEOCONFERENCE_COMPONENT_NAME;
		// Checking if element is injected inside of an element with ovToolbar class
		const isExternalComponentInput = element.parentElement?.classList.contains(OV_TOOLBAR_CLASS);

		if (isGlobalInput || isExternalComponentInput) {
			this.update(this.screenshareValue);
		}
	}

	update(value: boolean) {
		if (this.libService.screenshareButton.getValue() !== value) {
			this.libService.screenshareButton.next(value);
		}
	}
}

@Directive({
	selector: 'ov-videoconference[toolbarFullscreenButton], [fullscreenButton]'
})
export class ToolbarFullscreenButtonDirective implements AfterViewInit {
	@Input() set toolbarFullscreenButton(value: boolean) {
		this.fullscreenValue = value;
		this.update(this.fullscreenValue);
	}
	@Input() set fullscreenButton(value: boolean) {
		const element = <HTMLElement>this.elementRef.nativeElement;
		// Checking if element is injected inside of an element with ovToolbar class
		const isExternalComponentInput = element.parentElement?.classList.contains(OV_TOOLBAR_CLASS);

		if (isExternalComponentInput) {
			this.fullscreenValue = value;
			this.update(this.fullscreenValue);
		}
	}

	fullscreenValue: boolean = true;

	constructor(public elementRef: ElementRef, private libService: OpenViduAngularConfigService) {}

	ngAfterViewInit() {
		const element = <HTMLElement>this.elementRef.nativeElement;
		// We need to distinguish where the directive is being used
		// Checking if 'screenButton' attribute is in the 'ov-videoconference' element
		const isGlobalInput = element.localName === VIDEOCONFERENCE_COMPONENT_NAME;
		// Checking if element is injected inside of an element with ovToolbar class
		const isExternalComponentInput = element.parentElement?.classList.contains(OV_TOOLBAR_CLASS);

		if (isGlobalInput || isExternalComponentInput) {
			this.update(this.fullscreenValue);
		}
	}

	update(value: boolean) {
		if (this.libService.fullscreenButton.getValue() !== value) {
			this.libService.fullscreenButton.next(value);
		}
	}
}

@Directive({
	selector: 'ov-videoconference[toolbarLeaveButton], [leaveButton]'
})
export class ToolbarLeaveButtonDirective implements AfterViewInit {
	@Input() set toolbarLeaveButton(value: boolean) {
		this.leaveValue = value;
		this.update(this.leaveValue);
	}
	@Input() set leaveButton(value: boolean) {
		const element = <HTMLElement>this.elementRef.nativeElement;
		// Checking if element is injected inside of an element with ovToolbar class
		const isExternalComponentInput = element.parentElement?.classList.contains(OV_TOOLBAR_CLASS);

		if (isExternalComponentInput) {
			this.leaveValue = value;
			this.update(this.leaveValue);
		}
	}

	leaveValue: boolean;

	constructor(public elementRef: ElementRef, private libService: OpenViduAngularConfigService) {}

	ngAfterViewInit() {
		const element = <HTMLElement>this.elementRef.nativeElement;
		// Checking if 'screenButton' attribute is in the 'ov-videoconference' element
		const isGlobalInput = element.localName === VIDEOCONFERENCE_COMPONENT_NAME;
		// Checking if element is injected inside of an element with ovToolbar class
		const isExternalComponentInput = element.parentElement?.classList.contains(OV_TOOLBAR_CLASS);

		if (isGlobalInput || isExternalComponentInput) {
			this.update(this.leaveValue);
		}
	}

	update(value: boolean) {
		if (this.libService.leaveButton.getValue() !== value) {
			this.libService.leaveButton.next(value);
		}
	}
}

@Directive({
	selector: 'ov-videoconference[toolbarParticipantsPanelButton], [participantsPanelButton]'
})
export class ToolbarParticipantsPanelButtonDirective implements AfterViewInit {
	@Input() set toolbarParticipantsPanelButton(value: boolean) {
		this.participantsPanelValue = value;
		this.update(this.participantsPanelValue);
	}
	@Input() set participantsPanelButton(value: boolean) {
		const element = <HTMLElement>this.elementRef.nativeElement;
		// Checking if element is injected inside of an element with ovToolbar class
		const isExternalComponentInput = element.parentElement?.classList.contains(OV_TOOLBAR_CLASS);

		if (isExternalComponentInput) {
			this.participantsPanelValue = value;
			this.update(this.participantsPanelValue);
		}
	}

	participantsPanelValue: boolean;

	constructor(public elementRef: ElementRef, private libService: OpenViduAngularConfigService) {}

	ngAfterViewInit() {
		const element = <HTMLElement>this.elementRef.nativeElement;
		// Checking if 'screenButton' attribute is in the 'ov-videoconference' element
		const isGlobalInput = element.localName === VIDEOCONFERENCE_COMPONENT_NAME;
		// Checking if element is injected inside of an element with ovToolbar class
		const isExternalComponentInput = element.parentElement?.classList.contains(OV_TOOLBAR_CLASS);

		if (isGlobalInput || isExternalComponentInput) {
			this.update(this.participantsPanelValue);
		}
	}

	update(value: boolean) {
		if (this.libService.participantsPanelButton.getValue() !== value) {
			this.libService.participantsPanelButton.next(value);
		}
	}
}

@Directive({
	selector: 'ov-videoconference[toolbarChatPanelButton], [chatPanelButton]'
})
export class ToolbarChatPanelButtonDirective implements AfterViewInit {
	@Input() set toolbarChatPanelButton(value: boolean) {
		this.toolbarChatPanelValue = value;
		this.update(this.toolbarChatPanelValue);
	}
	@Input() set chatPanelButton(value: boolean) {
		const element = <HTMLElement>this.elementRef.nativeElement;
		// Checking if element is injected inside of an element with ovToolbar class
		const isExternalComponentInput = element.parentElement?.classList.contains(OV_TOOLBAR_CLASS);

		if (isExternalComponentInput) {
			this.toolbarChatPanelValue = value;
			this.update(this.toolbarChatPanelValue);
		}
	}
	toolbarChatPanelValue: boolean;

	constructor(public elementRef: ElementRef, private libService: OpenViduAngularConfigService) {}

	ngAfterViewInit() {
		const element = <HTMLElement>this.elementRef.nativeElement;
		// Checking if 'screenButton' attribute is in the 'ov-videoconference' element
		const isGlobalInput = element.localName === VIDEOCONFERENCE_COMPONENT_NAME;
		// Checking if element is injected inside of an element with ovToolbar class
		const isExternalComponentInput = element.parentElement?.classList.contains(OV_TOOLBAR_CLASS);

		if (isGlobalInput || isExternalComponentInput) {
			this.update(this.toolbarChatPanelValue);
		}
	}

	update(value: boolean) {
		if (this.libService.chatPanelButton.getValue() !== value) {
			this.libService.chatPanelButton.next(value);
		}
	}
}

@Directive({
	selector: 'ov-videoconference[toolbarDisplaySessionName], [displaySessionName]'
})
export class ToolbarDisplaySessionNameDirective implements AfterViewInit {
	@Input() set toolbarDisplaySessionName(value: boolean) {
		this.displaySessionValue = value;
		this.update(this.displaySessionValue);
	}
	@Input() set displaySessionName(value: boolean) {
		const element = <HTMLElement>this.elementRef.nativeElement;
		// Checking if element is injected inside of an element with ovToolbar class
		const isExternalComponentInput = element.parentElement?.classList.contains(OV_TOOLBAR_CLASS);

		if (isExternalComponentInput) {
			this.displaySessionValue = value;
			this.update(this.displaySessionValue);
		}
	}

	displaySessionValue: boolean;

	constructor(public elementRef: ElementRef, private libService: OpenViduAngularConfigService) {}

	ngAfterViewInit() {
		const element = <HTMLElement>this.elementRef.nativeElement;
		// Checking if 'screenButton' attribute is in the 'ov-videoconference' element
		const isGlobalInput = element.localName === VIDEOCONFERENCE_COMPONENT_NAME;
		// Checking if element is injected inside of an element with ovToolbar class
		const isExternalComponentInput = element.parentElement?.classList.contains(OV_TOOLBAR_CLASS);

		if (isGlobalInput || isExternalComponentInput) {
			this.update(this.displaySessionValue);
		}
	}

	update(value: boolean) {
		if (this.libService.displaySessionName.getValue() !== value) {
			this.libService.displaySessionName.next(value);
		}
	}
}

@Directive({
	selector: 'ov-videoconference[toolbarDisplayLogo], [displayLogo]'
})
export class ToolbarDisplayLogoDirective implements AfterViewInit {
	@Input() set toolbarDisplayLogo(value: boolean) {
		this.displayLogoValue = value;
		this.update(this.displayLogoValue);
	}
	@Input() set displayLogo(value: boolean) {
		const element = <HTMLElement>this.elementRef.nativeElement;
		// Checking if element is injected inside of an element with ovToolbar class
		const isExternalComponentInput = element.parentElement?.classList.contains(OV_TOOLBAR_CLASS);

		if (isExternalComponentInput) {
			this.displayLogoValue = value;
			this.update(this.displayLogoValue);
		}
	}

	displayLogoValue: boolean;

	constructor(public elementRef: ElementRef, private libService: OpenViduAngularConfigService) {}

	ngAfterViewInit() {
		const element = <HTMLElement>this.elementRef.nativeElement;
		// Checking if 'screenButton' attribute is in the 'ov-videoconference' element
		const isGlobalInput = element.localName === VIDEOCONFERENCE_COMPONENT_NAME;
		// Checking if element is injected inside of an element with ovToolbar class
		const isExternalComponentInput = element.parentElement?.classList.contains(OV_TOOLBAR_CLASS);

		if (isGlobalInput || isExternalComponentInput) {
			this.update(this.displayLogoValue);
		}
	}

	update(value: boolean) {
		if (this.libService.displayLogo.getValue() !== value) {
			this.libService.displayLogo.next(value);
		}
	}
}
