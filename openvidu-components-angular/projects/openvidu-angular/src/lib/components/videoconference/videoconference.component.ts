import { Component, Input, OnInit, Output } from '@angular/core';
import { RestService } from '../../services/rest/rest.service';

@Component({
	selector: 'ov-videoconference',
	templateUrl: './videoconference.component.html',
	styleUrls: ['./videoconference.component.css']
})
export class VideoconferenceComponent implements OnInit {
	@Input() sessionName: string;
	@Input() userName: string;
	@Input() openviduServerUrl: string;
	@Input() openviduSecret: string;
	@Input() tokens: string[];

	joinSessionClicked: boolean = false;
	closeClicked: boolean = false;
	isSessionAlive: boolean = false;
	_tokens: { webcam: string; screen: string };
	error: boolean = false;
	errorMessage: string = '';

	constructor(private restService: RestService) {}

	ngOnInit() {}

	async onJoinClicked() {

		if (!this.tokens || this.tokens?.length === 0) {
			//No tokens received

			if (!!this.sessionName && !!this.openviduServerUrl && !!this.openviduSecret) {
				// Generate tokens
				this._tokens = {
					webcam: await this.restService.getToken(this.sessionName, this.openviduServerUrl, this.openviduSecret),
					screen: await this.restService.getToken(this.sessionName, this.openviduServerUrl, this.openviduSecret)
				};
			} else {
				// No tokens received and can't generate them
				this.error = true;
				this.errorMessage = `Cannot access to OpenVidu Server with url '${this.openviduServerUrl}' to genere tokens for session '${this.sessionName}'`;
				throw this.errorMessage;
			}
		} else if (this.tokens?.length < 2) {
			// 1 token received
			this._tokens = {
				webcam: this.tokens[0],
				screen: await this.restService.getToken(this.sessionName, this.openviduServerUrl, this.openviduSecret)
			};
		} else {
			// 2 tokens received.
			this._tokens = {
				webcam: this.tokens[0],
				screen: this.tokens[1]
			};
		}
		this.joinSessionClicked = true;
		this.isSessionAlive = true;
	}
	onLeaveSessionClicked() {
		this.isSessionAlive = false;
		this.closeClicked = true;
	}

	onMicClicked() {}

	onCamClicked() {}

	onScreenShareClicked() {}

	onSpeakerLayoutClicked() {}
}
