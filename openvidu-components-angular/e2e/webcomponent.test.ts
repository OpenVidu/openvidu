import { expect } from 'chai';
import { Builder, By, Key, WebDriver } from 'selenium-webdriver';
import { OPENVIDU_SECRET, OPENVIDU_SERVER_URL } from './config';
import { getBrowserOptionsWithoutDevices, WebComponentConfig } from './selenium.conf';
import { OpenViduComponentsPO } from './utils.po.test';

const url = `${WebComponentConfig.appUrl}?OV_URL=${OPENVIDU_SERVER_URL}&OV_SECRET=${OPENVIDU_SECRET}`;

describe('Testing API Directives', () => {
	let browser: WebDriver;
	let utils: OpenViduComponentsPO;
	async function createChromeBrowser(): Promise<WebDriver> {
		return await new Builder()
			.forBrowser(WebComponentConfig.browserName)
			.withCapabilities(WebComponentConfig.browserCapabilities)
			.setChromeOptions(WebComponentConfig.browserOptions)
			.usingServer(WebComponentConfig.seleniumAddress)
			.build();
	}

	beforeEach(async () => {
		browser = await createChromeBrowser();
		utils = new OpenViduComponentsPO(browser);
	});

	afterEach(async () => {
		// console.log('data:image/png;base64,' + await browser.takeScreenshot());
		await browser.quit();
	});

	it('should join with ONLY ONE TOKEN', async () => {
		await browser.get(`${url}&singleToken=true`);

		// Checking if prejoin page exist
		await utils.checkPrejoinIsPresent();

		const joinButton = await utils.waitForElement('#join-button');
		await joinButton.click();

		// Checking if session container is present
		await utils.checkSessionIsPresent();

		await utils.checkToolbarIsPresent();

		// Checking if screenshare button is not present
		expect(await utils.isPresent('#screenshare-btn')).to.be.false;
	});

	it('should set the MINIMAL UI', async () => {
		await browser.get(`${url}&minimal=true`);
		// Checking if prejoin page exist
		await utils.checkPrejoinIsPresent();

		// Checking if layout is present
		await utils.checkLayoutPresent();

		// Checking if stream component is present
		utils.checkStreamIsPresent();

		// Checking if audio detection is not displayed
		expect(await utils.isPresent('#audio-wave-container')).to.be.false;

		const joinButton = await utils.waitForElement('#join-button');
		await joinButton.click();

		// Checking if session container is present
		await utils.checkSessionIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		// Checking if screenshare button is not present
		expect(await utils.isPresent('#screenshare-btn')).to.be.false;

		// Checking if more options button is not present
		expect(await utils.isPresent('#more-options-btn')).to.be.false;

		// Checking if participants panel button is not present
		expect(await utils.isPresent('#participants-panel-btn')).to.be.false;

		// Checking if activities panel button is not present
		expect(await utils.isPresent('#activities-panel-btn')).to.be.false;

		// Checking if logo is not displayed
		expect(await utils.isPresent('#branding-logo')).to.be.false;

		// Checking if session name is not displayed
		expect(await utils.isPresent('#session-name')).to.be.false;

		// Checking if nickname is not displayed
		await browser.findElements(By.id('nickname-container'));
		expect(await utils.isPresent('#nickname-container')).to.be.false;

		// Checking if audio detection is not displayed
		expect(await utils.isPresent('#audio-wave-container')).to.be.false;

		// Checking if settings button is not displayed
		expect(await utils.isPresent('#settings-container')).to.be.false;
	});

	it('should change the UI LANG ', async () => {
		await browser.get(`${url}&lang=es`);

		await utils.checkPrejoinIsPresent();

		let element = await utils.waitForElement('.lang-button');
		expect(await element.getText()).equal('Españolexpand_more');

		element = await utils.waitForElement('#join-button');
		expect(await element.getText()).equal('Unirme ahora');
	});

	it('should show the PREJOIN page', async () => {
		await browser.get(`${url}&prejoin=true`);

		await utils.checkPrejoinIsPresent();
	});

	it('should not show the PREJOIN page', async () => {
		await browser.get(`${url}&prejoin=false`);

		await utils.checkSessionIsPresent();
	});

	it('should run the app with VIDEO MUTED in prejoin page', async () => {
		try {
			let idVideoEnabled;
		const script = 'return document.getElementsByTagName("video")[0].srcObject.getVideoTracks()[0].enabled;';

		await browser.get(`${url}&prejoin=true&videoMuted=true`);

		await utils.checkPrejoinIsPresent();

		// Checking if video is displayed
		await utils.checkVideoElementIsPresent();

		// Checking if virtual background button is disabled
		const button = await utils.waitForElement('#background-effects-btn');
		expect(await button.isEnabled()).to.be.false;

		// Checking if video track is disabled/muted
		idVideoEnabled = await browser.executeScript<boolean>(script);
		expect(idVideoEnabled).to.be.false;

		await utils.waitForElement('#videocam_off');
		await utils.clickOn('#join-button');

		// Checking if video is muted after join the room
		await utils.checkSessionIsPresent();

		idVideoEnabled = await browser.executeScript<boolean>(script);
		expect(idVideoEnabled).to.be.false;

		await utils.waitForElement('#videocam_off');
		expect(await utils.isPresent('#videocam_off')).to.be.true;
		} catch (error) {
			console.log(error);
			console.log(await browser.takeScreenshot());
		}

	});

	it('should run the app with VIDEO MUTED and WITHOUT PREJOIN page', async () => {
		let isVideoEnabled;
		const videoEnableScript = 'return document.getElementsByTagName("video")[0].srcObject.getVideoTracks()[0].enabled;';

		await browser.get(`${url}&prejoin=false&videoMuted=true`);

		await browser.sleep(2000);

		await utils.checkSessionIsPresent();

		await utils.checkLayoutPresent();

		// Checking if video is displayed
		await utils.checkVideoElementIsPresent();

		// Checking if video track is disabled/muted
		isVideoEnabled = await browser.executeScript(videoEnableScript);
		expect(isVideoEnabled).to.be.false;

		await utils.waitForElement('#videocam_off');
		expect(await utils.isPresent('#videocam_off')).to.be.true;
	});

	it('should run the app with AUDIO MUTED in prejoin page', async () => {
		let isAudioEnabled;
		const script = 'return document.getElementsByTagName("video")[0].srcObject.getAudioTracks()[0].enabled;';

		await browser.get(`${url}&audioMuted=true`);

		await utils.checkPrejoinIsPresent();

		// Checking if video is displayed
		await utils.checkVideoElementIsPresent();

		// Checking if audio track is disabled/muted
		isAudioEnabled = await browser.executeScript(script);
		expect(isAudioEnabled).to.be.false;

		await utils.waitForElement('#mic_off');
		expect(await utils.isPresent('#mic_off')).to.be.true;

		await utils.clickOn('#join-button');

		// Checking if audio is muted after join the room
		await utils.checkSessionIsPresent();
		isAudioEnabled = await browser.executeScript(script);
		expect(isAudioEnabled).to.be.false;

		await utils.waitForElement('#mic_off');
		expect(await utils.isPresent('#mic_off')).to.be.true;
	});

	it('should run the app with VIDEO MUTED and WITHOUT PREJOIN page', async () => {
		let isAudioEnabled;
		const audioEnableScript = 'return document.getElementsByTagName("video")[0].srcObject.getAudioTracks()[0].enabled;';

		await browser.get(`${url}&prejoin=false&audioMuted=true`);

		await utils.checkSessionIsPresent();

		// Checking if video is displayed
		await utils.checkVideoElementIsPresent();

		// Checking if audio track is disabled/muted
		isAudioEnabled = await browser.executeScript(audioEnableScript);
		expect(isAudioEnabled).to.be.false;

		await utils.waitForElement('#mic_off');
		expect(await utils.isPresent('#mic_off')).to.be.true;
	});

	it('should HIDE the SCREENSHARE button', async () => {
		await browser.get(`${url}&prejoin=false&screenshareBtn=false`);

		await utils.checkSessionIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		// Checking if screenshare button is not present
		expect(await utils.isPresent('#screenshare-btn')).to.be.false;
	});

	it('should HIDE the FULLSCREEN button', async () => {
		await browser.get(`${url}&prejoin=false&fullscreenBtn=false`);

		await utils.checkSessionIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		// Open more options menu
		await utils.clickOn('#more-options-btn');

		await browser.sleep(500);

		// Checking if fullscreen button is not present
		await utils.waitForElement('.mat-menu-content');
		expect(await utils.isPresent('.mat-menu-content')).to.be.true;

		await browser.findElements(By.id('fullscreen-btn'));
		expect(await utils.isPresent('#fullscreen-btn')).to.be.false;
	});

	it('should HIDE the CAPTIONS button', async () => {
		await browser.get(`${url}&prejoin=false&toolbarCaptionsBtn=false`);

		await utils.checkSessionIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		// Open more options menu
		await utils.clickOn('#more-options-btn');

		await browser.sleep(500);

		// Checking if button panel is present
		await utils.waitForElement('.mat-menu-content');
		expect(await utils.isPresent('.mat-menu-content')).to.be.true;

		// Checking if captions button is not present
		expect(await utils.isPresent('#captions-btn')).to.be.false;

		await utils.clickOn('#toolbar-settings-btn');

		await browser.sleep(500);

		await utils.waitForElement('.settings-container');
		expect(await utils.isPresent('.settings-container')).to.be.true;

		expect(await utils.isPresent('#captions-opt')).to.be.false;
	});

	it('should HIDE the TOOLBAR RECORDING button', async () => {
		await browser.get(`${url}&prejoin=false&toolbarRecordingButton=false`);

		await utils.checkSessionIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		// Open more options menu
		await utils.clickOn('#more-options-btn');

		await browser.sleep(500);

		// Checking if button panel is present
		await utils.waitForElement('.mat-menu-content');
		expect(await utils.isPresent('.mat-menu-content')).to.be.true;

		// Checking if recording button is not present
		expect(await utils.isPresent('#recording-btn')).to.be.false;
	});

	it('should HIDE the TOOLBAR BROADCASTING button', async () => {
		await browser.get(`${url}&prejoin=false&toolbarBroadcastingButton=false`);

		await utils.checkSessionIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		// Open more options menu
		await utils.clickOn('#more-options-btn');

		await browser.sleep(500);

		// Checking if button panel is present
		await utils.waitForElement('.mat-menu-content');
		expect(await utils.isPresent('.mat-menu-content')).to.be.true;

		// Checking if broadcasting button is not present
		expect(await utils.isPresent('#broadcasting-btn')).to.be.false;
	});

	it('should HIDE the TOOLBAR SETTINGS button', async () => {
		await browser.get(`${url}&prejoin=false&toolbarSettingsBtn=false`);

		await utils.checkSessionIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		// Open more options menu
		await utils.clickOn('#more-options-btn');

		await browser.sleep(500);

		// Checking if fullscreen button is not present
		await utils.waitForElement('.mat-menu-content');
		expect(await utils.isPresent('.mat-menu-content')).to.be.true;

		expect(await utils.isPresent('#toolbar-settings-btn')).to.be.false;
	});

	it('should HIDE the LEAVE button', async () => {
		await browser.get(`${url}&prejoin=false&leaveBtn=false`);

		await utils.checkSessionIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		// Checking if leave button is not present
		await browser.findElements(By.id('leave-btn'));
		expect(await utils.isPresent('#leave-btn')).to.be.false;
	});

	it('should HIDE the ACTIVITIES PANEL button', async () => {
		await browser.get(`${url}&prejoin=false&activitiesPanelBtn=false`);

		await utils.checkSessionIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		// Checking if activities panel button is not present
		expect(await utils.isPresent('#activities-panel-btn')).to.be.false;
	});

	it('should HIDE the CHAT PANEL button', async () => {
		await browser.get(`${url}&prejoin=false&chatPanelBtn=false`);

		await utils.checkSessionIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		// Checking if chat panel button is not present
		expect(await utils.isPresent('#chat-panel-btn')).to.be.false;
	});

	it('should HIDE the PARTICIPANTS PANEL button', async () => {
		await browser.get(`${url}&prejoin=false&participantsPanelBtn=false`);

		await utils.checkSessionIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		// Checking if participants panel button is not present
		expect(await utils.isPresent('#participants-panel-btn')).to.be.false;
	});

	it('should HIDE the LOGO', async () => {
		await browser.get(`${url}&prejoin=false&displayLogo=false`);

		await utils.checkSessionIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		// Checking if toolbar is present
		await utils.waitForElement('#info-container');
		expect(await utils.isPresent('#info-container')).to.be.true;

		// Checking if logo is not displayed
		expect(await utils.isPresent('#branding-logo')).to.be.false;
	});

	it('should HIDE the SESSION NAME', async () => {
		await browser.get(`${url}&prejoin=false&displaySessionName=false`);

		await utils.checkSessionIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		// Checking if toolbar is present
		await utils.waitForElement('#info-container');
		expect(await utils.isPresent('#info-container')).to.be.true;

		// Checking if session name is not displayed
		expect(await utils.isPresent('#session-name')).to.be.false;
	});

	it('should HIDE the PARTICIPANT NAME', async () => {
		await browser.get(`${url}&prejoin=false&displayParticipantName=false`);

		await utils.checkSessionIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		// Checking if stream component is present
		await utils.checkStreamIsPresent();

		// Checking if nickname is not present
		expect(await utils.isPresent('#nickname-container')).to.be.false;
	});

	it('should HIDE the AUDIO DETECTION element', async () => {
		await browser.get(`${url}&prejoin=false&displayAudioDetection=false`);

		await utils.checkSessionIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		// Checking if stream component is present
		await utils.checkStreamIsPresent();

		// Checking if audio detection is not present
		expect(await utils.isPresent('#audio-wave-container')).to.be.false;
	});

	it('should HIDE the STREAM SETTINGS button', async () => {
		await browser.get(`${url}&prejoin=false&settingsBtn=false`);

		await utils.checkSessionIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		// Checking if stream component is present
		await utils.checkStreamIsPresent();

		// Checking if settings button is not present
		expect(await utils.isPresent('#settings-container')).to.be.false;
	});

	it('should HIDE the MUTE button in participants panel', async () => {
		const sessionName = 'e2etest';
		const fixedUrl = `${url}&prejoin=false&participantMuteBtn=false&sessionName=${sessionName}`;
		await browser.get(fixedUrl);

		await utils.checkSessionIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		const participantsButton = await utils.waitForElement('#participants-panel-btn');
		await participantsButton.click();

		// Checking if participatns panel is displayed
		await utils.waitForElement('#participants-container');
		expect(await utils.isPresent('#participants-container')).to.be.true;

		// Checking remote participants item
		expect(await utils.isPresent('#remote-participant-item')).to.be.false;

		// Starting new browser for adding a new participant
		const newTabScript = `window.open("${fixedUrl}")`;
		await browser.executeScript(newTabScript);

		// Go to first tab
		const tabs = await browser.getAllWindowHandles();
		await browser.switchTo().window(tabs[0]);

		// Checking if mute button is not displayed in participant item
		await utils.waitForElement('#remote-participant-item');
		expect(await utils.isPresent('#remote-participant-item')).to.be.true;

		expect(await utils.isPresent('#mute-btn')).to.be.false;
	});

	it('should HIDE the RECORDING ACTIVITY in activities panel', async () => {
		let element;
		const fixedUrl = `${url}&prejoin=false&activitiesPanelRecordingActivity=false`;
		await browser.get(fixedUrl);

		await utils.checkSessionIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		element = await utils.waitForElement('#activities-panel-btn');
		await element.click();

		// Checking if participatns panel is displayed
		await utils.waitForElement('#default-activities-panel');
		expect(await utils.isPresent('#default-activities-panel')).to.be.true;

		// await browser.sleep(1000);

		// Checking if recording activity exists
		await utils.waitForElement('.activities-body-container');
		expect(await utils.isPresent('ov-recording-activity')).to.be.false;
	});

	it('should SHOW a RECORDING ERROR in activities panel', async () => {
		let element;
		const fixedUrl = `${url}&prejoin=false&recordingError=TEST_ERROR`;
		await browser.get(fixedUrl);

		await utils.checkSessionIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		element = await utils.waitForElement('#activities-panel-btn');
		await element.click();

		// Checking if participatns panel is displayed
		await utils.waitForElement('#default-activities-panel');
		expect(await utils.isPresent('#default-activities-panel')).to.be.true;

		// Checking if recording activity exists
		await utils.waitForElement('#activities-container');
		await utils.waitForElement('.activities-body-container');

		await utils.waitForElement('ov-recording-activity');
		expect(await utils.isPresent('ov-recording-activity')).to.be.true;

		await utils.waitForElement('.failed');
		expect(await utils.isPresent('.failed')).to.be.true;

		// Open recording
		await browser.sleep(1000);
		element = await utils.waitForElement('ov-recording-activity');
		await element.click();

		element = await utils.waitForElement('.recording-error');
		expect(await element.getAttribute('innerText')).equal('"TEST_ERROR"');
		expect(await utils.isPresent('.recording-error')).to.be.true;
	});

	it('should SHOW a BROADCASTING ERROR in activities panel', async () => {
		let element;
		const fixedUrl = `${url}&prejoin=false&broadcastingError=TEST_ERROR`;
		await browser.get(fixedUrl);

		await utils.checkSessionIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		element = await utils.waitForElement('#activities-panel-btn');
		await element.click();

		// Checking if participatns panel is displayed
		await utils.waitForElement('#default-activities-panel');
		expect(await utils.isPresent('#default-activities-panel')).to.be.true;

		// Checking if broadcasting activity exists
		await utils.waitForElement('#activities-container');
		await utils.waitForElement('.activities-body-container');

		await utils.waitForElement('ov-broadcasting-activity');
		expect(await utils.isPresent('ov-broadcasting-activity')).to.be.true;

		const status = await utils.waitForElement('#broadcasting-status');
		expect(await status.getAttribute('innerText')).equals('FAILED');

		// Open broadcasting
		await browser.sleep(1000);
		await utils.clickOn('ov-broadcasting-activity');

		element = await utils.waitForElement('#broadcasting-error');
		expect(await element.getAttribute('innerText')).equal('TEST_ERROR');
	});

	it('should HIDE the BROADCASTING ACTIVITY in activities panel', async () => {
		await browser.get(`${url}&prejoin=false&activitiesPanelBroadcastingActivity=false`);

		await utils.checkSessionIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		await utils.waitForElement('#activities-panel-btn');
		await utils.clickOn('#activities-panel-btn')

		// Checking if participatns panel is displayed
		await utils.waitForElement('#default-activities-panel');
		expect(await utils.isPresent('#default-activities-panel')).to.be.true;

		// await browser.sleep(1000);

		// Checking if recording activity exists
		await utils.waitForElement('.activities-body-container');
		expect(await utils.isPresent('ov-broadcasting-activity')).to.be.false;
	});
});

