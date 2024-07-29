import { expect } from 'chai';
import { Builder, By, WebDriver } from 'selenium-webdriver';

import { AngularConfig } from './selenium.conf';
import { OpenViduComponentsPO } from './utils.po.test';

const url = AngularConfig.appUrl;

describe('Testing TOOLBAR STRUCTURAL DIRECTIVES', () => {
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
		// console.log('data:image/png;base64,' + await browser.takeScreenshot());
		await browser.quit();
	});

	it('should inject the custom TOOLBAR without additional buttons', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovToolbar-checkbox');

		await utils.clickOn('#apply-btn');

		// Check if custom toolbar is present in DOM
		await utils.waitForElement('#custom-toolbar');
		expect(await utils.isPresent('#custom-toolbar')).to.be.true;

		// Check if additional buttons element has not been rendered
		expect(await utils.isPresent('#custom-toolbar-additional-buttons')).to.be.false;

		// Check if default toolbar is not present
		expect(await utils.isPresent('#default-toolbar')).to.be.false;
	});

	it('should inject the custom TOOLBAR with additional buttons', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovToolbar-checkbox');

		await utils.clickOn('#ovToolbarAdditionalButtons-checkbox');

		await utils.clickOn('#apply-btn');

		// Check if custom toolbar is present in DOM
		await utils.waitForElement('#custom-toolbar');
		expect(await utils.isPresent('#custom-toolbar')).to.be.true;

		// Check if additional buttons element has been rendered;
		await utils.waitForElement('#custom-toolbar-additional-buttons');
		expect(await utils.isPresent('#custom-toolbar-additional-buttons')).to.be.true;

		const element = await browser.findElements(By.id('toolbar-additional-btn'));
		expect(element.length).equals(2);

		// Check if default toolbar is not present
		expect(await utils.isPresent('#default-toolbar')).to.be.false;
	});

	it('should inject the custom TOOLBAR with additional PANEL buttons', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovToolbar-checkbox');

		await utils.clickOn('#ovToolbarAdditionalPanelButtons-checkbox');

		await utils.clickOn('#apply-btn');

		// Check if custom toolbar is present in DOM
		await utils.waitForElement('#custom-toolbar');
		expect(await utils.isPresent('#custom-toolbar')).to.be.true;

		// Check if additional buttons element has been rendered;
		await utils.waitForElement('#custom-toolbar-additional-panel-buttons');
		expect(await utils.isPresent('#custom-toolbar-additional-panel-buttons')).to.be.true;

		const element = await browser.findElements(By.id('toolbar-additional-panel-btn'));
		expect(element.length).equals(1);

		// Check if default toolbar is not present
		expect(await utils.isPresent('#default-toolbar')).to.be.false;
	});

	it('should inject the TOOLBAR ADDITIONAL BUTTONS only', async () => {
		let element;
		await browser.get(`${url}`);

		await utils.clickOn('#ovToolbarAdditionalButtons-checkbox');

		await utils.clickOn('#apply-btn');

		// Check if default toolbar is present
		await utils.waitForElement('#default-toolbar');
		expect(await utils.isPresent('#default-toolbar')).to.be.true;

		// Check if additional buttons are present
		await utils.waitForElement('#custom-toolbar-additional-buttons');
		expect(await utils.isPresent('#custom-toolbar-additional-buttons')).to.be.true;

		element = await browser.findElements(By.id('toolbar-additional-btn'));
		expect(element.length).equals(3);

		// Check if custom toolbar not is present
		expect(await utils.isPresent('#custom-toolbar')).to.be.false;
	});

	it('should inject the TOOLBAR ADDITIONAL PANEL BUTTONS only', async () => {
		let element;
		await browser.get(`${url}`);

		await utils.clickOn('#ovToolbarAdditionalPanelButtons-checkbox');

		await utils.clickOn('#apply-btn');

		// Check if default toolbar is present
		await utils.waitForElement('#default-toolbar');
		expect(await utils.isPresent('#default-toolbar')).to.be.true;

		// Check if additional buttons are present
		await utils.waitForElement('#custom-toolbar-additional-panel-buttons');
		expect(await utils.isPresent('#custom-toolbar-additional-panel-buttons')).to.be.true;

		element = await browser.findElements(By.id('toolbar-additional-panel-btn'));
		expect(element.length).equals(2);

		// Check if custom toolbar not is present
		expect(await utils.isPresent('#custom-toolbar')).to.be.false;
	});
});

