import { Component, OnInit } from '@angular/core';
import {
	BroadcastingStartRequestedEvent,
	BroadcastingStopRequestedEvent,
	RecordingDeleteRequestedEvent,
	RecordingStartRequestedEvent,
	RecordingStopRequestedEvent,
	Room,
	RoomEvent
} from 'openvidu-components-angular';
import { RestService } from '../services/rest.service';
import { CustomDevice } from 'dist/openvidu-components-angular/lib/models/device.model';
import { LangOption } from 'dist/openvidu-components-angular/lib/models/lang.model';
import { ActivatedRoute, Router } from '@angular/router';
import { ParticipantLeftEvent } from '../../../projects/openvidu-components-angular/src/lib/models/participant.model';

@Component({
	selector: 'app-call',
	templateUrl: './call.component.html',
	styleUrls: ['./call.component.scss'],
	standalone: false
})
export class CallComponent implements OnInit {
	roomName = 'daily-call';
	token: string;
	tokenError: string | undefined;
	isSessionAlive: boolean = false;
	configReady: boolean = false;

	minimal: boolean = false;
	lang: string = 'es';
	langOptions: LangOption[] = [
		{ name: 'Spanish', lang: 'es' },
		{ name: 'custom', lang: 'cus' }
	];
	prejoin: boolean = true;
	prejoinDisplayParticipantName: boolean = true;
	participantName: string = `Participant${Math.floor(Math.random() * 1000)}`;
	videoEnabled: boolean = true;
	audioEnabled: boolean = true;
	toolbarCameraButton: boolean = true;
	toolbarMicrophoneButton: boolean = true;
	toolbarScreenshareButton: boolean = true;
	toolbarFullscreenButton: boolean = true;
	toolbarRecordingButton: boolean = true;
	toolbarBroadcastingButton: boolean = true;
	toolbarActivitiesPanelButton: boolean = true;
	toolbarBackgroundEffectsButton: boolean = true;
	toolbarLeaveButton: boolean = true;
	toolbarChatPanelButton: boolean = true;
	toolbarParticipantsPanelButton: boolean = true;
	toolbarDisplayLogo: boolean = true;
	toolbarDisplayRoomName: boolean = true;
	streamDisplayParticipantName: boolean = true;
	streamDisplayAudioDetection: boolean = true;
	streamVideoControls: boolean = true;
	participantPanelItemMuteButton: boolean = true;
	activitiesPanelRecordingActivity: boolean = true;
	activitiesPanelBroadcastingActivity: boolean = true;
	toolbarSettingsButton: boolean = true;

	private staticVideos = [
		'https://videos.pexels.com/video-files/4089575/4089575-hd_1280_720_50fps.mp4',
		'https://videos.pexels.com/video-files/8375762/8375762-hd_1080_2048_25fps.mp4',
		'https://videos.pexels.com/video-files/4994156/4994156-hd_1080_1920_25fps.mp4',
		'https://videos.pexels.com/video-files/5752499/5752499-hd_1080_1920_25fps.mp4',
		'https://videos.pexels.com/video-files/6012390/6012390-hd_1080_1920_25fps.mp4',
		'https://videos.pexels.com/video-files/6388880/6388880-hd_1080_1920_25fps.mp4',
		'https://videos.pexels.com/video-files/5956873/5956873-hd_1080_1920_25fps.mp4',
		'https://videos.pexels.com/video-files/5384955/5384955-hd_1080_1920_25fps.mp4',
		'https://videos.pexels.com/video-files/5199626/5199626-hd_1280_720_25fps.mp4',
		'https://videos.pexels.com/video-files/5638228/5638228-hd_1080_1920_25fps.mp4',
		'https://videos.pexels.com/video-files/5647316/5647316-hd_1080_1920_25fps.mp4',
		'https://videos.pexels.com/video-files/5992459/5992459-hd_1080_1920_25fps.mp4',
		'https://videos.pexels.com/video-files/5438937/5438937-hd_1080_1920_25fps.mp4',
		'https://videos.pexels.com/video-files/5586701/5586701-hd_1080_1920_25fps.mp4',
		'https://videos.pexels.com/video-files/8375616/8375616-hd_1080_2048_25fps.mp4',
		'https://videos.pexels.com/video-files/5087894/5087894-hd_1080_1920_25fps.mp4',
		'https://videos.pexels.com/video-files/9569674/9569674-hd_1080_2048_25fps.mp4'
	];

	private areStaticVideosEnabled = false;

	constructor(
		private restService: RestService,
		private router: Router,
		private activatedRoute: ActivatedRoute
	) {}

