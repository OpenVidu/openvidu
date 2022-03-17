import { Component, ElementRef, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { ILogger, LoggerService, OpenViduService } from 'openvidu-angular';
import { Session } from 'openvidu-browser';
import { ParticipantAbstractModel } from '../../../projects/openvidu-angular/src/lib/models/participant.model';

export interface TokenModel {
	webcam: string;
	screen: string;
}

@Component({
	template: `
		<ov-videoconference
			*ngIf="success"
			[participantName]="_participantName"
			[tokens]="_tokens"
			[minimal]="_minimal"
			[prejoin]="_prejoin"
			[videoMuted]="_videoMuted"
			[audioMuted]="_audioMuted"
			[toolbarScreenshareButton]="_toolbarScreenshareButton"
			[toolbarFullscreenButton]="_toolbarFullscreenButton"
			[toolbarLeaveButton]="_toolbarLeaveButton"
			[toolbarChatPanelButton]="_toolbarChatPanelButton"
			[toolbarParticipantsPanelButton]="_toolbarParticipantsPanelButton"
			[toolbarDisplayLogo]="_toolbarDisplayLogo"
			[toolbarDisplaySessionName]="_toolbarDisplaySessionName"
			[streamDisplayParticipantName]="_streamDisplayParticipantName"
			[streamDisplayAudioDetection]="_streamDisplayAudioDetection"
			[streamSettingsButton]="_streamSettingsButton"
			[participantPanelItemMuteButton]="_participantPanelItemMuteButton"
			(onJoinButtonClicked)="_onJoinButtonClicked()"
			(onToolbarLeaveButtonClicked)="_onToolbarLeaveButtonClicked()"
			(onToolbarCameraButtonClicked)="_onToolbarCameraButtonClicked()"
			(onToolbarMicrophoneButtonClicked)="_onToolbarMicrophoneButtonClicked()"
			(onToolbarScreenshareButtonClicked)="_onToolbarScreenshareButtonClicked()"
			(onToolbarParticipantsPanelButtonClicked)="_onToolbarParticipantsPanelButtonClicked()"
			(onToolbarChatPanelButtonClicked)="_onToolbarChatPanelButtonClicked()"
			(onToolbarFullscreenButtonClicked)="_onToolbarFullscreenButtonClicked()"
			(onSessionCreated)="_onSessionCreated($event)"
			(onParticipantCreated)="_onParticipantCreated($event)"
		></ov-videoconference>
	`
})
export class OpenviduWebComponentComponent implements OnInit {
	_tokens: TokenModel;
	_minimal: boolean = false;
	_participantName: string;
	_prejoin: boolean = true;
	_videoMuted: boolean = false;
	_audioMuted: boolean = false;
	_toolbarScreenshareButton: boolean = true;
	_toolbarFullscreenButton: boolean = true;
	_toolbarLeaveButton: boolean = true;
	_toolbarChatPanelButton: boolean = true;
	_toolbarParticipantsPanelButton: boolean = true;
	_toolbarDisplayLogo: boolean = true;
	_toolbarDisplaySessionName: boolean = true;
	_streamDisplayParticipantName: boolean = true;
	_streamDisplayAudioDetection: boolean = true;
	_streamSettingsButton: boolean = true;
	_participantPanelItemMuteButton: boolean = true;

	@Input() set minimal(value: string | boolean) {
		this._minimal = this.castToBoolean(value);
	}
	@Input() set participantName(value: string) {
		this._participantName = value;
	}
	@Input() set prejoin(value: string | boolean) {
		this._prejoin = this.castToBoolean(value);
	}
	@Input() set videoMuted(value: string | boolean) {
		this._videoMuted = this.castToBoolean(value);
	}
	@Input() set audioMuted(value: string | boolean) {
		this._audioMuted = this.castToBoolean(value);
	}

	@Input() set toolbarScreenshareButton(value: string | boolean) {
		this._toolbarScreenshareButton = this.castToBoolean(value);
	}
	@Input() set toolbarFullscreenButton(value: string | boolean) {
		this._toolbarFullscreenButton = this.castToBoolean(value);
	}
	@Input() set toolbarLeaveButton(value: string | boolean) {
		this._toolbarLeaveButton = this.castToBoolean(value);
	}
	@Input() set toolbarChatPanelButton(value: string | boolean) {
		this._toolbarChatPanelButton = this.castToBoolean(value);
	}
	@Input() set toolbarParticipantsPanelButton(value: string | boolean) {
		this._toolbarParticipantsPanelButton = this.castToBoolean(value);
	}
	@Input() set toolbarDisplayLogo(value: string | boolean) {
		this._toolbarDisplayLogo = this.castToBoolean(value);
	}
	@Input() set toolbarDisplaySessionName(value: string | boolean) {
		this._toolbarDisplaySessionName = this.castToBoolean(value);
	}
	@Input() set streamDisplayParticipantName(value: string | boolean) {
		this._streamDisplayParticipantName = this.castToBoolean(value);
	}
	@Input() set streamDisplayAudioDetection(value: string | boolean) {
		this._streamDisplayAudioDetection = this.castToBoolean(value);
	}
	@Input() set streamSettingsButton(value: string | boolean) {
		this._streamSettingsButton = this.castToBoolean(value);
	}
	@Input() set participantPanelItemMuteButton(value: string | boolean) {
		this._participantPanelItemMuteButton = this.castToBoolean(value);
	}

	@Output() onJoinButtonClicked = new EventEmitter<any>();
	@Output() onToolbarLeaveButtonClicked = new EventEmitter<any>();
	@Output() onToolbarCameraButtonClicked = new EventEmitter<any>();
	@Output() onToolbarMicrophoneButtonClicked = new EventEmitter<any>();
	@Output() onToolbarScreenshareButtonClicked = new EventEmitter<any>();
	@Output() onToolbarParticipantsPanelButtonClicked = new EventEmitter<any>();
	@Output() onToolbarChatPanelButtonClicked = new EventEmitter<any>();
	@Output() onToolbarFullscreenButtonClicked = new EventEmitter<any>();
	@Output() onSessionCreated = new EventEmitter<any>();
	@Output() onParticipantCreated = new EventEmitter<any>();

	success: boolean = false;
	private log: ILogger;

	constructor(private loggerService: LoggerService, private host: ElementRef, private openviduService: OpenViduService) {
		this.log = this.loggerService.get('WebComponent');
		this.host.nativeElement.leaveSession = this.leaveSession.bind(this);
	}

	ngOnInit(): void {}

	@Input('tokens')
	set tokens(value: TokenModel | string) {
		this.log.d('Webcomponent tokens: ', value);
		try {
			this._tokens = this.castToJson(value);
			this.success = !!this._tokens?.webcam && !!this._tokens?.screen;
		} catch (error) {
			this.log.e(error);
			if (!this.success) {
				this.log.e('Parameters received are incorrect: ', value);
				this.log.e('Session cannot start');
			}
		}
	}

	_onJoinButtonClicked() {
		this.onJoinButtonClicked.emit();
	}

	_onToolbarLeaveButtonClicked() {
		this.onToolbarLeaveButtonClicked.emit();
	}

	_onToolbarCameraButtonClicked() {
		this.onToolbarCameraButtonClicked.emit();
	}

	_onToolbarMicrophoneButtonClicked() {
		this.onToolbarMicrophoneButtonClicked.emit();
	}
	_onToolbarScreenshareButtonClicked() {
		this.onToolbarScreenshareButtonClicked.emit();
	}
	_onToolbarParticipantsPanelButtonClicked() {
		this.onToolbarParticipantsPanelButtonClicked.emit();
	}
	_onToolbarChatPanelButtonClicked() {
		this.onToolbarChatPanelButtonClicked.emit();
	}
	_onToolbarFullscreenButtonClicked() {
		this.onToolbarFullscreenButtonClicked.emit();
	}
	_onSessionCreated(event: Session) {
		this.onSessionCreated.emit(event);
	}

	_onParticipantCreated(event: ParticipantAbstractModel) {
		this.onParticipantCreated.emit(event);
	}

	leaveSession() {
		this.openviduService.disconnect();
	}

	private castToBoolean(value: string | boolean): boolean {
		if (typeof value === 'boolean') {
			return value;
		} else if (typeof value === 'string') {
			if (value !== 'true' && value !== 'false') {
				throw new Error('Parameter has an incorrect string value.');
			}
			return value === 'true';
		} else {
			throw new Error('Parameter has not a valid type. The parameters must to be string or boolean.');
		}
	}

	private castToJson(value: TokenModel | string) {
		if (typeof value === 'string') {
			try {
				return JSON.parse(value);
			} catch (error) {
				this.log.e('Unexpected JSON', error);
				throw 'Unexpected JSON';
			}
		} else if (typeof value === 'object') {
			return value;
		} else {
			throw new Error(
				'Parameter has not a valid type. The parameters must to be string or TokenModel {webcam:string, screen: string}.'
			);
		}
	}
}
