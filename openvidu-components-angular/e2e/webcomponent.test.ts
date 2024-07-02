import { expect } from 'chai';
import { Builder, Key, WebDriver } from 'selenium-webdriver';
import { OPENVIDU_CALL_SERVER } from './config';
import { getBrowserOptionsWithoutDevices, WebComponentConfig } from './selenium.conf';
import { OpenViduComponentsPO } from './utils.po.test';

const url = `${WebComponentConfig.appUrl}?OV_URL=${OPENVIDU_CALL_SERVER}`;


describe('Testing PRO features with OpenVidu CE', () => {
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

	// TODO: Uncomment when background feature is supported
	// it('should SHOW the VIRTUAL BACKGROUND PRO feature dialog', async () => {
	// 	await browser.get(`${url}&prejoin=true`);

	// 	await utils.checkPrejoinIsPresent();

	// 	await utils.waitForElement('#background-effects-btn');
	// 	await utils.clickOn('#background-effects-btn');

	// 	await utils.chceckProFeatureAlertIsPresent();

	// 	// Close alert
	// 	await (await utils.waitForElement('html')).sendKeys(Key.ESCAPE);

	// 	// Join to room
	// 	await utils.clickOn('#join-button');

	// 	await utils.checkSessionIsPresent();

	// 	// Checking if toolbar is present
	// 	await utils.checkToolbarIsPresent();

	// 	// Open more options menu
	// 	await utils.clickOn('#more-options-btn');

	// 	await browser.sleep(500);

	// 	// Checking if button panel is present
	// 	await utils.waitForElement('#more-options-menu');
	// 	expect(await utils.isPresent('#more-options-menu')).to.be.true;

	// 	await utils.waitForElement('#virtual-bg-btn');
	// 	await utils.clickOn('#virtual-bg-btn');

	// 	// Expect it shows the pro feature alert
	// 	await utils.chceckProFeatureAlertIsPresent();
	// });

	// it('should SHOW the CAPTIONS PRO feature dialog', async () => {
	// 	await browser.get(`${url}&prejoin=false`);

	// 	await utils.checkSessionIsPresent();

	// 	// Checking if toolbar is present
	// 	await utils.checkToolbarIsPresent();

	// 	// Open more options menu
	// 	await utils.clickOn('#more-options-btn');

	// 	await browser.sleep(500);

	// 	// Checking if button panel is present
	// 	await utils.waitForElement('#more-options-menu');
	// 	expect(await utils.isPresent('#more-options-menu')).to.be.true;

	// 	await utils.waitForElement('#toolbar-settings-btn');
	// 	expect(await utils.isPresent('#toolbar-settings-btn')).to.be.true;
	// 	await utils.clickOn('#toolbar-settings-btn');

	// 	// Expect captions panel shows the pro feature content
	// 	await utils.waitForElement('#settings-container');
	// 	await utils.clickOn('#captions-opt');
	// 	await browser.sleep(1000);
	// 	await utils.waitForElement('.pro-feature');

	// 	// Open more options menu
	// 	await utils.clickOn('#more-options-btn');

	// 	await browser.sleep(500);

	// 	// Checking if button panel is present
	// 	await utils.waitForElement('#more-options-menu');
	// 	expect(await utils.isPresent('#more-options-menu')).to.be.true;

	// 	// Checking if captions button is present
	// 	await utils.waitForElement('#captions-btn');
	// 	expect(await utils.isPresent('#captions-btn')).to.be.true;
	// 	await utils.clickOn('#captions-btn');

	// 	await utils.waitForElement('ov-pro-feature-template');
	// 	expect(await utils.isPresent('.captions-container')).to.be.false;
	// });
});


