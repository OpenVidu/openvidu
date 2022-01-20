import { OverlayContainer } from '@angular/cdk/overlay';
import { Injectable } from '@angular/core';

@Injectable()
export class CdkOverlayContainer extends OverlayContainer {
	containerSelector = '.sidenav-main';
	customClass = 'cdk-overlay-container';
	protected _createContainer(): void {
		const container = document.createElement('div');
		container.classList.add(this.customClass);
		let element = this.getElement(this.containerSelector);
		if (!element) {
			element = this.getElement('body');
		}
		this._containerElement = element.appendChild(container);
	}

	setSelector(selector: string) {
		const overlayElement = this.getElement('.' + this.customClass);

		if (overlayElement && this.containerSelector !== selector) {
			const newContainerOverlayContainer = this.getElement(selector);
			this.containerSelector = selector;
			newContainerOverlayContainer?.appendChild(overlayElement);
		}
	}
	private getElement(selector: string): Element {
		return document.querySelector(selector);
	}
}
