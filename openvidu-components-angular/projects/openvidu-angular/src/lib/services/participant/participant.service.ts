import { Injectable } from '@angular/core';
import { Publisher, PublisherProperties, Subscriber } from 'openvidu-browser-v2compatibility';
import { BehaviorSubject, Observable } from 'rxjs';
import { ILogger } from '../../models/logger.model';
import {
	OpenViduRole,
	ParticipantAbstractModel,
	ParticipantModel,
	ParticipantProperties,
	StreamModel
} from '../../models/participant.model';
import { VideoType } from '../../models/video-type.model';
import { OpenViduAngularConfigService } from '../config/openvidu-angular.config.service';
import { DeviceService } from '../device/device.service';
import { LoggerService } from '../logger/logger.service';
import { OpenViduService } from '../openvidu/openvidu.service';
import { CustomDevice } from '../../models/device.model';

@Injectable({
	providedIn: 'root'
})
export class ParticipantService {
	/**
	 * Local participant Observable which pushes the local participant object in every update.
	 */
	localParticipantObs: Observable<ParticipantAbstractModel>;
	protected _localParticipant: BehaviorSubject<ParticipantAbstractModel | null> = new BehaviorSubject<ParticipantAbstractModel | null>(
		null
	);

	/**
	 * Remote participants Observable which pushes the remote participants array in every update.
	 */
	remoteParticipantsObs: Observable<ParticipantAbstractModel[]>;
	protected _remoteParticipants: BehaviorSubject<ParticipantAbstractModel[]> = new BehaviorSubject<ParticipantAbstractModel[]>([]);

	protected localParticipant: ParticipantAbstractModel;
	protected remoteParticipants: ParticipantAbstractModel[] = [];

	protected log: ILogger;

	/**
	 * @internal
	 */
	constructor(
		protected openviduAngularConfigSrv: OpenViduAngularConfigService,
		private openviduService: OpenViduService,
		private deviceService: DeviceService,
		protected loggerSrv: LoggerService
	) {
		this.log = this.loggerSrv.get('ParticipantService');
		this.localParticipantObs = this._localParticipant.asObservable();
		this.remoteParticipantsObs = this._remoteParticipants.asObservable();
	}

	/**
	 * @internal
	 */
	initLocalParticipant(props: ParticipantProperties) {
		this.localParticipant = this.newParticipant(props);
		this.updateLocalParticipant();
	}

	getLocalParticipant(): ParticipantAbstractModel {
		return this.localParticipant;
	}

	/**
	 * Publish or unpublish the local participant video stream (if available).
	 * It hides the camera stream (while muted) if screen is sharing.
	 * See openvidu-browser {@link https://docs.openvidu.io/en/stable/api/openvidu-browser/classes/Publisher.html#publishVideo publishVideo}
	 *
	 */
	async publishVideo(publish: boolean): Promise<void> {
		const cameraPublisher = this.getMyCameraPublisher();
		await this.publishVideoAux(cameraPublisher, publish);
		this.updateLocalParticipant();
	}

	/**
	 * Publish or unpublish the local participant audio stream (if available).
	 * See openvidu-browser {@link https://docs.openvidu.io/en/stable/api/openvidu-browser/classes/Publisher.html#publishAudio publishAudio}.
	 *
	 */
	publishAudio(publish: boolean): void {
		if (this.isMyCameraActive()) {
			this.publishAudioAux(this.getMyCameraPublisher(), publish);
			this.updateLocalParticipant();
		}
	}

	async replaceVideoTrack(device: CustomDevice) {
		const mirror = this.deviceService.cameraNeedsMirror(device.device);
		const cameraPublisher = this.getMyCameraPublisher();
		const { frameRate, videoDimensions } = cameraPublisher.stream;
		const pp: PublisherProperties = {
			videoSource: device.device,
			audioSource: false,
			frameRate,
			resolution: `${videoDimensions.width}x${videoDimensions.height}`,
			mirror
		};
		await this.openviduService.replaceCameraTrack(cameraPublisher, pp);
	}

