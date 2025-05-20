import { Builder, By, WebDriver } from 'selenium-webdriver';

import { NestedConfig } from '../selenium.conf';
import { OpenViduComponentsPO } from '../utils.po.test';

const url = NestedConfig.appUrl;

describe('OpenVidu Components ATTRIBUTE toolbar directives', () => {
	let browser: WebDriver;
	let utils: OpenViduComponentsPO;

	async function createChromeBrowser(): Promise<WebDriver> {
		return await new Builder()
			.forBrowser(NestedConfig.browserName)
			.withCapabilities(NestedConfig.browserCapabilities)
			.setChromeOptions(NestedConfig.browserOptions)
			.usingServer(NestedConfig.seleniumAddress)
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

	it('should HIDE the CHAT PANEL BUTTON', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovToolbar-checkbox');

		await utils.clickOn('#chatPanelButton-checkbox');

		await utils.clickOn('#apply-btn');

		await utils.checkToolbarIsPresent();

		// Check if chat button does not exist
		expect(await utils.isPresent('chat-panel-btn')).toBeFalse();
	});

	it('should HIDE the PARTICIPANTS PANEL BUTTON', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovToolbar-checkbox');

		await utils.clickOn('#participantsPanelButton-checkbox');

		await utils.clickOn('#apply-btn');

		await utils.checkToolbarIsPresent();

		// Check if participants button does not exist
		expect(await utils.isPresent('participants-panel-btn')).toBeFalse();
	});

	it('should HIDE the ACTIVITIES PANEL BUTTON', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovToolbar-checkbox');

		await utils.clickOn('#activitiesPanelButton-checkbox');

		await utils.clickOn('#apply-btn');

		await utils.checkToolbarIsPresent();

		// Check if participants button does not exist
		expect(await utils.isPresent('activities-panel-btn')).toBeFalse();
	});

	it('should HIDE the DISPLAY LOGO', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovToolbar-checkbox');

		await utils.clickOn('#displayLogo-checkbox');

		await utils.clickOn('#apply-btn');

		await utils.checkToolbarIsPresent();

		expect(await utils.isPresent('branding-logo')).toBeFalse();
	});

	it('should HIDE the DISPLAY ROOM name', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovToolbar-checkbox');

		await utils.clickOn('#displayRoomName-checkbox');

		await utils.clickOn('#apply-btn');

		await utils.checkToolbarIsPresent();

		expect(await utils.isPresent('session-name')).toBeFalse();
	});

	it('should HIDE the FULLSCREEN button', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovToolbar-checkbox');

		await utils.clickOn('#fullscreenButton-checkbox');

		await utils.clickOn('#apply-btn');

		await utils.checkToolbarIsPresent();

		// Open more options menu
		await utils.clickOn('#more-options-btn');

		await browser.sleep(500);

		await utils.waitForElement('#more-options-menu');

		// Checking if fullscreen button is not present
		expect(await utils.isPresent('#fullscreen-btn')).toBeFalse();
	});

	it('should HIDE the STREAMING button', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovToolbar-checkbox');

		await utils.clickOn('#broadcastingButton-checkbox');

		await utils.clickOn('#apply-btn');

		await utils.checkToolbarIsPresent();

		// Open more options menu
		await utils.clickOn('#more-options-btn');
		await browser.sleep(500);

		await utils.waitForElement('#more-options-menu');

		// Checking if fullscreen button is not present
		expect(await utils.isPresent('#broadcasting-btn')).toBeFalse();
	});

	it('should HIDE the LEAVE button', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovToolbar-checkbox');

		await utils.clickOn('#leaveButton-checkbox');

		await utils.clickOn('#apply-btn');

		await utils.checkToolbarIsPresent();

		expect(await utils.isPresent('leave-btn')).toBeFalse();
	});

	it('should HIDE the SCREENSHARE button', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovToolbar-checkbox');

		await utils.clickOn('#screenshareButton-checkbox');

		await utils.clickOn('#apply-btn');

		await utils.checkToolbarIsPresent();

		expect(await utils.isPresent('screenshare-btn')).toBeFalse();
	});
});

