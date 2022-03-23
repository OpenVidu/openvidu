import { Injectable } from '@angular/core';

/**
 * @internal
 */
@Injectable({
	providedIn: 'root'
})
export class PlatformService {
	constructor() {}

	isMobile(): boolean {
		return this.isAndroid() || this.isIos();
	}

	isFirefox(): boolean {
		return /Firefox[\/\s](\d+\.\d+)/.test(navigator.userAgent);
	}

	private isAndroid(): boolean {
		return /\b(\w*Android\w*)\b/.test(navigator.userAgent) && /\b(\w*Mobile\w*)\b/.test(navigator.userAgent);
	}

	private isIos(): boolean {
		return this.isIPhoneOrIPad(navigator?.userAgent) && this.isIOSWithSafari(navigator?.userAgent);
	}
	private isIPhoneOrIPad(userAgent): boolean {
		const isIPad = /\b(\w*Macintosh\w*)\b/.test(userAgent);
		const isIPhone = /\b(\w*iPhone\w*)\b/.test(userAgent) && /\b(\w*Mobile\w*)\b/.test(userAgent);
		// && /\b(\w*iPhone\w*)\b/.test(navigator.platform);
		const isTouchable = 'ontouchend' in document;

		return (isIPad || isIPhone) && isTouchable;
	}

	private isIOSWithSafari(userAgent): boolean {
		return (
			/\b(\w*Apple\w*)\b/.test(navigator.vendor) &&
			/\b(\w*Safari\w*)\b/.test(userAgent) &&
			!/\b(\w*CriOS\w*)\b/.test(userAgent) &&
			!/\b(\w*FxiOS\w*)\b/.test(userAgent)
		);
	}
}
