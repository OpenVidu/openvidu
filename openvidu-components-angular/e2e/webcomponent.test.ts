import { Builder, By, until, WebDriver } from 'selenium-webdriver';
import { expect } from 'chai';
import { WebComponentConfig } from './selenium.conf';

const url = WebComponentConfig.appUrl;
const TIMEOUT = 30000;

describe('Testing API Directives', () => {
	let browser: WebDriver;
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
	});

	afterEach(async () => {
		await browser.quit();
	});

	it('should set the MINIMAL UI', async () => {
		let element;
		await browser.get(`${url}?minimal=true`);
		// Checking if prejoin page exist
		element = await browser.wait(until.elementLocated(By.id('prejoin-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if layout is present
		element = await browser.wait(until.elementLocated(By.id('layout-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		element = await browser.wait(until.elementLocated(By.id('layout')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if stream component is present
		element = await browser.wait(until.elementLocated(By.css('.OV_stream')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if audio detection is not displayed
		element = await browser.findElements(By.id('audio-wave-container'));
		expect(element.length).equals(0);

		const joinButton = await browser.findElement(By.id('join-button'));
		expect(await joinButton.isDisplayed()).to.be.true;
		await joinButton.click();

		// Checking if session container is present
		element = await browser.wait(until.elementLocated(By.id('session-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if toolbar is present
		element = await browser.wait(until.elementLocated(By.id('media-buttons-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if screenshare button is not present
		element = await browser.findElements(By.id('screenshare-btn'));
		expect(element.length).equals(0);

		// Checking if more options button is not present
		element = await browser.findElements(By.id('more-options-btn'));
		expect(element.length).equals(0);

		// Checking if participants panel button is not present
		element = await browser.findElements(By.id('participants-panel-btn'));
		expect(element.length).equals(0);

		// Checking if activities panel button is not present
		element = await browser.findElements(By.id('activities-panel-btn'));
		expect(element.length).equals(0);

		// Checking if logo is not displayed
		element = await browser.findElements(By.id('branding-logo'));
		expect(element.length).equals(0);

		// Checking if session name is not displayed
		element = await browser.findElements(By.id('session-name'));
		expect(element.length).equals(0);

		// Checking if nickname is not displayed
		element = await browser.findElements(By.id('nickname-container'));
		expect(element.length).equals(0);

		// Checking if audio detection is not displayed
		element = await browser.findElements(By.id('audio-wave-container'));
		expect(element.length).equals(0);

		// Checking if settings button is not displayed
		element = await browser.findElements(By.id('settings-container'));
		expect(element.length).equals(0);
	});

	it('should show the PREJOIN page', async () => {
		await browser.get(`${url}?prejoin=true`);
		const element = await browser.wait(until.elementLocated(By.id('prejoin-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
	});
	it('should not show the PREJOIN page', async () => {
		let element;
		await browser.get(`${url}?prejoin=false`);
		element = await browser.wait(until.elementLocated(By.id('session-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
	});

	it('should run the app with VIDEO MUTED in prejoin page', async () => {
		let element, isVideoEnabled, icon;
		const videoEnableScript = 'return document.getElementsByTagName("video")[0].srcObject.getVideoTracks()[0].enabled;';

		await browser.get(`${url}?prejoin=true&videoMuted=true`);

		// Checking if video is displayed
		await browser.wait(until.elementLocated(By.css('video')), TIMEOUT);
		element = await browser.findElement(By.css('video'));
		await browser.wait(until.elementIsVisible(element), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if video track is disabled/muted
		isVideoEnabled = await browser.executeScript(videoEnableScript);
		expect(isVideoEnabled).to.be.false;

		icon = await browser.findElement(By.id('videocam_off'));
		expect(await icon.isDisplayed()).to.be.true;

		const joinButton = await browser.findElement(By.id('join-button'));
		expect(await joinButton.isDisplayed()).to.be.true;
		await joinButton.click();

		// Checking if video is muted after join the room
		isVideoEnabled = await browser.executeScript(videoEnableScript);
		expect(isVideoEnabled).to.be.false;

		icon = await browser.findElement(By.id('videocam_off'));
		expect(await icon.isDisplayed()).to.be.true;
	});

	it('should run the app with VIDEO MUTED and WITHOUT PREJOIN page', async () => {
		let element, isVideoEnabled, icon;
		const videoEnableScript = 'return document.getElementsByTagName("video")[0].srcObject.getVideoTracks()[0].enabled;';

		await browser.get(`${url}?prejoin=false&videoMuted=true`);

		element = await browser.wait(until.elementLocated(By.id('session-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if video is displayed
		await browser.wait(until.elementLocated(By.css('video')), TIMEOUT);
		element = await browser.findElement(By.css('video'));
		await browser.wait(until.elementIsVisible(element), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if video track is disabled/muted
		isVideoEnabled = await browser.executeScript(videoEnableScript);
		expect(isVideoEnabled).to.be.false;

		icon = await browser.findElement(By.id('videocam_off'));
		expect(await icon.isDisplayed()).to.be.true;
	});

	it('should run the app with AUDIO MUTED in prejoin page', async () => {
		let element, isAudioEnabled, icon;
		const audioEnableScript = 'return document.getElementsByTagName("video")[0].srcObject.getAudioTracks()[0].enabled;';

		await browser.get(`${url}?audioMuted=true`);

		// Checking if video is displayed
		await browser.wait(until.elementLocated(By.css('video')), TIMEOUT);
		element = await browser.findElement(By.css('video'));
		await browser.wait(until.elementIsVisible(element), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if audio track is disabled/muted
		isAudioEnabled = await browser.executeScript(audioEnableScript);
		expect(isAudioEnabled).to.be.false;

		icon = await browser.findElement(By.id('mic_off'));
		expect(await icon.isDisplayed()).to.be.true;

		const joinButton = await browser.findElement(By.id('join-button'));
		expect(await joinButton.isDisplayed()).to.be.true;
		await joinButton.click();

		// Checking if audio is muted after join the room
		isAudioEnabled = await browser.executeScript(audioEnableScript);
		expect(isAudioEnabled).to.be.false;

		icon = await browser.findElement(By.id('mic_off'));
		expect(await icon.isDisplayed()).to.be.true;
	});

	it('should run the app with VIDEO MUTED and WITHOUT PREJOIN page', async () => {
		let element, isAudioEnabled, icon;
		const audioEnableScript = 'return document.getElementsByTagName("video")[0].srcObject.getAudioTracks()[0].enabled;';

		await browser.get(`${url}?prejoin=false&audioMuted=true`);

		element = await browser.wait(until.elementLocated(By.id('session-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if video is displayed
		await browser.wait(until.elementLocated(By.css('video')), TIMEOUT);
		element = await browser.findElement(By.css('video'));
		await browser.wait(until.elementIsVisible(element), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if audio track is disabled/muted
		isAudioEnabled = await browser.executeScript(audioEnableScript);
		expect(isAudioEnabled).to.be.false;

		icon = await browser.findElement(By.id('mic_off'));
		expect(await icon.isDisplayed()).to.be.true;
	});

	it('should HIDE the SCREENSHARE button', async () => {
		let element;
		await browser.get(`${url}?prejoin=false&screenshareBtn=false`);
		element = await browser.wait(until.elementLocated(By.id('session-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if toolbar is present
		element = await browser.wait(until.elementLocated(By.id('media-buttons-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if screenshare button is not present
		element = await browser.findElements(By.id('screenshare-btn'));
		expect(element.length).equals(0);
	});

	it('should HIDE the FULLSCREEN button', async () => {
		let element;
		await browser.get(`${url}?prejoin=false&fullscreenBtn=false`);
		element = await browser.wait(until.elementLocated(By.id('session-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if toolbar is present
		element = await browser.wait(until.elementLocated(By.id('media-buttons-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Open more options menu
		element = await browser.wait(until.elementLocated(By.id('more-options-btn')), TIMEOUT);
		await element.click();

		await browser.sleep(500);

		// Checking if fullscreen button is not present
		element = await browser.wait(until.elementLocated(By.className('mat-menu-content')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		element = await browser.findElements(By.id('fullscreen-btn'));
		expect(element.length).equals(0);
	});

	it('should HIDE the TOOLBAR SETTINGS button', async () => {
		let element;
		await browser.get(`${url}?prejoin=false&toolbarSettingsBtn=false`);
		element = await browser.wait(until.elementLocated(By.id('session-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if toolbar is present
		element = await browser.wait(until.elementLocated(By.id('media-buttons-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Open more options menu
		element = await browser.wait(until.elementLocated(By.id('more-options-btn')), TIMEOUT);
		await element.click();

		await browser.sleep(500);

		// Checking if fullscreen button is not present
		element = await browser.wait(until.elementLocated(By.className('mat-menu-content')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		element = await browser.findElements(By.id('toolbar-settings-btn'));
		expect(element.length).equals(0);
	});

	it('should HIDE the LEAVE button', async () => {
		let element;
		await browser.get(`${url}?prejoin=false&leaveBtn=false`);
		element = await browser.wait(until.elementLocated(By.id('session-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if toolbar is present
		element = await browser.wait(until.elementLocated(By.id('media-buttons-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if leave button is not present
		element = await browser.findElements(By.id('leave-btn'));
		expect(element.length).equals(0);
	});

	it('should HIDE the ACTIVITIES PANEL button', async () => {
		let element;
		await browser.get(`${url}?prejoin=false&activitiesPanelBtn=false`);
		element = await browser.wait(until.elementLocated(By.id('session-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if toolbar is present
		element = await browser.wait(until.elementLocated(By.id('media-buttons-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if activities panel button is not present
		element = await browser.findElements(By.id('activities-panel-btn'));
		expect(element.length).equals(0);
	});

	it('should HIDE the CHAT PANEL button', async () => {
		let element;
		await browser.get(`${url}?prejoin=false&chatPanelBtn=false`);
		element = await browser.wait(until.elementLocated(By.id('session-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if toolbar is present
		element = await browser.wait(until.elementLocated(By.id('media-buttons-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if chat panel button is not present
		element = await browser.findElements(By.id('chat-panel-btn'));
		expect(element.length).equals(0);
	});

	it('should HIDE the PARTICIPANTS PANEL button', async () => {
		let element;
		await browser.get(`${url}?prejoin=false&participantsPanelBtn=false`);
		element = await browser.wait(until.elementLocated(By.id('session-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if toolbar is present
		element = await browser.wait(until.elementLocated(By.id('media-buttons-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if participants panel button is not present
		element = await browser.findElements(By.id('participants-panel-btn'));
		expect(element.length).equals(0);
	});

	it('should HIDE the LOGO', async () => {
		let element;
		await browser.get(`${url}?prejoin=false&displayLogo=false`);
		element = await browser.wait(until.elementLocated(By.id('session-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if toolbar is present
		element = await browser.wait(until.elementLocated(By.id('info-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if logo is not displayed
		element = await browser.findElements(By.id('branding-logo'));
		expect(element.length).equals(0);
	});

	it('should HIDE the SESSION NAME', async () => {
		let element;
		await browser.get(`${url}?prejoin=false&displaySessionName=false`);
		element = await browser.wait(until.elementLocated(By.id('session-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if toolbar is present
		element = await browser.wait(until.elementLocated(By.id('info-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if session name is not displayed
		element = await browser.findElements(By.id('session-name'));
		expect(element.length).equals(0);
	});

	it('should HIDE the PARTICIPANT NAME', async () => {
		let element;
		await browser.get(`${url}?prejoin=false&displayParticipantName=false`);
		element = await browser.wait(until.elementLocated(By.id('session-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if stream component is present
		element = await browser.wait(until.elementLocated(By.className('OV_stream')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if nickname is not displayed
		element = await browser.findElements(By.id('nickname-container'));
		expect(element.length).equals(0);
	});

	it('should HIDE the AUDIO DETECTION element', async () => {
		let element;
		await browser.get(`${url}?prejoin=false&displayAudioDetection=false`);
		element = await browser.wait(until.elementLocated(By.id('session-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if stream component is present
		element = await browser.wait(until.elementLocated(By.className('OV_stream')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if audio detection is not displayed
		element = await browser.findElements(By.id('audio-wave-container'));
		expect(element.length).equals(0);
	});

	it('should HIDE the STREAM SETTINGS button', async () => {
		let element;
		await browser.get(`${url}?prejoin=false&settingsBtn=false`);
		element = await browser.wait(until.elementLocated(By.id('session-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if stream component is present
		element = await browser.wait(until.elementLocated(By.className('OV_stream')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if settings button is not displayed
		element = await browser.findElements(By.id('settings-container'));
		expect(element.length).equals(0);
	});

	it('should HIDE the MUTE button in participants panel', async () => {
		let element, remoteParticipantItems;
		const sessionName = 'e2etest';
		const fixedUrl = `${url}?prejoin=false&participantMuteBtn=false&sessionName=${sessionName}`;
		await browser.get(fixedUrl);
		element = await browser.wait(until.elementLocated(By.id('session-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if toolbar is present and opening the participants panel
		element = await browser.wait(until.elementLocated(By.id('menu-buttons-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		const participantsButton = await browser.findElement(By.id('participants-panel-btn'));
		await participantsButton.click();

		// Checking if participatns panel is displayed
		element = await browser.wait(until.elementLocated(By.id('participants-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		// Checking remote participants item
		remoteParticipantItems = await browser.findElements(By.id('remote-participant-item'));
		expect(remoteParticipantItems.length).equals(0);

		// Starting new browser for adding a new participant
		const newTabScript = `window.open("${fixedUrl}")`;
		await browser.executeScript(newTabScript);

		// Go to first tab
		const tabs = await browser.getAllWindowHandles();
		browser.switchTo().window(tabs[0]);

		// Checking if mute button is not displayed in participant item
		remoteParticipantItems = await browser.wait(until.elementsLocated(By.id('remote-participant-item')), TIMEOUT);
		expect(remoteParticipantItems.length).equals(1);
		element = await browser.findElements(By.id('mute-btn'));
		expect(element.length).equals(0);
	});

	it('should HIDE the RECORDING ACTIVITY in activities panel', async () => {
		let element;
		const fixedUrl = `${url}?prejoin=false&activitiesPanelRecordingActivity=false`;
		await browser.get(fixedUrl);
		element = await browser.wait(until.elementLocated(By.id('session-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if toolbar is present and opening the activities panel
		element = await browser.wait(until.elementLocated(By.id('menu-buttons-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		element = await browser.findElement(By.id('activities-panel-btn'));
		await element.click();

		// Checking if participatns panel is displayed
		element = await browser.wait(until.elementLocated(By.id('default-activities-panel')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		await browser.sleep(1000);
		// Checking if recording activity exists
		element = await browser.findElements(By.css('ov-recording-activity'));
		expect(element.length).equals(0);
	});

	it('should SHOW a RECORDING ERROR in activities panel', async () => {
		let element;
		const fixedUrl = `${url}?prejoin=false&recordingError='TEST ERROR'`;
		await browser.get(fixedUrl);
		element = await browser.wait(until.elementLocated(By.id('session-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if toolbar is present and opening the activities panel
		element = await browser.wait(until.elementLocated(By.id('menu-buttons-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		element = await browser.findElement(By.id('activities-panel-btn'));
		await element.click();

		// Checking if participatns panel is displayed
		element = await browser.wait(until.elementLocated(By.id('default-activities-panel')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		await browser.sleep(1000);
		// Checking if recording activity exists
		element = await browser.findElements(By.css('ov-recording-activity'));
		expect(element.length).equals(1);

		element = await browser.findElements(By.className('failed'));
		expect(element.length).equals(2);

		// Open recording
		element = await browser.wait(until.elementLocated(By.css('ov-recording-activity')), TIMEOUT);
		await element.click();

		await browser.sleep(1000);
		element = await browser.findElements(By.className('recording-error'));
		expect(element.length).equals(1);
	});
});

describe('Testing videoconference EVENTS', () => {
	let browser: WebDriver;
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
	});

	afterEach(async () => {
		await browser.quit();
	});

	it('should receive the onJoinButtonClicked event', async () => {
		let element;
		await browser.get(`${url}`);
		element = await browser.wait(until.elementLocated(By.id('prejoin-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Clicking to join button
		const joinButton = await browser.findElement(By.id('join-button'));
		expect(await joinButton.isDisplayed()).to.be.true;
		await joinButton.click();

		// Checking if onJoinButtonClicked has been received
		element = await browser.wait(until.elementLocated(By.id('onJoinButtonClicked')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
	});

	it('should receive the onToolbarLeaveButtonClicked event', async () => {
		let element;
		await browser.get(`${url}?prejoin=false`);

		element = await browser.wait(until.elementLocated(By.id('session-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if toolbar is present
		element = await browser.wait(until.elementLocated(By.id('media-buttons-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Clicking to leave button
		const leaveButton = await browser.findElement(By.id('leave-btn'));
		expect(await leaveButton.isDisplayed()).to.be.true;
		await leaveButton.click();

		// Checking if onToolbarLeaveButtonClicked has been received
		element = await browser.wait(until.elementLocated(By.id('onToolbarLeaveButtonClicked')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
	});

	it('should receive the onToolbarCameraButtonClicked event', async () => {
		let element;
		await browser.get(`${url}?prejoin=false`);

		element = await browser.wait(until.elementLocated(By.id('session-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if toolbar is present
		element = await browser.wait(until.elementLocated(By.id('media-buttons-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Clicking to leave button
		const cameraButton = await browser.findElement(By.id('camera-btn'));
		expect(await cameraButton.isDisplayed()).to.be.true;
		await cameraButton.click();

		// Checking if onToolbarCameraButtonClicked has been received
		element = await browser.wait(until.elementLocated(By.id('onToolbarCameraButtonClicked')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
	});

	it('should receive the onToolbarMicrophoneButtonClicked event', async () => {
		let element;
		await browser.get(`${url}?prejoin=false`);

		element = await browser.wait(until.elementLocated(By.id('session-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if toolbar is present
		element = await browser.wait(until.elementLocated(By.id('media-buttons-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Clicking to leave button
		const cameraButton = await browser.findElement(By.id('mic-btn'));
		expect(await cameraButton.isDisplayed()).to.be.true;
		await cameraButton.click();

		// Checking if onToolbarMicrophoneButtonClicked has been received
		element = await browser.wait(until.elementLocated(By.id('onToolbarMicrophoneButtonClicked')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
	});

	it('should receive the onToolbarScreenshareButtonClicked event', async () => {
		let element;
		await browser.get(`${url}?prejoin=false`);

		element = await browser.wait(until.elementLocated(By.id('session-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if toolbar is present
		element = await browser.wait(until.elementLocated(By.id('media-buttons-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Clicking to leave button
		const screenshareButton = await browser.findElement(By.id('screenshare-btn'));
		expect(await screenshareButton.isDisplayed()).to.be.true;
		await screenshareButton.click();

		// Checking if onToolbarScreenshareButtonClicked has been received
		element = await browser.wait(until.elementLocated(By.id('onToolbarScreenshareButtonClicked')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
	});

	it('should receive the onToolbarFullscreenButtonClicked event', async () => {
		let element;
		await browser.get(`${url}?prejoin=false`);

		element = await browser.wait(until.elementLocated(By.id('session-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if toolbar is present
		element = await browser.wait(until.elementLocated(By.id('media-buttons-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Open more options menu
		element = await browser.wait(until.elementLocated(By.id('more-options-btn')), TIMEOUT);
		await element.click();

		// Clicking to fullscreen button
		element = await browser.wait(until.elementLocated(By.className('mat-menu-content')), TIMEOUT);
		const fullscreenButton = await browser.findElement(By.id('fullscreen-btn'));
		expect(await fullscreenButton.isDisplayed()).to.be.true;
		await fullscreenButton.click();

		// Checking if onToolbarFullscreenButtonClicked has been received
		element = await browser.wait(until.elementLocated(By.id('onToolbarFullscreenButtonClicked')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
	});

	it('should receive the onToolbarChatPanelButtonClicked event', async () => {
		let element;
		await browser.get(`${url}?prejoin=false`);

		element = await browser.wait(until.elementLocated(By.id('session-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if toolbar is present
		element = await browser.wait(until.elementLocated(By.id('media-buttons-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Clicking to chat button
		const chatButton = await browser.findElement(By.id('chat-panel-btn'));
		expect(await chatButton.isDisplayed()).to.be.true;
		await chatButton.click();

		// Checking if onToolbarChatPanelButtonClicked has been received
		element = await browser.wait(until.elementLocated(By.id('onToolbarChatPanelButtonClicked')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
	});

	it('should receive the onToolbarParticipantsPanelButtonClicked event', async () => {
		let element;
		await browser.get(`${url}?prejoin=false`);

		element = await browser.wait(until.elementLocated(By.id('session-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if toolbar is present
		element = await browser.wait(until.elementLocated(By.id('media-buttons-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Clicking to participants button
		const participantsButton = await browser.findElement(By.id('participants-panel-btn'));
		expect(await participantsButton.isDisplayed()).to.be.true;
		await participantsButton.click();

		// Checking if onToolbarParticipantsPanelButtonClicked has been received
		element = await browser.wait(until.elementLocated(By.id('onToolbarParticipantsPanelButtonClicked')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
	});

	it('should receive the onToolbarActivitiesPanelButtonClicked event', async () => {
		let element;
		await browser.get(`${url}?prejoin=false`);

		element = await browser.wait(until.elementLocated(By.id('session-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if toolbar is present
		element = await browser.wait(until.elementLocated(By.id('media-buttons-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Clicking to activities button
		const activitiesButton = await browser.findElement(By.id('activities-panel-btn'));
		expect(await activitiesButton.isDisplayed()).to.be.true;
		await activitiesButton.click();

		// Checking if onToolbarActivitiesPanelButtonClicked has been received
		element = await browser.wait(until.elementLocated(By.id('onToolbarActivitiesPanelButtonClicked')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
	});

	it('should receive the onToolbarStartRecordingClicked event', async () => {
		let element;
		await browser.get(`${url}?prejoin=false`);

		element = await browser.wait(until.elementLocated(By.id('session-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if toolbar is present
		element = await browser.wait(until.elementLocated(By.id('media-buttons-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Open more options menu
		element = await browser.wait(until.elementLocated(By.id('more-options-btn')), TIMEOUT);
		await element.click();

		await browser.sleep(500);

		// Clicking to recording button
		element = await browser.wait(until.elementLocated(By.className('mat-menu-content')), TIMEOUT);
		const recordingButton = await browser.findElement(By.id('recording-btn'));
		expect(await recordingButton.isDisplayed()).to.be.true;
		await recordingButton.click();

		// Checking if onToolbarStartRecordingClicked has been received
		element = await browser.wait(until.elementLocated(By.id('onToolbarStartRecordingClicked')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Can't test the recording
		// element = await browser.wait(until.elementLocated(By.id('recording-tag')), TIMEOUT);

		// Open more options menu
		// element = await browser.wait(until.elementLocated(By.id('more-options-btn')), TIMEOUT);
		// await element.click();

		// // Clicking to recording button
		// element = await browser.wait(until.elementLocated(By.className('mat-menu-content')), TIMEOUT);
		// element = await browser.findElement(By.id('recording-btn'));
		// expect(await recordingButton.isDisplayed()).to.be.true;
		// await recordingButton.click();

		// // Checking if onToolbarStopRecordingClicked has been received
		// element = await browser.wait(until.elementLocated(By.id('onToolbarStopRecordingClicked')), TIMEOUT);
		// expect(await element.isDisplayed()).to.be.true;
	});

	it('should receive the onActivitiesPanelStartRecordingClicked event', async () => {
		let element;
		await browser.get(`${url}?prejoin=false`);

		element = await browser.wait(until.elementLocated(By.id('session-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if toolbar is present
		element = await browser.wait(until.elementLocated(By.id('media-buttons-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Open activities panel
		element = await browser.wait(until.elementLocated(By.id('activities-panel-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		await browser.sleep(1000);

		// Open recording
		element = await browser.wait(until.elementLocated(By.css('ov-recording-activity')), TIMEOUT);
		await element.click();

		await browser.sleep(1000);

		// Clicking to recording button
		element = await browser.wait(until.elementLocated(By.id('start-recording-btn')), TIMEOUT);
		await element.click();

		// Checking if onActivitiesPanelStartRecordingClicked has been received
		element = await browser.wait(until.elementLocated(By.id('onActivitiesPanelStartRecordingClicked')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		/// Can't test the recording
		// Wait until recording ready
		// element = await browser.wait(until.elementLocated(By.id('recording-tag')), TIMEOUT);

		// Clicking to recording button
		// element = await browser.findElement(By.id('stop-recording-btn'));
		// expect(await element.isDisplayed()).to.be.true;
		// await element.click();

		// // Checking if onActivitiesPanelStopRecordingClicked has been received
		// element = await browser.wait(until.elementLocated(By.id('onActivitiesPanelStopRecordingClicked')), TIMEOUT);
		// expect(await element.isDisplayed()).to.be.true;
	});

	it('should receive the PLAY, DOWNLOAD and DELETE recording events', async () => {
		let element;
		await browser.get(`${url}?prejoin=false`);

		element = await browser.wait(until.elementLocated(By.id('session-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if toolbar is present
		element = await browser.wait(until.elementLocated(By.id('media-buttons-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Clicking to activities button
		const activitiesButton = await browser.findElement(By.id('activities-panel-btn'));
		expect(await activitiesButton.isDisplayed()).to.be.true;
		await activitiesButton.click();

		await browser.sleep(1000);

		// Open recording
		element = await browser.wait(until.elementLocated(By.css('ov-recording-activity')), TIMEOUT);
		await element.click();

		await browser.sleep(1000);

		// Download event
		element = await browser.findElement(By.id('download-recording-btn'));
		expect(await element.isDisplayed()).to.be.true;
		await element.click();
		element = await browser.wait(until.elementLocated(By.id('onActivitiesPanelDownloadRecordingClicked')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Delete event
		element = await browser.findElement(By.id('delete-recording-btn'));
		expect(await element.isDisplayed()).to.be.true;
		await element.click();
		element = await browser.findElement(By.id('delete-recording-confirm-btn'));
		expect(await element.isDisplayed()).to.be.true;
		await element.click();
		element = await browser.wait(until.elementLocated(By.id('onActivitiesPanelDeleteRecordingClicked')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

	});

	it('should receive the onSessionCreated event', async () => {
		let element;
		await browser.get(`${url}?prejoin=false`);
		element = await browser.wait(until.elementLocated(By.id('onSessionCreated')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		element = await browser.findElements(By.id('onJoinButtonClicked'));
		expect(element.length).equals(0);
	});

	// * PUBLISHER EVENTS

	it('should receive onParticipantCreated event from LOCAL participant', async () => {
		const participantName = 'TEST_USER';
		let element;
		await browser.get(`${url}?participantName=${participantName}`);
		element = await browser.wait(until.elementLocated(By.id(`${participantName}-onParticipantCreated`)), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
	});

	// * SESSION EVENTS

	it('should receive connectionCreated event from LOCAL participant', async () => {
		const participantName = 'TEST_USER';
		let element;
		await browser.get(`${url}?prejoin=false&participantName=${participantName}`);
		element = await browser.wait(until.elementLocated(By.id(`${participantName}-connectionCreated`)), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
	});

	it('should receive sessionDisconnected event from LOCAL participant', async () => {
		const participantName = 'TEST_USER';
		let element;
		await browser.get(`${url}?prejoin=false&participantName=${participantName}`);
		element = await browser.wait(until.elementLocated(By.id('session-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if toolbar is present
		element = await browser.wait(until.elementLocated(By.id('media-buttons-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if leave button is not present
		element = await browser.wait(until.elementLocated(By.id('leave-btn')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id(`${participantName}-sessionDisconnected`)), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
	});
});

describe('Testing screenshare features', () => {
	let browser: WebDriver;
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
	});

	afterEach(async () => {
		await browser.quit();
	});

	it('should toggle screensharing', async () => {
		let element;
		await browser.get(`${url}?prejoin=false`);
		element = await browser.wait(until.elementLocated(By.id('layout')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Clicking to screensharing button
		const screenshareButton = await browser.findElement(By.id('screenshare-btn'));
		expect(await screenshareButton.isDisplayed()).to.be.true;
		await screenshareButton.click();

		element = await browser.wait(until.elementLocated(By.className('OV_big')), TIMEOUT);
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
		await browser.get(`${url}?prejoin=false`);
		element = await browser.wait(until.elementLocated(By.id('layout')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		await browser.wait(until.elementLocated(By.id('layout')), TIMEOUT);
		const micButton = await browser.findElement(By.id('mic-btn'));
		expect(await micButton.isDisplayed()).to.be.true;
		await micButton.click();

		// Clicking to screensharing button
		const screenshareButton = await browser.findElement(By.id('screenshare-btn'));
		expect(await screenshareButton.isDisplayed()).to.be.true;
		await screenshareButton.click();

		element = await browser.wait(until.elementLocated(By.className('screen-type')), TIMEOUT);
		element = await browser.findElements(By.css('video'));
		expect(element.length).equals(2);

		isAudioEnabled = await browser.executeScript(getAudioScript('screen-type'));
		expect(isAudioEnabled).to.be.false;

		await browser.wait(until.elementLocated(By.id('statusMic')), TIMEOUT);
		element = await browser.findElements(By.id('statusMic'));
		expect(element.length).equals(2);

		// Clicking to screensharing button
		await screenshareButton.click();

		element = await browser.findElements(By.css('video'));
		expect(element.length).equals(1);
	});

	it('should show and hide CAMERA stream when muting video with screensharing', async () => {
		let element;
		await browser.get(`${url}?prejoin=false`);
		element = await browser.wait(until.elementLocated(By.id('layout')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Clicking to screensharing button
		const screenshareButton = await browser.findElement(By.id('screenshare-btn'));
		expect(await screenshareButton.isDisplayed()).to.be.true;
		await screenshareButton.click();

		element = await browser.wait(until.elementLocated(By.className('OV_big')), TIMEOUT);
		element = await browser.findElements(By.css('video'));
		expect(element.length).equals(2);

		const muteVideoButton = await browser.findElement(By.id('camera-btn'));
		await muteVideoButton.click();

		element = await browser.findElements(By.css('video'));
		expect(element.length).equals(1);
	});

	it('should screenshare has audio active when camera is muted', async () => {
		let element, isAudioEnabled;
		const audioEnableScript = 'return document.getElementsByTagName("video")[0].srcObject.getAudioTracks()[0].enabled;';

		await browser.get(`${url}?prejoin=false`);
		element = await browser.wait(until.elementLocated(By.id('layout')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Clicking to screensharing button
		const screenshareButton = await browser.findElement(By.id('screenshare-btn'));
		expect(await screenshareButton.isDisplayed()).to.be.true;
		await screenshareButton.click();

		element = await browser.wait(until.elementLocated(By.className('OV_big')), TIMEOUT);
		element = await browser.findElements(By.css('video'));
		expect(element.length).equals(2);

		element = await browser.findElements(By.id('statusMic'));
		expect(element.length).equals(1);

		// Muting camera video
		const muteVideoButton = await browser.findElement(By.id('camera-btn'));
		await muteVideoButton.click();

		element = await browser.findElements(By.css('video'));
		expect(element.length).equals(1);
		await browser.sleep(500);
		element = await browser.findElements(By.id('statusMic'));
		expect(element.length).equals(0);

		// Checking if audio is muted after join the room
		isAudioEnabled = await browser.executeScript(audioEnableScript);
		expect(isAudioEnabled).to.be.true;

		// Unmuting camera
		await muteVideoButton.click();

		element = await browser.wait(until.elementLocated(By.className('camera-type')), TIMEOUT);
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

		await browser.get(`${url}?prejoin=false`);
		element = await browser.wait(until.elementLocated(By.id('layout')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Clicking to screensharing button
		const screenshareButton = await browser.findElement(By.id('screenshare-btn'));
		expect(await screenshareButton.isDisplayed()).to.be.true;
		await screenshareButton.click();

		element = await browser.wait(until.elementLocated(By.className('screen-type')), TIMEOUT);
		element = await browser.findElements(By.css('video'));
		expect(element.length).equals(2);

		element = await browser.findElements(By.id('statusMic'));
		expect(element.length).equals(1);

		// Mute camera
		const muteVideoButton = await browser.findElement(By.id('camera-btn'));
		await muteVideoButton.click();

		element = await browser.findElements(By.css('video'));
		expect(element.length).equals(1);

		element = await browser.findElements(By.id('statusMic'));
		expect(element.length).equals(0);

		// Checking if audio is muted after join the room
		isAudioEnabled = await browser.executeScript(getAudioScript('screen-type'));
		expect(isAudioEnabled).to.be.true;

		// Mute audio
		const muteAudioButton = await browser.findElement(By.id('mic-btn'));
		await muteAudioButton.click();

		await browser.wait(until.elementLocated(By.id('statusMic')), TIMEOUT);
		element = await browser.findElements(By.id('statusMic'));
		expect(element.length).equals(1);

		isAudioEnabled = await browser.executeScript(getAudioScript('screen-type'));
		expect(isAudioEnabled).to.be.false;

		// Unmute camera
		await muteVideoButton.click();

		element = await browser.wait(until.elementLocated(By.className('camera-type')), TIMEOUT);
		element = await browser.findElements(By.css('video'));
		expect(element.length).equals(2);

		element = await browser.findElements(By.id('statusMic'));
		expect(element.length).equals(2);

		isAudioEnabled = await browser.executeScript(getAudioScript('camera-type'));
		expect(isAudioEnabled).to.be.false;
	});
});

describe('Testing panel toggling', () => {
	let browser: WebDriver;
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
	});

	afterEach(async () => {
		await browser.quit();
	});

	it('should toggle CHAT panel', async () => {
		let element;
		await browser.get(`${url}?prejoin=false`);
		element = await browser.wait(until.elementLocated(By.id('layout')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		const chatButton = await browser.findElement(By.id('chat-panel-btn'));
		expect(await chatButton.isDisplayed()).to.be.true;
		await chatButton.click();

		element = await browser.wait(until.elementLocated(By.className('sidenav-menu')), TIMEOUT);
		element = await browser.findElements(By.className('input-container'));
		expect(element.length).equals(1);
		element = await browser.findElement(By.className('messages-container'));
		expect(await element.isDisplayed()).to.be.true;

		await chatButton.click();

		element = await browser.findElements(By.className('input-container'));
		expect(element.length).equals(0);
		element = await browser.findElements(By.css('messages-container'));
		expect(element.length).equals(0);
	});

	it('should toggle PARTICIPANTS panel', async () => {
		let element;
		await browser.get(`${url}?prejoin=false`);
		element = await browser.wait(until.elementLocated(By.id('layout')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		const participantBtn = await browser.findElement(By.id('participants-panel-btn'));
		expect(await participantBtn.isDisplayed()).to.be.true;
		await participantBtn.click();

		element = await browser.wait(until.elementLocated(By.className('sidenav-menu')), TIMEOUT);
		element = await browser.findElements(By.className('local-participant-container'));
		expect(element.length).equals(1);
		element = await browser.findElement(By.css('ov-participant-panel-item'));
		expect(await element.isDisplayed()).to.be.true;

		await participantBtn.click();

		element = await browser.findElements(By.className('local-participant-container'));
		expect(element.length).equals(0);
		element = await browser.findElements(By.css('ov-participant-panel-item'));
		expect(element.length).equals(0);
	});

	it('should toggle ACTIVITIES panel', async () => {
		let element;
		await browser.get(`${url}?prejoin=false`);
		element = await browser.wait(until.elementLocated(By.id('layout')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Get activities button and click into it
		const activitiesBtn = await browser.findElement(By.id('activities-panel-btn'));
		expect(await activitiesBtn.isDisplayed()).to.be.true;
		await activitiesBtn.click();

		element = await browser.wait(until.elementLocated(By.className('sidenav-menu')), TIMEOUT);
		element = await browser.findElements(By.id('activities-container'));
		expect(element.length).equals(1);
		element = await browser.findElement(By.id('recording-activity'));
		expect(await element.isDisplayed()).to.be.true;

		await activitiesBtn.click();

		element = await browser.findElements(By.className('activities-container'));
		expect(element.length).equals(0);
		element = await browser.findElements(By.id('recording-activity'));
		expect(element.length).equals(0);
	});

	it('should toggle SETTINGS panel', async () => {
		let element;
		await browser.get(`${url}?prejoin=false`);
		element = await browser.wait(until.elementLocated(By.id('layout')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if toolbar is present
		element = await browser.wait(until.elementLocated(By.id('media-buttons-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Open more options menu
		element = await browser.wait(until.elementLocated(By.id('more-options-btn')), TIMEOUT);
		await element.click();

		await browser.sleep(500);

		// Checking if mat menu is  present
		element = await browser.wait(until.elementLocated(By.className('mat-menu-content')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Get settings button and click into it
		const activitiesBtn = await browser.findElement(By.id('toolbar-settings-btn'));
		expect(await activitiesBtn.isDisplayed()).to.be.true;
		await activitiesBtn.click();

		element = await browser.wait(until.elementLocated(By.className('sidenav-menu')), TIMEOUT);
		element = await browser.findElements(By.id('default-settings-panel'));
		expect(element.length).equals(1);

	});

	it('should switching between PARTICIPANTS and CHAT panels', async () => {
		let element;
		await browser.get(`${url}?prejoin=false`);
		element = await browser.wait(until.elementLocated(By.id('layout')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Open chat panel
		const chatButton = await browser.findElement(By.id('chat-panel-btn'));
		expect(await chatButton.isDisplayed()).to.be.true;
		await chatButton.click();

		element = await browser.wait(until.elementLocated(By.className('sidenav-menu')), TIMEOUT);
		element = await browser.findElements(By.className('input-container'));
		expect(element.length).equals(1);
		element = await browser.findElement(By.className('messages-container'));
		expect(await element.isDisplayed()).to.be.true;

		// Open participants panel
		const participantBtn = await browser.findElement(By.id('participants-panel-btn'));
		expect(await participantBtn.isDisplayed()).to.be.true;
		await participantBtn.click();

		element = await browser.wait(until.elementLocated(By.className('sidenav-menu')), TIMEOUT);
		element = await browser.findElements(By.className('local-participant-container'));
		expect(element.length).equals(1);
		element = await browser.findElement(By.css('ov-participant-panel-item'));
		expect(await element.isDisplayed()).to.be.true;

		// Switch to chat panel
		await chatButton.click();

		element = await browser.wait(until.elementLocated(By.className('sidenav-menu')), TIMEOUT);
		element = await browser.findElements(By.className('input-container'));
		expect(element.length).equals(1);
		element = await browser.findElement(By.className('messages-container'));
		expect(await element.isDisplayed()).to.be.true;

		element = await browser.findElements(By.className('local-participant-container'));
		expect(element.length).equals(0);
		element = await browser.findElements(By.css('ov-participant-panel-item'));
		expect(element.length).equals(0);

		// Close chat panel
		await chatButton.click();
		element = await browser.findElements(By.className('input-container'));
		expect(element.length).equals(0);
		element = await browser.findElements(By.css('messages-container'));
		expect(element.length).equals(0);
	});
});
