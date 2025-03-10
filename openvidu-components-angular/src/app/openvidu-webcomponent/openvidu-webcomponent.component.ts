import { Component, ElementRef, EventEmitter, Input, Output } from '@angular/core';
import { OpenViduService, ParticipantModel, Room, ParticipantLeftEvent } from 'openvidu-components-angular';
// import { CaptionsLangOption } from '../../../projects/openvidu-components-angular/src/lib/models/caption.model';
import { CustomDevice } from '../../../projects/openvidu-components-angular/src/lib/models/device.model';
import {
	ActivitiesPanelStatusEvent,
	ChatPanelStatusEvent,
	ParticipantsPanelStatusEvent,
	SettingsPanelStatusEvent
} from '../../../projects/openvidu-components-angular/src/lib/models/panel.model';
import {
	RecordingDeleteRequestedEvent,
	RecordingDownloadClickedEvent,
	RecordingPlayClickedEvent,
	RecordingStartRequestedEvent,
	RecordingStopRequestedEvent
} from '../../../projects/openvidu-components-angular/src/lib/models/recording.model';
import {
	BroadcastingStartRequestedEvent,
	BroadcastingStopRequestedEvent
} from '../../../projects/openvidu-components-angular/src/lib/models/broadcasting.model';
import { LangOption } from '../../../projects/openvidu-components-angular/src/lib/models/lang.model';

/**
 *
 * The **OpenviduWebComponentComponent** serves as a bridge to create and export the **OpenVidu Webcomponent**.
 * It acts as an intermediary interface to the web component, it is not part of the Angular library.
 *
 */
@Component({
	templateUrl: './openvidu-webcomponent.component.html'
})
export class OpenviduWebComponentComponent {
	/**
	 * @internal
	 */
	_livekitUrl: string;
	/**
	 * @internal
	 */
	_token: string;
	/**
	 * @internal
	 */
	_tokenError: string;
	/**
	 * @internal
	 */
	_minimal: boolean = false;

	/**
	 * @internal
	 */
	_lang: string = '';

	/**
	 * @internal
	 */
	_langOptions: LangOption;

	/**
	 * @internal
	 */
	_captionsLang: string = '';

	/**
	 * @internal
	 */
	// _captionsLangOptions: CaptionsLangOption;

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
	_videoEnabled: boolean = true;
	/**
	 * @internal
	 */
	_audioEnabled: boolean = true;

	/**
	 * @internal
	 */
	_toolbarCameraButton: boolean = true;
	/**
	 * @internal
	 */
	_toolbarMicrophoneButton: boolean = true;
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
	_toolbarBroadcastingButton: boolean = true;
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
	_toolbarDisplayRoomName: boolean = true;
	/**
	 * @internal
	 */

	// _toolbarCaptionsButton: boolean = true;
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
	_streamVideoControls: boolean = true;
	/**
	 * @internal
	 */
	_participantPanelItemMuteButton: boolean = true;

	/**
	 * @internal
	 */
	_activitiesPanelRecordingActivity: boolean = true;
	/**
	 * @internal
	 */
	_activitiesPanelBroadcastingActivity: boolean = true;

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
	 * The **lang** attribute sets the default UI language.
	 *
	 * Default: `en`
	 *
	 * @example
	 * <openvidu-webcomponent lang="es"></openvidu-webcomponent>
	 */
	@Input() set lang(value: string) {
		this._lang = value;
	}