describe('OpenVidu Components ATTRIBUTE stream directives', () => {
	let browser: WebDriver;
	let utils: OpenViduComponentsPO;

	async function createChromeBrowser(): Promise<WebDriver> {
		return await new Builder()
			.forBrowser(NestedConfig.browserName)
			.withCapabilities(NestedConfig.browserCapabilities)
			.setChromeOptions(NestedConfig.browserOptions)
			.usingServer(NestedConfig.seleniumAddress)
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

	it('should HIDE the AUDIO detector', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovStream-checkbox');

		await utils.clickOn('#displayAudioDetection-checkbox');

		await utils.clickOn('#apply-btn');

		await utils.waitForElement('#session-container');
		await utils.waitForElement('#custom-stream');

		expect(await utils.isPresent('audio-wave-container')).toBeFalse();
	});

	it('should HIDE the PARTICIPANT NAME', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovStream-checkbox');

		await utils.clickOn('#displayParticipantName-checkbox');

		await utils.clickOn('#apply-btn');

		await utils.waitForElement('#session-container');
		await utils.waitForElement('#custom-stream');

		expect(await utils.isPresent('participant-name-container')).toBeFalse();
	});

	it('should HIDE the SETTINGS button', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovStream-checkbox');

		await utils.clickOn('#settingsButton-checkbox');

		await utils.clickOn('#apply-btn');

		await utils.waitForElement('#custom-stream');

		expect(await utils.isPresent('settings-container')).toBeFalse();
	});
});

describe('OpenVidu Components ATTRIBUTE participant panels directives', () => {
	let browser: WebDriver;
	let utils: OpenViduComponentsPO;

	async function createChromeBrowser(): Promise<WebDriver> {
		return await new Builder()
			.forBrowser(NestedConfig.browserName)
			.withCapabilities(NestedConfig.browserCapabilities)
			.setChromeOptions(NestedConfig.browserOptions)
			.usingServer(NestedConfig.seleniumAddress)
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

	it('should HIDE the participant MUTE button', async () => {
		const fixedSession = `${url}?sessionId=fixedNameTesting`;
		await browser.get(`${fixedSession}`);

		await utils.clickOn('#ovParticipantPanelItem-checkbox');

		await utils.clickOn('#muteButton-checkbox');

		await utils.clickOn('#apply-btn');

		await utils.checkSessionIsPresent();
		await utils.checkToolbarIsPresent();

		await utils.clickOn('#participants-panel-btn');

		await utils.waitForElement('#participants-container');

		// Starting new browser for adding a new participant
		const newTabScript = `window.open("${fixedSession}")`;
		await browser.executeScript(newTabScript);

		// Get tabs opened
		const tabs = await browser.getAllWindowHandles();
		// Focus on the last tab
		browser.switchTo().window(tabs[1]);

		await utils.clickOn('#apply-btn');

		// Switch to first tab
		await browser.switchTo().window(tabs[0]);

		await utils.waitForElement('#remote-participant-item');

		expect(await utils.isPresent('mute-btn')).toBeFalse();
	});
});

describe('OpenVidu Components ATTRIBUTE activity panel directives', () => {
	let browser: WebDriver;
	let utils: OpenViduComponentsPO;

	async function createChromeBrowser(): Promise<WebDriver> {
		return await new Builder()
			.forBrowser(NestedConfig.browserName)
			.withCapabilities(NestedConfig.browserCapabilities)
			.setChromeOptions(NestedConfig.browserOptions)
			.usingServer(NestedConfig.seleniumAddress)
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

	it('should HIDE the RECORDING activity', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovActivitiesPanel-checkbox');

		await utils.clickOn('#recordingActivity-checkbox');

		await utils.clickOn('#apply-btn');

		await utils.checkToolbarIsPresent();

		await utils.clickOn('#activities-panel-btn');

		await browser.sleep(500);

		await utils.waitForElement('#custom-activities-panel');

		expect(await utils.isPresent('ov-recording-activity')).toBeFalse();
	});

	it('should HIDE the STREAMING activity', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovActivitiesPanel-checkbox');

		await utils.clickOn('#broadcastingActivity-checkbox');

		await utils.clickOn('#apply-btn');

		await utils.checkToolbarIsPresent();

		await utils.clickOn('#activities-panel-btn');

		await browser.sleep(500);

		await utils.waitForElement('#custom-activities-panel');

		await utils.waitForElement('ov-recording-activity');

		expect(await utils.isPresent('ov-broadcasting-activity')).toBeFalse();
	});
});
