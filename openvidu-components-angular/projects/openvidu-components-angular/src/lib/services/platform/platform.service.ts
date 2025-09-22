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
	 * Returns true if the device is physically a mobile device (iPhone, Android phone)
	 * This method is orientation-independent and hardware-based
	 */
	isPhysicalMobile(): boolean {
		return this.isIPhone() || this.isAndroidPhone();
	}

	/**
	 * Returns true if the device is physically a tablet (iPad, Android tablet)
	 */
	isPhysicalTablet(): boolean {
		return this.isIPad() || this.isAndroidTablet();
	}

	/**
	 * Detect Android phone specifically (not tablet)
	 */
	isAndroidPhone(): boolean {
		return /\b(\w*Android\w*)\b/.test(this.userAgent) && /\b(\w*Mobile\w*)\b/.test(this.userAgent);
	}

	/**
	 * Detect Android tablet specifically
	 */
	isAndroidTablet(): boolean {
		return /\b(\w*Android\w*)\b/.test(this.userAgent) && !/\b(\w*Mobile\w*)\b/.test(this.userAgent);
	}

	/**
	 * Detect Android Mobile (legacy method for compatibility)
	 */
	isAndroid(): boolean {
		return this.isAndroidPhone() || this.isAndroidTablet();
	}

	/**
	 * Detect iPhone specifically
	 */
	isIPhone(): boolean {
		return /\biPhone\b/.test(this.userAgent) && /\bMobile\b/.test(this.userAgent);
	}

	/**
	 * Detect iPad specifically
	 */
	isIPad(): boolean {
		return /\bMacintosh\b/.test(this.userAgent) && 'ontouchend' in document;
	}

	/**
	 * Detect iOS device (iPhone or iPad)
	 */
	isIos(): boolean {
		return this.isIPhone() || this.isIPad();
	}

	/**
	 * Detect if the device supports touch interactions
	 */
	isTouchDevice(): boolean {
		return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
	}

	/**
	 * Get the maximum screen dimension (useful for detecting device capabilities)
	 */
	getMaxScreenDimension(): number {
		if (typeof screen === 'undefined') return 1024;
		return Math.max(screen.width, screen.height);
	}

	/**
	 * Get the minimum screen dimension
	 */
	getMinScreenDimension(): number {
		if (typeof screen === 'undefined') return 768;
		return Math.min(screen.width, screen.height);
	}

	/**
	 * Enhanced mobile detection that considers physical device characteristics
	 * This is orientation-independent and more reliable for landscape warnings
	 */
	isPhysicalMobileDevice(): boolean {
		// First check: User agent based detection (most reliable)
		if (this.isPhysicalMobile()) {
			return true;
		}

		// Second check: Screen dimensions for edge cases
		// Most mobile devices have a max dimension <= 950px even in landscape
		const maxDimension = this.getMaxScreenDimension();
		const minDimension = this.getMinScreenDimension();

		// If touch device with small screen dimensions, likely mobile
		if (this.isTouchDevice() && maxDimension <= 950 && minDimension <= 500) {
			return true;
		}

		return false;
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
