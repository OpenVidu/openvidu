import { Builder, WebDriver } from 'selenium-webdriver';
import { OPENVIDU_CALL_SERVER } from '../config';
import { WebComponentConfig } from '../selenium.conf';
import { OpenViduComponentsPO } from '../utils.po.test';

const url = `${WebComponentConfig.appUrl}?OV_URL=${OPENVIDU_CALL_SERVER}`;

describe('Testing screenshare features', () => {
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

	it('should toggle screensharing twice', async () => {
		await browser.get(`${url}&prejoin=false`);
		await utils.checkLayoutPresent();

		// Clicking to screensharing button
		await utils.waitForElement('#screenshare-btn');
		await utils.clickOn('#screenshare-btn');

		await browser.sleep(500);
		await utils.waitForElement('.OV_big');
		expect(await utils.getNumberOfElements('video')).toEqual(2);

		// expect(await utils.getNumberOfElements('.OV_stream.speaking')).toEqual(1);

		await utils.disableScreenShare();

		expect(await utils.getNumberOfElements('video')).toEqual(1);

		// toggle screenshare again
		await utils.clickOn('#screenshare-btn');
		await browser.sleep(500);

		await utils.waitForElement('.OV_big');
		expect(await utils.getNumberOfElements('video')).toEqual(2);

		await utils.disableScreenShare();

		expect(await utils.getNumberOfElements('video')).toEqual(1);
	});

	it('should show screen and muted camera', async () => {
		await browser.get(`${url}&prejoin=false`);

		await utils.checkLayoutPresent();

		await utils.waitForElement('#camera-btn');
		await utils.clickOn('#camera-btn');

		// Clicking to screensharing button
		const screenshareButton = await utils.waitForElement('#screenshare-btn');
		expect(await screenshareButton.isDisplayed()).toBeTrue();
		await screenshareButton.click();

		await browser.sleep(500);
		await utils.waitForElement('.OV_big');
		expect(await utils.getNumberOfElements('video')).toEqual(2);

		await utils.disableScreenShare();

		expect(await utils.getNumberOfElements('video')).toEqual(1);
	});

	it('should screensharing with PINNED video', async () => {
		await browser.get(`${url}&prejoin=false`);
		await utils.checkLayoutPresent();

		// Clicking to screensharing button
		const screenshareButton = await utils.waitForElement('#screenshare-btn');
		expect(await screenshareButton.isDisplayed()).toBeTrue();
		await screenshareButton.click();

		await utils.waitForElement('.OV_big');
		expect(await utils.getNumberOfElements('.OV_big')).toEqual(1);
	});

	it('should screensharing with PINNED video and replace the existing one', async () => {
		const roomName = 'screensharingE2E';
		const fixedUrl = `${url}&roomName=${roomName}&prejoin=false`;
		await browser.get(fixedUrl);
		await utils.checkLayoutPresent();

		// Clicking to screensharing button
		await utils.waitForElement('#screenshare-btn');
		await utils.clickOn('#screenshare-btn');
		await utils.waitForElement('.OV_big');
		expect(await utils.getNumberOfElements('.OV_big')).toEqual(1);

		// Starting new browser for adding the second participant
		const newTabScript = `window.open("${fixedUrl}")`;
		await browser.executeScript(newTabScript);
		const tabs = await browser.getAllWindowHandles();
		await browser.switchTo().window(tabs[1]);

		await utils.checkLayoutPresent();

		// Clicking to screensharing button
		await utils.waitForElement('#screenshare-btn');
		await utils.clickOn('#screenshare-btn');
		await browser.sleep(500);
		expect(await utils.getNumberOfElements('video')).toEqual(4);
		await utils.waitForElement('.OV_big');
		expect(await utils.getNumberOfElements('.OV_big')).toEqual(1);

		// Go to first tab
		await browser.switchTo().window(tabs[0]);
		await browser.sleep(500);
		expect(await utils.getNumberOfElements('video')).toEqual(4);
		await utils.waitForElement('.OV_big');
		expect(await utils.getNumberOfElements('.OV_big')).toEqual(1);
	});

	it('should disabled a screensharing and pinned the previous one', async () => {
		const roomName = 'screensharingtwoE2E';
		const fixedUrl = `${url}&roomName=${roomName}&prejoin=false`;
		await browser.get(fixedUrl);
		await utils.checkLayoutPresent();

		// Clicking to screensharing button
		await utils.waitForElement('#screenshare-btn');
		await utils.clickOn('#screenshare-btn');
		await browser.sleep(500);
		await utils.waitForElement('.OV_big');
		expect(await utils.getNumberOfElements('.OV_big')).toEqual(1);

		// Starting new browser for adding the second participant
		const tabs = await utils.openTab(fixedUrl);
		await browser.switchTo().window(tabs[1]);

		await utils.checkLayoutPresent();

		// Clicking to screensharing button
		await utils.waitForElement('#screenshare-btn');
		await utils.clickOn('#screenshare-btn');
		await browser.sleep(500);
		expect(await utils.getNumberOfElements('video')).toEqual(4);
		await utils.waitForElement('.OV_big');
		expect(await utils.getNumberOfElements('.OV_big')).toEqual(1);
		// Disable screensharing
		await utils.disableScreenShare();
		expect(await utils.getNumberOfElements('video')).toEqual(3);
		await utils.waitForElement('.OV_big');
		expect(await utils.getNumberOfElements('.OV_big')).toEqual(1);

		// Go to first tab
		await browser.switchTo().window(tabs[0]);
		await browser.sleep(500);
		expect(await utils.getNumberOfElements('video')).toEqual(3);
		await utils.waitForElement('.OV_big');
		expect(await utils.getNumberOfElements('.OV_big')).toEqual(1);
	});

	// it('should screensharing with audio muted', async () => {
	// 	let isAudioEnabled;
	// 	const getAudioScript = (className: string) => {
	// 		return `return document.getElementsByClassName('${className}')[0].srcObject.getAudioTracks()[0].enabled;`;
	// 	};
	// 	await browser.get(`${url}&prejoin=false`);

	// 	await utils.checkLayoutPresent();

	// 	const micButton = await utils.waitForElement('#mic-btn');
	// 	await micButton.click();

	// 	// Clicking to screensharing button
	// 	const screenshareButton = await utils.waitForElement('#screenshare-btn');
	// 	expect(await utils.isPresent('#screenshare-btn')).toBeTrue();
	// 	await screenshareButton.click();

	// 	await utils.waitForElement('.screen-type');
	// 	expect(await utils.getNumberOfElements('video')).toEqual(2);

	// 	isAudioEnabled = await browser.executeScript(getAudioScript('screen-type'));
	// 	expect(isAudioEnabled).toBeFalse();

	// 	await utils.waitForElement('#status-mic');
	// 	expect(await utils.getNumberOfElements('#status-mic')).toEqual(2);

	// 	// Clicking to screensharing button
	// 	await screenshareButton.click();
	// 	expect(await utils.getNumberOfElements('video')).toEqual(1);

	// });

	// it('should show and hide CAMERA stream when muting video with screensharing', async () => {
	// 	await browser.get(`${url}&prejoin=false`);

	// 	await utils.checkLayoutPresent();

	// 	// Clicking to screensharing button
	// 	const screenshareButton = await utils.waitForElement('#screenshare-btn');
	// 	expect(await screenshareButton.isDisplayed()).toBeTrue();
	// 	await screenshareButton.click();

	// 	await utils.waitForElement('.OV_big');
	// 	expect(await utils.getNumberOfElements('video')).toEqual(2);

	// 	const muteVideoButton = await utils.waitForElement('#camera-btn');
	// 	await muteVideoButton.click();

	// 	expect(await utils.getNumberOfElements('video')).toEqual(1);
	// });

	// it('should screenshare has audio active when camera is muted', async () => {
	// 	let isAudioEnabled;
	// 	const audioEnableScript = 'return document.getElementsByTagName("video")[0].srcObject.getAudioTracks()[0].enabled;';

	// 	await browser.get(`${url}&prejoin=false`);

	// 	await utils.checkLayoutPresent();

	// 	// Clicking to screensharing button
	// 	const screenshareButton = await utils.waitForElement('#screenshare-btn');
	// 	expect(await utils.isPresent('#screenshare-btn')).toBeTrue();
	// 	await screenshareButton.click();

	// 	await utils.waitForElement('.OV_big');
	// 	expect(await utils.getNumberOfElements('video')).toEqual(2);
	// 	expect(await utils.getNumberOfElements('#status-mic')).toEqual(1);

	// 	// Muting camera video
	// 	const muteVideoButton = await utils.waitForElement('#camera-btn');
	// 	await muteVideoButton.click();

	// 	expect(await utils.getNumberOfElements('video')).toEqual(1);

	// 	await browser.sleep(500);
	// 	expect(await utils.isPresent('#status-mic')).toBeFalse();

	// 	// Checking if audio is muted after join the room
	// 	isAudioEnabled = await browser.executeScript(audioEnableScript);
	// 	expect(isAudioEnabled).toBeTrue();

	// 	// Unmuting camera
	// 	await muteVideoButton.click();
	// 	await browser.sleep(1000);

	// 	await utils.waitForElement('.camera-type');
	// 	expect(await utils.getNumberOfElements('video')).toEqual(2);
	// 	expect(await utils.getNumberOfElements('#status-mic')).toEqual(1);
	// });

	// it('should camera come back with audio muted when screensharing', async () => {
	// 	let element, isAudioEnabled;

	// 	const getAudioScript = (className: string) => {
	// 		return `return document.getElementsByClassName('${className}')[0].srcObject.getAudioTracks()[0].enabled;`;
	// 	};

	// 	await browser.get(`${url}&prejoin=false`);

	// 	await utils.checkLayoutPresent();

	// 	// Clicking to screensharing button
	// 	const screenshareButton = await utils.waitForElement('#screenshare-btn');
	// 	await screenshareButton.click();

	// 	await utils.waitForElement('.screen-type');
	// 	expect(await utils.getNumberOfElements('video')).toEqual(2);
	// 	expect(await utils.getNumberOfElements('#status-mic')).toEqual(1);

	// 	// Mute camera
	// 	const muteVideoButton = await utils.waitForElement('#camera-btn');
	// 	await muteVideoButton.click();

	// 	expect(await utils.getNumberOfElements('video')).toEqual(1);
	// 	expect(await utils.isPresent('#status-mic')).toBeFalse();

	// 	// Checking if audio is muted after join the room
	// 	isAudioEnabled = await browser.executeScript(getAudioScript('screen-type'));
	// 	expect(isAudioEnabled).toBeTrue();

	// 	// Mute audio
	// 	const muteAudioButton = await utils.waitForElement('#mic-btn');
	// 	await muteAudioButton.click();

	// 	await utils.waitForElement('#status-mic');
	// 	expect(await utils.getNumberOfElements('#status-mic')).toEqual(1);

	// 	isAudioEnabled = await browser.executeScript(getAudioScript('screen-type'));
	// 	expect(isAudioEnabled).toBeFalse();

	// 	// Unmute camera
	// 	await muteVideoButton.click();

	// 	await utils.waitForElement('.camera-type');
	// 	expect(await utils.getNumberOfElements('video')).toEqual(2);
	// 	expect(await utils.getNumberOfElements('#status-mic')).toEqual(2);

	// 	isAudioEnabled = await browser.executeScript(getAudioScript('camera-type'));
	// 	expect(isAudioEnabled).toBeFalse();
	// });
});
