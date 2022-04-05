import { Component, OnDestroy, OnInit } from '@angular/core';
import { ParticipantAbstractModel, ParticipantService, TokenModel } from 'openvidu-angular';
import { Subscription } from 'rxjs';
import { RestService } from 'src/app/services/rest.service';

@Component({
	selector: 'app-layout-directive',
	styles: [
		`
			.container {
				display: flex;
				flex-wrap: wrap;
				justify-content: space-between;
			}

			.item {
				flex: 0 50%;
				height: 250px;
				margin-bottom: 2%;
			}
		`
	],
	template: `
		<ov-videoconference (onJoinButtonClicked)="onJoinButtonClicked()" [tokens]="tokens">
			<div *ovLayout>
				<div class="container">
					<div class="item" *ngFor="let stream of localParticipant | streams">
						<ov-stream [stream]="stream"></ov-stream>
					</div>

					<div class="item" *ngFor="let stream of remoteParticipants | streams">
						<ov-stream [stream]="stream"></ov-stream>
					</div>
				</div>
			</div>
		</ov-videoconference>
	`
})
export class LayoutDirectiveComponent implements OnInit, OnDestroy {
	tokens: TokenModel;
	sessionId = 'layout-directive-example';
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
	subscribeToParticipants() {
		this.localParticipantSubs = this.participantService.localParticipantObs.subscribe((p) => {
			this.localParticipant = p;
		});

		this.remoteParticipantsSubs = this.participantService.remoteParticipantsObs.subscribe((participants) => {
			this.remoteParticipants = participants;
		});
	}

	async onJoinButtonClicked() {
		this.tokens = {
			webcam: await this.restService.getToken(this.sessionId, this.OPENVIDU_URL, this.OPENVIDU_SECRET),
			screen: await this.restService.getToken(this.sessionId, this.OPENVIDU_URL, this.OPENVIDU_SECRET)
		};
	}
}
