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
	// 	expect(await utils.isPresent('#pre-join-container')).toBeTrue();

	// 	const backgroundButton = await utils.waitForElement('#background-effects-btn');
	// 	expect(await utils.isPresent('#background-effects-btn')).toBeTrue();
	// 	expect(await backgroundButton.isEnabled()).toBeTrue();
	// 	await backgroundButton.click();
	// 	await browser.sleep(500);

	// 	await utils.waitForElement('#background-effects-container');
	// 	expect(await utils.isPresent('#background-effects-container')).toBeTrue();

	// 	element = await utils.waitForElement('#camera-button');
	// 	expect(await utils.isPresent('#camera-button')).toBeTrue();
	// 	expect(await element.isEnabled()).toBeTrue();
	// 	await element.click();

	// 	await browser.sleep(500);
	// 	element = await utils.waitForElement('#video-poster');
	// 	expect(await utils.isPresent('#video-poster')).toBeTrue();

	// 	expect(await backgroundButton.isDisplayed()).toBeTrue();
	// 	expect(await backgroundButton.isEnabled()).toBeFalse();

	// 	expect(await utils.isPresent('#background-effects-container')).toBeFalse();
	// });

	it('should toggle CHAT panel', async () => {
		await browser.get(`${url}&prejoin=false`);

		await utils.checkLayoutPresent();

		const chatButton = await utils.waitForElement('#chat-panel-btn');
		await chatButton.click();

		await utils.waitForElement('.sidenav-menu');
		await utils.waitForElement('.input-container');
		expect(await utils.isPresent('.input-container')).toBeTrue();

		await utils.waitForElement('.messages-container');
		expect(await utils.isPresent('.messages-container')).toBeTrue();

		await chatButton.click();

		expect(await utils.isPresent('.input-container')).toBeFalse();
		expect(await utils.isPresent('.messages-container')).toBeFalse();
	});

	it('should toggle PARTICIPANTS panel', async () => {
		await browser.get(`${url}&prejoin=false`);

		await utils.checkLayoutPresent();

		const participantBtn = await utils.waitForElement('#participants-panel-btn');
		await participantBtn.click();

		await utils.waitForElement('.sidenav-menu');

		await utils.waitForElement('.local-participant-container');
		expect(await utils.isPresent('.local-participant-container')).toBeTrue();

		await utils.waitForElement('ov-participant-panel-item');
		expect(await utils.isPresent('ov-participant-panel-item')).toBeTrue();

		await participantBtn.click();

		expect(await utils.isPresent('.local-participant-container')).toBeFalse();
		expect(await utils.isPresent('ov-participant-panel-item')).toBeFalse();
	});

	it('should toggle ACTIVITIES panel', async () => {
		await browser.get(`${url}&prejoin=false`);

		await utils.checkLayoutPresent();

		// Get activities button and click into it
		const activitiesBtn = await utils.waitForElement('#activities-panel-btn');
		await activitiesBtn.click();

		await utils.waitForElement('.sidenav-menu');
		await utils.waitForElement('#activities-container');
		expect(await utils.isPresent('#activities-container')).toBeTrue();

		await utils.waitForElement('#recording-activity');
		expect(await utils.isPresent('#recording-activity')).toBeTrue();
		await activitiesBtn.click();

		expect(await utils.isPresent('#activities-container')).toBeFalse();
		expect(await utils.isPresent('#recording-activity')).toBeFalse();
	});

	it('should toggle SETTINGS panel', async () => {
		let element;
		await browser.get(`${url}&prejoin=false`);

		await utils.checkLayoutPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		await utils.togglePanel('settings');

		element = await utils.waitForElement('.sidenav-menu');
		expect(await utils.isPresent('#default-settings-panel')).toBeTrue();
	});

	it('should switching between PARTICIPANTS and CHAT panels', async () => {
		await browser.get(`${url}&prejoin=false`);

		await utils.checkSessionIsPresent();

		await utils.checkToolbarIsPresent();

		// Open chat panel
		const chatButton = await utils.waitForElement('#chat-panel-btn');
		await chatButton.click();

		await utils.waitForElement('.sidenav-menu');
		expect(await utils.isPresent('.sidenav-menu')).toBeTrue();

		await utils.waitForElement('.input-container');
		expect(await utils.isPresent('.input-container')).toBeTrue();

		expect(await utils.isPresent('.messages-container')).toBeTrue();

		// Open participants panel
		const participantBtn = await utils.waitForElement('#participants-panel-btn');
		await participantBtn.click();

		await utils.waitForElement('.sidenav-menu');

		expect(await utils.isPresent('.local-participant-container')).toBeTrue();

		expect(await utils.isPresent('ov-participant-panel-item')).toBeTrue();

		// Switch to chat panel
		await chatButton.click();

		await utils.waitForElement('.sidenav-menu');

		expect(await utils.isPresent('.input-container')).toBeTrue();

		expect(await utils.isPresent('.messages-container')).toBeTrue();

		expect(await utils.isPresent('.local-participant-container')).toBeFalse();

		expect(await utils.isPresent('ov-participant-panel-item')).toBeFalse();

		// Close chat panel
		await chatButton.click();
		expect(await utils.getNumberOfElements('.input-container')).toEqual(0);
		expect(await utils.isPresent('messages-container')).toBeFalse();
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
		expect(await utils.isPresent('.sidenav-menu')).toBeTrue();

		// Check if general section is shown
		element = await utils.waitForElement('#general-opt');
		await element.click();

		expect(await utils.isPresent('ov-participant-name-input')).toBeTrue();

		// Check if video section is shown
		element = await utils.waitForElement('#video-opt');
		await element.click();

		expect(await utils.isPresent('ov-video-devices-select')).toBeTrue();

		// Check if audio section is shown
		element = await utils.waitForElement('#audio-opt');
		await element.click();

		expect(await utils.isPresent('ov-audio-devices-select')).toBeTrue();
	});
});
