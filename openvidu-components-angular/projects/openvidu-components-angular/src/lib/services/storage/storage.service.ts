import { Injectable, OnDestroy } from '@angular/core';
import { ILogger } from '../../models/logger.model';
import {
	STORAGE_PREFIX,
	StorageKeys,
	SESSION_KEYS,
	TAB_MANAGEMENT_KEYS,
	TAB_SPECIFIC_KEYS,
	SHARED_PERSISTENT_KEYS
} from '../../models/storage.model';
import { LoggerService } from '../logger/logger.service';
import { CustomDevice } from '../../models/device.model';

/**
 * @internal
 */
@Injectable({
	providedIn: 'root'
})
export class StorageService implements OnDestroy {
	public log: ILogger;
	protected readonly PREFIX_KEY = STORAGE_PREFIX;
	private readonly tabId: string;
	private readonly TAB_CLEANUP_INTERVAL = 30000; // 30 seconds
	private readonly TAB_TIMEOUT_THRESHOLD = 60000; // 60 seconds
	private cleanupInterval: NodeJS.Timeout | null = null;
	private broadcastChannel: BroadcastChannel | null = null;
	private isStorageAvailable = false;
	private lastHeartbeat = 0;

	// Cache for parsed values to avoid repeated JSON operations
	private cache = new Map<string, any>();
	private cacheTimeout = new Map<string, number>();
	private readonly CACHE_TTL = 5000; // 5 seconds cache TTL

	constructor(protected loggerSrv: LoggerService) {
		this.log = this.loggerSrv.get('StorageService');

		// Generate unique tab ID
		this.tabId = this.generateUniqueTabId();

		// Check storage availability
		this.isStorageAvailable = this.checkStorageAvailability();

		if (this.isStorageAvailable) {
			this.initializeTabManagement();
		} else {
			this.log.w('Storage not available - service will operate in limited mode');
		}
	}

	/**
	 * Check if localStorage and sessionStorage are available
	 */
	private checkStorageAvailability(): boolean {
		try {
			const test = '__storage_test__';
			window.localStorage.setItem(test, test);
			window.localStorage.removeItem(test);
			window.sessionStorage.setItem(test, test);
			window.sessionStorage.removeItem(test);
			return true;
		} catch (e) {
			return false;
		}
	}

	/**
	 * Safe access to localStorage
	 */
	private get localStorage(): Storage {
		return window.localStorage;
	}

	/**
	 * Safe access to sessionStorage
	 */
	private get sessionStorage(): Storage {
		return window.sessionStorage;
	}

	/**
	 * Initializes tab management system with improved efficiency
	 */
	private initializeTabManagement(): void {
		// Store tab ID in session storage
		this.setSessionValue(StorageKeys.TAB_ID, this.tabId);

		// Initialize BroadcastChannel for inter-tab communication
		this.initializeBroadcastChannel();

		// Register this tab as active
		this.registerActiveTab();

		// Set up optimized cleanup mechanism
		this.setupTabCleanup();

		// Listen for page unload to clean up this tab
		window.addEventListener('beforeunload', () => {
			this.unregisterActiveTab();
		});

		// Listen for page visibility changes to optimize heartbeat
		document.addEventListener('visibilitychange', () => {
			if (!document.hidden) {
				this.updateHeartbeat();
			}
		});

		this.log.d(`Tab initialized with ID: ${this.tabId}`);
	}

	/**
	 * Initialize BroadcastChannel for efficient inter-tab communication
	 */
	private initializeBroadcastChannel(): void {
		try {
			if ('BroadcastChannel' in window) {
				this.broadcastChannel = new BroadcastChannel(`${this.PREFIX_KEY}tabs`);
				this.broadcastChannel.addEventListener('message', (event) => {
					if (event.data.type === 'tab-cleanup') {
						// Another tab is performing cleanup, update our heartbeat
						this.updateHeartbeat();
					}
				});
			}
		} catch (e) {
			this.log.w('BroadcastChannel not available, using fallback communication');
		}
	}