	/**
	 * Share or unshare the local participant screen.
	 * Hide the camera stream (while muted) when screen is sharing.
	 *
	 */
	async toggleScreenshare() {
		const screenPublisher = this.getMyScreenPublisher();
		const participantNickname = this.getMyNickname();
		const participantId = this.getLocalParticipant().id;

		if (this.localParticipant.hasCameraAndScreenActives()) {
			// Disabling screenShare
			this.disableScreenStream();
			this.updateLocalParticipant();
			this.openviduService.unpublishScreen(screenPublisher);
		} else if (this.localParticipant.hasOnlyCameraActive()) {
			// I only have the camera published
			const screenPublisher = await this.openviduService.initScreenPublisher();

			screenPublisher.once('accessAllowed', async () => {
				// Listen to event fired when native stop button is clicked
				screenPublisher.stream
					.getMediaStream()
					.getVideoTracks()[0]
					.addEventListener('ended', async () => {
						this.log.d('Clicked native stop button. Stopping screen sharing');
						await this.toggleScreenshare();
					});

				// Enabling screenShare
				this.activeMyScreenShare(screenPublisher);

				if (!this.openviduService.isScreenSessionConnected()) {
					await this.openviduService.connectScreenSession(participantId, participantNickname);
				}
				await this.openviduService.publishScreen(screenPublisher);
			});

			screenPublisher.once('accessDenied', (error: any) => {
				return Promise.reject(error);
			});
		}
	}

	/**
	 * @internal
	 */
	getMyCameraPublisher(): Publisher {
		return <Publisher>this.localParticipant.getCameraConnection().streamManager;
	}

	/**
	 * @internal
	 */
	setMyCameraPublisher(publisher: Publisher | undefined) {
		this.localParticipant.setCameraPublisher(publisher);
	}
	/**
	 * @internal
	 */
	setMyCameraConnectionId(connectionId: string) {
		this.localParticipant.setCameraConnectionId(connectionId);
	}

	/**
	 * @internal
	 */
	getMyScreenPublisher(): Publisher {
		return <Publisher>this.localParticipant.getScreenConnection()?.streamManager;
	}

	/**
	 * @internal
	 */
	setMyScreenPublisher(publisher: Publisher) {
		this.localParticipant.setScreenPublisher(publisher);
	}

	/**
	 * @internal
	 */
	setMyScreenConnectionId(connectionId: string) {
		this.localParticipant.setScreenConnectionId(connectionId);
	}

	/**
	 * @internal
	 */
	enableWebcamStream() {
		this.localParticipant.enableCamera();
	}

	/**
	 * @internal
	 */
	disableWebcamStream() {
		this.localParticipant.disableCamera();
	}

	/**
	 * @internal
	 */
	activeMyScreenShare(screenPublisher: Publisher) {
		this.log.d('Enabling screen publisher');

		const steramModel: StreamModel = {
			type: VideoType.SCREEN,
			videoEnlarged: true,
			streamManager: screenPublisher,
			connected: true,
			connectionId: ''
		};

		this.resetRemoteStreamsToNormalSize();
		this.resetMyStreamsToNormalSize();
		this.localParticipant.addConnection(steramModel);
		this.updateLocalParticipant();
	}

	/**
	 * @internal
	 */
	disableScreenStream() {
		this.localParticipant.disableScreen();
	}

	/**
	 * @internal
	 */
	setMyNickname(nickname: string) {
		this.localParticipant.setNickname(nickname);
		this.updateLocalParticipant();
	}

	/**
	 * @internal
	 */
	getMyNickname(): string {
		return this.localParticipant.nickname;
	}

	getMyRole(): string {
		return this.localParticipant.getRole();
	}

	amIModerator(): boolean {
		return this.getMyRole() === OpenViduRole.MODERATOR;
	}

	/**
	 * @internal
	 */
	toggleMyVideoEnlarged(connectionId: string) {
		this.localParticipant.toggleVideoEnlarged(connectionId);
	}

