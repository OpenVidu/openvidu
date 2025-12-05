import { Injectable } from '@angular/core';
import {
	AudioCaptureOptions,
	ConnectionState,
	CreateLocalTracksOptions,
	E2EEOptions,
	ExternalE2EEKeyProvider,
	LocalAudioTrack,
	LocalTrack,
	LocalVideoTrack,
	Room,
	RoomOptions,
	Track,
	VideoCaptureOptions,
	VideoPresets,
	createLocalTracks
} from 'livekit-client';
import { BackgroundProcessor, BackgroundProcessorWrapper, SwitchBackgroundProcessorOptions } from '@livekit/track-processors';
import { ILogger } from '../../models/logger.model';
import { OpenViduComponentsConfigService } from '../config/directive-config.service';
import { DeviceService } from '../device/device.service';
import { LoggerService } from '../logger/logger.service';
import { StorageService } from '../storage/storage.service';

@Injectable({
	providedIn: 'root'
})
export class OpenViduService {
	/*
	 * @internal
	 */
	// isSttReadyObs: Observable<boolean>;
	// private STT_TIMEOUT_MS = 2 * 1000;
	// private sttReconnectionTimeout: NodeJS.Timeout;
	// private _isSttReady: BehaviorSubject<boolean> = new BehaviorSubject(true);

	private room: Room;
	private keyProvider: ExternalE2EEKeyProvider | undefined;

	/**
	 * @internal
	 * Indicates whether the client initiated disconnect event should be handled.
	 * This is used to determine if the disconnect event should be emitted when the 'Disconnect' event is triggered
	 */
	shouldHandleClientInitiatedDisconnectEvent = true;

	/*
	 * Tracks used in the prejoin component. They are created when the room is not yet created.
	 */
	private localTracks: LocalTrack[] = [];
	private livekitToken = '';
	private livekitUrl = '';
	private log: ILogger;

	/**
	 * Background processor for video tracks. Initialized in disabled mode.
	 * This processor is shared between prejoin and in-room states.
	 */
	private backgroundProcessor: BackgroundProcessorWrapper;

	/**
	 * @internal
	 */
	constructor(
		private loggerSrv: LoggerService,
		private deviceService: DeviceService,
		private storageService: StorageService,
		private configService: OpenViduComponentsConfigService
	) {
		this.log = this.loggerSrv.get('OpenViduService');
		// this.isSttReadyObs = this._isSttReady.asObservable();
		this.backgroundProcessor = BackgroundProcessor({ mode: 'disabled' });
	}

	/**
	 * Creates a new Room with audio and video devices selected or default ones.
	 * @internal
	 */
	initRoom(): void {
		// Check if E2EE configuration needs to be applied
		const e2eeKey = this.configService.getE2EEKey();
		const needsE2EEConfig = e2eeKey && e2eeKey.trim() !== '' && !this.keyProvider;

		// If room already exists and doesn't need E2EE reconfiguration, don't recreate it
		if (this.room && !needsE2EEConfig) {
			this.log.d('Room already initialized, skipping re-initialization');
			return;
		}

		// If room exists but needs E2EE configuration, we need to recreate it
		if (this.room && needsE2EEConfig) {
			this.log.d('Room needs E2EE configuration, recreating room');
			this.room = null as any;
		}

		const videoDeviceId = this.deviceService.getCameraSelected()?.device ?? undefined;
		const audioDeviceId = this.deviceService.getMicrophoneSelected()?.device ?? undefined;

		const roomOptions: RoomOptions = {
			adaptiveStream: true,
			dynacast: true,
			audioCaptureDefaults: {
				deviceId: audioDeviceId,
				echoCancellation: true,
				noiseSuppression: true,
				autoGainControl: true
			},
			videoCaptureDefaults: {
				deviceId: videoDeviceId,
				resolution: VideoPresets.h720.resolution
			},
			publishDefaults: {
				dtx: true,
				simulcast: true,
				stopMicTrackOnMute: true
			},
			stopLocalTrackOnUnpublish: true,
			disconnectOnPageLeave: true
		};

		// Configure E2EE if key is provided and keyProvider exists
		if (needsE2EEConfig) {
			// Create worker using the copied livekit-client e2ee worker from assets
			roomOptions.encryption = this.buildE2EEOptions();
			// !This config enables the data channel encryption
			// (roomOptions as any).encryption = this.buildE2EEOptions();
		}

		this.room = new Room(roomOptions);
		this.log.d('Room initialized successfully');
	}

