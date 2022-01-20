import { Injectable } from '@angular/core';
import { CameraType, IDevice } from '../../models/device.model';

@Injectable()
export class DeviceServiceMock {
	audioDevice: IDevice = {
		label: 'audio',
		device: 'mockDevice'
	};
	videodevice: IDevice = {
		label: 'video',
		device: 'mockDevice',
		type: CameraType.FRONT
	};

	constructor() {}

	async initDevices() {}

	getCamSelected(): IDevice {
		return this.videodevice;
	}

	getMicSelected(): IDevice {
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

	getCameras(): IDevice[] {
		return [this.videodevice];
	}

	getMicrophones(): IDevice[] {
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
