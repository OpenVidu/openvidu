import { DeviceType } from './device.model';
import {
	AudioCaptureOptions,
	DataPublishOptions,
	LocalParticipant,
	LocalTrack,
	LocalTrackPublication,
	RemoteParticipant,
	Room,
	ScreenShareCaptureOptions,
	Track,
	TrackPublication,
	TrackPublishOptions,
	VideoCaptureOptions,
	VideoPresets
} from 'livekit-client';

export interface ParticipantLeftEvent {
	roomName: string;
	participantName: string;
	identity: string;
	reason: ParticipantLeftReason;
}

export enum ParticipantLeftReason {
	// User-initiated disconnections
	LEAVE = 'LEAVE', // The participant left the room voluntarily
	BROWSER_UNLOAD = 'browser_unload', // The participant was disconnected due to a browser unload event

	// Network-related disconnections
	NETWORK_DISCONNECT = 'network_disconnect', // The participant was disconnected due to a network error
	SIGNAL_CLOSE = 'websocket_closed', // The participant was disconnected due to a websocket error

	// Server-initiated disconnections
	SERVER_SHUTDOWN = 'server_shutdown', // The server was shut down
	PARTICIPANT_REMOVED = 'participant_removed', // The participant was removed from the room
	ROOM_DELETED = 'room_deleted', // The room was deleted

	// Permission/policy-based disconnections
	DUPLICATE_IDENTITY = 'duplicate_identity', // The participant was disconnected due to a duplicate identity

	OTHER = 'other' // The participant was disconnected for an unknown reason
}
/**
 * Interface that defines the properties of the participant track publication.
 */
export interface ParticipantTrackPublication extends TrackPublication {
	/**
	 * The participant who published the track.
	 */
	participant: ParticipantModel;

	/**
	 * Indicates whether the HTML element associated with the track is pinned (fixed in place) or not.
	 */
	isPinned: boolean;

	/**
	 * Indicates whether the HTML element associated with the track is minimized (made smaller) or not.
	 */
	isMinimized: boolean;

	/**
	 * Indicates whether the track is from a camera source or not.
	 */
	isCameraTrack: boolean;

	/**
	 * Indicates whether the track is from a screen sharing source or not.
	 */
	isScreenTrack: boolean;

	/**
	 * Indicates whether the track is from an audio sharing source or not.
	 */
	isAudioTrack: boolean;

	/**
	 * Indicates whether the participant's audio is forcibly muted or not.
	 */
	isMutedForcibly?: boolean;
}

/**
 * Interface defining properties of a participant.
 */
export interface ParticipantProperties {
	/**
	 * The participant instance, which can be either a local participant or a remote participant.
	 */
	participant: LocalParticipant | RemoteParticipant;

	/**
	 * The room in which the participant is located, applicable only for local participants.
	 */
	room?: Room;

	/**
	 * The color profile associated with the participant.
	 * It specifies the visual representation of the participant in the user interface.
	 */
	colorProfile?: string;

	/**
	 * This property allows to know what screen track is the last one published for enlarging it
	 * Map <trackSid, publicationDate>
	 * @internal
	 **/
	screenTrackPublicationDate?: Map<string, number>;
}

/**
 * Class that represents a participant in the room.
 */
export class ParticipantModel {
	/**
	 * This property allows to know what screen track is the last one published for enlarging it
	 * Map <trackSid, publicationDate>
	 * @internal
	 **/
	screenTrackPublicationDate: Map<string, number>;
	/**
	 * The color profile associated with the participant.
	 * It specifies the visual representation of the participant in the user interface.
	 */
	colorProfile: string;
	private participant: LocalParticipant | RemoteParticipant;
	private room: Room | undefined;
	private speaking: boolean = false;
	private customVideoTrack: Partial<ParticipantTrackPublication>;
	private _hasEncryptionError: boolean = false;
	private _decryptedName: string | undefined;

	constructor(props: ParticipantProperties) {
		this.participant = props.participant;
		this.colorProfile = props.colorProfile ?? `hsl(${Math.random() * 360}, 100%, 80%)`;
		this.room = props.room;
		this.screenTrackPublicationDate = props.screenTrackPublicationDate ?? new Map<string, number>();

		this.customVideoTrack = {
			participant: this,
			kind: Track.Kind.Video,
			trackName: 'customVideoTrack',
			trackSid: 'customVideoTrack',
			source: Track.Source.Camera,
			isPinned: false,
			isMinimized: false,
			isMutedForcibly: false,
			isCameraTrack: true,
			isScreenTrack: false,
			isAudioTrack: false
		};
	}

