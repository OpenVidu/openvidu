import { Builder, Key, WebDriver } from 'selenium-webdriver';
import { TestAppConfig } from './selenium.conf';
import { OpenViduComponentsPO } from './utils.po.test';

const url = TestAppConfig.appUrl;

describe('Testing videoconference EVENTS', () => {
	let browser: WebDriver;
	let utils: OpenViduComponentsPO;
	const isHeadless: boolean = (TestAppConfig.browserOptions as any).options_.args.includes('--headless');
	async function createChromeBrowser(): Promise<WebDriver> {
		return await new Builder()
			.forBrowser(TestAppConfig.browserName)
			.withCapabilities(TestAppConfig.browserCapabilities)
			.setChromeOptions(TestAppConfig.browserOptions)
			.usingServer(TestAppConfig.seleniumAddress)
			.build();
	}

	beforeEach(async () => {
		browser = await createChromeBrowser();
		utils = new OpenViduComponentsPO(browser);
	});

	afterEach(async () => {
		try {
			// leaving room if connected
			await utils.leaveRoom();
		} catch (error) {}
		await browser.quit();
	});

	it('should receive the onReadyToJoin event', async () => {
		await browser.get(`${url}`);

		await utils.waitForElement('#prejoin-container');
		expect(await utils.isPresent('#prejoin-container')).toBeTrue();

		// Clicking to join button
		await utils.waitForElement('#join-button');
		await utils.clickOn('#join-button');

		// Checking if onReadyToJoin has been received
		await utils.waitForElement('#onReadyToJoin');
		expect(await utils.isPresent('#onReadyToJoin')).toBeTrue();
	});

	it('should receive the onTokenRequested event', async () => {
		await browser.get(`${url}`);

		await utils.waitForElement('#prejoin-container');
		expect(await utils.isPresent('#prejoin-container')).toBeTrue();

		// Clicking to join button
		await utils.waitForElement('#join-button');
		await utils.clickOn('#join-button');

		// Checking if onTokenRequested has been received
		await utils.waitForElement('#onTokenRequested');
		expect(await utils.isPresent('#onTokenRequested')).toBeTrue();
	});

	it('should receive the onVideoEnabledChanged event when clicking on the prejoin', async () => {
		await browser.get(url);
		await utils.checkPrejoinIsPresent();

		await utils.waitForElement('#camera-button');
		await utils.clickOn('#camera-button');

		// Checking if onVideoEnabledChanged has been received
		await utils.waitForElement('#onVideoEnabledChanged-false');
		expect(await utils.isPresent('#onVideoEnabledChanged-false')).toBeTrue();
	});

	it('should receive the onVideoEnabledChanged event when clicking on the toolbar', async () => {
		await browser.get(`${url}&prejoin=false`);

		await utils.checkSessionIsPresent();

		await utils.checkToolbarIsPresent();

		// Clicking to leave button
		await utils.waitForElement('#camera-btn');
		await utils.clickOn('#camera-btn');

		// Checking if onVideoEnabledChanged has been received
		await utils.waitForElement('#onVideoEnabledChanged-false');
		expect(await utils.isPresent('#onVideoEnabledChanged-false')).toBeTrue();

		await utils.clickOn('#camera-btn');
		await utils.waitForElement('#onVideoEnabledChanged-true');
		expect(await utils.isPresent('#onVideoEnabledChanged-true')).toBeTrue();
	});

	it('should receive the onVideoDeviceChanged event on prejoin', async () => {
		await browser.get(`${url}&fakeDevices=true`);
		await utils.checkPrejoinIsPresent();

		await utils.waitForElement('#video-dropdown');
		await utils.clickOn('#video-dropdown');

		await utils.waitForElement('#option-custom_fake_video_1');
		await utils.clickOn('#option-custom_fake_video_1');

		await utils.waitForElement('#onVideoDeviceChanged');
		expect(await utils.isPresent('#onVideoDeviceChanged')).toBeTrue();
	});

	it('should receive the onVideoDeviceChanged event on settings panel', async () => {
		await browser.get(`${url}&prejoin=false&fakeDevices=true`);

		await utils.checkSessionIsPresent();

		await utils.checkToolbarIsPresent();
		await utils.togglePanel('settings');
		await browser.sleep(500);

		await utils.waitForElement('#settings-container');
		await utils.clickOn('#video-opt');

		await utils.waitForElement('ov-video-devices-select');
		await utils.waitForElement('#video-dropdown');
		await utils.clickOn('#video-dropdown');

		await utils.waitForElement('#option-custom_fake_video_1');
		await utils.clickOn('#option-custom_fake_video_1');

		await utils.waitForElement('#onVideoDeviceChanged');
		expect(await utils.isPresent('#onVideoDeviceChanged')).toBeTrue();
	});

	it('should receive the onAudioEnabledChanged event when clicking on the prejoin', async () => {
		await browser.get(url);
		await utils.checkPrejoinIsPresent();

		await utils.waitForElement('#microphone-button');
		await utils.clickOn('#microphone-button');

		// Checking if onAudioEnabledChanged has been received
		await utils.waitForElement('#onAudioEnabledChanged-false');
		expect(await utils.isPresent('#onAudioEnabledChanged-false')).toBeTrue();
	});

	it('should receive the onAudioEnabledChanged event when clicking on the toolbar', async () => {
		await browser.get(`${url}&prejoin=false`);

		await utils.checkSessionIsPresent();

		await utils.checkToolbarIsPresent();

		// Clicking to leave button
		await utils.waitForElement('#mic-btn');
		await utils.clickOn('#mic-btn');

		// Checking if onAudioEnabledChanged has been received
		await utils.waitForElement('#onAudioEnabledChanged-false');
		expect(await utils.isPresent('#onAudioEnabledChanged-false')).toBeTrue();

		await utils.clickOn('#mic-btn');
		await utils.waitForElement('#onAudioEnabledChanged-true');
		expect(await utils.isPresent('#onAudioEnabledChanged-true')).toBeTrue();
	});

	it('should receive the onAudioDeviceChanged event on prejoin', async () => {
		await browser.get(`${url}&fakeDevices=true`);
		await utils.checkPrejoinIsPresent();

		await utils.waitForElement('#audio-dropdown');
		await utils.clickOn('#audio-dropdown');

		await utils.waitForElement('#option-custom_fake_audio_1');
		await utils.clickOn('#option-custom_fake_audio_1');

		await utils.waitForElement('#onAudioDeviceChanged');
		expect(await utils.isPresent('#onAudioDeviceChanged')).toBeTrue();
	});

	it('should receive the onAudioDeviceChanged event on settings panel', async () => {
		await browser.get(`${url}&prejoin=false&fakeDevices=true`);

		await utils.checkSessionIsPresent();

		await utils.checkToolbarIsPresent();
		await utils.togglePanel('settings');
		await browser.sleep(500);

		await utils.waitForElement('#settings-container');
		await utils.clickOn('#audio-opt');

		await utils.waitForElement('ov-audio-devices-select');
		await utils.waitForElement('#audio-dropdown');
		await utils.clickOn('#audio-dropdown');

		await utils.waitForElement('#option-custom_fake_audio_1');
		await utils.clickOn('#option-custom_fake_audio_1');

		await utils.waitForElement('#onAudioDeviceChanged');
		expect(await utils.isPresent('#onAudioDeviceChanged')).toBeTrue();
	});

	it('should receive the onLangChanged event on prejoin', async () => {
		await browser.get(`${url}`);
		await utils.checkPrejoinIsPresent();

		await utils.waitForElement('.language-selector');
		await utils.clickOn('.language-selector');

		await browser.sleep(500);
		await utils.clickOn('#lang-opt-es');
		await browser.sleep(500);

		await utils.waitForElement('#onLangChanged-es');
		expect(await utils.isPresent('#onLangChanged-es')).toBeTrue();
	});

	it('should receive the onLangChanged event on settings panel', async () => {
		await browser.get(`${url}&prejoin=false`);

		await utils.checkSessionIsPresent();

		await utils.checkToolbarIsPresent();
		await utils.togglePanel('settings');
		await browser.sleep(500);

		await utils.waitForElement('#settings-container');
		await utils.waitForElement('.full-lang-button');
		await utils.clickOn('.full-lang-button');

		await browser.sleep(500);
		await utils.clickOn('#lang-opt-es');
		await browser.sleep(500);

		await utils.waitForElement('#onLangChanged-es');
		expect(await utils.isPresent('#onLangChanged-es')).toBeTrue();
	});

	it('should receive the onScreenShareEnabledChanged event', async () => {
		await browser.get(`${url}&prejoin=false`);

		await utils.checkSessionIsPresent();

		await utils.checkToolbarIsPresent();

		// Clicking to leave button
		const screenshareButton = await utils.waitForElement('#screenshare-btn');
		expect(await utils.isPresent('#screenshare-btn')).toBeTrue();
		await screenshareButton.click();

		// Checking if onScreenShareEnabledChanged has been received
		await utils.waitForElement('#onScreenShareEnabledChanged');
		expect(await utils.isPresent('#onScreenShareEnabledChanged')).toBeTrue();
	});

	// With headless mode, the Fullscreen API doesn't work
	it('should receive the onFullscreenEnabledChanged event', async () => {
		let element;
		await browser.get(`${url}&prejoin=false`);

		await utils.checkSessionIsPresent();

		await utils.checkToolbarIsPresent();

		await utils.toggleFullscreenFromToolbar();
		await browser.sleep(500);

		// Checking if onFullscreenEnabledChanged has been received
		await utils.waitForElement('#onFullscreenEnabledChanged-true');
		expect(await utils.isPresent('#onFullscreenEnabledChanged-true')).toBeTrue();

		await (await utils.waitForElement('html')).sendKeys(Key.F11);
		await browser.sleep(500);

		await utils.waitForElement('#onFullscreenEnabledChanged-false');
		expect(await utils.isPresent('#onFullscreenEnabledChanged-false')).toBeTrue();
	});

	it('should receive the onChatPanelStatusChanged event', async () => {
		await browser.get(`${url}&prejoin=false`);

		await utils.checkSessionIsPresent();

		await utils.checkToolbarIsPresent();

		await utils.togglePanel('chat');

		// Checking if onChatPanelStatusChanged has been received
		await utils.waitForElement('#onChatPanelStatusChanged-true');
		expect(await utils.isPresent('#onChatPanelStatusChanged-true')).toBeTrue();

		await utils.togglePanel('chat');

		// Checking if onChatPanelStatusChanged has been received
		await utils.waitForElement('#onChatPanelStatusChanged-false');
		expect(await utils.isPresent('#onChatPanelStatusChanged-false')).toBeTrue();
	});

	it('should receive the onParticipantsPanelStatusChanged event', async () => {
		await browser.get(`${url}&prejoin=false`);

		await utils.checkSessionIsPresent();

		await utils.checkToolbarIsPresent();

		await utils.togglePanel('participants');

		// Checking if onParticipantsPanelStatusChanged has been received
		await utils.waitForElement('#onParticipantsPanelStatusChanged-true');
		expect(await utils.isPresent('#onParticipantsPanelStatusChanged-true')).toBeTrue();

		await utils.togglePanel('participants');

		// Checking if onParticipantsPanelStatusChanged has been received
		await utils.waitForElement('#onParticipantsPanelStatusChanged-false');
		expect(await utils.isPresent('#onParticipantsPanelStatusChanged-false')).toBeTrue();
	});

	it('should receive the onActivitiesPanelStatusChanged event', async () => {
		await browser.get(`${url}&prejoin=false`);

		await utils.checkSessionIsPresent();
		await utils.checkToolbarIsPresent();

		await utils.togglePanel('activities');

		// Checking if onActivitiesPanelStatusChanged has been received
		await utils.waitForElement('#onActivitiesPanelStatusChanged-true');
		expect(await utils.isPresent('#onActivitiesPanelStatusChanged-true')).toBeTrue();

		await utils.togglePanel('activities');

		// Checking if onActivitiesPanelStatusChanged has been received
		await utils.waitForElement('#onActivitiesPanelStatusChanged-false');
		expect(await utils.isPresent('#onActivitiesPanelStatusChanged-false')).toBeTrue();
	});

	it('should receive the onSettingsPanelStatusChanged event', async () => {
		await browser.get(`${url}&prejoin=false`);

		await utils.checkSessionIsPresent();
		await utils.checkToolbarIsPresent();

		await utils.togglePanel('settings');

		// Checking if onSettingsPanelStatusChanged has been received
		await utils.waitForElement('#onSettingsPanelStatusChanged-true');
		expect(await utils.isPresent('#onSettingsPanelStatusChanged-true')).toBeTrue();

		await utils.togglePanel('settings');

		// Checking if onSettingsPanelStatusChanged has been received
		await utils.waitForElement('#onSettingsPanelStatusChanged-false');
		expect(await utils.isPresent('#onSettingsPanelStatusChanged-false')).toBeTrue();
	});

	fit('should receive the onRecordingStartRequested and onRecordingStopRequested event when clicking toolbar button', async () => {
		const roomName = 'recordingToolbarEvent';
		await browser.get(`${url}&prejoin=false&roomName=${roomName}`);

		await utils.checkSessionIsPresent();
		await utils.checkToolbarIsPresent();

		await utils.toggleRecordingFromToolbar();

		// Checking if onRecordingStartRequested has been received
		await utils.waitForElement(`#onRecordingStartRequested-${roomName}`);
		expect(await utils.isPresent(`#onRecordingStartRequested-${roomName}`)).toBeTrue();

		await utils.waitForElement('.activity-status.started');

		await utils.toggleRecordingFromToolbar();

		// Checking if onRecordingStopRequested has been received
		await utils.waitForElement(`#onRecordingStopRequested-${roomName}`);
		expect(await utils.isPresent(`#onRecordingStopRequested-${roomName}`)).toBeTrue();
	});

	xit('should receive the onBroadcastingStopRequested event when clicking toolbar button', async () => {
		await browser.get(`${url}&prejoin=false`);

		await utils.checkSessionIsPresent();
		await utils.checkToolbarIsPresent();

		await utils.toggleToolbarMoreOptions();

		await utils.waitForElement('#broadcasting-btn');
		await utils.clickOn('#broadcasting-btn');

		await browser.sleep(500);

		await utils.waitForElement('.sidenav-menu');
		await utils.waitForElement('#activities-container');

		await utils.waitForElement('#broadcasting-url-input');
		const input = await utils.waitForElement('#broadcast-url-input');
		await input.sendKeys('BroadcastUrl');
		await utils.clickOn('#broadcasting-btn');

		// Open more options menu
		await utils.toggleToolbarMoreOptions();

		await utils.waitForElement('#broadcasting-btn');
		await utils.clickOn('#broadcasting-btn');

		// Checking if onBroadcastingStopRequested has been received
		await utils.waitForElement('#onBroadcastingStopRequested');
		expect(await utils.isPresent('#onBroadcastingStopRequested')).toBeTrue();
	});

	it('should receive the onRecordingStartRequested and onRecordingStopRequested when clicking from activities panel', async () => {
		const roomName = 'recordingActivitiesEvent';
		await browser.get(`${url}&prejoin=false&roomName=${roomName}`);

		await utils.checkSessionIsPresent();
		await utils.checkToolbarIsPresent();

		await utils.togglePanel('activities');

		await browser.sleep(1000);

		// Open recording
		await utils.waitForElement('ov-recording-activity');
		await utils.clickOn('ov-recording-activity');

		await browser.sleep(1000);

		// Clicking to recording button
		await utils.waitForElement('#start-recording-btn');
		await utils.clickOn('#start-recording-btn');

		// Checking if onRecordingStartRequested has been received
		await utils.waitForElement(`#onRecordingStartRequested-${roomName}`);
		expect(await utils.isPresent(`#onRecordingStartRequested-${roomName}`)).toBeTrue();
	});

	xit('should receive the onRecordingDeleteRequested event', async () => {
		let element;
		const roomName = 'deleteRecordingEvent';
		await browser.get(`${url}&prejoin=false&roomName=${roomName}&fakeRecordings=true`);

		await utils.checkSessionIsPresent();

		await utils.checkToolbarIsPresent();

		// Clicking to activities button
		const activitiesButton = await utils.waitForElement('#activities-panel-btn');
		expect(await utils.isPresent('#activities-panel-btn')).toBeTrue();
		await activitiesButton.click();

		await browser.sleep(1500);
		// Open recording
		element = await utils.waitForElement('ov-recording-activity');
		await element.click();

		await browser.sleep(1500);

		// Delete event
		element = await utils.waitForElement('#delete-recording-btn');
		expect(await utils.isPresent('#delete-recording-btn')).toBeTrue();
		await element.click();

		element = await utils.waitForElement('#delete-recording-confirm-btn');
		expect(await utils.isPresent('#delete-recording-confirm-btn')).toBeTrue();
		await element.click();

		await utils.waitForElement(`#onRecordingDeleteRequested-${roomName}-fakeRecording`);
		expect(await utils.isPresent(`#onRecordingDeleteRequested-${roomName}-fakeRecording`)).toBeTrue();
	});

	it('should receive the onBroadcastingStartRequested event when clicking from panel', async () => {
		const roomName = 'broadcastingStartEvent';
		const broadcastUrl = 'BroadcastUrl';
		await browser.get(`${url}&prejoin=false&roomName=${roomName}`);

		await utils.checkSessionIsPresent();
		await utils.checkToolbarIsPresent();

		await utils.togglePanel('activities');

		await browser.sleep(1000);
		await utils.waitForElement('#broadcasting-activity');
		await utils.clickOn('#broadcasting-activity');

		await browser.sleep(1000);

		const button = await utils.waitForElement('#broadcasting-btn');
		expect(await button.isEnabled()).toBeFalse();

		const input = await utils.waitForElement('#broadcast-url-input');
		await input.sendKeys(broadcastUrl);

		await utils.clickOn('#broadcasting-btn');

		// Checking if onBroadcastingStartRequested has been received
		await utils.waitForElement(`#onBroadcastingStartRequested-${roomName}-${broadcastUrl}`);
		expect(await utils.isPresent(`#onBroadcastingStartRequested-${roomName}-${broadcastUrl}`)).toBeTrue();
	});

	xit('should receive the onBroadcastingStopRequested event when clicking from panel', async () => {
		await browser.get(`${url}&prejoin=false`);

		await utils.checkSessionIsPresent();
		await utils.checkToolbarIsPresent();

		// Open activities panel
		await utils.togglePanel('activities');

		await utils.waitForElement('#broadcasting-activity');
		await utils.clickOn('#broadcasting-activity');

		const button = await utils.waitForElement('#broadcasting-btn');
		expect(await button.isEnabled()).toBeFalse();

		const input = await utils.waitForElement('#broadcast-url-input');
		await input.sendKeys('BroadcastUrl');

		await utils.clickOn('#broadcasting-btn');

		expect(await utils.isPresent('#broadcasting-tag')).toBeTrue();

		await utils.clickOn('#stop-broadcasting-btn');

		// Checking if onBroadcastingStopRequested has been received
		await utils.waitForElement('#onBroadcastingStopRequested');
		expect(await utils.isPresent('#onBroadcastingStopRequested')).toBeTrue();
		expect(await utils.isPresent('#broadcasting-tag')).toBeFalse();
	});

	xit('should receive the onBroadcastingStopRequested event when clicking from toolbar', async () => {
		await browser.get(`${url}&prejoin=false`);

		await utils.checkSessionIsPresent();
		await utils.checkToolbarIsPresent();

		// Open more options menu
		await utils.toggleToolbarMoreOptions();
		await utils.waitForElement('#broadcasting-btn');
		await utils.clickOn('#broadcasting-btn');

		await browser.sleep(500);

		// Checking if onBroadcastingStopRequested has been received
		await utils.waitForElement('#onBroadcastingStopRequested');
		expect(await utils.isPresent('#onBroadcastingStopRequested')).toBeTrue();
		expect(await utils.isPresent('#broadcasting-tag')).toBeFalse();
	});

	it('should receive the onRoomCreated event', async () => {
		await browser.get(`${url}&prejoin=false`);

		await utils.checkSessionIsPresent();

		await utils.checkToolbarIsPresent();

		await utils.waitForElement('#onRoomCreated');
		expect(await utils.isPresent('#onRoomCreated')).toBeTrue();

		expect(await utils.isPresent('#onReadyToJoin')).toBeFalse();
	});

	// PARTICIPANT EVENTS

	it('should receive onParticipantCreated event from LOCAL participant', async () => {
		const participantName = 'TEST_USER';
		await browser.get(`${url}&participantName=${participantName}&prejoin=false`);
		await utils.waitForElement(`#${participantName}-onParticipantCreated`);
		expect(await utils.isPresent(`#${participantName}-onParticipantCreated`)).toBeTrue();
	});

	it('should receive the onParticipantLeft event', async () => {
		await browser.get(`${url}&prejoin=false&redirectToHome=false`);

		await utils.checkSessionIsPresent();

		await utils.checkToolbarIsPresent();

		// Clicking to leave button
		const leaveButton = await utils.waitForElement('#leave-btn');
		expect(await utils.isPresent('#leave-btn')).toBeTrue();
		await leaveButton.click();

		await utils.waitForElement('#events');
		// Checking if onParticipantLeft has been received
		await utils.waitForElement('#onParticipantLeft');
		expect(await utils.isPresent('#onParticipantLeft')).toBeTrue();
	});

	// * ROOM EVENTS

	//TODO: Implement a mechanism to emulate network disconnection
	// it('should receive the onRoomDisconnected event', async () => {
	// 	await browser.get(`${url}&prejoin=false`);

	// 	await utils.checkSessionIsPresent();

	// 	await utils.checkToolbarIsPresent();

	// 	// Emulate network disconnection
	// 	await utils.forceCloseWebsocket();

	// 	// Checking if onRoomDisconnected has been received
	// 	await utils.waitForElement('#onRoomDisconnected');
	// 	expect(await utils.isPresent('#onRoomDisconnected')).toBeTrue();
	// });
});
