import { By, until, WebDriver, WebElement } from 'selenium-webdriver';

export class OpenViduComponentsPO {
	private TIMEOUT = 10 * 1000;
	private POLL_TIMEOUT = 1 * 1000;

	constructor(private browser: WebDriver) {}

	async waitForElement(selector: string): Promise<WebElement> {
		return await this.browser.wait(
			until.elementLocated(By.css(selector)),
			this.TIMEOUT,
			`Time out waiting for ${selector}`,
			this.POLL_TIMEOUT
		);
	}

	async getNumberOfElements(selector: string): Promise<number> {
		return (await this.browser.findElements(By.css(selector))).length;
	}

	async isPresent(selector: string): Promise<boolean> {
		const elements = await this.browser.findElements(By.css(selector));
		return elements.length > 0;
	}
	async sendKeys(selector: string, keys: string): Promise<void> {
		const element = await this.waitForElement(selector);
		await element.sendKeys(keys);
	}

	async checkPrejoinIsPresent(): Promise<void> {
		await this.waitForElement('#prejoin-container');
		expect(await this.isPresent('#prejoin-container')).toBe(true);
	}

	async checkSessionIsPresent() {
		await this.waitForElement('#call-container');
		expect(await this.isPresent('#call-container')).toBe(true);

		await this.waitForElement('#session-container');
		expect(await this.isPresent('#session-container')).toBe(true);
	}

	async checkLayoutPresent(): Promise<void> {
		await this.waitForElement('#layout-container');
		expect(await this.isPresent('#layout-container')).toBe(true);

		await this.waitForElement('#layout');
		expect(await this.isPresent('#layout')).toBe(true);
	}

	async checkStreamIsPresent(): Promise<void> {
		await this.waitForElement('.OV_stream');
		expect(await this.isPresent('.OV_stream')).toBe(true);
	}

	async checkVideoElementIsPresent(): Promise<void> {
		await this.waitForElement('video');
		expect(await this.isPresent('video')).toBe(true);
	}

	async checkToolbarIsPresent(): Promise<void> {
		await this.waitForElement('#toolbar');
		await this.waitForElement('#media-buttons-container');
		expect(await this.isPresent('#media-buttons-container')).toBe(true);
	}

	async chceckProFeatureAlertIsPresent(): Promise<void> {
		await this.waitForElement('ov-pro-feature-template');
		expect(await this.isPresent('ov-pro-feature-template')).toBe(true);
	}

	async clickOn(selector: string): Promise<void> {
		const element = await this.waitForElement(selector);
		await element.click();
	}

	async hoverOn(selector: string): Promise<void> {
		const element = await this.waitForElement(selector);
		const action = this.browser.actions().move({ origin: element, duration: 1000 });
		return action.perform();
	}

	async openTab(url: string): Promise<string[]> {
		const newTabScript = `window.open("${url}")`;
		await this.browser.executeScript(newTabScript);
		return this.browser.getAllWindowHandles();
	}

	async subscribeToDropEvent(): Promise<void> {
		const script = `
			document.dispatchEvent(new Event("webcomponentTestingEndedDragAndDropEvent"));
		`;
		await this.browser.executeScript(script);
	}

	async dragToRight(x: number, y: number): Promise<void> {
		const script = `
			document.dispatchEvent(new CustomEvent("webcomponentTestingEndedDragAndDropRightEvent", {detail: {x: arguments[0], y: arguments[1]}}));
		`;
		await this.browser.executeScript(script, x, y);
	}

	async toggleToolbarMoreOptions(): Promise<void> {
		await this.waitForElement('#more-options-btn');
		expect(await this.isPresent('#more-options-btn')).toBe(true);
		await this.clickOn('#more-options-btn');
		await this.browser.sleep(500);
		await this.waitForElement('#more-options-menu');
	}

	async disableScreenShare(): Promise<void> {
		await this.waitForElement('#screenshare-btn');
		await this.clickOn('#screenshare-btn');
		await this.browser.sleep(500);
		await this.waitForElement('#screenshare-menu');
		await this.clickOn('#disable-screen-button');
		await this.browser.sleep(1000);
	}

	async toggleRecordingFromToolbar() {
		// Open more options menu
		await this.toggleToolbarMoreOptions();

		await this.waitForElement('#recording-btn');
		expect(await this.isPresent('#recording-btn')).toBe(true);
		await this.clickOn('#recording-btn');
	}

	async toggleFullscreenFromToolbar() {
		// Open more options menu
		await this.toggleToolbarMoreOptions();

		await this.waitForElement('#fullscreen-btn');
		expect(await this.isPresent('#fullscreen-btn')).toBe(true);
		await this.clickOn('#fullscreen-btn');
	}

	async leaveRoom() {
		try {
			// Close any open panels or menus clicking on the body
			await this.clickOn('body');
			await this.browser.sleep(300);

			// Verify that the leave button is present
			await this.waitForElement('#leave-btn');

			// Click on the leave button
			await this.clickOn('#leave-btn');

			// Verify that the session container is no longer present
			await this.browser.wait(
				async () => {
					return !(await this.isPresent('#session-container'));
				},
				this.TIMEOUT,
				'Session container should disappear after leaving room'
			);

			// Wait for the prejoin container to be present again
			await this.browser.sleep(500);

			// Verify that there are no video elements left in the DOM
			const videoCount = await this.getNumberOfElements('video');
			if (videoCount > 0) {
				console.warn(`Warning: ${videoCount} video elements still present after leaving room`);
			}
		} catch (error) {
			console.error('Error during leaveRoom:', error);

			throw error;
		}
	}

	async togglePanel(panelName: string) {
		switch (panelName) {
			case 'activities':
				await this.waitForElement('#activities-panel-btn');
				expect(await this.isPresent('#activities-panel-btn')).toBe(true);
				await this.clickOn('#activities-panel-btn');
				break;

			case 'chat':
				await this.waitForElement('#chat-panel-btn');
				await this.clickOn('#chat-panel-btn');
				break;
			case 'participants':
				await this.waitForElement('#participants-panel-btn');
				await this.clickOn('#participants-panel-btn');
				break;

			case 'settings':
				await this.toggleToolbarMoreOptions();
				await this.waitForElement('#toolbar-settings-btn');
				await this.clickOn('#toolbar-settings-btn');
				break;
		}

		await this.browser.sleep(500);
	}
}
