import { Injectable } from '@angular/core';
import { CameraType, CustomDevice, DeviceType } from '../../models/device.model';
import { ILogger } from '../../models/logger.model';
import { LoggerService } from '../logger/logger.service';
import { PlatformService } from '../platform/platform.service';
import { StorageService } from '../storage/storage.service';
import { LocalTrack, Room, createLocalTracks } from 'livekit-client';

/**
 * @internal
 */
@Injectable({
	providedIn: 'root'
})
export class DeviceService {
	private devices: MediaDeviceInfo[];
	private cameras: CustomDevice[] = [];
	private microphones: CustomDevice[] = [];
	private cameraSelected?: CustomDevice;
	private microphoneSelected?: CustomDevice;
	private log: ILogger;
	private videoDevicesEnabled: boolean = true;
	private audioDevicesEnabled: boolean = true;
	private deviceAccessDeniedError: boolean = false;

	constructor(
		private loggerSrv: LoggerService,
		private platformSrv: PlatformService,
		private storageSrv: StorageService
	) {
		this.log = this.loggerSrv.get('DevicesService');
	}

	/**
	 * Initialize media devices and select a devices checking in local storage (if exists) or
	 * first devices found by default
	 */
	async initializeDevices() {
		this.clear();

		try {
			this.devices = await this.getLocalDevices();
			if (this.deviceAccessDeniedError) {
				this.log.w('Media devices permissions were not granted.');
				return;
			}

			this.initializeCustomDevices();
			this.updateSelectedDevices();
			this.log.d('Media devices', this.cameras, this.microphones);
		} catch (error) {
			this.log.e('Error getting media devices', error);
		}
	}

	/**
	 * Check and update the media devices available
	 */
	async refreshDevices() {
		if (!this.deviceAccessDeniedError) {
			this.devices = await this.getLocalDevices();
			this.initializeCustomDevices();
		}
	}

	private initializeCustomDevices(): void {
		this.cameras = this.devices
			.filter((d) => d.kind === DeviceType.VIDEO_INPUT)
			.map((d) => this.createCustomDevice(d, CameraType.BACK));
		this.microphones = this.devices
			.filter((d) => d.kind === DeviceType.AUDIO_INPUT)
			.map((d) => ({ label: d.label, device: d.deviceId }));

		if (this.platformSrv.isMobile()) {
			this.cameras.forEach((c) => {
				if (c.label.toLowerCase().includes(CameraType.FRONT.toLowerCase())) {
					c.type = CameraType.FRONT;
				}
			});
		} else if (this.cameras.length > 0) {
			this.cameras[0].type = CameraType.FRONT;
		}
	}

	private createCustomDevice(device: MediaDeviceInfo, defaultType: CameraType): CustomDevice {
		return {
			label: device.label,
			device: device.deviceId,
			type: defaultType
		};
	}

	private updateSelectedDevices() {
		this.cameraSelected = this.getDeviceFromStorage(this.cameras, this.storageSrv.getVideoDevice()) || this.cameras[0];
		this.microphoneSelected = this.getDeviceFromStorage(this.microphones, this.storageSrv.getAudioDevice()) || this.microphones[0];
	}

	private getDeviceFromStorage(devices: CustomDevice[], storageDevice: CustomDevice | null): CustomDevice | undefined {
		if (!storageDevice) return;
		return devices.find((d) => d.device === storageDevice.device);
	}

	/**
	 * @internal
	 */
	isCameraEnabled(): boolean {
		return this.hasVideoDeviceAvailable() && this.storageSrv.isCameraEnabled();
	}

	isMicrophoneEnabled(): boolean {
		return this.hasAudioDeviceAvailable() && this.storageSrv.isMicrophoneEnabled();
	}

	getCameraSelected(): CustomDevice | undefined {
		return this.cameraSelected;
	}

	getMicrophoneSelected(): CustomDevice | undefined {
		return this.microphoneSelected;
	}

