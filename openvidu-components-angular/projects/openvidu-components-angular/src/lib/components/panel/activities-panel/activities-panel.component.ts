import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { PanelStatusInfo, PanelType } from '../../../models/panel.model';
import { OpenViduComponentsConfigService } from '../../../services/config/directive-config.service';
import { PanelService } from '../../../services/panel/panel.service';
import {
	RecordingDeleteRequestedEvent,
	RecordingDownloadClickedEvent,
	RecordingPlayClickedEvent,
	RecordingStartRequestedEvent,
	RecordingStopRequestedEvent
} from '../../../models/recording.model';
import { BroadcastingStartRequestedEvent, BroadcastingStopRequestedEvent } from '../../../models/broadcasting.model';

/**
 * The **ActivitiesPanelComponent** is the component that allows showing the activities panel.
 * This panel shows the recording and broadcasting activities.
 */
@Component({
	selector: 'ov-activities-panel',
	templateUrl: './activities-panel.component.html',
	styleUrls: ['../panel.component.scss', './activities-panel.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	standalone: false
})
export class ActivitiesPanelComponent implements OnInit {
	/**
	 * This event is fired when the user clicks on the start recording button.
	 * It provides the {@link RecordingStartRequestedEvent} payload as event data.
	 */
	@Output() onRecordingStartRequested: EventEmitter<RecordingStartRequestedEvent> = new EventEmitter<RecordingStartRequestedEvent>();

	/**
	 * Provides event notifications that fire when stop recording button has been clicked.
	 * It provides the {@link RecordingStopRequestedEvent} payload as event data.
	 */
	@Output() onRecordingStopRequested: EventEmitter<RecordingStopRequestedEvent> = new EventEmitter<RecordingStopRequestedEvent>();

	/**
	 * Provides event notifications that fire when delete recording button has been clicked.
	 * It provides the {@link RecordingDeleteRequestedEvent} payload as event data.
	 */
	@Output() onRecordingDeleteRequested: EventEmitter<RecordingDeleteRequestedEvent> = new EventEmitter<RecordingDeleteRequestedEvent>();

	/**
	 * Provides event notifications that fire when download recording button has been clicked.
	 * It provides the {@link RecordingDownloadClickedEvent} payload as event data.
	 */
	@Output() onRecordingDownloadClicked: EventEmitter<RecordingDownloadClickedEvent> = new EventEmitter<RecordingDownloadClickedEvent>();

	/**
	 * Provides event notifications that fire when play recording button has been clicked.
	 * It provides the {@link RecordingPlayClickedEvent} payload as event data.
	 */
	@Output() onRecordingPlayClicked: EventEmitter<RecordingPlayClickedEvent> = new EventEmitter<RecordingPlayClickedEvent>();

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
	expandedPanel: string = '';
	/**
	 * @internal
	 */
	showRecordingActivity: boolean = true;
	/**
	 * @internal
	 */
	showBroadcastingActivity: boolean = true;
	private destroy$ = new Subject<void>();

	/**
	 * @internal
	 */
	constructor(
		private panelService: PanelService,
		private libService: OpenViduComponentsConfigService,
		private cd: ChangeDetectorRef
	) {}

	/**
	 * @internal
	 */
	ngOnInit(): void {
		this.subscribeToPanelToggling();
		this.subscribeToActivitiesPanelDirective();
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
	close() {
		this.panelService.togglePanel(PanelType.ACTIVITIES);
	}

	private subscribeToPanelToggling() {
		this.panelService.panelStatusObs.pipe(takeUntil(this.destroy$)).subscribe((ev: PanelStatusInfo) => {
			if (ev.panelType === PanelType.ACTIVITIES && !!ev.subOptionType) {
				this.expandedPanel = ev.subOptionType;
			}
		});
	}

	private subscribeToActivitiesPanelDirective() {
		this.libService.recordingActivity$.pipe(takeUntil(this.destroy$)).subscribe((value: boolean) => {
			this.showRecordingActivity = value;
			this.cd.markForCheck();
		});

		this.libService.broadcastingActivity$.pipe(takeUntil(this.destroy$)).subscribe((value: boolean) => {
			this.showBroadcastingActivity = value;
			this.cd.markForCheck();
		});
	}
}
