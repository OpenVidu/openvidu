import { Injectable } from '@angular/core';
import { CameraType, CustomDevice } from '../../models/device.model';

@Injectable()
export class DeviceServiceMock {
	audioDevice: CustomDevice = {
		label: 'audio',
		device: 'mockDevice'
	};
	videodevice: CustomDevice = {
		label: 'video',
		device: 'mockDevice',
		type: CameraType.FRONT
	};

	constructor() {}

	async initDevices() {}

	getCamSelected(): CustomDevice {
		return this.videodevice;
	}

	getMicSelected(): CustomDevice {
		return this.audioDevice;
	}

	setCamSelected(deviceField: any) {}

	setMicSelected(deviceField: any) {}

	needUpdateVideoTrack(newVideoSource: string): boolean {
		return false;
	}

	needUpdateAudioTrack(newAudioSource: string): boolean {
		return false;
	}

	getCameras(): CustomDevice[] {
		return [this.videodevice];
	}

	getMicrophones(): CustomDevice[] {
		return [this.audioDevice];
	}

	hasVideoDeviceAvailable(): boolean {
		return true;
	}

	hasAudioDeviceAvailable(): boolean {
		return true;
	}

	cameraNeedsMirror(deviceField: string): boolean {
		return true;
	}

	disableVideoDevices() {	}

	clear() {}
}
