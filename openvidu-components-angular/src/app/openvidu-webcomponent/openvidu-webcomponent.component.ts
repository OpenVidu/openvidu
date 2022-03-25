import { Component, ElementRef, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { ILogger, LoggerService, OpenViduService } from 'openvidu-angular';
import { Session } from 'openvidu-browser';
import { ParticipantAbstractModel } from '../../../projects/openvidu-angular/src/lib/models/participant.model';

export interface TokenModel {
	webcam: string;
	screen: string;
}

/**
 *
 * **OpenviduWebComponentComponent** is a wrapper of the {@link VideoconferenceComponent} which allows to generate and export the OpenVidu Webcomponent.
 * **It is not included in the library**.
 */
@Component({
	templateUrl: './openvidu-webcomponent.component.html'
})
export class OpenviduWebComponentComponent implements OnInit {
	/**
	 * @internal
	 */
	_tokens: TokenModel;
	/**
	 * @internal
	 */
	_minimal: boolean = false;
	/**
	 * @internal
	 */
	_participantName: string;
	/**
	 * @internal
	 */
	_prejoin: boolean = true;
	/**
	 * @internal
	 */
	_videoMuted: boolean = false;
	/**
	 * @internal
	 */
	_audioMuted: boolean = false;
	/**
	 * @internal
	 */
	_toolbarScreenshareButton: boolean = true;
	/**
	 * @internal
	 */
	_toolbarFullscreenButton: boolean = true;
	/**
	 * @internal
	 */
	_toolbarLeaveButton: boolean = true;
	/**
	 * @internal
	 */
	_toolbarChatPanelButton: boolean = true;
	/**
	 * @internal
	 */
	_toolbarParticipantsPanelButton: boolean = true;
	/**
	 * @internal
	 */
	_toolbarDisplayLogo: boolean = true;
	/**
	 * @internal
	 */
	_toolbarDisplaySessionName: boolean = true;
	/**
	 * @internal
	 */
	_streamDisplayParticipantName: boolean = true;
	/**
	 * @internal
	 */
	_streamDisplayAudioDetection: boolean = true;
	/**
	 * @internal
	 */
	_streamSettingsButton: boolean = true;
	/**
	 * @internal
	 */
	_participantPanelItemMuteButton: boolean = true;

	/**
	 * The **minimal** attribute applies a minimal UI hiding all controls except for cam and mic.
	 *
	 * Default: `false`
	 *
	 * @example
	 * <openvidu-webcomponent minimal="true"></openvidu-webcomponent>
	 */
	@Input() set minimal(value: string | boolean) {
		this._minimal = this.castToBoolean(value);
	}
	/**
	 * The **participantName** attribute sets the participant name. It can be useful for aplications which doesn't need the prejoin page.
	 *
	 * <div class="warn-container">
	 * 	<span>WARNING</span>: If you want to use this parameter to OpenVidu Web Component statically, you have to replace the <strong>camelCase</strong> with a <strong>hyphen between words</strong>.</div>
	 *
	 * @example
	 * <openvidu-webcomponent participant-name="MY_NAME"></openvidu-webcomponent>
	 */
	@Input() set participantName(value: string) {
		this._participantName = value;
	}
	/**
	 * The **prejoin** attribute allows show/hide the prejoin page for selecting media devices.
	 *
	 * Default: `true`
	 *
	 * @example
	 * <openvidu-webcomponent prejoin="false"></openvidu-webcomponent>
	 */
	@Input() set prejoin(value: string | boolean) {
		this._prejoin = this.castToBoolean(value);
	}
	/**
	 * The **videoMuted** attribute allows to join the session with camera muted/unmuted.
	 *
	 * Default: `false`
	 *
	 * <div class="warn-container">
	 * 	<span>WARNING</span>: If you want to use this parameter to OpenVidu Web Component statically, you have to replace the <strong>camelCase</strong> with a <strong>hyphen between words</strong>.</div>
	 *
	 * @example
	 * <openvidu-webcomponent video-muted="false"></openvidu-webcomponent>
	 */
	@Input() set videoMuted(value: string | boolean) {
		this._videoMuted = this.castToBoolean(value);
	}
	/**
	 * The **audioMuted** attribute allows to join the session with microphone muted/unmuted.
	 *
	 * Default: `false`
	 *
	 * <div class="warn-container">
	 * 	<span>WARNING</span>: If you want to use this parameter to OpenVidu Web Component statically, you have to replace the <strong>camelCase</strong> with a <strong>hyphen between words</strong>.</div>
	 *
	 * @example
	 * <openvidu-webcomponent audio-muted="false"></openvidu-webcomponent>
	 */
	@Input() set audioMuted(value: string | boolean) {
		this._audioMuted = this.castToBoolean(value);
	}

	/**
	 * The **toolbarScreenshareButton** attribute allows show/hide the screenshare toolbar button.
	 *
	 * Default: `true`
	 *
	 * <div class="warn-container">
	 * 	<span>WARNING</span>: If you want to use this parameter to OpenVidu Web Component statically, you have to replace the <strong>camelCase</strong> with a <strong>hyphen between words</strong>.</div>
	 *
	 * @example
	 * <openvidu-webcomponent toolbar-screenshare-button="false"></openvidu-webcomponent>
	 */
	@Input() set toolbarScreenshareButton(value: string | boolean) {
		this._toolbarScreenshareButton = this.castToBoolean(value);
	}
	/**
	 * The **toolbarFullscreenButton** attribute allows show/hide the fullscreen toolbar button.
	 *
	 * Default: `true`
	 *
	 * <div class="warn-container">
	 * 	<span>WARNING</span>: If you want to use this parameter to OpenVidu Web Component statically, you have to replace the <strong>camelCase</strong> with a <strong>hyphen between words</strong>.</div>
	 *
	 * @example
	 * <openvidu-webcomponent toolbar-fullscreen-button="false"></openvidu-webcomponent>
	 */
	@Input() set toolbarFullscreenButton(value: string | boolean) {
		this._toolbarFullscreenButton = this.castToBoolean(value);
	}
	/**
	 * The **toolbarLeaveButton** attribute allows show/hide the leave toolbar button.
	 *
	 * Default: `true`
	 *
	 * <div class="warn-container">
	 * 	<span>WARNING</span>: If you want to use this parameter to OpenVidu Web Component statically, you have to replace the <strong>camelCase</strong> with a <strong>hyphen between words</strong>.</div>
	 *
	 * @example
	 * <openvidu-webcomponent toolbar-leave-button="false"></openvidu-webcomponent>
	 */
	@Input() set toolbarLeaveButton(value: string | boolean) {
		this._toolbarLeaveButton = this.castToBoolean(value);
	}
	/**
	 * The **toolbarChatPanelButton** attribute allows show/hide the chat panel toolbar button.
	 *
	 * Default: `true`
	 *
	 * <div class="warn-container">
	 * 	<span>WARNING</span>: If you want to use this parameter to OpenVidu Web Component statically, you have to replace the <strong>camelCase</strong> with a <strong>hyphen between words</strong>.</div>
	 *
	 * @example
	 * <openvidu-webcomponent toolbar-chat-panel-button="false"></openvidu-webcomponent>
	 */
	@Input() set toolbarChatPanelButton(value: string | boolean) {
		this._toolbarChatPanelButton = this.castToBoolean(value);
	}
	/**
	 * The **toolbarParticipantsPanelButton** attribute allows show/hide the participants panel toolbar button.
	 *
	 * Default: `true`
	 *
	 * <div class="warn-container">
	 * 	<span>WARNING</span>: If you want to use this parameter to OpenVidu Web Component statically, you have to replace the <strong>camelCase</strong> with a <strong>hyphen between words</strong>.</div>
	 *
	 * @example
	 * <openvidu-webcomponent toolbar-participants-panel-button="false"></openvidu-webcomponent>
	 */
	@Input() set toolbarParticipantsPanelButton(value: string | boolean) {
		this._toolbarParticipantsPanelButton = this.castToBoolean(value);
	}
	/**
	 * The **toolbarDisplayLogo** attribute allows show/hide the branding logo.
	 *
	 * Default: `true`
	 *
	 * <div class="warn-container">
	 * 	<span>WARNING</span>: If you want to use this parameter to OpenVidu Web Component statically, you have to replace the <strong>camelCase</strong> with a <strong>hyphen between words</strong>.</div>
	 *
	 * @example
	 * <openvidu-webcomponent toolbar-display-logo="false"></openvidu-webcomponent>
	 */
	@Input() set toolbarDisplayLogo(value: string | boolean) {
		this._toolbarDisplayLogo = this.castToBoolean(value);
	}
	/**
	 * The **toolbarDisplaySessionName** attribute allows show/hide the session name.
	 *
	 * Default: `true`
	 *
	 * <div class="warn-container">
	 * 	<span>WARNING</span>: If you want to use this parameter to OpenVidu Web Component statically, you have to replace the <strong>camelCase</strong> with a <strong>hyphen between words</strong>.</div>
	 *
	 * @example
	 * <openvidu-webcomponent toolbar-display-session-name="false"></openvidu-webcomponent>
	 */
	@Input() set toolbarDisplaySessionName(value: string | boolean) {
		this._toolbarDisplaySessionName = this.castToBoolean(value);
	}
	/**
	 * The **streamDisplayParticipantName** attribute allows show/hide the participants name in stream component.
	 *
	 * Default: `true`
	 *
	 * <div class="warn-container">
	 * 	<span>WARNING</span>: If you want to use this parameter to OpenVidu Web Component statically, you have to replace the <strong>camelCase</strong> with a <strong>hyphen between words</strong>.</div>
	 *
	 * @example
	 * <openvidu-webcomponent stream-display-participant-name="false"></openvidu-webcomponent>
	 */
	@Input() set streamDisplayParticipantName(value: string | boolean) {
		this._streamDisplayParticipantName = this.castToBoolean(value);
	}
	/**
	 * The **streamDisplayAudioDetection** attribute allows show/hide the participants audio detection in stream component.
	 *
	 * Default: `true`
	 *
	 * <div class="warn-container">
	 * 	<span>WARNING</span>: If you want to use this parameter to OpenVidu Web Component statically, you have to replace the <strong>camelCase</strong> with a <strong>hyphen between words</strong>.</div>
	 *
	 * @example
	 * <openvidu-webcomponent stream-display-audio-detection="false"></openvidu-webcomponent>
	 */
	@Input() set streamDisplayAudioDetection(value: string | boolean) {
		this._streamDisplayAudioDetection = this.castToBoolean(value);
	}
	/**
	 * The **streamSettingsButton** attribute allows show/hide the participants settings button in stream component.
	 *
	 * Default: `true`
	 *
	 * <div class="warn-container">
	 * 	<span>WARNING</span>: If you want to use this parameter to OpenVidu Web Component statically, you have to replace the <strong>camelCase</strong> with a <strong>hyphen between words</strong>.</div>
	 *
	 * @example
	 * <openvidu-webcomponent stream-settings-button="false"></openvidu-webcomponent>
	 */
	@Input() set streamSettingsButton(value: string | boolean) {
		this._streamSettingsButton = this.castToBoolean(value);
	}
	/**
	 * The **participantPanelItemMuteButton** attribute allows show/hide the muted button in participant panel item component.
	 *
	 * Default: `true`
	 *
	 * <div class="warn-container">
	 * 	<span>WARNING</span>: If you want to use this parameter to OpenVidu Web Component statically, you have to replace the <strong>camelCase</strong> with a <strong>hyphen between words</strong>.</div>
	 *
	 * @example
	 * <openvidu-webcomponent participant-panel-item-mute-button="false"></openvidu-webcomponent>
	 */
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

	/**
	 * @internal
	 */
	success: boolean = false;
	private log: ILogger;

	/**
	 * @internal
	 */
	constructor(private loggerService: LoggerService, private host: ElementRef, private openviduService: OpenViduService) {
		this.log = this.loggerService.get('WebComponent');
		this.host.nativeElement.leaveSession = this.leaveSession.bind(this);
	}

	ngOnInit(): void {}

	/**
	 * @example
	 * <openvidu-webcomponent tokens='{"webcam":"TOKEN1", "screen":"TOKEN2"}'></openvidu-webcomponent>
	 */
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

	/**
	 * @internal
	 */
	_onJoinButtonClicked() {
		this.onJoinButtonClicked.emit();
	}

	/**
	 * @internal
	 */
	_onToolbarLeaveButtonClicked() {
		this.success = false;
		this.onToolbarLeaveButtonClicked.emit();
	}

	/**
	 * @internal
	 */
	_onToolbarCameraButtonClicked() {
		this.onToolbarCameraButtonClicked.emit();
	}

	/**
	 * @internal
	 */
	_onToolbarMicrophoneButtonClicked() {
		this.onToolbarMicrophoneButtonClicked.emit();
	}
	/**
	 * @internal
	 */
	_onToolbarScreenshareButtonClicked() {
		this.onToolbarScreenshareButtonClicked.emit();
	}
	/**
	 * @internal
	 */
	_onToolbarParticipantsPanelButtonClicked() {
		this.onToolbarParticipantsPanelButtonClicked.emit();
	}
	/**
	 * @internal
	 */
	_onToolbarChatPanelButtonClicked() {
		this.onToolbarChatPanelButtonClicked.emit();
	}
	/**
	 * @internal
	 */
	_onToolbarFullscreenButtonClicked() {
		this.onToolbarFullscreenButtonClicked.emit();
	}
	/**
	 * @internal
	 */
	_onSessionCreated(event: Session) {
		this.onSessionCreated.emit(event);
	}

	/**
	 * @internal
	 */
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