	/**
	 * The **langOptions** directive allows to set the application language options.
	 * It will override the application languages provided by default.
	 * This propety is an array of objects which must comply with the {@link LangOption} interface.
	 *
	 * It is only available for {@link VideoconferenceComponent}.
	 *
	 * Default: ```
	 * [
	 * 	{ name: 'English', lang: 'en' },
	 *  { name: 'Español', lang: 'es' },
	 *  { name: 'Deutsch', lang: 'de' },
	 *  { name: 'Français', lang: 'fr' },
	 *  { name: '中国', lang: 'cn' },
	 *  { name: 'हिन्दी', lang: 'hi' },
	 *  { name: 'Italiano', lang: 'it' },
	 *  { name: 'やまと', lang: 'ja' },
	 *  { name: 'Dutch', lang: 'nl' },
	 *  { name: 'Português', lang: 'pt' }
	 * ]```
	 *
	 * Note: If you want to add a new language, you must add a new object with the name and the language code (e.g. `{ name: 'Custom', lang: 'cus' }`)
	 * and then add the language file in the `assets/lang` folder with the name `cus.json`.
	 *
	 *
	 * @example
	 * <openvidu-webcomponent captions-lang-options="[{name:'Spanish', lang: 'es-ES'}]"></openvidu-webcomponent>
	 */
	@Input() set langOptions(value: string | LangOption[]) {
		this._langOptions = this.castToArray(value);
	}

	/**
	 * The **captionsLang** attribute sets the deafult language that OpenVidu will try to recognise.
	 *
	 * It must be a valid [BCP-47](https://tools.ietf.org/html/bcp47) language tag like "en-US" or "es-ES".
	 *
	 * Default: `en-US`
	 *
	 * @example
	 * <openvidu-webcomponent captions-lang="es-ES"></openvidu-webcomponent>
	 */
	// TODO: Uncomment when captions are implemented
	// @Input() set captionsLang(value: string) {
	// 	this._captionsLang = value;
	// }
	/**
	 * The captionsLangOptions attribute sets the language options for the captions.
	 * It will override the languages provided by default.
	 * This propety is an array of objects which must comply with the {@link CaptionsLangOption} interface.
	 *
	 * Default: ```
	 * [
	 * 	{ name: 'English', lang: 'en-US' },
	 * 	{ name: 'Español', lang: 'es-ES' },
	 * 	{ name: 'Deutsch', lang: 'de-DE' },
	 * 	{ name: 'Français', lang: 'fr-FR' },
	 * 	{ name: '中国', lang: 'zh-CN' },
	 * 	{ name: 'हिन्दी', lang: 'hi-IN' },
	 * 	{ name: 'Italiano', lang: 'it-IT' },
	 * 	{ name: 'やまと', lang: 'jp-JP' },
	 * 	{ name: 'Português', lang: 'pt-PT' }
	 * ]```
	 *
	 * @example
	 * <openvidu-webcomponent captions-lang-options="[{name:'Spanish', lang: 'es-ES'}]"></openvidu-webcomponent>
	 */
	// TODO: Uncomment when captions are implemented
	// @Input() set captionsLangOptions(value: string | CaptionsLangOption[]) {
	// 	this._captionsLangOptions = this.castToArray(value);
	// }
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
	 * The **videoEnabled** attribute allows to join the room with camera enabled or disabled.
	 *
	 * Default: `true`
	 *
	 * <div class="warn-container">
	 * 	<span>WARNING</span>: If you want to use this parameter to OpenVidu Web Component statically, you have to replace the <strong>camelCase</strong> with a <strong>hyphen between words</strong>.</div>
	 *
	 * @example
	 * <openvidu-webcomponent video-enabled="false"></openvidu-webcomponent>
	 */
	@Input() set videoEnabled(value: string | boolean) {
		this._videoEnabled = this.castToBoolean(value);
	}
	/**
	 * The **audioEnabled** attribute allows to join the room with microphone muted/unmuted.
	 *
	 * Default: `true`
	 *
	 * <div class="warn-container">
	 * 	<span>WARNING</span>: If you want to use this parameter to OpenVidu Web Component statically, you have to replace the <strong>camelCase</strong> with a <strong>hyphen between words</strong>.</div>
	 *
	 * @example
	 * <openvidu-webcomponent audio-enabled="false"></openvidu-webcomponent>
	 */
	@Input() set audioEnabled(value: string | boolean) {
		this._audioEnabled = this.castToBoolean(value);
	}

