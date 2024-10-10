import { Builder, WebDriver } from 'selenium-webdriver';
import { OPENVIDU_CALL_SERVER } from './config';
import { WebComponentConfig } from './selenium.conf';
import { OpenViduComponentsPO } from './utils.po.test';

const url = `${WebComponentConfig.appUrl}?OV_URL=${OPENVIDU_CALL_SERVER}`;

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
		await utils.waitForElement('#more-options-menu');
		expect(await utils.isPresent('#more-options-menu')).toBeTrue();

		// Checking if captions button is present
		await utils.waitForElement('#captions-btn');
		expect(await utils.isPresent('#captions-btn')).toBeTrue();
		await utils.clickOn('#captions-btn');

		await utils.waitForElement('.captions-container');
		await utils.waitForElement('#caption-settings-btn');
		await utils.clickOn('#caption-settings-btn');

		await browser.sleep(500);

		await utils.waitForElement('.settings-container');
		expect(await utils.isPresent('.settings-container')).toBeTrue();

		await utils.waitForElement('ov-captions-settings');

		expect(await utils.isPresent('.captions-container')).toBeTrue();

		const element = await utils.waitForElement('.lang-button');
		expect(await element.getText()).toEqual('Españolexpand_more');
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
		await utils.waitForElement('#more-options-menu');
		expect(await utils.isPresent('#more-options-menu')).toBeTrue();

		// Checking if captions button is present
		await utils.waitForElement('#captions-btn');
		expect(await utils.isPresent('#captions-btn')).toBeTrue();
		await utils.clickOn('#captions-btn');

		await utils.waitForElement('.captions-container');
		await utils.waitForElement('#caption-settings-btn');
		await utils.clickOn('#caption-settings-btn');

		await browser.sleep(500);

		await utils.waitForElement('.settings-container');
		expect(await utils.isPresent('.settings-container')).toBeTrue();

		await utils.waitForElement('ov-captions-settings');

		expect(await utils.isPresent('.captions-container')).toBeTrue();

		const element = await utils.waitForElement('.lang-button');
		expect(await element.getText()).toEqual('Espexpand_more');

		await element.click();

		expect(await utils.getNumberOfElements('.mat-menu-item')).toEqual(2);
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
		expect(await utils.isPresent('#pre-join-container')).toBeTrue();

		const backgroundButton = await utils.waitForElement('#background-effects-btn');
		expect(await utils.isPresent('#background-effects-btn')).toBeTrue();
		expect(await backgroundButton.isEnabled()).toBeTrue();
		await backgroundButton.click();
		await browser.sleep(500);

		await utils.waitForElement('#background-effects-container');
		expect(await utils.isPresent('#background-effects-container')).toBeTrue();

		element = await utils.waitForElement('#camera-button');
		expect(await utils.isPresent('#camera-button')).toBeTrue();
		expect(await element.isEnabled()).toBeTrue();
		await element.click();

		await browser.sleep(500);
		element = await utils.waitForElement('#video-poster');
		expect(await utils.isPresent('#video-poster')).toBeTrue();

		expect(await backgroundButton.isDisplayed()).toBeTrue();
		expect(await backgroundButton.isEnabled()).toBeFalse();

		expect(await utils.isPresent('#background-effects-container')).toBeFalse();
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
		await utils.waitForElement('#more-options-menu');
		expect(await utils.isPresent('#more-options-menu')).toBeTrue();

		// Checking if captions button is present
		await utils.waitForElement('#captions-btn');
		expect(await utils.isPresent('#captions-btn')).toBeTrue();
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
		await utils.waitForElement('#more-options-menu');
		expect(await utils.isPresent('#more-options-menu')).toBeTrue();

		// Checking if captions button is present
		await utils.waitForElement('#captions-btn');
		expect(await utils.isPresent('#captions-btn')).toBeTrue();
		await utils.clickOn('#captions-btn');

		await utils.waitForElement('.captions-container');
		await utils.waitForElement('#caption-settings-btn');
		await utils.clickOn('#caption-settings-btn');

		await browser.sleep(500);

		await utils.waitForElement('.settings-container');
		expect(await utils.isPresent('.settings-container')).toBeTrue();

		await utils.waitForElement('ov-captions-settings');

		// Expect caption button is not present
		expect(await utils.isPresent('#caption-settings-btn')).toBeFalse();
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
		await utils.waitForElement('#more-options-menu');
		expect(await utils.isPresent('#more-options-menu')).toBeTrue();

		// Checking if captions button is present
		await utils.waitForElement('#captions-btn');
		expect(await utils.isPresent('#captions-btn')).toBeTrue();
		await utils.clickOn('#captions-btn');

		await utils.waitForElement('.captions-container');
		await utils.waitForElement('#caption-settings-btn');
		await utils.clickOn('#caption-settings-btn');

		await browser.sleep(500);

		await utils.waitForElement('.settings-container');
		expect(await utils.isPresent('.settings-container')).toBeTrue();

		await utils.waitForElement('ov-captions-settings');

		expect(await utils.isPresent('.captions-container')).toBeTrue();
		await utils.clickOn('#captions-toggle-slide');
		expect(await utils.isPresent('.captions-container')).toBeFalse();

		await browser.sleep(200);

		await utils.clickOn('#captions-toggle-slide');
		expect(await utils.isPresent('.captions-container')).toBeTrue();
	});

	it('should change the CAPTIONS language from settings panel', async () => {
		await browser.get(`${url}&prejoin=false`);

		await utils.checkSessionIsPresent();

		// Checking if toolbar is present
		await utils.checkToolbarIsPresent();

		// Open more options menu
		await utils.clickOn('#more-options-btn');

		await browser.sleep(500);

		// Checking if button panel is present
		await utils.waitForElement('#more-options-menu');
		expect(await utils.isPresent('#more-options-menu')).toBeTrue();

		// Checking if captions button is present
		await utils.waitForElement('#captions-btn');
		expect(await utils.isPresent('#captions-btn')).toBeTrue();
		await utils.clickOn('#captions-btn');

		await utils.waitForElement('.captions-container');
		await utils.waitForElement('#caption-settings-btn');
		await utils.clickOn('#caption-settings-btn');

		await browser.sleep(500);

		await utils.waitForElement('.settings-container');
		expect(await utils.isPresent('.settings-container')).toBeTrue();

		await utils.waitForElement('ov-captions-settings');

		expect(await utils.isPresent('.captions-container')).toBeTrue();

		await utils.clickOn('.lang-button');
		await browser.sleep(500);

		await utils.clickOn('#es-ES');
		await utils.clickOn('.panel-close-button');

		const button = await utils.waitForElement('#caption-settings-btn');
		expect(await button.getText()).toEqual('settingsEspañol');
	});
});
