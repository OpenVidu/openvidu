import { Component } from '@angular/core';
import { TokenModel } from 'openvidu-angular';
import { RestService } from 'src/app/services/rest.service';

@Component({
	selector: 'app-toolbarAdditionalButtons-directive',
	template: `
		<ov-videoconference (onJoinButtonClicked)="onJoinButtonClicked()" [tokens]="tokens" [toolbarDisplaySessionName]="false">
			<div *ovToolbarAdditionalPanelButtons style="text-align: center;">
				<button>MY PANEL</button>
			</div>
		</ov-videoconference>
	`
})
export class ToolbarAdditionalPanelButtonsDirectiveComponent {
	tokens: TokenModel;
	sessionId = 'toolbar-additionalPanelbtn';
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
