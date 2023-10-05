import { Injectable, Injector } from '@angular/core';
import {
	Connection,
	OpenVidu,
	OpenViduError,
	OpenViduErrorName,
	Publisher,
	PublisherProperties,
	Session,
	SignalOptions,
	Stream,
	StreamManager
} from 'openvidu-browser';

import { BehaviorSubject, Observable } from 'rxjs';
import { CameraType } from '../../models/device.model';
import { ILogger } from '../../models/logger.model';
import { OpenViduEdition } from '../../models/openvidu.model';
import { Signal } from '../../models/signal.model';
import { ScreenType, VideoType } from '../../models/video-type.model';
import { OpenViduAngularConfigService } from '../config/openvidu-angular.config.service';
import { DeviceService } from '../device/device.service';
import { LoggerService } from '../logger/logger.service';
import { ParticipantService } from '../participant/participant.service';
import { PlatformService } from '../platform/platform.service';

@Injectable({
	providedIn: 'root'
})
export class OpenViduService {
	/*
	 * @internal
	 */
	isSttReadyObs: Observable<boolean>;
	private ovEdition: OpenViduEdition;
	private webcamToken = '';
	private screenToken = '';
	protected OV: OpenVidu;
	protected OVScreen: OpenVidu;
	protected webcamSession: Session;
	protected screenSession: Session;
	protected videoSource = undefined;
	protected audioSource = undefined;
	private STT_TIMEOUT_MS = 2 * 1000;
	private sttReconnectionTimeout: NodeJS.Timeout;
	private _isSttReady: BehaviorSubject<boolean> = new BehaviorSubject(true);
	protected log: ILogger;

