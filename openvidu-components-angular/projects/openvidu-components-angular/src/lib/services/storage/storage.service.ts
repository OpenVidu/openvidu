import { Injectable } from '@angular/core';
import { ILogger } from '../../models/logger.model';
import { Storage } from '../../models/storage.model';
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

	constructor(private loggerSrv: LoggerService) {
		this.log = this.loggerSrv.get('StorageService');
	}

	getParticipantName(): string | null {
		return this.get(Storage.PARTICIPANT_NAME);
	}

	setParticipantName(name: string) {
		this.set(Storage.PARTICIPANT_NAME, name);
	}
	getVideoDevice(): CustomDevice | null {
		return this.get(Storage.VIDEO_DEVICE);
	}

	setVideoDevice(device: CustomDevice) {
		this.set(Storage.VIDEO_DEVICE, device);
	}

	getAudioDevice(): CustomDevice | null {
		return this.get(Storage.AUDIO_DEVICE);
	}

	setAudioDevice(device: CustomDevice) {
		this.set(Storage.AUDIO_DEVICE, device);
	}

	/**
	 * @internal
	 * Returns true only if the participant has the camera deliberately enabled
	 */
	isCameraEnabled(): boolean {
		const value = this.get(Storage.CAMERA_ENABLED);
		if (value === null) {
			return true;
		}
		return value === true;
	}

	setCameraEnabled(enabled: boolean) {
		this.set(Storage.CAMERA_ENABLED, enabled);
	}

	/**
	 * @internal
	 * Returns true only if the participant has the microphone deliberately enabled
	 */
	isMicrophoneEnabled(): boolean {
		const value = this.get(Storage.MICROPHONE_ENABLED);
		if (value === null) {
			return true;
		}
		return value === true;
	}

	/**
	 * @param enabled
	 */
	setMicrophoneEnabled(enabled: boolean) {
		this.set(Storage.MICROPHONE_ENABLED, enabled);
	}

	setLang(lang: string) {
		this.set(Storage.LANG, lang);
	}

	getLang(): string {
		return this.get(Storage.LANG);
	}

	setCaptionLang(lang: string) {
		this.set(Storage.CAPTION_LANG, lang);
	}

	getCaptionsLang(): string {
		return this.get(Storage.CAPTION_LANG);
	}

	setBackground(id: string) {
		this.set(Storage.BACKGROUND, id);
	}

	getBackground(): string {
		return this.get(Storage.BACKGROUND);
	}

	removeBackground() {
		this.remove(Storage.BACKGROUND);
	}

	private set(key: string, item: any) {
		const value = JSON.stringify({ item: item });
		this.storage.setItem(key, value);
	}
	private get(key: string): any {
		const str = this.storage.getItem(key);
		if (!!str) {
			return JSON.parse(str).item;
		}
		return null;
	}

	private remove(key: string) {
		this.storage.removeItem(key);
	}

	public clear() {
		this.log.d('Clearing localStorage');
		this.storage.clear();
	}
}
