import { Component, OnInit } from '@angular/core';
import { RestService } from '../services/rest.service';
import { Router } from '@angular/router';

@Component({
	selector: 'app-call',
	templateUrl: './call.component.html',
	styleUrls: ['./call.component.scss']
})
export class CallComponent implements OnInit {
	sessionId = 'prueba-majestuosa-amable';
	tokens: { webcam: string; screen: string };

	joinSessionClicked: boolean = false;
	closeClicked: boolean = false;
	isSessionAlive: boolean = false;

	constructor(private restService: RestService, private router: Router) {}

	ngOnInit() {
		// this.onJoinClicked();
	}

	async onJoinClicked() {
		this.tokens = {
			webcam: await this.restService.getToken(this.sessionId),
			screen: await this.restService.getToken(this.sessionId)
		};

		// this.joinSessionClicked = true;
		// this.isSessionAlive = true;
	}
	onCloseClicked() {
		this.closeClicked = true;
		this.router.navigate([`/`]);
	}

	onMicClicked() {}

	onCamClicked() {
		console.log('APP: CAM CLIKED')
	}

	onScreenShareClicked() {}

	onSpeakerLayoutClicked() {}

	onLeaveSessionClicked() {
		this.isSessionAlive = false;
	}
}