	private buildE2EEOptions(): E2EEOptions {
		this.log.d('Configuring E2EE with provided key');
		this.keyProvider = new ExternalE2EEKeyProvider();
		// Create worker using the copied livekit-client e2ee worker from assets
		return {
			keyProvider: this.keyProvider,
			worker: new Worker('./assets/livekit/livekit-client.e2ee.worker.mjs', { type: 'module' })
		};
	}

	/**
	 * Connects local participant to the room
	 */
	async connectRoom(): Promise<void> {
		try {
			// Configure E2EE if key provider was initialized
			if (this.keyProvider) {
				const e2eeKey = this.configService.getE2EEKey();
				if (e2eeKey) {
					this.log.d('Setting E2EE key and enabling encryption');
					await this.keyProvider.setKey(e2eeKey);
					await this.room.setE2EEEnabled(true);
					this.log.d('E2EE successfully enabled');
				}
			}
			await this.room.connect(this.livekitUrl, this.livekitToken);
			this.log.d(`Successfully connected to room ${this.room.name}`);

			const participantName = this.storageService.getParticipantName();
			if (participantName) {
				this.room.localParticipant.setName(participantName);
			}
		} catch (error) {
			this.log.e('Error connecting to room:', error);
			throw { code: 'CONNECTION_ERROR', message: `Error connecting to the server at the following URL: ${this.livekitUrl}` };
		}
	}

	/**
	 * Disconnects from the current room.
	 *
	 * This method will check if there's an active connection to a room before attempting to disconnect.
	 * If the room is connected, it will perform the disconnection and call the optional callback function.
	 *
	 * @param callback - Optional function to be executed after a successful disconnection
	 * @returns A Promise that resolves once the disconnection is complete
	 */
	async disconnectRoom(callback?: () => void, shouldHandleClientInitiatedDisconnectEvent: boolean = true): Promise<void> {
		this.shouldHandleClientInitiatedDisconnectEvent = shouldHandleClientInitiatedDisconnectEvent;
		if (this.isRoomConnected()) {
			this.log.d('Disconnecting from room');
			await this.room.disconnect();
			if (callback) callback();
		}
	}

	/**
	 * @returns Room instance
	 */
	getRoom(): Room {
		if (!this.room) {
			this.log.e('Room is not initialized. Make sure token is set before accessing the room.');
			throw new Error('Room is not initialized. Make sure token is set before accessing the room.');
		}
		return this.room;
	}

	/**
	 * Checks if room is initialized without throwing an error
	 * @returns true if room is initialized, false otherwise
	 */
	isRoomInitialized(): boolean {
		return !!this.room;
	}

	/**
	 * Returns the room name
	 */
	getRoomName(): string {
		return this.room?.name;
	}

	/**
	 * Returns if local participant is connected to the room
	 * @returns
	 */
	isRoomConnected(): boolean {
		return this.room?.state === ConnectionState.Connected;
	}

	hasRoomTracksPublished(): boolean {
		const { localParticipant, remoteParticipants } = this.getRoom();
		const localTracks = localParticipant.getTrackPublications();
		const remoteTracks = Array.from(remoteParticipants.values()).flatMap((p) => p.getTrackPublications());

		return localTracks.length > 0 || remoteTracks.length > 0;
	}

