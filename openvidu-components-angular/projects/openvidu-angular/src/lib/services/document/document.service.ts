import { Injectable } from '@angular/core';
import { LayoutClass } from '../../models/layout.model';

@Injectable({
	providedIn: 'root'
})
export class DocumentService {
	constructor() {}

	getHTMLElementByClassName(element: HTMLElement, className: string): HTMLElement {
		while (!!element && element !== document.body) {
			if (element.className.includes(className)) {
				return element;
			}
			element = element.parentElement;
		}
		return null;
	}

	toggleFullscreen(elementId: string) {
		const document: any = window.document;
		const fs = document.getElementById(elementId);
		if (
			!document.fullscreenElement &&
			!document.mozFullScreenElement &&
			!document.webkitFullscreenElement &&
			!document.msFullscreenElement
		) {
			if (fs.requestFullscreen) {
				fs.requestFullscreen();
			} else if (fs.msRequestFullscreen) {
				fs.msRequestFullscreen();
			} else if (fs.mozRequestFullScreen) {
				fs.mozRequestFullScreen();
			} else if (fs.webkitRequestFullscreen) {
				fs.webkitRequestFullscreen();
			}
		} else {
			if (document.exitFullscreen) {
				document.exitFullscreen();
			} else if (document.msExitFullscreen) {
				document.msExitFullscreen();
			} else if (document.mozCancelFullScreen) {
				document.mozCancelFullScreen();
			} else if (document.webkitExitFullscreen) {
				document.webkitExitFullscreen();
			}
		}
	}

	removeAllBigElementClass() {
		const elements: HTMLCollectionOf<Element> = document.getElementsByClassName(LayoutClass.BIG_ELEMENT);
		while (elements.length > 0) {
			this.removeBigElementClass(elements[0]);
		}
	}


	removeNoSizeElementClass(element: HTMLElement | Element) {
		element?.classList.remove(LayoutClass.NO_SIZE_ELEMENT);
	}

	removeBigElementClass(element: HTMLElement | Element) {
		element?.classList.remove(LayoutClass.BIG_ELEMENT);
	}

	toggleBigElementClass(element: HTMLElement | Element) {
		if (element?.className.includes(LayoutClass.BIG_ELEMENT)) {
			this.removeBigElementClass(element);
		} else {
			element.classList.add(LayoutClass.BIG_ELEMENT);
		}
	}

	isSmallElement(element: HTMLElement | Element): boolean {
		return element?.className.includes(LayoutClass.SMALL_ELEMENT);
	}
}
