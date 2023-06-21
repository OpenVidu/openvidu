import { Component, OnInit } from '@angular/core';
import { BroadcastingService, BroadcastingStatus, RecordingInfo, RecordingService, RecordingStatus, TokenModel, LangOption } from 'openvidu-angular';
import { RestService } from '../services/rest.service';

@Component({
	selector: 'app-call',
	templateUrl: './call.component.html',
	styleUrls: ['./call.component.scss']
})
export class CallComponent implements OnInit {
	sessionId = 'daily-call';
	tokens: TokenModel;

	joinSessionClicked: boolean = false;
	closeClicked: boolean = false;
	isSessionAlive: boolean = false;
	recordingList: RecordingInfo[] = [];
	recordingError: any;
	broadcastingError: any;

	constructor(
		private restService: RestService,
		private recordingService: RecordingService,
		private broadcastingService: BroadcastingService
	) {}

	async ngOnInit() {
		await this.requestForTokens();
	}

	async onNodeCrashed() {
		// Request the tokens again for reconnect to the session
		await this.requestForTokens();
	}

	onJoinClicked() {
		console.warn('VC JOIN BUTTON CLICKED');
	}

	onToolbarCameraButtonClicked() {
		console.warn('VC camera CLICKED');
	}
	onToolbarMicrophoneButtonClicked() {
		console.warn('VC microphone CLICKED');
	}
	onToolbarScreenshareButtonClicked() {
		console.warn('VC screenshare CLICKED');
	}
	onToolbarFullscreenButtonClicked() {
		console.warn('VC fullscreen CLICKED');
	}
	onToolbarParticipantsPanelButtonClicked() {
		console.warn('VC participants CLICKED');
	}
	onToolbarChatPanelButtonClicked() {
		console.warn('VC chat CLICKED');
	}

	onToolbarLeaveButtonClicked() {
		this.isSessionAlive = false;
		console.log('VC LEAVE BUTTON CLICKED');
	}

	onCameraButtonClicked() {
		console.warn('TOOLBAR camera CLICKED');
	}
	onMicrophoneButtonClicked() {
		console.warn('TOOLBAR microphone CLICKED');
	}
	onScreenshareButtonClicked() {
		console.warn('TOOLBAR screenshare CLICKED');
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

	onLangChanged(lang: LangOption) {
		console.warn('LANG CHANGED', lang);
	}

	async onStartBroadcastingClicked(broadcastUrl: string) {
		console.log('START STREAMING', broadcastUrl);
		try {
			this.broadcastingError = null;
			const resp = await this.restService.startBroadcasting(broadcastUrl);
			console.log('Broadcasting response ', resp);
		} catch (error) {
			console.error(error);
			this.broadcastingError = error.error;
		}
	}

	async onStopBroadcastingClicked() {
		console.log('STOP STREAMING');
		try {
			this.broadcastingError = null;
			const resp = await this.restService.stopBroadcasting();
			console.log('Broadcasting response ', resp);
		} catch (error) {
			console.error(error);
			this.broadcastingError = error.message || error;
		}
	}

	async onStartRecordingClicked() {
		console.warn('START RECORDING CLICKED');
		try {
			await this.restService.startRecording(this.sessionId);
		} catch (error) {
			this.recordingError = error;
		}
	}
	async onStopRecordingClicked() {
		console.warn('STOP RECORDING CLICKED');
		try {
			this.recordingList = await this.restService.stopRecording(this.sessionId);
			console.log('RECORDING LIST ', this.recordingList);
		} catch (error) {
			console.log(await this.restService.getRecordings())
			this.recordingError = error;
		}
	}

	async onDeleteRecordingClicked(recordingId: string) {
		console.warn('DELETE RECORDING CLICKED');

		try {
			this.recordingList = await this.restService.deleteRecording(recordingId);
		} catch (error) {
			this.recordingError = error;
		}
	}

	async onForceRecordingUpdate() {
		console.warn('FORCE RECORDING UPDATE');
		this.recordingList = await this.restService.getRecordings();
	}

	private async requestForTokens() {
		const { broadcastingEnabled, recordingEnabled, recordings, cameraToken, screenToken, isRecordingActive, isBroadcastingActive } =
			await this.restService.getTokensFromBackend(this.sessionId);
		this.recordingList = recordings;
		this.tokens = {
			webcam: cameraToken,
			screen: screenToken
		};
		if (isRecordingActive) this.recordingService.updateStatus(RecordingStatus.STARTED);
		if (isBroadcastingActive) this.broadcastingService.updateStatus(BroadcastingStatus.STARTED);

		console.log('Token requested: ', this.tokens);
	}
}