describe('Testing videoconference EVENTS', () => {
	let browser: WebDriver;
	let utils: OpenViduComponentsPO;
	async function createChromeBrowser(): Promise<WebDriver> {
		return await new Builder()
			.forBrowser(WebComponentConfig.browserName)
			.withCapabilities(WebComponentConfig.browserCapabilities)
			.setChromeOptions(WebComponentConfig.browserOptions)
			.usingServer(WebComponentConfig.seleniumAddress)
			.build();
	}

	beforeEach(async () => {
		browser = await createChromeBrowser();
		utils = new OpenViduComponentsPO(browser);
	});

	afterEach(async () => {
		await browser.quit();
	});

	it('should receive the onJoinButtonClicked event', async () => {
		await browser.get(`${url}`);

		await utils.waitForElement('#prejoin-container');
		expect(await utils.isPresent('#prejoin-container')).to.be.true;

		// Clicking to join button
		await utils.waitForElement('#join-button');
		await utils.clickOn('#join-button');

		// Checking if onJoinButtonClicked has been received
		await utils.waitForElement('#onJoinButtonClicked');
		expect(await utils.isPresent('#onJoinButtonClicked')).to.be.true;
	});

	it('should receive the onToolbarLeaveButtonClicked event', async () => {
		await browser.get(`${url}&prejoin=false`);

		await utils.checkSessionIsPresent();

		await utils.checkToolbarIsPresent();

		// Clicking to leave button
		const leaveButton = await utils.waitForElement('#leave-btn');
		expect(await utils.isPresent('#leave-btn')).to.be.true;
		await leaveButton.click();

		// Checking if onToolbarLeaveButtonClicked has been received
		await utils.waitForElement('#onToolbarLeaveButtonClicked');
		expect(await utils.isPresent('#onToolbarLeaveButtonClicked')).to.be.true;
	});

	it('should receive the onToolbarCameraButtonClicked event', async () => {
		await browser.get(`${url}&prejoin=false`);

		await utils.checkSessionIsPresent();

		await utils.checkToolbarIsPresent();

		// Clicking to leave button
		const cameraButton = await utils.waitForElement('#camera-btn');
		expect(await utils.isPresent('#camera-btn')).to.be.true;
		await cameraButton.click();

		// Checking if onToolbarCameraButtonClicked has been received
		await utils.waitForElement('#onToolbarCameraButtonClicked');
		expect(await utils.isPresent('#onToolbarCameraButtonClicked')).to.be.true;
	});

	it('should receive the onToolbarMicrophoneButtonClicked event', async () => {
		await browser.get(`${url}&prejoin=false`);

		await utils.checkSessionIsPresent();

		await utils.checkToolbarIsPresent();

		// Clicking to mic button
		const micButton = await utils.waitForElement('#mic-btn');
		expect(await utils.isPresent('#mic-btn')).to.be.true;
		await micButton.click();

		// Checking if onToolbarMicrophoneButtonClicked has been received
		await utils.waitForElement('#onToolbarMicrophoneButtonClicked');
		expect(await utils.isPresent('#onToolbarMicrophoneButtonClicked')).to.be.true;
	});

	it('should receive the onToolbarScreenshareButtonClicked event', async () => {
		await browser.get(`${url}&prejoin=false`);

		await utils.checkSessionIsPresent();

		await utils.checkToolbarIsPresent();

		// Clicking to leave button
		const screenshareButton = await utils.waitForElement('#screenshare-btn');
		expect(await utils.isPresent('#screenshare-btn')).to.be.true;
		await screenshareButton.click();

		// Checking if onToolbarScreenshareButtonClicked has been received
		await utils.waitForElement('#onToolbarScreenshareButtonClicked');
		expect(await utils.isPresent('#onToolbarScreenshareButtonClicked')).to.be.true;
	});

	it('should receive the onToolbarFullscreenButtonClicked event', async () => {
		let element;
		await browser.get(`${url}&prejoin=false`);

		await utils.checkSessionIsPresent();

		await utils.checkToolbarIsPresent();

		// Open more options menu
		element = await utils.waitForElement('#more-options-btn');
		expect(await utils.isPresent('#more-options-btn')).to.be.true;
		await element.click();

		// Clicking to fullscreen button
		await utils.waitForElement('.mat-menu-content');

		const fullscreenButton = await utils.waitForElement('#fullscreen-btn');
		expect(await utils.isPresent('#fullscreen-btn')).to.be.true;
		await fullscreenButton.click();

		// Checking if onToolbarFullscreenButtonClicked has been received
		await utils.waitForElement('#onToolbarFullscreenButtonClicked');
		expect(await utils.isPresent('#onToolbarFullscreenButtonClicked')).to.be.true;
	});

	it('should receive the onToolbarChatPanelButtonClicked event', async () => {
		await browser.get(`${url}&prejoin=false`);

		await utils.checkSessionIsPresent();

		await utils.checkToolbarIsPresent();

		// Clicking to chat button
		const chatButton = await utils.waitForElement('#chat-panel-btn');
		await chatButton.click();

		// Checking if onToolbarChatPanelButtonClicked has been received
		await utils.waitForElement('#onToolbarChatPanelButtonClicked');
		expect(await utils.isPresent('#onToolbarChatPanelButtonClicked')).to.be.true;
	});

	it('should receive the onToolbarParticipantsPanelButtonClicked event', async () => {
		await browser.get(`${url}&prejoin=false`);

		await utils.checkSessionIsPresent();

		await utils.checkToolbarIsPresent();

		// Clicking to participants button
		const participantsButton = await utils.waitForElement('#participants-panel-btn');
		await participantsButton.click();

		// Checking if onToolbarParticipantsPanelButtonClicked has been received
		await utils.waitForElement('#onToolbarParticipantsPanelButtonClicked');
		expect(await utils.isPresent('#onToolbarParticipantsPanelButtonClicked')).to.be.true;
	});

	it('should receive the onToolbarActivitiesPanelButtonClicked event', async () => {
		await browser.get(`${url}&prejoin=false`);

		await utils.checkSessionIsPresent();

		await utils.checkToolbarIsPresent();

		// Clicking to activities button
		const activitiesButton = await utils.waitForElement('#activities-panel-btn');
		await activitiesButton.click();

		// Checking if onToolbarActivitiesPanelButtonClicked has been received
		await utils.waitForElement('#onToolbarActivitiesPanelButtonClicked');
		expect(await utils.isPresent('#onToolbarActivitiesPanelButtonClicked')).to.be.true;
	});

	it('should receive the onToolbarStartRecordingClicked event', async () => {
		await browser.get(`${url}&prejoin=false`);

		await utils.checkSessionIsPresent();
		await utils.checkToolbarIsPresent();

		// Open more options menu
		await utils.waitForElement('#more-options-btn');
		expect(await utils.isPresent('#more-options-btn')).to.be.true;
		await utils.clickOn('#more-options-btn');

		await browser.sleep(500);

		// Clicking to recording button
		await utils.waitForElement('.mat-menu-content');

		await utils.waitForElement('#recording-btn');
		expect(await utils.isPresent('#recording-btn')).to.be.true;
		await utils.clickOn('#recording-btn');

		// Checking if onToolbarStartRecordingClicked has been received
		await utils.waitForElement('#onToolbarStartRecordingClicked');
		expect(await utils.isPresent('#onToolbarStartRecordingClicked')).to.be.true;
	});

	// TODO: it needs an OpenVidu PRO
	// it('should receive the onToolbarStopBroadcastingClicked event', async () => {
	// 	await browser.get(`${url}&prejoin=false`);

	// 	await utils.checkSessionIsPresent();
	// 	await utils.checkToolbarIsPresent();

	// 	// Open more options menu
	// 	await utils.waitForElement('#more-options-btn');
	// 	expect(await utils.isPresent('#more-options-btn')).to.be.true;
	// 	await utils.clickOn('#more-options-btn');

	// 	await browser.sleep(500);

	// 	await utils.waitForElement('.mat-menu-content');

	// 	await utils.waitForElement('#broadcasting-btn');
	// 	await utils.clickOn('#broadcasting-btn');

	// 	await browser.sleep(500);

	// 	await utils.waitForElement('.sidenav-menu');
	// 	await utils.waitForElement('#activities-container');

	// 	await utils.waitForElement('#broadcasting-url-input');
	// 	const input = await utils.waitForElement('#broadcast-url-input');
	// 	await input.sendKeys('BroadcastUrl');
	// 	await utils.clickOn('#broadcasting-btn');

	// 	// Open more options menu
	// 	await utils.waitForElement('#more-options-btn');
	// 	expect(await utils.isPresent('#more-options-btn')).to.be.true;
	// 	await utils.clickOn('#more-options-btn');

	// 	await browser.sleep(500);

	// 	await utils.waitForElement('.mat-menu-content');

	// 	await utils.waitForElement('#broadcasting-btn');
	// 	await utils.clickOn('#broadcasting-btn');

	// 	// Checking if onToolbarStopBroadcastingClicked has been received
	// 	await utils.waitForElement('#onToolbarStopBroadcastingClicked');
	// 	expect(await utils.isPresent('#onToolbarStopBroadcastingClicked')).to.be.true;
	// });

	it('should receive the onActivitiesPanelStartRecordingClicked event', async () => {
		let element;
		await browser.get(`${url}&prejoin=false`);

		await utils.checkSessionIsPresent();

		await utils.checkToolbarIsPresent();

		// Open activities panel
		element = await utils.waitForElement('#activities-panel-btn');
		expect(await utils.isPresent('#activities-panel-btn')).to.be.true;
		await element.click();

		await browser.sleep(1000);

		// Open recording
		element = await utils.waitForElement('ov-recording-activity');
		await element.click();

		await browser.sleep(1000);

		// Clicking to recording button
		element = await utils.waitForElement('#start-recording-btn');
		expect(await element.isEnabled()).to.be.true;

		await element.click();

		// Checking if onActivitiesPanelStartRecordingClicked has been received
		await utils.waitForElement('#onActivitiesPanelStartRecordingClicked');
		expect(await utils.isPresent('#onActivitiesPanelStartRecordingClicked')).to.be.true;
	});

	it('should receive the PLAY and DELETE recording events', async () => {
		let element;
		await browser.get(`${url}&prejoin=false`);

		await utils.checkSessionIsPresent();

		await utils.checkToolbarIsPresent();

		// Clicking to activities button
		const activitiesButton = await utils.waitForElement('#activities-panel-btn');
		expect(await utils.isPresent('#activities-panel-btn')).to.be.true;
		await activitiesButton.click();

		await browser.sleep(1500);
		// Open recording
		element = await utils.waitForElement('ov-recording-activity');
		await element.click();

		await browser.sleep(1500);

		// Delete event
		element = await utils.waitForElement('#delete-recording-btn');
		expect(await utils.isPresent('#delete-recording-btn')).to.be.true;
		await element.click();

		element = await utils.waitForElement('#delete-recording-confirm-btn');
		expect(await utils.isPresent('#delete-recording-confirm-btn')).to.be.true;
		await element.click();

		await utils.waitForElement('#onActivitiesPanelDeleteRecordingClicked');
		expect(await utils.isPresent('#onActivitiesPanelDeleteRecordingClicked')).to.be.true;
	});

	it('should receive the onActivitiesPanelStartBroadcasting event', async () => {
		await browser.get(`${url}&prejoin=false`);

		await utils.checkSessionIsPresent();
		await utils.checkToolbarIsPresent();

		// Get activities button and click into it
		await utils.waitForElement('#activities-panel-btn');
		await utils.clickOn('#activities-panel-btn');
		await browser.sleep(500);

		await utils.waitForElement('.sidenav-menu');
		await utils.waitForElement('#activities-container');
		expect(await utils.isPresent('#activities-container')).to.be.true;

		await utils.waitForElement('#broadcasting-activity');
		await utils.clickOn('#broadcasting-activity');

		await browser.sleep(1000);

		const button = await utils.waitForElement('#broadcasting-btn');
		expect(await button.isEnabled()).to.be.false;


		const input = await utils.waitForElement('#broadcast-url-input');
		await input.sendKeys('BroadcastUrl');

		await utils.clickOn('#broadcasting-btn');

		// Checking if onActivitiesPanelStartBroadcastingClicked has been received
		await utils.waitForElement('#onActivitiesPanelStartBroadcastingClicked');
		expect(await utils.isPresent('#onActivitiesPanelStartBroadcastingClicked')).to.be.true;


		// TODO: it needs an OpenVidu PRO (onActivitiesPanelStopBroadcastingClicked event)

		// expect(await utils.isPresent('#broadcasting-tag')).to.be.true;

		// await utils.clickOn('#stop-broadcasting-btn');

		// // Checking if onActivitiesPanelStopBroadcastingClicked has been received
		// await utils.waitForElement('#onActivitiesPanelStopBroadcastingClicked');
		// expect(await utils.isPresent('#onActivitiesPanelStopBroadcastingClicked')).to.be.true;
		// expect(await utils.isPresent('#broadcasting-tag')).to.be.false;
	});

	it('should receive the onSessionCreated event', async () => {
		await browser.get(`${url}&prejoin=false`);

		await utils.checkSessionIsPresent();

		await utils.checkToolbarIsPresent();

		await utils.waitForElement('#onSessionCreated');
		expect(await utils.isPresent('#onSessionCreated')).to.be.true;

		expect(await utils.isPresent('#onJoinButtonClicked')).to.be.false;
	});

	// * PUBLISHER EVENTS

	it('should receive onParticipantCreated event from LOCAL participant', async () => {
		const participantName = 'TEST_USER';
		await browser.get(`${url}&participantName=${participantName}`);
		await utils.waitForElement(`#${participantName}-onParticipantCreated`);
		expect(await utils.isPresent(`#${participantName}-onParticipantCreated`)).to.be.true;
	});

	// * SESSION EVENTS

	it('should receive connectionCreated event from LOCAL participant', async () => {
		const participantName = 'TEST_USER';
		await browser.get(`${url}&prejoin=false&participantName=${participantName}`);

		await utils.waitForElement(`#${participantName}-connectionCreated`);
		expect(await utils.isPresent(`#${participantName}-connectionCreated`)).to.be.true;
	});

	it('should receive sessionDisconnected event from LOCAL participant', async () => {
		const participantName = 'TEST_USER';
		let element;
		await browser.get(`${url}&prejoin=false&participantName=${participantName}`);

		await utils.checkSessionIsPresent();

		await utils.checkToolbarIsPresent();

		// Checking if leave button is not present
		element = await utils.waitForElement('#leave-btn');
		await element.click();

		await utils.waitForElement(`#${participantName}-sessionDisconnected`);
		expect(await utils.isPresent(`#${participantName}-sessionDisconnected`)).to.be.true;
	});
});

