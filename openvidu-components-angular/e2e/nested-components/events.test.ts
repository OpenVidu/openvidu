import { Builder, By, WebDriver } from 'selenium-webdriver';

import { NestedConfig } from '../selenium.conf';
import { OpenViduComponentsPO } from '../utils.po.test';

const url = NestedConfig.appUrl;

describe('OpenVidu Components EVENTS', () => {
	let browser: WebDriver;
	let utils: OpenViduComponentsPO;

	async function createChromeBrowser(): Promise<WebDriver> {
		return await new Builder()
			.forBrowser(NestedConfig.browserName)
			.withCapabilities(NestedConfig.browserCapabilities)
			.setChromeOptions(NestedConfig.browserOptions)
			.usingServer(NestedConfig.seleniumAddress)
			.build();
	}

	beforeEach(async () => {
		browser = await createChromeBrowser();
		utils = new OpenViduComponentsPO(browser);
	});

	afterEach(async () => {
		await browser.quit();
	});

	it('should receive the onParticipantLeft event', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovToolbar-checkbox');

		await utils.clickOn('#apply-btn');

		await utils.checkToolbarIsPresent();

		// Clicking to leave button
		await utils.clickOn('#leave-btn');

		// Checking if onLeaveButtonClicked has been received
		await utils.waitForElement('#onParticipantLeft');
		expect(await utils.isPresent('#onParticipantLeft')).toBeTrue();
	});

	it('should receive the onVideoEnabledChanged event', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovToolbar-checkbox');

		await utils.clickOn('#apply-btn');

		await utils.checkToolbarIsPresent();

		await utils.clickOn('#camera-btn');

		await utils.waitForElement('#onVideoEnabledChanged');
		expect(await utils.isPresent('#onVideoEnabledChanged')).toBeTrue();
	});

	it('should receive the onAudioEnabledChanged event', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovToolbar-checkbox');

		await utils.clickOn('#apply-btn');

		await utils.checkToolbarIsPresent();

		await utils.clickOn('#mic-btn');

		await utils.waitForElement('#onAudioEnabledChanged');
		expect(await utils.isPresent('#onAudioEnabledChanged')).toBeTrue();
	});

	it('should receive the onScreenShareEnabledChanged event', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovToolbar-checkbox');

		await utils.clickOn('#apply-btn');

		await utils.checkToolbarIsPresent();

		await utils.clickOn('#screenshare-btn');

		await utils.waitForElement('#onScreenShareEnabledChanged');
		expect(await utils.isPresent('#onScreenShareEnabledChanged')).toBeTrue();
	});

	it('should receive the onFullscreenEnabledChanged event', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovToolbar-checkbox');

		await utils.clickOn('#apply-btn');

		await utils.checkToolbarIsPresent();

		await utils.toggleFullscreenFromToolbar();

		await browser.sleep(1000);

		await utils.waitForElement('#onFullscreenEnabledChanged');
		expect(await utils.isPresent('#onFullscreenEnabledChanged')).toBeTrue();
	});

	it('should receive the onRecordingStartRequested event', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovToolbar-checkbox');

		await utils.clickOn('#apply-btn');

		await utils.checkToolbarIsPresent();

		await utils.toggleRecordingFromToolbar();

		await utils.waitForElement('#onRecordingStartRequested');
		expect(await utils.isPresent('#onRecordingStartRequested')).toBeTrue();
	});

	it('should receive the onParticipantsPanelStatusChanged event', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovPanel-checkbox');

		await utils.clickOn('#apply-btn');

		await utils.checkToolbarIsPresent();

		await utils.togglePanel('participants');

		await utils.waitForElement('#onParticipantsPanelStatusChanged');
		expect(await utils.isPresent('#onParticipantsPanelStatusChanged')).toBeTrue();
	});

	it('should receive the onChatPanelStatusChanged event', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovPanel-checkbox');

		await utils.clickOn('#apply-btn');

		await utils.checkToolbarIsPresent();

		await utils.togglePanel('chat');

		await utils.waitForElement('#onChatPanelStatusChanged');
		expect(await utils.isPresent('#onChatPanelStatusChanged')).toBeTrue();
	});

	it('should receive the onActivitiesPanelStatusChanged event', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovPanel-checkbox');

		await utils.clickOn('#apply-btn');

		await utils.checkToolbarIsPresent();

		await utils.togglePanel('activities');

		await utils.waitForElement('#onActivitiesPanelStatusChanged');
		expect(await utils.isPresent('#onActivitiesPanelStatusChanged')).toBeTrue();
	});

	it('should receive the onSettingsPanelStatusChanged event', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovPanel-checkbox');

		await utils.clickOn('#apply-btn');

		await utils.checkToolbarIsPresent();

		await utils.togglePanel('settings');

		await utils.waitForElement('#onSettingsPanelStatusChanged');
		expect(await utils.isPresent('#onSettingsPanelStatusChanged')).toBeTrue();
	});
});
