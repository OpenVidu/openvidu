import { Injectable } from '@angular/core';
import { RecordingEvent } from 'openvidu-browser';
import { BehaviorSubject, Observable } from 'rxjs';
import { RecordingStatus } from '../../models/recording.model';

/**
 * @internal
 */
export interface RecordingInfo {
	status: RecordingStatus;
	id: string;
	name?: string;
	reason?: string;
}

/**
 * @internal
 */
@Injectable({
	providedIn: 'root'
})
export class RecordingService {
	/**
	 * Recording status Observable which pushes the recording state in every update.
	 */
	recordingStatusObs: Observable<RecordingInfo>;
	private recordingStatus = <BehaviorSubject<RecordingInfo>>new BehaviorSubject(null);

	constructor() {
		this.recordingStatusObs = this.recordingStatus.asObservable();
	}

	startRecording(event: RecordingEvent) {
		const info: RecordingInfo = {
			status: RecordingStatus.STARTED,
			id: event.id,
			name: event.name,
			reason: event.reason
		};
		this.recordingStatus.next(info);
	}

	stopRecording(event: RecordingEvent) {
		const info: RecordingInfo = {
			status: RecordingStatus.STOPPED,
			id: event.id,
			name: event.name,
			reason: event.reason
		};
		this.recordingStatus.next(info);
	}
}