describe('Testing stream video menu features', () => {
	let browser: WebDriver;
	let utils: OpenViduComponentsPO;
	async function createChromeBrowser(): Promise<WebDriver> {
		return await new Builder()
			.forBrowser(WebComponentConfig.browserName)
			.withCapabilities(WebComponentConfig.browserCapabilities)
			.setChromeOptions(WebComponentConfig.browserOptions)
			.usingServer(WebComponentConfig.seleniumAddress)
			.build();
	}

	beforeEach(async () => {
		browser = await createChromeBrowser();
		utils = new OpenViduComponentsPO(browser);
	});

	afterEach(async () => {
		await browser.quit();
	});

	it('should not show the Mute sound button for local participant', async () => {
		await browser.get(`${url}&prejoin=false`);

		await utils.checkLayoutPresent();

		await utils.waitForElement('#stream-menu-btn');
		await utils.clickOn('#stream-menu-btn');

		await browser.sleep(500);

		// Checking if mute sound button is not present
		expect(await utils.isPresent('#sound-btn')).to.be.false;
	});
});


describe('Testing screenshare features', () => {
	let browser: WebDriver;
	let utils: OpenViduComponentsPO;
	async function createChromeBrowser(): Promise<WebDriver> {
		return await new Builder()
			.forBrowser(WebComponentConfig.browserName)
			.withCapabilities(WebComponentConfig.browserCapabilities)
			.setChromeOptions(WebComponentConfig.browserOptions)
			.usingServer(WebComponentConfig.seleniumAddress)
			.build();
	}

	beforeEach(async () => {
		browser = await createChromeBrowser();
		utils = new OpenViduComponentsPO(browser);
	});

	afterEach(async () => {
		await browser.quit();
	});

	it('should toggle screensharing', async () => {
		let element;
		await browser.get(`${url}&prejoin=false`);

		await utils.checkLayoutPresent();

		// Clicking to screensharing button
		const screenshareButton = await utils.waitForElement('#screenshare-btn');
		expect(await screenshareButton.isDisplayed()).to.be.true;
		await screenshareButton.click();

		await utils.waitForElement('.OV_big');
		element = await browser.findElements(By.css('video'));
		expect(element.length).equals(2);

		// Clicking to screensharing button
		await screenshareButton.click();

		element = await browser.findElements(By.css('video'));
		expect(element.length).equals(1);
	});

	it('should screensharing with audio muted', async () => {
		let element, isAudioEnabled;
		const getAudioScript = (className: string) => {
			return `return document.getElementsByClassName('${className}')[0].srcObject.getAudioTracks()[0].enabled;`;
		};
		await browser.get(`${url}&prejoin=false`);

		await utils.checkLayoutPresent();

		const micButton = await utils.waitForElement('#mic-btn');
		await micButton.click();

		// Clicking to screensharing button
		const screenshareButton = await utils.waitForElement('#screenshare-btn');
		expect(await utils.isPresent('#screenshare-btn')).to.be.true;
		await screenshareButton.click();

		await utils.waitForElement('.screen-type');
		element = await browser.findElements(By.css('video'));
		expect(element.length).equals(2);

		isAudioEnabled = await browser.executeScript(getAudioScript('screen-type'));
		expect(isAudioEnabled).to.be.false;

		await utils.waitForElement('#statusMic');
		element = await browser.findElements(By.id('statusMic'));
		expect(element.length).equals(2);

		// Clicking to screensharing button
		await screenshareButton.click();

		element = await browser.findElements(By.css('video'));
		expect(element.length).equals(1);
	});

	it('should show and hide CAMERA stream when muting video with screensharing', async () => {
		let element;
		await browser.get(`${url}&prejoin=false`);

		await utils.checkLayoutPresent();

		// Clicking to screensharing button
		const screenshareButton = await utils.waitForElement('#screenshare-btn');
		expect(await screenshareButton.isDisplayed()).to.be.true;
		await screenshareButton.click();

		await utils.waitForElement('.OV_big');
		element = await browser.findElements(By.css('video'));
		expect(element.length).equals(2);

		const muteVideoButton = await utils.waitForElement('#camera-btn');
		await muteVideoButton.click();

		element = await browser.findElements(By.css('video'));
		expect(element.length).equals(1);
	});

	it('should screenshare has audio active when camera is muted', async () => {
		let element, isAudioEnabled;
		const audioEnableScript = 'return document.getElementsByTagName("video")[0].srcObject.getAudioTracks()[0].enabled;';

		await browser.get(`${url}&prejoin=false`);

		await utils.checkLayoutPresent();

		// Clicking to screensharing button
		const screenshareButton = await utils.waitForElement('#screenshare-btn');
		expect(await utils.isPresent('#screenshare-btn')).to.be.true;
		await screenshareButton.click();

		element = await utils.waitForElement('.OV_big');
		element = await browser.findElements(By.css('video'));
		expect(element.length).equals(2);

		element = await browser.findElements(By.id('statusMic'));
		expect(element.length).equals(1);

		// Muting camera video
		const muteVideoButton = await utils.waitForElement('#camera-btn');
		await muteVideoButton.click();

		element = await browser.findElements(By.css('video'));
		expect(element.length).equals(1);

		await browser.sleep(500);
		expect(await utils.isPresent('#statusMic')).to.be.false;

		// Checking if audio is muted after join the room
		isAudioEnabled = await browser.executeScript(audioEnableScript);
		expect(isAudioEnabled).to.be.true;

		// Unmuting camera
		await muteVideoButton.click();

		element = await utils.waitForElement('.camera-type');
		element = await browser.findElements(By.css('video'));
		expect(element.length).equals(2);

		element = await browser.findElements(By.id('statusMic'));
		expect(element.length).equals(1);
	});

	it('should camera come back with audio muted when screensharing', async () => {
		let element, isAudioEnabled;

		const getAudioScript = (className: string) => {
			return `return document.getElementsByClassName('${className}')[0].srcObject.getAudioTracks()[0].enabled;`;
		};

		await browser.get(`${url}&prejoin=false`);

		await utils.checkLayoutPresent();

		// Clicking to screensharing button
		const screenshareButton = await utils.waitForElement('#screenshare-btn');
		await screenshareButton.click();

		await utils.waitForElement('.screen-type');
		element = await browser.findElements(By.css('video'));
		expect(element.length).equals(2);

		element = await browser.findElements(By.id('statusMic'));
		expect(element.length).equals(1);

		// Mute camera
		const muteVideoButton = await utils.waitForElement('#camera-btn');
		await muteVideoButton.click();

		element = await browser.findElements(By.css('video'));
		expect(element.length).equals(1);

		expect(await utils.isPresent('#statusMic')).to.be.false;

		// Checking if audio is muted after join the room
		isAudioEnabled = await browser.executeScript(getAudioScript('screen-type'));
		expect(isAudioEnabled).to.be.true;

		// Mute audio
		const muteAudioButton = await utils.waitForElement('#mic-btn');
		await muteAudioButton.click();

		await utils.waitForElement('#statusMic');
		element = await browser.findElements(By.id('statusMic'));
		expect(element.length).equals(1);

		isAudioEnabled = await browser.executeScript(getAudioScript('screen-type'));
		expect(isAudioEnabled).to.be.false;

		// Unmute camera
		await muteVideoButton.click();

		await utils.waitForElement('.camera-type');
		element = await browser.findElements(By.css('video'));
		expect(element.length).equals(2);

		element = await browser.findElements(By.id('statusMic'));
		expect(element.length).equals(2);

		isAudioEnabled = await browser.executeScript(getAudioScript('camera-type'));
		expect(isAudioEnabled).to.be.false;
	});
});