	setCameraSelected(deviceId: any) {
		this.cameraSelected = this.getDeviceById(this.cameras, deviceId);
		const saveFunction = (device) => this.storageSrv.setVideoDevice(device);
		this.saveDeviceToStorage(this.cameraSelected, saveFunction);
	}

	setMicSelected(deviceId: string) {
		this.microphoneSelected = this.getDeviceById(this.microphones, deviceId);
		const saveFunction = (device) => this.storageSrv.setAudioDevice(device);
		this.saveDeviceToStorage(this.microphoneSelected, saveFunction);
	}

	needUpdateVideoTrack(newDevice: CustomDevice): boolean {
		return this.cameraSelected?.device !== newDevice.device || this.cameraSelected?.label !== newDevice.label;
	}

	needUpdateAudioTrack(newDevice: CustomDevice): boolean {
		return this.microphoneSelected?.device !== newDevice.device || this.microphoneSelected?.label !== newDevice.label;
	}

	getCameras(): CustomDevice[] {
		return this.cameras;
	}

	getMicrophones(): CustomDevice[] {
		return this.microphones;
	}

	hasVideoDeviceAvailable(): boolean {
		return this.videoDevicesEnabled && this.cameras.length > 0;
	}

	hasAudioDeviceAvailable(): boolean {
		return this.audioDevicesEnabled && this.microphones.length > 0;
	}

	clear() {
		this.devices = [];
		this.cameras = [];
		this.microphones = [];
		this.cameraSelected = undefined;
		this.microphoneSelected = undefined;
		this.videoDevicesEnabled = true;
		this.audioDevicesEnabled = true;
	}

	private getDeviceById(devices: CustomDevice[], deviceId: string): CustomDevice | undefined {
		return devices.find((d) => d.device === deviceId);
	}

	private saveDeviceToStorage(device: CustomDevice | undefined, saveFunction: (device: CustomDevice) => void) {
		if (device) saveFunction(device);
	}

	/**
	 * Retrieves the local media devices (audio and video) available for the user.
	 *
	 * @returns A promise that resolves to an array of `MediaDeviceInfo` objects representing the available local devices.
	 */
	private async getLocalDevices(): Promise<MediaDeviceInfo[]> {
		// Forcing media permissions request.
		const strategies = [
			{ audio: true, video: true },
			{ audio: true, video: false },
			{ audio: false, video: true }
		];

		for (const strategy of strategies) {
			try {
				this.log.d(`Trying strategy: audio=${strategy.audio}, video=${strategy.video}`);
				const localTracks = await createLocalTracks(strategy);
				localTracks.forEach((track) => track.stop());

				// Permission granted
				const devices = this.platformSrv.isFirefox() ? await this.getMediaDevicesFirefox() : await Room.getLocalDevices();

				return devices.filter((d: MediaDeviceInfo) => d.label && d.deviceId && d.deviceId !== 'default');
			} catch (error: any) {
				this.log.w(`Strategy failed: audio=${strategy.audio}, video=${strategy.video}`, error);

				// If it's the last attempt and failed, we handle the error
				if (strategy === strategies[strategies.length - 1]) {
					return await this.handleFinalFallback(error);
				}
			}
		}

		return [];
	}

	private async getMediaDevicesFirefox(): Promise<MediaDeviceInfo[]> {
		// Firefox requires to get user media to get the devices
		await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
		return navigator.mediaDevices.enumerateDevices();
	}

	private async handleFinalFallback(error: any): Promise<MediaDeviceInfo[]> {
		this.log.w('All permission strategies failed, trying device enumeration without permissions');

		try {
			if (error?.name === 'NotReadableError' || error?.name === 'AbortError') {
				this.log.w('Device busy, using enumerateDevices() instead');
				const devices = await navigator.mediaDevices.enumerateDevices();
				return devices.filter((d) => d.deviceId && d.deviceId !== 'default');
			}
			if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') {
				this.log.w('Permission denied to access devices');
				this.deviceAccessDeniedError = true;
			}
			return [];
		} catch (error) {
			this.log.e('Complete failure getting devices', error);
			this.deviceAccessDeniedError = true;
			return [];
		}
	}
}
