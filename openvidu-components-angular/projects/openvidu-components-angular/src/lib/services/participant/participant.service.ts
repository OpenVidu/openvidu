import { Injectable, Signal, WritableSignal, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import {
	AudioCaptureOptions,
	DataPublishOptions,
	LocalParticipant,
	LocalTrackPublication,
	Participant,
	RemoteParticipant,
	ScreenShareCaptureOptions,
	Track,
	VideoCaptureOptions,
	VideoPresets
} from 'livekit-client';
import { Observable } from 'rxjs';
import { ILogger } from '../../models/logger.model';
import { ParticipantModel, ParticipantProperties } from '../../models/participant.model';
import { OpenViduComponentsConfigService } from '../config/directive-config.service';
import { GlobalConfigService } from '../config/global-config.service';
import { E2eeService } from '../e2ee/e2ee.service';
import { LoggerService } from '../logger/logger.service';
import { OpenViduService } from '../openvidu/openvidu.service';
import { StorageService } from '../storage/storage.service';

@Injectable({
	providedIn: 'root'
})
export class ParticipantService {
	/**
	 * Local participant Observable which pushes the local participant object in every update.
	 * @deprecated Please prefer `localParticipantSignal` for reactive updates and `localParticipant$` when using RxJS.
	 */
	localParticipant$: Observable<ParticipantModel | undefined>;

	/**
	 * Remote participants Observable which pushes the remote participants array in every update.
	 * @deprecated Please prefer `remoteParticipantsSignal` for reactive updates and `remoteParticipants$` when using RxJS.
	 */
	remoteParticipants$: Observable<ParticipantModel[]>;

	/**
	 * Local participant Signal for reactive programming with Angular signals.
	 * This is a modern alternative to localParticipant$ Observable.
	 * @since Angular 16+
	 */
	localParticipantSignal: Signal<ParticipantModel | undefined>;
	private localParticipantWritableSignal: WritableSignal<ParticipantModel | undefined> = signal<ParticipantModel | undefined>(undefined);

	/**
	 * Remote participants Signal for reactive programming with Angular signals.
	 * This is a modern alternative to remoteParticipants$ Observable.
	 * @since Angular 16+
	 */
	remoteParticipantsSignal: Signal<ParticipantModel[]>;
	private remoteParticipantsWritableSignal: WritableSignal<ParticipantModel[]> = signal<ParticipantModel[]>([]);

	private localParticipant: ParticipantModel | undefined;
	private remoteParticipants: ParticipantModel[] = [];
	private log: ILogger;

	/**
	 * @internal
	 */
	constructor(
		private globalService: GlobalConfigService,
		private directiveService: OpenViduComponentsConfigService,
		private openviduService: OpenViduService,
		private storageSrv: StorageService,
		private loggerSrv: LoggerService,
		private e2eeService: E2eeService
	) {
		this.log = this.loggerSrv.get('ParticipantService');

		// Expose readonly signals
		this.localParticipantSignal = this.localParticipantWritableSignal.asReadonly();
		this.remoteParticipantsSignal = this.remoteParticipantsWritableSignal.asReadonly();

		// Create Observables from signals for backward compatibility
		this.localParticipant$ = toObservable(this.localParticipantWritableSignal);
		this.remoteParticipants$ = toObservable(this.remoteParticipantsWritableSignal);
	}

	/**
	 * @internal
	 */
	clear(): void {
		this.localParticipant = undefined;
		this.remoteParticipants = [];
		this.localParticipantWritableSignal.set(undefined);
		this.remoteParticipantsWritableSignal.set([]);
	}

	/**
	 * @internal
	 * Setting up the local participant object.
	 * @param participant
	 */
	setLocalParticipant(participant: LocalParticipant) {
		const room = this.openviduService.getRoom();
		this.localParticipant = this.newParticipant({ participant, room });
	}

	/**
	 * Returns the local participant object.
	 *
	 * @deprecated Please prefer `localParticipantSignal()` for reactive updates and `localParticipant$` when using RxJS.
	 */
	getLocalParticipant(): ParticipantModel | undefined {
		return this.localParticipant;
	}

	/**
	 * Connects to the room and publishes the local tracks.
	 * @internal
	 */
	async connect(): Promise<void> {
		let isCameraEnabled: boolean = this.isMyCameraEnabled();
		let isMicrophoneEnabled: boolean = this.isMyMicrophoneEnabled();
		let prejoinTracks = this.openviduService.getLocalTracks();

		if (prejoinTracks.length === 0 && (isCameraEnabled || isMicrophoneEnabled)) {
			prejoinTracks = await this.openviduService.createLocalTracks(isCameraEnabled, isMicrophoneEnabled);
		}

		await this.openviduService.connectRoom();
		this.setLocalParticipant(this.openviduService.getRoom().localParticipant);

		const videoTrack = prejoinTracks.find((track) => track.kind === Track.Kind.Video);
		const audioTrack = prejoinTracks.find((track) => track.kind === Track.Kind.Audio);

		const promises: Promise<LocalTrackPublication>[] = [];
		if (this.localParticipant && videoTrack) {
			promises.push(this.localParticipant.publishTrack(videoTrack));
		}
		if (this.localParticipant && audioTrack) {
			promises.push(this.localParticipant?.publishTrack(audioTrack));
		}

		await Promise.all(promises);
		this.updateLocalParticipant();
		// if(!isCameraEnabled) await this.setCameraEnabled(isCameraEnabled);
		// if(!isMicrophoneEnabled) await this.setMicrophoneEnabled(isMicrophoneEnabled);
		// Once the Room is created, the temporary tracks are not longer needed.
		this.log.d('Connected to room', this.openviduService.getRoom());
		this.openviduService.getRoom().remoteParticipants.forEach((p) => {
			this.addRemoteParticipant(p);
		});
	}

	/**
	 * Publishes a new data payload to the room. Data will be forwarded to each participant in the room if the destination field in publishOptions is empty.
	 * @param data
	 * @param {DataPublishOptions} publishOptions [DataPublishOptions](https://docs.livekit.io/client-sdk-js/types/DataPublishOptions.html)
	 */
	publishData(data: Uint8Array, publishOptions: DataPublishOptions): Promise<void> {
		if (this.localParticipant) {
			return this.localParticipant.publishData(data, publishOptions);
		}
		return Promise.reject('Local participant not found');
	}

	/**
	 * Switches the active camera track used in this room to the given device id.
	 * @param deviceId
	 */
	async switchCamera(deviceId: string): Promise<void> {
		if (this.openviduService.isRoomConnected()) {
			await this.localParticipant?.switchCamera(deviceId);
		} else {
			await this.openviduService.switchCamera(deviceId);
		}
		// this.updateLocalParticipant();
	}

	/**
	 * Switches the active microphone track used in this room to the given device id.
	 * @param deviceId
	 */
	async switchMicrophone(deviceId: string): Promise<void> {
		if (this.openviduService.isRoomConnected()) {
			await this.localParticipant?.switchMicrophone(deviceId);
		} else {
			await this.openviduService.switchMicrophone(deviceId);
		}
		// this.updateLocalParticipant();
	}

	/**
	 * Switches the active screen share track showing a native browser dialog to select a screen or window.
	 */
	async switchScreenShare(): Promise<void> {
		if (this.localParticipant) {
			const options = this.getScreenCaptureOptions();
			const [newTrack] = await this.localParticipant.createScreenTracks(options);
			if (newTrack) {
				newTrack?.addListener('ended', async () => {
					this.log.d('Clicked native stop button. Stopping screen sharing');
					await this.setScreenShareEnabled(false);
				});

				await this.localParticipant.switchScreenshare(newTrack);
			}
		} else {
			this.log.e('Local participant is undefined when switching screenshare');
		}

		// this.updateLocalParticipant();
	}

	/**
	 * Sets the local participant camera enabled or disabled.
	 * @param enabled
	 */
	async setCameraEnabled(enabled: boolean): Promise<void> {
		if (this.openviduService.isRoomConnected()) {
			const storageDevice = this.storageSrv.getVideoDevice();
			let options: VideoCaptureOptions | undefined;
			if (storageDevice) {
				options = {
					deviceId: storageDevice.device,
					facingMode: 'user',
					resolution: VideoPresets.h720.resolution
				};
			}
			await this.localParticipant?.setCameraEnabled(enabled, options);
			this.updateLocalParticipant();
		} else {
			await this.openviduService.setVideoTrackEnabled(enabled);
		}
	}

	/**
	 * Sets the local participant microphone enabled or disabled.
	 * @param enabled
	 */
	async setMicrophoneEnabled(enabled: boolean): Promise<void> {
		if (this.openviduService.isRoomConnected()) {
			const storageDevice = this.storageSrv.getAudioDevice();
			let options: AudioCaptureOptions | undefined;
			if (storageDevice) {
				options = {
					deviceId: storageDevice.device
				};
			}
			await this.localParticipant?.setMicrophoneEnabled(enabled, options);
			this.updateLocalParticipant();
		} else {
			this.openviduService.setAudioTrackEnabled(enabled);
		}
	}

	/**
	 * Share or unshare the local participant screen.
	 * @param enabled: true to share the screen, false to unshare it
	 *
	 */
	async setScreenShareEnabled(enabled: boolean): Promise<void> {
		const options = this.getScreenCaptureOptions();
		const track = await this.localParticipant?.setScreenShareEnabled(enabled, options);
		if (enabled && track) {
			// Set all videos to normal size when a local screen is shared
			this.resetRemoteStreamsToNormalSize();
			this.resetMyStreamsToNormalSize();
			this.localParticipant?.toggleVideoPinned(track.trackSid);
			this.localParticipant?.setScreenTrackPublicationDate(track.trackSid, new Date().getTime());

			track?.addListener('ended', async () => {
				this.log.d('Clicked native stop button. Stopping screen sharing');
				await this.setScreenShareEnabled(false);
			});
		} else if (!enabled && track) {
			// Enlarge the last screen shared when a local screen is stopped
			this.localParticipant?.setScreenTrackPublicationDate(track.trackSid, -1);
			this.resetRemoteStreamsToNormalSize();
			this.resetMyStreamsToNormalSize();
			this.setLastScreenPinned();
		}
		this.updateLocalParticipant();
	}

	/**
	 * @internal
	 * As updating name requires that the participant has the `canUpdateOwnMetadata` to true in server side, which is a little bit insecure,
	 * we decided to not allow this feature for now.
	 */
	// setMyName(name: string) {
	// 	if (!this.localParticipant) return;
	// 	this.localParticipant.setName(name);
	// 	this.updateLocalParticipant();
	// }

	/**
	 * Sets as speaking to all participants given in the array.
	 * @param speakers
	 * @internal
	 */
	setSpeaking(speakers: Participant[]) {
		// Set all participants' isSpeaking property to false
		this.localParticipant?.setSpeaking(false);
		this.remoteParticipants.forEach((participant) => participant.setSpeaking(false));
		speakers.forEach((s) => {
			if (s.isLocal) {
				this.localParticipant?.setSpeaking(true);
			} else {
				const participant = this.remoteParticipants.find((p) => p.sid === s.sid);
				participant?.setSpeaking(true);
				this.updateRemoteParticipants();
			}
		});
	}

	/**
	 * Sets the encryption error state for a participant.
	 * This is called when a participant cannot decrypt video streams due to an incorrect encryption key.
	 * @param participantSid - The SID of the participant with the encryption error
	 * @param hasError - Whether the participant has an encryption error
	 * @internal
	 */
	setEncryptionError(participantSid: string, hasError: boolean) {
		if (this.localParticipant?.sid === participantSid) {
			this.localParticipant.setEncryptionError(hasError);
			this.updateLocalParticipant();
		} else {
			const participant = this.remoteParticipants.find((p) => p.sid === participantSid);
			if (participant) {
				participant.setEncryptionError(hasError);
				this.updateRemoteParticipants();
			}
		}
	}

	/**
	 * Returns the local participant name.
	 */
	getMyName(): string | undefined {
		return this.localParticipant?.name;
	}

	/**
	 * @internal
	 */
	toggleMyVideoPinned(sid: string | undefined) {
		if (sid && this.localParticipant) this.localParticipant.toggleVideoPinned(sid);
		this.updateLocalParticipant();
	}

	/**
	 * @internal
	 */
	toggleMyVideoMinimized(sid: string | undefined) {
		if (sid && this.localParticipant) this.localParticipant.toggleVideoMinimized(sid);
		this.updateLocalParticipant();
	}

	/**
	 * @internal
	 */
	resetMyStreamsToNormalSize() {
		this.localParticipant?.setAllVideoPinned(false);
		// 	this.updateLocalParticipant();
	}

	/**
	 * Returns if the local participant camera is enabled.
	 */
	isMyCameraEnabled(): boolean {
		if (this.openviduService.isRoomConnected() && this.localParticipant) {
			return this.localParticipant.isCameraEnabled;
		} else {
			const directiveCameraEnabled = this.directiveService.isVideoEnabled();

			if (!directiveCameraEnabled) {
				return false;
			}
			return this.openviduService.isVideoTrackEnabled() && this.storageSrv.isCameraEnabled();
		}
	}

	/**
	 * Returns if the local participant microphone is enabled.
	 */
	isMyMicrophoneEnabled(): boolean {
		if (this.openviduService.isRoomConnected() && this.localParticipant) {
			return this.localParticipant.isMicrophoneEnabled;
		} else {
			const directiveMicropgoneEnabled = this.directiveService.isAudioEnabled();

			if (!directiveMicropgoneEnabled) {
				return false;
			}
			return this.openviduService.isAudioTrackEnabled() && this.storageSrv.isMicrophoneEnabled();
		}
	}

	/**
	 * Returns if the local participant screen is enabled.
	 */
	isMyScreenShareEnabled(): boolean {
		return this.localParticipant?.isScreenShareEnabled || false;
	}

	/**
	 * Forces to update the local participant object and fire a new `localParticipant$` Observable event.
	 */
	updateLocalParticipant() {
		// Update Signal - create new reference to trigger reactivity
		// The Observable will automatically emit via toObservable()
		if (this.localParticipant) {
			const updatedParticipant = Object.assign(
				Object.create(Object.getPrototypeOf(this.localParticipant)),
				{ ...this.localParticipant }
			);
			this.localParticipantWritableSignal.set(updatedParticipant);
		} else {
			this.localParticipantWritableSignal.set(undefined);
		}
	}

	/**
	 * Sets the last screen element as pinned
	 * @internal
	 */
	setLastScreenPinned() {
		if (!this.localParticipant?.isScreenShareEnabled && !this.someRemoteIsSharingScreen()) {
			return; // Exit early if neither local nor remote participants are sharing screen
		}
		let localCreatedAt = -Infinity;
		let localTrackSid = '';
		if (this.localParticipant?.isScreenShareEnabled) {
			localCreatedAt = Math.max(...this.localParticipant.screenTrackPublicationDate.values());
			this.localParticipant.screenTrackPublicationDate.forEach((value, key) => {
				if (value === localCreatedAt) {
					localTrackSid = key;
					return;
				}
			});
		}

		let remoteCreatedAt = -Infinity;
		let remoteTrackSid = '';
		if (this.someRemoteIsSharingScreen()) {
			const lastRemoteParticipant = this.remoteParticipants.reduce((prev, current) => {
				const prevMax = Math.max(...prev.screenTrackPublicationDate.values());
				const currentMax = Math.max(...current.screenTrackPublicationDate.values());
				return prevMax > currentMax ? prev : current;
			});
			remoteCreatedAt = Math.max(...lastRemoteParticipant.screenTrackPublicationDate.values());
			lastRemoteParticipant.screenTrackPublicationDate.forEach((value, key) => {
				if (value === remoteCreatedAt) {
					remoteTrackSid = key;
					return;
				}
			});
		}

		if (remoteCreatedAt > localCreatedAt) {
			this.toggleRemoteVideoPinned(remoteTrackSid);
		} else {
			this.toggleMyVideoPinned(localTrackSid);
		}
	}

	/* ------------------------------ Remote Participants ------------------------------ */

	/**
	 * Returns all remote participants in the room.
	 *
	 * @deprecated Please prefer `remoteParticipantsSignal()` for automatic reactive updates or `remoteParticipants$` when using Observables.
	 */
	getRemoteParticipants(): ParticipantModel[] {
		return this.remoteParticipants;
	}

	/**
	 * Returns the remote participant with the given sid.
	 * @param sid
	 */
	getRemoteParticipantBySid(sid: string): ParticipantModel | undefined {
		return this.remoteParticipants.find((p) => p.sid === sid);
	}

	/**
	 * Force to update the remote participants object and fire a new `remoteParticipants$` Observable event.
	 */
	updateRemoteParticipants() {
		// Update Signal - create new array reference to trigger reactivity
		// The Observable will automatically emit via toObservable()
		this.remoteParticipantsWritableSignal.set([...this.remoteParticipants]);
	}

	/**
	 * @internal
	 */
	addRemoteParticipant(participant: RemoteParticipant) {
		const index = this.remoteParticipants.findIndex((p) => p.sid === participant.sid);
		if (index >= 0) {
			const remoteParticipant = this.remoteParticipants[index];
			const pp: ParticipantProperties = remoteParticipant.getProperties();
			pp.participant = participant;
			this.remoteParticipants[index] = this.newParticipant(pp);
		} else {
			this.remoteParticipants.push(this.newParticipant({ participant }));
		}
		this.updateRemoteParticipants();
	}

	/**
	 * Removes participant track from the remote participant object.
	 * @param participant
	 * @param trackSid
	 * @internal
	 */
	removeRemoteParticipantTrack(participant: RemoteParticipant, trackSid: string) {
		const index = this.remoteParticipants.findIndex((p) => p.sid === participant.sid);
		if (index >= 0) {
			const track = this.remoteParticipants[index].tracks.find((t) => t.trackSid === trackSid);
			track?.track?.stop();
			track?.track?.detach();
			const pp: ParticipantProperties = this.remoteParticipants[index].getProperties();
			pp.participant = participant;
			this.remoteParticipants[index] = this.newParticipant(pp);
			this.updateRemoteParticipants();
		}
	}

	/**
	 * @internal
	 */
	removeRemoteParticipant(sid: string) {
		const index = this.remoteParticipants.findIndex((p) => p.sid === sid);
		if (index !== -1) {
			this.remoteParticipants.splice(index, 1);
			this.updateRemoteParticipants();
		}
	}

	/**
	 * @internal
	 */
	resetRemoteStreamsToNormalSize() {
		this.remoteParticipants.forEach((participant) => participant.setAllVideoPinned(false));
		// this.updateRemoteParticipants();
	}

	/**
	 * Set the screen track publication date of a remote participant with the aim of taking control of the last screen published
	 * @param participantSid
	 * @param trackSid
	 * @param createdAt
	 * @internal
	 */
	setScreenTrackPublicationDate(participantSid: string, trackSid: string, createdAt: number) {
		const participant = this.remoteParticipants.find((p) => p.sid === participantSid);
		if (participant) {
			participant.setScreenTrackPublicationDate(trackSid, createdAt);
		}
	}

	/**
	 * @internal
	 */
	someRemoteIsSharingScreen(): boolean {
		return this.remoteParticipants.some((p) => p.isScreenShareEnabled);
	}

	/**
	 * @internal
	 */
	toggleRemoteVideoPinned(sid: string | undefined) {
		if (sid) {
			const participant = this.remoteParticipants.find((p) => p.tracks.some((track) => track.trackSid === sid));
			if (participant) {
				participant.toggleVideoPinned(sid);
			}
			this.updateRemoteParticipants();
		}
	}

	/**
	 * Sets the remote participant video track element muted or unmuted .
	 * @internal
	 */
	setRemoteMutedForcibly(sid: string, value: boolean) {
		const p = this.getRemoteParticipantBySid(sid);
		if (p) {
			p.setMutedForcibly(value);
			this.updateRemoteParticipants();
		}
	}

	private newParticipant(props: ParticipantProperties): ParticipantModel {
		let participant: ParticipantModel;
		if (this.globalService.hasParticipantFactory()) {
			participant = this.globalService.getParticipantFactory().apply(this, [props]);
		} else {
			participant = new ParticipantModel(props);
		}

		// Decrypt participant name asynchronously if E2EE is enabled
		this.decryptParticipantName(participant);

		return participant;
	}

	/**
	 * Decrypts the participant name if E2EE is enabled.
	 * Updates the participant model asynchronously.
	 * @param participant - The participant model to decrypt the name for
	 * @private
	 */
	private async decryptParticipantName(participant: ParticipantModel): Promise<void> {
		const originalName = participant.name;
		if (!originalName) {
			return;
		}

		try {
			const decryptedName = await this.e2eeService.decryptOrMask(originalName, participant.identity);
			participant.setDecryptedName(decryptedName);

			// Update observables to reflect the decrypted name
			if (participant.isLocal) {
				this.updateLocalParticipant();
			} else {
				this.updateRemoteParticipants();
			}
		} catch (error) {
			this.log.w('Failed to decrypt participant name:', error);
		}
	}

	private getScreenCaptureOptions(): ScreenShareCaptureOptions {
		return {
			audio: true,
			video: {
				displaySurface: 'browser' // Set browser tab as default options
			},
			systemAudio: 'include', // Include system audio as an option
			resolution: VideoPresets.h1080.resolution,
			contentHint: 'text', // Optimized for detailed content, adjust based on use case
			suppressLocalAudioPlayback: true, // Prevent echo by not playing local audio
			selfBrowserSurface: 'exclude', // Avoid self capture to prevent mirror effect
			surfaceSwitching: 'include', // Allow users to switch shared tab dynamically
			preferCurrentTab: false // Do not force current tab to be selected
		};
	}
}
