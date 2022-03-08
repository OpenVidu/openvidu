import { Directive, Input, ElementRef, OnDestroy } from '@angular/core';
import { OpenViduAngularConfigService } from '../../services/config/openvidu-angular.config.service';

@Directive({
	selector: 'ov-videoconference[minimal]'
})
export class MinimalDirective implements OnDestroy {
	@Input() set minimal(value: boolean) {
		this.update(value);
	}
	constructor(public elementRef: ElementRef, private libService: OpenViduAngularConfigService) {}

	ngOnDestroy(): void {
		this.clear();
	}
	clear() {
		this.update(false);
	}
	update(value: boolean) {
		if (this.libService.minimal.getValue() !== value) {
			this.libService.minimal.next(value);
		}
	}
}

@Directive({
	selector: 'ov-videoconference[videoMuted]'
})
export class VideoMutedDirective implements OnDestroy {
	@Input() set videoMuted(value: boolean) {
		this.update(value);
	}
	constructor(public elementRef: ElementRef, private libService: OpenViduAngularConfigService) {}
	ngOnDestroy(): void {
		this.clear();
	}
	clear() {
		this.update(false);
	}
	update(value: boolean) {
		if (this.libService.videoMuted.getValue() !== value) {
			this.libService.videoMuted.next(value);
		}
	}
}

@Directive({
	selector: 'ov-videoconference[audioMuted]'
})
export class AudioMutedDirective implements OnDestroy {
	@Input() set audioMuted(value: boolean) {
		this.update(value);
	}
	constructor(public elementRef: ElementRef, private libService: OpenViduAngularConfigService) {}

	ngOnDestroy(): void {
		this.clear();
	}
	clear() {
		this.update(false);
	}
	update(value: boolean) {
		if (this.libService.audioMuted.getValue() !== value) {
			this.libService.audioMuted.next(value);
		}
	}
}
