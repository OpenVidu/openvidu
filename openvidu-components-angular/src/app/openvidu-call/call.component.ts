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
			this.areStaticVideosEnabled = params['staticVideos'] === 'true';
			console.log('Static videos enabled: ', this.areStaticVideosEnabled);
		});
		if (this.areStaticVideosEnabled) {
			setTimeout(() => {
				const videoElements = document.querySelectorAll('video');
				this.replaceWithStaticVideos(videoElements);
			}, 3000);
		}
	}

	async onTokenRequested(participantName: string) {
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
