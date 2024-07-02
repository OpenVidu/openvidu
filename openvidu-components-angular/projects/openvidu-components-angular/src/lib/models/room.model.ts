import { RecordingInfo } from './recording.model';

/**
 * @internal
 */
export interface RoomStatusData {
	isRecordingStarted: boolean;
	isBroadcastingStarted: boolean;
	recordingList: RecordingInfo[];
	broadcastingId: string;
}