	/**
	 * Generates a more unique tab identifier with better collision resistance
	 */
	private generateUniqueTabId(): string {
		const timestamp = Date.now();
		const random = Math.random().toString(36).substring(2, 12);
		const performance = typeof window.performance !== 'undefined' ? window.performance.now() : 0;
		return `tab_${timestamp}_${random}_${Math.floor(performance)}`;
	}

	/**
	 * Updates heartbeat for current tab
	 */
	private updateHeartbeat(): void {
		if (!this.isStorageAvailable) return;

		this.lastHeartbeat = Date.now();
		const activeTabs = this.getActiveTabsFromStorage() || {};
		activeTabs[this.tabId] = this.lastHeartbeat;
		this.setLocalValue(StorageKeys.ACTIVE_TABS, activeTabs, false); // Skip cache for critical data
	}

	/**
	 * Registers current tab as active with optimized approach
	 */
	private registerActiveTab(): void {
		this.updateHeartbeat();
	}

	/**
	 * Unregisters current tab from active tabs
	 */
	private unregisterActiveTab(): void {
		if (!this.isStorageAvailable) return;

		const activeTabs = this.getActiveTabsFromStorage() || {};
		delete activeTabs[this.tabId];
		this.setLocalValue(StorageKeys.ACTIVE_TABS, activeTabs, false);
		this.cleanupTabData(this.tabId);
	}

	/**
	 * Sets up optimized cleanup with reduced frequency
	 */
	private setupTabCleanup(): void {
		this.cleanupInterval = setInterval(() => {
			this.cleanupInactiveTabs();
		}, this.TAB_CLEANUP_INTERVAL);
	}

	/**
	 * Optimized cleanup of inactive tabs with better performance
	 */
	private cleanupInactiveTabs(): void {
		if (!this.isStorageAvailable) return;

		const activeTabs = this.getActiveTabsFromStorage() || {};
		const currentTime = Date.now();
		const tabsToCleanup: string[] = [];
		let hasChanges = false;

		// Find tabs to cleanup without modifying the object during iteration
		for (const [tabId, lastActivity] of Object.entries(activeTabs)) {
			if (currentTime - lastActivity > this.TAB_TIMEOUT_THRESHOLD) {
				tabsToCleanup.push(tabId);
				hasChanges = true;
			}
		}

		// Clean up inactive tabs
		if (tabsToCleanup.length > 0) {
			this.log.d(`Cleaning up ${tabsToCleanup.length} inactive tabs`);

			// Notify other tabs about cleanup via BroadcastChannel
			if (this.broadcastChannel) {
				this.broadcastChannel.postMessage({ type: 'tab-cleanup', tabs: tabsToCleanup });
			}

			// Remove inactive tabs
			for (const tabId of tabsToCleanup) {
				delete activeTabs[tabId];
				this.cleanupTabData(tabId);
			}
		}

		// Update heartbeat for current tab
		activeTabs[this.tabId] = currentTime;
		this.lastHeartbeat = currentTime;

		if (hasChanges || currentTime - this.lastHeartbeat > this.TAB_CLEANUP_INTERVAL / 2) {
			this.setLocalValue(StorageKeys.ACTIVE_TABS, activeTabs, false);
		}
	}

	/**
	 * Optimized cleanup of tab-specific data
	 */
	private cleanupTabData(tabId: string): void {
		if (!this.isStorageAvailable) return;

		// Use batch removal for better performance
		const keysToRemove = TAB_SPECIFIC_KEYS.map(key => `${this.PREFIX_KEY}${tabId}_${key}`);

		for (const storageKey of keysToRemove) {
			try {
				this.localStorage.removeItem(storageKey);
				// Clear from cache if exists
				this.cache.delete(storageKey);
				this.cacheTimeout.delete(storageKey);
			} catch (e) {
				this.log.w(`Failed to remove storage key: ${storageKey}`, e);
			}
		}

		this.log.d(`Cleaned up data for tab: ${tabId}`);
	}