	/**
	 * The **toolbarCameraButton** attribute allows show/hide the camera toolbar button.
	 *
	 * Default: `true`
	 *
	 * @example
	 * <openvidu-webcomponent toolbar-camera-button="false"></openvidu-webcomponent>
	 */
	@Input() set toolbarCameraButton(value: string | boolean) {
		this._toolbarCameraButton = this.castToBoolean(value);
	}

	/**
	 * The **toolbarMicrophoneButton** attribute allows show/hide the microphone toolbar button.
	 *
	 * Default: `true`
	 *
	 * @example
	 * <openvidu-webcomponent toolbar-microphone-button="false"></openvidu-webcomponent>
	 */

	@Input() set toolbarMicrophoneButton(value: string | boolean) {
		this._toolbarMicrophoneButton = this.castToBoolean(value);
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
	 * The **toolbarBroadcastingButton** attribute allows show/hide the start/stop broadcasting toolbar button.
	 *
	 * Default: `true`
	 *
	 * <div class="warn-container">
	 * 	<span>WARNING</span>: If you want to use this parameter to OpenVidu Web Component statically, you have to replace the <strong>camelCase</strong> with a <strong>hyphen between words</strong>.</div>
	 *
	 * @example
	 * <openvidu-webcomponent toolbar-broadcasting-button="false"></openvidu-webcomponent>
	 */
	@Input() set toolbarBroadcastingButton(value: string | boolean) {
		this._toolbarBroadcastingButton = this.castToBoolean(value);
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
	 * The **toolbarDisplayRoomName** attribute allows show/hide the room name.
	 *
	 * Default: `true`
	 *
	 * <div class="warn-container">
	 * 	<span>WARNING</span>: If you want to use this parameter to OpenVidu Web Component statically, you have to replace the <strong>camelCase</strong> with a <strong>hyphen between words</strong>.</div>
	 *
	 * @example
	 * <openvidu-webcomponent toolbar-display-room-name="false"></openvidu-webcomponent>
	 */
	@Input() set toolbarDisplayRoomName(value: string | boolean) {
		this._toolbarDisplayRoomName = this.castToBoolean(value);
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
	// TODO: Uncomment when captions are implemented
	// @Input() set toolbarCaptionsButton(value: string | boolean) {
	// 	this._toolbarCaptionsButton = this.castToBoolean(value);
	// }
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
	 * The **streamVideoControls** attribute allows show/hide the participants video controls in stream component.
	 *
	 * Default: `true`
	 *
	 * <div class="warn-container">
	 * 	<span>WARNING</span>: If you want to use this parameter to OpenVidu Web Component statically, you have to replace the <strong>camelCase</strong> with a <strong>hyphen between words</strong>.</div>
	 *
	 * @example
	 * <openvidu-webcomponent stream-video-controls="false"></openvidu-webcomponent>
	 */
	@Input() set streamVideoControls(value: string | boolean) {
		this._streamVideoControls = this.castToBoolean(value);
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
	 * The **activitiesPanelBroadcastingActivity** attribute allows show/hide the broadcasting activity in {@link ActivitiesPanelComponent}.
	 *
	 * Default: `true`
	 *
	 * @example
	 * <openvidu-webcomponent activity-panel-broadcasting-activity="false"></openvidu-webcomponent>
	 */
	@Input() set activitiesPanelBroadcastingActivity(value: string | boolean) {
		this._activitiesPanelBroadcastingActivity = this.castToBoolean(value);
	}

	/**
	 * Provides event notifications that fire when videconference is ready to received the token.
	 * This event emits the participant name as data.
	 */
	@Output() onTokenRequested: EventEmitter<string> = new EventEmitter<string>();

	/**
	 * Provides event notifications that fire when the participant is ready to join to the room. This event is only emitted when the prejoin page has been shown.
	 */
	@Output() onReadyToJoin: EventEmitter<void> = new EventEmitter<void>();

	/**
	 * This event is emitted when the room connection has been lost and the reconnection process has started.
	 */
	@Output() onRoomDisconnected: EventEmitter<void> = new EventEmitter<void>();

	/**
	 * This event is emitted when a participant leaves the room.
	 */
	@Output() onParticipantLeft: EventEmitter<ParticipantLeftEvent> = new EventEmitter<ParticipantLeftEvent>();

	/**
	 * This event is emitted when the video state changes, providing information about if the video is enabled (true) or disabled (false).
	 */
	@Output() onVideoEnabledChanged = new EventEmitter<boolean>();
	/**
	 * This event is emitted when the selected video device changes, providing information about the new custom device that has been selected.
	 */
	@Output() onVideoDeviceChanged = new EventEmitter<CustomDevice>();

	/**
	 * This event is emitted when the audio state changes, providing information about if the audio is enabled (true) or disabled (false).
	 */
	@Output() onAudioEnabledChanged = new EventEmitter<boolean>();
	/**
	 * This event is emitted when the selected audio device changes, providing information about the new custom device that has been selected.
	 */
	@Output() onAudioDeviceChanged = new EventEmitter<CustomDevice>();

	/**
	 * This event is emitted when the language changes, providing information about the new language that has been selected.
	 */
	@Output() onLangChanged: EventEmitter<LangOption> = new EventEmitter<LangOption>();

	/**
	 * This event is emitted when the screen share state changes, providing information about if the screen share is enabled (true) or disabled (false).
	 */
	@Output() onScreenShareEnabledChanged: EventEmitter<boolean> = new EventEmitter<boolean>();

	/**
	 * This event is emitted when the fullscreen state changes, providing information about if the fullscreen is enabled (true) or disabled (false).
	 */
	@Output() onFullscreenEnabledChanged: EventEmitter<boolean> = new EventEmitter<boolean>();

	/**
	 * This events is emitted when the settings panel status changes.
	 */
	@Output() onSettingsPanelStatusChanged = new EventEmitter<SettingsPanelStatusEvent>();
	/**
	 * This events is emitted when the participants panel status changes.
	 */
	@Output() onParticipantsPanelStatusChanged = new EventEmitter<ParticipantsPanelStatusEvent>();

	/**
	 * This events is emitted when the chat panel status changes.
	 */
	@Output() onChatPanelStatusChanged = new EventEmitter<ChatPanelStatusEvent>();

	/**
	 * This events is emitted when the activities panel status changes.
	 */
	@Output() onActivitiesPanelStatusChanged = new EventEmitter<ActivitiesPanelStatusEvent>();

	/**
	 * This event is fired when the user clicks on the start recording button.
	 * It provides the {@link RecordingStartRequestedEvent} payload as event data.
	 */
	@Output() onRecordingStartRequested: EventEmitter<RecordingStartRequestedEvent> = new EventEmitter<RecordingStartRequestedEvent>();
	/**
	 * Provides event notifications that fire when stop recording button has been clicked.
	 * It provides the {@link RecordingStopRequestedEvent} payload as event data.
	 */
	@Output() onRecordingStopRequested: EventEmitter<RecordingStopRequestedEvent> = new EventEmitter<RecordingStopRequestedEvent>();

	/**
	 * Provides event notifications that fire when delete recording button has been clicked.
	 * It provides the {@link RecordingDeleteRequestedEvent} payload as event data.
	 */
	@Output() onRecordingDeleteRequested: EventEmitter<RecordingDeleteRequestedEvent> = new EventEmitter<RecordingDeleteRequestedEvent>();

	/**
	 * Provides event notifications that fire when download recording button is clicked.
	 * It provides the {@link RecordingDownloadClickedEvent} payload as event data.
	 */
	@Output() onRecordingDownloadClicked: EventEmitter<RecordingDownloadClickedEvent> = new EventEmitter<RecordingDownloadClickedEvent>();

	/**
	 * Provides event notifications that fire when play recording button is clicked.
	 * It provides the {@link RecordingPlayClickedEvent} payload as event data.
	 */
	@Output() onRecordingPlayClicked: EventEmitter<RecordingPlayClickedEvent> = new EventEmitter<RecordingPlayClickedEvent>();

	/**
	 * Provides event notifications that fire when download recording button is clicked from {@link ActivitiesPanelComponent}.
	 *  The recording should be downloaded using the REST API.
	 */
	@Output() onActivitiesPanelDownloadRecordingClicked: EventEmitter<string> = new EventEmitter<string>();

	/**
	 * Provides event notifications that fire when start broadcasting button is clicked.
	 * It provides the {@link BroadcastingStartRequestedEvent} payload as event data.
	 */
	@Output() onBroadcastingStartRequested: EventEmitter<BroadcastingStartRequestedEvent> =
		new EventEmitter<BroadcastingStartRequestedEvent>();

	/**
	 * Provides event notifications that fire when stop broadcasting button is clicked.
	 * It provides the {@link BroadcastingStopRequestedEvent} payload as event data.
	 */
	@Output() onBroadcastingStopRequested: EventEmitter<BroadcastingStopRequestedEvent> =
		new EventEmitter<BroadcastingStopRequestedEvent>();

	/**
	 * Provides event notifications that fire when OpenVidu Room is created.
	 */
	@Output() onRoomCreated: EventEmitter<Room> = new EventEmitter<Room>();

	/**
	 * Provides event notifications that fire when local participant is created.
	 */
	@Output() onParticipantCreated: EventEmitter<ParticipantModel> = new EventEmitter<ParticipantModel>();

	/**
	 * @internal
	 */
	success: boolean = false;

	/**
	 * @internal
	 */
	constructor(
		private host: ElementRef,
		private openviduService: OpenViduService
	) {
		this.host.nativeElement.disconnect = this.disconnect.bind(this);
	}

	/**
	 * LivekitUrl parameter allows to grant a participant access to a Room.
	 * This parameter will be use by each participant when connecting to a Room.
	 *
	 * @example
	 * <openvidu-webcomponent livekit-url='http://localhost:1234'></openvidu-webcomponent>
	 *
	 */
	@Input('livekitUrl')
	set livekitUrl(value: string) {
		console.debug('Webcomponent livekit url: ', value);
		this._livekitUrl = value;
	}

	/**
	 * Token parameter is required to grant a participant access to a Room.
	 * This OpenVidu token will be use by each participant when connecting to a Room.
	 *
	 * @example
	 * <openvidu-webcomponent token='1234qwerxzc'></openvidu-webcomponent>
	 *
	 */
	@Input('token')
	set token(value: string) {
		console.debug('Webcomponent token: ', value);
		if (!value) {
			console.error('Token parameter is required');
			return;
		}
		this._token = value;
	}

	/**
	 * Use the 'tokenError' input to display an error message in case of issues during token request.
	 *
	 * @example
	 * <openvidu-webcomponent token-error='error'></openvidu-webcomponent>
	 *
	 */
	@Input('tokenError')
	set tokenError(value: any) {
		this._tokenError = value;
	}

	/**
	 * @internal
	 */
	_onParticipantLeft(event: ParticipantLeftEvent) {
		this.success = false;
		this.onParticipantLeft.emit(event);
	}

	/**
	 * Disconnects from the Livekit Room.
	 */
	disconnect() {
		this.openviduService.disconnectRoom();
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

	private castToArray(value: LangOption[] | /* CaptionsLangOption[] |*/ string) {
		if (typeof value === 'string') {
			try {
				return JSON.parse(value);
			} catch (error) {
				throw 'Unexpected JSON' + error;
			}
		} else if (typeof value === 'object' && value.length > 0) {
			return value;
		} else {
			throw new Error(
				`Parameter has not a valid type. The parameters must to be string or LangOption Array: [{name:string, lang: string}].`
			);
		}
	}
}
