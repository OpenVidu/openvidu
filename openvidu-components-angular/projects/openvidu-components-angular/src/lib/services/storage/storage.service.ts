import { Injectable, OnDestroy } from '@angular/core';
import { ILogger } from '../../models/logger.model';
import { STORAGE_PREFIX, StorageKeys, SESSION_KEYS, TAB_MANAGEMENT_KEYS, TAB_SPECIFIC_KEYS, SHARED_PERSISTENT_KEYS } from '../../models/storage.model';
import { LoggerService } from '../logger/logger.service';
import { CustomDevice } from '../../models/device.model';

/**
 * @internal
 */
@Injectable({
	providedIn: 'root'
})
export class StorageService implements OnDestroy {
	public localStorage = window.localStorage;
	public sessionStorage = window.sessionStorage;
	public log: ILogger;
	protected PREFIX_KEY = STORAGE_PREFIX;
	private tabId: string;
	private readonly TAB_CLEANUP_INTERVAL = 30000; // 30 seconds
	private cleanupInterval: any;

	constructor(protected loggerSrv: LoggerService) {
		this.log = this.loggerSrv.get('StorageService');
		this.initializeTabManagement();
	}

	/**
	 * Initializes tab management system
	 * Creates unique tab ID and sets up cleanup mechanism
	 */
	private initializeTabManagement(): void {
		// Generate unique tab ID
		this.tabId = this.generateTabId();
		this.setSessionValue(StorageKeys.TAB_ID, this.tabId);

		// Register this tab as active
		this.registerActiveTab();

		// Set up periodic cleanup of inactive tabs
		this.setupTabCleanup();

		// Listen for page unload to clean up this tab
		window.addEventListener('beforeunload', () => {
			this.unregisterActiveTab();
		});

		this.log.d(`Tab initialized with ID: ${this.tabId}`);
	}

