import { Component } from '@angular/core';
import { OpenViduService, TokenModel } from 'openvidu-angular';
import { RestService } from 'src/app/services/rest.service';

@Component({
	selector: 'app-participantPanelItemElements-directive',
	template: `
		<ov-videoconference (onJoinButtonClicked)="onJoinButtonClicked()" [tokens]="tokens" [toolbarDisplaySessionName]="false">
			<div *ovParticipantPanelItemElements="let participant">
				<button *ngIf="participant.local" (click)="leaveSession()">Leave</button>
			</div>
		</ov-videoconference>
	`,
	styles: [``]
})
export class ParticipantPanelItemElementsDirectiveComponent {
	tokens: TokenModel;
	sessionId = 'participants-panel-directive-example';
	OPENVIDU_URL = 'https://localhost:4443';
	OPENVIDU_SECRET = 'MY_SECRET';

	constructor(private restService: RestService, private openviduService: OpenViduService) {}

	async onJoinButtonClicked() {
		this.tokens = {
			webcam: await this.restService.getToken(this.sessionId, this.OPENVIDU_URL, this.OPENVIDU_SECRET),
			screen: await this.restService.getToken(this.sessionId, this.OPENVIDU_URL, this.OPENVIDU_SECRET)
		};
	}

	leaveSession() {
		this.openviduService.disconnect();
	}
}