	/**
	 * @internal
	 */
	initializeAndSetToken(token: string, livekitUrl?: string): void {
		const { livekitUrl: urlFromToken } = this.extractLivekitData(token);

		this.livekitToken = token;
		const url = livekitUrl || urlFromToken;

		if (!url) {
			this.log.e('LiveKit URL is not defined. Please, check the livekitUrl parameter of the VideoConferenceComponent');
			throw new Error('Livekit URL is not defined');
		}

		this.livekitUrl = url;
		// this.livekitRoomAdmin = !!livekitRoomAdmin;

		// Initialize room if it doesn't exist yet
		// This ensures that getRoom() won't fail if token is set before onTokenRequested
		if (!this.room) {
			this.log.d('Room not initialized yet, initializing room due to token assignment');
			this.initRoom();
		}
		// return this.room.prepareConnection(this.livekitUrl, this.livekitToken);
	}

	/**
	 * Sets the local tracks for the OpenVidu service.
	 *
	 * @param tracks - An array of LocalTrack objects representing the local tracks to be set.
	 * @returns void
	 * @internal
	 */
	setLocalTracks(tracks: LocalTrack[]): void {
		this.localTracks = tracks.filter((track) => track !== undefined) as LocalTrack[];
	}

	/**
	 * @internal
	 * @returns
	 */
	getLocalTracks(): LocalTrack[] {
		return this.localTracks;
	}

	/**
	 * Switches the background mode on the local video track.
	 * Works both in prejoin and in-room states.
	 * @param options - The switch options (mode, blurRadius, imagePath)
	 * @returns Promise<void>
	 * @internal
	 */
	async switchBackgroundMode(options: SwitchBackgroundProcessorOptions): Promise<void> {
		await this.backgroundProcessor.switchTo(options);
		this.log.d('Background mode switched:', options);
	}

	/**
	 * @internal
	 **/
	removeLocalTracks(): void {
		this.localTracks.forEach((track) => {
			track.stop();
			track.detach();
		});
		this.localTracks = [];
	}

	/**
	 * Creates local tracks for video and audio devices.
	 *
	 * @param videoDeviceId - The ID of the video device to use. If not provided, the default video device will be used.
	 * @param audioDeviceId - The ID of the audio device to use. If not provided, the default audio device will be used.
	 * @param allowPartialCreation - If true, allows creating tracks even if some devices fail
	 * @returns A promise that resolves to an array of LocalTrack objects representing the created tracks.
	 * @internal
	 */
	async createLocalTracks(
		videoDeviceId: string | boolean | undefined = undefined,
		audioDeviceId: string | boolean | undefined = undefined,
		allowPartialCreation: boolean = true
	): Promise<LocalTrack[]> {
		// Default values: true if device is enabled, false otherwise
		videoDeviceId ??= this.deviceService.isCameraEnabled();
		audioDeviceId ??= this.deviceService.isMicrophoneEnabled();

		const options: CreateLocalTracksOptions = {
			audio: { echoCancellation: true, noiseSuppression: true },
			video: {}
		};

		// Video device
		if (videoDeviceId === true) {
			options.video = this.deviceService.hasVideoDeviceAvailable()
				? { deviceId: this.deviceService.getCameraSelected()?.device || 'default' }
				: false;
		} else if (videoDeviceId === false) {
			options.video = false;
		} else {
			(options.video as VideoCaptureOptions).deviceId = videoDeviceId;
		}

		// Audio device
		if (audioDeviceId === true) {
			if (this.deviceService.hasAudioDeviceAvailable()) {
				audioDeviceId = this.deviceService.getMicrophoneSelected()?.device || 'default';
				(options.audio as AudioCaptureOptions).deviceId = audioDeviceId;
			} else {
				options.audio = false;
			}
		} else if (audioDeviceId === false) {
			options.audio = false;
		} else {
			(options.audio as AudioCaptureOptions).deviceId = audioDeviceId;
		}

		let newLocalTracks: LocalTrack[] = [];

		if (options.audio || options.video) {
			this.log.d('Creating local tracks with options', options);

			if (allowPartialCreation) {
				// Try to create tracks separately to handle device conflicts gracefully
				newLocalTracks = await this.createTracksWithFallback(options);
			} else {
				// Original behavior - all or nothing
				newLocalTracks = await createLocalTracks(options);
			}

			// Apply background processor to video track (initialized in disabled mode)
			// This ensures the processor is attached before publishing for smooth transitions
			const videoTrack = newLocalTracks.find((t) => t.kind === Track.Kind.Video) as LocalVideoTrack | undefined;
			if (videoTrack) {
				await videoTrack.setProcessor(this.backgroundProcessor);
				this.log.d('Background processor applied to newly created video track');
			}

			// Mute tracks if devices are disabled
			if (!this.deviceService.isCameraEnabled()) {
				newLocalTracks.find((t) => t.kind === Track.Kind.Video)?.mute();
			}
			if (!this.deviceService.isMicrophoneEnabled()) {
				newLocalTracks.find((t) => t.kind === Track.Kind.Audio)?.mute();
			}
		}
		return newLocalTracks;
	}