	async ngOnInit() {
		this.activatedRoute.queryParams.subscribe((params) => {
			if (params['roomName']) this.roomName = params['roomName'];
			// if (params['token']) this.token = params['token'];
			if (params['minimal'] !== undefined) this.minimal = params['minimal'] === 'true';
			if (params['lang']) this.lang = params['lang'];
			if (params['langOptions'] === 'true') {
				try {
					this.langOptions = [
						{ name: 'Esp', lang: 'es' },
						{ name: 'Eng', lang: 'en' }
					];
				} catch {}
			}
			if (params['prejoin'] !== undefined) this.prejoin = params['prejoin'] === 'true';
			if (params['displayParticipantName'] !== undefined)
				this.prejoinDisplayParticipantName = params['displayParticipantName'] === 'true';
			if (params['participantName']) this.participantName = params['participantName'];
			if (params['videoEnabled'] !== undefined) this.videoEnabled = params['videoEnabled'] === 'true';
			if (params['audioEnabled'] !== undefined) this.audioEnabled = params['audioEnabled'] === 'true';
			if (params['cameraBtn'] !== undefined) this.toolbarCameraButton = params['cameraBtn'] === 'true';
			if (params['toolbarMicrophoneButton'] !== undefined)
				this.toolbarMicrophoneButton = params['toolbarMicrophoneButton'] === 'true';
			if (params['screenshareBtn'] !== undefined)
				this.toolbarScreenshareButton = params['screenshareBtn'] === 'true';
			if (params['fullscreenBtn'] !== undefined) this.toolbarFullscreenButton = params['fullscreenBtn'] === 'true';
			if (params['toolbarRecordingButton'] !== undefined) this.toolbarRecordingButton = params['toolbarRecordingButton'] === 'true';
			if (params['toolbarBroadcastingButton'] !== undefined)
				this.toolbarBroadcastingButton = params['toolbarBroadcastingButton'] === 'true';
			if (params['toolbarBackgroundEffectsButton'] !== undefined)
				this.toolbarBackgroundEffectsButton = params['toolbarBackgroundEffectsButton'] === 'true';
			if (params['activitiesPanelBtn'] !== undefined) this.toolbarActivitiesPanelButton = params['activitiesPanelBtn'] === 'true';
			if (params['leaveBtn'] !== undefined) this.toolbarLeaveButton = params['leaveBtn'] === 'true';
			if (params['chatPanelBtn'] !== undefined) this.toolbarChatPanelButton = params['chatPanelBtn'] === 'true';
			if (params['participantsPanelBtn'] !== undefined)
				this.toolbarParticipantsPanelButton = params['participantsPanelBtn'] === 'true';
			if (params['displayLogo'] !== undefined) this.toolbarDisplayLogo = params['displayLogo'] === 'true';
			if (params['displayRoomName'] !== undefined) this.toolbarDisplayRoomName = params['displayRoomName'] === 'true';
			if (params['displayParticipantName'] !== undefined)
				this.streamDisplayParticipantName = params['displayParticipantName'] === 'true';
			if (params['displayAudioDetection'] !== undefined)
				this.streamDisplayAudioDetection = params['displayAudioDetection'] === 'true';
			if (params['streamVideoControls'] !== undefined) this.streamVideoControls = params['streamVideoControls'] === 'true';
			if (params['participantMuteBtn'] !== undefined)
				this.participantPanelItemMuteButton = params['participantMuteBtn'] === 'true';
			if (params['activitiesPanelRecordingActivity'] !== undefined)
				this.activitiesPanelRecordingActivity = params['activitiesPanelRecordingActivity'] === 'true';
			if (params['activitiesPanelBroadcastingActivity'] !== undefined)
				this.activitiesPanelBroadcastingActivity = params['activitiesPanelBroadcastingActivity'] === 'true';
			if (params['toolbarSettingsBtn'] !== undefined) this.toolbarSettingsButton = params['toolbarSettingsBtn'] === 'true';
			if (params['staticVideos'] !== undefined) this.areStaticVideosEnabled = params['staticVideos'] === 'true';

			this.configReady = true;
		});
		if (this.areStaticVideosEnabled) {
			setTimeout(() => {
				const videoElements = document.querySelectorAll('video');
				this.replaceWithStaticVideos(videoElements);
			}, 3000);
		}
	}

	async onTokenRequested(participantName: string) {
		console.warn('VC TOKEN REQUESTED', participantName);
		await this.requestForTokens(participantName);
	}

	async onReadyToJoin() {
		console.warn('VC IS READY TO JOIN');
	}

	async onParticipantLeft(event: ParticipantLeftEvent) {
		console.warn('VC PARTICIPANT LEFT', event);
		await this.router.navigate(['/']);
	}

