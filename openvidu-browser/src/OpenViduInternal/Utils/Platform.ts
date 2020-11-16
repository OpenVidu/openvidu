import platform = require("platform");

export class PlatformUtils {
	private static instance: PlatformUtils;
	private constructor() {}

	static getInstance(): PlatformUtils {
		if (!PlatformUtils.instance) {
			PlatformUtils.instance = new PlatformUtils();
		}
		return PlatformUtils.instance;
	}

	public isChromeBrowser(): boolean {
		return platform.name === "Chrome";
	}

	/**
	 * @hidden
	 */
	public isSafariBrowser(): boolean {
		return platform.name === "Safari";
	}

	/**
	 * @hidden
	 */
	public isChromeMobileBrowser(): boolean {
		return platform.name === "Chrome Mobile";
	}

	/**
	 * @hidden
	 */
	public isFirefoxBrowser(): boolean {
		return platform.name === "Firefox";
	}

	/**
	 * @hidden
	 */
	public isFirefoxMobileBrowser(): boolean {
		return platform.name === "Firefox Mobile";
	}

	/**
	 * @hidden
	 */
	public isOperaBrowser(): boolean {
		return platform.name === "Opera";
	}

	/**
	 * @hidden
	 */
	public isOperaMobileBrowser(): boolean {
		return platform.name === "Opera Mobile";
	}

	/**
	 * @hidden
	 */
	public isEdgeBrowser(): boolean {
		const version = platform?.version ? parseFloat(platform.version) : -1;
		return platform.name === "Microsoft Edge" && version >= 80;
	}

	/**
	 * @hidden
	 */
	public isAndroidBrowser(): boolean {
		return platform.name === "Android Browser";
	}

	/**
	 * @hidden
	 */
	public isElectron(): boolean {
		return platform.name === "Electron";
	}

	/**
	 * @hidden
	 */
	public isSamsungBrowser(): boolean {
		return (
			platform.name === "Samsung Internet Mobile" ||
			platform.name === "Samsung Internet"
		);
	}

	/**
	 * @hidden
	 */
	public isIPhoneOrIPad(): boolean {
		const userAgent = !!platform.ua ? platform.ua : navigator.userAgent;

		const isTouchable = "ontouchend" in document;
		const isIPad = /\b(\w*Macintosh\w*)\b/.test(userAgent) && isTouchable;
		const isIPhone =
			/\b(\w*iPhone\w*)\b/.test(userAgent) &&
			/\b(\w*Mobile\w*)\b/.test(userAgent) &&
			isTouchable;

		return isIPad || isIPhone;
	}

	/**
	 * @hidden
	 */
	public isIOSWithSafari(): boolean {
		const userAgent = !!platform.ua ? platform.ua : navigator.userAgent;
		return (
			/\b(\w*Apple\w*)\b/.test(navigator.vendor) &&
			/\b(\w*Safari\w*)\b/.test(userAgent) &&
			!/\b(\w*CriOS\w*)\b/.test(userAgent) &&
			!/\b(\w*FxiOS\w*)\b/.test(userAgent)
		);
	}

	/**
	 * @hidden
	 */
	public isIonicIos(): boolean {
		return this.isIPhoneOrIPad() && platform.ua!!.indexOf("Safari") === -1;
	}

	/**
	 * @hidden
	 */
	public isIonicAndroid(): boolean {
		return (
			platform.os!!.family === "Android" && platform.name == "Android Browser"
		);
	}

	/**
	 * @hidden
	 */
	public isMobileDevice(): boolean {
		return platform.os!!.family === "iOS" || platform.os!!.family === "Android";
	}

	/**
	 * @hidden
	 */
	public canScreenShare(): boolean {
		const version = platform?.version ? parseFloat(platform.version) : -1;
		// Reject mobile devices
		if (this.isMobileDevice()) {
			return false;
		}
		return (
			this.isChromeBrowser() ||
			this.isFirefoxBrowser() ||
			this.isOperaBrowser() ||
			this.isElectron() ||
			this.isEdgeBrowser() ||
			(this.isSafariBrowser() && version >= 13)
		);
	}

	/**
	 * @hidden
	 */
	public getName(): string {
		return platform.name || "";
	}

	/**
	 * @hidden
	 */
	public getVersion(): string {
		return platform.version || "";
	}

	/**
	 * @hidden
	 */
	public getFamily(): string {
		return platform.os!!.family || "";
	}

	/**
	 * @hidden
	 */
	public getDescription(): string {
		return platform.description || "";
	}
}
