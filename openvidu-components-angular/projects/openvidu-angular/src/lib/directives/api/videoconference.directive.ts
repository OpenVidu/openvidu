import { Directive, Input, ElementRef } from '@angular/core';
import { OpenViduAngularConfigService } from '../../services/config/openvidu-angular.config.service';

@Directive({
	selector: 'ov-videoconference[minimal]'
})
export class MinimalDirective {
	@Input() set minimal(value: boolean) {
		this.libService.minimal.next(value);
	}
	constructor(public elementRef: ElementRef, private libService: OpenViduAngularConfigService) {}
}

@Directive({
	selector: 'ov-videoconference[videoMuted]'
})
export class VideoMutedDirective {
	@Input() set videoMuted(value: boolean) {
		this.libService.videoMuted.next(value);
	}
	constructor(public elementRef: ElementRef, private libService: OpenViduAngularConfigService) {}
}

@Directive({
	selector: 'ov-videoconference[audioMuted]'
})
export class AudioMutedDirective {
	@Input() set audioMuted(value: boolean) {
		this.libService.audioMuted.next(value);
	}
	constructor(public elementRef: ElementRef, private libService: OpenViduAngularConfigService) {}
}