import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { BroadcastingStatus, BroadcastingStatusInfo } from '../../models/broadcasting.model';

@Injectable({
	providedIn: 'root'
})
export class BroadcastingService {
	/**
	 * Broadcasting status Observable which pushes the {@link BroadcastingStatusInfo} in every update.
	 */
	broadcastingStatusObs: Observable<BroadcastingStatusInfo>;

	private broadcastingStatus = <BehaviorSubject<BroadcastingStatusInfo>>new BehaviorSubject({
		status: BroadcastingStatus.STOPPED,
		broadcastingId: undefined,
		error: undefined
	});

	/**
	 * @internal
	 */
	constructor() {
		this.broadcastingStatusObs = this.broadcastingStatus.asObservable();
	}

	/**
	 * @internal
	 */
	setBroadcastingStarted(broadcastingId: string) {
		const statusInfo: BroadcastingStatusInfo = {
			status: BroadcastingStatus.STARTED,
			broadcastingId,
			error: undefined
		};

		this.updateStatus(statusInfo);
	}

	/**
	 * @internal
	 */
	setBroadcastingStopped() {
		const statusInfo: BroadcastingStatusInfo = {
			status: BroadcastingStatus.STOPPED,
			broadcastingId: undefined
		};
		this.updateStatus(statusInfo);
	}

	/**
	 * @internal
	 * @param error
	 */
	setBroadcastingFailed(error: string) {
		const statusInfo: BroadcastingStatusInfo = {
			status: BroadcastingStatus.FAILED,
			broadcastingId: undefined,
			error
		};
		this.updateStatus(statusInfo);
	}

	/**
	 * Set the broadcasting {@link BroadcastingStatus} to **starting**.
	 * The `started` status will be updated automatically when the broadcasting is started.
	 */
	setBroadcastingStarting() {
		const statusInfo: BroadcastingStatusInfo = {
			status: BroadcastingStatus.STARTING,
			broadcastingId: undefined,
			error: undefined
		};
		this.updateStatus(statusInfo);
	}

	/**
	 * Set the broadcasting {@link BroadcastingStatus} to **stopping**.
	 * The `stopped` status will be updated automatically when the broadcasting is stopped.
	 */
	setBroadcastingStopping() {
		const statusInfo: BroadcastingStatusInfo = {
			status: BroadcastingStatus.STOPPING,
			broadcastingId: this.broadcastingStatus.getValue().broadcastingId
		};
		this.updateStatus(statusInfo);
	}

	/**
	 * Update the broadcasting status.
	 * @param status {@link BroadcastingStatusInfo}
	 * @intenal
	 */
	private updateStatus(statusInfo: BroadcastingStatusInfo) {
		const { status, broadcastingId, error } = statusInfo;
		this.broadcastingStatus.next({
			status,
			broadcastingId,
			error
		});
	}
}
