import { Injectable } from '@angular/core';
import { ILogger } from '../../models/logger.model';
import { STORAGE_PREFIX, StorageKeys } from '../../models/storage.model';
import { LoggerService } from '../logger/logger.service';
import { CustomDevice } from '../../models/device.model';

/**
 * @internal
 */
@Injectable({
	providedIn: 'root'
})
export class StorageService {
	public storage = window.localStorage;
	public log: ILogger;
	protected PREFIX_KEY = STORAGE_PREFIX;

	constructor(protected loggerSrv: LoggerService) {
		this.log = this.loggerSrv.get('StorageService');
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
		const value = JSON.stringify({ item: item });
		this.storage.setItem(this.PREFIX_KEY + key, value);
	}

	protected get(key: string): any {
		const str = this.storage.getItem(this.PREFIX_KEY + key);
		if (!!str) {
			return JSON.parse(str).item;
		}
		return null;
	}

	protected remove(key: string) {
		this.storage.removeItem(this.PREFIX_KEY + key);
	}

	public clear() {
		this.log.d('Clearing localStorage');
		this.storage.clear();
	}
}
