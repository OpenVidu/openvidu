import monkeyPatchMediaDevices from './utils/media-devices.js';

var MINIMAL;
var LANG;
var CAPTIONS_LANG;
var CUSTOM_LANG_OPTIONS;
var CUSTOM_CAPTIONS_LANG_OPTIONS;
var PREJOIN;
var VIDEO_ENABLED;
var AUDIO_ENABLED;

var SCREENSHARE_BUTTON;
var FULLSCREEN_BUTTON;
var ACTIVITIES_PANEL_BUTTON;
var RECORDING_BUTTON;
var BROADCASTING_BUTTON;
var CHAT_PANEL_BUTTON;
var DISPLAY_LOGO;
var DISPLAY_ROOM_NAME;
var DISPLAY_PARTICIPANT_NAME;
var DISPLAY_AUDIO_DETECTION;
var VIDEO_CONTROLS;
var LEAVE_BUTTON;
var PARTICIPANT_MUTE_BUTTON;
var PARTICIPANTS_PANEL_BUTTON;
var ACTIVITIES_RECORDING_ACTIVITY;
var ACTIVITIES_BROADCASTING_ACTIVITY;
var RECORDING_ERROR;
var BROADCASTING_ERROR;
var TOOLBAR_SETTINGS_BUTTON;
var CAPTIONS_BUTTON;

var ROOM_NAME;
var FAKE_DEVICES;
var FAKE_RECORDINGS;

var PARTICIPANT_NAME;

var OPENVIDU_CALL_SERVER_URL;
// var OPENVIDU_SECRET;