	/**
	 * Creates tracks with fallback strategy to handle device conflicts
	 * @param options - The track creation options
	 * @returns Array of successfully created tracks
	 * @internal
	 */
	private async createTracksWithFallback(options: CreateLocalTracksOptions): Promise<LocalTrack[]> {
		const tracks: LocalTrack[] = [];

		// Try to create video track separately
		if (options.video) {
			try {
				const videoTracks = await createLocalTracks({ video: options.video });
				tracks.push(...videoTracks);
				this.log.d('Video track created successfully');
			} catch (error) {
				this.log.w('Failed to create video track, device may be busy:', error);
				// Still continue to try audio track
			}
		}

		// Try to create audio track separately
		if (options.audio) {
			try {
				const audioTracks = await createLocalTracks({ audio: options.audio });
				tracks.push(...audioTracks);
				this.log.d('Audio track created successfully');
			} catch (error) {
				this.log.w('Failed to create audio track, device may be busy:', error);
			}
		}

		return tracks;
	}

	/**
	 * @internal
	 * As the Room is not created yet, we need to handle the media tracks with a temporary array of tracks.
	 * This method must be only called from the prejoin component.
	 **/
	async setVideoTrackEnabled(enabled: boolean) {
		let videoTrack = this.localTracks?.find((track) => track.kind === Track.Kind.Video);
		// Room is not connected, so we can't enable/disable the camera
		if (enabled) {
			await videoTrack?.unmute();
		} else {
			await videoTrack?.mute();
		}
	}

	/**
	 * @internal
	 * As the Room is not created yet, we need to handle the media tracks with a temporary array of tracks.
	 * This method must be only called from the prejoin component.
	 **/
	async setAudioTrackEnabled(enabled: boolean) {
		const audioTrack = this.localTracks?.find((track) => track.kind === Track.Kind.Audio);
		// Session is not connected, so we can't enable/disable the camera
		if (enabled) {
			await audioTrack?.unmute();
		} else {
			await audioTrack?.mute();
		}
	}

	/**
	 * @internal
	 * As the Room is not created yet, we need to handle the media tracks with a temporary array of tracks.
	 * This method must be only called before connect to room.
	 **/
	isVideoTrackEnabled(): boolean {
		if (this.localTracks.length === 0) {
			return this.deviceService.isCameraEnabled();
		}
		const videoTrack = this.localTracks.find((track) => track.kind === Track.Kind.Video);
		return !!videoTrack && !videoTrack.isMuted && videoTrack?.mediaStreamTrack?.enabled;
	}

	/**
	 * @internal
	 * As the Room is not created yet, we need to handle the media tracks with a temporary array of tracks.
	 * This method must be only called before connect to room.
	 **/
	isAudioTrackEnabled(): boolean {
		if (this.localTracks.length === 0) {
			return this.deviceService.isMicrophoneEnabled();
		}
		const audioTrack = this.localTracks.find((track) => track.kind === Track.Kind.Audio);
		return !!audioTrack && !audioTrack.isMuted && audioTrack?.mediaStreamTrack?.enabled;
	}

