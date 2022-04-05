import { Component, OnInit } from '@angular/core';
import { TokenModel } from 'openvidu-angular';
import { RestService } from 'src/app/services/rest.service';

@Component({
	selector: 'app-panel-directive',
	template: `
		<ov-videoconference (onJoinButtonClicked)="onJoinButtonClicked()" [tokens]="tokens">
			<div *ovPanel>
				<div>HOLA?</div>
				<div *ovChatPanel>
					<ov-chat-panel></ov-chat-panel>
				</div>
			</div>
		</ov-videoconference>
	`
})
export class PanelDirectiveComponent implements OnInit {
	tokens: TokenModel;
	sessionId = 'panel-directive-example';
	OPENVIDU_URL = 'https://localhost:4443';
	OPENVIDU_SECRET = 'MY_SECRET';
	constructor(private restService: RestService) {}

	async onJoinButtonClicked() {
		this.tokens = {
			webcam: await this.restService.getToken(this.sessionId, this.OPENVIDU_URL, this.OPENVIDU_SECRET),
			screen: await this.restService.getToken(this.sessionId, this.OPENVIDU_URL, this.OPENVIDU_SECRET)
		};
	}

	ngOnInit(): void {}
}
