import { Component } from '@angular/core';
import { TokenModel } from 'openvidu-angular';
import { RestService } from 'src/app/services/rest.service';

@Component({
	selector: 'app-stream-directive',
	styles: [
		`
			p {
				position: absolute;
				bottom: 0;
				border: 2px solid;
				background: #000000;
			}
		`
	],
	template: `
		<ov-videoconference (onJoinButtonClicked)="onJoinButtonClicked()" [tokens]="tokens">
			<div *ovStream="let stream">
				<ov-stream [stream]="stream" [displayParticipantName]="false"></ov-stream>
				<p>{{ stream.participant.nickname }}</p>
			</div>
		</ov-videoconference>
	`
})
export class StreamDirectiveComponent {
	tokens: TokenModel;
	sessionId = 'toolbar-directive-example';
	OPENVIDU_URL = 'https://localhost:4443';
	OPENVIDU_SECRET = 'MY_SECRET';

	constructor(private restService: RestService) {}

	async onJoinButtonClicked() {
		this.tokens = {
			webcam: await this.restService.getToken(this.sessionId, this.OPENVIDU_URL, this.OPENVIDU_SECRET),
			screen: await this.restService.getToken(this.sessionId, this.OPENVIDU_URL, this.OPENVIDU_SECRET)
		};
	}
}
