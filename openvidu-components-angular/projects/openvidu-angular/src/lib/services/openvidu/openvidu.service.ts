import { Injectable } from '@angular/core';
import {
	Connection,
	OpenVidu,
	OpenViduError,
	OpenViduErrorName,
	Publisher,
	PublisherProperties,
	Session,
	SignalOptions
} from 'openvidu-browser';

import { LoggerService } from '../logger/logger.service';

import { CameraType } from '../../models/device.model';
import { ILogger } from '../../models/logger.model';
import { OpenViduEdition } from '../../models/openvidu.model';
import { Signal } from '../../models/signal.model';
import { ScreenType, VideoType } from '../../models/video-type.model';
import { OpenViduAngularConfigService } from '../config/openvidu-angular.config.service';
import { DeviceService } from '../device/device.service';
import { ParticipantService } from '../participant/participant.service';
import { PlatformService } from '../platform/platform.service';

@Injectable({
	providedIn: 'root'
})
export class OpenViduService {
	private ovEdition: OpenViduEdition;
	private webcamToken = '';
	private screenToken = '';
	protected OV: OpenVidu;
	protected OVScreen: OpenVidu;
	protected webcamSession: Session;
	protected screenSession: Session;
	protected videoSource = undefined;
	protected audioSource = undefined;
	protected log: ILogger;

	/**
	 * @internal
	 */
	constructor(
		protected openviduAngularConfigSrv: OpenViduAngularConfigService,
		protected platformService: PlatformService,
		protected loggerSrv: LoggerService,
		private participantService: ParticipantService,
		protected deviceService: DeviceService
	) {
		this.log = this.loggerSrv.get('OpenViduService');
	}

	/**
	 * @internal
	 */
	initialize() {
		this.OV = new OpenVidu();
		this.OV.setAdvancedConfiguration({
			publisherSpeakingEventsOptions: {
				interval: 50
			}
		});
		if (this.openviduAngularConfigSrv.isProduction()) this.OV.enableProdMode();
		this.webcamSession = this.OV.initSession();

		// Initialize screen session only if it is not mobile platform
		if (!this.platformService.isMobile()) {
			this.OVScreen = new OpenVidu();
			if (this.openviduAngularConfigSrv.isProduction()) this.OVScreen.enableProdMode();
			this.screenSession = this.OVScreen.initSession();
		}
	}

	/**
	 * @internal
	 */
	setWebcamToken(token: string) {
		this.webcamToken = token;
	}

	/**
	 * @internal
	 */
	setScreenToken(token: string) {
		this.screenToken = token;
	}

	/**
	 * @internal
	 */
	getWebcamToken(): string {
		return this.webcamToken;
	}

	/**
	 * @internal
	 */
	getScreenToken(): string {
		return this.screenToken;
	}

	/**
	 * @internal
	 */
	isOpenViduCE(): boolean {
		return this.ovEdition === OpenViduEdition.CE;
	}

	/**
	 * @internal
	 */
	setOpenViduEdition(edition: OpenViduEdition) {
		this.ovEdition = edition;
	}

	isSessionConnected(): boolean {
		return !!this.webcamSession.connection;
	}

	/**
	 * @internal
	 */
	async clear() {
		this.videoSource = undefined;
		this.audioSource = undefined;
		await this.participantService.getMyCameraPublisher()?.stream?.disposeMediaStream();
		await this.participantService.getMyScreenPublisher()?.stream?.disposeMediaStream();
	}

	/**
	 *
	 * Returns the local Session. See {@link https://docs.openvidu.io/en/stable/api/openvidu-browser/classes/Session.html  Session} object.
	 */
	getSession(): Session {
		return this.getWebcamSession();
	}

	/**
	 * @internal
	 */
	getWebcamSession(): Session {
		return this.webcamSession;
	}

	/**
	 * @internal
	 */
	isWebcamSessionConnected(): boolean {
		return !!this.webcamSession.capabilities;
	}

	/**
	 * @internal
	 */
	getScreenSession(): Session {
		return this.screenSession;
	}

	/**
	 * @internal
	 */
	isScreenSessionConnected(): boolean {
		return !!this.screenSession.capabilities;
	}

	/**
	 * @internal
	 */
	async connectSession(session: Session, token: string): Promise<void> {
		if (!!token && session) {
			const nickname = this.participantService.getMyNickname();
			const participantId = this.participantService.getLocalParticipant().id;
			if (session === this.webcamSession) {
				this.log.d('Connecting webcam session');
				await this.webcamSession.connect(token, {
					clientData: nickname,
					participantId,
					type: VideoType.CAMERA
				});
				this.participantService.setMyCameraConnectionId(this.webcamSession.connection.connectionId);
			} else if (session === this.screenSession) {
				this.log.d('Connecting screen session');
				await this.screenSession.connect(token, {
					clientData: `${nickname}_${VideoType.SCREEN}`,
					participantId,
					type: VideoType.SCREEN
				});

				this.participantService.setMyScreenConnectionId(this.screenSession.connection.connectionId);
			}
		}
	}

