import { Builder, By, until, WebDriver } from 'selenium-webdriver';
import { expect } from 'chai';

import { AngularConfig } from './selenium.conf';

const url = AngularConfig.appUrl;
const TIMEOUT = 10000;

describe('Checkout localhost app', () => {
	let browser: WebDriver;
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
	});

	afterEach(async () => {
		await browser.quit();
	});

	// ** STRUCTURAL Directives

	it('should inject the custom TOOLBAR without additional buttons', async () => {
		await browser.get(`${url}`);
		let element: any = await browser.wait(until.elementLocated(By.id('ovToolbar-checkbox')), TIMEOUT);

		await element.click();

		element = await browser.wait(until.elementLocated(By.id('apply-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		// Check if custom toolbar is present in DOM
		element = await browser.wait(until.elementLocated(By.id('custom-toolbar')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Check if additional buttons element has not been rendered
		element = await browser.findElements(By.id('custom-toolbar-additional-buttons'));
		expect(element.length).equals(0);

		// Check if default toolbar is not present
		element = await browser.findElements(By.id('default-toolbar'));
		expect(element.length).equals(0);
	});

	it('should inject the custom TOOLBAR with additional buttons', async () => {
		await browser.get(`${url}`);
		let element: any = await browser.wait(until.elementLocated(By.id('ovToolbar-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('ovToolbarAdditionalButtons-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('apply-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		// Check if custom toolbar is present in DOM
		element = await browser.wait(until.elementLocated(By.id('custom-toolbar')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Check if additional buttons element has been rendered
		element = await browser.wait(until.elementLocated(By.id('custom-toolbar-additional-buttons')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		element = await browser.findElements(By.id('toolbar-additional-btn'));
		expect(element.length).equals(2);

		// Check if default toolbar is not present
		element = await browser.findElements(By.id('default-toolbar'));
		expect(element.length).equals(0);
	});

	it('should inject the TOOLBAR ADDITIONAL BUTTONS only', async () => {
		let element;
		await browser.get(`${url}`);

		element = await browser.wait(until.elementLocated(By.id('ovToolbarAdditionalButtons-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('apply-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		// Check if default toolbar is present
		element = await browser.wait(until.elementLocated(By.id('default-toolbar')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Check if additional buttons are present
		element = await browser.wait(until.elementLocated(By.id('custom-toolbar-additional-buttons')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		element = await browser.findElements(By.id('toolbar-additional-btn'));
		expect(element.length).equals(3);

		// Check if custom toolbar not is present
		element = await browser.findElements(By.id('custom-toolbar'));
		expect(element.length).equals(0);
	});

	//* PANELS

	it('should inject the CUSTOM PANEL without children', async () => {
		let element;
		await browser.get(`${url}`);

		element = await browser.wait(until.elementLocated(By.id('ovPanel-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('apply-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		// Check if toolbar panel buttons are present
		element = await browser.wait(until.elementLocated(By.id('menu-buttons-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Click on button for opening panel
		element = await browser.wait(until.elementLocated(By.id('participants-panel-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		// Check if custom panel is present
		element = await browser.findElements(By.id('custom-panels'));
		expect(element.length).equals(1);

		// Check if default panel is not present
		element = await browser.findElements(By.id('default-panel'));
		expect(element.length).equals(0);

		// Check if default participant panel is not present
		element = await browser.findElements(By.id('default-participant-panel'));
		expect(element.length).equals(0);

		// Check if custom participant panel is not present
		element = await browser.findElements(By.id('custom-participants-panel'));
		expect(element.length).equals(0);

		// Click on button for opening panel
		element = await browser.wait(until.elementLocated(By.id('chat-panel-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		// Check if default chat panel is not present
		element = await browser.findElements(By.id('default-chat-panel'));
		expect(element.length).equals(0);

		// Check if custom chat panel is not present
		element = await browser.findElements(By.id('custom-chat-panel'));
		expect(element.length).equals(0);
	});

	it('should inject the CUSTOM PANEL with CHAT PANEL only', async () => {
		let element;
		await browser.get(`${url}`);

		element = await browser.wait(until.elementLocated(By.id('ovPanel-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('ovChatPanel-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('apply-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		// Check if toolbar panel buttons are present
		element = await browser.wait(until.elementLocated(By.id('menu-buttons-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Click on button for opening participants panel
		element = await browser.wait(until.elementLocated(By.id('participants-panel-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		// Check if custom panel is present
		element = await browser.findElements(By.id('custom-panels'));
		expect(element.length).equals(1);

		// Check if default panel is not present
		element = await browser.findElements(By.id('default-panel'));
		expect(element.length).equals(0);

		// Check if default participant panel is not present
		element = await browser.findElements(By.id('default-participant-panel'));
		expect(element.length).equals(0);

		// Check if custom participant panel is not present
		element = await browser.findElements(By.id('custom-participants-panel'));
		expect(element.length).equals(0);

		// Click on button for opening chat panel
		element = await browser.wait(until.elementLocated(By.id('chat-panel-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		// Check if default chat panel is not present
		element = await browser.findElements(By.id('default-chat-panel'));
		expect(element.length).equals(0);

		// Check if custom chat panel is not present
		element = await browser.wait(until.elementLocated(By.id('custom-chat-panel')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
	});

	it('should inject the CUSTOM PANEL with PARTICIPANTS PANEL only and without children', async () => {
		let element;
		await browser.get(`${url}`);

		element = await browser.wait(until.elementLocated(By.id('ovPanel-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('ovParticipantsPanel-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('apply-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		// Check if toolbar panel buttons are present
		element = await browser.wait(until.elementLocated(By.id('menu-buttons-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Click on button for opening participants panel
		element = await browser.wait(until.elementLocated(By.id('participants-panel-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		// Check if custom panel is present
		element = await browser.findElements(By.id('custom-panels'));
		expect(element.length).equals(1);

		// Check if default panel is not present
		element = await browser.findElements(By.id('default-panel'));
		expect(element.length).equals(0);

		// Check if default participant panel is not present
		element = await browser.findElements(By.id('default-participant-panel'));
		expect(element.length).equals(0);

		// Check if custom participant panel is not present
		element = await browser.wait(until.elementLocated(By.id('custom-participants-panel')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Click on button for opening chat panel
		element = await browser.wait(until.elementLocated(By.id('chat-panel-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		// Check if default chat panel is not present
		element = await browser.findElements(By.id('default-chat-panel'));
		expect(element.length).equals(0);

		// Check if custom chat panel is not present
		element = await browser.findElements(By.id('custom-chat-panel'));
		expect(element.length).equals(0);
	});

	it('should inject the CUSTOM PANEL with PARTICIPANTS PANEL and P ITEM only', async () => {
		let element;
		await browser.get(`${url}`);

		element = await browser.wait(until.elementLocated(By.id('ovPanel-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('ovParticipantsPanel-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('ovParticipantPanelItem-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('apply-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		// Check if toolbar panel buttons are present
		element = await browser.wait(until.elementLocated(By.id('menu-buttons-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Click on button for opening participants panel
		element = await browser.wait(until.elementLocated(By.id('participants-panel-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		// Check if custom panel is present
		element = await browser.findElements(By.id('custom-panels'));
		expect(element.length).equals(1);

		// Check if default panel is not present
		element = await browser.findElements(By.id('default-panel'));
		expect(element.length).equals(0);

		// Check if default participant panel is not present
		element = await browser.findElements(By.id('default-participant-panel'));
		expect(element.length).equals(0);

		// Check if custom participant panel is present
		element = await browser.wait(until.elementLocated(By.id('custom-participants-panel')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Check if custom participant panel item is present
		element = await browser.wait(until.elementLocated(By.id('custom-participants-panel-item')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Check if default participant panel item is not present
		element = await browser.findElements(By.id('default-participant-panel-item'));
		expect(element.length).equals(0);
	});

	it('should inject the CUSTOM PANEL with PARTICIPANTS PANEL and P ITEM and P ITEM ELEMENT', async () => {
		let element;
		await browser.get(`${url}`);

		element = await browser.wait(until.elementLocated(By.id('ovPanel-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('ovParticipantsPanel-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('ovParticipantPanelItem-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('ovParticipantPanelItemElements-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('apply-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		// Check if toolbar panel buttons are present
		element = await browser.wait(until.elementLocated(By.id('menu-buttons-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Click on button for opening participants panel
		element = await browser.wait(until.elementLocated(By.id('participants-panel-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		// Check if custom panel is present
		element = await browser.findElements(By.id('custom-panels'));
		expect(element.length).equals(1);

		// Check if custom participant panel is present
		element = await browser.wait(until.elementLocated(By.id('custom-participants-panel')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Check if custom participant panel item is present
		element = await browser.wait(until.elementLocated(By.id('custom-participants-panel-item')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Check if custom participant panel item element is present
		element = await browser.findElements(By.id('custom-participants-panel-item-element'));
		expect(element.length).equals(1);

		// Check if default panel is not present
		element = await browser.findElements(By.id('default-panel'));
		expect(element.length).equals(0);

		// Check if default participant panel is not present
		element = await browser.findElements(By.id('default-participant-panel'));
		expect(element.length).equals(0);

		// Check if default participant panel item is not present
		element = await browser.findElements(By.id('default-participant-panel-item'));
		expect(element.length).equals(0);
	});

	it('should inject the CHAT PANEL only', async () => {
		let element;
		await browser.get(`${url}`);

		element = await browser.wait(until.elementLocated(By.id('ovChatPanel-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('apply-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		// Check if toolbar panel buttons are present
		element = await browser.wait(until.elementLocated(By.id('menu-buttons-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Click on button for opening participants panel
		element = await browser.wait(until.elementLocated(By.id('participants-panel-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		// Check if custom panel is present
		element = await browser.findElements(By.id('custom-panels'));
		expect(element.length).equals(0);

		// Check if default panel is not present
		element = await browser.findElements(By.id('default-panel'));
		expect(element.length).equals(1);

		// Check if default participant panel is not present
		element = await browser.findElements(By.id('default-participants-panel'));
		expect(element.length).equals(1);

		// Check if custom participant panel is not present
		element = await browser.findElements(By.id('custom-participants-panel'));
		expect(element.length).equals(0);

		// Click on button for opening chat panel
		element = await browser.wait(until.elementLocated(By.id('chat-panel-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		// Check if default chat panel is not present
		element = await browser.findElements(By.id('default-chat-panel'));
		expect(element.length).equals(0);

		// Check if custom chat panel is not present
		element = await browser.wait(until.elementLocated(By.id('custom-chat-panel')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
	});

	it('should inject the PARTICIPANTS PANEL only', async () => {
		let element;
		await browser.get(`${url}`);

		element = await browser.wait(until.elementLocated(By.id('ovParticipantsPanel-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('apply-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		// Check if toolbar panel buttons are present
		element = await browser.wait(until.elementLocated(By.id('menu-buttons-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Click on button for opening participants panel
		element = await browser.wait(until.elementLocated(By.id('participants-panel-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		// Check if custom panel is not present
		element = await browser.findElements(By.id('custom-panels'));
		expect(element.length).equals(0);

		// Check if default panel is present
		element = await browser.findElements(By.id('default-panel'));
		expect(element.length).equals(1);

		// Check if default participant panel is not present
		element = await browser.findElements(By.id('default-participant-panel'));
		expect(element.length).equals(0);

		// Check if custom participant panel is not present
		element = await browser.wait(until.elementLocated(By.id('custom-participants-panel')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Click on button for opening chat panel
		element = await browser.wait(until.elementLocated(By.id('chat-panel-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		// Check if default chat panel is present
		element = await browser.findElements(By.id('default-chat-panel'));
		expect(element.length).equals(1);

		// Check if custom chat panel is not present
		element = await browser.findElements(By.id('custom-chat-panel'));
		expect(element.length).equals(0);
	});

	it('should inject the PARTICIPANTS PANEL ITEM only', async () => {
		let element;
		await browser.get(`${url}`);

		element = await browser.wait(until.elementLocated(By.id('ovParticipantPanelItem-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('apply-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		// Check if toolbar panel buttons are present
		element = await browser.wait(until.elementLocated(By.id('menu-buttons-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Click on button for opening participants panel
		element = await browser.wait(until.elementLocated(By.id('participants-panel-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		// Check if custom panel is not present
		element = await browser.findElements(By.id('custom-panels'));
		expect(element.length).equals(0);

		// Check if default panel is present
		element = await browser.findElements(By.id('default-panel'));
		expect(element.length).equals(1);

		// Check if default participant panel is not present
		element = await browser.findElements(By.id('default-participants-panel'));
		expect(element.length).equals(1);

		// Check if custom participant panel is not present
		element = await browser.findElements(By.id('custom-participants-panel'));
		expect(element.length).equals(0);

		element = await browser.wait(until.elementLocated(By.id('custom-participants-panel-item')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Click on button for opening chat panel
		element = await browser.wait(until.elementLocated(By.id('chat-panel-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		// Check if default chat panel is present
		element = await browser.findElements(By.id('default-chat-panel'));
		expect(element.length).equals(1);

		// Check if custom chat panel is not present
		element = await browser.findElements(By.id('custom-chat-panel'));
		expect(element.length).equals(0);
	});

	it('should inject the PARTICIPANTS PANEL ITEM ELEMENT only', async () => {
		let element;
		await browser.get(`${url}`);

		element = await browser.wait(until.elementLocated(By.id('ovParticipantPanelItemElements-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('apply-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		// Check if toolbar panel buttons are present
		element = await browser.wait(until.elementLocated(By.id('menu-buttons-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Click on button for opening participants panel
		element = await browser.wait(until.elementLocated(By.id('participants-panel-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		// Check if custom panel is not present
		element = await browser.findElements(By.id('custom-panels'));
		expect(element.length).equals(0);

		// Check if default panel is present
		element = await browser.findElements(By.id('default-panel'));
		expect(element.length).equals(1);

		// Check if default participant panel is not present
		element = await browser.findElements(By.id('default-participants-panel'));
		expect(element.length).equals(1);

		// Check if custom participant panel is not present
		element = await browser.findElements(By.id('custom-participants-panel'));
		expect(element.length).equals(0);

		element = await browser.findElements(By.id('custom-participants-panel-item'));
		expect(element.length).equals(0);

		element = await browser.findElements(By.id('custom-participants-panel-item'));
		expect(element.length).equals(0);

		element = await browser.findElements(By.id('custom-participants-panel-item-element'));
		expect(element.length).equals(1);

		// Click on button for opening chat panel
		element = await browser.wait(until.elementLocated(By.id('chat-panel-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		// Check if default chat panel is present
		element = await browser.findElements(By.id('default-chat-panel'));
		expect(element.length).equals(1);

		// Check if custom chat panel is not present
		element = await browser.findElements(By.id('custom-chat-panel'));
		expect(element.length).equals(0);
	});

	it('should inject the CUSTOM PANEL with CHAT and PARTICIPANTS PANELS', async () => {
		let element;
		await browser.get(`${url}`);

		element = await browser.wait(until.elementLocated(By.id('ovPanel-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('ovChatPanel-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('ovParticipantsPanel-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('apply-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		// Check if toolbar panel buttons are present
		element = await browser.wait(until.elementLocated(By.id('menu-buttons-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Click on button for opening participants panel
		element = await browser.wait(until.elementLocated(By.id('participants-panel-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		// Check if custom panel is present
		element = await browser.findElements(By.id('custom-panels'));
		expect(element.length).equals(1);

		// Check if default panel is not present
		element = await browser.findElements(By.id('default-panel'));
		expect(element.length).equals(0);

		// Check if default participant panel is not present
		element = await browser.findElements(By.id('default-participant-panel'));
		expect(element.length).equals(0);

		// Check if custom participant panel is not present
		element = await browser.wait(until.elementLocated(By.id('custom-participants-panel')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Click on button for opening chat panel
		element = await browser.wait(until.elementLocated(By.id('chat-panel-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		// Check if default chat panel is not present
		element = await browser.findElements(By.id('default-chat-panel'));
		expect(element.length).equals(0);

		// Check if custom chat panel is not present
		element = await browser.wait(until.elementLocated(By.id('custom-chat-panel')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
	});

	//* LAYOUT

	it('should inject the custom LAYOUT WITHOUT STREAM', async () => {
		await browser.get(`${url}`);
		let element: any = await browser.wait(until.elementLocated(By.id('ovLayout-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('apply-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		// Check if custom layout is present
		element = await browser.wait(until.elementLocated(By.id('custom-layout')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Check if default layout is not present
		element = await browser.findElements(By.id('default-layout'));
		expect(element.length).equals(0);

		// Check if custom stream is not present
		element = await browser.findElements(By.id('custom-stream'));
		expect(element.length).equals(0);

		// Check if video is not present
		element = await browser.findElements(By.css('video'));
		expect(element.length).equals(0);
	});

	it('should inject the custom LAYOUT WITH STREAM', async () => {
		await browser.get(`${url}`);
		let element: any = await browser.wait(until.elementLocated(By.id('ovLayout-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('ovStream-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('apply-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		// Check if custom layout is present
		element = await browser.wait(until.elementLocated(By.id('custom-layout')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Check if default layout is not present
		element = await browser.findElements(By.id('default-layout'));
		expect(element.length).equals(0);

		// Check if custom stream is present
		element = await browser.wait(until.elementLocated(By.id('custom-stream')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Check if default stream is not present
		element = await browser.findElements(By.id('default-stream'));
		expect(element.length).equals(0);

		// Check if video is present
		element = await browser.findElements(By.css('video'));
		expect(element.length).equals(1);
	});

	it('should inject the CUSTOM STREAM only', async () => {
		let element;
		await browser.get(`${url}`);

		element = await browser.wait(until.elementLocated(By.id('ovStream-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('apply-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		// Check if default layout is not present
		element = await browser.wait(until.elementLocated(By.id('default-layout')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Check if custom stream is present
		element = await browser.wait(until.elementLocated(By.id('custom-stream')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Check if custom layout is not present
		element = await browser.findElements(By.id('custom-layout'));
		expect(element.length).equals(0);

		// Check if default stream is not present
		element = await browser.findElements(By.id('default-stream'));
		expect(element.length).equals(0);

		// Check if video is present
		element = await browser.findElements(By.css('video'));
		expect(element.length).equals(1);
	});

	// * EVENTS
	// it('should receive the onJoinButtonClicked event', async () => {
	// 	let element;
	// 	await browser.get(`${url}`);
	// 	element = await browser.wait(until.elementLocated(By.id('prejoin-container')), TIMEOUT);
	// 	expect(await element.isDisplayed()).to.be.true;

	// 	// Clicking to join button
	// 	const joinButton = await browser.findElement(By.id('join-button'));
	// 	expect(await joinButton.isDisplayed()).to.be.true;
	// 	await joinButton.click();

	// 	// Checking if onJoinButtonClicked has been received
	// 	element = await browser.wait(until.elementLocated(By.id('onJoinButtonClicked')), TIMEOUT);
	// 	expect(await element.isDisplayed()).to.be.true;
	// });

	it('should receive the onLeaveButtonClicked event', async () => {
		let element;
		await browser.get(`${url}`);

		element = await browser.wait(until.elementLocated(By.id('ovToolbar-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('apply-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('session-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if toolbar is present
		element = await browser.wait(until.elementLocated(By.id('media-buttons-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Clicking to leave button
		const leaveButton = await browser.findElement(By.id('leave-btn'));
		expect(await leaveButton.isDisplayed()).to.be.true;
		await leaveButton.click();

		// Checking if onLeaveButtonClicked has been received
		element = await browser.wait(until.elementLocated(By.id('onLeaveButtonClicked')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
	});

	it('should receive the onCameraButtonClicked event', async () => {
		let element;
		await browser.get(`${url}`);

		element = await browser.wait(until.elementLocated(By.id('ovToolbar-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('apply-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('session-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if toolbar is present
		element = await browser.wait(until.elementLocated(By.id('media-buttons-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Clicking to leave button
		const cameraButton = await browser.findElement(By.id('camera-btn'));
		expect(await cameraButton.isDisplayed()).to.be.true;
		await cameraButton.click();

		// Checking if onCameraButtonClicked has been received
		element = await browser.wait(until.elementLocated(By.id('onCameraButtonClicked')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
	});

	it('should receive the onMicrophoneButtonClicked event', async () => {
		let element;
		await browser.get(`${url}`);

		element = await browser.wait(until.elementLocated(By.id('ovToolbar-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('apply-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('session-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if toolbar is present
		element = await browser.wait(until.elementLocated(By.id('media-buttons-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Clicking to leave button
		const cameraButton = await browser.findElement(By.id('mic-btn'));
		expect(await cameraButton.isDisplayed()).to.be.true;
		await cameraButton.click();

		// Checking if onMicrophoneButtonClicked has been received
		element = await browser.wait(until.elementLocated(By.id('onMicrophoneButtonClicked')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
	});

	it('should receive the onScreenshareButtonClicked event', async () => {
		let element;
		await browser.get(`${url}`);

		element = await browser.wait(until.elementLocated(By.id('ovToolbar-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('apply-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('session-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if toolbar is present
		element = await browser.wait(until.elementLocated(By.id('media-buttons-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Clicking to leave button
		const screenshareButton = await browser.findElement(By.id('screenshare-btn'));
		expect(await screenshareButton.isDisplayed()).to.be.true;
		await screenshareButton.click();

		// Checking if onScreenshareButtonClicked has been received
		element = await browser.wait(until.elementLocated(By.id('onScreenshareButtonClicked')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
	});

	it('should receive the onFullscreenButtonClicked event', async () => {
		let element;
		await browser.get(`${url}`);

		element = await browser.wait(until.elementLocated(By.id('ovToolbar-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('apply-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('session-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Checking if toolbar is present
		element = await browser.wait(until.elementLocated(By.id('media-buttons-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Clicking to leave button
		const fullscreenButton = await browser.findElement(By.id('fullscreen-btn'));
		expect(await fullscreenButton.isDisplayed()).to.be.true;
		await fullscreenButton.click();

		// Checking if onFullscreenButtonClicked has been received
		element = await browser.wait(until.elementLocated(By.id('onFullscreenButtonClicked')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
	});


});