document.addEventListener('DOMContentLoaded', () => {
	var url = new URL(window.location.href);

	OPENVIDU_CALL_SERVER_URL = url.searchParams.get('OV_URL');
	// OPENVIDU_SECRET = url.searchParams.get('OV_SECRET');

	FAKE_DEVICES = url.searchParams.get('fakeDevices') === null ? false : url.searchParams.get('fakeDevices') === 'true';

	FAKE_RECORDINGS = url.searchParams.get('fakeRecordings') === null ? false : url.searchParams.get('fakeRecordings') === 'true';

	// Directives
	MINIMAL = url.searchParams.get('minimal') === null ? false : url.searchParams.get('minimal') === 'true';
	LANG = url.searchParams.get('lang') || 'en';
	CUSTOM_LANG_OPTIONS = url.searchParams.get('langOptions') === null ? false : url.searchParams.get('langOptions') === 'true';
	// CAPTIONS_LANG = url.searchParams.get('captionsLang') || 'en-US';
	// CUSTOM_CAPTIONS_LANG_OPTIONS = url.searchParams.get('captionsLangOptions') === null ? false : url.searchParams.get('captionsLangOptions') === 'true';
	PARTICIPANT_NAME =
		url.searchParams.get('participantName') === null
			? 'TEST_USER' + Math.random().toString(36).substr(2, 9)
			: url.searchParams.get('participantName');
	PREJOIN = url.searchParams.get('prejoin') === null ? true : url.searchParams.get('prejoin') === 'true';
	VIDEO_ENABLED = url.searchParams.get('videoEnabled') === null ? true : url.searchParams.get('videoEnabled') === 'true';
	AUDIO_ENABLED = url.searchParams.get('audioEnabled') === null ? true : url.searchParams.get('audioEnabled') === 'true';
	SCREENSHARE_BUTTON = url.searchParams.get('screenshareBtn') === null ? true : url.searchParams.get('screenshareBtn') === 'true';
	RECORDING_BUTTON =
		url.searchParams.get('toolbarRecordingButton') === null ? true : url.searchParams.get('toolbarRecordingButton') === 'true';
	FULLSCREEN_BUTTON = url.searchParams.get('fullscreenBtn') === null ? true : url.searchParams.get('fullscreenBtn') === 'true';
	BROADCASTING_BUTTON =
		url.searchParams.get('toolbarBroadcastingButton') === null ? true : url.searchParams.get('toolbarBroadcastingButton') === 'true';

	if (url.searchParams.get('broadcastingError') !== null) {
		BROADCASTING_ERROR = url.searchParams.get('broadcastingError');
	}

	TOOLBAR_SETTINGS_BUTTON =
		url.searchParams.get('toolbarSettingsBtn') === null ? true : url.searchParams.get('toolbarSettingsBtn') === 'true';
	CAPTIONS_BUTTON = url.searchParams.get('toolbarCaptionsBtn') === null ? true : url.searchParams.get('toolbarCaptionsBtn') === 'true';

	LEAVE_BUTTON = url.searchParams.get('leaveBtn') === null ? true : url.searchParams.get('leaveBtn') === 'true';
	ACTIVITIES_PANEL_BUTTON =
		url.searchParams.get('activitiesPanelBtn') === null ? true : url.searchParams.get('activitiesPanelBtn') === 'true';
	CHAT_PANEL_BUTTON = url.searchParams.get('chatPanelBtn') === null ? true : url.searchParams.get('chatPanelBtn') === 'true';
	PARTICIPANTS_PANEL_BUTTON =
		url.searchParams.get('participantsPanelBtn') === null ? true : url.searchParams.get('participantsPanelBtn') === 'true';
	ACTIVITIES_BROADCASTING_ACTIVITY =
		url.searchParams.get('activitiesPanelBroadcastingActivity') === null
			? true
			: url.searchParams.get('activitiesPanelBroadcastingActivity') === 'true';
	ACTIVITIES_RECORDING_ACTIVITY =
		url.searchParams.get('activitiesPanelRecordingActivity') === null
			? true
			: url.searchParams.get('activitiesPanelRecordingActivity') === 'true';
	if (url.searchParams.get('recordingError') !== null) {
		RECORDING_ERROR = url.searchParams.get('recordingError');
	}

	DISPLAY_LOGO = url.searchParams.get('displayLogo') === null ? true : url.searchParams.get('displayLogo') === 'true';
	DISPLAY_ROOM_NAME = url.searchParams.get('displayRoomName') === null ? true : url.searchParams.get('displayRoomName') === 'true';
	DISPLAY_PARTICIPANT_NAME =
		url.searchParams.get('displayParticipantName') === null ? true : url.searchParams.get('displayParticipantName') === 'true';
	DISPLAY_AUDIO_DETECTION =
		url.searchParams.get('displayAudioDetection') === null ? true : url.searchParams.get('displayAudioDetection') === 'true';
	VIDEO_CONTROLS = url.searchParams.get('videoControls') === null ? true : url.searchParams.get('videoControls') === 'true';
	PARTICIPANT_MUTE_BUTTON =
		url.searchParams.get('participantMuteBtn') === null ? true : url.searchParams.get('participantMuteBtn') === 'true';

	ROOM_NAME = url.searchParams.get('roomName') === null ? `E2ESession${Math.floor(Date.now())}` : url.searchParams.get('roomName');

	var webComponent = document.querySelector('openvidu-webcomponent');

	webComponent.addEventListener('onTokenRequested', (event) => {
		appendElement('onTokenRequested');
		console.log('Token ready', event.detail);
		joinSession(ROOM_NAME, event.detail);
	});
	webComponent.addEventListener('onReadyToJoin', (event) => appendElement('onReadyToJoin'));
	webComponent.addEventListener('onRoomDisconnected', (event) => appendElement('onRoomDisconnected'));
	webComponent.addEventListener('onVideoEnabledChanged', (event) => appendElement('onVideoEnabledChanged-' + event.detail));
	webComponent.addEventListener('onVideoDeviceChanged', (event) => appendElement('onVideoDeviceChanged'));
	webComponent.addEventListener('onAudioEnabledChanged', (eSESSIONvent) => appendElement('onAudioEnabledChanged-' + event.detail));
	webComponent.addEventListener('onAudioDeviceChanged', (event) => appendElement('onAudioDeviceChanged'));
	webComponent.addEventListener('onScreenShareEnabledChanged', (event) => appendElement('onScreenShareEnabledChanged'));
	webComponent.addEventListener('onParticipantsPanelStatusChanged', (event) =>
		appendElement('onParticipantsPanelStatusChanged-' + event.detail.isOpened)
	);
	webComponent.addEventListener('onLangChanged', (event) => appendElement('onLangChanged-' + event.detail.lang));
	webComponent.addEventListener('onChatPanelStatusChanged', (event) =>
		appendElement('onChatPanelStatusChanged-' + event.detail.isOpened)
	);
	webComponent.addEventListener('onActivitiesPanelStatusChanged', (event) =>
		appendElement('onActivitiesPanelStatusChanged-' + event.detail.isOpened)
	);
	webComponent.addEventListener('onSettingsPanelStatusChanged', (event) =>
		appendElement('onSettingsPanelStatusChanged-' + event.detail.isOpened)
	);
	webComponent.addEventListener('onFullscreenEnabledChanged', (event) => appendElement('onFullscreenEnabledChanged-' + event.detail));

	webComponent.addEventListener('onRecordingStartRequested', async (event) => {
		appendElement('onRecordingStartRequested-' + event.detail.roomName);
		// Can't test the recording
		// RECORDING_ID = await startRecording(SESSION_NAME);
	});
	// Can't test the recording
	// webComponent.addEventListener('onRecordingStopRequested', async (event) => {
	//     appendElement('onRecordingStopRequested-' + event.detail.roomName);
	//     await stopRecording(RECORDING_ID);
	// });

	webComponent.addEventListener('onRecordingStopRequested', async (event) => {
		appendElement('onRecordingStopRequested-' + event.detail.roomName);
	});

	// Can't test the recording
	// webComponent.addEventListener('onActivitiesPanelStopRecordingClicked', async (event) => {
	//     appendElement('onActivitiesPanelStopRecordingClicked');
	//     await stopRecording(RECORDING_ID);
	// });

	webComponent.addEventListener('onRecordingDeleteRequested', (event) => {
		const { roomName, recordingId } = event.detail;
		appendElement(`onRecordingDeleteRequested-${roomName}-${recordingId}`);
	});

	webComponent.addEventListener('onBroadcastingStartRequested', async (event) => {
		const { roomName, broadcastUrl } = event.detail;
		appendElement(`onBroadcastingStartRequested-${roomName}-${broadcastUrl}`);
	});

	webComponent.addEventListener('onActivitiesPanelStopBroadcastingClicked', async (event) => {
		appendElement('onActivitiesPanelStopBroadcastingClicked');
	});

	webComponent.addEventListener('onRoomCreated', (event) => {
		var room = event.detail;
		appendElement('onRoomCreated');

		room.on('disconnected', (e) => {
			appendElement('roomDisconnected');
		});
	});

	webComponent.addEventListener('onParticipantCreated', (event) => {
		var participant = event.detail;
		appendElement(`${participant.name}-onParticipantCreated`);
	});

	setWebcomponentAttributes();
});

