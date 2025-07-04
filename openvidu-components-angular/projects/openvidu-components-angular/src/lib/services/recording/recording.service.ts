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
	private recordingStartTimestamp: number | null = null;

	private recordingStatus = <BehaviorSubject<RecordingStatusInfo>>new BehaviorSubject({
		status: RecordingStatus.STOPPED,
		recordingList: [] as RecordingInfo[],
		startedAt: new Date(0, 0, 0, 0, 0, 0)
	});
	private log: ILogger;

	/**
	 * @internal
	 */
	constructor(
		private actionService: ActionService,
		private libService: OpenViduComponentsConfigService,
		private loggerService: LoggerService
	) {
		this.log = this.loggerService.get('RecordingService');
		this.recordingStatusObs = this.recordingStatus.asObservable();
	}

	/**
	 * Initializes the recording status with the given parameters and the timer to calculate the elapsed time.
	 * @internal
	 */
	setRecordingStarted(recordingInfo?: RecordingInfo, startTimestamp?: number) {
		// Determine the actual start timestamp of the recording
		// Priority: startTimestamp parameter > recordingInfo.startedAt > current time
		this.recordingStartTimestamp = startTimestamp || recordingInfo?.startedAt || Date.now();

		const { recordingList } = this.recordingStatus.getValue();
		let updatedRecordingList = [...recordingList];

		if (recordingInfo) {
			const existingIndex = updatedRecordingList.findIndex((recording) => recording.id === recordingInfo.id);
			if (existingIndex !== -1) {
				// Replace existing recording info
				updatedRecordingList[existingIndex] = recordingInfo;
			} else {
				// Add new recording info
				updatedRecordingList = [recordingInfo, ...updatedRecordingList];
			}
		}

		// Calculate the elapsed time based on the actual start timestamp
		const recordingElapsedTime = new Date(0, 0, 0, 0, 0, 0);
		if (this.recordingStartTimestamp) {
			const elapsedSeconds = Math.floor((Date.now() - this.recordingStartTimestamp) / 1000);
			recordingElapsedTime.setSeconds(Math.max(0, elapsedSeconds)); // Ensure non-negative
		}

		this.updateStatus({
			status: RecordingStatus.STARTED,
			recordingList: updatedRecordingList,
			startedAt: recordingElapsedTime
		});

		// Start the timer after updating the initial state
		this.startRecordingTimer();
	}

	/**
	 * Stops the recording timer and updates the recording status to **stopped**.
	 * @internal
	 */
	setRecordingStopped(recordingInfo?: RecordingInfo) {
		this.stopRecordingTimer();
		const { recordingList } = this.recordingStatus.getValue();
		let updatedRecordingList = [...recordingList];

		// Update the recording list with the new recording info
		if (recordingInfo) {
			const existingIndex = updatedRecordingList.findIndex((recording) => recording.id === recordingInfo.id);
			if (existingIndex !== -1) {
				updatedRecordingList[existingIndex] = recordingInfo;
			} else {
				updatedRecordingList = [recordingInfo, ...updatedRecordingList];
			}
		}

		this.updateStatus({
			status: RecordingStatus.STOPPED,
			recordingList: updatedRecordingList,
			startedAt: new Date(0, 0, 0, 0, 0, 0)
		});

		this.recordingStartTimestamp = null;
	}

	/**
	 * Set the {@link RecordingStatus} to **starting**.
	 * The `started` stastus will be updated automatically when the recording is actually started.
	 */
	setRecordingStarting() {
		const { recordingList, startedAt } = this.recordingStatus.getValue();
		this.updateStatus({
			status: RecordingStatus.STARTING,
			recordingList,
			startedAt
		});
	}

	/**
	 * @internal
	 * @param error
	 */
	setRecordingFailed(error: string) {
		this.stopRecordingTimer();
		const { startedAt, recordingList } = this.recordingStatus.getValue();
		const statusInfo: RecordingStatusInfo = {
			status: RecordingStatus.FAILED,
			recordingList,
			startedAt,
			error
		};
		this.updateStatus(statusInfo);
	}

	/**
	 * Set the {@link RecordingStatus} to **stopping**.
	 * The `stopped` stastus will be updated automatically when the recording is actually stopped.
	 */
	setRecordingStopping() {
		const { startedAt, recordingList } = this.recordingStatus.getValue();

		this.updateStatus({
			status: RecordingStatus.STOPPING,
			recordingList,
			startedAt
		});
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
		let streamRecordingUrl = '';
		if (baseUrl === 'call/api/recordings/') {
			// Keep the compatibility with the old version
			streamRecordingUrl = `${baseUrl}${recording.id}/stream${queryParamForAvoidCache}`;
		} else {
			streamRecordingUrl = `${baseUrl}${recording.id}/media${queryParamForAvoidCache}`;
		}
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
		if (baseUrl === 'call/api/recordings/') {
			// Keep the compatibility with the old version
			link.href = `${baseUrl}${recording.id}/stream${queryParamForAvoidCache}`;
		} else {
			link.href = `${baseUrl}${recording.id}/media${queryParamForAvoidCache}`;
		}
		link.download = recording.filename || 'openvidu-recording.mp4';
		link.dispatchEvent(
			new MouseEvent('click', {
				bubbles: true,
				cancelable: true,
				view: window
			})
		);
		// For Firefox it is necessary to delay revoking the ObjectURL
		setTimeout(() => link.remove(), 100);
	}

	/**
	 * Deletes a recording from the recording list.
	 *
	 * @param recording - The recording to be deleted.
	 * @internal
	 */
	deleteRecording(recording: RecordingInfo) {
		const { recordingList, status, startedAt } = this.recordingStatus.getValue();
		const updatedList = recordingList.filter((item) => item.id !== recording.id);

		if (updatedList.length !== recordingList.length) {
			this.updateStatus({
				status,
				recordingList: updatedList,
				startedAt
			});
			return true;
		}
		return false;
	}

	/**
	 *
	 * @param recordings
	 * @internal
	 */
	setRecordingList(recordings: RecordingInfo[]) {
		const { status, startedAt, error } = this.recordingStatus.getValue();
		this.updateStatus({
			status,
			recordingList: recordings,
			startedAt,
			error
		});
	}

	/**
	 * Updates the recording status.
	 * @param status {@link RecordingStatus}
	 */
	private updateStatus(statusInfo: RecordingStatusInfo) {
		const { status, recordingList, error, startedAt } = statusInfo;
		this.recordingStatus.next({
			status,
			recordingList,
			startedAt,
			error
		});
	}

	private startRecordingTimer() {
		// Don't override the timestamp if it's already set correctly
		if (this.recordingStartTimestamp === null) {
			this.recordingStartTimestamp = Date.now();
		}

		if (this.recordingTimeInterval) {
			clearInterval(this.recordingTimeInterval);
		}

		this.recordingTimeInterval = setInterval(() => {
			if (!this.recordingStartTimestamp) return;

			// Calculate elapsed time based on the actual recording start timestamp
			const elapsedSeconds = Math.floor((Date.now() - this.recordingStartTimestamp) / 1000);
			const startedAt = new Date(0, 0, 0, 0, 0, 0);
			startedAt.setSeconds(Math.max(0, elapsedSeconds)); // Ensure non-negative

			const { recordingList, status } = this.recordingStatus.getValue();
			this.updateStatus({
				status,
				recordingList,
				startedAt
			});
		}, 1000);
	}

	private stopRecordingTimer() {
		if (this.recordingTimeInterval) {
			clearInterval(this.recordingTimeInterval);
		}
		const { recordingList, status, error } = this.recordingStatus.getValue();
		const statusInfo: RecordingStatusInfo = {
			status,
			recordingList,
			startedAt: new Date(0, 0, 0, 0, 0, 0), // Reset elapsed time when stopped
			error
		};
		this.updateStatus(statusInfo);
	}
}
