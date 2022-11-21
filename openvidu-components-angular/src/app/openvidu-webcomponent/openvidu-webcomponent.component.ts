import { Component, ElementRef, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { OpenViduService, ParticipantAbstractModel, RecordingInfo, TokenModel } from 'openvidu-angular';
import { Session } from 'openvidu-browser';

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
	_toolbarRecordingButton: boolean = true;
	/**
	 * @internal
	 */
	_toolbarFullscreenButton: boolean = true;
	/**
	 * @internal
	 */
	_toolbarBackgroundEffectsButton: boolean = true;
	/**
	 * @internal
	 */
	_toolbarSettingsButton: boolean = true;
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
	_toolbarActivitiesPanelButton: boolean = true;
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
	_toolbarCaptionsButton: boolean = true;
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
	 * @internal
	 */
	_recordingActivityRecordingError: any = null;
	/**
	 * @internal
	 */
	_activitiesPanelRecordingActivity: boolean = true;

	/**
	 * @internal
	 */
	_recordingActivityRecordingsList: RecordingInfo[] = [];

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
	 * The **toolbarRecordingButton** attribute allows show/hide the start/stop recording toolbar button.
	 *
	 * Default: `true`
	 *
	 * <div class="warn-container">
	 * 	<span>WARNING</span>: If you want to use this parameter to OpenVidu Web Component statically, you have to replace the <strong>camelCase</strong> with a <strong>hyphen between words</strong>.</div>
	 *
	 * @example
	 * <openvidu-webcomponent toolbar-recording-button="false"></openvidu-webcomponent>
	 */
	@Input() set toolbarRecordingButton(value: string | boolean) {
		this._toolbarRecordingButton = this.castToBoolean(value);
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
	 * The **toolbarBackgroundEffectsButton** attribute allows show/hide the background effects toolbar button.
	 *
	 * Default: `true`
	 *
	 * <div class="warn-container">
	 * 	<span>WARNING</span>: If you want to use this parameter to OpenVidu Web Component statically, you have to replace the <strong>camelCase</strong> with a <strong>hyphen between words</strong>.</div>
	 *
	 * @example
	 * <openvidu-webcomponent toolbar-background-effects-button="false"></openvidu-webcomponent>
	 */
	@Input() set toolbarBackgroundEffectsButton(value: string | boolean) {
		this._toolbarBackgroundEffectsButton = this.castToBoolean(value);
	}

	/**
	 * The **toolbarSettingsButton** attribute allows show/hide the settings toolbar button.
	 *
	 * Default: `true`
	 *
	 * <div class="warn-container">
	 * 	<span>WARNING</span>: If you want to use this parameter to OpenVidu Web Component statically, you have to replace the <strong>camelCase</strong> with a <strong>hyphen between words</strong>.</div>
	 *
	 * @example
	 * <openvidu-webcomponent toolbar-settings-button="false"></openvidu-webcomponent>
	 */
	@Input() set toolbarSettingsButton(value: string | boolean) {
		this._toolbarSettingsButton = this.castToBoolean(value);
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
	 * The **toolbarActivitiesPanelButton** attribute allows show/hide the activities panel toolbar button.
	 *
	 * Default: `true`
	 *
	 * <div class="warn-container">
	 * 	<span>WARNING</span>: If you want to use this parameter to OpenVidu Web Component statically, you have to replace the <strong>camelCase</strong> with a <strong>hyphen between words</strong>.</div>
	 *
	 * @example
	 * <openvidu-webcomponent toolbar-activities-panel-button="false"></openvidu-webcomponent>
	 */
	@Input() set toolbarActivitiesPanelButton(value: string | boolean) {
		this._toolbarActivitiesPanelButton = this.castToBoolean(value);
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
	 * The **toolbarCaptionsButton** attribute allows show/hide the captions toolbar button.
	 *
	 * Default: `true`
	 *
	 * <div class="warn-container">
	 * 	<span>WARNING</span>: If you want to use this parameter to OpenVidu Web Component statically, you have to replace the <strong>camelCase</strong> with a <strong>hyphen between words</strong>.</div>
	 *
	 * @example
	 * <openvidu-webcomponent toolbar-captions-button="false"></openvidu-webcomponent>
	 */
	@Input() set toolbarCaptionsButton(value: string | boolean) {
		this._toolbarCaptionsButton = this.castToBoolean(value);
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

	/**
	 * The **recordingActivityRecordingError** attribute allows to show any possible error with the recording in the {@link RecordingActivityComponent}.
	 *
	 * Default: `true`
	 *
	 * @example
	 * <openvidu-webcomponent recording-activity-recording-error="false"></openvidu-webcomponent>
	 */
	@Input() set recordingActivityRecordingError(value: any) {
		this._recordingActivityRecordingError = value;
	}

	/**
	 * The **activitiesPanelRecordingActivity** attribute allows show/hide the recording activity in {@link ActivitiesPanelComponent}.
	 *
	 * Default: `true`
	 *
	 * @example
	 * <openvidu-webcomponent activity-panel-recording-activity="false"></openvidu-webcomponent>
	 */
	@Input() set activitiesPanelRecordingActivity(value: string | boolean) {
		this._activitiesPanelRecordingActivity = this.castToBoolean(value);
	}

	/**
	 * The **recordingActivityRecordingList** attribute allows show to show the recordings available for the session in {@link RecordingActivityComponent}.
	 *
	 * Default: `[]`
	 *
	 * @example
	 * <openvidu-webcomponent recording-activity-recordings-list="recordingsList"></openvidu-webcomponent>
	 */
	@Input() set recordingActivityRecordingsList(value: RecordingInfo[]) {
		this._recordingActivityRecordingsList = value;
	}

	/**
	 * Provides event notifications that fire when join button (in prejoin page) has been clicked.
	 */
	@Output() onJoinButtonClicked: EventEmitter<void> = new EventEmitter<void>();

	/**
	 * Provides event notifications that fire when leave button has been clicked.
	 */
	@Output() onToolbarLeaveButtonClicked: EventEmitter<void> = new EventEmitter<void>();

	/**
	 * Provides event notifications that fire when camera toolbar button has been clicked.
	 */
	@Output() onToolbarCameraButtonClicked: EventEmitter<void> = new EventEmitter<void>();

	/**
	 * Provides event notifications that fire when microphone toolbar button has been clicked.
	 */
	@Output() onToolbarMicrophoneButtonClicked: EventEmitter<void> = new EventEmitter<void>();

	/**
	 * Provides event notifications that fire when screenshare toolbar button has been clicked.
	 */
	@Output() onToolbarScreenshareButtonClicked: EventEmitter<void> = new EventEmitter<void>();

	/**
	 * Provides event notifications that fire when fullscreen toolbar button has been clicked.
	 */
	@Output() onToolbarFullscreenButtonClicked: EventEmitter<void> = new EventEmitter<void>();

	/**
	 * Provides event notifications that fire when participants panel button has been clicked.
	 */
	@Output() onToolbarParticipantsPanelButtonClicked: EventEmitter<void> = new EventEmitter<void>();

	/**
	 * Provides event notifications that fire when chat panel button has been clicked.
	 */
	@Output() onToolbarChatPanelButtonClicked: EventEmitter<void> = new EventEmitter<void>();

	/**
	 * Provides event notifications that fire when activities panel button has been clicked.
	 */
	@Output() onToolbarActivitiesPanelButtonClicked: EventEmitter<void> = new EventEmitter<void>();

	@Output() onToolbarStartRecordingClicked: EventEmitter<void> = new EventEmitter<void>();
	/**
	 * Provides event notifications that fire when stop recording button is clicked from {@link ToolbarComponent}.
	 *  The recording should be stopped using the REST API.
	 */
	@Output() onToolbarStopRecordingClicked: EventEmitter<void> = new EventEmitter<void>();

	/**
	 * Provides event notifications that fire when start recording button is clicked {@link ActivitiesPanelComponent}.
	 *  The recording should be stopped using the REST API.
	 */
	@Output() onActivitiesPanelStartRecordingClicked: EventEmitter<void> = new EventEmitter<void>();
	/**
	 * Provides event notifications that fire when stop recording button is clicked from {@link ActivitiesPanelComponent}.
	 *  The recording should be stopped using the REST API.
	 */
	@Output() onActivitiesPanelStopRecordingClicked: EventEmitter<void> = new EventEmitter<void>();

	/**
	 * Provides event notifications that fire when download recording button is clicked from {@link ActivitiesPanelComponent}.
	 *  The recording should be downloaded using the REST API.
	 */
	@Output() onActivitiesPanelDownloadRecordingClicked: EventEmitter<string> = new EventEmitter<string>();

	/**
	 * Provides event notifications that fire when delete recording button is clicked from {@link ActivitiesPanelComponent}.
	 *  The recording should be deleted using the REST API.
	 */
	@Output() onActivitiesPanelDeleteRecordingClicked: EventEmitter<string> = new EventEmitter<string>();

	/**
	 * Provides event notifications that fire when OpenVidu Session is created.
	 * See {@link https://docs.openvidu.io/en/stable/api/openvidu-browser/classes/Session.html openvidu-browser Session}.
	 */
	@Output() onSessionCreated: EventEmitter<Session> = new EventEmitter<Session>();

	/**
	 * Provides event notifications that fire when local participant is created.
	 */
	@Output() onParticipantCreated: EventEmitter<ParticipantAbstractModel> = new EventEmitter<ParticipantAbstractModel>();

	/**
	 * @internal
	 */
	success: boolean = false;

	/**
	 * @internal
	 */
	constructor(private host: ElementRef, private openviduService: OpenViduService) {
		this.host.nativeElement.disconnect = this.disconnect.bind(this);
	}

	ngOnInit(): void {}

	/**
	 * Tokens parameter is required to grant a participant access to a Session.
	 * This OpenVidu token will be use by each participant when connecting to a Session.
	 *
	 * This input accepts a {@link TokenModel} object type or a string type.
	 *
	 * @example
	 * <openvidu-webcomponent tokens='{"webcam":"TOKEN1", "screen":"TOKEN2"}'></openvidu-webcomponent>
	 *
	 *
	 * @example
	 * <openvidu-webcomponent tokens='TOKEN1'></openvidu-webcomponent>
	 *
	 */
	@Input('tokens')
	set tokens(value: TokenModel | string) {
		// console.debug('Webcomponent tokens: ', value);
		try {
			this._tokens = this.castToJson(value);
			this.success = !!this._tokens?.webcam && !!this._tokens?.screen;
		} catch (error) {
			if (typeof value === 'string' && value !== '') {
				console.debug('Single token received.');
				this._tokens = { webcam: value };
				this.success = true;
			} else {
				console.error(error);
				console.error('Tokens parameter received is incorrect: ', value);
				console.error('Session cannot start');
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

	_onToolbarActivitiesPanelButtonClicked() {
		this.onToolbarActivitiesPanelButtonClicked.emit();
	}
	/**
	 * @internal
	 */
	_onToolbarFullscreenButtonClicked() {
		this.onToolbarFullscreenButtonClicked.emit();
	}
	onStartRecordingClicked(from: string) {
		if (from === 'toolbar') {
			this.onToolbarStartRecordingClicked.emit();
		} else if (from === 'panel') {
			this.onActivitiesPanelStartRecordingClicked.emit();
		}
	}

	/**
	 * @internal
	 */
	onStopRecordingClicked(from: string) {
		if (from === 'toolbar') {
			this.onToolbarStopRecordingClicked.emit();
		} else if (from === 'panel') {
			this.onActivitiesPanelStopRecordingClicked.emit();
		}
	}

	/**
	 * @internal
	 */
	_onActivitiesDownloadRecordingClicked(recordingId: string) {
		this.onActivitiesPanelDownloadRecordingClicked.emit(recordingId);
	}

	/**
	 * @internal
	 */
	_onActivitiesDeleteRecordingClicked(recordingId: string) {
		this.onActivitiesPanelDeleteRecordingClicked.emit(recordingId);
	}

	/**
	 * @internal
	 */
	_onSessionCreated(session: Session) {
		this.onSessionCreated.emit(session);
	}

	/**
	 * @internal
	 */
	_onParticipantCreated(participant: ParticipantAbstractModel) {
		this.onParticipantCreated.emit(participant);
	}

	disconnect() {
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
				throw 'Unexpected JSON' + error;
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
