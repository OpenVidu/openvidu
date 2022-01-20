import { Injectable } from '@angular/core';
import { Connection, OpenVidu, Publisher, PublisherProperties, Session, SignalOptions } from 'openvidu-browser';

import { LoggerService } from '../../services/logger/logger.service';

import { ILogger } from '../../models/logger.model';
import { Signal } from '../../models/signal.model';
import { LibraryConfigService } from '../library-config/library-config.service';
import { PlatformService } from '../platform/platform.service';
import { DeviceService } from '../device/device.service';
import { CameraType } from '../../models/device.model';
import { VideoType } from '../../models/video-type.model';
import { ParticipantService } from '../participant/participant.service';

@Injectable({
	providedIn: 'root'
})
export class WebrtcService {
	protected OV: OpenVidu = null;
	protected OVScreen: OpenVidu = null;
	protected webcamSession: Session = null;
	protected screenSession: Session = null;
	protected videoSource = undefined;
	protected audioSource = undefined;
	protected screenMediaStream: MediaStream = null;
	protected webcamMediaStream: MediaStream = null;
	protected log: ILogger;

	constructor(
		protected libraryConfigSrv: LibraryConfigService,
		protected platformService: PlatformService,
		protected loggerSrv: LoggerService,
		private participantService: ParticipantService,
		protected deviceService: DeviceService
	) {
		this.log = this.loggerSrv.get('WebRTCService');
	}

	initialize() {
		this.OV = new OpenVidu();
		if (this.libraryConfigSrv.isProduction()) this.OV.enableProdMode();
		this.webcamSession = this.OV.initSession();

		// Initialize screen session only if it is not mobile platform
		if (!this.platformService.isMobile()) {
			this.OVScreen = new OpenVidu();
			if (this.libraryConfigSrv.isProduction()) this.OVScreen.enableProdMode();
			this.screenSession = this.OVScreen.initSession();
		}
	}

	getWebcamSession(): Session {
		return this.webcamSession;
	}

	isWebcamSessionConnected(): boolean {
		return !!this.webcamSession.capabilities;
	}

	getScreenSession(): Session {
		return this.screenSession;
	}

	isScreenSessionConnected(): boolean {
		return !!this.screenSession.capabilities;
	}

