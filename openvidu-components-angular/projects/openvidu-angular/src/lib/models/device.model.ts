/**
 * @internal
 */
export interface CustomDevice {
	label: string;
	device: string;
	type?: CameraType;
}

/**
 * @internal
 */
export enum CameraType {
	FRONT = 'FRONT',
	BACK = 'BACK'
}

/**
 * @internal
 */
export enum DeviceType {
	AUDIO_INPUT = 'audioinput',
	VIDEO_INPUT = 'videoinput'
}
