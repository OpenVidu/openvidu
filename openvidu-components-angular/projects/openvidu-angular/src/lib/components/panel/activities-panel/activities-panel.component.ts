import { Component, OnInit, Output, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { PanelType } from '../../../models/panel.model';
import { OpenViduAngularConfigService } from '../../../services/config/openvidu-angular.config.service';
import { PanelEvent, PanelService } from '../../../services/panel/panel.service';

@Component({
	selector: 'ov-activities-panel',
	templateUrl: './activities-panel.component.html',
	styleUrls: ['../panel.component.css', './activities-panel.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ActivitiesPanelComponent implements OnInit {
	/**
	 * Provides event notifications that fire when start recording button has been clicked.
	 * The recording should be stated using the OpenVidu REST API.
	 */
	@Output() onStartRecordingClicked: EventEmitter<void> = new EventEmitter<void>();

	/**
	 * Provides event notifications that fire when stop recording button has been clicked.
	 * The recording should be stopped using the OpenVidu REST API.
	 */
	@Output() onStopRecordingClicked: EventEmitter<void> = new EventEmitter<void>();

	/**
	 * Provides event notifications that fire when download recording button has been clicked.
	 * The recording should be downloaded using the OpenVidu REST API.
	 */
	@Output() onDownloadRecordingClicked: EventEmitter<string> = new EventEmitter<string>();
	/**
	 * Provides event notifications that fire when delete recording button has been clicked.
	 * The recording should be deleted using the OpenVidu REST API.
	 */
	@Output() onDeleteRecordingClicked: EventEmitter<string> = new EventEmitter<string>();
	/**
	 * Provides event notifications that fire when play recording button has been clicked.
	 */
	@Output() onPlayRecordingClicked: EventEmitter<string> = new EventEmitter<string>();

	/**
	 * @internal
	 */
	expandedPanel: string = '';
	/**
	 * @internal
	 */
	showRecordingActivity: boolean = true;
	private panelSubscription: Subscription;
	private recordingActivitySub: Subscription;

	/**
	 * @internal
	 */
	constructor(private panelService: PanelService, private libService: OpenViduAngularConfigService, private cd: ChangeDetectorRef) {}

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
		if (this.panelSubscription) this.panelSubscription.unsubscribe();
		if (this.recordingActivitySub) this.recordingActivitySub.unsubscribe();
	}

	/**
	 * @internal
	 */
	close() {
		this.panelService.togglePanel(PanelType.ACTIVITIES);
	}

	/**
	 * @internal
	 */
	_onStartRecordingClicked() {
		this.onStartRecordingClicked.emit();
	}

	/**
	 * @internal
	 */
	_onStopRecordingClicked() {
		this.onStopRecordingClicked.emit();
	}

	/**
	 * @internal
	 */
	_onDownloadRecordingClicked(recordingId: string) {
		this.onDownloadRecordingClicked.emit(recordingId);
	}

	/**
	 * @internal
	 */
	_onDeleteRecordingClicked(recordingId: string) {
		this.onDeleteRecordingClicked.emit(recordingId);
	}

	/**
	 * @internal
	 */
	_onPlayRecordingClicked(recordingId: string) {
		this.onPlayRecordingClicked.emit(recordingId);
	}

	private subscribeToPanelToggling() {
		this.panelSubscription = this.panelService.panelOpenedObs.subscribe(
			(ev: PanelEvent) => {
				if (ev.type === PanelType.ACTIVITIES && !!ev.expand) {
					this.expandedPanel = ev.expand;
				}
			}
		);
	}

	private subscribeToActivitiesPanelDirective() {
		this.recordingActivitySub = this.libService.recordingActivity.subscribe((value: boolean) => {
			this.showRecordingActivity = value;
			this.cd.markForCheck();
		});
	}
}
