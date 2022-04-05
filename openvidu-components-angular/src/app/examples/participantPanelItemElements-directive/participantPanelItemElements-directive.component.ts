import { Component } from '@angular/core';
import { ParticipantService, TokenModel } from 'openvidu-angular';
import { RestService } from 'src/app/services/rest.service';

@Component({
	selector: 'app-participantPanelItemElements-directive',
	template: `
		<ov-videoconference (onJoinButtonClicked)="onJoinButtonClicked()" [tokens]="tokens" [toolbarDisplaySessionName]="false">
			<div *ovParticipantsPanel id="my-panel">
				<ul id="local">
					<li>{{ localParticipant.nickname }}</li>
				</ul>

				<ul id="remote">
					<li *ngFor="let p of remoteParticipants">{{ p.nickname }}</li>
				</ul>
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

	constructor(private restService: RestService, private participantService: ParticipantService) {}



	async onJoinButtonClicked() {
		this.tokens = {
			webcam: await this.restService.getToken(this.sessionId, this.OPENVIDU_URL, this.OPENVIDU_SECRET),
			screen: await this.restService.getToken(this.sessionId, this.OPENVIDU_URL, this.OPENVIDU_SECRET)
		};
	}


}