	/**
	 * Gets active tabs with caching
	 */
	private getActiveTabsFromStorage(): { [key: string]: number } | null {
		return this.getLocalValue(StorageKeys.ACTIVE_TABS, false); // Don't cache tab management data
	}

	/**
	 * Gets the current tab ID
	 */
	public getTabId(): string {
		return this.tabId;
	}

	// Simplified API methods with consistent patterns
	getParticipantName(): string | null {
		return this.get(StorageKeys.PARTICIPANT_NAME);
	}

	setParticipantName(name: string): void {
		this.set(StorageKeys.PARTICIPANT_NAME, name);
	}

	getVideoDevice(): CustomDevice | null {
		return this.get(StorageKeys.VIDEO_DEVICE);
	}

	setVideoDevice(device: CustomDevice): void {
		this.set(StorageKeys.VIDEO_DEVICE, device);
	}

	getAudioDevice(): CustomDevice | null {
		return this.get(StorageKeys.AUDIO_DEVICE);
	}

	setAudioDevice(device: CustomDevice): void {
		this.set(StorageKeys.AUDIO_DEVICE, device);
	}

	/**
	 * @internal
	 * Returns true only if the participant has the camera deliberately enabled
	 */
	isCameraEnabled(): boolean {
		const value = this.get(StorageKeys.CAMERA_ENABLED);
		return value === null ? true : value === true;
	}

	setCameraEnabled(enabled: boolean): void {
		this.set(StorageKeys.CAMERA_ENABLED, enabled);
	}

	/**
	 * @internal
	 * Returns true only if the participant has the microphone deliberately enabled
	 */
	isMicrophoneEnabled(): boolean {
		const value = this.get(StorageKeys.MICROPHONE_ENABLED);
		return value === null ? true : value === true;
	}

	setMicrophoneEnabled(enabled: boolean): void {
		this.set(StorageKeys.MICROPHONE_ENABLED, enabled);
	}

	setLang(lang: string): void {
		this.set(StorageKeys.LANG, lang);
	}

	getLang(): string {
		return this.get(StorageKeys.LANG);
	}

	setCaptionLang(lang: string): void {
		this.set(StorageKeys.CAPTION_LANG, lang);
	}

	getCaptionsLang(): string {
		return this.get(StorageKeys.CAPTION_LANG);
	}

	setBackground(id: string): void {
		this.set(StorageKeys.BACKGROUND, id);
	}

	getBackground(): string {
		return this.get(StorageKeys.BACKGROUND);
	}

	removeBackground(): void {
		this.remove(StorageKeys.BACKGROUND);
	}

	// Core storage methods with improved error handling and caching
	protected set(key: string, item: any): void {
		if (!this.isStorageAvailable) {
			this.log.w(`Storage not available, cannot set key: ${key}`);
			return;
		}

		try {
			if (SESSION_KEYS.includes(key as StorageKeys)) {
				this.setSessionValue(key, item);
			} else {
				this.setLocalValue(key, item);
			}
		} catch (e) {
			this.log.e(`Failed to set storage key: ${key}`, e);
		}
	}

	protected get(key: string): any {
		if (!this.isStorageAvailable) {
			return null;
		}

		try {
			if (SESSION_KEYS.includes(key as StorageKeys)) {
				return this.getSessionValue(key);
			} else {
				return this.getLocalValue(key);
			}
		} catch (e) {
			this.log.e(`Failed to get storage key: ${key}`, e);
			return null;
		}
	}

	protected remove(key: string): void {
		if (!this.isStorageAvailable) {
			return;
		}

		try {
			if (SESSION_KEYS.includes(key as StorageKeys)) {
				this.removeSessionValue(key);
			} else {
				this.removeLocalValue(key);
			}
		} catch (e) {
			this.log.e(`Failed to remove storage key: ${key}`, e);
		}
	}

