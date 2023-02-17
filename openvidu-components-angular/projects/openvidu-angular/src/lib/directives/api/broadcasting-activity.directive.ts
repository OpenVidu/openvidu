import { AfterViewInit, Directive, ElementRef, Input, OnDestroy } from '@angular/core';
import { BroadcastingError } from '../../models/broadcasting.model';
import { OpenViduAngularConfigService } from '../../services/config/openvidu-angular.config.service';

/**
 * The **broadcastingError** directive allows to show any possible error with the broadcasting in the {@link BroadcastingActivityComponent}.
 *
 * Default: `undefined`
 *
 * Type: {@link BroadcastingError}
 *
 * It can be used in the parent element {@link VideoconferenceComponent} specifying the name of the `broadcastingActivity` component:
 *
 * @example
 * <ov-videoconference [broadcastingActivityBroadcastingError]="error"></ov-videoconference>
 *
 * \
 * And it also can be used in the {@link BroadcastingActivityComponent}.
 * @example
 * <ov-broadcasting-activity [broadcastingError]="error"></ov-broadcasting-activity>
 */
@Directive({
	selector: 'ov-videoconference[broadcastingActivityBroadcastingError], ov-broadcasting-activity[broadcastingError]'
})
export class BroadcastingActivityBroadcastingErrorDirective implements AfterViewInit, OnDestroy {
	@Input() set broadcastingActivityBroadcastingError(value: BroadcastingError) {
		this.broadcastingErrorValue = value;
		this.update(this.broadcastingErrorValue);
	}
	@Input() set broadcastingError(value: BroadcastingError) {
		this.broadcastingErrorValue = value;
		this.update(this.broadcastingErrorValue);
	}

	broadcastingErrorValue: BroadcastingError | undefined = undefined;

	constructor(public elementRef: ElementRef, private libService: OpenViduAngularConfigService) {}

	ngAfterViewInit() {
		this.update(this.broadcastingErrorValue);
	}
	ngOnDestroy(): void {
		this.clear();
	}
	clear() {
		this.broadcastingErrorValue = undefined;
		this.update(undefined);
	}

	update(value: BroadcastingError | undefined) {
		if (this.libService.broadcastingError.getValue() !== value) {
			this.libService.broadcastingError.next(value);
		}
	}
}
