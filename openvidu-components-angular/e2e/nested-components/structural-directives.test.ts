import { Builder, By, WebDriver } from 'selenium-webdriver';

import { NestedConfig } from '../selenium.conf';
import { OpenViduComponentsPO } from '../utils.po.test';

const url = NestedConfig.appUrl;

describe('E2E: Toolbar structural directive scenarios', () => {
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
		// console.log('data:image/png;base64,' + await browser.takeScreenshot());
		try {
			await utils.leaveRoom();
		} catch (error) {}
		await browser.quit();
	});

	it('should render only the custom toolbar (no additional buttons, no default toolbar)', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovToolbar-checkbox');

		await utils.clickOn('#apply-btn');

		// Check if custom toolbar is present in DOM
		await utils.waitForElement('#custom-toolbar');
		expect(await utils.isPresent('#custom-toolbar')).toBeTrue();

		// Check if additional buttons element has not been rendered
		expect(await utils.isPresent('#custom-toolbar-additional-buttons')).toBeFalse();

		// Check if default toolbar is not present
		expect(await utils.isPresent('#default-toolbar')).toBeFalse();
	});

	it('should render the custom toolbar with additional custom buttons and hide the default toolbar', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovToolbar-checkbox');

		await utils.clickOn('#ovToolbarAdditionalButtons-checkbox');

		await utils.clickOn('#apply-btn');

		// Check if custom toolbar is present in DOM
		await utils.waitForElement('#custom-toolbar');
		expect(await utils.isPresent('#custom-toolbar')).toBeTrue();

		// Check if additional buttons element has been rendered;
		await utils.waitForElement('#custom-toolbar-additional-buttons');
		expect(await utils.isPresent('#custom-toolbar-additional-buttons')).toBeTrue();

		const element = await browser.findElements(By.id('toolbar-additional-btn'));
		expect(element.length).toEqual(2);

		// Check if default toolbar is not present
		expect(await utils.isPresent('#default-toolbar')).toBeFalse();
	});

	it('should render the custom toolbar with additional custom panel buttons and hide the default toolbar', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovToolbar-checkbox');

		await utils.clickOn('#ovToolbarAdditionalPanelButtons-checkbox');

		await utils.clickOn('#apply-btn');

		// Check if custom toolbar is present in DOM
		await utils.waitForElement('#custom-toolbar');
		expect(await utils.isPresent('#custom-toolbar')).toBeTrue();

		// Check if additional buttons element has been rendered;
		await utils.waitForElement('#custom-toolbar-additional-panel-buttons');
		expect(await utils.isPresent('#custom-toolbar-additional-panel-buttons')).toBeTrue();

		const element = await browser.findElements(By.id('toolbar-additional-panel-btn'));
		expect(element.length).toEqual(1);

		// Check if default toolbar is not present
		expect(await utils.isPresent('#default-toolbar')).toBeFalse();
	});

	it('should render only additional toolbar buttons (default toolbar visible, no custom toolbar)', async () => {
		let element;
		await browser.get(`${url}`);

		await utils.clickOn('#ovToolbarAdditionalButtons-checkbox');

		await utils.clickOn('#apply-btn');

		// Check if default toolbar is present
		await utils.waitForElement('#default-toolbar');
		expect(await utils.isPresent('#default-toolbar')).toBeTrue();

		// Check if additional buttons are present
		await utils.waitForElement('#custom-toolbar-additional-buttons');
		expect(await utils.isPresent('#custom-toolbar-additional-buttons')).toBeTrue();

		element = await browser.findElements(By.id('toolbar-additional-btn'));
		expect(element.length).toEqual(3);

		// Check if custom toolbar not is present
		expect(await utils.isPresent('#custom-toolbar')).toBeFalse();
	});

	it('should render only additional toolbar panel buttons (default toolbar visible, no custom toolbar)', async () => {
		let element;
		await browser.get(`${url}`);

		await utils.clickOn('#ovToolbarAdditionalPanelButtons-checkbox');

		await utils.clickOn('#apply-btn');

		// Check if default toolbar is present
		await utils.waitForElement('#default-toolbar');
		expect(await utils.isPresent('#default-toolbar')).toBeTrue();

		// Check if additional buttons are present
		await utils.waitForElement('#custom-toolbar-additional-panel-buttons');
		expect(await utils.isPresent('#custom-toolbar-additional-panel-buttons')).toBeTrue();

		element = await browser.findElements(By.id('toolbar-additional-panel-btn'));
		expect(element.length).toEqual(1);

		// Check if custom toolbar not is present
		expect(await utils.isPresent('#custom-toolbar')).toBeFalse();
	});
});

