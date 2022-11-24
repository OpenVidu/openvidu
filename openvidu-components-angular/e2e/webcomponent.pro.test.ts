import { expect } from 'chai';
import { Builder, WebDriver } from 'selenium-webdriver';
import { OPENVIDU_SECRET, OPENVIDU_SERVER_URL } from './config';
import { WebComponentConfig } from './selenium.conf';
import { OpenViduComponentsPO } from './utils.po.test';

const url = `${WebComponentConfig.appUrl}?OV_URL=${OPENVIDU_SERVER_URL}&OV_SECRET=${OPENVIDU_SECRET}`;

/**
 *
 * Testing PRO features with OpenVidu PRO
 * TODO: Change the openvidu URL when openvidu-pro-dev exists
 */

describe('Testing API Directives', () => {
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

	it('should change the captions LANG ', async () => {
		await browser.get(`${url}&prejoin=false&captionsLang=es-ES`);

		await utils.checkSessionIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		// Open more options menu
		await utils.clickOn('#more-options-btn');

		await browser.sleep(500);

		// Checking if button panel is present
		await utils.waitForElement('.mat-menu-content');
		expect(await utils.isPresent('.mat-menu-content')).to.be.true;

		// Checking if captions button is present
		await utils.waitForElement('#captions-btn');
		expect(await utils.isPresent('#captions-btn')).to.be.true;
		await utils.clickOn('#captions-btn');

		await utils.waitForElement('.captions-container');
		await utils.waitForElement('#caption-settings-btn');
		await utils.clickOn('#caption-settings-btn');

		await browser.sleep(500);

		await utils.waitForElement('.settings-container');
		expect(await utils.isPresent('.settings-container')).to.be.true;

		await utils.waitForElement('ov-captions-settings');

		expect(await utils.isPresent('.captions-container')).to.be.true;

		const element = await utils.waitForElement('.lang-button');
		expect(await element.getText()).equal('Españolexpand_more');
	});

	it('should override the CAPTIONS LANG OPTIONS', async () => {
		await browser.get(`${url}&prejoin=false&captionsLangOptions=true`);

		await utils.checkSessionIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		// Open more options menu
		await utils.clickOn('#more-options-btn');

		await browser.sleep(500);

		// Checking if button panel is present
		await utils.waitForElement('.mat-menu-content');
		expect(await utils.isPresent('.mat-menu-content')).to.be.true;

		// Checking if captions button is present
		await utils.waitForElement('#captions-btn');
		expect(await utils.isPresent('#captions-btn')).to.be.true;
		await utils.clickOn('#captions-btn');

		await utils.waitForElement('.captions-container');
		await utils.waitForElement('#caption-settings-btn');
		await utils.clickOn('#caption-settings-btn');

		await browser.sleep(500);

		await utils.waitForElement('.settings-container');
		expect(await utils.isPresent('.settings-container')).to.be.true;

		await utils.waitForElement('ov-captions-settings');

		expect(await utils.isPresent('.captions-container')).to.be.true;

		const element = await utils.waitForElement('.lang-button');
		expect(await element.getText()).equal('Espexpand_more');

		await element.click();

		expect(await utils.getNumberOfElements('.mat-menu-item')).equals(2);
	});
});

describe('Testing panels', () => {
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

	it('should toggle BACKGROUND panel on prejoin page when VIDEO is MUTED', async () => {
		let element;
		await browser.get(`${url}`);
		element = await utils.waitForElement('#pre-join-container');
		expect(await utils.isPresent('#pre-join-container')).to.be.true;

		const backgroundButton = await utils.waitForElement('#background-effects-btn');
		expect(await utils.isPresent('#background-effects-btn')).to.be.true;
		expect(await backgroundButton.isEnabled()).to.be.true;
		await backgroundButton.click();
		await browser.sleep(500);

		await utils.waitForElement('#background-effects-container');
		expect(await utils.isPresent('#background-effects-container')).to.be.true;

		element = await utils.waitForElement('#camera-button');
		expect(await utils.isPresent('#camera-button')).to.be.true;
		expect(await element.isEnabled()).to.be.true;
		await element.click();

		await browser.sleep(500);
		element = await utils.waitForElement('#video-poster');
		expect(await utils.isPresent('#video-poster')).to.be.true;

		expect(await backgroundButton.isDisplayed()).to.be.true;
		expect(await backgroundButton.isEnabled()).to.be.false;

		expect(await utils.isPresent('#background-effects-container')).to.be.false;
	});
});