function setWebcomponentAttributes() {
	var webComponent = document.querySelector('openvidu-webcomponent');
	webComponent.participantName = PARTICIPANT_NAME;

	webComponent.minimal = MINIMAL;
	webComponent.lang = LANG;
	if (CUSTOM_LANG_OPTIONS) {
		webComponent.langOptions = [
			{ name: 'Esp', lang: 'es' },
			{ name: 'Eng', lang: 'en' }
		];
	}
	// TODO: Uncomment when the captions are implemented
	// webComponent.captionsLang = CAPTIONS_LANG;
	// if (CUSTOM_CAPTIONS_LANG_OPTIONS) {
	// 	webComponent.captionsLangOptions = [
	// 		{ name: 'Esp', lang: 'es-ES' },
	// 		{ name: 'Eng', lang: 'en-US' }
	// 	];
	// }
	if (FAKE_DEVICES) {
		console.warn('Using fake devices');
		monkeyPatchMediaDevices();
	}
	if (FAKE_RECORDINGS) {
		console.warn('Using fake recordings');
		webComponent.recordingActivityRecordingsList = [{ status: 'ready', filename: 'fakeRecording' }];
	}

	if (BROADCASTING_ERROR) {
		webComponent.broadcastingActivityBroadcastingError = { message: BROADCASTING_ERROR, broadcastAvailable: true };
	}
	webComponent.prejoin = PREJOIN;
	webComponent.videoEnabled = VIDEO_ENABLED;
	webComponent.audioEnabled = AUDIO_ENABLED;
	webComponent.toolbarScreenshareButton = SCREENSHARE_BUTTON;

	webComponent.toolbarFullscreenButton = FULLSCREEN_BUTTON;
	webComponent.toolbarSettingsButton = TOOLBAR_SETTINGS_BUTTON;
	// webComponent.toolbarCaptionsButton = CAPTIONS_BUTTON;
	webComponent.toolbarLeaveButton = LEAVE_BUTTON;
	webComponent.toolbarRecordingButton = RECORDING_BUTTON;
	webComponent.toolbarBroadcastingButton = BROADCASTING_BUTTON;
	webComponent.toolbarActivitiesPanelButton = ACTIVITIES_PANEL_BUTTON;
	webComponent.toolbarChatPanelButton = CHAT_PANEL_BUTTON;
	webComponent.toolbarParticipantsPanelButton = PARTICIPANTS_PANEL_BUTTON;
	webComponent.toolbarDisplayLogo = DISPLAY_LOGO;
	webComponent.toolbarDisplayRoomName = DISPLAY_ROOM_NAME;
	webComponent.streamDisplayParticipantName = DISPLAY_PARTICIPANT_NAME;
	webComponent.streamDisplayAudioDetection = DISPLAY_AUDIO_DETECTION;
	webComponent.streamVideoControls = VIDEO_CONTROLS;
	webComponent.participantPanelItemMuteButton = PARTICIPANT_MUTE_BUTTON;

	webComponent.activitiesPanelRecordingActivity = ACTIVITIES_RECORDING_ACTIVITY;
	webComponent.activitiesPanelBroadcastingActivity = ACTIVITIES_BROADCASTING_ACTIVITY;
	webComponent.recordingActivityRecordingError = RECORDING_ERROR;
}

function appendElement(id) {
	var eventsDiv = document.getElementById('events');
	eventsDiv.setAttribute('style', 'position: absolute;');
	var element = document.createElement('div');
	element.setAttribute('id', id);
	element.setAttribute('style', 'height: 1px;');
	eventsDiv.appendChild(element);
}

async function joinSession(roomName, participantName) {
	var webComponent = document.querySelector('openvidu-webcomponent');
	console.log('Joining session', roomName, participantName);
	try {
		webComponent.token = await getToken(roomName, participantName);
	} catch (error) {
		webComponent.tokenError = error;
	}
}

async function getToken(roomName, participantName) {
	try {
		const response = await fetch(OPENVIDU_CALL_SERVER_URL + '/call/api/rooms', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
				// 'Authorization': 'Basic ' + btoa('OPENVIDUAPP:' + OPENVIDU_SECRET),
			},
			body: JSON.stringify({
				participantName,
				roomName
			})
		});

		if (!response.ok) {
			throw new Error('Failed to fetch token');
		}

		const data = await response.json();
		return data.token;
	} catch (error) {
		console.error(error);
		throw error;
	}
}