describe('E2E: Panel structural directive scenarios', () => {
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
		try {
			await utils.leaveRoom();
		} catch (error) {}
		await browser.quit();
	});

	it('should render an additional custom panel with default panels', async () => {
		let element;
		await browser.get(`${url}`);

		await utils.clickOn('#ovAdditionalPanels-checkbox');

		await utils.clickOn('#apply-btn');

		// Check if toolbar panel buttons are present
		await utils.checkToolbarIsPresent();

		// Open additional panel
		await utils.clickOn('#toolbar-additional-panel-btn');
		await browser.sleep(500);

		// Check if custom panel is present
		expect(await utils.isPresent('#custom-additional-panel')).toBeTrue();
		element = await utils.waitForElement('#additional-panel-title');
		expect(await element.getAttribute('innerText')).toEqual('NEW PANEL');

		// Open the participants panel
		await utils.clickOn('#participants-panel-btn');
		await browser.sleep(500);

		// Check if default panel is present
		expect(await utils.isPresent('#default-participants-panel')).toBeTrue();

		// Open additional panel again
		await utils.clickOn('#toolbar-additional-panel-btn');
		expect(await utils.isPresent('#custom-additional-panel')).toBeTrue();

		// Close the additional panel
		await utils.clickOn('#toolbar-additional-panel-btn');
		expect(await utils.isPresent('#custom-additional-panel')).toBeFalse();
	});

	it('should render only the custom panel container (no children, no default panels)', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovPanel-checkbox');

		await utils.clickOn('#apply-btn');

		// Check if toolbar panel buttons are present
		await utils.checkToolbarIsPresent();

		// Click on button for opening panel
		await utils.clickOn('#participants-panel-btn');

		// Check if custom panel is present
		await utils.waitForElement('#custom-panels');
		expect(await utils.isPresent('#custom-panels')).toBeTrue();

		// Check if default panel is not present
		expect(await utils.isPresent('#default-panel')).toBeFalse();

		// Check if default participant panel is not present
		expect(await utils.isPresent('#default-participant-panel')).toBeFalse();

		// Check if custom participant panel is not present
		expect(await utils.isPresent('#custom-participants-panel')).toBeFalse();

		// Click on button for opening panel
		await utils.clickOn('#chat-panel-btn');

		// Check if default chat panel is not present
		expect(await utils.isPresent('#default-chat-panel')).toBeFalse();

		// Check if custom chat panel is not present
		expect(await utils.isPresent('#custom-chat-panel')).toBeFalse();
	});

	it('should render the custom panel container with an additional panel only', async () => {
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
		expect(element.length).toEqual(1);

		element = await utils.waitForElement('#additional-panel-title');
		expect(await utils.isPresent('#additional-panel-title')).toBeTrue();
		expect(await element.getAttribute('innerText')).toEqual('NEW PANEL');

		await utils.clickOn('#toolbar-additional-panel-btn');

		expect(await utils.isPresent('#custom-additional-panel')).toBeFalse();
	});

	it('should render the custom panel container with a custom chat panel only', async () => {
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
		expect(await utils.isPresent('#custom-panels')).toBeTrue();

		// Check if default panel is not present
		expect(await utils.isPresent('#default-panel')).toBeFalse();

		// Check if default participant panel is not present
		expect(await utils.isPresent('#default-participant-panel')).toBeFalse();

		// Check if custom participant panel is not present
		expect(await utils.isPresent('#custom-participants-panel')).toBeFalse();

		// Click on button for opening chat panel
		await utils.clickOn('#chat-panel-btn');

		// Check if default chat panel is not present
		expect(await utils.isPresent('#default-chat-panel')).toBeFalse();

		// Check if custom chat panel is not present
		await utils.waitForElement('#custom-chat-panel');
		expect(await utils.isPresent('#custom-chat-panel')).toBeTrue();
	});

	it('should render the custom panel container with a custom activities panel only', async () => {
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
		expect(await utils.isPresent('#default-activities-panel')).toBeFalse();

		// Check if custom chat panel is not present
		element = await utils.waitForElement('#custom-activities-panel');
		expect(await utils.isPresent('#custom-activities-panel')).toBeTrue();

		element = await utils.waitForElement('#activities-panel-title');
		expect(await element.getAttribute('innerText')).toEqual('CUSTOM ACTIVITIES PANEL');
	});

	it('should render the custom panel container with a custom participants panel only (no children)', async () => {
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
		expect(await utils.isPresent('#custom-panels')).toBeTrue();

		// Check if default panel is not present
		expect(await utils.isPresent('#default-panel')).toBeFalse();

		// Check if default participant panel is not present
		expect(await utils.isPresent('#default-participant-panel')).toBeFalse();

		await utils.waitForElement('#custom-participants-panel');
		expect(await utils.isPresent('#custom-participants-panel')).toBeTrue();

		// Click on button for opening chat panel
		await utils.clickOn('#chat-panel-btn');

		// Check if default chat panel is not present
		expect(await utils.isPresent('#default-chat-panel')).toBeFalse();

		// Check if custom chat panel is not present
		expect(await utils.isPresent('#custom-chat-panel')).toBeFalse();
	});

	it('should render the custom panel container with a custom participants panel and a custom participant item', async () => {
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
		expect(await utils.isPresent('#custom-panels')).toBeTrue();

		// Check if default panel is not present
		expect(await utils.isPresent('#default-panel')).toBeFalse();

		// Check if default participant panel is not present
		expect(await utils.isPresent('#default-participant-panel')).toBeFalse();

		// Check if custom participant panel is present
		await utils.waitForElement('#custom-participants-panel');
		expect(await utils.isPresent('#custom-participants-panel')).toBeTrue();

		// Check if custom participant panel item is present
		await utils.waitForElement('#custom-participants-panel-item');
		expect(await utils.isPresent('#custom-participants-panel-item')).toBeTrue();

		// Check if default participant panel item is not present
		expect(await utils.isPresent('#default-participant-panel-item')).toBeFalse();
	});

	it('should render the custom panel container with a custom participants panel, custom participant item, and custom item element', async () => {
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
		expect(await utils.isPresent('#custom-panels')).toBeTrue();

		// Check if custom participant panel is present
		await utils.waitForElement('#custom-participants-panel');
		expect(await utils.isPresent('#custom-participants-panel')).toBeTrue();

		// Check if custom participant panel item is present
		await utils.waitForElement('#custom-participants-panel-item');
		expect(await utils.isPresent('#custom-participants-panel-item')).toBeTrue();

		// Check if custom participant panel item element is present
		await utils.waitForElement('#custom-participants-panel-item-element');
		expect(await utils.isPresent('#custom-participants-panel-item-element')).toBeTrue();

		// Check if default panel is not present
		expect(await utils.isPresent('#default-panel')).toBeFalse();

		// Check if default participant panel is not present
		expect(await utils.isPresent('#default-participant-panel')).toBeFalse();

		// Check if default participant panel item is not present
		expect(await utils.isPresent('#default-participant-panel-item')).toBeFalse();
	});

	it('should render only a custom activities panel (no default panel)', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovActivitiesPanel-checkbox');

		await utils.clickOn('#apply-btn');

		// Check if toolbar panel buttons are present
		await utils.checkToolbarIsPresent();

		// Click on button for opening additional panel
		await utils.clickOn('#activities-panel-btn');

		// Check if default panel is not present
		expect(await utils.isPresent('#default-activities-panel')).toBeFalse();

		// Check if custom panel is present
		await utils.waitForElement('#custom-activities-panel');
		expect(await utils.isPresent('#custom-activities-panel')).toBeTrue();

		// Check if activities panel is has content
		await utils.waitForElement('#activities-container');
		expect(await utils.isPresent('#activities-container')).toBeTrue();
	});

	it('should render only a custom additional panel (no default panel)', async () => {
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
		expect(await utils.isPresent('#custom-additional-panel')).toBeTrue();

		element = await utils.waitForElement('#additional-panel-title');
		expect(await element.getAttribute('innerText')).toEqual('NEW PANEL');

		await utils.clickOn('#toolbar-additional-panel-btn');

		expect(await utils.isPresent('#custom-additional-panel')).toBeFalse();
	});

	it('should render only a custom chat panel (no custom panel container)', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovChatPanel-checkbox');

		await utils.clickOn('#apply-btn');

		// Check if toolbar panel buttons are present
		await utils.checkToolbarIsPresent();

		// Click on button for opening participants panel
		await utils.clickOn('#participants-panel-btn');

		// Check if custom panel is present
		expect(await utils.isPresent('#custom-panels')).toBeFalse();

		// Check if default panel is not present
		await utils.waitForElement('#default-panel');
		expect(await utils.isPresent('#default-panel')).toBeTrue();

		// Check if default participant panel is not present
		await utils.waitForElement('#default-participants-panel');
		expect(await utils.isPresent('#default-participants-panel')).toBeTrue();

		// Check if custom participant panel is not present
		expect(await utils.isPresent('#custom-participants-panel')).toBeFalse();

		// Click on button for opening chat panel
		await utils.clickOn('#chat-panel-btn');

		// Check if default chat panel is not present
		expect(await utils.isPresent('#default-chat-panel')).toBeFalse();

		// Check if custom chat panel is present
		await utils.waitForElement('#custom-chat-panel');
		expect(await utils.isPresent('#custom-chat-panel')).toBeTrue();
	});

	it('should render only a custom participants panel (no custom panel container)', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovParticipantsPanel-checkbox');

		await utils.clickOn('#apply-btn');

		// Check if toolbar panel buttons are present
		await utils.checkToolbarIsPresent();

		// Click on button for opening participants panel
		await utils.clickOn('#participants-panel-btn');

		// Check if custom panel is present
		expect(await utils.isPresent('#custom-panels')).toBeFalse();

		// Check if default panel is not present
		await utils.waitForElement('#default-panel');
		expect(await utils.isPresent('#default-panel')).toBeTrue();

		// Check if default participant panel is not present
		expect(await utils.isPresent('#default-participant-panel')).toBeFalse();

		// Check if custom participant panel is present
		await utils.waitForElement('#custom-participants-panel');
		expect(await utils.isPresent('#custom-participants-panel')).toBeTrue();

		// Click on button for opening chat panel
		await utils.clickOn('#chat-panel-btn');

		// Check if default chat panel is present
		await utils.waitForElement('#default-chat-panel');
		expect(await utils.isPresent('#default-chat-panel')).toBeTrue();

		// Check if custom chat panel is not present
		expect(await utils.isPresent('#custom-chat-panel')).toBeFalse();
	});

	it('should render only a custom participant panel item (no custom panel container)', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovParticipantPanelItem-checkbox');

		await utils.clickOn('#apply-btn');

		// Check if toolbar panel buttons are present
		await utils.checkToolbarIsPresent();

		// Click on button for opening participants panel
		await utils.clickOn('#participants-panel-btn');

		// Check if custom panel is present
		expect(await utils.isPresent('#custom-panels')).toBeFalse();

		// Check if default panel is not present
		await utils.waitForElement('#default-panel');
		expect(await utils.isPresent('#default-panel')).toBeTrue();

		// Check if default participant panel is not present
		await utils.waitForElement('#default-participants-panel');
		expect(await utils.isPresent('#default-participants-panel')).toBeTrue();

		// Check if custom participant panel is not present
		expect(await utils.isPresent('#custom-participants-panel')).toBeFalse();

		await utils.waitForElement('#custom-participants-panel-item');
		expect(await utils.isPresent('#custom-participants-panel-item')).toBeTrue();

		// Click on button for opening chat panel
		await utils.clickOn('#chat-panel-btn');

		// Check if default chat panel is present
		await utils.waitForElement('#default-chat-panel');
		expect(await utils.isPresent('#default-chat-panel')).toBeTrue();

		// Check if custom chat panel is not present
		expect(await utils.isPresent('#custom-chat-panel')).toBeFalse();
	});

	it('should render only a custom participant panel item element (no custom panel container)', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovParticipantPanelItemElements-checkbox');

		await utils.clickOn('#apply-btn');

		// Check if toolbar panel buttons are present
		await utils.checkToolbarIsPresent();

		// Click on button for opening participants panel
		await utils.clickOn('#participants-panel-btn');

		// Check if default participant panel is not present
		await utils.waitForElement('#default-participants-panel');
		expect(await utils.isPresent('#default-participants-panel')).toBeTrue();

		// Check if custom participant panel is not present
		expect(await utils.isPresent('#custom-participants-panel')).toBeFalse();

		expect(await utils.isPresent('#custom-participants-panel-item')).toBeFalse();

		expect(await utils.isPresent('#custom-participants-panel-item')).toBeFalse();

		await utils.waitForElement('#custom-participants-panel-item-element');
		expect(await utils.isPresent('#custom-participants-panel-item-element')).toBeTrue();

		// Click on button for opening chat panel
		await utils.clickOn('#chat-panel-btn');

		// Check if default chat panel is present
		await utils.waitForElement('#default-chat-panel');
		expect(await utils.isPresent('#default-chat-panel')).toBeTrue();

		// Check if custom chat panel is not present;
		expect(await utils.isPresent('#custom-chat-panel')).toBeFalse();
	});

	it('should render the custom panel container with both custom chat and participants panels', async () => {
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
		expect(await utils.isPresent('#custom-panels')).toBeTrue();

		// Check if default panel is not present
		expect(await utils.isPresent('#default-panel')).toBeFalse();

		// Check if default participant panel is not present
		expect(await utils.isPresent('#default-participant-panel')).toBeFalse();

		// Check if custom participant panel is present
		await utils.waitForElement('#custom-participants-panel');
		expect(await utils.isPresent('#custom-participants-panel')).toBeTrue();

		// Click on button for opening chat panel
		await utils.clickOn('#chat-panel-btn');

		// Check if default chat panel is not present
		expect(await utils.isPresent('#default-chat-panel')).toBeFalse();

		// Check if custom chat panel is present
		await utils.waitForElement('#custom-chat-panel');
		expect(await utils.isPresent('#custom-chat-panel')).toBeTrue();
	});
});

