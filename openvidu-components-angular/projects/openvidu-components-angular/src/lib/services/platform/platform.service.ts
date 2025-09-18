import { Injectable } from '@angular/core';

/**
 * Service to detect platform, device type, and browser features.
 * @internal
 */
@Injectable({
	providedIn: 'root'
})
export class PlatformService {
	private readonly userAgent: string = typeof navigator !== 'undefined' ? navigator.userAgent : '';

	constructor() {}

	// ===== Device Type =====

	/**
	 * Returns true if the device is mobile (iOS or Android)
	 */
	isMobile(): boolean {
		return this.isAndroid() || this.isIos();
	}

	/**
	 * Detect Android Mobile
	 */
	isAndroid(): boolean {
		return /\b(\w*Android\w*)\b/.test(this.userAgent) && /\b(\w*Mobile\w*)\b/.test(this.userAgent);
	}

	/**
	 * Detect iOS device (iPhone or iPad)
	 */
	isIos(): boolean {
		return this.isIosDevice(this.userAgent);
	}

	/**
	 * Detect if the device supports touch interactions
	 */
	isTouchDevice(): boolean {
		return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
	}

	/**
	 * Detect if the device is an iPhone or iPad
	 */
	private isIosDevice(userAgent: string): boolean {
		const isIPad = /\bMacintosh\b/.test(userAgent) && 'ontouchend' in document;
		const isIPhone = /\biPhone\b/.test(userAgent) && /\bMobile\b/.test(userAgent);
		return isIPad || isIPhone;
	}

	// ===== Browser Detection =====

	isFirefox(): boolean {
		return /Firefox[\/\s](\d+\.\d+)/.test(this.userAgent);
	}

	isSafariIos(): boolean {
		return this.isIos() && this.isIOSWithSafari(this.userAgent);
	}

	private isIOSWithSafari(userAgent: string): boolean {
		return /\bSafari\b/.test(userAgent) && !/\bCriOS\b/.test(userAgent) && !/\bFxiOS\b/.test(userAgent);
	}
}
