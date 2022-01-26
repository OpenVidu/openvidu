import { Injectable } from '@angular/core';
import { Device, OpenVidu } from 'openvidu-browser';

import { CameraType, DeviceType, CustomDevice } from '../../models/device.model';
import { ILogger } from '../../models/logger.model';
import { Storage } from '../../models/storage.model';

import { LoggerService } from '../logger/logger.service';
import { PlatformService } from '../platform/platform.service';
import { StorageService } from '../storage/storage.service';

@Injectable({
	providedIn: 'root'
})
export class DeviceService {
	private OV: OpenVidu = null;
	private devices: Device[];
	private cameras: CustomDevice[] = [];
	private microphones: CustomDevice[] = [];
	private cameraSelected: CustomDevice;
	private microphoneSelected: CustomDevice;
	private log: ILogger;
	private videoDevicesDisabled: boolean;
	private audioDevicesDisabled: boolean;

	constructor(private loggerSrv: LoggerService, private platformSrv: PlatformService, private storageSrv: StorageService) {
		this.log = this.loggerSrv.get('DevicesService');
		this.OV = new OpenVidu();
	}

	async forceUpdate() {
		await this.initializeDevices();
	}

	async initializeDevices() {
		// Requesting media permissions. Sometimes, browser doens't launch the media permissions modal.
		const mediaStream = await this.OV.getUserMedia({audioSource: undefined, videoSource: undefined });

		this.devices = await this.OV.getDevices();
		const customDevices = this.initializeCustomDevices(this.devices);
		this.cameras = customDevices.cameras;
		this.microphones = customDevices.microphones;

		mediaStream?.getAudioTracks().forEach((track) => track.stop());
		mediaStream?.getVideoTracks().forEach((track) => track.stop());

		this.log.d('Media devices',customDevices);
	}

	private initializeCustomDevices(defaultVDevices: Device[]) {
		const FIRST_POSITION = 0;
		const defaultMicrophones = defaultVDevices.filter((device) => device.kind === DeviceType.AUDIO_INPUT);
		const defaultCameras = defaultVDevices.filter((device) => device.kind === DeviceType.VIDEO_INPUT);
		const customDevices: { cameras: CustomDevice[]; microphones: CustomDevice[] } = {
			cameras: [{ label: 'None', device: null, type: null }],
			microphones: [{ label: 'None', device: null, type: null }]
		};

		if (this.hasAudioDeviceAvailable) {
			defaultMicrophones.forEach((device: Device) => {
				customDevices.microphones.push({ label: device.label, device: device.deviceId });
			});

			// Settings microphone selected
			const storageMicrophone = this.getMicrophoneFromStogare();
			if (!!storageMicrophone) {
				this.microphoneSelected = storageMicrophone;
			} else if (customDevices.microphones.length > 0) {
				this.microphoneSelected = customDevices.microphones.find((d) => d.label !== 'None');
			}
		}

		if (this.hasVideoDeviceAvailable) {
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
				customDevices.cameras.push(myDevice);
			});

			// Setting camera selected
			const storageCamera = this.getCameraFromStorage();
			if (!!storageCamera) {
				this.cameraSelected = storageCamera;
			} else if (customDevices.cameras.length > 0) {
				this.cameraSelected = customDevices.cameras.find((d) => d.label !== 'None');
			}
		}
		return customDevices;
	}

	getCameraSelected(): CustomDevice {
		return this.cameraSelected;
	}

	getMicrophoneSelected(): CustomDevice {
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
		return this.cameraSelected.device !== newVideoSource;
	}

	needUpdateAudioTrack(newAudioSource: string): boolean {
		return this.microphoneSelected.device !== newAudioSource;
	}

	getCameras(): CustomDevice[] {
		return this.cameras;
	}

	getMicrophones(): CustomDevice[] {
		return this.microphones;
	}

	hasVideoDeviceAvailable(): boolean {
		return !this.videoDevicesDisabled && !this.cameras.every((device) => device.label === 'None');
	}

	hasAudioDeviceAvailable(): boolean {
		return !this.audioDevicesDisabled && !this.microphones.every((device) => device.label === 'None');
	}

	cameraNeedsMirror(deviceField: string): boolean {
		return this.getCameraByDeviceField(deviceField)?.type === CameraType.FRONT;
	}

	areEmptyLabels(): boolean {
		return !!this.cameras.find((device) => device.label === '') || !!this.microphones.find((device) => device.label === '');
	}

	disableVideoDevices() {
		this.videoDevicesDisabled = true;
	}

	disableAudioDevices() {
		this.audioDevicesDisabled = true;
	}

	clear() {
		this.OV = new OpenVidu();
		this.devices = [];
		this.cameras = [];
		this.microphones = [];
		this.cameraSelected = null;
		this.microphoneSelected = null;
		this.videoDevicesDisabled = false;
		this.audioDevicesDisabled = false;
	}

	private getCameraByDeviceField(deviceField: any): CustomDevice {
		return this.cameras.find((opt: CustomDevice) => opt.device === deviceField || opt.label === deviceField);
	}

	private getMicrophoneByDeviceField(deviceField: any): CustomDevice {
		return this.microphones.find((opt: CustomDevice) => opt.device === deviceField || opt.label === deviceField);
	}

	private getMicrophoneFromStogare(): CustomDevice {
		let storageDevice = this.storageSrv.get(Storage.AUDIO_DEVICE);
		if (!!storageDevice) {
			return storageDevice;
		}
	}

	private getCameraFromStorage() {
		let storageDevice = this.storageSrv.get(Storage.VIDEO_DEVICE);
		if (!!storageDevice) {
			return storageDevice;
		}
	}

	private saveCameraToStorage(cam: CustomDevice) {
		this.storageSrv.set(Storage.VIDEO_DEVICE, cam);
	}

	private saveMicrophoneToStorage(mic: CustomDevice) {
		this.storageSrv.set(Storage.AUDIO_DEVICE, mic);
	}
}
