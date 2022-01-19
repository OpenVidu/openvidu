export interface CustomDevice {
	label: string;
	device: string;
	type?: CameraType;
}

export enum CameraType {
	FRONT = 'FRONT',
	BACK = 'BACK'
}

export enum DeviceType {
	AUDIO_INPUT = 'audioinput',
	VIDEO_INPUT = 'videoinput'
}