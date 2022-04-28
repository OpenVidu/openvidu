import { Component, OnInit } from '@angular/core';
import { TokenModel } from 'openvidu-angular';
import { RestService } from 'src/app/services/rest.service';

@Component({
	selector: 'app-panel-directive',
	template: `
		<ov-videoconference (onJoinButtonClicked)="onJoinButtonClicked()" [tokens]="tokens">
			<ov-panel *ovPanel>
				<div *ovChatPanel id="my-chat-panel">This is my custom chat panel</div>
				<div *ovParticipantsPanel id="my-participants-panel">This is my custom participants panel</div>
			</ov-panel>
		</ov-videoconference>
	`,
	styles: [
		`
			#my-chat-panel, #my-participants-panel {
				text-align: center;
				height: calc(100% - 40px);
				margin: 20px;
			}
			#my-chat-panel {
				background: #c9ffb2;
			}
			#my-participants-panel {
				background: #ddf2ff;
			}
		`
	]
})
export class PanelDirectiveComponent {
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
}