	onRoomCreated(room: Room) {
		console.warn('VC ROOM CREATED', room.name);
		room.on(RoomEvent.Connected, () => {
			if (this.areStaticVideosEnabled) {
				setTimeout(() => {
					const videoElements = document.querySelectorAll('video');
					this.replaceWithStaticVideos(videoElements);
				}, 3000);
			}
		});

		room.on(RoomEvent.TrackPublished, (publication, participant) => {
			participant.videoTrackPublications.forEach((publication) => {
				if (this.areStaticVideosEnabled) {
					setTimeout(() => {
						if (publication.videoTrack?.attachedElements) {
							this.replaceWithStaticVideos(publication.videoTrack?.attachedElements);
							const firstVideo = this.staticVideos.shift();
							this.staticVideos.push(firstVideo);
						}
					}, 2000);
				}
			});
		});
	}

	onVideoEnabledChanged(value: boolean) {
		console.warn('VC video enabled: ', value);
	}
	onVideoDeviceChanged(device: CustomDevice) {
		console.warn('VC video device changed: ', device);
	}
	onAudioEnabledChanged(value: boolean) {
		console.warn('VC audio enabled: ', value);
	}
	onAudioDeviceChanged(device: CustomDevice) {
		console.warn('VC audio device changed: ', device);
	}
	onScreenShareEnabledChanged(enabled: boolean) {
		console.warn('VC screenshare enabled: ', enabled);
	}
	onFullscreenEnabledChanged(enabled: boolean) {
		console.warn('VC fullscreen enabled: ', enabled);
	}
	onParticipantsPanelStatusChanged(event) {
		console.warn('VC participants panel status changed: ', event);
	}
	onChatPanelStatusChanged(event) {
		console.warn('VC chat status changed: ', event);
	}

	async onRoomDisconnected() {
		this.isSessionAlive = false;
		console.log('VC LEAVE BUTTON CLICKED');
		await this.router.navigate(['/']);
	}

	onFullscreenButtonClicked() {
		console.warn('TOOLBAR fullscreen CLICKED');
	}
	onParticipantsPanelButtonClicked() {
		console.warn('TOOLBAR participants CLICKED');
	}
	onChatPanelButtonClicked() {
		console.warn('TOOLBAR chat CLICKED');
	}

	onLeaveButtonClicked() {
		this.isSessionAlive = false;
		console.log('TOOLBAR LEAVE CLICKED');
	}

	onLangChanged(event: LangOption) {
		console.warn('LANG CHANGED', event);
	}

	async onBroadcastingStartRequested(event: BroadcastingStartRequestedEvent) {
		console.log('START STREAMING', event);
		try {
			const resp = await this.restService.startBroadcasting(event.broadcastUrl);
			console.log('Broadcasting response ', resp);
		} catch (error) {
			console.error(error);
		}
	}

	async onBroadcastingStopRequested(event: BroadcastingStopRequestedEvent) {
		console.log('STOP STREAMING', event);
		try {
			const resp = await this.restService.stopBroadcasting();
			console.log('Broadcasting response ', resp);
		} catch (error) {
			console.error(error);
		}
	}

	async onRecordingStartRequested(event: RecordingStartRequestedEvent) {
		console.warn('START RECORDING CLICKED', event);
		try {
			await this.restService.startRecording(this.roomName);
		} catch (error) {
			console.error(error);
		}
	}
	async onRecordingStopRequested(event: RecordingStopRequestedEvent) {
		console.warn('STOP RECORDING CLICKED', event);
		try {
			await this.restService.stopRecording(event);
		} catch (error) {
			console.error(error);
		}
	}

	async onRecordingDeleteRequested(event: RecordingDeleteRequestedEvent) {
		console.warn('DELETE RECORDING requested', event);

		try {
			await this.restService.deleteRecording(event);
		} catch (error) {
			console.error(error);
		}
	}

	private async requestForTokens(participantName: string) {
		try {
			const { token } = await this.restService.getTokenFromBackend(this.roomName, participantName);
			this.token = token;
		} catch (error) {
			console.error(error);
			this.tokenError = error.error;
		}
	}

	private replaceWithStaticVideos(videoElements) {
		let sourceIndex = 0;
		for (let i = 0; i < videoElements.length; i++) {
			const videoElement = videoElements[i];
			videoElement.srcObject = null;
			videoElement.src = this.staticVideos[sourceIndex];
			console.log(`Assigned ${this.staticVideos[sourceIndex]}`);
			sourceIndex = (sourceIndex + 1) % this.staticVideos.length;
			videoElement.addEventListener('ended', () => {
				// Allow loop
				videoElement.currentTime = 0;
				videoElement.play();
			});
		}
	}
}
