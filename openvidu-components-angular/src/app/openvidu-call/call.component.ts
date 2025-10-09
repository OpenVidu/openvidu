import { Component, OnInit } from '@angular/core';
import {
	BroadcastingStartRequestedEvent,
	BroadcastingStopRequestedEvent,
	RecordingDeleteRequestedEvent,
	RecordingStartRequestedEvent,
	RecordingStopRequestedEvent,
	Room,
	RoomEvent,
	CustomDevice,
	LangOption,
	ParticipantLeftEvent,
	ParticipantModel
} from 'openvidu-components-angular';
import { RestService } from '../services/rest.service';
import { ActivatedRoute, Router } from '@angular/router';
import { monkeyPatchMediaDevices } from '../utils/media-devices';

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
	fakeDevices: boolean = false;
	// Internal directive inputs (public for E2E)

	prejoinDisplayParticipantName: boolean = true;

	public recordingActivityViewRecordingsButton: boolean = false;
	public recordingActivityStartStopRecordingButton: boolean = true;
	toolbarViewRecordingsButton: boolean = false;
	private redirectToHomeOnLeaves: boolean = true;
	private showThemeSelector: boolean = false;

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
			if (params['participantName']) this.participantName = params['participantName'];
			if (params['videoEnabled'] !== undefined) this.videoEnabled = params['videoEnabled'] === 'true';
			if (params['audioEnabled'] !== undefined) this.audioEnabled = params['audioEnabled'] === 'true';
			if (params['cameraBtn'] !== undefined) this.toolbarCameraButton = params['cameraBtn'] === 'true';
			if (params['toolbarMicrophoneButton'] !== undefined)
				this.toolbarMicrophoneButton = params['toolbarMicrophoneButton'] === 'true';
			if (params['screenshareBtn'] !== undefined) this.toolbarScreenshareButton = params['screenshareBtn'] === 'true';
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
			if (params['participantMuteBtn'] !== undefined) this.participantPanelItemMuteButton = params['participantMuteBtn'] === 'true';
			if (params['activitiesPanelRecordingActivity'] !== undefined)
				this.activitiesPanelRecordingActivity = params['activitiesPanelRecordingActivity'] === 'true';
			if (params['activitiesPanelBroadcastingActivity'] !== undefined)
				this.activitiesPanelBroadcastingActivity = params['activitiesPanelBroadcastingActivity'] === 'true';
			if (params['toolbarSettingsBtn'] !== undefined) this.toolbarSettingsButton = params['toolbarSettingsBtn'] === 'true';
			if (params['staticVideos'] !== undefined) this.areStaticVideosEnabled = params['staticVideos'] === 'true';

			if (params['fakeDevices'] !== undefined) this.fakeDevices = params['fakeDevices'] === 'true';

			// Internal/private directive params
			if (params['prejoinDisplayParticipantName'] !== undefined)
				this.prejoinDisplayParticipantName = params['prejoinDisplayParticipantName'] === 'true';
			if (params['recordingActivityViewRecordingsButton'] !== undefined)
				this.recordingActivityViewRecordingsButton = params['recordingActivityViewRecordingsButton'] === 'true';
			if (params['recordingActivityStartStopRecordingButton'] !== undefined)
				this.recordingActivityStartStopRecordingButton = params['recordingActivityStartStopRecordingButton'] === 'true';
			if (params['toolbarViewRecordingsButton'] !== undefined)
				this.toolbarViewRecordingsButton = params['toolbarViewRecordingsButton'] === 'true';
			if (params['redirectToHome'] === undefined) {
				this.redirectToHomeOnLeaves = true;
			} else {
				this.redirectToHomeOnLeaves = params['redirectToHome'] === 'true';
			}
			if (params['showThemeSelector'] !== undefined) this.showThemeSelector = params['showThemeSelector'] === 'true';
			this.configReady = true;

			if (this.areStaticVideosEnabled) {
				setTimeout(() => {
					const videoElements = document.querySelectorAll('video');
					this.replaceWithStaticVideos(videoElements);
				}, 3000);
			}

			if (this.fakeDevices) {
				console.warn('Using fake devices');
				monkeyPatchMediaDevices();
			}
		});
	}

	async onTokenRequested(participantName: string) {
		console.warn('VC TOKEN REQUESTED', participantName);
		this.appendElement('onTokenRequested');
		await this.requestForTokens(participantName);
	}

	async onReadyToJoin() {
		this.appendElement('onReadyToJoin');
		console.warn('VC IS READY TO JOIN');
	}

	async onParticipantLeft(event: ParticipantLeftEvent) {
		console.warn('VC PARTICIPANT LEFT', event);
		this.appendElement('onParticipantLeft');
		this.handleDisconnect();
	}

	onRoomCreated(room: Room) {
		this.appendElement('onRoomCreated');
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
							if (firstVideo) {
								this.staticVideos.push(firstVideo);
							}
						}
					}, 2000);
				}
			});
		});
	}

	onParticipantCreated(event: ParticipantModel) {
		this.appendElement(event.name + '-onParticipantCreated');
		console.warn('VC PARTICIPANT CREATED', event);
	}

	onVideoEnabledChanged(value: boolean) {
		this.appendElement('onVideoEnabledChanged-' + value);
		console.warn('VC video enabled: ', value);
	}
	onVideoDeviceChanged(device: CustomDevice) {
		this.appendElement('onVideoDeviceChanged');
		console.warn('VC video device changed: ', device);
	}
	onAudioEnabledChanged(value: boolean) {
		this.appendElement('onAudioEnabledChanged-' + value);
		console.warn('VC audio enabled: ', value);
	}
	onAudioDeviceChanged(device: CustomDevice) {
		this.appendElement('onAudioDeviceChanged');
		console.warn('VC audio device changed: ', device);
	}
	onScreenShareEnabledChanged(enabled: boolean) {
		this.appendElement('onScreenShareEnabledChanged');
		console.warn('VC screenshare enabled: ', enabled);
	}
	onFullscreenEnabledChanged(enabled: boolean) {
		this.appendElement('onFullscreenEnabledChanged-' + enabled);
		console.warn('VC fullscreen enabled: ', enabled);
	}
	onParticipantsPanelStatusChanged(event) {
		this.appendElement('onParticipantsPanelStatusChanged-' + event.isOpened);
		console.warn('VC participants panel status changed: ', event);
	}
	onChatPanelStatusChanged(event) {
		this.appendElement('onChatPanelStatusChanged-' + event.isOpened);
		console.warn('VC chat status changed: ', event);
	}

	/**
	 * @deprecated
	 */
	async onRoomDisconnected() {
		this.appendElement('onRoomDisconnected');
		console.log('VC LEAVE BUTTON CLICKED');
		this.handleDisconnect();
	}

	onFullscreenButtonClicked() {
		this.appendElement('onFullscreenButtonClicked');
		console.warn('TOOLBAR fullscreen CLICKED');
	}
	onParticipantsPanelButtonClicked() {
		this.appendElement('onParticipantsPanelButtonClicked');
		console.warn('TOOLBAR participants CLICKED');
	}
	onChatPanelButtonClicked() {
		this.appendElement('onChatPanelButtonClicked');
		console.warn('TOOLBAR chat CLICKED');
	}

	onLeaveButtonClicked() {
		this.appendElement('onLeaveButtonClicked');
		this.isSessionAlive = false;
		console.log('TOOLBAR LEAVE CLICKED');
	}

	onLangChanged(event: LangOption) {
		this.appendElement('onLangChanged-' + event.lang);
		console.warn('LANG CHANGED', event);
	}
	onSettingsPanelStatusChanged(event) {
		this.appendElement('onSettingsPanelStatusChanged-' + event.isOpened);
		console.warn('VC settings panel status changed: ', event);
	}

	onActivitiesPanelStatusChanged(event) {
		this.appendElement('onActivitiesPanelStatusChanged-' + event.isOpened);
		console.warn('VC activities panel status changed: ', event);
	}

	async onBroadcastingStartRequested(event: BroadcastingStartRequestedEvent) {
		this.appendElement(`onBroadcastingStartRequested-${event.roomName}-${event.broadcastUrl}`);
		console.log('START STREAMING', event);
		try {
			const resp = await this.restService.startBroadcasting(event.broadcastUrl);
			console.log('Broadcasting response ', resp);
		} catch (error) {
			console.error(error);
		}
	}
	async onBroadcastingStopRequested(event: BroadcastingStopRequestedEvent) {
		this.appendElement('onBroadcastingStopRequested');
		console.log('STOP STREAMING', event);
		try {
			const resp = await this.restService.stopBroadcasting();
			console.log('Broadcasting response ', resp);
		} catch (error) {
			console.error(error);
		}
	}

	async onRecordingStartRequested(event: RecordingStartRequestedEvent) {
		this.appendElement('onRecordingStartRequested-' + event.roomName);
		console.warn('START RECORDING CLICKED', event);
		try {
			await this.restService.startRecording(this.roomName);
		} catch (error) {
			console.error(error);
		}
	}
	async onRecordingStopRequested(event: RecordingStopRequestedEvent) {
		this.appendElement('onRecordingStopRequested-' + event.roomName);

		console.warn('STOP RECORDING CLICKED', event);
		try {
			await this.restService.stopRecording(event);
		} catch (error) {
			console.error(error);
		}
	}

	async onRecordingDeleteRequested(event: RecordingDeleteRequestedEvent) {
		this.appendElement('onRecordingDeleteRequested');
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

	private async handleDisconnect() {
		this.configReady = false;
		this.isSessionAlive = false;
		if (this.redirectToHomeOnLeaves) await this.router.navigate(['/']);
	}

	private appendElement(id: string) {
		const eventsDiv = document.getElementById('events');
		if (!eventsDiv) {
			console.error('No events div found');
			return;
		}

		eventsDiv.setAttribute('style', 'position: absolute;');
		const element = document.createElement('div');
		element.setAttribute('id', id);
		element.setAttribute('style', 'height: 1px;');
		eventsDiv.appendChild(element);
	}
}
