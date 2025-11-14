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

	// ==================== PIN/UNPIN TESTS ====================
	// These tests demonstrate bugs in the pin system:
	// 1. Multiple screens can be auto-pinned simultaneously
	// 2. Manual unpins can be overridden by auto-pin logic when participants join

	it('should NOT have multiple screens pinned when both participants share screen', async () => {
		const roomName = 'pinBugCase1';
		const fixedUrl = `${url}&roomName=${roomName}&prejoin=false`;

		// Participant A joins and shares screen
		await browser.get(fixedUrl);
		await utils.checkLayoutPresent();
		await utils.waitForElement('#screenshare-btn');
		await utils.clickOn('#screenshare-btn');
		await browser.sleep(500);

		// Verify A's screen is pinned
		await utils.waitForElement('.OV_big');
		expect(await utils.getNumberOfPinnedStreams()).toEqual(1);
		const pinnedCountA1 = await utils.getNumberOfPinnedStreams();
		console.log(`[Tab A] After A shares: ${pinnedCountA1} pinned stream(s)`);

		// Participant B joins
		const tabs = await utils.openTab(fixedUrl);
		await browser.switchTo().window(tabs[1]);
		await utils.checkLayoutPresent();
		await browser.sleep(1000);

		// B should see A's screen pinned
		expect(await utils.getNumberOfElements('video')).toEqual(3); // 2 cameras + 1 screen
		expect(await utils.getNumberOfPinnedStreams()).toEqual(1);
		const pinnedCountB1 = await utils.getNumberOfPinnedStreams();
		console.log(`[Tab B] After B joins: ${pinnedCountB1} pinned stream(s)`);

		// B shares screen
		await utils.waitForElement('#screenshare-btn');
		await utils.clickOn('#screenshare-btn');
		await browser.sleep(500);

		// B should see only their own screen pinned (auto-pin + unpin previous)
		expect(await utils.getNumberOfElements('video')).toEqual(4); // 2 cameras + 2 screens
		await utils.waitForElement('.OV_big');
		const pinnedCountB2 = await utils.getNumberOfPinnedStreams();
		console.log(`[Tab B] After B shares: ${pinnedCountB2} pinned stream(s)`);
		expect(pinnedCountB2).toEqual(1); // Should be 1, but implementation might show different

		// Switch to Tab A and check
		await browser.switchTo().window(tabs[0]);
		await browser.sleep(1000);
		expect(await utils.getNumberOfElements('video')).toEqual(4); // 2 cameras + 2 screens

		// BUG: In A's view, BOTH screens are pinned
		const pinnedCountA2 = await utils.getNumberOfPinnedStreams();
		console.log(`[Tab A] After B shares: ${pinnedCountA2} pinned stream(s)`);

		// EXPECTED: Only B's screen should be pinned (the most recent one)
		// ACTUAL: Both A's and B's screens are pinned
		expect(pinnedCountA2).toEqual(1, 'BUG DETECTED: Multiple screens are pinned. Expected only the most recent screen to be pinned.');
	});

	it('should NOT re-pin manually unpinned screen when new participant joins', async () => {
		const roomName = 'pinBugCase2';
		const fixedUrl = `${url}&roomName=${roomName}&prejoin=false`;

		// Participant A joins and shares screen
		await browser.get(fixedUrl);
		await utils.checkLayoutPresent();
		await utils.waitForElement('#screenshare-btn');
		await utils.clickOn('#screenshare-btn');
		await browser.sleep(500);

		// Verify A's screen is auto-pinned
		await utils.waitForElement('.OV_big');
		expect(await utils.getNumberOfPinnedStreams()).toEqual(1);

		// Participant B joins and shares screen
		const tabs = await utils.openTab(fixedUrl);
		await browser.switchTo().window(tabs[1]);
		await utils.checkLayoutPresent();
		await browser.sleep(1000);
		await utils.waitForElement('#screenshare-btn');
		await utils.clickOn('#screenshare-btn');
		await browser.sleep(500);

		// B should see their own screen pinned
		expect(await utils.getNumberOfElements('video')).toEqual(4); // 2 cameras + 2 screens
		await utils.waitForElement('.OV_big');
		let pinnedCountB = await utils.getNumberOfPinnedStreams();
		console.log(`[Tab B] After B shares: ${pinnedCountB} pinned stream(s)`);

		// B manually unpins their own screen
		const screenStreams = await utils.getScreenShareStreams();
		if (screenStreams.length > 0) {
			// Find B's own screen (it should be the pinned one)
			await utils.toggleStreamPin('.OV_big');
			await browser.sleep(500);
		}

		// Verify B's screen is now unpinned
		pinnedCountB = await utils.getNumberOfPinnedStreams();
		console.log(`[Tab B] After manually unpinning B's screen: ${pinnedCountB} pinned stream(s)`);
		expect(pinnedCountB).toEqual(0, 'B should have no pinned streams after manual unpin');

		// B manually pins A's screen
		const screenElements = await utils.getScreenShareStreams();
		if (screenElements.length >= 2) {
			// Pin the first screen that is not already pinned (should be A's screen)
			await utils.toggleStreamPin('.OV_stream.remote .screen-type');
			await utils.toggleStreamPin('#pin-btn');
			await browser.sleep(500);
		}

		// Verify A's screen is now pinned in B's view
		pinnedCountB = await utils.getNumberOfPinnedStreams();
		console.log(`[Tab B] After manually pinning A's screen: ${pinnedCountB} pinned stream(s)`);
		expect(pinnedCountB).toEqual(1, "Only A's screen should be pinned");

		// Participant C joins the room
		const tab3 = await utils.openTab(fixedUrl);
		await browser.switchTo().window(tab3[2]);
		await utils.checkLayoutPresent();
		await browser.sleep(1500);

		// Switch back to B's tab
		await browser.switchTo().window(tabs[1]);
		await browser.sleep(1000);

		// B's screen should still be unpinned, but might get re-pinned automatically
		pinnedCountB = await utils.getNumberOfPinnedStreams();
		console.log(`[Tab B] After C joins: ${pinnedCountB} pinned stream(s)`);

		// EXPECTED: No screens should be pinned (B manually unpinned everything)
		// ACTUAL: B's screen gets re-pinned automatically
		expect(pinnedCountB).toEqual(1, 'BUG DETECTED: Only one screen should be pinned after C joins.');

		// Switch back to A's tab to verify
		await browser.switchTo().window(tabs[0]);
		await browser.sleep(500);

		const pinnedCountA2 = await utils.getNumberOfPinnedStreams();
		console.log(`[Tab A] After C joins: ${pinnedCountA2} pinned stream(s)`);

		// EXPECTED: Only A's screen should be pinned
		// ACTUAL: A's screen remains pinned
		expect(pinnedCountA2).toEqual(1, "BUG DETECTED: A's screen should remain pinned after C joins.");
	});
});
