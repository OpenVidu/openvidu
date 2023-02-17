import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { BroadcastingError, BroadcastingStatus } from '../../../../models/broadcasting.model';
import { BroadcastingService } from '../../../../services/broadcasting/broadcasting.service';
import { OpenViduAngularConfigService } from '../../../../services/config/openvidu-angular.config.service';
import { ParticipantService } from '../../../../services/participant/participant.service';

@Component({
	selector: 'ov-broadcasting-activity',
	templateUrl: './broadcasting-activity.component.html',
	styleUrls: ['./broadcasting-activity.component.css', '../activities-panel.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class BroadcastingActivityComponent implements OnInit {
	/**
	 * Provides event notifications that fire when start broadcasting button has been clicked.
	 * The broadcasting should be started using the REST API.
	 */
	@Output() onStartBroadcastingClicked: EventEmitter<string> = new EventEmitter<string>();

	/**
	 * Provides event notifications that fire when stop broadcasting button has been clicked.
	 * The broadcasting should be stopped using the REST API.
	 */
	@Output() onStopBroadcastingClicked: EventEmitter<void> = new EventEmitter<void>();

	/**
	 * @internal
	 */
	urlRequiredError: boolean = false;

	/**
	 * @internal
	 */
	oldBroadcastingStatus: BroadcastingStatus;
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
	broadcastingError: BroadcastingError | undefined;

	/**
	 * @internal
	 */
	broadcastingStatus: BroadcastingStatus = BroadcastingStatus.STOPPED;
	/**
	 * @internal
	 */
	broadcastingStatusEnum = BroadcastingStatus;
	/**
	 * @internal
	 */
	opened: boolean = false;
	/**
	 * @internal
	 */
	isSessionCreator: boolean = false;
	/**
	 * @internal
	 */
	isBroadcastModuleAvailable: boolean = true;
	private broadcastingSub: Subscription;
	private broadcastingErrorSub: Subscription;

	/**
	 * @internal
	 */
	constructor(
		private broadcastingService: BroadcastingService,
		private participantService: ParticipantService,
		private libService: OpenViduAngularConfigService,
		private cd: ChangeDetectorRef
	) {}

	/**
	 * @internal
	 */
	ngOnInit(): void {
		this.isSessionCreator = this.participantService.amIModerator();
		this.subscribeToBroadcastingStatus();
		this.subscribeToBroadcastingError();
	}

	/**
	 * @internal
	 */
	ngOnDestroy() {
		if (this.broadcastingSub) this.broadcastingSub.unsubscribe();
		if (this.broadcastingErrorSub) this.broadcastingErrorSub.unsubscribe();
	}

	/**
	 * @internal
	 */
	panelOpened() {
		this.opened = true;
	}

	/**
	 * @internal
	 */
	panelClosed() {
		this.opened = false;
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
			this.isBroadcastModuleAvailable = true;
			this.broadcastingError = undefined;
			this.broadcastingService.updateStatus(BroadcastingStatus.STARTING);
			this.onStartBroadcastingClicked.emit(this.broadcastUrl);
		}
		this.urlRequiredError = !this.broadcastUrl;
	}

	/**
	 * @internal
	 */
	stopBroadcasting() {
		this.onStopBroadcastingClicked.emit();
		this.broadcastingService.updateStatus(BroadcastingStatus.STOPPING);
	}

	private subscribeToBroadcastingStatus() {
		this.broadcastingSub = this.broadcastingService.broadcastingStatusObs.subscribe(
			(ev: { status: BroadcastingStatus; time?: Date } | undefined) => {
				if (!!ev) {
					this.broadcastingStatus = ev.status;
					this.cd.markForCheck();
				}
			}
		);
	}

	private subscribeToBroadcastingError() {
		this.broadcastingErrorSub = this.libService.broadcastingErrorObs.subscribe((error: BroadcastingError | undefined) => {
			if (!!error) {
				this.broadcastingError = error;
				this.isBroadcastModuleAvailable = error.broadcastAvailable;
				this.broadcastingService.updateStatus(BroadcastingStatus.FAILED);
				this.cd.markForCheck();
			}
		});
	}
}
