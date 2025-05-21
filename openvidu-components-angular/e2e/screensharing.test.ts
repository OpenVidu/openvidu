import { Builder, WebDriver } from 'selenium-webdriver';
import { TestAppConfig } from './selenium.conf';
import { OpenViduComponentsPO } from './utils.po.test';

const url = TestAppConfig.appUrl;

describe('E2E: Screensharing features', () => {
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

	it('should toggle screensharing on and off twice, updating video count', async () => {
		await browser.get(`${url}&prejoin=false`);
		await utils.checkLayoutPresent();

		// Enable screensharing
		await utils.waitForElement('#screenshare-btn');
		await utils.clickOn('#screenshare-btn');
		await browser.sleep(500);
		await utils.waitForElement('.OV_big');
		expect(await utils.getNumberOfElements('video')).toEqual(2);

		// Disable screensharing
		await utils.disableScreenShare();
		expect(await utils.getNumberOfElements('video')).toEqual(1);

		// Enable again
		await utils.clickOn('#screenshare-btn');
		await browser.sleep(500);
		await utils.waitForElement('.OV_big');
		expect(await utils.getNumberOfElements('video')).toEqual(2);

		// Disable again
		await utils.disableScreenShare();
		expect(await utils.getNumberOfElements('video')).toEqual(1);
	});

	it('should show screenshare and muted camera (camera off, screenshare on)', async () => {
		await browser.get(`${url}&prejoin=false`);
		await utils.checkLayoutPresent();

		// Mute camera
		await utils.waitForElement('#camera-btn');
		await utils.clickOn('#camera-btn');

		// Enable screensharing
		const screenshareButton = await utils.waitForElement('#screenshare-btn');
		expect(await screenshareButton.isDisplayed()).toBeTrue();
		await screenshareButton.click();
		await browser.sleep(500);
		await utils.waitForElement('.OV_big');
		expect(await utils.getNumberOfElements('video')).toEqual(2);

		// Disable screensharing
		await utils.disableScreenShare();
		expect(await utils.getNumberOfElements('video')).toEqual(1);
	});

	it('should display screensharing with a single pinned video', async () => {
		await browser.get(`${url}&prejoin=false`);
		await utils.checkLayoutPresent();

		// Enable screensharing
		const screenshareButton = await utils.waitForElement('#screenshare-btn');
		expect(await screenshareButton.isDisplayed()).toBeTrue();
		await screenshareButton.click();
		await utils.waitForElement('.OV_big');
		expect(await utils.getNumberOfElements('.OV_big')).toEqual(1);
	});

	it('should replace pinned video when a second participant starts screensharing', async () => {
		const roomName = 'screensharingE2E';
		const fixedUrl = `${url}&roomName=${roomName}&prejoin=false`;
		await browser.get(fixedUrl);
		await utils.checkLayoutPresent();

		// First participant screenshares
		await utils.waitForElement('#screenshare-btn');
		await utils.clickOn('#screenshare-btn');
		await utils.waitForElement('.OV_big');
		expect(await utils.getNumberOfElements('.OV_big')).toEqual(1);

		// Second participant joins and screenshares
		const newTabScript = `window.open("${fixedUrl}")`;
		await browser.executeScript(newTabScript);
		const tabs = await browser.getAllWindowHandles();
		await browser.switchTo().window(tabs[1]);
		await utils.checkLayoutPresent();
		await utils.waitForElement('#screenshare-btn');
		await utils.clickOn('#screenshare-btn');
		await browser.sleep(500);
		expect(await utils.getNumberOfElements('video')).toEqual(4);
		await utils.waitForElement('.OV_big');
		expect(await utils.getNumberOfElements('.OV_big')).toEqual(1);

		// Switch back to first tab and check
		await browser.switchTo().window(tabs[0]);
		await browser.sleep(500);
		expect(await utils.getNumberOfElements('video')).toEqual(4);
		await utils.waitForElement('.OV_big');
		expect(await utils.getNumberOfElements('.OV_big')).toEqual(1);
	});

	it('should unpin screensharing and restore previous pinned video when disabled', async () => {
		const roomName = 'screensharingtwoE2E';
		const fixedUrl = `${url}&roomName=${roomName}&prejoin=false`;
		await browser.get(fixedUrl);
		await utils.checkLayoutPresent();

		// First participant screenshares
		await utils.waitForElement('#screenshare-btn');
		await utils.clickOn('#screenshare-btn');
		await browser.sleep(500);
		await utils.waitForElement('.OV_big');
		expect(await utils.getNumberOfElements('.OV_big')).toEqual(1);

		// Second participant joins and screenshares
		const tabs = await utils.openTab(fixedUrl);
		await browser.switchTo().window(tabs[1]);
		await utils.checkLayoutPresent();
		await utils.waitForElement('#screenshare-btn');
		await utils.clickOn('#screenshare-btn');
		await browser.sleep(500);
		expect(await utils.getNumberOfElements('video')).toEqual(4);
		await utils.waitForElement('.OV_big');
		expect(await utils.getNumberOfElements('.OV_big')).toEqual(1);

		// Disable screensharing for second participant
		await utils.disableScreenShare();
		expect(await utils.getNumberOfElements('video')).toEqual(3);
		await utils.waitForElement('.OV_big');
		expect(await utils.getNumberOfElements('.OV_big')).toEqual(1);

		// Switch back to first tab and check
		await browser.switchTo().window(tabs[0]);
		await browser.sleep(500);
		expect(await utils.getNumberOfElements('video')).toEqual(3);
		await utils.waitForElement('.OV_big');
		expect(await utils.getNumberOfElements('.OV_big')).toEqual(1);
	});

	it('should correctly share screen with microphone muted and maintain proper track state', async () => {
		// Helper for inspecting stream tracks
		const getMediaTracks = (className: string) => {
			return `
			const tracks = document.getElementsByClassName('${className}')[0].srcObject.getTracks();
			return tracks.map(track => ({
				kind: track.kind,
				enabled: track.enabled,
				id: track.id,
				label: track.label
			}));`;
		};

		// Setup: Navigate to room and skip prejoin
		await browser.get(`${url}&prejoin=false`);
		await utils.checkLayoutPresent();

		// Step 1: First mute the microphone
		const micButton = await utils.waitForElement('#mic-btn');
		await micButton.click();

		// Step 2: Start screen sharing
		await utils.clickOn('#screenshare-btn');

		// Step 3: Verify both streams are present
		await utils.waitForElement('.screen-type');
		expect(await utils.getNumberOfElements('video')).toEqual(2);

		// Step 4: Verify screen share track properties
		const screenTracks: any[] = await browser.executeScript(getMediaTracks('screen-type'));
		expect(screenTracks.length).toEqual(1);
		expect(screenTracks[0].kind).toEqual('video');
		expect(screenTracks[0].enabled).toBeTrue();

		// Step 5: Verify microphone status indicators for both streams
		// await utils.waitForElement('#status-mic');
		// const micStatusCount = await utils.getNumberOfElements('#status-mic');
		// expect(micStatusCount).toEqual(2);

		// Step 6: Stop screen sharing and verify stream count
		await utils.clickOn('#screenshare-btn');
		await browser.sleep(500);
		await utils.clickOn('#disable-screen-button');
		await browser.sleep(500);
		expect(await utils.getNumberOfElements('video')).toEqual(1);
	});
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