	/**
	 * @internal
	 */
	get identity() {
		return this.participant.identity;
	}

	/**
	 * Returns the server assigned unique identifier for the participant.
	 * @returns string
	 */
	get sid(): string {
		return this.participant.sid;
	}

	/**
	 * Returns the participant name.
	 * @returns string
	 */
	get name(): string | undefined {
		return this._decryptedName ?? this.participant.name;
	}

	/**
	 * Returns the room name where the participant is.
	 * @return string | undefined
	 * @internal
	 */
	get roomName(): string | undefined {
		return this.room?.name;
	}

	/**
	 * Returns if the participant has enabled its camera.
	 */
	get isCameraEnabled(): boolean {
		return this.participant.isCameraEnabled;
	}

	/**
	 * Returns if the participant has enabled its microphone.
	 */
	get isMicrophoneEnabled(): boolean {
		return this.participant.isMicrophoneEnabled;
	}

	/**
	 * Returns if the participant has enabled its screen share.
	 */
	get isScreenShareEnabled(): boolean {
		return this.participant.isScreenShareEnabled;
	}

	/**
	 * Returns if the participant is speaking.
	 */
	get isSpeaking(): boolean {
		// There is a bug when a participant mutes its microphone, it is still considered as speaking
		// that's why we need to check if the microphone is enabled
		return this.speaking && this.isMicrophoneEnabled;
	}

	/**
	 * Returns all the participant tracks.
	 * @return ParticipantTrackPublication[]
	 */
	get tracks(): ParticipantTrackPublication[] {
		const defaultTracks = this.participant.getTrackPublications().map((track: TrackPublication) => {
			track['participant'] = this;
			track['isPinned'] = track['isPinned'];
			track['isMinimized'] = track['isMinimized'];
			track['isMutedForcibly'] = track['isMutedForcibly'] || false;
			track['isCameraTrack'] = track.source === Track.Source.Camera;
			track['isScreenTrack'] = track.source === Track.Source.ScreenShare;
			track['isAudioTrack'] = track.kind === Track.Kind.Audio;
			return track as ParticipantTrackPublication;
		});

		const hasCameraTrack = defaultTracks.some((track) => track.source === Track.Source.Camera);
		// const hasOnlyAudioTrack = defaultTracks.every((track) => track.kind === Track.Kind.Audio);
		// const hasOnlyScreenTrack = defaultTracks.every((track) => track.source === Track.Source.ScreenShare);
		if (!hasCameraTrack) {
			/**
			 * If default tracks does not contain camera track, we add a custom video track with the aim of showing the
			 * participant's name and avatar. If we don't add this track, the participant's
			 * name and avatar will not be shown in the video grid and the participant would be a
			 * ghost in the room.
			 **/
			defaultTracks.push(this.customVideoTrack as ParticipantTrackPublication);
		}
		return defaultTracks;
	}

	/**
	 * Returns all the participant video tracks.
	 * @return ParticipantTrackPublication[]
	 */
	get videoTracks(): ParticipantTrackPublication[] {
		return this.tracks.filter((track: TrackPublication) => track.kind === Track.Kind.Video);
	}

	/**
	 * Returns all the participant audio tracks.
	 * @return ParticipantTrackPublication[]
	 */
	get audioTracks(): ParticipantTrackPublication[] {
		return this.tracks.filter((track: TrackPublication) => track.kind === Track.Kind.Audio);
	}

	/**
	 * Returns all the participant camera tracks.
	 * @return ParticipantTrackPublication[]
	 */
	get cameraTracks(): ParticipantTrackPublication[] {
		return this.tracks.filter((track: TrackPublication) => track.source === Track.Source.Camera && track.kind === Track.Kind.Video);
	}

	/**
	 * Returns if the participant is local.
	 */
	get isLocal(): boolean {
		return this.participant.isLocal;
	}

	/**
	 * Returns if the participant has only audio tracks.
	 */
	get onlyHasAudioTracks(): boolean {
		return this.tracks.every((track) => track.kind === Track.Kind.Audio);
	}

	/**
	 * Returns if the participant has only screen tracks.
	 */
	get onlyHasScreenTracks(): boolean {
		return this.tracks.every((track) => track.source === Track.Source.ScreenShare);
	}

	/**
	 * Returns if the participant has any track forcibly muted.
	 * @internal
	 */
	get isMutedForcibly() {
		return this.tracks.some((track) => track.isMutedForcibly);
	}

