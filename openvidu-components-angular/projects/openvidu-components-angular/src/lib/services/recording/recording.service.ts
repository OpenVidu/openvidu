import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { RecordingInfo, RecordingStatus, RecordingStatusInfo } from '../../models/recording.model';
import { ActionService } from '../action/action.service';
import { LoggerService } from '../logger/logger.service';
import { ILogger } from '../../models/logger.model';
import { OpenViduComponentsConfigService } from '../config/directive-config.service';

@Injectable({
	providedIn: 'root'
})
export class RecordingService {
	/**
	 * Recording status Observable which pushes the recording state in every update.
	 */
	recordingStatusObs: Observable<RecordingStatusInfo>;
	private recordingTimeInterval: NodeJS.Timeout;
	private recordingStatus = <BehaviorSubject<RecordingStatusInfo>>new BehaviorSubject({
		status: RecordingStatus.STOPPED,
		recordingList: [] as RecordingInfo[],
		recordingElapsedTime: new Date(0, 0, 0, 0, 0, 0, 0)
	});
	private log: ILogger;

	/**
	 * @internal
	 */
	constructor(private actionService: ActionService, private libService: OpenViduComponentsConfigService, private loggerService: LoggerService) {
		this.log = this.loggerService.get('RecordingService');
		this.recordingStatusObs = this.recordingStatus.asObservable();
	}

	/**
	 * @internal
	 * @param event
	 */
	setRecordingStarted(recordingInfo?: RecordingInfo) {
		this.startRecordingTime();
		const { recordingElapsedTime, recordingList } = this.recordingStatus.getValue();
		if (recordingInfo) {
			const existingRecordingIndex = recordingList.findIndex((recording) => recording.id === recordingInfo.id);
			if (existingRecordingIndex !== -1) {
				// Replace existing recording info
				recordingList[existingRecordingIndex] = recordingInfo;
			} else {
				// Add new recording info
				recordingList.unshift(recordingInfo);
			}
		}
		const statusInfo: RecordingStatusInfo = {
			status: RecordingStatus.STARTED,
			recordingList,
			recordingElapsedTime
		};
		this.updateStatus(statusInfo);
	}

	/**
	 * Deletes a recording from the recording list.
	 *
	 * @param rec - The recording to be deleted.
	 * @internal
	 */
	deleteRecording(rec: RecordingInfo) {
		const { recordingList } = this.recordingStatus.getValue();
		const index = recordingList.findIndex((recording) => recording.id === rec.id);
		if (index !== -1) {
			recordingList.splice(index, 1);
			this.updateStatus({
				status: this.recordingStatus.getValue().status,
				recordingList,
				recordingElapsedTime: this.recordingStatus.getValue().recordingElapsedTime
			});
		}
	}

	/**
	 * @internal
	 * @param event
	 */
	setRecordingStopped(recordingInfo?: RecordingInfo) {
		this.stopRecordingTime();
		const { recordingElapsedTime, recordingList } = this.recordingStatus.getValue();
		if (recordingInfo) {
			const existingRecordingIndex = recordingList.findIndex((recording) => recording.id === recordingInfo.id);
			if (existingRecordingIndex !== -1) {
				// Replace existing recording info with the new one
				recordingList[existingRecordingIndex] = recordingInfo;
			} else {
				recordingList.unshift(recordingInfo);
			}
		}
		const statusInfo: RecordingStatusInfo = {
			status: RecordingStatus.STOPPED,
			recordingList,
			recordingElapsedTime
		};
		this.updateStatus(statusInfo);
	}

	/**
	 * Set the {@link RecordingStatus} to **starting**.
	 * The `started` stastus will be updated automatically when the recording is actually started.
	 */
	setRecordingStarting() {
		const { recordingList, recordingElapsedTime } = this.recordingStatus.getValue();
		const statusInfo: RecordingStatusInfo = {
			status: RecordingStatus.STARTING,
			recordingList,
			recordingElapsedTime
		};
		this.updateStatus(statusInfo);
	}