	/**
	 * Switch the camera device when the room is not connected (prejoin page)
	 * @param deviceId new video device to use
	 * @internal
	 */
	async switchCamera(deviceId: string): Promise<void> {
		const existingTrack = this.localTracks.find((track) => track.kind === Track.Kind.Video) as LocalVideoTrack;

		if (existingTrack) {
			//TODO: Should use replace track using restartTrack
			// Try to restart existing track
			this.removeVideoTrack();
			// try {
			// await existingTrack.restartTrack({ deviceId: deviceId });
			// 	this.log.d('Camera switched successfully using existing track');
			// 	return;
			// } catch (error) {
			// 	this.log.w('Failed to restart video track, trying to create new one:', error);
			// 	// Remove the failed track
			// 	this.removeVideoTrack();
			// }
		}

		// Create new video track if no existing track or restart failed
		try {
			const newVideoTracks = await createLocalTracks({
				video: { deviceId: deviceId }
			});

			const videoTrack = newVideoTracks.find((t) => t.kind === Track.Kind.Video);
			if (videoTrack) {
				// Mute if camera is disabled in settings
				if (!this.deviceService.isCameraEnabled()) {
					await videoTrack.mute();
				}

				this.localTracks.push(videoTrack);
				this.log.d('New camera track created and added');
			}
		} catch (error) {
			this.log.e('Failed to create new video track:', error);
			const message = error instanceof Error ? error.message : 'Unknown error';
			throw new Error(`Failed to switch camera: ${message}`);
		}
	} /**
	 * Switches the microphone device when the room is not connected (prejoin page)
	 * @param deviceId new audio device to use
	 * @internal
	 */
	async switchMicrophone(deviceId: string): Promise<void> {
		const existingTrack = this.localTracks?.find((track) => track.kind === Track.Kind.Audio) as LocalAudioTrack;

		if (existingTrack) {
			this.removeAudioTrack();
			//TODO: Should use replace track using restartTrack
			// Try to restart existing track
			// try {
			// 	await existingTrack.restartTrack({ deviceId: deviceId });
			// 	this.log.d('Microphone switched successfully using existing track');
			// 	return;
			// } catch (error) {
			// 	this.log.w('Failed to restart audio track, trying to create new one:', error);
			// 	// Remove the failed track
			// 	this.removeAudioTrack();
			// }
		}

		// Create new audio track if no existing track or restart failed
		try {
			const newAudioTracks = await createLocalTracks({
				audio: {
					deviceId: deviceId,
					echoCancellation: true,
					noiseSuppression: true,
					autoGainControl: true
				}
			});

			const audioTrack = newAudioTracks.find((t) => t.kind === Track.Kind.Audio);
			if (audioTrack) {
				this.localTracks.push(audioTrack);

				// Mute if microphone is disabled in settings
				if (!this.deviceService.isMicrophoneEnabled()) {
					await audioTrack.mute();
				}

				this.log.d('New microphone track created and added');
			}
		} catch (error) {
			this.log.e('Failed to create new audio track:', error);
			const message = error instanceof Error ? error.message : 'Unknown error';
			throw new Error(`Failed to switch microphone: ${message}`);
		}
	}

	/**
	 * Removes video track from local tracks
	 * @internal
	 */
	private removeVideoTrack(): void {
		const videoTrackIndex = this.localTracks.findIndex((track) => track.kind === Track.Kind.Video);
		if (videoTrackIndex !== -1) {
			const videoTrack = this.localTracks[videoTrackIndex];
			videoTrack.stop();
			videoTrack.detach();
			this.localTracks.splice(videoTrackIndex, 1);
			this.log.d('Video track removed');
		}
	}

	/**
	 * Removes audio track from local tracks
	 * @internal
	 */
	private removeAudioTrack(): void {
		const audioTrackIndex = this.localTracks.findIndex((track) => track.kind === Track.Kind.Audio);
		if (audioTrackIndex !== -1) {
			const audioTrack = this.localTracks[audioTrackIndex];
			audioTrack.stop();
			audioTrack.detach();
			this.localTracks.splice(audioTrackIndex, 1);
			this.log.d('Audio track removed');
		}
	}

