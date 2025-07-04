/**
 * Enum representing the possible status of a recording
 */
export enum RecordingStatus {
	STARTING = 'STARTING',
	STARTED = 'STARTED',
	STOPPING = 'STOPPING',
	STOPPED = 'STOPPED',
	FAILED = 'FAILED',
	READY = 'READY'
}

export enum RecordingOutputMode {
	COMPOSED = 'COMPOSED',
	INDIVIDUAL = 'INDIVIDUAL'
}

/**
 * Interface representing information related to the recording status
 */
export interface RecordingStatusInfo {
	status: RecordingStatus;
	recordingList: RecordingInfo[];
	startedAt?: Date;
	error?: string;
}

/**
 * Interface representing a recording
 */
export interface RecordingInfo {
	id: string;
	roomName: string;
	roomId: string;
	outputMode: RecordingOutputMode;
	status: RecordingStatus;
	filename?: string;
	startedAt?: number;
	endedAt?: number;
	duration?: number;
	size?: number;
	location?: string;
	// Frontend only property to mark the recording as deleted
	markedForDeletion?: boolean;
}

/**
 * Interface representing a recording event
 */
interface RecordingEvent {
	roomName: string;
	recordingId?: string;
}

export interface RecordingStartRequestedEvent extends RecordingEvent {}
export interface RecordingStopRequestedEvent extends RecordingEvent {}
export interface RecordingDeleteRequestedEvent extends RecordingEvent {}
export interface RecordingDownloadClickedEvent extends RecordingEvent {}

export interface RecordingPlayClickedEvent extends RecordingEvent {}