	/**
	 * Determines if a key should use tab-specific storage in localStorage
	 */
	private shouldUseTabSpecificKey(key: string): boolean {
		return TAB_SPECIFIC_KEYS.includes(key as StorageKeys);
	}

	/**
	 * Sets value in localStorage with optimized serialization and caching
	 */
	private setLocalValue(key: string, item: any, useCache: boolean = true): void {
		if (!this.isStorageAvailable) return;

		const storageKey = this.shouldUseTabSpecificKey(key)
			? `${this.PREFIX_KEY}${this.tabId}_${key}`
			: `${this.PREFIX_KEY}${key}`;

		try {
			// Optimize serialization for primitive types
			let value: string;
			if (item === null || item === undefined) {
				value = JSON.stringify({ item: null });
			} else if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
				value = JSON.stringify({ item: item });
			} else {
				value = JSON.stringify({ item: item });
			}

			this.localStorage.setItem(storageKey, value);

			// Update cache
			if (useCache) {
				this.cache.set(storageKey, item);
				this.cacheTimeout.set(storageKey, Date.now() + this.CACHE_TTL);
			}
		} catch (e) {
			this.log.e(`Failed to set localStorage key: ${storageKey}`, e);
		}
	}

	/**
	 * Gets value from localStorage with caching optimization
	 */
	private getLocalValue(key: string, useCache: boolean = true): any {
		if (!this.isStorageAvailable) return null;

		const storageKey = this.shouldUseTabSpecificKey(key)
			? `${this.PREFIX_KEY}${this.tabId}_${key}`
			: `${this.PREFIX_KEY}${key}`;

		// Check cache first
		if (useCache && this.cache.has(storageKey)) {
			const timeout = this.cacheTimeout.get(storageKey);
			if (timeout && Date.now() < timeout) {
				return this.cache.get(storageKey);
			} else {
				// Cache expired
				this.cache.delete(storageKey);
				this.cacheTimeout.delete(storageKey);
			}
		}

		try {
			const str = this.localStorage.getItem(storageKey);
			if (str) {
				const parsed = JSON.parse(str);
				const value = parsed.item;

				// Update cache
				if (useCache) {
					this.cache.set(storageKey, value);
					this.cacheTimeout.set(storageKey, Date.now() + this.CACHE_TTL);
				}

				return value;
			}
		} catch (e) {
			this.log.e(`Failed to parse localStorage key: ${storageKey}`, e);
			// Remove corrupted data
			try {
				this.localStorage.removeItem(storageKey);
			} catch (removeError) {
				this.log.e(`Failed to remove corrupted key: ${storageKey}`, removeError);
			}
		}
		return null;
	}

	/**
	 * Removes value from localStorage with cache cleanup
	 */
	private removeLocalValue(key: string): void {
		if (!this.isStorageAvailable) return;

		const storageKey = this.shouldUseTabSpecificKey(key)
			? `${this.PREFIX_KEY}${this.tabId}_${key}`
			: `${this.PREFIX_KEY}${key}`;

		try {
			this.localStorage.removeItem(storageKey);
			// Clear from cache
			this.cache.delete(storageKey);
			this.cacheTimeout.delete(storageKey);
		} catch (e) {
			this.log.e(`Failed to remove localStorage key: ${storageKey}`, e);
		}
	}

	/**
	 * Sets value in sessionStorage with error handling
	 */
	private setSessionValue(key: string, item: any): void {
		if (!this.isStorageAvailable) return;

		try {
			const value = JSON.stringify({ item: item });
			this.sessionStorage.setItem(this.PREFIX_KEY + key, value);
		} catch (e) {
			this.log.e(`Failed to set sessionStorage key: ${key}`, e);
		}
	}

	/**
	 * Gets value from sessionStorage with error handling
	 */
	private getSessionValue(key: string): any {
		if (!this.isStorageAvailable) return null;

		try {
			const str = this.sessionStorage.getItem(this.PREFIX_KEY + key);
			if (str) {
				const parsed = JSON.parse(str);
				return parsed.item;
			}
		} catch (e) {
			this.log.e(`Failed to parse sessionStorage key: ${key}`, e);
			// Remove corrupted data
			try {
				this.sessionStorage.removeItem(this.PREFIX_KEY + key);
			} catch (removeError) {
				this.log.e(`Failed to remove corrupted sessionStorage key: ${key}`, removeError);
			}
		}
		return null;
	}

	/**
	 * Removes value from sessionStorage
	 */
	private removeSessionValue(key: string): void {
		if (!this.isStorageAvailable) return;

		try {
			this.sessionStorage.removeItem(this.PREFIX_KEY + key);
		} catch (e) {
			this.log.e(`Failed to remove sessionStorage key: ${key}`, e);
		}
	}

	/**
	 * Optimized clear method that safely iterates and removes items
	 */
	public clear(): void {
		if (!this.isStorageAvailable) return;

		this.log.d('Clearing localStorage and sessionStorage');

		// Clear localStorage with safe iteration
		this.clearStorageByPrefix(this.localStorage, this.PREFIX_KEY);

		// Clear sessionStorage with safe iteration
		this.clearStorageByPrefix(this.sessionStorage, this.PREFIX_KEY);

		// Clear caches
		this.cache.clear();
		this.cacheTimeout.clear();
	}

	/**
	 * Safely clears storage by collecting keys first, then removing
	 */
	private clearStorageByPrefix(storage: Storage, prefix: string): void {
		try {
			const keysToRemove: string[] = [];

			// Collect keys to remove
			for (let i = 0; i < storage.length; i++) {
				const key = storage.key(i);
				if (key && key.startsWith(prefix)) {
					keysToRemove.push(key);
				}
			}

			// Remove collected keys
			for (const key of keysToRemove) {
				storage.removeItem(key);
			}
		} catch (e) {
			this.log.e('Failed to clear storage', e);
		}
	}

	/**
	 * Clears only session data (tab-specific data)
	 */
	public clearSessionData(): void {
		if (!this.isStorageAvailable) return;

		this.log.d('Clearing session data');
		this.clearStorageByPrefix(this.sessionStorage, this.PREFIX_KEY);
	}

	/**
	 * Clears only tab-specific data for current tab
	 */
	public clearTabSpecificData(): void {
		if (!this.isStorageAvailable) return;

		this.log.d('Clearing tab-specific data');
		TAB_SPECIFIC_KEYS.forEach((key) => {
			this.removeLocalValue(key);
		});
	}

	/**
	 * Clears only persistent data
	 */
	public clearPersistentData(): void {
		if (!this.isStorageAvailable) return;

		this.log.d('Clearing persistent data');

		// Clear shared persistent keys
		SHARED_PERSISTENT_KEYS.forEach((key) => {
			this.removeLocalValue(key);
		});

		// Clear tab management keys
		TAB_MANAGEMENT_KEYS.forEach((key) => {
			this.removeLocalValue(key);
		});
	}

	/**
	 * Cleanup method to be called when service is destroyed
	 */
	public destroy(): void {
		// Clear interval
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
			this.cleanupInterval = null;
		}

		// Close BroadcastChannel
		if (this.broadcastChannel) {
			this.broadcastChannel.close();
			this.broadcastChannel = null;
		}

		// Unregister tab
		this.unregisterActiveTab();

		// Clear caches
		this.cache.clear();
		this.cacheTimeout.clear();
	}

	/**
	 * Angular lifecycle hook - called when service is destroyed
	 */
	ngOnDestroy(): void {
		this.destroy();
	}
}