describe('Testing panels', () => {
	let browser: WebDriver;
	let utils: OpenViduComponentsPO;

	async function createChromeBrowser(): Promise<WebDriver> {
		return await new Builder()
			.forBrowser(WebComponentConfig.browserName)
			.withCapabilities(WebComponentConfig.browserCapabilities)
			.setChromeOptions(WebComponentConfig.browserOptions)
			.usingServer(WebComponentConfig.seleniumAddress)
			.build();
	}

	beforeEach(async () => {
		browser = await createChromeBrowser();
		utils = new OpenViduComponentsPO(browser);
	});

	afterEach(async () => {
		await browser.quit();
	});

	/**
	 * TODO
	 * It only works with OpenVidu PRO because this is a PRO feature
	 */
	// it('should toggle BACKGROUND panel on prejoin page when VIDEO is MUTED', async () => {
	// 	let element;
	// 	await browser.get(`${url}`);
	// 	element = await utils.waitForElement('#pre-join-container');
	// 	expect(await utils.isPresent('#pre-join-container')).to.be.true;

	// 	const backgroundButton = await utils.waitForElement('#background-effects-btn');
	// 	expect(await utils.isPresent('#background-effects-btn')).to.be.true;
	// 	expect(await backgroundButton.isEnabled()).to.be.true;
	// 	await backgroundButton.click();
	// 	await browser.sleep(500);

	// 	await utils.waitForElement('#background-effects-container');
	// 	expect(await utils.isPresent('#background-effects-container')).to.be.true;

	// 	element = await utils.waitForElement('#camera-button');
	// 	expect(await utils.isPresent('#camera-button')).to.be.true;
	// 	expect(await element.isEnabled()).to.be.true;
	// 	await element.click();

	// 	await browser.sleep(500);
	// 	element = await utils.waitForElement('#video-poster');
	// 	expect(await utils.isPresent('#video-poster')).to.be.true;

	// 	expect(await backgroundButton.isDisplayed()).to.be.true;
	// 	expect(await backgroundButton.isEnabled()).to.be.false;

	// 	expect(await utils.isPresent('#background-effects-container')).to.be.false;
	// });

	it('should toggle CHAT panel', async () => {
		await browser.get(`${url}&prejoin=false`);

		await utils.checkLayoutPresent();

		const chatButton = await utils.waitForElement('#chat-panel-btn');
		await chatButton.click();

		await utils.waitForElement('.sidenav-menu');
		await utils.waitForElement('.input-container');
		expect(await utils.isPresent('.input-container')).to.be.true;

		await utils.waitForElement('.messages-container');
		expect(await utils.isPresent('.messages-container')).to.be.true;

		await chatButton.click();

		expect(await utils.isPresent('.input-container')).to.be.false;
		expect(await utils.isPresent('.messages-container')).to.be.false;
	});

	it('should toggle PARTICIPANTS panel', async () => {
		await browser.get(`${url}&prejoin=false`);

		await utils.checkLayoutPresent();

		const participantBtn = await utils.waitForElement('#participants-panel-btn');
		await participantBtn.click();

		await utils.waitForElement('.sidenav-menu');

		await utils.waitForElement('.local-participant-container');
		expect(await utils.isPresent('.local-participant-container')).to.be.true;

		await utils.waitForElement('ov-participant-panel-item');
		expect(await utils.isPresent('ov-participant-panel-item')).to.be.true;

		await participantBtn.click();

		expect(await utils.isPresent('.local-participant-container')).to.be.false;
		expect(await utils.isPresent('ov-participant-panel-item')).to.be.false;
	});

	it('should toggle ACTIVITIES panel', async () => {
		await browser.get(`${url}&prejoin=false`);

		await utils.checkLayoutPresent();

		// Get activities button and click into it
		const activitiesBtn = await utils.waitForElement('#activities-panel-btn');
		await activitiesBtn.click();

		await utils.waitForElement('.sidenav-menu');
		await utils.waitForElement('#activities-container');
		expect(await utils.isPresent('#activities-container')).to.be.true;

		await utils.waitForElement('#recording-activity');
		expect(await utils.isPresent('#recording-activity')).to.be.true;
		await activitiesBtn.click();

		expect(await utils.isPresent('#activities-container')).to.be.false;
		expect(await utils.isPresent('#recording-activity')).to.be.false;
	});

	it('should toggle SETTINGS panel', async () => {
		let element;
		await browser.get(`${url}&prejoin=false`);

		await utils.checkLayoutPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		// Open more options menu
		element = await utils.waitForElement('#more-options-btn');
		await element.click();

		await browser.sleep(500);

		// Checking if mat menu is  present
		element = await utils.waitForElement('.mat-menu-content');
		expect(await utils.isPresent('.mat-menu-content')).to.be.true;

		// Get settings button and click into it
		const settingsBtn = await utils.waitForElement('#toolbar-settings-btn');
		await settingsBtn.click();

		element = await utils.waitForElement('.sidenav-menu');
		expect(await utils.isPresent('#default-settings-panel')).to.be.true;
	});

	it('should switching between PARTICIPANTS and CHAT panels', async () => {
		await browser.get(`${url}&prejoin=false`);

		await utils.checkSessionIsPresent();

		await utils.checkToolbarIsPresent();

		// Open chat panel
		const chatButton = await utils.waitForElement('#chat-panel-btn');
		await chatButton.click();

		await utils.waitForElement('.sidenav-menu');
		expect(await utils.isPresent('.sidenav-menu')).to.be.true;

		await utils.waitForElement('.input-container');
		expect(await utils.isPresent('.input-container')).to.be.true;

		expect(await utils.isPresent('.messages-container')).to.be.true;

		// Open participants panel
		const participantBtn = await utils.waitForElement('#participants-panel-btn');
		await participantBtn.click();

		await utils.waitForElement('.sidenav-menu');

		expect(await utils.isPresent('.local-participant-container')).to.be.true;

		expect(await utils.isPresent('ov-participant-panel-item')).to.be.true;

		// Switch to chat panel
		await chatButton.click();

		await utils.waitForElement('.sidenav-menu');

		expect(await utils.isPresent('.input-container')).to.be.true;

		expect(await utils.isPresent('.messages-container')).to.be.true;

		expect(await utils.isPresent('.local-participant-container')).to.be.false;

		expect(await utils.isPresent('ov-participant-panel-item')).to.be.false;

		// Close chat panel
		await chatButton.click();
		await browser.findElements(By.className('input-container'));
		expect(await utils.isPresent('.input-container')).to.be.false;

		expect(await utils.isPresent('messages-container')).to.be.false;
	});

	it('should switching between sections in SETTINGS PANEL', async () => {
		let element;
		await browser.get(`${url}&prejoin=false`);

		await utils.checkToolbarIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		// Open more options menu
		element = await utils.waitForElement('#more-options-btn');
		await element.click();

		await browser.sleep(500);

		// Checking if mat menu is  present
		await utils.waitForElement('.mat-menu-content');
		expect(await utils.isPresent('.mat-menu-content')).to.be.true;

		// Get settings button and click into it
		const settingsBtn = await utils.waitForElement('#toolbar-settings-btn');
		await settingsBtn.click();

		await utils.waitForElement('.sidenav-menu');
		expect(await utils.isPresent('.sidenav-menu')).to.be.true;

		// Check if general section is shown
		element = await utils.waitForElement('#general-opt');
		await element.click();

		expect(await utils.isPresent('ov-nickname-input')).to.be.true;

		// Check if video section is shown
		element = await utils.waitForElement('#video-opt');
		await element.click();

		expect(await utils.isPresent('ov-video-devices-select')).to.be.true;

		// Check if audio section is shown
		element = await utils.waitForElement('#audio-opt');
		await element.click();

		expect(await utils.isPresent('ov-audio-devices-select')).to.be.true;
	});
});

