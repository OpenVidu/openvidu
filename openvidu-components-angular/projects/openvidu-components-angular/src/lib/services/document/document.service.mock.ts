import { Injectable } from '@angular/core';

@Injectable()
export class DocumentServiceMock {
	constructor() {}

	getHTMLElementByClassName(element: HTMLElement, className: string): HTMLElement {
		return null;
	}

	toggleFullscreen(elementId: string) {}

	removeAllBigElementClass() {}

	removeBigElementClass(element: HTMLElement | Element) {}

	toggleBigElementClass(element: HTMLElement | Element) {}

	isSmallElement(element: HTMLElement | Element): boolean {
		return false;
	}
}
