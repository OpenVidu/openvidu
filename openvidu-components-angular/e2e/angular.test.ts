import { Builder, By, until, WebDriver } from 'selenium-webdriver';
import { expect } from 'chai';

import { AngularConfig } from './selenium.conf';

const url = AngularConfig.appUrl;
const TIMEOUT = 10000;

describe('Testing TOOLBAR STRUCTURAL DIRECTIVES', () => {
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

	it('should inject the custom TOOLBAR with additional PANEL buttons', async () => {
		await browser.get(`${url}`);
		let element: any = await browser.wait(until.elementLocated(By.id('ovToolbar-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('ovToolbarAdditionalPanelButtons-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('apply-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		// Check if custom toolbar is present in DOM
		element = await browser.wait(until.elementLocated(By.id('custom-toolbar')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Check if additional buttons element has been rendered
		element = await browser.wait(until.elementLocated(By.id('custom-toolbar-additional-panel-buttons')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		element = await browser.findElements(By.id('toolbar-additional-panel-btn'));
		expect(element.length).equals(1);

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

	it('should inject the TOOLBAR ADDITIONAL PANEL BUTTONS only', async () => {
		let element;
		await browser.get(`${url}`);

		element = await browser.wait(until.elementLocated(By.id('ovToolbarAdditionalPanelButtons-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('apply-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		// Check if default toolbar is present
		element = await browser.wait(until.elementLocated(By.id('default-toolbar')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Check if additional buttons are present
		element = await browser.wait(until.elementLocated(By.id('custom-toolbar-additional-panel-buttons')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		element = await browser.findElements(By.id('toolbar-additional-panel-btn'));
		expect(element.length).equals(2);

		// Check if custom toolbar not is present
		element = await browser.findElements(By.id('custom-toolbar'));
		expect(element.length).equals(0);
	});
});

describe('Testing PANEL STRUCTURAL DIRECTIVES', () => {
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

	it('should inject the CUSTOM PANEL with ADDITIONAL PANEL only', async () => {
		let element;
		await browser.get(`${url}`);

		element = await browser.wait(until.elementLocated(By.id('ovPanel-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('ovAdditionalPanels-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('apply-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		// Check if toolbar panel buttons are present
		element = await browser.wait(until.elementLocated(By.id('menu-buttons-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Click on button for opening additional panel
		const panelBtn = await browser.wait(until.elementLocated(By.id('toolbar-additional-panel-btn')), TIMEOUT);
		expect(await panelBtn.isDisplayed()).to.be.true;
		await panelBtn.click();

		// Check if custom panel is present
		element = await browser.findElements(By.id('custom-additional-panel'));
		expect(element.length).equals(1);
		element = await browser.wait(until.elementLocated(By.id('additional-panel-title')), TIMEOUT);
		await browser.wait(until.elementTextMatches(element, /NEW PANEL/), TIMEOUT);
		expect(await element.getAttribute("innerText")).equals('NEW PANEL');

		await panelBtn.click();

		element = await browser.findElements(By.id('custom-additional-panel'));
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

	it('should inject the CUSTOM PANEL with ACTIVITIES PANEL only', async () => {
		let element;
		await browser.get(`${url}`);

		element = await browser.wait(until.elementLocated(By.id('ovPanel-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('ovActivitiesPanel-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('apply-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		// Check if toolbar panel buttons are present
		element = await browser.wait(until.elementLocated(By.id('menu-buttons-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Click on button for opening chat panel
		element = await browser.wait(until.elementLocated(By.id('activities-panel-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		// Check if default activities panel is not present
		element = await browser.findElements(By.id('default-activities-panel'));
		expect(element.length).equals(0);

		// Check if custom chat panel is not present
		element = await browser.findElements(By.id('custom-activities-panel'));
		expect(element.length).equals(1);
		element = await browser.wait(until.elementLocated(By.id('activities-panel-title')), TIMEOUT);
		await browser.wait(until.elementTextMatches(element, /CUSTOM ACTIVITIES PANEL/), TIMEOUT);
		expect(await element.getAttribute("innerText")).equals('CUSTOM ACTIVITIES PANEL');
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


	it('should inject an ACTIVITIES PANEL only', async () => {
		let element;
		await browser.get(`${url}`);

		element = await browser.wait(until.elementLocated(By.id('ovActivitiesPanel-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('apply-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		// Check if toolbar panel buttons are present
		element = await browser.wait(until.elementLocated(By.id('menu-buttons-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Click on button for opening additional panel
		const panelBtn = await browser.wait(until.elementLocated(By.id('activities-panel-btn')), TIMEOUT);
		expect(await panelBtn.isDisplayed()).to.be.true;
		await panelBtn.click();

		// Check if default panel is not present
		element = await browser.findElements(By.id('default-activities-panel'));
		expect(element.length).equals(0);

		// Check if custom panel is present
		element = await browser.findElements(By.id('custom-activities-panel'));
		expect(element.length).equals(1);
	});

	it('should inject an ADDITIONAL PANEL only', async () => {
		let element;
		await browser.get(`${url}`);

		element = await browser.wait(until.elementLocated(By.id('ovAdditionalPanels-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('apply-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		// Check if toolbar panel buttons are present
		element = await browser.wait(until.elementLocated(By.id('menu-buttons-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Click on button for opening additional panel
		const panelBtn = await browser.wait(until.elementLocated(By.id('toolbar-additional-panel-btn')), TIMEOUT);
		expect(await panelBtn.isDisplayed()).to.be.true;
		await panelBtn.click();

		// Check if custom panel is present
		element = await browser.findElements(By.id('custom-additional-panel'));
		expect(element.length).equals(1);
		element = await browser.wait(until.elementLocated(By.id('additional-panel-title')), TIMEOUT);
		await browser.wait(until.elementTextMatches(element, /NEW PANEL/), TIMEOUT);
		expect(await element.getAttribute("innerText")).equals('NEW PANEL');

		await panelBtn.click();

		element = await browser.findElements(By.id('custom-additional-panel'));
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

		// Check if custom chat panel is present
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
});

describe('Testing LAYOUT STRUCTURAL DIRECTIVES', () => {
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
});

describe('Testing ATTRIBUTE DIRECTIVES', () => {
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

	it('should HIDE the CHAT PANEL BUTTON', async () => {
		let element;
		await browser.get(`${url}`);

		element = await browser.wait(until.elementLocated(By.id('ovToolbar-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('chatPanelButton-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('apply-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('toolbar')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		element = await browser.wait(until.elementLocated(By.id('menu-buttons-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Check if chat button does not exist
		element = await browser.findElements(By.id('chat-panel-btn'));
		expect(element.length).equals(0);
	});

	it('should HIDE the PARTICIPANTS PANEL BUTTON', async () => {
		let element;
		await browser.get(`${url}`);

		element = await browser.wait(until.elementLocated(By.id('ovToolbar-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('participantsPanelButton-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('apply-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('toolbar')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		element = await browser.wait(until.elementLocated(By.id('menu-buttons-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Check if participants button does not exist
		element = await browser.findElements(By.id('participants-panel-btn'));
		expect(element.length).equals(0);
	});

	it('should HIDE the ACTIVITIES PANEL BUTTON', async () => {
		let element;
		await browser.get(`${url}`);

		element = await browser.wait(until.elementLocated(By.id('ovToolbar-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('activitiesPanelButton-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('apply-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('toolbar')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		element = await browser.wait(until.elementLocated(By.id('menu-buttons-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Check if participants button does not exist
		element = await browser.findElements(By.id('activities-panel-btn'));
		expect(element.length).equals(0);
	});

	it('should HIDE the DISPLAY LOGO', async () => {
		let element;
		await browser.get(`${url}`);

		element = await browser.wait(until.elementLocated(By.id('ovToolbar-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('displayLogo-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('apply-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('toolbar')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		element = await browser.wait(until.elementLocated(By.id('info-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		element = await browser.findElements(By.id('branding-logo'));
		expect(element.length).equals(0);
	});

	it('should HIDE the DISPLAY SESSION name', async () => {
		let element;
		await browser.get(`${url}`);

		element = await browser.wait(until.elementLocated(By.id('ovToolbar-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('displaySessionName-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('apply-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('toolbar')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		element = await browser.wait(until.elementLocated(By.id('info-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		element = await browser.findElements(By.id('session-name'));
		expect(element.length).equals(0);
	});

	it('should HIDE the FULLSCREEN button', async () => {
		let element;
		await browser.get(`${url}`);

		element = await browser.wait(until.elementLocated(By.id('ovToolbar-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('fullscreenButton-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('apply-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('toolbar')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		element = await browser.wait(until.elementLocated(By.id('media-buttons-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;


		// Open more options menu
		element = await browser.wait(until.elementLocated(By.id('more-options-btn')), TIMEOUT);
		await element.click();

		await browser.sleep(500);

		// Checking if fullscreen button is not present
		element = await browser.wait(until.elementLocated(By.className('mat-menu-content')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		element = await browser.findElements(By.id('fullscreen-btn'));
		expect(element.length).equals(0);
	});

	it('should HIDE the LEAVE button', async () => {
		let element;
		await browser.get(`${url}`);

		element = await browser.wait(until.elementLocated(By.id('ovToolbar-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('leaveButton-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('apply-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('toolbar')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		element = await browser.wait(until.elementLocated(By.id('media-buttons-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		element = await browser.findElements(By.id('leave-btn'));
		expect(element.length).equals(0);
	});

	it('should HIDE the SCREENSHARE button', async () => {
		let element;
		await browser.get(`${url}`);

		element = await browser.wait(until.elementLocated(By.id('ovToolbar-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('screenshareButton-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('apply-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('toolbar')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		element = await browser.wait(until.elementLocated(By.id('media-buttons-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;



		element = await browser.findElements(By.id('screenshare-btn'));
		expect(element.length).equals(0);
	});

	it('should HIDE the AUDIO detector', async () => {
		let element;
		await browser.get(`${url}`);

		element = await browser.wait(until.elementLocated(By.id('ovStream-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('displayAudioDetection-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('apply-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('custom-stream')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		element = await browser.findElements(By.id('audio-wave-container'));
		expect(element.length).equals(0);
	});

	it('should HIDE the PARTICIPANT NAME', async () => {
		let element;
		await browser.get(`${url}`);

		element = await browser.wait(until.elementLocated(By.id('ovStream-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('displayParticipantName-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('apply-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('custom-stream')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		element = await browser.findElements(By.id('nickname-container'));
		expect(element.length).equals(0);
	});

	it('should HIDE the SETTINGS button', async () => {
		let element;
		await browser.get(`${url}`);

		element = await browser.wait(until.elementLocated(By.id('ovStream-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('settingsButton-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('apply-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('custom-stream')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		element = await browser.findElements(By.id('settings-container'));
		expect(element.length).equals(0);
	});

	it('should HIDE the participant MUTE button', async () => {
		let element;
		const fixedSession = `${url}?sessionId=fixedNameTesting`;
		await browser.get(`${fixedSession}`);

		element = await browser.wait(until.elementLocated(By.id('ovParticipantPanelItem-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('muteButton-checkbox')), TIMEOUT);
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('apply-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('session-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		element = await browser.wait(until.elementLocated(By.id('menu-buttons-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		element = await browser.findElement(By.id('participants-panel-btn'));
		await element.click();

		element = await browser.wait(until.elementLocated(By.id('participants-container')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;

		// Starting new browser for adding a new participant
		const newTabScript = `window.open("${fixedSession}")`;
		await browser.executeScript(newTabScript);

		// Get tabs opened
		const tabs = await browser.getAllWindowHandles();
		// Focus on the last tab
		browser.switchTo().window(tabs[1]);

		element = await browser.wait(until.elementLocated(By.id('apply-btn')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		await element.click();

		// Switch to first tab
		browser.switchTo().window(tabs[0]);

		element = await browser.wait(until.elementsLocated(By.id('remote-participant-item')), TIMEOUT);
		expect(element.length).equals(1);
		element = await browser.findElements(By.id('mute-btn'));
		expect(element.length).equals(0);
	});
});

describe('Testing EVENTS', () => {
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

		// Open more options menu
		element = await browser.wait(until.elementLocated(By.id('more-options-btn')), TIMEOUT);
		await element.click();

		await browser.sleep(500);

		element = await browser.wait(until.elementLocated(By.className('mat-menu-content')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
		const fullscreenButton = await browser.findElement(By.id('fullscreen-btn'));
		expect(await fullscreenButton.isDisplayed()).to.be.true;
		await fullscreenButton.click();


		// Checking if onFullscreenButtonClicked has been received
		element = await browser.wait(until.elementLocated(By.id('onFullscreenButtonClicked')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
	});

	it('should receive the onParticipantsPanelButtonClicked event', async () => {
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

		// Clicking to participants button
		const participantsButton = await browser.findElement(By.id('participants-panel-btn'));
		expect(await participantsButton.isDisplayed()).to.be.true;
		await participantsButton.click();

		// Checking if onParticipantsPanelButtonClicked has been received
		element = await browser.wait(until.elementLocated(By.id('onParticipantsPanelButtonClicked')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
	});

	it('should receive the onChatPanelButtonClicked event', async () => {
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

		// Clicking to chat button
		const chatButton = await browser.findElement(By.id('chat-panel-btn'));
		expect(await chatButton.isDisplayed()).to.be.true;
		await chatButton.click();

		// Checking if onChatPanelButtonClicked has been received
		element = await browser.wait(until.elementLocated(By.id('onChatPanelButtonClicked')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
	});

	it('should receive the onActivitiesPanelButtonClicked event', async () => {
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

		// Clicking to activities button
		const activitiesButton = await browser.findElement(By.id('activities-panel-btn'));
		expect(await activitiesButton.isDisplayed()).to.be.true;
		await activitiesButton.click();

		// Checking if onActivitiesPanelButtonClicked has been received
		element = await browser.wait(until.elementLocated(By.id('onActivitiesPanelButtonClicked')), TIMEOUT);
		expect(await element.isDisplayed()).to.be.true;
	});
});
