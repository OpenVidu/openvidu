import { AfterViewInit, Directive, ElementRef, HostListener, Input, OnDestroy } from '@angular/core';
import { OpenViduAngularConfigService } from '../../services/config/openvidu-angular.config.service';

/**
 * The **screenshareButton** directive allows show/hide the screenshare toolbar button.
 *
 * Default: `true`
 *
 * It can be used in the parent element {@link VideoconferenceComponent} specifying the name of the `toolbar` component:
 *
 * @example
 * <ov-videoconference [toolbarScreenshareButton]="false"></ov-videoconference>
 *
 * \
 * And it also can be used in the {@link ToolbarComponent}.
 * @example
 * <ov-toolbar [screenshareButton]="false"></ov-toolbar>
 */
@Directive({
	selector: 'ov-videoconference[toolbarScreenshareButton], ov-toolbar[screenshareButton]'
})
export class ToolbarScreenshareButtonDirective implements AfterViewInit, OnDestroy {
	/**
	 * @ignore
	 */
	@Input() set toolbarScreenshareButton(value: boolean) {
		this.screenshareValue = value;
		this.update(this.screenshareValue);
	}

	/**
	 * @ignore
	 */
	@Input() set screenshareButton(value: boolean) {
		this.screenshareValue = value;
		this.update(this.screenshareValue);
	}

	private screenshareValue: boolean = true;

	/**
	 * @ignore
	 */
	constructor(public elementRef: ElementRef, private libService: OpenViduAngularConfigService) {}

	ngAfterViewInit() {
		this.update(this.screenshareValue);
	}

	ngOnDestroy(): void {
		this.clear();
	}

	private clear() {
		this.screenshareValue = true;
		this.update(true);
	}

	private update(value: boolean) {
		if (this.libService.screenshareButton.getValue() !== value) {
			this.libService.screenshareButton.next(value);
		}
	}
}

/**
 * The **fullscreenButton** directive allows show/hide the fullscreen toolbar button.
 *
 * Default: `true`
 *
 * It can be used in the parent element {@link VideoconferenceComponent} specifying the name of the `toolbar` component:
 *
 * @example
 * <ov-videoconference [toolbarFullscreenButton]="false"></ov-videoconference>
 *
 * \
 * And it also can be used in the {@link ToolbarComponent}.
 * @example
 * <ov-toolbar [fullscreenButton]="false"></ov-toolbar>
 */
@Directive({
	selector: 'ov-videoconference[toolbarFullscreenButton], ov-toolbar[fullscreenButton]'
})
export class ToolbarFullscreenButtonDirective implements AfterViewInit, OnDestroy {
	/**
	 * @ignore
	 */
	@Input() set toolbarFullscreenButton(value: boolean) {
		this.fullscreenValue = value;
		this.update(this.fullscreenValue);
	}
	/**
	 * @ignore
	 */
	@Input() set fullscreenButton(value: boolean) {
		this.fullscreenValue = value;
		this.update(this.fullscreenValue);
	}

	private fullscreenValue: boolean = true;

	/**
	 * @ignore
	 */
	constructor(public elementRef: ElementRef, private libService: OpenViduAngularConfigService) {}

	ngAfterViewInit() {
		this.update(this.fullscreenValue);
	}
	ngOnDestroy(): void {
		this.clear();
	}
	private clear() {
		this.fullscreenValue = true;
		this.update(true);
	}

	private update(value: boolean) {
		if (this.libService.fullscreenButton.getValue() !== value) {
			this.libService.fullscreenButton.next(value);
		}
	}
}

/**
 * The **leaveButton** directive allows show/hide the leave toolbar button.
 *
 * Default: `true`
 *
 * It can be used in the parent element {@link VideoconferenceComponent} specifying the name of the `toolbar` component:
 *
 * @example
 * <ov-videoconference [toolbarLeaveButton]="false"></ov-videoconference>
 *
 * \
 * And it also can be used in the {@link ToolbarComponent}.
 * @example
 * <ov-toolbar [leaveButton]="false"></ov-toolbar>
 */
