import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { RecordingInfo, RecordingStatus } from '../../../../models/recording.model';
import { ActionService } from '../../../../services/action/action.service';
import { OpenViduAngularConfigService } from '../../../../services/config/openvidu-angular.config.service';
import { ParticipantService } from '../../../../services/participant/participant.service';
import { RecordingService } from '../../../../services/recording/recording.service';

@Component({
	selector: 'ov-recording-activity',
	templateUrl: './recording-activity.component.html',
	styleUrls: ['./recording-activity.component.css', '../activities-panel.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecordingActivityComponent implements OnInit {
	/**
	 * @internal
	 */
	@Input() expanded: boolean;

	/**
	 * Provides event notifications that fire when start recording button has been clicked.
	 * The recording should be started using the REST API.
	 */
	@Output() onStartRecordingClicked: EventEmitter<void> = new EventEmitter<void>();

	/**
	 * Provides event notifications that fire when stop recording button has been clicked.
	 * The recording should be stopped using the REST API.
	 */
	@Output() onStopRecordingClicked: EventEmitter<void> = new EventEmitter<void>();

	/**
	 * Provides event notifications that fire when delete recording button has been clicked.
	 * The recording should be deleted using the REST API.
	 */
	@Output() onDeleteRecordingClicked: EventEmitter<string> = new EventEmitter<string>();

	/**
	 * @internal
	 */
	recordingStatus: RecordingStatus = RecordingStatus.STOPPED;
	/**
	 * @internal
	 */
	oldRecordingStatus: RecordingStatus;
	/**
	 * @internal
	 */
	opened: boolean = false;

	/**
	 * @internal
	 */
	recStatusEnum = RecordingStatus;

	/**
	 * @internal
	 */
	isSessionCreator = false;

	/**
	 * @internal
	 */
	recordingAlive: boolean = false;
	/**
	 * @internal
	 */
	recordingsList: RecordingInfo[] = [];

	/**
	 * @internal
	 */
	recordingError: any;

	private recordingStatusSubscription: Subscription;
	private recordingListSubscription: Subscription;
	private recordingErrorSub: Subscription;

	/**
	 * @internal
	 */
	constructor(
		private recordingService: RecordingService,
		private participantService: ParticipantService,
		private libService: OpenViduAngularConfigService,
		private actionService: ActionService,
		private cd: ChangeDetectorRef
	) {}

	/**
	 * @internal
	 */
	ngOnInit(): void {
		this.subscribeToRecordingStatus();
		this.subscribeToRecordingActivityDirective();
		this.isSessionCreator = this.participantService.amIModerator();
	}

	/**
	 * @internal
	 */
	ngOnDestroy() {
		if (this.recordingStatusSubscription) this.recordingStatusSubscription.unsubscribe();
		if (this.recordingListSubscription) this.recordingListSubscription.unsubscribe();
		if (this.recordingErrorSub) this.recordingErrorSub.unsubscribe();
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
	 * @internal
	 */
	resetStatus() {
		let status: RecordingStatus = this.oldRecordingStatus;
		if (this.oldRecordingStatus === RecordingStatus.STARTING) {
			status = RecordingStatus.STOPPED;
		} else if (this.oldRecordingStatus === RecordingStatus.STOPPING) {
			status = RecordingStatus.STARTED;
		}
		this.recordingService.updateStatus(status);
	}

	/**
	 * @internal
	 */
	startRecording() {
		this.onStartRecordingClicked.emit();
		this.recordingService.updateStatus(RecordingStatus.STARTING);
	}

	/**
	 * @internal
	 */
	stopRecording() {
		this.onStopRecordingClicked.emit();
		this.recordingService.updateStatus(RecordingStatus.STOPPING);
	}

	/**
	 * @internal
	 */

	deleteRecording(id: string) {
		const succsessCallback = () => {
			this.onDeleteRecordingClicked.emit(id);
		};
		this.actionService.openDeleteRecordingDialog(succsessCallback);
	}

	/**
	 * @internal
	 */
	download(recording: RecordingInfo) {
		this.recordingService.downloadRecording(recording);
	}

	/**
	 * @internal
	 */
	play(recording: RecordingInfo) {
		this.recordingService.playRecording(recording);
	}

	private subscribeToRecordingStatus() {
		this.recordingStatusSubscription = this.recordingService.recordingStatusObs.subscribe(
			(ev?: { info: RecordingInfo; time?: Date }) => {
				if (ev?.info) {
					if (this.recordingStatus !== RecordingStatus.FAILED) {
						this.oldRecordingStatus = this.recordingStatus;
					}
					this.recordingStatus = ev.info.status;
					this.recordingAlive = ev.info.status === RecordingStatus.STARTED;
					this.cd.markForCheck();
				}
			}
		);
	}

	private subscribeToRecordingActivityDirective() {
		this.recordingListSubscription = this.libService.recordingsListObs.subscribe((recordingList: RecordingInfo[]) => {
			this.recordingsList = recordingList;
			this.cd.markForCheck();
		});

		this.recordingErrorSub = this.libService.recordingErrorObs.subscribe((error: any) => {
			if (error) {
				this.recordingService.updateStatus(RecordingStatus.FAILED);
				this.recordingError = error.error?.message || error.message || error;
			}
		});
	}
}
