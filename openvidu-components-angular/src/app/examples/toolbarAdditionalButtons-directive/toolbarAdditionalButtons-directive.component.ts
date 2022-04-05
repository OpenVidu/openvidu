import { Component } from '@angular/core';
import { OpenViduService, ParticipantService, TokenModel } from 'openvidu-angular';
import { RestService } from 'src/app/services/rest.service';

@Component({
	selector: 'app-toolbarAdditionalButtons-directive',
	template: `
		<ov-videoconference (onJoinButtonClicked)="onJoinButtonClicked()" [tokens]="tokens" [toolbarDisplaySessionName]="false">
			<div *ovToolbarAdditionalButtons style="text-align: center;">
				<button (click)="toggleVideo()">Toggle Video</button>
				<button (click)="toggleAudio()">Toggle Audio</button>
			</div>
		</ov-videoconference>
	`
})
export class ToolbarAdditionalButtonsDirectiveComponent {
	tokens: TokenModel;
	sessionId = 'toolbar-additionalbtn-directive-example';
	OPENVIDU_URL = 'https://localhost:4443';
	OPENVIDU_SECRET = 'MY_SECRET';
	constructor(
		private restService: RestService,
		private openviduService: OpenViduService,
		private participantService: ParticipantService
	) {}

	async onJoinButtonClicked() {
		this.tokens = {
			webcam: await this.restService.getToken(this.sessionId, this.OPENVIDU_URL, this.OPENVIDU_SECRET),
			screen: await this.restService.getToken(this.sessionId, this.OPENVIDU_URL, this.OPENVIDU_SECRET)
		};
	}

	toggleVideo() {
		const publishVideo = !this.participantService.isMyVideoActive();
		this.openviduService.publishVideo(publishVideo);
	}

	toggleAudio() {
		const publishAudio = !this.participantService.isMyAudioActive();
		this.openviduService.publishAudio(publishAudio);
	}
}