	/**
	 * Leaves the session, destroying all local streams and clean all participant data.
	 */
	disconnect() {
		this.disconnectSession(this.webcamSession);
		this.disconnectSession(this.screenSession);
	}

	/**
	 * @internal
	 * Initialize a publisher checking devices saved on storage or if participant have devices available.
	 */
	async initDefaultPublisher(): Promise<Publisher> {
		const hasVideoDevices = this.deviceService.hasVideoDeviceAvailable();
		const hasAudioDevices = this.deviceService.hasAudioDeviceAvailable();
		const isVideoActive = !this.deviceService.isVideoMuted();
		const isAudioActive = !this.deviceService.isAudioMuted();

		let videoSource: string | boolean = false;
		let audioSource: string | boolean = false;

		if (hasVideoDevices) {
			// Video is active, assign the device selected
			videoSource = this.deviceService.getCameraSelected().device;
		} else if (!isVideoActive && hasVideoDevices) {
			// Video is muted, assign the default device
			// videoSource = undefined;
		}

		if (hasAudioDevices) {
			// Audio is active, assign the device selected
			audioSource = this.deviceService.getMicrophoneSelected().device;
		} else if (!isAudioActive && hasAudioDevices) {
			// Audio is muted, assign the default device
			// audioSource = undefined;
		}

		const mirror = this.deviceService.getCameraSelected() && this.deviceService.getCameraSelected().type === CameraType.FRONT;
		const properties: PublisherProperties = {
			videoSource,
			audioSource,
			publishVideo: isVideoActive,
			publishAudio: isAudioActive,
			mirror
		};
		if (hasVideoDevices || hasAudioDevices) {
			const publisher = await this.initPublisher(undefined, properties);
			this.participantService.setMyCameraPublisher(publisher);
			this.participantService.updateLocalParticipant();
			return publisher;
		} else {
			this.participantService.setMyCameraPublisher(null);
		}
	}

	/**
	 * @internal
	 */
	async initPublisher(targetElement: string | HTMLElement, properties: PublisherProperties): Promise<Publisher> {
		this.log.d('Initializing publisher with properties: ', properties);
		return await this.OV.initPublisherAsync(targetElement, properties);
	}

	/**
	 * @internal
	 */
	async publish(publisher: Publisher): Promise<void> {
		if (!!publisher) {
			if (publisher === this.participantService.getMyCameraPublisher()) {
				if (this.webcamSession?.capabilities?.publish) {
					return await this.webcamSession.publish(publisher);
				}
				this.log.e('Webcam publisher cannot be published');
			} else if (publisher === this.participantService.getMyScreenPublisher()) {
				if (this.screenSession?.capabilities?.publish) {
					return await this.screenSession.publish(publisher);
				}
				this.log.e('Screen publisher cannot be published');
			}
		}
	}

	/**
	 * @internal
	 */
	private unpublish(publisher: Publisher): void {
		if (!!publisher) {
			if (publisher === this.participantService.getMyCameraPublisher()) {
				this.publishAudioAux(this.participantService.getMyScreenPublisher(), this.participantService.isMyAudioActive());
				this.webcamSession.unpublish(publisher);
			} else if (publisher === this.participantService.getMyScreenPublisher()) {
				this.screenSession.unpublish(publisher);
			}
		}
	}