	/**
	 * @internal
	 */
	resetMyStreamsToNormalSize() {
		if (this.localParticipant.someHasVideoEnlarged()) {
			this.localParticipant.setAllVideoEnlarged(false);
			this.updateLocalParticipant();
		}
	}

	/**
	 * @internal
	 */
	async clear() {
		await this.getMyCameraPublisher()?.stream?.disposeMediaStream();
		await this.getMyScreenPublisher()?.stream?.disposeMediaStream();
		this.disableScreenStream();
		this.remoteParticipants = [];
		this.updateRemoteParticipants();
		this.updateLocalParticipant();
	}

	/**
	 * @internal
	 */
	isMyCameraActive(): boolean {
		return this.localParticipant.isCameraActive();
	}

	isMyVideoActive(): boolean {
		return this.localParticipant.isCameraVideoActive();
	}

	isMyAudioActive(): boolean {
		return this.localParticipant?.hasAudioActive();
	}

	/**
	 * @internal
	 */
	hasScreenAudioActive(): boolean {
		return this.localParticipant.isScreenAudioActive();
	}

	/**
	 * Force to update the local participant object and fire a new {@link localParticipantObs} Observable event.
	 */
	updateLocalParticipant() {
		this._localParticipant.next(
			Object.assign(Object.create(Object.getPrototypeOf(this.localParticipant)), { ...this.localParticipant })
		);
	}

	private publishAudioAux(publisher: Publisher, value: boolean): void {
		if (!!publisher) {
			publisher.publishAudio(value);
		}
	}

	/**
	 * @internal
	 */
	private async publishVideoAux(publisher: Publisher, publish: boolean): Promise<void> {
		if (!!publisher) {
			let resource: boolean | MediaStreamTrack = true;
			if (publish) {
				// Forcing restoration with a custom media stream (the older one instead the default)
				const currentDeviceId = this.deviceService.getCameraSelected()?.device;
				const { frameRate, videoDimensions } = publisher.stream;
				const mediaStream = await this.openviduService.createMediaStream({
					videoSource: currentDeviceId,
					audioSource: false,
					frameRate,
					resolution: `${videoDimensions.width}x${videoDimensions.height}`,
				});
				resource = mediaStream.getVideoTracks()[0];
			}

			await publisher.publishVideo(publish, resource);
		}
	}

	/**
	 * REMOTE USERS
	 */

	/**
	 * @internal
	 */
	addRemoteConnection(connectionId: string, data: string, subscriber: Subscriber) {
		const type: VideoType = this.getTypeConnectionData(data);
		const streamModel: StreamModel = {
			type,
			videoEnlarged: type === VideoType.SCREEN,
			streamManager: subscriber,
			connected: true,
			connectionId
		};

		// Avoiding create a new participant if participantId param is not exist in connection data
		// participant Id is necessary for allowing to have multiple connection in one participant
		const participantId = this.getParticipantIdFromData(data) || connectionId;

		const participantAdded = this.getRemoteParticipantById(participantId);
		if (!!participantAdded) {
			this.log.d('Adding connection to existing participant: ', participantId);
			if (participantAdded.hasConnectionType(streamModel.type)) {
				this.log.d('Participant has publisher, updating it');
				participantAdded.setPublisher(streamModel.type, subscriber);
			} else {
				this.log.d('Participant has not publisher, adding it');
				if (streamModel.type === VideoType.SCREEN) {
					this.resetRemoteStreamsToNormalSize();
					this.resetMyStreamsToNormalSize();
				}
				participantAdded.addConnection(streamModel);
			}
		} else {
			this.log.w('Creating new participant with id: ', participantId);
			const props: ParticipantProperties = {
				nickname: this.getNicknameFromConnectionData(data),
				local: false,
				id: participantId
			};
			const remoteParticipant = this.newParticipant(props, streamModel);
			this.remoteParticipants.push(remoteParticipant);
		}
		this.updateRemoteParticipants();
	}

	getRemoteParticipants(): ParticipantAbstractModel[] {
		return this.remoteParticipants;
	}

	/**
	 * @internal
	 */
	resetRemoteStreamsToNormalSize() {
		this.remoteParticipants.forEach((participant) => participant.setAllVideoEnlarged(false));
		this.updateRemoteParticipants();
	}

