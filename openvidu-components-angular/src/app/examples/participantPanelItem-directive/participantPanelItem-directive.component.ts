import { Component } from '@angular/core';
import { TokenModel } from 'openvidu-angular';
import { RestService } from 'src/app/services/rest.service';

@Component({
	selector: 'app-participantPanelItem-directive',
	template: `
		<ov-videoconference (onJoinButtonClicked)="onJoinButtonClicked()" [tokens]="tokens" [toolbarDisplaySessionName]="false">
			<div *ovParticipantPanelItem="let participant" style="display: flex">
				<p>{{ participant.nickname }}</p>
				<button mat-icon-button [matMenuTriggerFor]="menu"><mat-icon>more_vert</mat-icon></button>
				<mat-menu #menu="matMenu">
					<button mat-menu-item>Button 1</button>
					<button mat-menu-item>Button 2</button>
				</mat-menu>
			</div>
		</ov-videoconference>
	`,
	styles: [``]
})
export class ParticipantPanelItemDirectiveComponent {
	tokens: TokenModel;
	sessionId = 'participants-panel-directive-example';
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