@Directive({
	selector: 'ov-videoconference[toolbarLeaveButton], ov-toolbar[leaveButton]'
})
export class ToolbarLeaveButtonDirective implements AfterViewInit, OnDestroy {
	/**
	 * @ignore
	 */
	@Input() set toolbarLeaveButton(value: boolean) {
		this.leaveValue = value;
		this.update(this.leaveValue);
	}
	/**
	 * @ignore
	 */
	@Input() set leaveButton(value: boolean) {
		this.leaveValue = value;
		this.update(this.leaveValue);
	}

	private leaveValue: boolean = true;

	/**
	 * @ignore
	 */
	constructor(public elementRef: ElementRef, private libService: OpenViduAngularConfigService) {}

	ngAfterViewInit() {
		this.update(this.leaveValue);
	}

	ngOnDestroy(): void {
		this.clear();
	}
	private clear() {
		this.leaveValue = true;
		this.update(true);
	}

	private update(value: boolean) {
		if (this.libService.leaveButton.getValue() !== value) {
			this.libService.leaveButton.next(value);
		}
	}
}

/**
 * The **participantsPanelButton** directive allows show/hide the participants panel toolbar button.
 *
 * Default: `true`
 *
 * It can be used in the parent element {@link VideoconferenceComponent} specifying the name of the `toolbar` component:
 *
 * @example
 * <ov-videoconference [toolbarParticipantsPanelButton]="false"></ov-videoconference>
 *
 * \
 * And it also can be used in the {@link ToolbarComponent}.
 * @example
 * <ov-toolbar [participantsPanelButton]="false"></ov-toolbar>
 */
@Directive({
	selector: 'ov-videoconference[toolbarParticipantsPanelButton], ov-toolbar[participantsPanelButton]'
})
export class ToolbarParticipantsPanelButtonDirective implements AfterViewInit, OnDestroy {
	/**
	 * @ignore
	 */
	@Input() set toolbarParticipantsPanelButton(value: boolean) {
		this.participantsPanelValue = value;
		this.update(this.participantsPanelValue);
	}

	/**
	 * @ignore
	 */
	@Input() set participantsPanelButton(value: boolean) {
		this.participantsPanelValue = value;
		this.update(this.participantsPanelValue);
	}

	private participantsPanelValue: boolean = true;

	/**
	 * @ignore
	 */
	constructor(public elementRef: ElementRef, private libService: OpenViduAngularConfigService) {}

	ngAfterViewInit() {
		this.update(this.participantsPanelValue);
	}

	ngOnDestroy(): void {
		this.clear();
	}
	private clear() {
		this.participantsPanelValue = true;
		this.update(true);
	}

	private update(value: boolean) {
		if (this.libService.participantsPanelButton.getValue() !== value) {
			this.libService.participantsPanelButton.next(value);
		}
	}
}

/**
 * The **chatPanelButton** directive allows show/hide the chat panel toolbar button.
 *
 * Default: `true`
 *
 * It can be used in the parent element {@link VideoconferenceComponent} specifying the name of the `toolbar` component:
 *
 * @example
 * <ov-videoconference [toolbarChatPanelButton]="false"></ov-videoconference>
 *
 * \
 * And it also can be used in the {@link ToolbarComponent}.
 * @example
 * <ov-toolbar [chatPanelButton]="false"></ov-toolbar>
 */
@Directive({
	selector: 'ov-videoconference[toolbarChatPanelButton], ov-toolbar[chatPanelButton]'
})
export class ToolbarChatPanelButtonDirective implements AfterViewInit, OnDestroy {
	/**
	 * @ignore
	 */
	@Input() set toolbarChatPanelButton(value: boolean) {
		this.toolbarChatPanelValue = value;
		this.update(this.toolbarChatPanelValue);
	}
	/**
	 * @ignore
	 */
	@Input() set chatPanelButton(value: boolean) {
		this.toolbarChatPanelValue = value;
		this.update(this.toolbarChatPanelValue);
	}
	private toolbarChatPanelValue: boolean = true;

	/**
	 * @ignore
	 */
	constructor(public elementRef: ElementRef, private libService: OpenViduAngularConfigService) {}

	ngAfterViewInit() {
		this.update(this.toolbarChatPanelValue);
	}

