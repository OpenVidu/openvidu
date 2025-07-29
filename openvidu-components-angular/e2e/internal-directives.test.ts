import { Builder, WebDriver } from 'selenium-webdriver';
import { OpenViduComponentsPO } from './utils.po.test';
import { TestAppConfig } from './selenium.conf';

let url = '';

describe('Testing Internal Directives', () => {
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
		url = `${TestAppConfig.appUrl}&roomName=INTERNAL_DIRECTIVES_${Math.floor(Math.random() * 1000)}`;
	});

	afterEach(async () => {
		try {
		} catch (error) {}
		await browser.sleep(500);
		await browser.quit();
	});

	it('should show/hide toolbar view recording button with toolbarViewRecordingsButton directive', async () => {
		await browser.get(`${url}&prejoin=false&toolbarViewRecordingsButton=true`);
		await utils.checkSessionIsPresent();
		await utils.toggleToolbarMoreOptions();
		expect(await utils.isPresent('#view-recordings-btn')).toBeTrue();
		await browser.get(`${url}&prejoin=false`);
		await browser.navigate().refresh();
		await utils.checkSessionIsPresent();
		await utils.toggleToolbarMoreOptions();
		expect(await utils.isPresent('#view-recordings-btn')).toBeFalse();
	});

	it('should show/hide participant name in prejoin with prejoinDisplayParticipantName directive', async () => {
		await browser.get(`${url}&prejoin=true`);
		await utils.checkPrejoinIsPresent();
		expect(await utils.isPresent('.participant-name-container')).toBeTrue();
		await browser.get(`${url}&prejoin=true&prejoinDisplayParticipantName=false`);
		await browser.navigate().refresh();
		await utils.checkPrejoinIsPresent();
		expect(await utils.isPresent('.participant-name-container')).toBeFalse();
	});

	it('should show/hide view recordings button with recordingActivityViewRecordingsButton directive', async () => {
		await browser.get(`${url}&prejoin=false&recordingActivityViewRecordingsButton=true`);
		await utils.checkSessionIsPresent();
		await utils.togglePanel('activities');
		await utils.clickOn('#recording-activity');
		expect(await utils.isPresent('#view-recordings-btn')).toBeTrue();
		await browser.get(`${url}&prejoin=false`);
		await browser.navigate().refresh();
		await utils.checkSessionIsPresent();
		await utils.togglePanel('activities');
		await utils.clickOn('#recording-activity');
		expect(await utils.isPresent('#view-recordings-btn')).toBeFalse();
	});

	it('should show/hide start/stop recording buttons with recordingActivityStartStopRecordingButton directive', async () => {
		await browser.get(`${url}&prejoin=false&recordingActivityStartStopRecordingButton=false`);
		await utils.checkSessionIsPresent();
		await utils.togglePanel('activities');
		await utils.clickOn('#recording-activity');
		expect(await utils.isPresent('#start-recording-btn')).toBeFalse();

		await browser.sleep(3000);
		await browser.get(`${url}&prejoin=false`);
		await browser.navigate().refresh();
		await utils.checkSessionIsPresent();
		await utils.togglePanel('activities');
		await utils.clickOn('#recording-activity');
		expect(await utils.isPresent('#start-recording-btn')).toBeTrue();
	});
});
