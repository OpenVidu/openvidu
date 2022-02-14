import { Component, ContentChild, EventEmitter, Input, OnInit, Output, TemplateRef, ViewChild } from '@angular/core';
import { StreamDirective } from '../../directives/stream/stream.directive';

@Component({
	selector: 'ov-videoconference',
	templateUrl: './videoconference.component.html',
	styleUrls: ['./videoconference.component.css']
})
export class VideoconferenceComponent implements OnInit {
	streamTemplate: TemplateRef<any>;

	@ContentChild(StreamDirective)
	set customStream(customStream: StreamDirective) {
		if (customStream) {
			this.streamTemplate = customStream.template;
		}
	}

	@Input() sessionName: string;
	@Input() userName: string;

	@Input()
	set tokens(tokens: { webcam: string; screen: string }) {
		if (!tokens || (!tokens.webcam && !tokens.screen)) {
			//No tokens received
			// throw new Error('No tokens received');
			console.warn('No tokens received');
		} else {
			if (tokens.webcam || tokens.screen) {
				this._tokens = {
					webcam: tokens.webcam,
					screen: tokens.screen
				};
				this.joinSessionClicked = true;
				this.isSessionAlive = true;
			}
		}
	}

	// @Input() openviduServerUrl: string;
	// @Input() openviduSecret: string;

	@Output() onJoinClicked = new EventEmitter<any>();
	@Output() onCloseClicked = new EventEmitter<any>();

	joinSessionClicked: boolean = false;
	closeClicked: boolean = false;
	isSessionAlive: boolean = false;
	_tokens: { webcam: string; screen: string };
	error: boolean = false;
	errorMessage: string = '';

	constructor() {}

	ngOnInit() {}

	async _onJoinClicked() {
		this.onJoinClicked.emit();
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
