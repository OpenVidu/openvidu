import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { Subscription } from 'rxjs';
import { RecordingStatus } from '../../../../models/recording.model';
import { RecordingService, RecordingInfo } from '../../../../services/recording/recording.service';

/**
 * @internal
 */
@Component({
	selector: 'ov-recording-activity',
	templateUrl: './recording-activity.component.html',
	styleUrls: ['./recording-activity.component.css', '../activities-panel.component.css']
})
export class RecordingActivityComponent implements OnInit {

	/**
	 * Provides event notifications that fire when start recording button has been clicked.
	 */
	@Output() startRecordingClicked: EventEmitter<void> = new EventEmitter<void>();

	/**
	 * Provides event notifications that fire when stop recording button has been clicked.
	 */
	@Output() stopRecordingClicked: EventEmitter<void> = new EventEmitter<void>();
	recordingStatus: RecordingStatus = RecordingStatus.STOPPED;
	recStatusEnum = RecordingStatus;
	isSessionCreator = true;
	recording: RecordingInfo;
	recordingSubscription: Subscription;

	opened: boolean = false;

	constructor(private recordingService: RecordingService) {}

	ngOnInit(): void {
		this.subscribeToRecordingStatus();
	}

	ngOnDestroy() {
		if (this.recordingSubscription) this.recordingSubscription.unsubscribe();
	}

	panelOpened() {
		//TODO EMITIR EVENTO
		this.opened = true;
	}

	panelClosed() {
		//TODO EMITIR EVENTO
		this.opened = false;
	}

	startRecording() {
		console.log('START RECORDING');
		this.startRecordingClicked.emit();
		//TODO: REMOVE
		const info: RecordingInfo = {
			status: RecordingStatus.STARTED,
			id: '1',
			name: 'akajo',
			reason: null
		};
		this.recordingService.startRecording(<any>info);
	}
	stopRecording() {
		console.log('STOP RECORDING');
		this.stopRecordingClicked.emit();
		//TODO: REMOVE
		const info: RecordingInfo = {
			status: RecordingStatus.STOPPED,
			id: '1',
			name: 'akajo',
			reason: 'lalal'
		};
		this.recordingService.stopRecording(<any>info);
	}

	subscribeToRecordingStatus() {
		this.recordingSubscription = this.recordingService.recordingStatusObs.subscribe((info: RecordingInfo) => {
			if (info) {
				this.recordingStatus = info.status;
				if (info.status === RecordingStatus.STARTED) {
					this.recording = info;
				} else {
					this.recording = null;
				}
			}
		});
	}
}
