/**
 * @internal
 */

export enum DataTopic {
	CHAT = 'chat',
	RECORDING_STARTING = 'recordingStarting',
	RECORDING_STARTED = 'recordingStarted',
	RECORDING_STOPPING = 'recordingStopping',
	RECORDING_STOPPED = 'recordingStopped',
	RECORDING_DELETED = 'recordingDeleted',
	RECORDING_FAILED = 'recordingFailed',
	BROADCASTING_STARTING = 'broadcastingStarting',
	BROADCASTING_STARTED = 'broadcastingStarted',
	BROADCASTING_STOPPING = 'broadcastingStopping',
	BROADCASTING_STOPPED = 'broadcastingStopped',
	BROADCASTING_FAILED = 'broadcastingFailed',
	ROOM_STATUS = 'roomStatus'
}