	/**
	 * Publish or unpublish the video stream (if available).
	 * It hides the camera muted stream if screen is sharing.
	 * See openvidu-browser {@link https://docs.openvidu.io/en/stable/api/openvidu-browser/classes/Publisher.html#publishVideo publishVideo}
	 */
	async publishVideo(publish: boolean): Promise<void> {
		const publishAudio = this.participantService.isMyAudioActive();

		// Disabling webcam
		if (this.participantService.haveICameraAndScreenActive()) {
			await this.publishVideoAux(this.participantService.getMyCameraPublisher(), publish);
			this.participantService.disableWebcamStream();
			this.unpublish(this.participantService.getMyCameraPublisher());
			this.publishAudioAux(this.participantService.getMyScreenPublisher(), publishAudio);
		} else if (this.participantService.isOnlyMyScreenActive()) {
			// Enabling webcam
			const hasAudio = this.participantService.hasScreenAudioActive();
			if (!this.isWebcamSessionConnected()) {
				await this.connectSession(this.getWebcamSession(), this.getWebcamToken());
			}
			await this.publish(this.participantService.getMyCameraPublisher());
			await this.publishVideoAux(this.participantService.getMyCameraPublisher(), true);
			this.publishAudioAux(this.participantService.getMyScreenPublisher(), false);
			this.publishAudioAux(this.participantService.getMyCameraPublisher(), hasAudio);
			this.participantService.enableWebcamStream();
		} else {
			// Muting/unmuting webcam
			await this.publishVideoAux(this.participantService.getMyCameraPublisher(), publish);
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
				const mediaStream = await this.createMediaStream({ videoSource: currentDeviceId, audioSource: false });
				resource = mediaStream.getVideoTracks()[0];
			}

			await publisher.publishVideo(publish, resource);
			this.participantService.updateLocalParticipant();
		}
	}

	/**
	 * Publish or unpublish the audio stream (if available).
	 * See openvidu-browser {@link https://docs.openvidu.io/en/stable/api/openvidu-browser/classes/Publisher.html#publishAudio publishAudio}.
	 */
	async publishAudio(publish: boolean): Promise<void> {
		if (this.participantService.isMyCameraActive()) {
			if (this.participantService.isMyScreenActive() && this.participantService.hasScreenAudioActive()) {
				this.publishAudioAux(this.participantService.getMyScreenPublisher(), false);
			}

			this.publishAudioAux(this.participantService.getMyCameraPublisher(), publish);
		} else {
			this.publishAudioAux(this.participantService.getMyScreenPublisher(), publish);
		}
	}

	/**
	 * Share or unshare the screen.
	 * Hide the camera muted stream when screen is sharing.
	 */
	async toggleScreenshare() {
		if (this.participantService.haveICameraAndScreenActive()) {
			// Disabling screenShare
			this.participantService.disableScreenStream();
			this.unpublish(this.participantService.getMyScreenPublisher());
		} else if (this.participantService.isOnlyMyCameraActive()) {
			// I only have the camera published
			const hasAudioDevicesAvailable = this.deviceService.hasAudioDeviceAvailable();
			const willWebcamBePresent = this.participantService.isMyCameraActive() && this.participantService.isMyVideoActive();
			const hasAudio = willWebcamBePresent ? false : hasAudioDevicesAvailable && this.participantService.isMyAudioActive();

			const properties: PublisherProperties = {
				videoSource: ScreenType.SCREEN,
				audioSource: hasAudioDevicesAvailable ? this.deviceService.getMicrophoneSelected().device : false,
				publishVideo: true,
				publishAudio: hasAudio,
				mirror: false
			};
			const screenPublisher = await this.initPublisher(undefined, properties);

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
				this.participantService.activeMyScreenShare(screenPublisher);

				if (!this.isScreenSessionConnected()) {
					await this.connectSession(this.getScreenSession(), this.getScreenToken());
				}
				await this.publish(this.participantService.getMyScreenPublisher());
				if (!this.participantService.isMyVideoActive()) {
					// Disabling webcam
					this.participantService.disableWebcamStream();
					this.unpublish(this.participantService.getMyCameraPublisher());
				}
			});

			screenPublisher.once('accessDenied', (error: any) => {
				return Promise.reject(error);
			});
		} else {
			// I only have my screenshare active and I have no camera or it is muted
			const hasAudio = this.participantService.hasScreenAudioActive();

			// Enable webcam
			if (!this.isWebcamSessionConnected()) {
				await this.connectSession(this.getWebcamSession(), this.getWebcamToken());
			}
			await this.publish(this.participantService.getMyCameraPublisher());
			this.publishAudioAux(this.participantService.getMyCameraPublisher(), hasAudio);
			this.participantService.enableWebcamStream();

			// Disabling screenshare
			this.participantService.disableScreenStream();
			this.unpublish(this.participantService.getMyScreenPublisher());
		}
	}

	/**
	 * @internal
	 */
	private publishAudioAux(publisher: Publisher, value: boolean): void {
		if (!!publisher) {
			publisher.publishAudio(value);
			this.participantService.updateLocalParticipant();
		}
	}

	/**
	 * @internal
	 */
	sendSignal(type: Signal, connections?: Connection[], data?: any): void {
		const signalOptions: SignalOptions = {
			data: JSON.stringify(data),
			type,
			to: connections && connections.length > 0 ? connections : undefined
		};
		this.webcamSession.signal(signalOptions);
	}

	/**
	 * @internal
	 */
	async replaceTrack(videoType: VideoType, props: PublisherProperties) {
		try {
			this.log.d(`Replacing ${videoType} track`, props);

			if (videoType === VideoType.CAMERA) {
				let mediaStream: MediaStream;
				const isReplacingAudio = !!props.audioSource;
				const isReplacingVideo = !!props.videoSource;

				if (isReplacingVideo) {
					mediaStream = await this.createMediaStream(props);
					// Replace video track
					const videoTrack: MediaStreamTrack = mediaStream.getVideoTracks()[0];
					await this.participantService.getMyCameraPublisher().replaceTrack(videoTrack);
				} else if (isReplacingAudio) {
					mediaStream = await this.createMediaStream(props);
					// Replace audio track
					const audioTrack: MediaStreamTrack = mediaStream.getAudioTracks()[0];
					await this.participantService.getMyCameraPublisher().replaceTrack(audioTrack);
				}
			} else if (videoType === VideoType.SCREEN) {
				try {
					let newScreenMediaStream = await this.OVScreen.getUserMedia(props);
					this.participantService.getMyScreenPublisher().stream.getMediaStream().getVideoTracks()[0].stop();
					await this.participantService.getMyScreenPublisher().replaceTrack(newScreenMediaStream.getVideoTracks()[0]);
				} catch (error) {
					this.log.w('Cannot create the new MediaStream', error);
				}
			}
		} catch (error) {
			this.log.e('Error replacing track ', error);
		}
	}

	// private destroyPublisher(publisher: Publisher): void {
	// 	if (!!publisher) {
	// 		if (publisher.stream.getWebRtcPeer()) {
	// 			publisher.stream.disposeWebRtcPeer();
	// 		}
	// 		publisher.stream.disposeMediaStream();
	// 		if (publisher.id === this.participantService.getMyCameraPublisher().id) {
	// 			this.participantService.setMyCameraPublisher(publisher);
	// 		} else if (publisher.id === this.participantService.getMyScreenPublisher().id) {
	// 			this.participantService.setMyScreenPublisher(publisher);
	// 		}
	// 	}
	// }

	private async createMediaStream(pp: PublisherProperties): Promise<MediaStream> {
		let mediaStream: MediaStream;
		const isFirefoxPlatform = this.platformService.isFirefox();
		const isReplacingAudio = !!pp.audioSource;
		const isReplacingVideo = !!pp.videoSource;

		try {
			mediaStream = await this.OV.getUserMedia(pp);
		} catch (error) {
			if ((<OpenViduError>error).name === OpenViduErrorName.DEVICE_ACCESS_DENIED) {
				if (isFirefoxPlatform) {
					this.log.w('The device requested is not available. Restoring the older one');
					// The track requested is not available so we are getting the old tracks ids for recovering the track
					if (isReplacingVideo) {
						pp.videoSource = this.deviceService.getCameraSelected().device;
					} else if (isReplacingAudio) {
						pp.audioSource = this.deviceService.getMicrophoneSelected().device;
					}
					mediaStream = await this.OV.getUserMedia(pp);
					// TODO show error alert informing that the new device is not available
				}
			}
		} finally {
			return mediaStream;
		}
	}

	/**
	 * @internal
	 */
	needSendNicknameSignal(): boolean {
		let oldNickname: string;
		try {
			const connData = JSON.parse(this.webcamSession.connection.data.split('%/%')[0]);
			oldNickname = connData.clientData;
		} catch (error) {
			this.log.e(error);
		}
		return oldNickname !== this.participantService.getMyNickname();
	}

	/**
	 * @internal
	 */
	isMyOwnConnection(connectionId: string): boolean {
		return (
			this.webcamSession?.connection?.connectionId === connectionId || this.screenSession?.connection?.connectionId === connectionId
		);
	}

	/**
	 *
	 * Returns the remote connections of the Session.
	 * See {@link https://docs.openvidu.io/en/stable/api/openvidu-browser/classes/Connection.html  Connection} object.
	 */
	getRemoteConnections(): Connection[] {
		// Avoid screen connections
		const remoteCameraConnections: Connection[] = Array.from(this.webcamSession.remoteConnections.values()).filter((conn) => {
			let type: VideoType;
			type = JSON.parse(conn.data).type;
			return type !== VideoType.SCREEN;
		});
		return remoteCameraConnections;
	}

	private disconnectSession(session: Session) {
		if (session) {
			if (session.sessionId === this.webcamSession?.sessionId) {
				this.log.d('Disconnecting webcam session');
				this.webcamSession?.disconnect();
				this.webcamSession = null;
			} else if (session.sessionId === this.screenSession?.sessionId) {
				this.log.d('Disconnecting screen session');
				this.screenSession?.disconnect();
				this.screenSession = null;
			}
		}
	}
}
