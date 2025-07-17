import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import {
	BroadcastingStartRequestedEvent,
	BroadcastingStatus,
	BroadcastingStatusInfo,
	BroadcastingStopRequestedEvent
} from '../../../../models/broadcasting.model';
import { BroadcastingService } from '../../../../services/broadcasting/broadcasting.service';
import { ParticipantService } from '../../../../services/participant/participant.service';
import { OpenViduService } from '../../../../services/openvidu/openvidu.service';

/**
 * The **BroadcastingActivityComponent** is the component that allows showing the broadcasting activity.
 *
 */
@Component({
	selector: 'ov-broadcasting-activity',
	templateUrl: './broadcasting-activity.component.html',
	styleUrls: ['./broadcasting-activity.component.scss', '../activities-panel.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	standalone: false
})

// TODO: Allow to add more than one broadcast url
// TODO: allow to choose the layout of the broadcast
export class BroadcastingActivityComponent implements OnInit {
	/**
	 * Provides event notifications that fire when start broadcasting button is clicked.
	 * It provides the {@link BroadcastingStartRequestedEvent} payload as event data.
	 */
	@Output() onBroadcastingStartRequested: EventEmitter<BroadcastingStartRequestedEvent> =
		new EventEmitter<BroadcastingStartRequestedEvent>();

	/**
	 * Provides event notifications that fire when stop broadcasting button is clicked.
	 * It provides the {@link BroadcastingStopRequestedEvent} payload as event data.
	 */
	@Output() onBroadcastingStopRequested: EventEmitter<BroadcastingStopRequestedEvent> =
		new EventEmitter<BroadcastingStopRequestedEvent>();

	/**
	 * @internal
	 */
	urlRequiredError: boolean = false;

	/**
	 * @internal
	 */
	broadcastUrl: string = '';

	/**
	 * @internal
	 */
	@Input() expanded: boolean;

	/**
	 * @internal
	 */
	broadcastingError: string | undefined;

	/**
	 * @internal
	 */
	broadcastingStatus: BroadcastingStatus = BroadcastingStatus.STOPPED;
	/**
	 * @internal
	 */
	broadcastingId: string | undefined;
	/**
	 * @internal
	 */
	broadcastingStatusEnum = BroadcastingStatus;
	/**
	 * @internal
	 */
	isPanelOpened: boolean = false;

	private destroy$ = new Subject<void>();

	/**
	 * @internal
	 */
	constructor(
		private broadcastingService: BroadcastingService,
		private participantService: ParticipantService,
		private openviduService: OpenViduService,
		private cd: ChangeDetectorRef
	) {}

	/**
	 * @internal
	 */
	ngOnInit(): void {
		this.subscribeToBroadcastingStatus();
	}

	/**
	 * @internal
	 */
	ngOnDestroy() {
		this.destroy$.next();
		this.destroy$.complete();
	}

	/**
	 * @internal
	 */
	setPanelOpened(value: boolean) {
		this.isPanelOpened = value;
	}

	/**
	 * @ignore
	 */
	eventKeyPress(event) {
		// Pressed 'Enter' key
		if (event && event.keyCode === 13) {
			event.preventDefault();
			this.startBroadcasting();
		}
	}

	/**
	 * @internal
	 */
	startBroadcasting() {
		if (!!this.broadcastUrl) {
			const payload: BroadcastingStartRequestedEvent = {
				roomName: this.openviduService.getRoomName(),
				broadcastUrl: this.broadcastUrl
			};
			this.onBroadcastingStartRequested.emit(payload);
		}
		this.urlRequiredError = !this.broadcastUrl;
	}

	/**
	 * @internal
	 */
	stopBroadcasting() {
		const payload: BroadcastingStopRequestedEvent = {
			roomName: this.openviduService.getRoomName(),
			broadcastingId: this.broadcastingId as string
		};
		this.broadcastingService.setBroadcastingStopped();
		this.onBroadcastingStopRequested.emit(payload);
	}

	private subscribeToBroadcastingStatus() {
		this.broadcastingService.broadcastingStatusObs.pipe(takeUntil(this.destroy$)).subscribe((event: BroadcastingStatusInfo | undefined) => {
			if (!!event) {
				const { status, broadcastingId, error } = event;
				this.broadcastingStatus = status;
				this.broadcastingError = error;
				this.broadcastingId = broadcastingId;
				this.cd.markForCheck();
			}
		});
	}
}