	/**
	 * Returns if the participant has any track minimized
	 * @internal
	 */
	get isMinimized(): boolean {
		return this.tracks.some((track) => track.isMinimized);
	}

	/**
	 * @returns ParticipantProperties
	 * @internal
	 */
	getProperties(): ParticipantProperties {
		return {
			participant: this.participant,
			room: this.room,
			colorProfile: this.colorProfile,
			screenTrackPublicationDate: this.screenTrackPublicationDate
		};
	}

	/**
	 *
	 * Creates a screen capture tracks with getDisplayMedia(). A LocalVideoTrack is always created and returned.
	 * @param options
	 * @returns Promise<LocalTrack[]>
	 * @internal
	 */
	createScreenTracks(options: ScreenShareCaptureOptions): Promise<LocalTrack[]> {
		if (this.participant instanceof LocalParticipant) {
			return this.participant.createScreenTracks(options);
		}
		return Promise.reject("Remote participant can't create screen tracks");
	}

	/**
	 *
	 * Publishes a track to the room
	 * @param track
	 * @returns
	 */
	publishTrack(track: LocalTrack, options?: TrackPublishOptions): Promise<LocalTrackPublication> {
		if (this.participant instanceof LocalParticipant) {
			return this.participant.publishTrack(track, options);
		}
		return Promise.reject("Remote participant can't publish tracks");
	}

	/**
	 * Enable or disable a participant's camera track.
	 * @param enabled
	 * @returns Promise<LocalTrackPublication | undefined>
	 * @internal
	 */
	setCameraEnabled(
		enabled: boolean,
		options?: VideoCaptureOptions,
		publishOptions?: TrackPublishOptions
	): Promise<LocalTrackPublication | undefined> {
		if (this.participant instanceof LocalParticipant) {
			return this.participant.setCameraEnabled(enabled, options, publishOptions);
		}
		return Promise.reject("Remote participant can't enable camera");
	}

	/**
	 * Enable or disable a participant's microphone track.
	 * @param enabled
	 * @returns Promise<LocalTrackPublication | undefined>
	 * @internal
	 */
	setMicrophoneEnabled(
		enabled: boolean,
		options?: AudioCaptureOptions,
		publishOptions?: TrackPublishOptions
	): Promise<LocalTrackPublication | undefined> {
		if (this.participant instanceof LocalParticipant) {
			return this.participant.setMicrophoneEnabled(enabled, options, publishOptions);
		}
		return Promise.reject("Remote participant can't enable microphone");
	}

	/**
	 * Start or stop sharing a participant's screen
	 * @param enabled
	 * @returns Promise<LocalTrackPublication | undefined>
	 * @internal
	 */
	setScreenShareEnabled(
		enabled: boolean,
		options: ScreenShareCaptureOptions,
		publishOptions?: TrackPublishOptions
	): Promise<LocalTrackPublication | undefined> {
		if (this.participant instanceof LocalParticipant) {
			return this.participant.setScreenShareEnabled(enabled, options, publishOptions);
		}
		return Promise.reject("Remote participant can't enable screen share");
	}

	/**
	 * Sets the participant's speaking status.
	 * @param speaking
	 * @internal
	 */
	setSpeaking(speaking: boolean) {
		this.speaking = speaking;
	}

	/**
	 * Switches the active camera track used in this room to the given device id.
	 * @param deviceId
	 * @returns Promise<void>
	 * @internal
	 */
	async switchCamera(deviceId: string): Promise<void> {
		if (this.room) {
			await this.room.switchActiveDevice(DeviceType.VIDEO_INPUT, deviceId);
		}
	}

	/**
	 * Switches the active microphone track used in this room to the given device id.
	 * @param deviceId
	 * @returns Promise<void>
	 * @internal
	 */
	async switchMicrophone(deviceId: string): Promise<void> {
		if (this.room) {
			await this.room.switchActiveDevice(DeviceType.AUDIO_INPUT, deviceId);
		}
	}

	/**
	 * Switches the active screen share track showing a native browser dialog to select a screen or window.
	 * @param newTrack [LocalTrack](https://docs.livekit.io/client-sdk-js/classes/LocalTrack.html)
	 * @returns Promise<void>
	 * @internal
	 */
	async switchScreenshare(newTrack: LocalTrack): Promise<void> {
		if (this.participant instanceof LocalParticipant) {
			const screenTrack = this.tracks.find((track) => track.source === Track.Source.ScreenShare);
			if (screenTrack) {
				await (screenTrack.videoTrack as LocalTrack).replaceTrack(newTrack.mediaStreamTrack);
				return Promise.resolve();
			}
			return Promise.reject("Remote participant can't switch screen share");
		}
	}

