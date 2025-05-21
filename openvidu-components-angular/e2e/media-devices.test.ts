import { Builder, WebDriver } from 'selenium-webdriver';
import { getBrowserOptionsWithoutDevices, TestAppConfig } from './selenium.conf';
import { OpenViduComponentsPO } from './utils.po.test';

const url = TestAppConfig.appUrl;

describe('Media Devices: Virtual Device Replacement and Permissions Handling', () => {
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

	it('should allow selecting and replacing the video track with a custom virtual device in the prejoin page', async () => {
		const script = 'return document.getElementsByTagName("video")[0].srcObject.getVideoTracks()[0].label;';

		await browser.get(`${url}&fakeDevices=true`);

		let videoDevices = await utils.waitForElement('#video-devices-form');
		await videoDevices.click();
		let element = await utils.waitForElement('#option-custom_fake_video_1');
		await element.click();
		let videoLabel;
		await browser.sleep(1000);
		videoLabel = await browser.executeScript<string>(script);
		expect(videoLabel).toEqual('custom_fake_video_1');

		await videoDevices.click();
		element = await utils.waitForElement('#option-fake_device_0');
		await element.click();
		await browser.sleep(1000);
		videoLabel = await browser.executeScript<string>(script);
		expect(videoLabel).toEqual('fake_device_0');
	});

	it('should allow selecting and replacing the video track with a custom virtual device in the videoconference page', async () => {
		const script = 'return document.getElementsByTagName("video")[0].srcObject.getVideoTracks()[0].label;';

		await browser.get(`${url}&prejoin=false&fakeDevices=true`);

		await utils.checkSessionIsPresent();
		await utils.checkToolbarIsPresent();
		await utils.togglePanel('settings');
		await utils.waitForElement('.settings-container');
		expect(await utils.isPresent('.settings-container')).toBeTrue();
		await browser.sleep(500);
		await utils.clickOn('#video-opt');
		expect(await utils.isPresent('ov-video-devices-select')).toBeTrue();
		let videoDevices = await utils.waitForElement('#video-devices-form');
		await videoDevices.click();
		let element = await utils.waitForElement('#option-custom_fake_video_1');
		await element.click();
		let videoLabel;
		await browser.sleep(1000);
		videoLabel = await browser.executeScript<string>(script);
		expect(videoLabel).toEqual('custom_fake_video_1');
		await videoDevices.click();
		element = await utils.waitForElement('#option-fake_device_0');
		await element.click();
		await browser.sleep(1000);
		videoLabel = await browser.executeScript<string>(script);
		expect(videoLabel).toEqual('fake_device_0');
	});

	it('should replace the screen track with a custom virtual device', async () => {
		const script = 'return document.getElementsByClassName("OV_video-element screen-type")[0].srcObject.getVideoTracks()[0].label;';

		await browser.get(`${url}&prejoin=false&fakeDevices=true`);

		await utils.checkLayoutPresent();
		await utils.checkToolbarIsPresent();

		await utils.clickOn('#screenshare-btn');

		await browser.sleep(500);

		let screenLabel = await browser.executeScript<string>(script);
		expect(screenLabel).not.toEqual('custom_fake_screen');

		await utils.clickOn('#screenshare-btn');
		await browser.sleep(500);

		await utils.waitForElement('#replace-screen-button');
		await utils.clickOn('#replace-screen-button');
		await browser.sleep(1000);

		screenLabel = await browser.executeScript<string>(script);
		expect(screenLabel).toEqual('custom_fake_screen');
	});
});

describe('Media Devices: UI Behavior Without Media Device Permissions', () => {
	let browser: WebDriver;
	let utils: OpenViduComponentsPO;
	async function createChromeBrowser(): Promise<WebDriver> {
		return await new Builder()
			.forBrowser(TestAppConfig.browserName)
			.withCapabilities(TestAppConfig.browserCapabilities)
			.setChromeOptions(getBrowserOptionsWithoutDevices())
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

	it('should disable camera and microphone buttons in the prejoin page when permissions are denied', async () => {
		await browser.get(`${url}`);
		await utils.checkPrejoinIsPresent();
		let button = await utils.waitForElement('#camera-button');
		expect(await button.isEnabled()).toBeFalse();
		button = await utils.waitForElement('#microphone-button');
		expect(await button.isEnabled()).toBeFalse();
	});

	it('should disable camera and microphone buttons in the room page when permissions are denied', async () => {
		await browser.get(`${url}`);
		await utils.checkPrejoinIsPresent();
		await utils.clickOn('#join-button');
		await utils.checkSessionIsPresent();
		await utils.checkToolbarIsPresent();
		let button = await utils.waitForElement('#camera-btn');
		expect(await button.isEnabled()).toBeFalse();
		button = await utils.waitForElement('#mic-btn');
		expect(await button.isEnabled()).toBeFalse();
	});

	it('should disable camera and microphone buttons in the room page without prejoin when permissions are denied', async () => {
		await browser.get(`${url}&prejoin=false`);
		await utils.checkSessionIsPresent();
		await utils.checkToolbarIsPresent();
		let button = await utils.waitForElement('#camera-btn');
		expect(await button.isEnabled()).toBeFalse();
		button = await utils.waitForElement('#mic-btn');
		expect(await button.isEnabled()).toBeFalse();
	});

	it('should disable camera and microphone device selection buttons in settings when permissions are denied', async () => {
		await browser.get(`${url}&prejoin=false`);
		await utils.checkToolbarIsPresent();
		await utils.togglePanel('settings');
		await browser.sleep(500);
		await utils.waitForElement('.settings-container');
		expect(await utils.isPresent('.settings-container')).toBeTrue();
		await utils.clickOn('#video-opt');
		expect(await utils.isPresent('ov-video-devices-select')).toBeTrue();
		let button = await utils.waitForElement('#camera-button');
		expect(await button.isEnabled()).toBeFalse();
		await utils.clickOn('#audio-opt');
		expect(await utils.isPresent('ov-audio-devices-select')).toBeTrue();
		button = await utils.waitForElement('#microphone-button');
		expect(await button.isEnabled()).toBeFalse();
	});
});
