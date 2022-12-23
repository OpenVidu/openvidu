/**
 * @internal
 */
export enum Signal {
	NICKNAME_CHANGED = 'nicknameChanged',
	CHAT = 'chat',

	//TODO: Remove them when RTMP Exported was included on OV and streaming ready event was fired.
	STREAMING_STARTED = "streamingStarted",
	STREAMING_STOPPED = "streamingStopped"
}