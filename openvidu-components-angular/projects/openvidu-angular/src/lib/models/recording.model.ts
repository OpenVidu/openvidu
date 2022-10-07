export enum RecordingStatus {
	STARTING = 'starting',
	STARTED = 'started',
	STOPPING = 'stopping',
	STOPPED = 'stopped',
	FAILED = 'failed',
	READY = 'ready'
}

export interface RecordingInfo {
	status: RecordingStatus;
	id?: string;
	name?: string;
	reason?: string;
	createdAt?: number;
	duration?: number;
	size?: string;
	url?: string;
}