describe('E2E: Layout and stream structural directive scenarios', () => {
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
		try {
			await utils.leaveRoom();
		} catch (error) {}
		await browser.quit();
	});

	it('should render only the custom layout (no stream, no default layout)', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovLayout-checkbox');

		await utils.clickOn('#apply-btn');

		// Check if custom layout is present
		await utils.waitForElement('#custom-layout');
		expect(await utils.isPresent('#custom-layout')).toBeTrue();

		// Check if default layout is not present
		expect(await utils.isPresent('#default-layout')).toBeFalse();

		// Check if custom stream is not present
		expect(await utils.isPresent('#custom-stream')).toBeFalse();

		// Check if video is not present
		expect(await utils.isPresent('video')).toBeFalse();
	});

	it('should render the custom layout with a custom stream (no default layout/stream)', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovLayout-checkbox');

		await utils.clickOn('#ovStream-checkbox');

		await utils.clickOn('#apply-btn');

		// Check if custom layout is present
		await utils.waitForElement('#custom-layout');
		expect(await utils.isPresent('#custom-layout')).toBeTrue();

		// Check if default layout is not present
		expect(await utils.isPresent('default-layout')).toBeFalse();

		// Check if custom stream is present
		await utils.waitForElement('#custom-stream');
		expect(await utils.isPresent('#custom-stream')).toBeTrue();

		// Check if default stream is not present
		expect(await utils.isPresent('default-stream')).toBeFalse();

		// Check if video is present
		await utils.waitForElement('video');
		expect(await utils.isPresent('video')).toBeTrue();
	});

	it('should render only a custom stream (no custom layout, no default stream)', async () => {
		await browser.get(`${url}`);

		await utils.clickOn('#ovStream-checkbox');

		await utils.clickOn('#apply-btn');

		// Check if default layout is not present
		await utils.waitForElement('#default-layout');
		expect(await utils.isPresent('#default-layout')).toBeTrue();

		// Check if custom stream is present
		await utils.waitForElement('#custom-stream');
		expect(await utils.isPresent('#custom-stream')).toBeTrue();

		// Check if custom layout is not present
		expect(await utils.isPresent('#custom-layout')).toBeFalse();

		// Check if default stream is not present
		expect(await utils.isPresent('default-stream')).toBeFalse();

		// Check if video is present
		await utils.waitForElement('video');
		expect(await utils.isPresent('video')).toBeTrue();
	});
});
