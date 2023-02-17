import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { BroadcastingStatus } from '../../models/broadcasting.model';

@Injectable({
	providedIn: 'root'
})
export class BroadcastingService {
	/**
	 * Broadcasting status Observable which pushes the broadcasting state in every update.
	 */
	broadcastingStatusObs: Observable<{ status: BroadcastingStatus; time?: Date } | undefined>;

	private broadcastingTime: Date | undefined;
	private broadcastingTimeInterval: NodeJS.Timer;
	private broadcastingStatus = <BehaviorSubject<{ status: BroadcastingStatus; time?: Date } | undefined>>new BehaviorSubject(undefined);

	constructor() {
		this.broadcastingStatusObs = this.broadcastingStatus.asObservable();
	}

	/**
	 * @internal
	 * @param status
	 */
	updateStatus(status: BroadcastingStatus) {
		if (status === BroadcastingStatus.STARTED) {
			this.startBroadcastingTime();
		} else {
			this.stopBroadcastingTime();
		}
		this.broadcastingStatus.next({ status, time: this.broadcastingTime });
	}

	private startBroadcastingTime() {
		this.broadcastingTime = new Date();
		this.broadcastingTime.setHours(0, 0, 0, 0);
		this.broadcastingTimeInterval = setInterval(() => {
			this.broadcastingTime?.setSeconds(this.broadcastingTime.getSeconds() + 1);
			this.broadcastingTime = new Date(this.broadcastingTime.getTime());
			this.broadcastingStatus.next({ status: this.broadcastingStatus.getValue()?.status, time: this.broadcastingTime });
		}, 1000);
	}

	private stopBroadcastingTime() {
		clearInterval(this.broadcastingTimeInterval);
		this.broadcastingTime = undefined;
	}
}