	async connectSession(session: Session, token: string): Promise<void> {
		if (!!token && session) {
			const nickname = this.participantService.getWebcamNickname();
			const participantId = this.participantService.getMyParticipantId();
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

	disconnect() {
		this.disconnectSession(this.webcamSession);
		this.disconnectSession(this.screenSession);
		this.videoSource = undefined;
		this.audioSource = undefined;
		this.stopTracks(this.participantService.getMyCameraPublisher()?.stream?.getMediaStream());
		this.stopTracks(this.participantService.getMyScreenPublisher()?.stream?.getMediaStream());
	}

	/**
	 * Initialize a publisher checking devices saved on storage or if participant have devices available.
	 */
	async initDefaultPublisher(targetElement: string | HTMLElement): Promise<Publisher> {
		await this.deviceService.initializeDevices();
		const publishAudio = this.deviceService.hasAudioDeviceAvailable();
		const publishVideo = this.deviceService.hasVideoDeviceAvailable();
		const videoSource = publishVideo ? this.deviceService.getCameraSelected().device : false;
		const audioSource = publishAudio ? this.deviceService.getMicrophoneSelected().device : false;
		const mirror = this.deviceService.getCameraSelected() && this.deviceService.getCameraSelected().type === CameraType.FRONT;
		const properties: PublisherProperties = {
			videoSource,
			audioSource,
			publishVideo,
			publishAudio,
			mirror
		};
		if (publishAudio || publishVideo) {
			const publisher = this.initPublisher(targetElement, properties);
			this.participantService.setMyCameraPublisher(publisher);
			return publisher;
		} else {
			this.participantService.setMyCameraPublisher(null);
		}
	}

	initPublisher(targetElement: string | HTMLElement, properties: PublisherProperties): Publisher {
		this.log.d('Initializing publisher with properties: ', properties);

		const publisher = this.OV.initPublisher(targetElement, properties);
		// this.participantService.setMyCameraPublisher(publisher);
		publisher.once('streamPlaying', () => {
			(<HTMLElement>publisher.videos[0].video).parentElement.classList.remove('custom-class');
		});
		return publisher;
	}

	//TODO: This method is used by replaceTrack. Check if it's neecessary
	private destroyPublisher(publisher: Publisher): void {
		if (!!publisher) {
			// publisher.off('streamAudioVolumeChange');
			if (publisher.stream.getWebRtcPeer()) {
				publisher.stream.disposeWebRtcPeer();
			}
			publisher.stream.disposeMediaStream();
			if (publisher.id === this.participantService.getMyCameraPublisher().id) {
				this.participantService.setMyCameraPublisher(publisher);
			} else if (publisher.id === this.participantService.getMyScreenPublisher().id) {
				this.participantService.setMyScreenPublisher(publisher);
			}
		}
	}

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

	unpublish(publisher: Publisher): void {
		if (!!publisher) {
			if (publisher === this.participantService.getMyCameraPublisher()) {
				this.publishAudio(this.participantService.getMyScreenPublisher(), this.participantService.hasCameraAudioActive());
				this.webcamSession.unpublish(publisher);
			} else if (publisher === this.participantService.getMyScreenPublisher()) {
				this.screenSession.unpublish(publisher);
			}
		}
	}

	publishVideo(publisher: Publisher, value: boolean): void {
		if (!!publisher) {
			publisher.publishVideo(value);
			// Send event to subscribers because of video has changed and view must update
			this.participantService.updateUsersStatus();
		}
	}

	publishAudio(publisher: Publisher, value: boolean): void {
		if (!!publisher) {
			publisher.publishAudio(value);
			// Send event to subscribers because of video has changed and view must update
			this.participantService.updateUsersStatus();
		}
	}

	republishTrack(videoSource: string, audioSource: string, mirror: boolean = true): Promise<void> {
		return new Promise((resolve, reject) => {
			if (!!videoSource) {
				this.log.d('Replacing video track ' + videoSource);
				this.videoSource = videoSource;
				// this.stopVideoTracks(this.webcamUser.getStreamManager().stream.getMediaStream());
			}
			if (!!audioSource) {
				this.log.d('Replacing audio track ' + audioSource);
				this.audioSource = audioSource;
				// this.stopAudioTracks(this.webcamUser.getStreamManager().stream.getMediaStream());
			}
			this.destroyPublisher(this.participantService.getMyCameraPublisher());
			const properties: PublisherProperties = {
				videoSource: this.videoSource,
				audioSource: this.audioSource,
				publishVideo: this.participantService.hasCameraVideoActive(),
				publishAudio: this.participantService.hasCameraAudioActive(),
				mirror
			};

			const publisher = this.initPublisher(undefined, properties);
			this.participantService.setMyCameraPublisher(publisher);

			publisher.once('streamPlaying', () => {
				this.participantService.setMyCameraPublisher(publisher);
				resolve();
			});

			publisher.once('accessDenied', () => {
				reject();
			});
		});
	}

	sendSignal(type: Signal, connections?: Connection[], data?: any): void {
		const signalOptions: SignalOptions = {
			data: JSON.stringify(data),
			type: type,
			to: connections && connections.length > 0 ? connections : undefined
		};
		this.webcamSession.signal(signalOptions);

		if (type === Signal.NICKNAME_CHANGED && !!this.getScreenSession().connection) {
			signalOptions.data = JSON.stringify({ clientData: this.participantService.getScreenNickname() });
			this.getScreenSession()?.signal(signalOptions);
		}
	}

	async replaceTrack(currentPublisher: Publisher, newProperties: PublisherProperties) {
		try {
			if (!!currentPublisher) {
				if (currentPublisher === this.participantService.getMyCameraPublisher()) {
					// This branch has been disabled because echo problems replacing audio track.
					// this.stopAudioTracks(this.webcamMediaStream);
					// this.stopVideoTracks(this.webcamMediaStream);
					// this.webcamMediaStream = await this.OV.getUserMedia(newProperties);
					// const videoTrack: MediaStreamTrack = this.webcamMediaStream.getVideoTracks()[0];
					// const audioTrack: MediaStreamTrack = this.webcamMediaStream.getAudioTracks()[0];
					// if(!!videoTrack){
					// 	await this.participantService.getMyCameraPublisher().replaceTrack(videoTrack);
					// }
					// if(!!audioTrack) {
					// 	await this.participantService.getMyCameraPublisher().replaceTrack(audioTrack);
					// }
				} else if (currentPublisher === this.participantService.getMyScreenPublisher()) {
					const newScreenMediaStream = await this.OVScreen.getUserMedia(newProperties);
					this.stopTracks(this.screenMediaStream);
					await this.participantService.getMyScreenPublisher().replaceTrack(newScreenMediaStream.getVideoTracks()[0]);
					this.screenMediaStream = newScreenMediaStream;
				}
			}
		} catch (error) {
			this.log.e('Error replacing track ', error);
		}
	}

	needSendNicknameSignal(): boolean {
		const oldNickname: string = JSON.parse(this.webcamSession.connection.data).clientData;
		return oldNickname !== this.participantService.getWebcamNickname();
	}

	isMyOwnConnection(connectionId: string): boolean {
		return (
			this.webcamSession?.connection?.connectionId === connectionId || this.screenSession?.connection?.connectionId === connectionId
		);
	}

	getRemoteCameraConnections(): Connection[] {
		// Avoid screen connections
		const remoteCameraConnections: Connection[] = Array.from(this.webcamSession.remoteConnections.values()).filter((conn) => {
			let type: VideoType;
			type = JSON.parse(conn.data).type;
			return type !== VideoType.SCREEN;
		});
		return remoteCameraConnections;
	}

	private stopTracks(mediaStream: MediaStream) {
		if (mediaStream) {
			mediaStream?.getAudioTracks().forEach((track) => track.stop());
			mediaStream?.getVideoTracks().forEach((track) => track.stop());
			// this.webcamMediaStream?.getAudioTracks().forEach((track) => track.stop());
		}
	}
}
