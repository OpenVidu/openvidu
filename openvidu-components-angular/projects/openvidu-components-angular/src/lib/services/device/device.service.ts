import { Injectable } from '@angular/core';
import { CameraType, CustomDevice, DeviceType } from '../../models/device.model';
import { ILogger } from '../../models/logger.model';
import { OpenViduComponentsConfigService } from '../config/openvidu-components-angular.config.service';

import { LoggerService } from '../logger/logger.service';
import { PlatformService } from '../platform/platform.service';
import { StorageService } from '../storage/storage.service';
import { LocalTrack, Room, Track, createLocalTracks } from 'livekit-client';

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
	private cameraSelected: CustomDevice | undefined;
	private microphoneSelected: CustomDevice | undefined;
	private log: ILogger;
	private videoDevicesEnabled: boolean = true;
	private audioDevicesEnabled: boolean = true;

	// Initialized with Storage.CAMERA_ENABLED info saved on storage
	private _isCameraEnabled: boolean;
	// Initialized with Storage.MICROPHONE_ENABLED info saved on storage
	private _isMicrophoneEnabled: boolean;
	// Whether the media devices permission have been rejected or not
	private deviceAccessDeniedError: boolean = false;

	constructor(
		private loggerSrv: LoggerService,
		private platformSrv: PlatformService,
		private storageSrv: StorageService,
		private libSrv: OpenViduComponentsConfigService
	) {
		this.log = this.loggerSrv.get('DevicesService');
	}

	/**
	 * Initialize media devices and select a devices checking in local storage (if exists) or
	 * first devices found by default
	 */
	async forceInitDevices() {
		this.clear();

		try {
			this.devices = await this.getLocalDevices();
		} catch (error) {
			this.log.e('Error getting media devices', error);
			// TODO: Fix this error
			// this.deviceAccessDeniedError = (<OpenViduError>error).name === OpenViduErrorName.DEVICE_ACCESS_DENIED;
			// if (this.deviceAccessDeniedError) {
			// 	this.disableVideoDevices();
			// 	this.disableAudioDevices();
			// }
		} finally {
			if (this.deviceAccessDeniedError) {
				this.log.w('Media devices permissions were not granted.');
			} else {
				this.initializeCustomDevices();
				this.updateAudioDeviceSelected();
				this.updateVideoDeviceSelected();

				this._isCameraEnabled = this.storageSrv.isCameraEnabled() || this.libSrv.isVideoEnabled();
				this._isMicrophoneEnabled = this.storageSrv.isMicrophoneEnabled() || this.libSrv.isAudioEnabled();

				this.log.d('Media devices', this.cameras, this.microphones);
			}
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

	private initializeCustomDevices(updateSelected: boolean = true): void {
		const FIRST_POSITION = 0;
		const defaultMicrophones: MediaDeviceInfo[] = this.devices.filter((device) => device.kind === DeviceType.AUDIO_INPUT);
		const defaultCameras: MediaDeviceInfo[] = this.devices.filter((device) => device.kind === DeviceType.VIDEO_INPUT);

		if (defaultMicrophones.length > 0) {
			this.microphones = [];
			defaultMicrophones.forEach((device: MediaDeviceInfo) => {
				this.microphones.push({ label: device.label, device: device.deviceId });
			});
		}

		if (defaultCameras.length > 0) {
			this.cameras = [];
			defaultCameras.forEach((device: MediaDeviceInfo, index: number) => {
				const myDevice: CustomDevice = {
					label: device.label,
					device: device.deviceId,
					type: CameraType.BACK
				};
				if (this.platformSrv.isMobile()) {
					// We assume front video device has 'front' in its label in Mobile devices
					if (myDevice.label.toLowerCase().includes(CameraType.FRONT.toLowerCase())) {
						myDevice.type = CameraType.FRONT;
					}
				} else {
					// We assume first device is web camera in Browser Desktop
					if (index === FIRST_POSITION) {
						myDevice.type = CameraType.FRONT;
					}
				}
				this.cameras.push(myDevice);
			});
		}
	}

	private updateAudioDeviceSelected() {
		// Setting microphone selected
		if (this.microphones.length > 0) {
			const storageMicrophone = this.getMicrophoneFromStogare();
			if (!!storageMicrophone) {
				this.microphoneSelected = storageMicrophone;
			} else if (this.microphones.length > 0) {
				if (this.deviceAccessDeniedError && this.microphones.length > 1) {
					// We assume that the default device is already in use
					// Assign an alternative device with the aim of avoiding the DEVICE_ALREADY_IN_USE error
					this.microphoneSelected = this.microphones[1];
				} else {
					this.microphoneSelected = this.microphones[0];
				}
			}
		}
	}

	private updateVideoDeviceSelected() {
		// Setting camera selected
		if (this.cameras.length > 0) {
			const storageCamera = this.getCameraFromStorage();
			if (!!storageCamera) {
				this.cameraSelected = storageCamera;
			} else if (this.cameras.length > 0) {
				if (this.deviceAccessDeniedError && this.cameras.length > 1) {
					// We assume that the default device is already in use
					// Assign an alternative device with the aim of avoiding the DEVICE_ALREADY_IN_USE error
					this.cameraSelected = this.cameras[1];
				} else {
					this.cameraSelected = this.cameras[0];
				}
			}
		}
	}

	/**
	 * @internal
	 */
	isCameraEnabled(): boolean {
		return this.hasVideoDeviceAvailable() && this._isCameraEnabled;
	}

	isMicrophoneEnabled(): boolean {
		return this.hasAudioDeviceAvailable() && this._isMicrophoneEnabled;
	}

	getCameraSelected(): CustomDevice | undefined {
		return this.cameraSelected;
	}

	getMicrophoneSelected(): CustomDevice | undefined {
		return this.microphoneSelected;
	}

	setCameraSelected(deviceId: any) {
		this.cameraSelected = this.getCameraByDeviceField(deviceId);
		this.saveCameraToStorage(this.cameraSelected);
	}

	setMicSelected(deviceField: any) {
		this.microphoneSelected = this.getMicrophoneByDeviceField(deviceField);
		this.saveMicrophoneToStorage(this.microphoneSelected);
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

	cameraNeedsMirror(deviceField: string): boolean {
		return this.getCameraByDeviceField(deviceField)?.type === CameraType.FRONT;
	}

	disableVideoDevices() {
		this.videoDevicesEnabled = false;
	}

	disableAudioDevices() {
		this.audioDevicesEnabled = false;
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

	private getCameraByDeviceField(deviceField: any): CustomDevice {
		return <CustomDevice>this.cameras.find((opt: CustomDevice) => opt.device === deviceField || opt.label === deviceField);
	}

	private getMicrophoneByDeviceField(deviceField: any): CustomDevice {
		return <CustomDevice>this.microphones.find((opt: CustomDevice) => opt.device === deviceField || opt.label === deviceField);
	}

	private getMicrophoneFromStogare(): CustomDevice | undefined {
		const storageDevice: CustomDevice | null = this.storageSrv.getAudioDevice();
		if (!!storageDevice && this.microphones.some((device) => device.device === storageDevice.device)) {
			return storageDevice;
		}
	}

	private getCameraFromStorage() {
		const storageDevice: CustomDevice | null = this.storageSrv.getVideoDevice();
		if (!!storageDevice && this.cameras.some((device) => device.device === storageDevice.device)) {
			return storageDevice;
		}
	}

	private saveCameraToStorage(cam: CustomDevice) {
		this.storageSrv.setVideoDevice(cam);
	}

	private saveMicrophoneToStorage(mic: CustomDevice) {
		this.storageSrv.setAudioDevice(mic);
	}

	/**
	 * Retrieves the local media devices (audio and video) available for the user.
	 *
	 * @returns A promise that resolves to an array of `MediaDeviceInfo` objects representing the available local devices.
	 */
	private async getLocalDevices(): Promise<MediaDeviceInfo[]> {
		// Forcing media permissions request.
		let localTracks: LocalTrack[] = [];
		try {
			try {
				localTracks = await createLocalTracks({ audio: true, video: true });
				localTracks.forEach((track) => track.stop());
			} catch (error) {
				this.log.e('Error getting local audio tracks', error);
			}

			const devices = this.platformSrv.isFirefox() ? await this.getMediaDevicesFirefox() : await Room.getLocalDevices();
			return devices.filter((d: MediaDeviceInfo) => d.label && d.deviceId && d.deviceId !== 'default');
		} catch (error) {
			this.log.e('Error getting local devices', error);
			return [];
		}
	}

	private async getMediaDevicesFirefox(): Promise<MediaDeviceInfo[]> {
		// Firefox requires to get user media to get the devices
		await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
		return navigator.mediaDevices.enumerateDevices();
	}
}