describe('Testing PANEL STRUCTURAL DIRECTIVES', () => {
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

	it('should inject the CUSTOM PANEL without children', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovPanel-checkbox');

		await utils.clickOn('#apply-btn');

		// Check if toolbar panel buttons are present
		await utils.checkToolbarIsPresent();

		// Click on button for opening panel
		await utils.clickOn('#participants-panel-btn');

		// Check if custom panel is present
		await utils.waitForElement('#custom-panels');
		expect(await utils.isPresent('#custom-panels')).to.be.true;

		// Check if default panel is not present
		expect(await utils.isPresent('#default-panel')).to.be.false;

		// Check if default participant panel is not present
		expect(await utils.isPresent('#default-participant-panel')).to.be.false;

		// Check if custom participant panel is not present
		expect(await utils.isPresent('#custom-participants-panel')).to.be.false;

		// Click on button for opening panel
		await utils.clickOn('#chat-panel-btn');

		// Check if default chat panel is not present
		expect(await utils.isPresent('#default-chat-panel')).to.be.false;

		// Check if custom chat panel is not present
		expect(await utils.isPresent('#custom-chat-panel')).to.be.false;
	});

	it('should inject the CUSTOM PANEL with ADDITIONAL PANEL only', async () => {
		let element;
		await browser.get(`${url}`);

		await utils.clickOn('#ovPanel-checkbox');

		await utils.clickOn('#ovAdditionalPanels-checkbox');

		await utils.clickOn('#apply-btn');

		// Check if toolbar panel buttons are present
		await utils.checkToolbarIsPresent();

		// Click on button for opening additional panel
		await utils.clickOn('#toolbar-additional-panel-btn');

		// Check if custom panel is present
		element = await browser.findElements(By.id('custom-additional-panel'));
		expect(element.length).equals(1);

		element = await utils.waitForElement('#additional-panel-title');
		expect(await utils.isPresent('#additional-panel-title')).to.be.true;
		expect(await element.getAttribute('innerText')).equals('NEW PANEL');

		await utils.clickOn('#toolbar-additional-panel-btn');

		expect(await utils.isPresent('#custom-additional-panel')).to.be.false;
	});

	it('should inject the CUSTOM PANEL with CHAT PANEL only', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovPanel-checkbox');

		await utils.clickOn('#ovChatPanel-checkbox');

		await utils.clickOn('#apply-btn');

		// Check if toolbar panel buttons are present
		await utils.checkToolbarIsPresent();

		// Click on button for opening participants panel
		await utils.clickOn('#participants-panel-btn');

		// Check if custom panel is present
		await utils.waitForElement('#custom-panels');
		expect(await utils.isPresent('#custom-panels')).to.be.true;

		// Check if default panel is not present
		expect(await utils.isPresent('#default-panel')).to.be.false;

		// Check if default participant panel is not present
		expect(await utils.isPresent('#default-participant-panel')).to.be.false;

		// Check if custom participant panel is not present
		expect(await utils.isPresent('#custom-participants-panel')).to.be.false;

		// Click on button for opening chat panel
		await utils.clickOn('#chat-panel-btn');

		// Check if default chat panel is not present
		expect(await utils.isPresent('#default-chat-panel')).to.be.false;

		// Check if custom chat panel is not present
		await utils.waitForElement('#custom-chat-panel');
		expect(await utils.isPresent('#custom-chat-panel')).to.be.true;
	});

	it('should inject the CUSTOM PANEL with ACTIVITIES PANEL only', async () => {
		let element;
		await browser.get(`${url}`);

		await utils.clickOn('#ovPanel-checkbox');

		await utils.clickOn('#ovActivitiesPanel-checkbox');

		await utils.clickOn('#apply-btn');

		// Check if toolbar panel buttons are present
		await utils.checkToolbarIsPresent();

		// Click on button for opening chat panel
		await utils.clickOn('#activities-panel-btn');

		// Check if default activities panel is not present
		expect(await utils.isPresent('#default-activities-panel')).to.be.false;

		// Check if custom chat panel is not present
		element = await utils.waitForElement('#custom-activities-panel');
		expect(await utils.isPresent('#custom-activities-panel')).to.be.true;

		element = await utils.waitForElement('#activities-panel-title');
		expect(await element.getAttribute('innerText')).equals('CUSTOM ACTIVITIES PANEL');
	});

	it('should inject the CUSTOM PANEL with PARTICIPANTS PANEL only and without children', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovPanel-checkbox');

		await utils.clickOn('#ovParticipantsPanel-checkbox');

		await utils.clickOn('#apply-btn');

		// Check if toolbar panel buttons are present
		await utils.checkToolbarIsPresent();

		// Click on button for opening participants panel
		await utils.clickOn('#participants-panel-btn');

		// Check if custom panel is present
		await utils.waitForElement('#custom-panels');
		expect(await utils.isPresent('#custom-panels')).to.be.true;

		// Check if default panel is not present
		expect(await utils.isPresent('#default-panel')).to.be.false;

		// Check if default participant panel is not present
		expect(await utils.isPresent('#default-participant-panel')).to.be.false;

		await utils.waitForElement('#custom-participants-panel');
		expect(await utils.isPresent('#custom-participants-panel')).to.be.true;

		// Click on button for opening chat panel
		await utils.clickOn('#chat-panel-btn');

		// Check if default chat panel is not present
		expect(await utils.isPresent('#default-chat-panel')).to.be.false;

		// Check if custom chat panel is not present
		expect(await utils.isPresent('#custom-chat-panel')).to.be.false;
	});

	it('should inject the CUSTOM PANEL with PARTICIPANTS PANEL and P ITEM only', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovPanel-checkbox');

		await utils.clickOn('#ovParticipantsPanel-checkbox');

		await utils.clickOn('#ovParticipantPanelItem-checkbox');

		await utils.clickOn('#apply-btn');

		// Check if toolbar panel buttons are present
		await utils.checkToolbarIsPresent();

		// Click on button for opening participants panel
		await utils.clickOn('#participants-panel-btn');

		// Check if custom panel is present
		await utils.waitForElement('#custom-panels');
		expect(await utils.isPresent('#custom-panels')).to.be.true;

		// Check if default panel is not present
		expect(await utils.isPresent('#default-panel')).to.be.false;

		// Check if default participant panel is not present
		expect(await utils.isPresent('#default-participant-panel')).to.be.false;

		// Check if custom participant panel is present
		await utils.waitForElement('#custom-participants-panel');
		expect(await utils.isPresent('#custom-participants-panel')).to.be.true;

		// Check if custom participant panel item is present
		await utils.waitForElement('#custom-participants-panel-item');
		expect(await utils.isPresent('#custom-participants-panel-item')).to.be.true;

		// Check if default participant panel item is not present
		expect(await utils.isPresent('#default-participant-panel-item')).to.be.false;
	});

	it('should inject the CUSTOM PANEL with PARTICIPANTS PANEL and P ITEM and P ITEM ELEMENT', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovPanel-checkbox');

		await utils.clickOn('#ovParticipantsPanel-checkbox');

		await utils.clickOn('#ovParticipantPanelItem-checkbox');

		await utils.clickOn('#ovParticipantPanelItemElements-checkbox');

		await utils.clickOn('#apply-btn');

		// Check if toolbar panel buttons are present
		await utils.checkToolbarIsPresent();

		// Click on button for opening participants panel
		await utils.clickOn('#participants-panel-btn');

		// Check if custom panel is present
		await utils.waitForElement('#custom-panels');
		expect(await utils.isPresent('#custom-panels')).to.be.true;

		// Check if custom participant panel is present
		await utils.waitForElement('#custom-participants-panel');
		expect(await utils.isPresent('#custom-participants-panel')).to.be.true;

		// Check if custom participant panel item is present
		await utils.waitForElement('#custom-participants-panel-item');
		expect(await utils.isPresent('#custom-participants-panel-item')).to.be.true;

		// Check if custom participant panel item element is present
		await utils.waitForElement('#custom-participants-panel-item-element');
		expect(await utils.isPresent('#custom-participants-panel-item-element')).to.be.true;

		// Check if default panel is not present
		expect(await utils.isPresent('#default-panel')).to.be.false;

		// Check if default participant panel is not present
		expect(await utils.isPresent('#default-participant-panel')).to.be.false;

		// Check if default participant panel item is not present
		expect(await utils.isPresent('#default-participant-panel-item')).to.be.false;
	});

	it('should inject an ACTIVITIES PANEL only', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovActivitiesPanel-checkbox');

		await utils.clickOn('#apply-btn');

		// Check if toolbar panel buttons are present
		await utils.checkToolbarIsPresent();

		// Click on button for opening additional panel
		await utils.clickOn('#activities-panel-btn');

		// Check if default panel is not present
		expect(await utils.isPresent('#default-activities-panel')).to.be.false;

		// Check if custom panel is present
		await utils.waitForElement('#custom-activities-panel');
		expect(await utils.isPresent('#custom-activities-panel')).to.be.true;

		// Check if activities panel is has content
		await utils.waitForElement('#activities-container');
		expect(await utils.isPresent('#activities-container')).to.be.true;
	});

	it('should inject an ADDITIONAL PANEL only', async () => {
		let element;
		await browser.get(`${url}`);

		await utils.clickOn('#ovAdditionalPanels-checkbox');

		await utils.clickOn('#apply-btn');

		// Check if toolbar panel buttons are present
		await utils.checkToolbarIsPresent();

		// Click on button for opening additional panel
		await utils.clickOn('#toolbar-additional-panel-btn');

		// Check if custom panel is present
		await utils.waitForElement('#custom-additional-panel');
		expect(await utils.isPresent('#custom-additional-panel')).to.be.true;

		element = await utils.waitForElement('#additional-panel-title');
		expect(await element.getAttribute('innerText')).equals('NEW PANEL');

		await utils.clickOn('#toolbar-additional-panel-btn');

		expect(await utils.isPresent('#custom-additional-panel')).to.be.false;
	});

	it('should inject the CHAT PANEL only', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovChatPanel-checkbox');

		await utils.clickOn('#apply-btn');

		// Check if toolbar panel buttons are present
		await utils.checkToolbarIsPresent();

		// Click on button for opening participants panel
		await utils.clickOn('#participants-panel-btn');

		// Check if custom panel is present
		expect(await utils.isPresent('#custom-panels')).to.be.false;

		// Check if default panel is not present
		await utils.waitForElement('#default-panel');
		expect(await utils.isPresent('#default-panel')).to.be.true;

		// Check if default participant panel is not present
		await utils.waitForElement('#default-participants-panel');
		expect(await utils.isPresent('#default-participants-panel')).to.be.true;

		// Check if custom participant panel is not present
		expect(await utils.isPresent('#custom-participants-panel')).to.be.false;

		// Click on button for opening chat panel
		await utils.clickOn('#chat-panel-btn');

		// Check if default chat panel is not present
		expect(await utils.isPresent('#default-chat-panel')).to.be.false;

		// Check if custom chat panel is present
		await utils.waitForElement('#custom-chat-panel');
		expect(await utils.isPresent('#custom-chat-panel')).to.be.true;
	});

	it('should inject the PARTICIPANTS PANEL only', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovParticipantsPanel-checkbox');

		await utils.clickOn('#apply-btn');

		// Check if toolbar panel buttons are present
		await utils.checkToolbarIsPresent();

		// Click on button for opening participants panel
		await utils.clickOn('#participants-panel-btn');

		// Check if custom panel is present
		expect(await utils.isPresent('#custom-panels')).to.be.false;

		// Check if default panel is not present
		await utils.waitForElement('#default-panel');
		expect(await utils.isPresent('#default-panel')).to.be.true;

		// Check if default participant panel is not present
		expect(await utils.isPresent('#default-participant-panel')).to.be.false;

		// Check if custom participant panel is present
		await utils.waitForElement('#custom-participants-panel');
		expect(await utils.isPresent('#custom-participants-panel')).to.be.true;

		// Click on button for opening chat panel
		await utils.clickOn('#chat-panel-btn');

		// Check if default chat panel is present
		await utils.waitForElement('#default-chat-panel');
		expect(await utils.isPresent('#default-chat-panel')).to.be.true;

		// Check if custom chat panel is not present
		expect(await utils.isPresent('#custom-chat-panel')).to.be.false;
	});

	it('should inject the PARTICIPANTS PANEL ITEM only', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovParticipantPanelItem-checkbox');

		await utils.clickOn('#apply-btn');

		// Check if toolbar panel buttons are present
		await utils.checkToolbarIsPresent();

		// Click on button for opening participants panel
		await utils.clickOn('#participants-panel-btn');

		// Check if custom panel is present
		expect(await utils.isPresent('#custom-panels')).to.be.false;

		// Check if default panel is not present
		await utils.waitForElement('#default-panel');
		expect(await utils.isPresent('#default-panel')).to.be.true;

		// Check if default participant panel is not present
		await utils.waitForElement('#default-participants-panel');
		expect(await utils.isPresent('#default-participants-panel')).to.be.true;

		// Check if custom participant panel is not present
		expect(await utils.isPresent('#custom-participants-panel')).to.be.false;

		await utils.waitForElement('#custom-participants-panel-item');
		expect(await utils.isPresent('#custom-participants-panel-item')).to.be.true;

		// Click on button for opening chat panel
		await utils.clickOn('#chat-panel-btn');

		// Check if default chat panel is present
		await utils.waitForElement('#default-chat-panel');
		expect(await utils.isPresent('#default-chat-panel')).to.be.true;

		// Check if custom chat panel is not present
		expect(await utils.isPresent('#custom-chat-panel')).to.be.false;
	});

	it('should inject the PARTICIPANTS PANEL ITEM ELEMENT only', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovParticipantPanelItemElements-checkbox');

		await utils.clickOn('#apply-btn');

		// Check if toolbar panel buttons are present
		await utils.checkToolbarIsPresent();

		// Click on button for opening participants panel
		await utils.clickOn('#participants-panel-btn');

		// Check if default participant panel is not present
		await utils.waitForElement('#default-participants-panel');
		expect(await utils.isPresent('#default-participants-panel')).to.be.true;

		// Check if custom participant panel is not present
		expect(await utils.isPresent('#custom-participants-panel')).to.be.false;

		expect(await utils.isPresent('#custom-participants-panel-item')).to.be.false;

		expect(await utils.isPresent('#custom-participants-panel-item')).to.be.false;

		await utils.waitForElement('#custom-participants-panel-item-element');
		expect(await utils.isPresent('#custom-participants-panel-item-element')).to.be.true;

		// Click on button for opening chat panel
		await utils.clickOn('#chat-panel-btn');

		// Check if default chat panel is present
		await utils.waitForElement('#default-chat-panel');
		expect(await utils.isPresent('#default-chat-panel')).to.be.true;

		// Check if custom chat panel is not present;
		expect(await utils.isPresent('#custom-chat-panel')).to.be.false;
	});

	it('should inject the CUSTOM PANEL with CHAT and PARTICIPANTS PANELS', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovPanel-checkbox');
		await utils.clickOn('#ovChatPanel-checkbox');
		await utils.clickOn('#ovParticipantsPanel-checkbox');

		await utils.clickOn('#apply-btn');

		// Check if toolbar panel buttons are present
		await utils.checkToolbarIsPresent();

		// Click on button for opening participants panel
		await utils.clickOn('#participants-panel-btn');

		// Check if custom panel is present
		await utils.waitForElement('#custom-panels');
		expect(await utils.isPresent('#custom-panels')).to.be.true;

		// Check if default panel is not present
		expect(await utils.isPresent('#default-panel')).to.be.false;

		// Check if default participant panel is not present
		expect(await utils.isPresent('#default-participant-panel')).to.be.false;

		// Check if custom participant panel is present
		await utils.waitForElement('#custom-participants-panel');
		expect(await utils.isPresent('#custom-participants-panel')).to.be.true;

		// Click on button for opening chat panel
		await utils.clickOn('#chat-panel-btn');

		// Check if default chat panel is not present
		expect(await utils.isPresent('#default-chat-panel')).to.be.false;

		// Check if custom chat panel is present
		await utils.waitForElement('#custom-chat-panel');
		expect(await utils.isPresent('#custom-chat-panel')).to.be.true;
	});
});

