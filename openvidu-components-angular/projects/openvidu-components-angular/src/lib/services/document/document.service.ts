import { Injectable } from '@angular/core';
import { LayoutClass } from '../../models/layout.model';

/**
 * @internal
 */
@Injectable({
	providedIn: 'root'
})
export class DocumentService {
	constructor() {}

	toggleFullscreen(elementId: string) {
		const document: any = this.getDocument();
		const fs = this.getElementById(elementId);

		if (this.isInFullscreen()) {
			this.exitFullscreen(document);
		} else {
			this.requestFullscreen(fs);
		}
	}

	isSmallElement(element: HTMLElement | Element): boolean {
		return element?.className.includes(LayoutClass.SMALL_ELEMENT);
	}

	/**
	 * @internal
	 * Get the document object (can be overridden for testing)
	 */
	protected getDocument(): any {
		return window.document;
	}

	/**
	 * @internal
	 * Get element by ID (can be overridden for testing)
	 */
	protected getElementById(elementId: string): any {
		return this.getDocument().getElementById(elementId);
	}

	/**
	 * @internal
	 * Check if currently in fullscreen mode
	 */
	protected isInFullscreen(): boolean {
		const document: any = this.getDocument();
		return !!(
			document.fullscreenElement ||
			document.mozFullScreenElement ||
			document.webkitFullscreenElement ||
			document.msFullscreenElement
		);
	}

	/**
	 * @internal
	 * Request fullscreen on element using vendor-specific methods
	 */
	protected requestFullscreen(element: any): void {
		if (!element) return;

		if (element.requestFullscreen) {
			element.requestFullscreen();
		} else if (element.msRequestFullscreen) {
			element.msRequestFullscreen();
		} else if (element.mozRequestFullScreen) {
			element.mozRequestFullScreen();
		} else if (element.webkitRequestFullscreen) {
			element.webkitRequestFullscreen();
		}
	}

	/**
	 * @internal
	 * Exit fullscreen using vendor-specific methods
	 */
	protected exitFullscreen(document: any): void {
		if (!document) return;

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