	/**
	 * @internal
	 */
	constructor(
		protected libService: OpenViduAngularConfigService,
		protected platformService: PlatformService,
		protected loggerSrv: LoggerService,
		private injector: Injector,
		protected deviceService: DeviceService
	) {
		this.log = this.loggerSrv.get('OpenViduService');
		this.isSttReadyObs = this._isSttReady.asObservable();
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
		if (this.libService.isProduction()) this.OV.enableProdMode();
		this.webcamSession = this.OV.initSession();

		// Initialize screen session only if it is not mobile platform
		if (!this.platformService.isMobile()) {
			this.OVScreen = new OpenVidu();
			if (this.libService.isProduction()) this.OVScreen.enableProdMode();
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
	isOpenViduPro(): boolean {
		return this.ovEdition === OpenViduEdition.PRO;
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
	 * Whether the STT service is ready or not
	 * This will be `false` when the app receives a SPEECH_TO_TEXT_DISCONNECTED exception
	 * and it cannot subscribe to STT
	 */
	isSttReady(): boolean {
		return this._isSttReady.getValue();
	}

	/**
	 * @internal
	 */
	setSTTReady(value: boolean): void {
		if (this._isSttReady.getValue() !== value) {
			this._isSttReady.next(value);
		}
	}

	/**
	 * @internal
	 * Connects to webcam session using webcam token.
	 */
	async connectWebcamSession(participantId: string, nickname: string): Promise<string | undefined> {
		if (this.isWebcamSessionConnected()) {
			this.log.d('Webcam session is already connected');
			return undefined;
		}

		this.log.d('Connecting webcam session');
		await this.webcamSession.connect(this.getWebcamToken(), {
			clientData: nickname,
			participantId,
			type: VideoType.CAMERA
		});

		return this.webcamSession.connection.connectionId;
	}

	/**
	 * @internal
	 * Connects to screen session using screen token.
	 */
	async connectScreenSession(participantId: string, nickname: string): Promise<string | undefined> {
		if (this.isScreenSessionConnected()) {
			this.log.d('Screen session is already connected');
			return undefined;
		}

		this.log.d('Connecting screen session');
		await this.screenSession.connect(this.getScreenToken(), {
			clientData: `${nickname}_${VideoType.SCREEN}`,
			participantId,
			type: VideoType.SCREEN
		});

		return this.screenSession.connection.connectionId;
	}

	/**
	 * Leaves the session, destroying all local streams and clean all participant data.
	 */
	disconnect() {
		this.disconnectSession(this.webcamSession);
		this.disconnectSession(this.screenSession);
	}

	async updateVideoEncodingParameters(streamManager: StreamManager) {
		if (!streamManager) return;
		const track = streamManager?.stream.getMediaStream().getVideoTracks()[0];
		const videoSender = streamManager?.stream
			.getRTCPeerConnection()
			.getSenders()
			.find((sender) => sender.track === track);

		if (!videoSender) return;

		const parameters: RTCRtpSendParameters = videoSender.getParameters();
		const desiredFrameRate = this.libService.getStreamFrameRate();
		const desiredWidth = Number(this.libService.getStreamResolution().split('x')[0]);
		const desiredResolution = Number(track?.getConstraints()?.width) / desiredWidth ?? 1.0;
		parameters.encodings.forEach((encoding: RTCRtpEncodingParameters) => {
			if (desiredFrameRate > 0 && encoding['maxFramerate'] !== desiredFrameRate) encoding['maxFramerate'] = desiredFrameRate;
			if (desiredResolution >= 1 && encoding['scaleResolutionDownBy'] !== desiredResolution) {
				encoding['scaleResolutionDownBy'] = desiredResolution;
			}
		});
		await videoSender.setParameters(parameters);
	}

	/**
	 * @internal
	 * Initialize a publisher checking devices saved on storage or if participant have devices available.
	 */
	async initDefaultPublisher(pp?: Partial<PublisherProperties>): Promise<Publisher | undefined> {
		const hasVideoDevices = this.deviceService.hasVideoDeviceAvailable();
		const hasAudioDevices = this.deviceService.hasAudioDeviceAvailable();
		const isVideoActive = !this.deviceService.isVideoMuted();
		const isAudioActive = !this.deviceService.isAudioMuted();

		let videoSource: string | boolean = false;
		let audioSource: string | boolean = false;

		if (hasVideoDevices) {
			// Video is active, assign the device selected
			videoSource = this.deviceService.getCameraSelected()?.device ?? false;
		} else if (!isVideoActive && hasVideoDevices) {
			// Video is muted, assign the default device
			// videoSource = undefined;
		}

		if (hasAudioDevices) {
			// Audio is active, assign the device selected
			audioSource = this.deviceService.getMicrophoneSelected()?.device ?? false;
		} else if (!isAudioActive && hasAudioDevices) {
			// Audio is muted, assign the default device
			// audioSource = undefined;
		}

		const mirror = this.deviceService.getCameraSelected() && this.deviceService.getCameraSelected()?.type === CameraType.FRONT;
		const properties: PublisherProperties = {
			videoSource,
			audioSource,
			publishVideo: isVideoActive,
			publishAudio: isAudioActive,
			resolution: pp?.resolution ?? '640x480',
			frameRate: pp?.frameRate ?? 30,
			videoSimulcast: pp?.videoSimulcast ?? false,
			mirror
		};
		if (hasVideoDevices || hasAudioDevices) {
			return this.initPublisher(properties);
		}
	}

	/**
	 * @internal
	 */
	private initPublisher(properties: PublisherProperties, targetElement?: string | HTMLElement): Promise<Publisher> {
		this.log.d('Initializing publisher with properties: ', properties);
		return this.OV.initPublisherAsync(targetElement, properties);
	}

	/**
	 * @internal
	 * @param hasAudio
	 * @returns
	 */
	initScreenPublisher(): Promise<Publisher> {
		const properties: PublisherProperties = {
			videoSource: ScreenType.SCREEN,
			audioSource: ScreenType.SCREEN,
			publishVideo: true,
			publishAudio: true,
			mirror: false
		};
		return this.initPublisher(properties);
	}

	/**
	 * Publishes the publisher to the webcam Session
	 * @param publisher
	 */
	async publishCamera(publisher: Publisher): Promise<void> {
		if (!publisher) return;
		if (this.webcamSession?.capabilities?.publish) {
			return this.webcamSession.publish(publisher);
		}
		this.log.e('Webcam publisher cannot be published');
	}

	/**
	 * Publishes the publisher to the screen Session
	 * @param publisher
	 */
	async publishScreen(publisher: Publisher): Promise<void> {
		if (!publisher) return;

		if (this.screenSession?.capabilities?.publish) {
			return this.screenSession.publish(publisher);
		}
		this.log.e('Screen publisher cannot be published');
	}

	/**
	 * Unpublishes the publisher of the webcam Session
	 * @param publisher
	 */
	async unpublishCamera(publisher: Publisher): Promise<void> {
		if (!publisher) return;
		return this.webcamSession.unpublish(publisher);
	}

	/**
	 * Unpublishes the publisher of the screen Session
	 * @param publisher
	 */
	async unpublishScreen(publisher: Publisher): Promise<void> {
		if (!publisher) return;
		return this.screenSession.unpublish(publisher);
	}

	/**
	 * Publish or unpublish the video stream (if available).
	 * It hides the camera muted stream if screen is sharing.
	 * See openvidu-browser {@link https://docs.openvidu.io/en/stable/api/openvidu-browser/classes/Publisher.html#publishVideo publishVideo}
	 *
	 * @deprecated This method has been moved to ParticipantService
	 *
	 * TODO: Remove this method in release 2.29.0
	 */
	async publishVideo(publish: boolean): Promise<void> {
		const participantService = this.injector.get(ParticipantService);
		return participantService.publishVideo(publish);
	}

	/**
	 * Share or unshare the screen.
	 * Hide the camera muted stream when screen is sharing.
	 * @deprecated This method has been moved to ParticipantService
	 *
	 * TODO: Remove this method in release 2.29.0
	 */
	async toggleScreenshare() {
		const participantService = this.injector.get(ParticipantService);
		return participantService.toggleScreenshare();
	}

	/**
	 *
	 * Publish or unpublish the audio stream (if available).
	 * See openvidu-browser {@link https://docs.openvidu.io/en/stable/api/openvidu-browser/classes/Publisher.html#publishAudio publishAudio}.
	 * @deprecated This method has been moved to ParticipantService
	 *
	 * TODO: Remove this method in release 2.29.0
	 */
	publishAudio(publish: boolean): void {
		const participantService = this.injector.get(ParticipantService);
		participantService.publishAudio(publish);
	}

	/**
	 * @internal
	 *
	 * @param type: type of signal
	 * @param connections: if undefined, the signal will be sent to all participants
	 */
	sendSignal(type: Signal, connections?: Connection[], data?: any): Promise<void> {
		const signalOptions: SignalOptions = {
			data: JSON.stringify(data),
			type,
			to: connections && connections.length > 0 ? connections : undefined
		};
		return this.webcamSession.signal(signalOptions);
	}

	/**
	 * @internal
	 * @param cameraPublisher
	 * @param props
	 */
	async replaceCameraTrack(cameraPublisher: Publisher, props: PublisherProperties) {
		const isReplacingAudio = !!props.audioSource;
		const isReplacingVideo = !!props.videoSource;
		let mediaStream: MediaStream | undefined;
		let track: MediaStreamTrack | undefined;

		try {
			if (isReplacingVideo || isReplacingAudio) {
				mediaStream = await this.createMediaStream(props);
			}

			if (isReplacingVideo) {
				track = mediaStream?.getVideoTracks()[0];
			} else if (isReplacingAudio) {
				track = mediaStream?.getAudioTracks()[0];
			}

			if (track) {
				await cameraPublisher.replaceTrack(track);
			}
		} catch (error) {
			this.log.e('Error replacing track ', error);
		}
	}

	/**
	 * @internal
	 * @param screenPublisher
	 * @param props
	 */
	async replaceScreenTrack(screenPublisher: Publisher, props: PublisherProperties) {
		try {
			let newScreenMediaStream = await this.OVScreen.getUserMedia(props);
			screenPublisher.stream.getMediaStream().getVideoTracks()[0].stop();
			await screenPublisher.replaceTrack(newScreenMediaStream.getVideoTracks()[0]);
		} catch (error) {
			this.log.w('Cannot create the new MediaStream', error);
		}
	}

	/**
	 * @internal
	 * Subscribe all `CAMERA` stream types to speech-to-text
	 * It will retry the subscription each `STT_TIMEOUT_MS`
	 *
	 * @param lang The language of the Stream's audio track.
	 */
	async subscribeRemotesToSTT(lang: string): Promise<void> {
		const participantService = this.injector.get(ParticipantService);

		const remoteParticipants = participantService.getRemoteParticipants();
		let successNumber = 0;

		for (const p of remoteParticipants) {
			const stream = p.getCameraConnection()?.streamManager?.stream;
			if (stream) {
				try {
					await this.subscribeStreamToStt(stream, lang);
					successNumber++;
				} catch (error) {
					this.log.e(`Error subscribing ${stream.streamId} to STT:`, error);
					break;
				}
			}
		}

		this.setSTTReady(successNumber === remoteParticipants.length);
		if (!this.isSttReady()) {
			this.log.w('STT is not ready. Retrying subscription...');
			this.sttReconnectionTimeout = setTimeout(this.subscribeRemotesToSTT.bind(this, lang), this.STT_TIMEOUT_MS);
		}
	}

	/**
	 * @internal
	 * Subscribe a stream to speech-to-text
	 * @param stream
	 * @param lang
	 */
	async subscribeStreamToStt(stream: Stream, lang: string): Promise<void> {
		await this.getWebcamSession().subscribeToSpeechToText(stream, lang);
		this.log.d(`Subscribed stream ${stream.streamId} to STT with ${lang} language.`);
	}

	/**
	 * @internal
	 * Unsubscribe to all `CAMERA` stream types to speech-to-text if STT is up(ready)
	 */
	async unsubscribeRemotesFromSTT(): Promise<void> {
		const participantService = this.injector.get(ParticipantService);

		clearTimeout(this.sttReconnectionTimeout);
		if (this.isSttReady()) {
			for (const p of participantService.getRemoteParticipants()) {
				const stream = p.getCameraConnection().streamManager.stream;
				if (stream) {
					try {
						await this.getWebcamSession().unsubscribeFromSpeechToText(stream);
					} catch (error) {
						this.log.e(`Error unsubscribing ${stream.streamId} from STT:`, error);
					}
				}
			}
		}
	}

	/**
	 * @internal
	 * @param pp {@link PublisherProperties}
	 * @returns Promise<MediaStream>
	 */
	async createMediaStream(pp: PublisherProperties): Promise<MediaStream> {
		const participantService = this.injector.get(ParticipantService);
		const currentCameraSelected = this.deviceService.getCameraSelected();
		const currentMicSelected = this.deviceService.getMicrophoneSelected();
		const isReplacingAudio = Boolean(pp.audioSource);
		const isReplacingVideo = Boolean(pp.videoSource);

		try {
			const trackType = isReplacingAudio ? 'audio' : 'video';
			this.forceStopMediaTracks(participantService.getMyCameraPublisher().stream.getMediaStream(), trackType);
			return this.OV.getUserMedia(pp);
		} catch (error) {
			this.log.w('Error creating MediaStream', error);
			if ((<OpenViduError>error).name === OpenViduErrorName.DEVICE_ACCESS_DENIED) {
				this.log.w('The device requested is not available. Restoring the older one');
				// The track requested is not available so we are getting the old tracks ids for recovering the track
				if (isReplacingVideo) {
					pp.videoSource = currentCameraSelected?.device;
				} else if (isReplacingAudio) {
					pp.audioSource = currentMicSelected?.device;
				}
				// TODO show error alert informing that the new device is not available
				return this.OV.getUserMedia(pp);
			}
			throw error;
		}
	}

	/**
	 * @internal
	 */
	myNicknameHasBeenChanged(): boolean {
		const participantService = this.injector.get(ParticipantService);
		let oldNickname: string = '';
		try {
			const connData = JSON.parse(this.cleanConnectionData(this.webcamSession.connection.data));
			oldNickname = connData.clientData;
		} catch (error) {
			this.log.e(error);
		} finally {
			return oldNickname !== participantService.getMyNickname();
		}
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
			type = JSON.parse(this.cleanConnectionData(conn.data)).type;
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

	private cleanConnectionData(data: string): string {
		return data.split('%/%')[0];
	}

	private forceStopMediaTracks(stream: MediaStream, type: 'video' | 'audio'): void {
		if (stream) {
			stream.getTracks().forEach((track) => {
				if (track.kind === type) {
					track.stop();
					track.enabled = false;
				}
			});
		}
	}
}