	/**
	 * Generates a unique tab identifier
	 */
	private generateTabId(): string {
		return `tab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
	}

	/**
	 * Registers current tab as active
	 */
	private registerActiveTab(): void {
		const activeTabs = this.getActiveTabsFromStorage() || {};
		activeTabs[this.tabId] = Date.now();
		this.setLocalValue(StorageKeys.ACTIVE_TABS, activeTabs);
	}

	/**
	 * Unregisters current tab from active tabs
	 */
	private unregisterActiveTab(): void {
		const activeTabs = this.getActiveTabsFromStorage() || {};
		delete activeTabs[this.tabId];
		this.setLocalValue(StorageKeys.ACTIVE_TABS, activeTabs);
		this.cleanupTabData(this.tabId);
	}

	/**
	 * Sets up periodic cleanup of inactive tabs
	 */
	private setupTabCleanup(): void {
		this.cleanupInterval = setInterval(() => {
			this.cleanupInactiveTabs();
		}, this.TAB_CLEANUP_INTERVAL);
	}

	/**
	 * Cleans up data from inactive tabs
	 */
	private cleanupInactiveTabs(): void {
		const activeTabs = this.getActiveTabsFromStorage() || {};
		const currentTime = Date.now();
		const timeoutThreshold = this.TAB_CLEANUP_INTERVAL * 2; // 60 seconds

		Object.keys(activeTabs).forEach(tabId => {
			const lastActivity = activeTabs[tabId];
			if (currentTime - lastActivity > timeoutThreshold) {
				this.log.d(`Cleaning up inactive tab: ${tabId}`);
				delete activeTabs[tabId];
				this.cleanupTabData(tabId);
			}
		});

		// Update heartbeat for current tab
		activeTabs[this.tabId] = currentTime;
		this.setLocalValue(StorageKeys.ACTIVE_TABS, activeTabs);
	}

	/**
	 * Cleans up data associated with a specific tab
	 */
	private cleanupTabData(tabId: string): void {
		// Clean up tab-specific data from localStorage
		TAB_SPECIFIC_KEYS.forEach(key => {
			const storageKey = `${this.PREFIX_KEY}${tabId}_${key}`;
			this.localStorage.removeItem(storageKey);
		});

		this.log.d(`Cleaned up data for tab: ${tabId}`);
	}

	/**
	 * Gets active tabs from localStorage
	 */
	private getActiveTabsFromStorage(): { [key: string]: number } | null {
		return this.getLocalValue(StorageKeys.ACTIVE_TABS);
	}

	/**
	 * Gets the current tab ID
	 */
	public getTabId(): string {
		return this.tabId;
	}

	getParticipantName(): string | null {
		return this.get(StorageKeys.PARTICIPANT_NAME);
	}

	setParticipantName(name: string) {
		this.set(StorageKeys.PARTICIPANT_NAME, name);
	}
	getVideoDevice(): CustomDevice | null {
		return this.get(StorageKeys.VIDEO_DEVICE);
	}

	setVideoDevice(device: CustomDevice) {
		this.set(StorageKeys.VIDEO_DEVICE, device);
	}

	getAudioDevice(): CustomDevice | null {
		return this.get(StorageKeys.AUDIO_DEVICE);
	}

	setAudioDevice(device: CustomDevice) {
		this.set(StorageKeys.AUDIO_DEVICE, device);
	}

	/**
	 * @internal
	 * Returns true only if the participant has the camera deliberately enabled
	 */
	isCameraEnabled(): boolean {
		const value = this.get(StorageKeys.CAMERA_ENABLED);
		if (value === null) {
			return true;
		}
		return value === true;
	}

	setCameraEnabled(enabled: boolean) {
		this.set(StorageKeys.CAMERA_ENABLED, enabled);
	}

	/**
	 * @internal
	 * Returns true only if the participant has the microphone deliberately enabled
	 */
	isMicrophoneEnabled(): boolean {
		const value = this.get(StorageKeys.MICROPHONE_ENABLED);
		if (value === null) {
			return true;
		}
		return value === true;
	}

	/**
	 * @param enabled
	 */
	setMicrophoneEnabled(enabled: boolean) {
		this.set(StorageKeys.MICROPHONE_ENABLED, enabled);
	}

	setLang(lang: string) {
		this.set(StorageKeys.LANG, lang);
	}

	getLang(): string {
		return this.get(StorageKeys.LANG);
	}

	setCaptionLang(lang: string) {
		this.set(StorageKeys.CAPTION_LANG, lang);
	}

	getCaptionsLang(): string {
		return this.get(StorageKeys.CAPTION_LANG);
	}

	setBackground(id: string) {
		this.set(StorageKeys.BACKGROUND, id);
	}

	getBackground(): string {
		return this.get(StorageKeys.BACKGROUND);
	}

	removeBackground() {
		this.remove(StorageKeys.BACKGROUND);
	}

	protected set(key: string, item: any) {
		if (SESSION_KEYS.includes(key as StorageKeys)) {
			this.setSessionValue(key, item);
		} else {
			this.setLocalValue(key, item);
		}
	}

	protected get(key: string): any {
		if (SESSION_KEYS.includes(key as StorageKeys)) {
			return this.getSessionValue(key);
		} else {
			return this.getLocalValue(key);
		}
	}

	protected remove(key: string) {
		if (SESSION_KEYS.includes(key as StorageKeys)) {
			this.removeSessionValue(key);
		} else {
			this.removeLocalValue(key);
		}
	}

	/**
	 * Determines if a key should use tab-specific storage in localStorage
	 */
	private shouldUseTabSpecificKey(key: string): boolean {
		return TAB_SPECIFIC_KEYS.includes(key as StorageKeys);
	}

	/**
	 * Sets value in localStorage with tab-specific key if needed
	 */
	private setLocalValue(key: string, item: any): void {
		const value = JSON.stringify({ item: item });
		const storageKey = this.shouldUseTabSpecificKey(key)
			? `${this.PREFIX_KEY}${this.tabId}_${key}`
			: `${this.PREFIX_KEY}${key}`;
		this.localStorage.setItem(storageKey, value);
	}

	/**
	 * Gets value from localStorage with tab-specific key if needed
	 */
	private getLocalValue(key: string): any {
		const storageKey = this.shouldUseTabSpecificKey(key)
			? `${this.PREFIX_KEY}${this.tabId}_${key}`
			: `${this.PREFIX_KEY}${key}`;
		const str = this.localStorage.getItem(storageKey);
		if (!!str) {
			return JSON.parse(str).item;
		}
		return null;
	}

	/**
	 * Removes value from localStorage with tab-specific key if needed
	 */
	private removeLocalValue(key: string): void {
		const storageKey = this.shouldUseTabSpecificKey(key)
			? `${this.PREFIX_KEY}${this.tabId}_${key}`
			: `${this.PREFIX_KEY}${key}`;
		this.localStorage.removeItem(storageKey);
	}

	/**
	 * Sets value in sessionStorage
	 */
	private setSessionValue(key: string, item: any): void {
		const value = JSON.stringify({ item: item });
		this.sessionStorage.setItem(this.PREFIX_KEY + key, value);
	}

	/**
	 * Gets value from sessionStorage
	 */
	private getSessionValue(key: string): any {
		const str = this.sessionStorage.getItem(this.PREFIX_KEY + key);
		if (!!str) {
			return JSON.parse(str).item;
		}
		return null;
	}

	/**
	 * Removes value from sessionStorage
	 */
	private removeSessionValue(key: string): void {
		this.sessionStorage.removeItem(this.PREFIX_KEY + key);
	}

	public clear() {
		this.log.d('Clearing localStorage and sessionStorage');

		// Clear only our prefixed keys from localStorage
		Object.keys(this.localStorage).forEach(key => {
			if (key.startsWith(this.PREFIX_KEY)) {
				this.localStorage.removeItem(key);
			}
		});

		// Clear only our prefixed keys from sessionStorage
		Object.keys(this.sessionStorage).forEach(key => {
			if (key.startsWith(this.PREFIX_KEY)) {
				this.sessionStorage.removeItem(key);
			}
		});
	}

	/**
	 * Clears only session data (tab-specific data)
	 */
	public clearSessionData(): void {
		this.log.d('Clearing session data');
		Object.keys(this.sessionStorage).forEach(key => {
			if (key.startsWith(this.PREFIX_KEY)) {
				this.sessionStorage.removeItem(key);
			}
		});
	}

	/**
	 * Clears only tab-specific data for current tab
	 */
	public clearTabSpecificData(): void {
		this.log.d('Clearing tab-specific data');
		TAB_SPECIFIC_KEYS.forEach(key => {
			this.removeLocalValue(key);
		});
	}

	/**
	 * Clears only persistent data
	 */
	public clearPersistentData(): void {
		this.log.d('Clearing persistent data');
		SHARED_PERSISTENT_KEYS.forEach(key => {
			this.removeLocalValue(key);
		});
		TAB_MANAGEMENT_KEYS.forEach(key => {
			this.removeLocalValue(key);
		});
	}

	/**
	 * Cleanup method to be called when service is destroyed
	 */
	public destroy(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
		}
		this.unregisterActiveTab();
	}

	/**
	 * Angular lifecycle hook - called when service is destroyed
	 */
	ngOnDestroy(): void {
		this.destroy();
	}
}
