import { expect } from 'chai';
import { Builder, WebDriver } from 'selenium-webdriver';
import { OPENVIDU_CALL_SERVER } from '../config';
import { getBrowserOptionsWithoutDevices, WebComponentConfig } from '../selenium.conf';
import { OpenViduComponentsPO } from '../utils.po.test';

const url = `${WebComponentConfig.appUrl}?OV_URL=${OPENVIDU_CALL_SERVER}`;

describe('Testing replace track with emulated devices', () => {
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

	it('should replace the video track in prejoin page', async () => {
		const script = 'return document.getElementsByTagName("video")[0].srcObject.getVideoTracks()[0].label;';

		await browser.get(`${url}&fakeDevices=true`);

		let videoDevices = await utils.waitForElement('#video-devices-form');

		await videoDevices.click();

		let element = await utils.waitForElement('#option-custom_fake_video_1');

		await element.click();

		let videoLabel;

		await browser.sleep(1000);
		videoLabel = await browser.executeScript<string>(script);
		expect(videoLabel).to.be.equal('custom_fake_video_1');

		await videoDevices.click();

		element = await utils.waitForElement('#option-fake_device_0');
		await element.click();

		await browser.sleep(1000);
		videoLabel = await browser.executeScript<string>(script);
		expect(videoLabel).to.be.equal('fake_device_0');
	});

	it('should replace the video track in videoconference page', async () => {
		const script = 'return document.getElementsByTagName("video")[0].srcObject.getVideoTracks()[0].label;';

		await browser.get(`${url}&prejoin=false&fakeDevices=true`);

		await utils.checkSessionIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		await utils.togglePanel('settings');

		await utils.waitForElement('.settings-container');
		expect(await utils.isPresent('.settings-container')).to.be.true;

		await utils.clickOn('#video-opt');
		expect(await utils.isPresent('ov-video-devices-select')).to.be.true;

		let videoDevices = await utils.waitForElement('#video-devices-form');

		await videoDevices.click();

		let element = await utils.waitForElement('#option-custom_fake_video_1');

		await element.click();

		let videoLabel;
		await browser.sleep(1000);
		videoLabel = await browser.executeScript<string>(script);
		expect(videoLabel).to.be.equal('custom_fake_video_1');

		await videoDevices.click();

		element = await utils.waitForElement('#option-fake_device_0');
		await element.click();

		await browser.sleep(1000);
		videoLabel = await browser.executeScript<string>(script);
		expect(videoLabel).to.be.equal('fake_device_0');
	});

	// TODO: Uncommented when Livekit allows to replace the screen track
	// it('should replace the screen track', async () => {
	// 	const script = 'return document.getElementsByClassName("OV_video-element screen-type")[0].srcObject.getVideoTracks()[0].label;';

	// 	await browser.get(`${url}&prejoin=false&fakeDevices=true`);

	// 	await utils.checkLayoutPresent();
	// 	await utils.checkToolbarIsPresent();

	// 	await utils.clickOn('#screenshare-btn');

	// 	await browser.sleep(500);

	// 	let screenLabel = await browser.executeScript<string>(script);
	// 	expect(screenLabel).not.equal('custom_fake_screen');

	// 	await utils.clickOn('#video-settings-btn-SCREEN');
	// 	await browser.sleep(500);

	// 	await utils.waitForElement('.video-settings-menu');
	// 	const replaceBtn = await utils.waitForElement('#replace-screen-button');
	// 	await replaceBtn.sendKeys(Key.ENTER);

	// 	await browser.sleep(1000);
	// 	screenLabel = await browser.executeScript<string>(script);
	// 	expect(screenLabel).to.be.equal('custom_fake_screen');
	// });
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
		await utils.togglePanel('settings');
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