describe('Testing captions features', () => {
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

	it('should OPEN the CAPTIONS container', async () => {
		await browser.get(`${url}&prejoin=false`);

		await utils.checkSessionIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		// Open more options menu
		await utils.clickOn('#more-options-btn');

		await browser.sleep(500);

		// Checking if button panel is present
		await utils.waitForElement('.mat-menu-content');
		expect(await utils.isPresent('.mat-menu-content')).to.be.true;

		// Checking if captions button is present
		await utils.waitForElement('#captions-btn');
		expect(await utils.isPresent('#captions-btn')).to.be.true;
		await utils.clickOn('#captions-btn');

		await utils.waitForElement('.captions-container');
	});

	it('should OPEN the SETTINGS panel from captions button', async () => {
		await browser.get(`${url}&prejoin=false`);

		await utils.checkSessionIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		// Open more options menu
		await utils.clickOn('#more-options-btn');

		await browser.sleep(500);

		// Checking if button panel is present
		await utils.waitForElement('.mat-menu-content');
		expect(await utils.isPresent('.mat-menu-content')).to.be.true;

		// Checking if captions button is present
		await utils.waitForElement('#captions-btn');
		expect(await utils.isPresent('#captions-btn')).to.be.true;
		await utils.clickOn('#captions-btn');

		await utils.waitForElement('.captions-container');
		await utils.waitForElement('#caption-settings-btn');
		await utils.clickOn('#caption-settings-btn');

		await browser.sleep(500);

		await utils.waitForElement('.settings-container');
		expect(await utils.isPresent('.settings-container')).to.be.true;

		await utils.waitForElement('ov-captions-settings');

		// Expect caption button is not present
		expect(await utils.isPresent('#caption-settings-btn')).to.be.false;
	});

	it('should TOGGLE the CAPTIONS container from settings panel', async () => {
		await browser.get(`${url}&prejoin=false`);

		await utils.checkSessionIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		// Open more options menu
		await utils.clickOn('#more-options-btn');

		await browser.sleep(500);

		// Checking if button panel is present
		await utils.waitForElement('.mat-menu-content');
		expect(await utils.isPresent('.mat-menu-content')).to.be.true;

		// Checking if captions button is present
		await utils.waitForElement('#captions-btn');
		expect(await utils.isPresent('#captions-btn')).to.be.true;
		await utils.clickOn('#captions-btn');

		await utils.waitForElement('.captions-container');
		await utils.waitForElement('#caption-settings-btn');
		await utils.clickOn('#caption-settings-btn');

		await browser.sleep(500);

		await utils.waitForElement('.settings-container');
		expect(await utils.isPresent('.settings-container')).to.be.true;

		await utils.waitForElement('ov-captions-settings');

		expect(await utils.isPresent('.captions-container')).to.be.true;
		await utils.clickOn('#captions-toggle-slide');
		expect(await utils.isPresent('.captions-container')).to.be.false;

		await browser.sleep(200);

		await utils.clickOn('#captions-toggle-slide');
		expect(await utils.isPresent('.captions-container')).to.be.true;
	});

	it('should change the CAPTIONS language', async () => {
		await browser.get(`${url}&prejoin=false`);

		await utils.checkSessionIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		// Open more options menu
		await utils.clickOn('#more-options-btn');

		await browser.sleep(500);

		// Checking if button panel is present
		await utils.waitForElement('.mat-menu-content');
		expect(await utils.isPresent('.mat-menu-content')).to.be.true;

		// Checking if captions button is present
		await utils.waitForElement('#captions-btn');
		expect(await utils.isPresent('#captions-btn')).to.be.true;
		await utils.clickOn('#captions-btn');

		await utils.waitForElement('.captions-container');
		await utils.waitForElement('#caption-settings-btn');
		await utils.clickOn('#caption-settings-btn');

		await browser.sleep(500);

		await utils.waitForElement('.settings-container');
		expect(await utils.isPresent('.settings-container')).to.be.true;

		await utils.waitForElement('ov-captions-settings');

		expect(await utils.isPresent('.captions-container')).to.be.true;

		await utils.clickOn('.lang-button');
		await browser.sleep(500);

		await utils.clickOn('#es-ES');
		await utils.clickOn('.panel-close-button');

		const button = await utils.waitForElement('#caption-settings-btn');
		expect(await button.getText()).equals('settingsEspañol');
	});
});
