import { Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';

import { OpenViduErrorName } from 'openvidu-browser/lib/OpenViduInternal/Enums/OpenViduError';
import { Publisher, PublisherProperties } from 'openvidu-browser';

import { ILogger } from '../../models/logger.model';
import { CustomDevice } from '../../models/device.model';
import { Storage } from '../../models/storage.model';
import { ScreenType } from '../../models/video-type.model';

import { NicknameMatcher } from '../../matchers/nickname.matcher';

import { DeviceService } from '../../services/device/device.service';
import { LoggerService } from '../../services/logger/logger.service';
import { StorageService } from '../../services/storage/storage.service';
import { WebrtcService } from '../../services/webrtc/webrtc.service';
import { ActionService } from '../../services/action/action.service';
import { ParticipantService } from '../../services/participant/participant.service';
import { ParticipantAbstractModel } from '../../models/participant.model';

@Component({
	selector: 'ov-user-settings',
	templateUrl: './user-settings.component.html',
	styleUrls: ['./user-settings.component.css']
})
export class UserSettingsComponent implements OnInit, OnDestroy {
	@ViewChild('bodyCard') bodyCard: ElementRef;

	@Input() sessionId: string;
	@Output() onJoinClicked = new EventEmitter<any>();
	@Output() onCloseClicked = new EventEmitter<any>();

	cameras: CustomDevice[];
	microphones: CustomDevice[];
	cameraSelected: CustomDevice;
	microphoneSelected: CustomDevice;
	isVideoActive = true;
	isAudioActive = true;
	screenShareEnabled: boolean;
	localParticipant: ParticipantAbstractModel;
	columns: number;

	nicknameFormControl = new FormControl('', [Validators.maxLength(25), Validators.required]);
	matcher = new NicknameMatcher();
	hasVideoDevices: boolean;
	hasAudioDevices: boolean;
	isLoading = true;
	private log: ILogger;
	private oVUsersSubscription: Subscription;
	private screenShareStateSubscription: Subscription;

	constructor(
		private actionService: ActionService,
		private deviceSrv: DeviceService,
		private loggerSrv: LoggerService,
		private openViduWebRTCService: WebrtcService,
		private participantService: ParticipantService,
		private storageSrv: StorageService
	) {
		this.log = this.loggerSrv.get('UserSettingsComponent');
	}

	@HostListener('window:beforeunload')
	beforeunloadHandler() {
		this.close();
	}

	async ngOnInit() {
		this.subscribeToLocalParticipantEvents();
		this.openViduWebRTCService.initialize();
		await this.deviceSrv.initializeDevices();
		const nickname = this.storageSrv.get(Storage.USER_NICKNAME) || this.generateRandomNickname();
		this.nicknameFormControl.setValue(nickname);
		this.columns = window.innerWidth > 900 ? 2 : 1;
		this.setDevicesInfo();
		if (this.hasAudioDevices || this.hasVideoDevices) {
			await this.initwebcamPublisher();
		}
		this.isLoading = false;

	}

	ngOnDestroy() {
		if (this.oVUsersSubscription) {
			this.oVUsersSubscription.unsubscribe();
		}

		if (this.screenShareStateSubscription) {
			this.screenShareStateSubscription.unsubscribe();
		}
		this.deviceSrv.clear();
	}

	async onCameraSelected(event: any) {
		const videoSource = event?.value;
		if (!!videoSource) {
			// Is New deviceId different from the old one?
			if (this.deviceSrv.needUpdateVideoTrack(videoSource)) {
				const mirror = this.deviceSrv.cameraNeedsMirror(videoSource);
				await this.openViduWebRTCService.republishTrack(videoSource, null, mirror);
				this.deviceSrv.setCameraSelected(videoSource);
				this.cameraSelected = this.deviceSrv.getCameraSelected();
			}
			// Publish Webcam video
			this.openViduWebRTCService.publishVideo(this.participantService.getMyCameraPublisher(), true);
			this.isVideoActive = true;

		} else {
			// Videosource is 'null' because of the user has selected 'None' or muted the camera
			// Unpublish webcam
			this.openViduWebRTCService.publishVideo(this.participantService.getMyCameraPublisher(), false);
			//TODO: save 'None' device in storage
			// this.deviceSrv.setCameraSelected(videoSource);
			// this.cameraSelected = this.deviceSrv.getCameraSelected();
			this.isVideoActive = false;
		}
	}

	async onMicrophoneSelected(event: any) {
		const audioSource = event?.value;

		if (!!audioSource) {
			// Is New deviceId different than older?
			if (this.deviceSrv.needUpdateAudioTrack(audioSource)) {
				const mirror = this.deviceSrv.cameraNeedsMirror(this.cameraSelected.device);
				await this.openViduWebRTCService.republishTrack(null, audioSource, mirror);
				this.deviceSrv.setMicSelected(audioSource);
				this.microphoneSelected = this.deviceSrv.getMicrophoneSelected();
			}
			// Publish microphone
			this.publishAudio(true);
			this.isAudioActive = true;
			return;
		}
		// Unpublish microhpone
		this.publishAudio(false);
		this.isAudioActive = false;
	}

	toggleCam() {
		this.isVideoActive = !this.isVideoActive;
		this.openViduWebRTCService.publishVideo(this.participantService.getMyCameraPublisher(), this.isVideoActive);

		if (this.participantService.areBothEnabled()) {
			this.participantService.disableWebcamUser();
			this.openViduWebRTCService.publishAudio(this.participantService.getMyScreenPublisher(), this.isAudioActive);
		} else if (this.participantService.isOnlyMyScreenEnabled()) {
			this.participantService.enableWebcamUser();
		}
	}

	toggleScreenShare() {
		// Disabling screenShare
		if (this.participantService.areBothEnabled()) {
			this.participantService.disableScreenUser();
			return;
		}

		// Enabling screenShare
		if (this.participantService.isOnlyMyCameraEnabled()) {
			const willThereBeWebcam = this.participantService.isMyCameraEnabled() && this.participantService.hasCameraVideoActive();
			const hasAudio = willThereBeWebcam ? false : this.hasAudioDevices && this.isAudioActive;
			const properties: PublisherProperties = {
				videoSource: ScreenType.SCREEN,
				audioSource: this.hasAudioDevices ? undefined : null,
				publishVideo: true,
				publishAudio: hasAudio,
				mirror: false
			};
			const screenPublisher = this.openViduWebRTCService.initPublisher(undefined, properties);

			screenPublisher.on('accessAllowed', (event) => {
				screenPublisher.stream
					.getMediaStream()
					.getVideoTracks()[0]
					.addEventListener('ended', () => {
						this.log.d('Clicked native stop button. Stopping screen sharing');
						this.toggleScreenShare();
					});
				this.participantService.enableScreenUser(screenPublisher);
				if (!this.participantService.hasCameraVideoActive()) {
					this.participantService.disableWebcamUser();
				}
			});

			screenPublisher.on('accessDenied', (error: any) => {
				if (error && error.name === 'SCREEN_SHARING_NOT_SUPPORTED') {
					this.actionService.openDialog('Error sharing screen', 'Your browser does not support screen sharing');
				}
			});
			return;
		}

		// Disabling screnShare and enabling webcam
		this.participantService.enableWebcamUser();
		this.participantService.disableScreenUser();
	}

	toggleMic() {
		this.isAudioActive = !this.isAudioActive;
		this.publishAudio(this.isAudioActive);
	}

	eventKeyPress(event) {
		if (event && event.keyCode === 13 && this.nicknameFormControl.valid) {
			this.joinSession();
		}
	}

	onResize(event) {
		this.columns = event.target.innerWidth > 900 ? 2 : 1;
	}

	joinSession() {
		if (this.nicknameFormControl.valid) {
			const nickname = this.nicknameFormControl.value;
			this.participantService.setNickname(this.participantService.getMyCameraConnectionId(), nickname);
			this.storageSrv.set(Storage.USER_NICKNAME, nickname);
			return this.onJoinClicked.emit();
		}
		this.scrollToBottom();
	}

	close() {
		this.onCloseClicked.emit();
	}

	private setDevicesInfo() {
		this.hasVideoDevices = this.deviceSrv.hasVideoDeviceAvailable();
		this.hasAudioDevices = this.deviceSrv.hasAudioDeviceAvailable();
		this.microphones = this.deviceSrv.getMicrophones();
		this.cameras = this.deviceSrv.getCameras();
		this.cameraSelected = this.deviceSrv.getCameraSelected();
		this.microphoneSelected = this.deviceSrv.getMicrophoneSelected();

		this.isVideoActive = this.hasVideoDevices && this.cameraSelected.label !== 'None';
		this.isAudioActive = this.hasAudioDevices && this.microphoneSelected.label !== 'None';

	}

	private scrollToBottom(): void {
		try {
			this.bodyCard.nativeElement.scrollTop = this.bodyCard.nativeElement.scrollHeight;
		} catch (err) {}
	}

	private publishAudio(audio: boolean) {
		this.participantService.isMyCameraEnabled()
			? this.openViduWebRTCService.publishAudio(this.participantService.getMyCameraPublisher(), audio)
			: this.openViduWebRTCService.publishAudio(this.participantService.getMyScreenPublisher(), audio);
	}

	private subscribeToLocalParticipantEvents() {
		this.oVUsersSubscription = this.participantService.localParticipantObs.subscribe((p) => {
			this.localParticipant = p;
		});
		this.screenShareStateSubscription = this.participantService.screenShareState.subscribe((enabled) => {
			this.screenShareEnabled = enabled;
		});
	}

	private async initwebcamPublisher() {
		const publisher = await this.openViduWebRTCService.initDefaultPublisher(undefined);
		if (publisher) {

			// this.handlePublisherSuccess(publisher);
			this.handlePublisherError(publisher);
		}
	}

	//? After test in Chrome and Firefox, the devices always have labels.
	//? It's not longer needed
	// private handlePublisherSuccess(publisher: Publisher) {
	// 	publisher.once('accessAllowed', async () => {
	// 		if (this.deviceSrv.areEmptyLabels()) {
	// 			await this.deviceSrv.forceUpdate();
	// 			if (this.hasAudioDevices) {
	// 				const audioLabel = publisher?.stream?.getMediaStream()?.getAudioTracks()[0]?.label;
	// 				this.deviceSrv.setMicSelected(audioLabel);
	// 			}

	// 			if (this.hasVideoDevices) {
	// 				const videoLabel = publisher?.stream?.getMediaStream()?.getVideoTracks()[0]?.label;
	// 				this.deviceSrv.setCameraSelected(videoLabel);
	// 			}
	// 			this.setDevicesInfo();
	// 		}
	// 	});
	// }

	private handlePublisherError(publisher: Publisher) {
		publisher.once('accessDenied', (e: any) => {
			let message: string;
			if (e.name === OpenViduErrorName.DEVICE_ALREADY_IN_USE) {
				this.log.w('Video device already in use. Disabling video device...');
				// Allow access to the room with only mic if camera device is already in use
				this.hasVideoDevices = false;
				this.deviceSrv.disableVideoDevices();
				return this.initwebcamPublisher();
			}
			if (e.name === OpenViduErrorName.DEVICE_ACCESS_DENIED) {
				message = 'Access to media devices was not allowed.';
				this.hasVideoDevices = false;
				this.hasAudioDevices = false;
				this.deviceSrv.disableVideoDevices();
				this.deviceSrv.disableAudioDevices();
				return this.initwebcamPublisher();
			} else if (e.name === OpenViduErrorName.NO_INPUT_SOURCE_SET) {
				message = 'No video or audio devices have been found. Please, connect at least one.';
			}
			this.actionService.openDialog(e.name.replace(/_/g, ' '), message, true);
			this.log.e(e.message);
		});
	}

	private generateRandomNickname(): string {
		return 'OpenVidu_User' + Math.floor(Math.random() * 100);
	}
}