describe('Testing CHAT features', () => {
	let browser: WebDriver;
	let utils: OpenViduComponentsPO;

	async function createChromeBrowser(): Promise<WebDriver> {
		return await new Builder()
			.forBrowser(WebComponentConfig.browserName)
			.withCapabilities(WebComponentConfig.browserCapabilities)
			.setChromeOptions(WebComponentConfig.browserOptions)
			.usingServer(WebComponentConfig.seleniumAddress)
			.build();
	}

	beforeEach(async () => {
		browser = await createChromeBrowser();
		utils = new OpenViduComponentsPO(browser);
	});

	afterEach(async () => {
		await browser.quit();
	});

	it('should send an url message and converts in a link', async () => {
		await browser.get(`${url}&prejoin=false`);

		await utils.checkLayoutPresent();

		const chatButton = await utils.waitForElement('#chat-panel-btn');
		await chatButton.click();

		await utils.waitForElement('.sidenav-menu');
		await utils.waitForElement('.input-container');
		expect(await utils.isPresent('.input-container')).to.be.true;


		const input = await utils.waitForElement('#chat-input');
		await input.sendKeys('demos.openvidu.io');

		await utils.clickOn('#send-btn');

		await utils.waitForElement('.msg-content a');
		expect(await utils.isPresent('.msg-content a')).to.be.true;
	});
});