	/**
	 * @internal
	 */
	removeConnectionByConnectionId(connectionId: string) {
		this.log.w('Deleting connection: ', connectionId);
		let participant: ParticipantAbstractModel | undefined;
		if (this.localParticipant.hasConnectionId(connectionId)) {
			participant = this.localParticipant;
		} else {
			participant = this.getRemoteParticipantByConnectionId(connectionId);
		}

		if (participant) {
			const removeStream: StreamModel = participant.removeConnection(connectionId);
			//TODO: Timeout of X seconds?? Its possible sometimes the connections map was empty but must not be deleted
			if (participant.streams.size === 0) {
				// Remove participants without connections
				this.remoteParticipants = this.remoteParticipants.filter((p) => p !== participant);
			}
			if (removeStream.type === VideoType.SCREEN) {
				const remoteScreens = this.remoteParticipants.filter((p) => p.isScreenActive());
				if (remoteScreens.length > 0) {
					// Enlarging the last screen connection active
					const lastScreenActive = remoteScreens[remoteScreens.length - 1];
					lastScreenActive.setScreenEnlarged(true);
				} else if (this.localParticipant.isScreenActive()) {
					// Enlarging my screen if thereare not any remote screen active
					this.localParticipant.setScreenEnlarged(true);
				}
			}

			this.updateRemoteParticipants();
		}
	}
	/**
	 * @internal
	 */
	getRemoteParticipantByConnectionId(connectionId: string): ParticipantAbstractModel | undefined {
		return this.remoteParticipants.find((p) => p.hasConnectionId(connectionId));
	}

	protected getRemoteParticipantById(id: string): ParticipantAbstractModel | undefined {
		return this.remoteParticipants.find((p) => p.id === id);
	}
	/**
	 * @internal
	 */
	someoneIsSharingScreen(): boolean {
		return this.remoteParticipants.some((p) => p.someHasVideoEnlarged());
	}

	/**
	 * @internal
	 */
	toggleRemoteVideoEnlarged(connectionId: string) {
		const participant = this.getRemoteParticipantByConnectionId(connectionId);
		participant?.toggleVideoEnlarged(connectionId);
	}

	/**
	 * @internal
	 */
	getNicknameFromConnectionData(data: string): string {
		try {
			const dataClean = data.replace('%/%{}', '');
			return JSON.parse(dataClean).clientData;
		} catch (error) {
			return 'OpenVidu_User';
		}
	}

	/**
	 * @internal
	 */
	setRemoteNickname(connectionId: string, nickname: string) {
		const participant = this.getRemoteParticipantByConnectionId(connectionId);
		if (participant) {
			participant.setNickname(nickname);
			this.updateRemoteParticipants();
		}
	}

	/**
	 * @internal
	 */
	setRemoteMutedForcibly(id: string, value: boolean) {
		const participant = this.getRemoteParticipantById(id);
		if (participant) {
			participant.setMutedForcibly(value);
			this.updateRemoteParticipants();
		}
	}

	/**
	 * Force to update the remote participants object and fire a new {@link remoteParticipantsObs} Observable event.
	 */
	updateRemoteParticipants() {
		this._remoteParticipants.next([...this.remoteParticipants]);
	}

	/**
	 * @internal
	 * @param data
	 * @returns Stream video type
	 */
	getTypeConnectionData(data: string): VideoType {
		try {
			return JSON.parse(data).type;
		} catch (error) {
			return VideoType.CAMERA;
		}
	}

	protected getParticipantIdFromData(data: string): string {
		try {
			return JSON.parse(data).participantId;
		} catch (error) {
			return '';
		}
	}

	protected newParticipant(props: ParticipantProperties, streamModel?: StreamModel) {
		if (this.openviduAngularConfigSrv.hasParticipantFactory()) {
			return this.openviduAngularConfigSrv.getParticipantFactory().apply(this, [props, streamModel]);
		}
		return new ParticipantModel(props, streamModel);
	}
}
