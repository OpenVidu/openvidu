import { expect } from 'chai';
import { By, until, WebDriver, WebElement } from 'selenium-webdriver';

export class OpenViduComponentsPO {
	private TIMEOUT = 30 * 1000;
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

	async isPresent(selector: string): Promise<boolean> {
		const elements = await this.browser.findElements(By.css(selector));
		return elements.length > 0;
	}

	async checkPrejoinIsPresent(): Promise<void> {
		await this.waitForElement('#prejoin-container');
		expect(await this.isPresent('#prejoin-container')).to.be.true;
	}

	async checkSessionIsPresent() {
		await this.waitForElement('#call-container');
		expect(await this.isPresent('#call-container')).to.be.true;

		await this.waitForElement('#session-container');
		expect(await this.isPresent('#session-container')).to.be.true;
	}

	async checkLayoutPresent(): Promise<void> {
		await this.waitForElement('#layout-container');
		expect(await this.isPresent('#layout-container')).to.be.true;

		await this.waitForElement('#layout');
		expect(await this.isPresent('#layout')).to.be.true;
	}

	async checkStreamIsPresent(): Promise<void> {
		await this.waitForElement('.OV_stream');
		expect(await this.isPresent('.OV_stream')).to.be.true;
	}

	async checkVideoElementIsPresent(): Promise<void> {
		await this.waitForElement('video');
		expect(await this.isPresent('video')).to.be.true;
	}

	async checkToolbarIsPresent(): Promise<void> {
		await this.waitForElement('#toolbar');
		await this.waitForElement('#media-buttons-container');
		expect(await this.isPresent('#media-buttons-container')).to.be.true;
	}
}
