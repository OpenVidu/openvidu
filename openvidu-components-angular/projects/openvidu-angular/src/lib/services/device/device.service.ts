import { Injectable } from '@angular/core';
import { Device, OpenVidu, OpenViduError, OpenViduErrorName } from 'openvidu-browser';

import { CameraType, CustomDevice, DeviceType } from '../../models/device.model';
import { ILogger } from '../../models/logger.model';
import { OpenViduAngularConfigService } from '../config/openvidu-angular.config.service';

import { LoggerService } from '../logger/logger.service';
import { PlatformService } from '../platform/platform.service';
import { StorageService } from '../storage/storage.service';

/**
 * @internal
 */
@Injectable({
	providedIn: 'root'
})
export class DeviceService {
	private OV: OpenVidu | null = null;
	private devices: Device[];
	private cameras: CustomDevice[] = [];
	private microphones: CustomDevice[] = [];
	private cameraSelected: CustomDevice | null;
	private microphoneSelected: CustomDevice | null;
	private log: ILogger;
	private videoDevicesEnabled: boolean = true;
	private audioDevicesEnabled: boolean = true;

	// Initialized with Storage.VIDEO_MUTED info saved on storage
	private _isVideoMuted: boolean;
	// Initialized with Storage.AUDIO_MUTED info saved on storage
	private _isAudioMuted: boolean;
	// Whether the media devices permission have been rejected or not
	private deviceAccessDeniedError: boolean = false;

	constructor(
		private loggerSrv: LoggerService,
		private platformSrv: PlatformService,
		private storageSrv: StorageService,
		private libSrv: OpenViduAngularConfigService
	) {
		this.log = this.loggerSrv.get('DevicesService');
	}

	/**
	 * Initialize media devices and select a devices checking in local storage (if exists) or
	 * first devices found by default
	 */
	async forceInitDevices() {
		this.clear();
		this.OV = new OpenVidu();

		try {
			// if (this.devices?.some((device) => !device.deviceId || !device.label)) {
			// Forcing media permissions request.
			// Sometimes, browser doesn't request the media permissions.
			await this.OV.getUserMedia({ audioSource: undefined, videoSource: undefined });
			// }
			this.devices = await this.getOpenViduDevices();
		} catch (error) {
			this.deviceAccessDeniedError = (<OpenViduError>error).name === OpenViduErrorName.DEVICE_ACCESS_DENIED;
			if (this.deviceAccessDeniedError) {
				this.disableVideoDevices();
				this.disableAudioDevices();
			}
		} finally {
			if (this.deviceAccessDeniedError) {
				this.log.w('Media devices permissions were not granted.');
			} else {
				this.initializeCustomDevices();
				this.updateAudioDeviceSelected();
				this.updateVideoDeviceSelected();

				this._isVideoMuted = this.storageSrv.isVideoMuted() || this.libSrv.videoMuted.getValue();
				this._isAudioMuted = this.storageSrv.isAudioMuted() || this.libSrv.audioMuted.getValue();

				this.log.d('Media devices', this.cameras, this.microphones);
			}
		}
	}

	/**
	 * Check and update the media devices devices available
	 */
	async refreshDevices() {
		if (!this.deviceAccessDeniedError) {
			this.devices = await this.getOpenViduDevices();
			this.initializeCustomDevices();
		}
	}

	private initializeCustomDevices(updateSelected: boolean = true): void {
		const FIRST_POSITION = 0;
		const defaultMicrophones: Device[] = this.devices.filter((device) => device.kind === DeviceType.AUDIO_INPUT);
		const defaultCameras: Device[] = this.devices.filter((device) => device.kind === DeviceType.VIDEO_INPUT);

		if (defaultMicrophones.length > 0) {
			this.microphones = [];
			defaultMicrophones.forEach((device: Device) => {
				this.microphones.push({ label: device.label, device: device.deviceId });
			});
		}

		if (defaultCameras.length > 0) {
			this.cameras = [];
			defaultCameras.forEach((device: Device, index: number) => {
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

	isVideoMuted(): boolean {
		return this.hasVideoDeviceAvailable() && this._isVideoMuted;
	}

	isAudioMuted(): boolean {
		return this.hasAudioDeviceAvailable() && this._isAudioMuted;
	}

	getCameraSelected(): CustomDevice | null {
		return this.cameraSelected;
	}

	getMicrophoneSelected(): CustomDevice | null {
		return this.microphoneSelected;
	}

	setCameraSelected(deviceField: any) {
		this.cameraSelected = this.getCameraByDeviceField(deviceField);
		this.saveCameraToStorage(this.cameraSelected);
	}

	setMicSelected(deviceField: any) {
		this.microphoneSelected = this.getMicrophoneByDeviceField(deviceField);
		this.saveMicrophoneToStorage(this.microphoneSelected);
	}

	needUpdateVideoTrack(newVideoSource: string): boolean {
		return this.cameraSelected?.device !== newVideoSource;
	}

	needUpdateAudioTrack(newAudioSource: string): boolean {
		return this.microphoneSelected?.device !== newAudioSource;
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
		this.OV = null;
		this.devices = [];
		this.cameras = [];
		this.microphones = [];
		this.cameraSelected = null;
		this.microphoneSelected = null;
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
		const storageDevice: CustomDevice = this.storageSrv.getAudioDevice();
		if (!!storageDevice && this.microphones.some((device) => device.device === storageDevice.device)) {
			return storageDevice;
		}
	}

	private getCameraFromStorage() {
		const storageDevice: CustomDevice = this.storageSrv.getVideoDevice();
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

	private async getOpenViduDevices(): Promise<Device[]> {
		let devices = (await this.OV?.getDevices()) || [];
		return devices.filter((d: Device) => !!d.label && !!d.deviceId);
	}
}
