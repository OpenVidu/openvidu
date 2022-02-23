import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';

import { OpenViduErrorName } from 'openvidu-browser/lib/OpenViduInternal/Enums/OpenViduError';
import { Publisher, PublisherProperties } from 'openvidu-browser';

import { ILogger } from '../../models/logger.model';
import { CustomDevice } from '../../models/device.model';
import { ScreenType, VideoType } from '../../models/video-type.model';

import { NicknameMatcher } from '../../matchers/nickname.matcher';

import { DeviceService } from '../../services/device/device.service';
import { LoggerService } from '../../services/logger/logger.service';
import { StorageService } from '../../services/storage/storage.service';
import { OpenViduService } from '../../services/openvidu/openvidu.service';
import { ActionService } from '../../services/action/action.service';
import { ParticipantService } from '../../services/participant/participant.service';
import { ParticipantAbstractModel } from '../../models/participant.model';

@Component({
	selector: 'ov-user-settings',
	templateUrl: './user-settings.component.html',
	styleUrls: ['./user-settings.component.css'],
	// changeDetection: ChangeDetectionStrategy.OnPush
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
	isVideoMuted: boolean;
	isAudioMuted: boolean;
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
		private openviduService: OpenViduService,
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
		await this.deviceSrv.initializeDevices();

		this.subscribeToLocalParticipantEvents();
		this.openviduService.initialize();
		const nickname = this.storageSrv.getNickname() || this.generateRandomNickname();
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
		// Is New deviceId different from the old one?
		if (this.deviceSrv.needUpdateVideoTrack(videoSource)) {
			const mirror = this.deviceSrv.cameraNeedsMirror(videoSource);
			const pp: PublisherProperties = { videoSource, audioSource: false, mirror };

			await this.openviduService.replaceTrack(VideoType.CAMERA, pp);
			this.cameraSelected = videoSource;
			this.deviceSrv.setCameraSelected(this.cameraSelected);
		}
		if (this.isVideoMuted) {
			// Publish Webcam video
			this.openviduService.publishVideo(this.participantService.getMyCameraPublisher(), true);
			this.isVideoMuted = false;
		}
	}

	async onMicrophoneSelected(event: any) {
		const audioSource = event?.value;
		// Is New deviceId different than older?
		if (this.deviceSrv.needUpdateAudioTrack(audioSource)) {
			const pp: PublisherProperties = { audioSource, videoSource: false };
			await this.openviduService.replaceTrack(VideoType.CAMERA, pp);
			this.microphoneSelected = audioSource;
			this.deviceSrv.setMicSelected(this.microphoneSelected);
		}
		if (this.isAudioMuted) {
			// Enable microphone
			this.openviduService.publishAudio(this.participantService.getMyCameraPublisher(), true);
			this.isAudioMuted = true;
		}
	}

	toggleCam() {

		const publish = this.isVideoMuted;
		this.openviduService.publishVideo(this.participantService.getMyCameraPublisher(), publish);

		if (this.participantService.areBothEnabled()) {
			// Cam will not published, disable webcam with screensharing active
			this.participantService.disableWebcamUser();
			this.openviduService.publishAudio(this.participantService.getMyScreenPublisher(), publish);
		} else if (this.participantService.isOnlyMyScreenEnabled()) {
			// Cam will be published, enable webcam
			this.participantService.enableWebcamUser();
		}

		this.isVideoMuted = !this.isVideoMuted;
		this.storageSrv.setVideoMuted(this.isVideoMuted);
	}

	async toggleScreenShare() {
		// Disabling screenShare
		if (this.participantService.areBothEnabled()) {
			this.participantService.disableScreenUser();
			return;
		}

		// Enabling screenShare
		if (this.participantService.isOnlyMyCameraEnabled()) {
			const willThereBeWebcam = this.participantService.isMyCameraEnabled() && this.participantService.hasCameraVideoActive();
			const hasAudio = willThereBeWebcam ? false : this.hasAudioDevices && this.isAudioMuted;
			const properties: PublisherProperties = {
				videoSource: ScreenType.SCREEN,
				audioSource: this.hasAudioDevices ? undefined : null,
				publishVideo: true,
				publishAudio: hasAudio,
				mirror: false
			};
			const screenPublisher = await this.openviduService.initPublisher(undefined, properties);

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
		const publish = this.isAudioMuted;
		this.openviduService.publishAudio(this.participantService.getMyCameraPublisher(), publish);
		this.isAudioMuted = !this.isAudioMuted;
		this.storageSrv.setAudioMuted(this.isAudioMuted);
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
			this.storageSrv.setNickname(nickname);
			this.participantService.updateParticipantMediaStatus();
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

		this.isVideoMuted = this.deviceSrv.isVideoMuted();
		this.isAudioMuted = this.deviceSrv.isAudioMuted();
	}

	private scrollToBottom(): void {
		try {
			this.bodyCard.nativeElement.scrollTop = this.bodyCard.nativeElement.scrollHeight;
		} catch (err) {}
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
		const publisher = await this.openviduService.initDefaultPublisher(undefined);
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
