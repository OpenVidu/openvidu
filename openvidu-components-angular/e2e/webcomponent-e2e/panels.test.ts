import { expect } from 'chai';
import { Builder, Key, WebDriver } from 'selenium-webdriver';
import { OPENVIDU_CALL_SERVER } from '../config';
import { getBrowserOptionsWithoutDevices, WebComponentConfig } from '../selenium.conf';
import { OpenViduComponentsPO } from '../utils.po.test';

const url = `${WebComponentConfig.appUrl}?OV_URL=${OPENVIDU_CALL_SERVER}`;

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

		await utils.togglePanel('settings');

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
		expect(await utils.getNumberOfElements('.input-container')).equals(0);
		expect(await utils.isPresent('messages-container')).to.be.false;
	});

	it('should switching between sections in SETTINGS PANEL', async () => {
		let element;
		await browser.get(`${url}&prejoin=false`);

		await utils.checkToolbarIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		// Open more options menu
		await utils.togglePanel('settings');

		await utils.waitForElement('.sidenav-menu');
		expect(await utils.isPresent('.sidenav-menu')).to.be.true;

		// Check if general section is shown
		element = await utils.waitForElement('#general-opt');
		await element.click();

		expect(await utils.isPresent('ov-participant-name-input')).to.be.true;

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
