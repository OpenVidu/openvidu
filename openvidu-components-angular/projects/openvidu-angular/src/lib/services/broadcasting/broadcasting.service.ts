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
	private broadcastingTimeInterval: NodeJS.Timeout;
	private broadcastingStatus = <BehaviorSubject<{ status: BroadcastingStatus; time?: Date } | undefined>>new BehaviorSubject(undefined);

	/**
	 * @internal
	 */
	constructor() {
		this.broadcastingStatusObs = this.broadcastingStatus.asObservable();
	}

	/**
	 * Update the broadcasting status. This method is used by the OpenVidu Angular library to update the broadcasting status.
	 * @param status {@link BroadcastingStatus}
	 */
	updateStatus(status: BroadcastingStatus) {
		this.broadcastingStatus.next({ status, time: this.broadcastingTime });
	}

	startBroadcasting() {
		this.startBroadcastingTime();
		this.updateStatus(BroadcastingStatus.STARTED);
	}

	stopBroadcasting() {
		this.stopBroadcastingTime();
		this.updateStatus(BroadcastingStatus.STOPPED);
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
