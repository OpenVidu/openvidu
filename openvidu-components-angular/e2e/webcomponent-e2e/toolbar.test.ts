import { expect } from 'chai';
import { Builder, WebDriver } from 'selenium-webdriver';
import { OPENVIDU_CALL_SERVER } from '../config';
import { WebComponentConfig } from '../selenium.conf';
import { OpenViduComponentsPO } from '../utils.po.test';

const url = `${WebComponentConfig.appUrl}?OV_URL=${OPENVIDU_CALL_SERVER}`;

describe('Testing TOOLBAR features', () => {
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

	it('should mute and unmute the local microphone', async () => {
		await browser.get(`${url}&prejoin=false`);

		await utils.checkLayoutPresent();

		const micButton = await utils.waitForElement('#mic-btn');
		await micButton.click();

		await utils.waitForElement('#mic-btn #mic_off');
		expect(await utils.isPresent('#mic-btn #mic_off')).to.be.true;

		await micButton.click();

		await utils.waitForElement('#mic-btn #mic');
		expect(await utils.isPresent('#mic-btn #mic')).to.be.true;
	});

	it('should mute and unmute the local camera', async () => {
		await browser.get(`${url}&prejoin=false`);

		await utils.checkLayoutPresent();

		const cameraButton = await utils.waitForElement('#camera-btn');
		await cameraButton.click();

		await utils.waitForElement('#camera-btn #videocam_off');
		expect(await utils.isPresent('#camera-btn #videocam_off')).to.be.true;

		await cameraButton.click();

		await utils.waitForElement('#camera-btn #videocam');
		expect(await utils.isPresent('#camera-btn #videocam')).to.be.true;
	});
});