	ngOnDestroy(): void {
		this.clear();
	}
	private clear() {
		this.toolbarChatPanelValue = true;
		this.update(true);
	}

	private update(value: boolean) {
		if (this.libService.chatPanelButton.getValue() !== value) {
			this.libService.chatPanelButton.next(value);
		}
	}
}

/**
 * The **displaySessionName** directive allows show/hide the session name.
 *
 * Default: `true`
 *
 * It can be used in the parent element {@link VideoconferenceComponent} specifying the name of the `toolbar` component:
 *
 * @example
 * <ov-videoconference [toolbarDisplaySessionName]="false"></ov-videoconference>
 *
 * \
 * And it also can be used in the {@link ToolbarComponent}.
 * @example
 * <ov-toolbar [displaySessionName]="false"></ov-toolbar>
 */
@Directive({
	selector: 'ov-videoconference[toolbarDisplaySessionName], ov-toolbar[displaySessionName]'
})
export class ToolbarDisplaySessionNameDirective implements AfterViewInit, OnDestroy {
	/**
	 * @ignore
	 */
	@Input() set toolbarDisplaySessionName(value: boolean) {
		this.displaySessionValue = value;
		this.update(this.displaySessionValue);
	}
	/**
	 * @ignore
	 */
	@Input() set displaySessionName(value: boolean) {
		this.displaySessionValue = value;
		this.update(this.displaySessionValue);
	}

	private displaySessionValue: boolean = true;

	/**
	 * @ignore
	 */
	constructor(public elementRef: ElementRef, private libService: OpenViduAngularConfigService) {}

	ngAfterViewInit() {
		this.update(this.displaySessionValue);
	}

	ngOnDestroy(): void {
		this.clear();
	}
	private clear() {
		this.displaySessionValue = true;
		this.update(true);
	}

	private update(value: boolean) {
		if (this.libService.displaySessionName.getValue() !== value) {
			this.libService.displaySessionName.next(value);
		}
	}
}

/**
 * The **displayLogo** directive allows show/hide the branding logo.
 *
 * Default: `true`
 *
 * It can be used in the parent element {@link VideoconferenceComponent} specifying the name of the `toolbar` component:
 *
 * @example
 * <ov-videoconference [toolbarDisplayLogo]="false"></ov-videoconference>
 *
 * \
 * And it also can be used in the {@link ToolbarComponent}.
 * @example
 * <ov-toolbar [displayLogo]="false"></ov-toolbar>
 */
@Directive({
	selector: 'ov-videoconference[toolbarDisplayLogo], ov-toolbar[displayLogo]'
})
export class ToolbarDisplayLogoDirective implements AfterViewInit, OnDestroy {
	/**
	 * @ignore
	 */
	@Input() set toolbarDisplayLogo(value: boolean) {
		this.displayLogoValue = value;
		this.update(this.displayLogoValue);
	}
	/**
	 * @ignore
	 */
	@Input() set displayLogo(value: boolean) {
		this.displayLogoValue = value;
		this.update(this.displayLogoValue);
	}

	private displayLogoValue: boolean = true;

	/**
	 * @ignore
	 */
	constructor(public elementRef: ElementRef, private libService: OpenViduAngularConfigService) {}

	ngAfterViewInit() {
		this.update(this.displayLogoValue);
	}

	ngOnDestroy(): void {
		this.clear();
	}
	private clear() {
		this.displayLogoValue = true;
		this.update(true);
	}

	private update(value: boolean) {
		if (this.libService.displayLogo.getValue() !== value) {
			this.libService.displayLogo.next(value);
		}
	}
}

// * Private directives *

/**
 * Load default OpenVidu logo if custom one is not exist
 * @internal
 */
@Directive({
	selector: 'img[ovLogo]'
})
export class LogoDirective {
	defaultLogo =
		'data:image/png;base64,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';
	@Input() ovLogo: string;
	constructor(public elementRef: ElementRef) {}

	@HostListener('error')
	loadDefaultLogo() {
		const element = <HTMLImageElement>this.elementRef.nativeElement;
		element.src = this.ovLogo || this.defaultLogo;
	}
}
