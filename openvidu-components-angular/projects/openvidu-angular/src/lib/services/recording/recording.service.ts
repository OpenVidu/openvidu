import { Injectable } from '@angular/core';
import { RecordingEvent } from 'openvidu-browser';
import { BehaviorSubject, Observable } from 'rxjs';
import { RecordingInfo, RecordingStatus } from '../../models/recording.model';
import { ActionService } from '../action/action.service';

@Injectable({
	providedIn: 'root'
})
export class RecordingService {
	/**
	 * Recording status Observable which pushes the recording state in every update.
	 */
	recordingStatusObs: Observable<{ info: RecordingInfo; time?: Date }>;

	private recordingTime: Date | undefined;
	private recordingTimeInterval: NodeJS.Timer;
	private currentRecording: RecordingInfo = { status: RecordingStatus.STOPPED };
	private recordingStatus = <BehaviorSubject<{ info: RecordingInfo; time?: Date | undefined } | undefined>>new BehaviorSubject(undefined);
	private baseUrl = '/' + (!!window.location.pathname.split('/')[1] ? window.location.pathname.split('/')[1] + '/' : '');


	/**
	 * @internal
	 */
	constructor(private actionService: ActionService) {
		this.recordingStatusObs = this.recordingStatus.asObservable();
	}

	/**
	 * @param status {@link RecordingStatus}
	 * Update the recording status. This method is used by the OpenVidu Angular library to update the recording status.
	 */
	updateStatus(status: RecordingStatus) {
		this.currentRecording = {
			status: status
		};
		this.recordingStatus.next({ info: this.currentRecording });
	}

	/**
	 * @internal
	 * @param event
	 */
	startRecording(event: RecordingEvent) {
		this.currentRecording = {
			status: RecordingStatus.STARTED,
			id: event.id,
			name: event.name,
			reason: event.reason
		};
		this.startRecordingTime();
		this.recordingStatus.next({ info: this.currentRecording, time: this.recordingTime });
	}

	/**
	 * @internal
	 * @param event
	 */
	stopRecording(event: RecordingEvent) {
		this.currentRecording.status = RecordingStatus.STOPPED;
		this.currentRecording.reason = event.reason;
		this.recordingStatus.next({ info: this.currentRecording, time: undefined });
		this.stopRecordingTime();
	}

	/**
	 * @internal
	 * Play the recording blob received as parameter. This parameter must be obtained from backend using the OpenVidu REST API
	 */
	playRecording(recording: RecordingInfo) {
		const recordingId = recording.id;
		// Only COMPOSED recording is supported. The extension will allways be 'mp4'.
		const extension = 'mp4'; //recording.url?.split('.').pop()  || 'mp4';
		this.actionService.openRecordingPlayerDialog(`${this.baseUrl}recordings/${recordingId}/${recordingId}.${extension}`);
	}

	/**
	 * @internal
	 * Download the the recording file received .
	 * @param recording
	 */
	downloadRecording(recording: RecordingInfo) {
		const recordingId = recording.id;
		// Only COMPOSED recording is supported. The extension will allways be 'mp4'.
		const extension = 'mp4'; //recording.url?.split('.').pop()  || 'mp4';

		const link = document.createElement('a');
		link.href = `/recordings/${recordingId}/${recordingId}.${extension}`;
		link.download = `${recordingId}.${extension}`;
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

	private startRecordingTime() {
		this.recordingTime = new Date();
		this.recordingTime.setHours(0, 0, 0, 0);
		this.recordingTimeInterval = setInterval(() => {
			this.recordingTime.setSeconds(this.recordingTime.getSeconds() + 1);
			this.recordingTime = new Date(this.recordingTime.getTime());
			this.recordingStatus.next({ info: this.currentRecording, time: this.recordingTime });
		}, 1000);
	}

	private stopRecordingTime() {
		clearInterval(this.recordingTimeInterval);
		this.recordingTime = undefined;
	}
}