describe('Testing video is playing', () => {
	let browser: WebDriver;
	let utils: OpenViduComponentsPO;

	async function createChromeBrowser(): Promise<WebDriver> {
		return await new Builder()
			.forBrowser(WebComponentConfig.browserName)
			.withCapabilities(WebComponentConfig.browserCapabilities)
			.setChromeOptions(WebComponentConfig.browserOptions)
			.usingServer(WebComponentConfig.seleniumAddress)
			.build();
	}

	beforeEach(async () => {
		browser = await createChromeBrowser();
		utils = new OpenViduComponentsPO(browser);
	});

	afterEach(async () => {
		await browser.quit();
	});

	it('should play the participant video with only audio', async () => {
		const sessionName = 'audioOnlyE2E';
		const fixedUrl = `${url}&sessionName=${sessionName}`;
		await browser.get(fixedUrl);

		await utils.checkPrejoinIsPresent();
		await utils.clickOn('#join-button');

		// Starting new browser for adding the second participant
		const newTabScript = `window.open("${fixedUrl}")`;
		await browser.executeScript(newTabScript);
		const tabs = await browser.getAllWindowHandles();
		await browser.switchTo().window(tabs[1]);

		await utils.checkPrejoinIsPresent();
		await utils.clickOn('#camera-button');
		await utils.clickOn('#join-button');

		// Go to first tab
		await browser.switchTo().window(tabs[0]);

		// Wait until NO_STREAM_PLAYING_EVENT exception timeout is reached
		await browser.sleep(6000);

		const exceptionQuantity = await utils.getNumberOfElements('#NO_STREAM_PLAYING_EVENT');
		expect(exceptionQuantity).equals(0);
	});

	it('should play the participant video with only video', async () => {
		const sessionName = 'videoOnlyE2E';
		const fixedUrl = `${url}&sessionName=${sessionName}`;
		await browser.get(fixedUrl);

		await utils.checkPrejoinIsPresent();
		await utils.clickOn('#join-button');

		// Starting new browser for adding the second participant
		const newTabScript = `window.open("${fixedUrl}")`;
		await browser.executeScript(newTabScript);
		const tabs = await browser.getAllWindowHandles();
		await browser.switchTo().window(tabs[1]);

		await utils.checkPrejoinIsPresent();
		await utils.clickOn('#microphone-button');
		await utils.clickOn('#join-button');

		// Go to first tab
		await browser.switchTo().window(tabs[0]);

		// Wait until NO_STREAM_PLAYING_EVENT exception timeout is reached
		await browser.sleep(6000);

		const exceptionQuantity = await utils.getNumberOfElements('#NO_STREAM_PLAYING_EVENT');
		expect(exceptionQuantity).equals(0);
	});
});

