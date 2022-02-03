import { Component, ContentChild, EventEmitter, Input, OnInit, Output, TemplateRef, ViewChild, ViewContainerRef } from '@angular/core';
import { RestService } from '../../services/rest/rest.service';

@Component({
	selector: 'ov-videoconference',
	templateUrl: './videoconference.component.html',
	styleUrls: ['./videoconference.component.css']
})
export class VideoconferenceComponent implements OnInit {
	@ContentChild('toolbar', { read: TemplateRef }) toolbarTemplate: TemplateRef<any>;
	@ContentChild('layout', { read: TemplateRef }) layoutTemplate: TemplateRef<any>;
	@ContentChild('panel', { read: TemplateRef }) panelTemplate: TemplateRef<any>;
	@ContentChild('chatPanel', { read: TemplateRef }) chatPanelTemplate: TemplateRef<any>;
	@ContentChild('participantsPanel', { read: TemplateRef }) participantsPanelTemplate: TemplateRef<any>;
	@ContentChild('stream', { read: TemplateRef }) streamTemplate: TemplateRef<any>;

	@Input() sessionName: string;
	@Input() userName: string;
	@Input() openviduServerUrl: string;
	@Input() openviduSecret: string;
	@Input() tokens: { webcam: string; screen: string };

	@Output() onJoinClicked = new EventEmitter<any>();
	@Output() onCloseClicked = new EventEmitter<any>();

	joinSessionClicked: boolean = false;
	closeClicked: boolean = false;
	isSessionAlive: boolean = false;
	_tokens: { webcam: string; screen: string };
	error: boolean = false;
	errorMessage: string = '';

	constructor(private restService: RestService) {}

	ngOnInit() {}

	async _onJoinClicked() {

		this.onJoinClicked.emit();
		// if (!this.tokens || (!this.tokens?.webcam && !this.tokens?.screen)) {
		// 	//No tokens received

		// 	if (!!this.sessionName && !!this.openviduServerUrl && !!this.openviduSecret) {
		// 		// Generate tokens
		// 		this._tokens = {
		// 			webcam: await this.restService.getToken(this.sessionName, this.openviduServerUrl, this.openviduSecret),
		// 			screen: await this.restService.getToken(this.sessionName, this.openviduServerUrl, this.openviduSecret)
		// 		};
		// 	} else {
		// 		// No tokens received and can't generate them
		// 		this.error = true;
		// 		this.errorMessage = `Cannot access to OpenVidu Server with url '${this.openviduServerUrl}' to genere tokens for session '${this.sessionName}'`;
		// 		throw this.errorMessage;
		// 	}
		// } else if (!this.tokens?.webcam || !this.tokens?.screen) {
		// 	// 1 token received
		// 	const aditionalToken = await this.restService.getToken(this.sessionName, this.openviduServerUrl, this.openviduSecret);
		// 	this._tokens = {
		// 		webcam: !!this.tokens.webcam ? this.tokens.webcam : aditionalToken,
		// 		screen: !!this.tokens.screen ? this.tokens.screen : aditionalToken
		// 	};
		// } else {
		// 	// 2 tokens received.
		// 	this._tokens = {
		// 		webcam: this.tokens.webcam,
		// 		screen: this.tokens.screen
		// 	};
		// }
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
