import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { StreamingStatus } from '../../models/streaming.model';

@Injectable({
	providedIn: 'root'
})
export class StreamingService {
	/**
	 * Streaming status Observable which pushes the streaming state in every update.
	 */
	streamingStatusObs: Observable<{ status: StreamingStatus; time?: Date } | undefined>;

	private streamingTime: Date | undefined;
	private streamingTimeInterval: NodeJS.Timer;
	private streamingStatus = <BehaviorSubject<{ status: StreamingStatus; time?: Date } | undefined>>new BehaviorSubject(undefined);

	constructor() {
		this.streamingStatusObs = this.streamingStatus.asObservable();
	}

	/**
	 * @internal
	 * @param status
	 */
	updateStatus(status: StreamingStatus) {
		if (status === StreamingStatus.STARTED) {
			this.startStreamingTime();
		} else {
			this.stopStreamingTime();
		}
		this.streamingStatus.next({ status, time: this.streamingTime });
	}

	private startStreamingTime() {
		this.streamingTime = new Date();
		this.streamingTime.setHours(0, 0, 0, 0);
		this.streamingTimeInterval = setInterval(() => {
			this.streamingTime?.setSeconds(this.streamingTime.getSeconds() + 1);
			this.streamingTime = new Date(this.streamingTime.getTime());
			this.streamingStatus.next({ status: this.streamingStatus.getValue()?.status, time: this.streamingTime });
		}, 1000);
	}

	private stopStreamingTime() {
		clearInterval(this.streamingTimeInterval);
		this.streamingTime = undefined;
	}
}
