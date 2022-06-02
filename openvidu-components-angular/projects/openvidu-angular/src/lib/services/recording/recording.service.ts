import { Injectable } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
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

	private recordingTime: Date;
	private recordingTimeInterval: NodeJS.Timer;
	private currentRecording: RecordingInfo = { status: RecordingStatus.STOPPED };
	private recordingStatus = <BehaviorSubject<{ info: RecordingInfo; time?: Date }>>new BehaviorSubject(null);

	/**
	 * @internal
	 * @param actionService
	 * @param sanitizer
	 */
	constructor(private actionService: ActionService, private sanitizer: DomSanitizer) {
		this.recordingStatusObs = this.recordingStatus.asObservable();
	}

	/**
	 * @internal
	 * @param status
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
		this.recordingStatus.next({ info: this.currentRecording, time: null });
		this.stopRecordingTime();
	}

	/**
	 * Play the recording blob received as parameter. This parameter must be obtained from backend using the OpenVidu REST API
	 * @param blob
	 */
	playRecording(blob: Blob) {
		const src = URL.createObjectURL(blob);
		this.actionService.openRecordingPlayerDialog(this.sanitizer.bypassSecurityTrustResourceUrl(src), blob.type, true);
	}

	/**
	 * Download the the recording blob received as second parameter and renamed with the value of the firts parameter.
	 * This parameter must be obtained from backend using the OpenVidu REST API
	 * @param fileName
	 * @param blob
	 */
	downloadRecording(fileName: string, blob: Blob) {
		const data = window.URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = data;
		link.download = `${fileName}.mp4`;

		// this is necessary as link.click() does not work on the latest firefox
		link.dispatchEvent(
			new MouseEvent('click', {
				bubbles: true,
				cancelable: true,
				view: window
			})
		);

		setTimeout(() => {
			// For Firefox it is necessary to delay revoking the ObjectURL
			window.URL.revokeObjectURL(data);
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
		this.recordingTime = null;
	}
}