describe('Testing LAYOUT STRUCTURAL DIRECTIVES', () => {
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

	it('should inject the custom LAYOUT WITHOUT STREAM', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovLayout-checkbox');

		await utils.clickOn('#apply-btn');

		// Check if custom layout is present
		await utils.waitForElement('#custom-layout');
		expect(await utils.isPresent('#custom-layout')).to.be.true;

		// Check if default layout is not present
		expect(await utils.isPresent('#default-layout')).to.be.false;

		// Check if custom stream is not present
		expect(await utils.isPresent('#custom-stream')).to.be.false;

		// Check if video is not present
		expect(await utils.isPresent('video')).to.be.false;
	});

	it('should inject the custom LAYOUT WITH STREAM', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovLayout-checkbox');

		await utils.clickOn('#ovStream-checkbox');

		await utils.clickOn('#apply-btn');

		// Check if custom layout is present
		await utils.waitForElement('#custom-layout');
		expect(await utils.isPresent('#custom-layout')).to.be.true;

		// Check if default layout is not present
		expect(await utils.isPresent('default-layout')).to.be.false;

		// Check if custom stream is present
		await utils.waitForElement('#custom-stream');
		expect(await utils.isPresent('#custom-stream')).to.be.true;

		// Check if default stream is not present
		expect(await utils.isPresent('default-stream')).to.be.false;

		// Check if video is present
		await utils.waitForElement('video');
		expect(await utils.isPresent('video')).to.be.true;
	});

	it('should inject the CUSTOM STREAM only', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovStream-checkbox');

		await utils.clickOn('#apply-btn');

		// Check if default layout is not present
		await utils.waitForElement('#default-layout');
		expect(await utils.isPresent('#default-layout')).to.be.true;

		// Check if custom stream is present
		await utils.waitForElement('#custom-stream');
		expect(await utils.isPresent('#custom-stream')).to.be.true;

		// Check if custom layout is not present
		expect(await utils.isPresent('#custom-layout')).to.be.false;

		// Check if default stream is not present
		expect(await utils.isPresent('default-stream')).to.be.false;

		// Check if video is present
		await utils.waitForElement('video');
		expect(await utils.isPresent('video')).to.be.true;
	});
});

