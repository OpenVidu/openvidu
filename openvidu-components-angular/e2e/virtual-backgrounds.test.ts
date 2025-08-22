import { Builder, WebDriver } from 'selenium-webdriver';
import { TestAppConfig } from './selenium.conf';
import { OpenViduComponentsPO } from './utils.po.test';

const url = TestAppConfig.appUrl;

describe('Prejoin: Virtual Backgrounds', () => {
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

	it('should close BACKGROUNDS on prejoin page when VIDEO is disabled', async () => {
		let element;
		await browser.get(`${url}`);
		await utils.checkPrejoinIsPresent();

		const backgroundButton = await utils.waitForElement('#backgrounds-button');
		expect(await utils.isPresent('#backgrounds-button')).toBeTrue();
		expect(await backgroundButton.isEnabled()).toBeTrue();
		await utils.clickOn('#backgrounds-button');
		await browser.sleep(500);

		await utils.waitForElement('#background-effects-container');
		expect(await utils.isPresent('#background-effects-container')).toBeTrue();

		await utils.clickOn('#camera-button');

		await browser.sleep(500);
		element = await utils.waitForElement('#video-poster');
		expect(await utils.isPresent('#video-poster')).toBeTrue();

		expect(await backgroundButton.isDisplayed()).toBeTrue();
		expect(await backgroundButton.isEnabled()).toBeFalse();

		await browser.sleep(1000);
		expect(await utils.getNumberOfElements('#background-effects-container')).toBe(0);
	});

	it('should open and close BACKGROUNDS panel on prejoin page', async () => {
		await browser.get(`${url}`);
		await utils.checkPrejoinIsPresent();

		const backgroundButton = await utils.waitForElement('#backgrounds-button');
		expect(await utils.isPresent('#backgrounds-button')).toBeTrue();
		expect(await backgroundButton.isEnabled()).toBeTrue();
		await backgroundButton.click();
		await browser.sleep(500);

		await utils.waitForElement('#background-effects-container');
		expect(await utils.isPresent('#background-effects-container')).toBeTrue();

		await utils.clickOn('#backgrounds-button');
		await browser.sleep(1000);
		expect(await utils.getNumberOfElements('#background-effects-container')).toBe(0);
	});

	it('should apply a background effect on prejoin page', async () => {
		await browser.get(`${url}`);
		await utils.checkPrejoinIsPresent();

		let videoElement = await utils.waitForElement('.OV_video-element');
		await utils.saveScreenshot('before.png', videoElement);

		await utils.applyVirtualBackgroundFromPrejoin('1');

		await browser.sleep(1000);

		videoElement = await utils.waitForElement('.OV_video-element');
		await utils.saveScreenshot('after.png', videoElement);

		await utils.expectVirtualBackgroundApplied('before.png', 'after.png');
	});
});

describe('Room: Virtual Backgrounds', () => {
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

	it('should open and close BACKGROUNDS panel in the room', async () => {
		await browser.get(`${url}&prejoin=false`);
		await utils.checkLayoutPresent();
		await utils.checkToolbarIsPresent();
		await utils.togglePanel('backgrounds');

		await utils.waitForElement('#background-effects-container');
		expect(await utils.isPresent('#background-effects-container')).toBeTrue();

		await utils.togglePanel('backgrounds');
		await browser.sleep(1000);
		expect(await utils.getNumberOfElements('#background-effects-container')).toBe(0);
	});

	it('should apply a background effect in the room', async () => {
		await browser.get(`${url}&prejoin=false`);
		await utils.checkLayoutPresent();

		await utils.togglePanel('backgrounds');

		await utils.waitForElement('#background-effects-container');
		expect(await utils.isPresent('#background-effects-container')).toBeTrue();

		let videoElement = await utils.waitForElement('.OV_video-element');
		await utils.saveScreenshot('before.png', videoElement);

		await utils.applyBackground('1');

		await browser.sleep(1000);

		videoElement = await utils.waitForElement('.OV_video-element');
		await utils.saveScreenshot('after.png', videoElement);

		await utils.expectVirtualBackgroundApplied('before.png', 'after.png');
	});
});
