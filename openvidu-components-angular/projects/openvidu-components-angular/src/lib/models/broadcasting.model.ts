/**
 * Enum representing the possible status of a broadcast
 */
export enum BroadcastingStatus {
	STARTING = 'STARTING',
	STARTED = 'STARTED',
	STOPPING = 'STOPPING',
	STOPPED = 'STOPPED',
	FAILED = 'FAILED'
}

/**
 * Interface representing information related to the broadcasting status
 */
export interface BroadcastingStatusInfo {
	status: BroadcastingStatus;
	broadcastingId: string | undefined;
	error?: string;
}

/**
 * Interface representing a broadcasting event
 */
interface BroadcastingEvent {
	roomName: string;
}

export interface BroadcastingStartRequestedEvent extends BroadcastingEvent {
	broadcastUrl: string;
}
export interface BroadcastingStopRequestedEvent extends BroadcastingEvent {
	broadcastingId: string;
}
