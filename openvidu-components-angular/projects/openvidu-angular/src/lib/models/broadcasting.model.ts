export enum BroadcastingStatus {
	STARTING = 'starting',
	STARTED = 'started',
	STOPPING = 'stopping',
	STOPPED = 'stopped',
	FAILED = 'failed'
}

export interface BroadcastingError {
	message: string;
	// If broadcasting feature is available or not
	broadcastAvailable: boolean;
}
