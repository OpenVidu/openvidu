import { Injectable } from '@angular/core';

@Injectable()
export class PlatformServiceMock {
	constructor() {}

	isMobile(): boolean {
		return false;
	}

	isFirefox(): boolean {
		return false;
	}

	private isAndroid(): boolean {
		return false;
	}

	private isIos(): boolean {
		return false
	}
	private isIPhoneOrIPad(userAgent): boolean {
		return false;
	}

	private isIOSWithSafari(userAgent): boolean {
		return false;
	}
}
