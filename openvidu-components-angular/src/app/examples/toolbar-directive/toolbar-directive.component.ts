import { Component, OnInit } from '@angular/core';
import { OpenViduService, TokenModel } from 'openvidu-angular';
import { RestService } from 'src/app/services/rest.service';

@Component({
	selector: 'app-toolbar-directive',
	template: `
		<ov-videoconference (onJoinButtonClicked)="onJoinButtonClicked()" [tokens]="tokens">
			<div *ovToolbar style="text-align: center;">
				<button (click)="toggleVideo()">Toggle Video</button>
				<button (click)="toggleAudio()">Toggle Audio</button>
			</div>
		</ov-videoconference>
	`
})
export class ToolbarDirectiveComponent implements OnInit {
	tokens: TokenModel;
	sessionId = 'toolbar-directive-example';
	OPENVIDU_URL = 'https://localhost:4443';
	OPENVIDU_SECRET = 'MY_SECRET';
	publishVideo = true;
	publishAudio = true;
	constructor(private restService: RestService, private openviduService: OpenViduService) { }

	ngOnInit(): void { }

	async onJoinButtonClicked() {
		this.tokens = {
			webcam: await this.restService.getToken(this.sessionId, this.OPENVIDU_URL, this.OPENVIDU_SECRET),
			screen: await this.restService.getToken(this.sessionId, this.OPENVIDU_URL, this.OPENVIDU_SECRET)
		};
	}

	async toggleVideo(): Promise<void> {
		this.publishVideo = !this.publishVideo;
		await this.openviduService.publishVideo(this.publishVideo);
	}

	async toggleAudio(): Promise<void> {
		this.publishAudio = !this.publishAudio;
		await this.openviduService.publishAudio(this.publishAudio);
	}
}