	/**
	 * @internal
	 * @param error
	 */
	setRecordingFailed(error: string) {
		this.stopRecordingTime();
		const { recordingElapsedTime, recordingList } = this.recordingStatus.getValue();
		const statusInfo: RecordingStatusInfo = {
			status: RecordingStatus.FAILED,
			recordingList,
			recordingElapsedTime,
			error
		};
		this.updateStatus(statusInfo);
	}

	/**
	 * Set the {@link RecordingStatus} to **stopping**.
	 * The `stopped` stastus will be updated automatically when the recording is actually stopped.
	 */
	setRecordingStopping() {
		const { recordingElapsedTime, recordingList } = this.recordingStatus.getValue();
		const statusInfo: RecordingStatusInfo = {
			status: RecordingStatus.STOPPING,
			recordingList,
			recordingElapsedTime
		};
		this.updateStatus(statusInfo);
	}

	/**
	 * @internal
	 * Play the recording blob received as parameter. This parameter must be obtained from backend using the OpenVidu REST API
	 */
	playRecording(recording: RecordingInfo) {
		// Only COMPOSED recording is supported. The extension will allways be 'mp4'.
		this.log.d('Playing recording', recording);
		const queryParamForAvoidCache = `?t=${new Date().getTime()}`;
		const baseUrl = this.libService.getRecordingStreamBaseUrl();
		const streamRecordingUrl = `${baseUrl}${recording.id}/stream${queryParamForAvoidCache}`;
		this.actionService.openRecordingPlayerDialog(streamRecordingUrl);
	}

	/**
	 * @internal
	 * Download the the recording file received .
	 * @param recording
	 */
	downloadRecording(recording: RecordingInfo) {
		// Only COMPOSED recording is supported. The extension will allways be 'mp4'.
		const queryParamForAvoidCache = `?t=${new Date().getTime()}`;
		const link = document.createElement('a');
		const baseUrl = this.libService.getRecordingStreamBaseUrl();
		link.href = `${baseUrl}${recording.id}/stream${queryParamForAvoidCache}`;
		link.download = recording.filename || 'openvidu-recording.mp4';
		link.dispatchEvent(
			new MouseEvent('click', {
				bubbles: true,
				cancelable: true,
				view: window
			})
		);
		setTimeout(() => {
			// For Firefox it is necessary to delay revoking the ObjectURL
			link.remove();
		}, 100);
	}

	/**
	 *
	 * @param recordings
	 * @internal
	 */
	setRecordingList(recordings: RecordingInfo[]) {
		const { status, recordingElapsedTime, error } = this.recordingStatus.getValue();
		const statusInfo: RecordingStatusInfo = {
			status,
			recordingList: recordings,
			recordingElapsedTime,
			error
		};
		this.updateStatus(statusInfo);
	}

	/**
	 * Updates the recording status.
	 * @param status {@link RecordingStatus}
	 */
	private updateStatus(statusInfo: RecordingStatusInfo) {
		const { status, recordingList, error, recordingElapsedTime } = statusInfo;
		this.recordingStatus.next({
			status,
			recordingList,
			recordingElapsedTime,
			error
		});
	}

	private startRecordingTime() {
		this.recordingTimeInterval = setInterval(() => {
			let { recordingElapsedTime, recordingList, status } = this.recordingStatus.getValue();
			if (recordingElapsedTime) {
				recordingElapsedTime.setSeconds(recordingElapsedTime.getSeconds() + 1);
				recordingElapsedTime = new Date(recordingElapsedTime.getTime());
				const statusInfo: RecordingStatusInfo = {
					status,
					recordingList,
					recordingElapsedTime
				};
				this.updateStatus(statusInfo);
			}
		}, 1000);
	}

	private stopRecordingTime() {
		clearInterval(this.recordingTimeInterval);
		const { recordingList, status, error } = this.recordingStatus.getValue();
		const statusInfo: RecordingStatusInfo = {
			status,
			recordingList,
			error
		};
		this.updateStatus(statusInfo);
	}
}
