import { AfterViewInit, Directive, ElementRef, Input, OnDestroy } from '@angular/core';
import { StreamingError } from '../../models/streaming.model';
import { OpenViduAngularConfigService } from '../../services/config/openvidu-angular.config.service';

/**
 * The **streamingError** directive allows to show any possible error with the streaming in the {@link StreamingActivityComponent}.
 *
 * Default: `undefined`
 *
 * Type: {@link StreamingError}
 *
 * It can be used in the parent element {@link VideoconferenceComponent} specifying the name of the `streamingActivity` component:
 *
 * @example
 * <ov-videoconference [streamingActivityStreamingError]="error"></ov-videoconference>
 *
 * \
 * And it also can be used in the {@link StreamingActivityComponent}.
 * @example
 * <ov-streaming-activity [streamingError]="error"></ov-streaming-activity>
 */
@Directive({
	selector: 'ov-videoconference[streamingActivityStreamingError], ov-streaming-activity[streamingError]'
})
export class StreamingActivityStreamingErrorDirective implements AfterViewInit, OnDestroy {
	@Input() set streamingActivityStreamingError(value: StreamingError) {
		this.streamingErrorValue = value;
		this.update(this.streamingErrorValue);
	}
	@Input() set streamingError(value: StreamingError) {
		this.streamingErrorValue = value;
		this.update(this.streamingErrorValue);
	}

	streamingErrorValue: StreamingError | undefined = undefined;

	constructor(public elementRef: ElementRef, private libService: OpenViduAngularConfigService) {}

	ngAfterViewInit() {
		this.update(this.streamingErrorValue);
	}
	ngOnDestroy(): void {
		this.clear();
	}
	clear() {
		this.streamingErrorValue = undefined;
		this.update(undefined);
	}

	update(value: StreamingError | undefined) {
		if (this.libService.streamingError.getValue() !== value) {
			this.libService.streamingError.next(value);
		}
	}
}