	/**
	 * Publish a new data payload to the room. Data will be forwarded to each participant in the room if the destination field in publishOptions is empty.
	 * @param data
	 * @param {DataPublishOptions} publishOptions [DataPublishOptions](https://docs.livekit.io/client-sdk-js/types/DataPublishOptions.html)
	 * @returns Promise that is resolved if the data was successfully sent, or rejected with an Error object if not.
	 * @internal
	 */
	async publishData(data: Uint8Array, publishOptions: DataPublishOptions): Promise<void> {
		if (this.participant instanceof LocalParticipant) {
			return this.participant.publishData(data, publishOptions);
		}
		return Promise.reject("Remote participant can't publish data");
	}

	/**
	 * @returns The participant active connection types
	 * @internal
	 */
	getTracksPublishedTypes(): Track.Source[] {
		const tracksPublishedTypes: Track.Source[] = [];
		if (this.isCameraEnabled) tracksPublishedTypes.push(Track.Source.Camera);
		if (this.isScreenShareEnabled) tracksPublishedTypes.push(Track.Source.ScreenShare);
		if (this.isMicrophoneEnabled) tracksPublishedTypes.push(Track.Source.Microphone);

		return tracksPublishedTypes;
	}

	/**
	 * Sets the participant's name.
	 * @param name
	 * @internal
	 * As updating name requires that the participant has the `canUpdateOwnMetadata` to true in server side, which is a little bit insecure,
	 * we decided to not allow this feature for now.
	 */
	// setName(name: string) {
	// 	if (this.participant instanceof LocalParticipant) {
	// 		this.participant.setName(name);
	// 	}
	// }

	/**
	 * Sets all video track elements to pinned or unpinned given a boolean value
	 * @param pinned
	 * @internal
	 */
	setAllVideoPinned(pinned: boolean) {
		this.tracks.forEach((track) => (track.isPinned = pinned));
	}

	/**
	 * Toggle the pinned status of a video track element
	 * @param trackSid
	 * @internal
	 */
	toggleVideoPinned(trackSid: string): void {
		const track = this.tracks.find((track) => track.trackSid === trackSid);
		if (track) {
			track.isPinned = !track.isPinned;
		}
	}

	/**
	 * Sets all video track elements from a specific source to pinned or unpinned given a boolean value
	 * @param source The source of the track to be pinned or unpinned (e.g., 'camera', 'screenShare').
	 * @param pinned
	 * @internal
	 */
	setVideoPinnedBySource(source: Track.Source, pinned: boolean) {
		this.tracks
			.filter((track) => track.source === source && track.kind === Track.Kind.Video)
			.forEach((track) => (track.isPinned = pinned));
	}

	/**
	 * Toggle the minimized status of a video track element
	 * @param trackSid
	 * @returns
	 * @internal
	 */
	toggleVideoMinimized(trackSid: string): void {
		const track = this.tracks.find((track) => track.trackSid === trackSid);
		if (track) {
			track.isMinimized = !track.isMinimized;
		}
	}

	/**
	 * Sets the publication date of a screen track
	 * @param trackSid
	 * @param publicationDate
	 * @internal
	 */
	setScreenTrackPublicationDate(trackSid: string, publicationDate: number) {
		if (publicationDate === -1) {
			this.screenTrackPublicationDate.delete(trackSid);
		} else {
			this.screenTrackPublicationDate.set(trackSid, publicationDate);
		}
	}

	/**
	 * @internal
	 */
	// someHasVideoPinned(): boolean {
	// 	return Array.from(this.streams.values()).some((conn) => conn.videoPinned);
	// }

	/**
	 * @internal
	 */
	setMutedForcibly(muted: boolean) {
		this.tracks.forEach((track) => (track.isMutedForcibly = muted));
	}

	/**
	 * Gets whether this participant has an encryption error.
	 * This indicates that the participant cannot decrypt the video stream due to an incorrect encryption key.
	 * @returns boolean
	 */
	get hasEncryptionError(): boolean {
		return this._hasEncryptionError;
	}

	/**
	 * Sets the encryption error state for this participant.
	 * @param hasError - Whether the participant has an encryption error
	 * @internal
	 */
	setEncryptionError(hasError: boolean) {
		this._hasEncryptionError = hasError;
	}

	/**
	 * Sets the decrypted name for this participant.
	 * @param decryptedName - The decrypted participant name
	 * @internal
	 */
	setDecryptedName(decryptedName: string | undefined) {
		this._decryptedName = decryptedName;
	}
}
