import { Component, OnInit } from '@angular/core';
import { OpenViduService, ParticipantService, TokenModel } from 'openvidu-angular';
import { RestService } from 'src/app/services/rest.service';

@Component({
	selector: 'app-toolbar-directive',
	template: `
		<ov-videoconference (onJoinButtonClicked)="onJoinButtonClicked()" [tokens]="tokens">
			<div *ovToolbar style="text-align: center;">
				<button (click)="toggleVideo()">Mute Video</button>
				<button>Mute Audio</button>
			</div>
		</ov-videoconference>
	`
})
export class ToolbarDirectiveComponent implements OnInit {
	tokens: TokenModel;
	sessionId = 'toolbar-directive-example';
	OPENVIDU_URL = 'https://localhost:4443';
	OPENVIDU_SECRET = 'MY_SECRET';
	constructor(
		private restService: RestService,
		private participantService: ParticipantService,
		private openviduService: OpenViduService
	) {}

	ngOnInit(): void {}

	async onJoinButtonClicked() {
		this.tokens = {
			webcam: await this.restService.getToken(this.sessionId, this.OPENVIDU_URL, this.OPENVIDU_SECRET),
			screen: await this.restService.getToken(this.sessionId, this.OPENVIDU_URL, this.OPENVIDU_SECRET)
		};
	}

	toggleVideo() {
		const publishVideo = !this.participantService.hasCameraVideoActive();
		// this.openviduService.publishVideo(this.participantService.getMyCameraPublisher(), publishVideo);
	}
}