describe('Testing WITHOUT MEDIA DEVICES permissions', () => {
	let browser: WebDriver;
	let utils: OpenViduComponentsPO;
	async function createChromeBrowser(): Promise<WebDriver> {
		return await new Builder()
			.forBrowser(WebComponentConfig.browserName)
			.withCapabilities(WebComponentConfig.browserCapabilities)
			.setChromeOptions(getBrowserOptionsWithoutDevices())
			.usingServer(WebComponentConfig.seleniumAddress)
			.build();
	}

	beforeEach(async () => {
		browser = await createChromeBrowser();
		utils = new OpenViduComponentsPO(browser);
	});

	afterEach(async () => {
		await browser.quit();
	});

	it('should be able to ACCESS to PREJOIN page', async () => {
		await browser.get(`${url}`);

		await utils.checkPrejoinIsPresent();

		let button = await utils.waitForElement('#camera-button');
		expect(await button.isEnabled()).to.be.false;

		button = await utils.waitForElement('#microphone-button');
		expect(await button.isEnabled()).to.be.false;
	});

	it('should be able to ACCESS to ROOM page', async () => {
		await browser.get(`${url}`);

		await utils.checkPrejoinIsPresent();

		await utils.clickOn('#join-button');

		await utils.checkSessionIsPresent();

		await utils.checkToolbarIsPresent();

		let button = await utils.waitForElement('#camera-btn');
		expect(await button.isEnabled()).to.be.false;

		button = await utils.waitForElement('#mic-btn');
		expect(await button.isEnabled()).to.be.false;
	});

	it('should be able to ACCESS to ROOM page without prejoin', async () => {
		await browser.get(`${url}&prejoin=false`);

		await utils.checkSessionIsPresent();

		await utils.checkToolbarIsPresent();

		let button = await utils.waitForElement('#camera-btn');
		expect(await button.isEnabled()).to.be.false;

		button = await utils.waitForElement('#mic-btn');
		expect(await button.isEnabled()).to.be.false;
	});

	it('should the settings buttons be disabled', async () => {
		await browser.get(`${url}&prejoin=false`);

		await utils.checkToolbarIsPresent();

		// Open more options menu
		await utils.clickOn('#more-options-btn');

		await browser.sleep(500);

		// Checking if fullscreen button is not present
		await utils.waitForElement('.mat-menu-content');
		expect(await utils.isPresent('.mat-menu-content')).to.be.true;

		await utils.clickOn('#toolbar-settings-btn');

		await browser.sleep(500);

		await utils.waitForElement('.settings-container');
		expect(await utils.isPresent('.settings-container')).to.be.true;

		await utils.clickOn('#video-opt');
		expect(await utils.isPresent('ov-video-devices-select')).to.be.true;

		let button = await utils.waitForElement('#camera-button');
		expect(await button.isEnabled()).to.be.false;

		await utils.clickOn('#audio-opt');
		expect(await utils.isPresent('ov-audio-devices-select')).to.be.true;

		button = await utils.waitForElement('#microphone-button');
		expect(await button.isEnabled()).to.be.false;

	});
});

