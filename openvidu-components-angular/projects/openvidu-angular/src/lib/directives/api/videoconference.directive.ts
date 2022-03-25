import { Directive, Input, ElementRef, OnDestroy, OnInit } from '@angular/core';
import { OpenViduAngularConfigService } from '../../services/config/openvidu-angular.config.service';

/**
 * The **minimal** directive applies a minimal UI hiding all controls except for cam and mic.
 *
 * It is only available for {@link VideoconferenceComponent}.
 *
 *  Default: `false`
 *
 * @example
 * <ov-videoconference [minimal]="true"></ov-videoconference>
 */
@Directive({
	selector: 'ov-videoconference[minimal]'
})
export class MinimalDirective implements OnDestroy {
	/**
	 * @ignore
	 */
	@Input() set minimal(value: boolean) {
		this.update(value);
	}

	/**
	 * @ignore
	 */
	constructor(public elementRef: ElementRef, private libService: OpenViduAngularConfigService) {}

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
		if (this.libService.minimal.getValue() !== value) {
			this.libService.minimal.next(value);
		}
	}
}

/**
 * The **participantName** directive sets the participant name. It can be useful for aplications which doesn't need the prejoin page.
 *
 * It is only available for {@link VideoconferenceComponent}.
 *
 * @example
 * <ov-videoconference [participantName]="'OpenVidu'"></ov-videoconference>
 */
@Directive({
	selector: 'ov-videoconference[participantName]'
})
export class ParticipantNameDirective implements OnInit {
	// Avoiding update participantName dynamically.
	// The participantName must be updated from UI
	/**
	 * @ignore
	 */
	@Input() participantName: string;

	/**
	 * @ignore
	 */
	constructor(public elementRef: ElementRef, private libService: OpenViduAngularConfigService) {}

	/**
	 * @ignore
	 */
	ngOnInit(): void {
		this.update(this.participantName);
	}

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
		this.update('');
	}

	/**
	 * @ignore
	 */
	update(value: string) {
		this.libService.participantName.next(value);
	}
}

/**
 * The **prejoin** directive allows show/hide the prejoin page for selecting media devices.
 *
 * It is only available for {@link VideoconferenceComponent}.
 *
 * Default: `true`
 *
 * @example
 * <ov-videoconference [prejoin]="false"></ov-videoconference>
 */
@Directive({
	selector: 'ov-videoconference[prejoin]'
})
export class PrejoinDirective implements OnDestroy {
	/**
	 * @ignore
	 */
	@Input() set prejoin(value: boolean) {
		this.update(value);
	}

	/**
	 * @ignore
	 */
	constructor(public elementRef: ElementRef, private libService: OpenViduAngularConfigService) {}

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
		this.update(true);
	}

	/**
	 * @ignore
	 */
	update(value: boolean) {
		if (this.libService.prejoin.getValue() !== value) {
			this.libService.prejoin.next(value);
		}
	}
}

/**
 * The **videoMuted** directive allows to join the session with camera muted/unmuted.
 *
 * It is only available for {@link VideoconferenceComponent}.
 *
 * Default: `false`
 *
 *
 * @example
 * <ov-videoconference [videoMuted]="true"></ov-videoconference>
 */
@Directive({
	selector: 'ov-videoconference[videoMuted]'
})
export class VideoMutedDirective implements OnDestroy {
	/**
	 * @ignore
	 */
	@Input() set videoMuted(value: boolean) {
		this.update(value);
	}

	/**
	 * @ignore
	 */
	constructor(public elementRef: ElementRef, private libService: OpenViduAngularConfigService) {}

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
		if (this.libService.videoMuted.getValue() !== value) {
			this.libService.videoMuted.next(value);
		}
	}
}

/**
 * The **audioMuted** directive allows to join the session with microphone muted/unmuted.
 *
 * It is only available for {@link VideoconferenceComponent}.
 *
 * Default: `false`
 *
 * @example
 * <ov-videoconference [audioMuted]="true"></ov-videoconference>
 */

@Directive({
	selector: 'ov-videoconference[audioMuted]'
})
export class AudioMutedDirective implements OnDestroy {

	/**
	 * @ignore
	 */
	@Input() set audioMuted(value: boolean) {
		this.update(value);
	}

	/**
	 * @ignore
	 */
	constructor(public elementRef: ElementRef, private libService: OpenViduAngularConfigService) {}

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
		if (this.libService.audioMuted.getValue() !== value) {
			this.libService.audioMuted.next(value);
		}
	}
}