describe('Testing ATTRIBUTE DIRECTIVES', () => {
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
		// console.log('data:image/png;base64,' + await browser.takeScreenshot());
		await browser.quit();
	});

	it('should HIDE the CHAT PANEL BUTTON', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovToolbar-checkbox');

		await utils.clickOn('#chatPanelButton-checkbox');

		await utils.clickOn('#apply-btn');

		await utils.checkToolbarIsPresent();

		// Check if chat button does not exist
		expect(await utils.isPresent('chat-panel-btn')).to.be.false;
	});

	it('should HIDE the PARTICIPANTS PANEL BUTTON', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovToolbar-checkbox');

		await utils.clickOn('#participantsPanelButton-checkbox');

		await utils.clickOn('#apply-btn');

		await utils.checkToolbarIsPresent();

		// Check if participants button does not exist
		expect(await utils.isPresent('participants-panel-btn')).to.be.false;
	});

	it('should HIDE the ACTIVITIES PANEL BUTTON', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovToolbar-checkbox');

		await utils.clickOn('#activitiesPanelButton-checkbox');

		await utils.clickOn('#apply-btn');

		await utils.checkToolbarIsPresent();

		// Check if participants button does not exist
		expect(await utils.isPresent('activities-panel-btn')).to.be.false;
	});

	it('should HIDE the DISPLAY LOGO', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovToolbar-checkbox');

		await utils.clickOn('#displayLogo-checkbox');

		await utils.clickOn('#apply-btn');

		await utils.checkToolbarIsPresent();

		expect(await utils.isPresent('branding-logo')).to.be.false;
	});

	it('should HIDE the DISPLAY ROOM name', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovToolbar-checkbox');

		await utils.clickOn('#displayRoomName-checkbox');

		await utils.clickOn('#apply-btn');

		await utils.checkToolbarIsPresent();

		expect(await utils.isPresent('session-name')).to.be.false;
	});

	it('should HIDE the FULLSCREEN button', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovToolbar-checkbox');

		await utils.clickOn('#fullscreenButton-checkbox');

		await utils.clickOn('#apply-btn');

		await utils.checkToolbarIsPresent();

		// Open more options menu
		await utils.clickOn('#more-options-btn');

		await browser.sleep(500);

		await utils.waitForElement('#more-options-menu');

		// Checking if fullscreen button is not present
		expect(await utils.isPresent('#fullscreen-btn')).to.be.false;
	});

	it('should HIDE the STREAMING button', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovToolbar-checkbox');

		await utils.clickOn('#broadcastingButton-checkbox');

		await utils.clickOn('#apply-btn');

		await utils.checkToolbarIsPresent();

		// Open more options menu
		await utils.clickOn('#more-options-btn');
		await browser.sleep(500);

		await utils.waitForElement('#more-options-menu');

		// Checking if fullscreen button is not present
		expect(await utils.isPresent('#broadcasting-btn')).to.be.false;
	});

	it('should HIDE the LEAVE button', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovToolbar-checkbox');

		await utils.clickOn('#leaveButton-checkbox');

		await utils.clickOn('#apply-btn');

		await utils.checkToolbarIsPresent();

		expect(await utils.isPresent('leave-btn')).to.be.false;
	});

	it('should HIDE the SCREENSHARE button', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovToolbar-checkbox');

		await utils.clickOn('#screenshareButton-checkbox');

		await utils.clickOn('#apply-btn');

		await utils.checkToolbarIsPresent();

		expect(await utils.isPresent('screenshare-btn')).to.be.false;
	});

	it('should HIDE the AUDIO detector', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovStream-checkbox');

		await utils.clickOn('#displayAudioDetection-checkbox');

		await utils.clickOn('#apply-btn');

		await utils.waitForElement('#session-container');
		await utils.waitForElement('#custom-stream');

		expect(await utils.isPresent('audio-wave-container')).to.be.false;
	});

	it('should HIDE the PARTICIPANT NAME', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovStream-checkbox');

		await utils.clickOn('#displayParticipantName-checkbox');

		await utils.clickOn('#apply-btn');

		await utils.waitForElement('#session-container');
		await utils.waitForElement('#custom-stream');

		expect(await utils.isPresent('participant-name-container')).to.be.false;
	});

	it('should HIDE the SETTINGS button', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovStream-checkbox');

		await utils.clickOn('#settingsButton-checkbox');

		await utils.clickOn('#apply-btn');

		await utils.waitForElement('#custom-stream');

		expect(await utils.isPresent('settings-container')).to.be.false;
	});

	it('should HIDE the participant MUTE button', async () => {
		const fixedSession = `${url}?sessionId=fixedNameTesting`;
		await browser.get(`${fixedSession}`);

		await utils.clickOn('#ovParticipantPanelItem-checkbox');

		await utils.clickOn('#muteButton-checkbox');

		await utils.clickOn('#apply-btn');

		await utils.checkSessionIsPresent();
		await utils.checkToolbarIsPresent();

		await utils.clickOn('#participants-panel-btn');

		await utils.waitForElement('#participants-container');

		// Starting new browser for adding a new participant
		const newTabScript = `window.open("${fixedSession}")`;
		await browser.executeScript(newTabScript);

		// Get tabs opened
		const tabs = await browser.getAllWindowHandles();
		// Focus on the last tab
		browser.switchTo().window(tabs[1]);

		await utils.clickOn('#apply-btn');

		// Switch to first tab
		await browser.switchTo().window(tabs[0]);

		await utils.waitForElement('#remote-participant-item');

		expect(await utils.isPresent('mute-btn')).to.be.false;
	});

	it('should HIDE the RECORDING activity', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovActivitiesPanel-checkbox');

		await utils.clickOn('#recordingActivity-checkbox');

		await utils.clickOn('#apply-btn');

		await utils.checkToolbarIsPresent();

		await utils.clickOn('#activities-panel-btn');

		await browser.sleep(500);

		await utils.waitForElement('#custom-activities-panel');

		expect(await utils.isPresent('ov-recording-activity')).to.be.false;
	});

	it('should HIDE the STREAMING activity', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovActivitiesPanel-checkbox');

		await utils.clickOn('#broadcastingActivity-checkbox');

		await utils.clickOn('#apply-btn');

		await utils.checkToolbarIsPresent();

		await utils.clickOn('#activities-panel-btn');

		await browser.sleep(500);

		await utils.waitForElement('#custom-activities-panel');

		await utils.waitForElement('ov-recording-activity');

		expect(await utils.isPresent('ov-broadcasting-activity')).to.be.false;
	});

	it('should SHOW STREAMING ERROR', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovActivitiesPanel-checkbox');

		await utils.clickOn('#broadcastingError-checkbox');

		await utils.clickOn('#apply-btn');

		await utils.checkToolbarIsPresent();

		await utils.clickOn('#activities-panel-btn');

		await browser.sleep(500);

		await utils.waitForElement('#custom-activities-panel');

		const status = await utils.waitForElement('#broadcasting-status');

		expect(await status.getAttribute('innerText')).equals('FAILED');

		await utils.clickOn('#broadcasting-activity');
		await browser.sleep(500);
		const error = await utils.waitForElement('#broadcasting-error');
		expect(await error.getAttribute('innerText')).equals('TEST_ERROR');
	});
});

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