describe('Testing PRO features with OpenVidu CE', () => {
	let browser: WebDriver;
	let utils: OpenViduComponentsPO;
	async function createChromeBrowser(): Promise<WebDriver> {
		return await new Builder()
			.forBrowser(WebComponentConfig.browserName)
			.withCapabilities(WebComponentConfig.browserCapabilities)
			.setChromeOptions(WebComponentConfig.browserOptions)
			.usingServer(WebComponentConfig.seleniumAddress)
			.build();
	}

	beforeEach(async () => {
		browser = await createChromeBrowser();
		utils = new OpenViduComponentsPO(browser);
	});

	afterEach(async () => {
		await browser.quit();
	});

	it('should SHOW the VIRTUAL BACKGROUND PRO feature dialog', async () => {
		await browser.get(`${url}&prejoin=true`);

		await utils.checkPrejoinIsPresent();

		await utils.waitForElement('#background-effects-btn');
		await utils.clickOn('#background-effects-btn');

		await utils.chceckProFeatureAlertIsPresent();

		// Close alert
		await (await utils.waitForElement('html')).sendKeys(Key.ESCAPE);

		// Join to room
		await utils.clickOn('#join-button');

		await utils.checkSessionIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		// Open more options menu
		await utils.clickOn('#more-options-btn');

		await browser.sleep(500);

		// Checking if button panel is present
		await utils.waitForElement('.mat-menu-content');
		expect(await utils.isPresent('.mat-menu-content')).to.be.true;

		await utils.waitForElement('#virtual-bg-btn');
		await utils.clickOn('#virtual-bg-btn');

		// Expect it shows the pro feature alert
		await utils.chceckProFeatureAlertIsPresent();

	});

	it('should SHOW the CAPTIONS PRO feature dialog', async () => {
		await browser.get(`${url}&prejoin=false`);

		await utils.checkSessionIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		// Open more options menu
		await utils.clickOn('#more-options-btn');

		await browser.sleep(500);

		// Checking if button panel is present
		await utils.waitForElement('.mat-menu-content');
		expect(await utils.isPresent('.mat-menu-content')).to.be.true;

		await utils.waitForElement('#toolbar-settings-btn');
		expect(await utils.isPresent('#toolbar-settings-btn')).to.be.true;
		await utils.clickOn('#toolbar-settings-btn');

		// Expect captions panel shows the pro feature content
		await utils.waitForElement('#settings-container');
		await utils.clickOn('#captions-opt');
		await utils.waitForElement('.pro-feature');

		// Open more options menu
		await utils.clickOn('#more-options-btn');

		await browser.sleep(500);

		// Checking if button panel is present
		await utils.waitForElement('.mat-menu-content');
		expect(await utils.isPresent('.mat-menu-content')).to.be.true;

		// Checking if captions button is present
		await utils.waitForElement('#captions-btn');
		expect(await utils.isPresent('#captions-btn')).to.be.true;
		await utils.clickOn('#captions-btn');

		await utils.waitForElement('ov-pro-feature-template');
		expect(await utils.isPresent('.captions-container')).to.be.false;
	});
});


/**
 * TODO:
 *  The following E2E TESTS only work with OpenVidu PRO.
 * It should run with OpenVidu PRO
 */
// describe('Testing captions features', () => {
// 	let browser: WebDriver;
// 	let utils: OpenViduComponentsPO;
// 	async function createChromeBrowser(): Promise<WebDriver> {
// 		return await new Builder()
// 			.forBrowser(WebComponentConfig.browserName)
// 			.withCapabilities(WebComponentConfig.browserCapabilities)
// 			.setChromeOptions(WebComponentConfig.browserOptions)
// 			.usingServer(WebComponentConfig.seleniumAddress)
// 			.build();
// 	}

// 	beforeEach(async () => {
// 		browser = await createChromeBrowser();
// 		utils = new OpenViduComponentsPO(browser);
// 	});

// 	afterEach(async () => {
// 		await browser.quit();
// 	});

// 	it('should OPEN the CAPTIONS container', async () => {
// 		await browser.get(`${url}&prejoin=false`);

// 		await utils.checkSessionIsPresent();

// 		// Checking if toolbar is present
// 		await utils.checkToolbarIsPresent();

// 		// Open more options menu
// 		await utils.clickOn('#more-options-btn');

// 		await browser.sleep(500);

// 		// Checking if button panel is present
// 		await utils.waitForElement('.mat-menu-content');
// 		expect(await utils.isPresent('.mat-menu-content')).to.be.true;

// 		// Checking if captions button is present
// 		await utils.waitForElement('#captions-btn');
// 		expect(await utils.isPresent('#captions-btn')).to.be.true;
// 		await utils.clickOn('#captions-btn');

// 		await utils.waitForElement('.captions-container');
// 	});

// 	it('should OPEN the SETTINGS panel from captions button', async () => {
// 		await browser.get(`${url}&prejoin=false`);

// 		await utils.checkSessionIsPresent();

// 		// Checking if toolbar is present
// 		await utils.checkToolbarIsPresent();

// 		// Open more options menu
// 		await utils.clickOn('#more-options-btn');

// 		await browser.sleep(500);

// 		// Checking if button panel is present
// 		await utils.waitForElement('.mat-menu-content');
// 		expect(await utils.isPresent('.mat-menu-content')).to.be.true;

// 		// Checking if captions button is present
// 		await utils.waitForElement('#captions-btn');
// 		expect(await utils.isPresent('#captions-btn')).to.be.true;
// 		await utils.clickOn('#captions-btn');

// 		await utils.waitForElement('.captions-container');
// 		await utils.waitForElement('#caption-settings-btn');
// 		await utils.clickOn('#caption-settings-btn');

// 		await browser.sleep(500);

// 		await utils.waitForElement('.settings-container');
// 		expect(await utils.isPresent('.settings-container')).to.be.true;

// 		await utils.waitForElement('ov-captions-settings');

// 		// Expect caption button is not present
// 		expect(await utils.isPresent('#caption-settings-btn')).to.be.false;
// 	});

// 	it('should TOGGLE the CAPTIONS container from settings panel', async () => {
// 		await browser.get(`${url}&prejoin=false`);

// 		await utils.checkSessionIsPresent();

// 		// Checking if toolbar is present
// 		await utils.checkToolbarIsPresent();

// 		// Open more options menu
// 		await utils.clickOn('#more-options-btn');

// 		await browser.sleep(500);

// 		// Checking if button panel is present
// 		await utils.waitForElement('.mat-menu-content');
// 		expect(await utils.isPresent('.mat-menu-content')).to.be.true;

// 		// Checking if captions button is present
// 		await utils.waitForElement('#captions-btn');
// 		expect(await utils.isPresent('#captions-btn')).to.be.true;
// 		await utils.clickOn('#captions-btn');

// 		await utils.waitForElement('.captions-container');
// 		await utils.waitForElement('#caption-settings-btn');
// 		await utils.clickOn('#caption-settings-btn');

// 		await browser.sleep(500);

// 		await utils.waitForElement('.settings-container');
// 		expect(await utils.isPresent('.settings-container')).to.be.true;

// 		await utils.waitForElement('ov-captions-settings');

// 		expect(await utils.isPresent('.captions-container')).to.be.true;
// 		await utils.clickOn('#captions-toggle-slide');
// 		expect(await utils.isPresent('.captions-container')).to.be.false;

// 		await browser.sleep(200);

// 		await utils.clickOn('#captions-toggle-slide');
// 		expect(await utils.isPresent('.captions-container')).to.be.true;
// 	});

// 	it('should change the CAPTIONS language', async () => {
// 		await browser.get(`${url}&prejoin=false`);

// 		await utils.checkSessionIsPresent();

// 		// Checking if toolbar is present
// 		await utils.checkToolbarIsPresent();

// 		// Open more options menu
// 		await utils.clickOn('#more-options-btn');

// 		await browser.sleep(500);

// 		// Checking if button panel is present
// 		await utils.waitForElement('.mat-menu-content');
// 		expect(await utils.isPresent('.mat-menu-content')).to.be.true;

// 		// Checking if captions button is present
// 		await utils.waitForElement('#captions-btn');
// 		expect(await utils.isPresent('#captions-btn')).to.be.true;
// 		await utils.clickOn('#captions-btn');

// 		await utils.waitForElement('.captions-container');
// 		await utils.waitForElement('#caption-settings-btn');
// 		await utils.clickOn('#caption-settings-btn');

// 		await browser.sleep(500);

// 		await utils.waitForElement('.settings-container');
// 		expect(await utils.isPresent('.settings-container')).to.be.true;

// 		await utils.waitForElement('ov-captions-settings');

// 		expect(await utils.isPresent('.captions-container')).to.be.true;

// 		await utils.clickOn('.lang-button');
// 		await browser.sleep(500);

// 		await utils.clickOn('#es-ES');
// 		await utils.clickOn('.panel-close-button');

// 		const button = await utils.waitForElement('#caption-settings-btn');
// 		expect(await button.getText()).equals('settingsEspañol');

// 	});
// });