	/**
	 * Extracts Livekit data from the provided token and returns an object containing the Livekit URL and room admin status.
	 * @param token - The token to extract Livekit data from.
	 * @param livekitUrl - The default Livekit URL to use if no Livekit URL is found in the token metadata.
	 * @returns An object containing the Livekit URL and room admin status.
	 * @throws Error if there is an error decoding and parsing the token.
	 * @internal
	 */
	private extractLivekitData(token: string): { livekitUrl?: string; livekitRoomAdmin: boolean } {
		try {
			const base64Url = token.split('.')[1];
			const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
			const jsonPayload = decodeURIComponent(
				window
					.atob(base64)
					.split('')
					.map((c) => {
						return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
					})
					.join('')
			);

			const payload = JSON.parse(jsonPayload);
			if (payload?.metadata) {
				const tokenMetadata = JSON.parse(payload.metadata);
				return {
					livekitUrl: tokenMetadata.livekitUrl,
					livekitRoomAdmin: !!tokenMetadata.roomAdmin
				};
			}

			return { livekitRoomAdmin: false };
		} catch (error) {
			throw new Error('Error decoding and parsing token: ' + error);
		}
	}

	/**
	 * @internal
	 * Whether the STT service is ready or not
	 * This will be `false` when the app receives a SPEECH_TO_TEXT_DISCONNECTED exception
	 * and it cannot subscribe to STT
	 */
	// isSttReady(): boolean {
	// 	return this._isSttReady.getValue();
	// }

	/**
	 * @internal
	 */
	// setSTTReady(value: boolean): void {
	// 	if (this._isSttReady.getValue() !== value) {
	// 		this._isSttReady.next(value);
	// 	}
	// }

	/**
	 * @internal
	 * Subscribe all `CAMERA` stream types to speech-to-text
	 * It will retry the subscription each `STT_TIMEOUT_MS`
	 *
	 * @param lang The language of the Stream's audio track.
	 */
	// async subscribeRemotesToSTT(lang: string): Promise<void> {
	// 	const participantService = this.injector.get(ParticipantService);
	// 	const remoteParticipants = participantService.getRemoteParticipants();
	// 	let successNumber = 0;
	// 	for (const p of remoteParticipants) {
	// 		const stream = p.getCameraConnection()?.streamManager?.stream;
	// 		if (stream) {
	// 			try {
	// 				await this.subscribeStreamToStt(stream, lang);
	// 				successNumber++;
	// 			} catch (error) {
	// 				this.log.e(`Error subscribing ${stream.streamId} to STT:`, error);
	// 				break;
	// 			}
	// 		}
	// 	}
	// 	this.setSTTReady(successNumber === remoteParticipants.length);
	// 	if (!this.isSttReady()) {
	// 		this.log.w('STT is not ready. Retrying subscription...');
	// 		this.sttReconnectionTimeout = setTimeout(this.subscribeRemotesToSTT.bind(this, lang), this.STT_TIMEOUT_MS);
	// 	}
	// }

	/**
	 * @internal
	 * Subscribe a stream to speech-to-text
	 * @param stream
	 * @param lang
	 */
	// async subscribeStreamToStt(stream: Stream, lang: string): Promise<void> {
	// 	await this.getWebcamSession().subscribeToSpeechToText(stream, lang);
	// 	this.log.d(`Subscribed stream ${stream.streamId} to STT with ${lang} language.`);
	// }

	/**
	 * @internal
	 * Unsubscribe to all `CAMERA` stream types to speech-to-text if STT is up(ready)
	 */
	// async unsubscribeRemotesFromSTT(): Promise<void> {
	// 	const participantService = this.injector.get(ParticipantService);
	// 	clearTimeout(this.sttReconnectionTimeout);
	// 	if (this.isSttReady()) {
	// 		for (const p of participantService.getRemoteParticipants()) {
	// 			const stream = p.getCameraConnection().streamManager.stream;
	// 			if (stream) {
	// 				try {
	// 					await this.getWebcamSession().unsubscribeFromSpeechToText(stream);
	// 				} catch (error) {
	// 					this.log.e(`Error unsubscribing ${stream.streamId} from STT:`, error);
	// 				}
	// 			}
	// 		}
	// 	}
	// }
}
