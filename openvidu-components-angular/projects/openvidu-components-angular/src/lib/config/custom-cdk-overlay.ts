import { OverlayContainer } from '@angular/cdk/overlay';
import { Injectable } from '@angular/core';

@Injectable({
	providedIn: 'root'
})
export class CdkOverlayContainer extends OverlayContainer {
	private readonly cdkContainerClass: string = '.cdk-overlay-container';
	private defaultSelector = 'body';
	private currentSelector = this.defaultSelector;

	setContainerSelector(selector: string): void {
		const newContainer = this.getElementWithSelector(selector);
		const overlayContainerElement = this.getElementWithSelector(this.cdkContainerClass);
		const currentContainer = this.getElementWithSelector(this.currentSelector);

		if (newContainer === currentContainer) {
			return;
		}

		if (newContainer && currentContainer && overlayContainerElement) {
			currentContainer.removeChild(overlayContainerElement);
			newContainer.appendChild(overlayContainerElement);
			this.currentSelector = selector;
		} else {
			console.error(`Failed to find fullscreen element with selector: ${selector}`);
		}
	}

	private getElementWithSelector(selector: string): Element | null {
		return document.querySelector(selector);
	}
}
