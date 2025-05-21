import { Builder, WebDriver } from 'selenium-webdriver';
import { TestAppConfig } from './selenium.conf';
import { OpenViduComponentsPO } from './utils.po.test';

const url = TestAppConfig.appUrl;

describe('Toolbar button functionality for local media control', () => {
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

	it('should toggle mute/unmute on the local microphone and update the icon accordingly', async () => {
		await browser.get(`${url}&prejoin=false`);

		await utils.checkLayoutPresent();

		const micButton = await utils.waitForElement('#mic-btn');
		await micButton.click();

		await utils.waitForElement('#mic-btn #mic_off');
		expect(await utils.isPresent('#mic-btn #mic_off')).toBeTrue();

		await micButton.click();

		await utils.waitForElement('#mic-btn #mic');
		expect(await utils.isPresent('#mic-btn #mic')).toBeTrue();
	});

	it('should toggle mute/unmute on the local camera and update the icon accordingly', async () => {
		await browser.get(`${url}&prejoin=false`);

		await utils.checkLayoutPresent();

		const cameraButton = await utils.waitForElement('#camera-btn');
		await cameraButton.click();

		await utils.waitForElement('#camera-btn #videocam_off');
		expect(await utils.isPresent('#camera-btn #videocam_off')).toBeTrue();

		await cameraButton.click();

		await utils.waitForElement('#camera-btn #videocam');
		expect(await utils.isPresent('#camera-btn #videocam')).toBeTrue();
	});
});
