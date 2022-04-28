import { Component, OnInit } from '@angular/core';
import { TokenModel } from 'dist/openvidu-angular/public-api';
import { RestService } from '../services/rest.service';

@Component({
	selector: 'app-call',
	templateUrl: './call.component.html',
	styleUrls: ['./call.component.scss']
})
export class CallComponent implements OnInit {
	value = true;
	sessionId = 'daily-call';
	OPENVIDU_URL = 'https://localhost:4443';
	OPENVIDU_SECRET = 'MY_SECRET';
	tokens: TokenModel;

	joinSessionClicked: boolean = false;
	closeClicked: boolean = false;
	isSessionAlive: boolean = false;

	constructor(private restService: RestService) {}

	async ngOnInit() {
		this.tokens = {
			webcam: await this.restService.getToken(this.sessionId, this.OPENVIDU_URL, this.OPENVIDU_SECRET),
			screen: await this.restService.getToken(this.sessionId, this.OPENVIDU_URL, this.OPENVIDU_SECRET)
		};

		console.log(this.tokens)

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
}
