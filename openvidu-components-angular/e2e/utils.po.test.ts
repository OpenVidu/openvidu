import { By, until, WebDriver, WebElement } from 'selenium-webdriver';
import * as fs from 'fs';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
type PNGWithMetadata = PNG & { data: Buffer };

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
			case 'backgrounds':
				await this.waitForElement('#more-options-btn');
				await this.clickOn('#more-options-btn');

				await this.browser.sleep(500);
				await this.waitForElement('#virtual-bg-btn');
				await this.clickOn('#virtual-bg-btn');

				await this.browser.sleep(1000);
				break;

			case 'settings':
				await this.toggleToolbarMoreOptions();
				await this.waitForElement('#toolbar-settings-btn');
				await this.clickOn('#toolbar-settings-btn');
				break;
		}

		await this.browser.sleep(500);
	}

	async applyBackground(bgId: string) {
		await this.waitForElement('ov-background-effects-panel');
		await this.browser.sleep(1000);
		await this.waitForElement(`#effect-${bgId}`);

		await this.clickOn(`#effect-${bgId}`);
		await this.browser.sleep(2000);
	}

	async applyVirtualBackgroundFromPrejoin(bgId: string): Promise<void> {
		await this.waitForElement('#backgrounds-button');
		await this.clickOn('#backgrounds-button');

		await this.applyBackground(bgId);
		await this.clickOn('#backgrounds-button');
	}

	async saveScreenshot(filename: string, element: WebElement) {
		const image = await element.takeScreenshot();
		fs.writeFileSync(filename, image, 'base64');
	}

	async expectVirtualBackgroundApplied(
		img1Name: string,
		img2Name: string,
		{
			threshold = 0.4,
			minDiffPixels = 500,
			debug = false
		}: {
			threshold?: number;
			minDiffPixels?: number;
			debug?: boolean;
		} = {}
	): Promise<void> {
		const beforeImg = PNG.sync.read(fs.readFileSync(img1Name));
		const afterImg = PNG.sync.read(fs.readFileSync(img2Name));
		const { width, height } = beforeImg;
		const diff = new PNG({ width, height });

		// const numDiffPixels = pixelmatch(img1.data, img2.data, diff.data, width, height, {
		// 	threshold: 0.4
		// 	// alpha: 0.5,
		// 	// includeAA: false,
		// 	// diffColor: [255, 0, 0]
		// });

		const numDiffPixels = pixelmatch(beforeImg.data, afterImg.data, diff.data, width, height, {
			threshold
			// includeAA: true
		});

		if (numDiffPixels <= minDiffPixels) {
			// Sólo guardar los archivos de debug si falla la prueba
			if (debug) {
				fs.writeFileSync('before.png', PNG.sync.write(beforeImg));
				fs.writeFileSync('after.png', PNG.sync.write(afterImg));
				fs.writeFileSync('diff.png', PNG.sync.write(diff));
			}
		}

		expect(numDiffPixels).toBeGreaterThan(minDiffPixels, 'The virtual background was not applied correctly');

		// fs.writeFileSync('diff.png', PNG.sync.write(diff));
		// expect(numDiffPixels).to.be.greaterThan(500, 'The virtual background was not applied correctly');
	}
}
