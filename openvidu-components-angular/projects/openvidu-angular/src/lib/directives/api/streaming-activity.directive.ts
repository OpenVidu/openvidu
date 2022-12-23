import { AfterViewInit, Directive, ElementRef, Input, OnDestroy } from '@angular/core';
import { StreamingError, StreamingInfo, StreamingStatus } from '../../models/streaming.model';
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

//TODO: Remove this directive when RTMP Exported was included on OV and streaming ready event was fired.

/**
 * The **streamingInfo** directive allows show the live streaming info in {@link StreamingActivityComponent}.
 *
 * Default: `undefined`
 *
 * Type: {@link StreamingInfo}
 *
 * It can be used in the parent element {@link VideoconferenceComponent} specifying the name of the `streamingActivity` component:
 *
 * @example
 * <ov-videoconference [streamingActivityStreamingInfo]="info"></ov-videoconference>
 *
 * \
 * And it also can be used in the {@link StreamingActivityComponent}.
 * @example
 * <ov-streaming-activity [streamingInfo]="info"></ov-streaming-activity>
 */
@Directive({
	selector: 'ov-videoconference[streamingActivityStreamingInfo], ov-streaming-activity[streamingInfo]'
})
export class StreamingActivityStreamingInfoDirective implements AfterViewInit, OnDestroy {
	@Input() set streamingActivityStreamingInfo(value: StreamingInfo) {
		this.streamingValue = value;
		this.update(this.streamingValue);
	}
	@Input() set streamingInfo(value: StreamingInfo) {
		this.streamingValue = value;
		this.update(this.streamingValue);
	}

	streamingValue: StreamingInfo | undefined = undefined;

	constructor(public elementRef: ElementRef, private libService: OpenViduAngularConfigService) {}

	ngAfterViewInit() {
		this.update(this.streamingValue);
	}
	ngOnDestroy(): void {
		this.clear();
	}
	clear() {
		this.streamingValue = undefined;
		this.update(undefined);
	}

	update(value: StreamingInfo | undefined) {
		if (this.libService.streamingInfo.getValue() !== value) {
			if(value) {
				// Forced value to right enum
				const index = Object.values(StreamingStatus).indexOf(value.status.toLowerCase()  as unknown as StreamingStatus);
				const key = Object.keys(StreamingStatus)[index];
				value.status = StreamingStatus[key];
			}
			this.libService.streamingInfo.next(value);
		}
	}
}
