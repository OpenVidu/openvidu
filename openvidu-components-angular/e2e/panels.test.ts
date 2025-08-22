import { Builder, WebDriver } from 'selenium-webdriver';
import { TestAppConfig } from './selenium.conf';
import { OpenViduComponentsPO } from './utils.po.test';

const url = TestAppConfig.appUrl;

describe('Panels: UI Navigation and Section Switching', () => {
	let browser: WebDriver;
	let utils: OpenViduComponentsPO;

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
			await utils.leaveRoom();
		} catch (error) {}
		await browser.quit();
	});

	fit('should close BACKGROUND panel on prejoin page when VIDEO is MUTED', async () => {
		let element;
		await browser.get(`${url}`);
		await utils.checkPrejoinIsPresent();

		const backgroundButton = await utils.waitForElement('#background-effects-btn');
		expect(await utils.isPresent('#background-effects-btn')).toBeTrue();
		expect(await backgroundButton.isEnabled()).toBeTrue();
		await backgroundButton.click();
		await browser.sleep(500);

		await utils.waitForElement('#background-effects-container');
		expect(await utils.isPresent('#background-effects-container')).toBeTrue();

		element = await utils.waitForElement('#camera-button');
		expect(await utils.isPresent('#camera-button')).toBeTrue();
		expect(await element.isEnabled()).toBeTrue();
		await element.click();

		await browser.sleep(500);
		element = await utils.waitForElement('#video-poster');
		expect(await utils.isPresent('#video-poster')).toBeTrue();

		expect(await backgroundButton.isDisplayed()).toBeTrue();
		expect(await backgroundButton.isEnabled()).toBeFalse();

		expect(await utils.isPresent('#background-effects-container')).toBeFalse();
	});

	it('should open and close the CHAT panel and verify its content', async () => {
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

	it('should open and close the PARTICIPANTS panel and verify its content', async () => {
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

	it('should open and close the ACTIVITIES panel and verify its content', async () => {
		await browser.get(`${url}&prejoin=false`);
		await utils.checkLayoutPresent();
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

	it('should open the SETTINGS panel and verify its content', async () => {
		let element;
		await browser.get(`${url}&prejoin=false`);
		await utils.checkLayoutPresent();
		await utils.checkToolbarIsPresent();
		await utils.togglePanel('settings');
		element = await utils.waitForElement('.sidenav-menu');
		expect(await utils.isPresent('#default-settings-panel')).toBeTrue();
	});

	it('should switch between PARTICIPANTS and CHAT panels and verify correct content is shown', async () => {
		await browser.get(`${url}&prejoin=false`);
		await utils.checkSessionIsPresent();
		await utils.checkToolbarIsPresent();
		const chatButton = await utils.waitForElement('#chat-panel-btn');
		await chatButton.click();
		await utils.waitForElement('.sidenav-menu');
		expect(await utils.isPresent('.sidenav-menu')).toBeTrue();
		await utils.waitForElement('.input-container');
		expect(await utils.isPresent('.input-container')).toBeTrue();
		expect(await utils.isPresent('.messages-container')).toBeTrue();
		const participantBtn = await utils.waitForElement('#participants-panel-btn');
		await participantBtn.click();
		await utils.waitForElement('.sidenav-menu');
		expect(await utils.isPresent('.local-participant-container')).toBeTrue();
		expect(await utils.isPresent('ov-participant-panel-item')).toBeTrue();
		await chatButton.click();
		await utils.waitForElement('.sidenav-menu');
		expect(await utils.isPresent('.input-container')).toBeTrue();
		expect(await utils.isPresent('.messages-container')).toBeTrue();
		expect(await utils.isPresent('.local-participant-container')).toBeFalse();
		expect(await utils.isPresent('ov-participant-panel-item')).toBeFalse();
		await chatButton.click();
		expect(await utils.getNumberOfElements('.input-container')).toEqual(0);
		expect(await utils.isPresent('messages-container')).toBeFalse();
	});

	it('should switch between sections in the SETTINGS panel and verify correct content is shown', async () => {
		let element;
		await browser.get(`${url}&prejoin=false`);
		await utils.checkToolbarIsPresent();
		await utils.togglePanel('settings');
		await utils.waitForElement('.sidenav-menu');
		expect(await utils.isPresent('.sidenav-menu')).toBeTrue();
		await browser.sleep(500);
		element = await utils.waitForElement('#general-opt');
		await element.click();
		expect(await utils.isPresent('ov-participant-name-input')).toBeTrue();
		element = await utils.waitForElement('#video-opt');
		await element.click();
		expect(await utils.isPresent('ov-video-devices-select')).toBeTrue();
		element = await utils.waitForElement('#audio-opt');
		await element.click();
		expect(await utils.isPresent('ov-audio-devices-select')).toBeTrue();
	});
});
