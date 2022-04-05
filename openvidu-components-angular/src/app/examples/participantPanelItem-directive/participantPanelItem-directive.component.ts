import { Component, OnDestroy, OnInit } from '@angular/core';
import { ParticipantAbstractModel, ParticipantService, TokenModel } from 'openvidu-angular';
import { Subscription } from 'rxjs';
import { RestService } from 'src/app/services/rest.service';

@Component({
	selector: 'app-participantPanelItem-directive',
	template: `
		<ov-videoconference (onJoinButtonClicked)="onJoinButtonClicked()" [tokens]="tokens" [toolbarDisplaySessionName]="false">
			<div *ovParticipantPanelItem="let participant">
				<ov-participant-panel-item [participant]="participant"></ov-participant-panel-item>

				<button mat-icon-button [matMenuTriggerFor]="menu"><mat-icon>more_vert</mat-icon></button>
				<mat-menu #menu="matMenu">
					<button mat-menu-item>Item 1</button>
					<button mat-menu-item>Item 2</button>
				</mat-menu>
			</div>
		</ov-videoconference>
	`,
	styles: [``]
})
export class ParticipantPanelItemDirectiveComponent implements OnInit, OnDestroy {
	tokens: TokenModel;
	sessionId = 'participants-panel-directive-example';
	OPENVIDU_URL = 'https://localhost:4443';
	OPENVIDU_SECRET = 'MY_SECRET';
	localParticipant: ParticipantAbstractModel;
	remoteParticipants: ParticipantAbstractModel[];
	localParticipantSubs: Subscription;
	remoteParticipantsSubs: Subscription;

	constructor(private restService: RestService, private participantService: ParticipantService) {}

	ngOnInit(): void {
		this.subscribeToParticipants();
	}

	ngOnDestroy() {
		this.localParticipantSubs.unsubscribe();
		this.remoteParticipantsSubs.unsubscribe();
	}

	async onJoinButtonClicked() {
		this.tokens = {
			webcam: await this.restService.getToken(this.sessionId, this.OPENVIDU_URL, this.OPENVIDU_SECRET),
			screen: await this.restService.getToken(this.sessionId, this.OPENVIDU_URL, this.OPENVIDU_SECRET)
		};
	}

	subscribeToParticipants() {
		this.localParticipantSubs = this.participantService.localParticipantObs.subscribe((p) => {
			this.localParticipant = p;
		});

		this.remoteParticipantsSubs = this.participantService.remoteParticipantsObs.subscribe((participants) => {
			this.remoteParticipants = participants;
		});
	}
}
