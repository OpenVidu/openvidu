import { expect } from 'chai';
import { Builder, By, WebDriver } from 'selenium-webdriver';

import { AngularConfig } from '../selenium.conf';
import { OpenViduComponentsPO } from '../utils.po.test';

const url = AngularConfig.appUrl;

describe('Testing EVENTS', () => {
	let browser: WebDriver;
	let utils: OpenViduComponentsPO;

	async function createChromeBrowser(): Promise<WebDriver> {
		return await new Builder()
			.forBrowser(AngularConfig.browserName)
			.withCapabilities(AngularConfig.browserCapabilities)
			.setChromeOptions(AngularConfig.browserOptions)
			.usingServer(AngularConfig.seleniumAddress)
			.build();
	}

	beforeEach(async () => {
		browser = await createChromeBrowser();
		utils = new OpenViduComponentsPO(browser);
	});

	afterEach(async () => {
		await browser.quit();
	});

	it('should receive the onRoomDisconnected event', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovToolbar-checkbox');

		await utils.clickOn('#apply-btn');

		await utils.checkToolbarIsPresent();

		// Clicking to leave button
		await utils.clickOn('#leave-btn');

		// Checking if onLeaveButtonClicked has been received
		await utils.waitForElement('#onRoomDisconnected');
		expect(await utils.isPresent('#onRoomDisconnected')).to.be.true;
	});

	it('should receive the onVideoEnabledChanged event', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovToolbar-checkbox');

		await utils.clickOn('#apply-btn');

		await utils.checkToolbarIsPresent();

		await utils.clickOn('#camera-btn');

		await utils.waitForElement('#onVideoEnabledChanged');
		expect(await utils.isPresent('#onVideoEnabledChanged')).to.be.true;
	});

	it('should receive the onAudioEnabledChanged event', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovToolbar-checkbox');

		await utils.clickOn('#apply-btn');

		await utils.checkToolbarIsPresent();

		await utils.clickOn('#mic-btn');

		await utils.waitForElement('#onAudioEnabledChanged');
		expect(await utils.isPresent('#onAudioEnabledChanged')).to.be.true;
	});

	it('should receive the onScreenShareEnabledChanged event', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovToolbar-checkbox');

		await utils.clickOn('#apply-btn');

		await utils.checkToolbarIsPresent();

		await utils.clickOn('#screenshare-btn');

		await utils.waitForElement('#onScreenShareEnabledChanged');
		expect(await utils.isPresent('#onScreenShareEnabledChanged')).to.be.true;
	});

	it('should receive the onFullscreenEnabledChanged event', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovToolbar-checkbox');

		await utils.clickOn('#apply-btn');

		await utils.checkToolbarIsPresent();

		await utils.toggleFullscreenFromToolbar();

		await utils.waitForElement('#onFullscreenEnabledChanged');
		expect(await utils.isPresent('#onFullscreenEnabledChanged')).to.be.true;
	});

	it('should receive the onRecordingStartRequested event', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovToolbar-checkbox');

		await utils.clickOn('#apply-btn');

		await utils.checkToolbarIsPresent();

		await utils.toggleRecordingFromToolbar();

		await utils.waitForElement('#onRecordingStartRequested');
		expect(await utils.isPresent('#onRecordingStartRequested')).to.be.true;
	});

	it('should receive the onParticipantsPanelStatusChanged event', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovPanel-checkbox');

		await utils.clickOn('#apply-btn');

		await utils.checkToolbarIsPresent();

		await utils.togglePanel('participants');

		await utils.waitForElement('#onParticipantsPanelStatusChanged');
		expect(await utils.isPresent('#onParticipantsPanelStatusChanged')).to.be.true;
	});

	it('should receive the onChatPanelStatusChanged event', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovPanel-checkbox');

		await utils.clickOn('#apply-btn');

		await utils.checkToolbarIsPresent();

		await utils.togglePanel('chat');

		await utils.waitForElement('#onChatPanelStatusChanged');
		expect(await utils.isPresent('#onChatPanelStatusChanged')).to.be.true;
	});

	it('should receive the onActivitiesPanelStatusChanged event', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovPanel-checkbox');

		await utils.clickOn('#apply-btn');

		await utils.checkToolbarIsPresent();

		await utils.togglePanel('activities');

		await utils.waitForElement('#onActivitiesPanelStatusChanged');
		expect(await utils.isPresent('#onActivitiesPanelStatusChanged')).to.be.true;
	});

	it('should receive the onSettingsPanelStatusChanged event', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovPanel-checkbox');

		await utils.clickOn('#apply-btn');

		await utils.checkToolbarIsPresent();

		await utils.togglePanel('settings');

		await utils.waitForElement('#onSettingsPanelStatusChanged');
		expect(await utils.isPresent('#onSettingsPanelStatusChanged')).to.be.true;
	});
});
