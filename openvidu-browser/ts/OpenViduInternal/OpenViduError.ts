export enum OpenViduErrorName {
    CAMERA_ACCESS_DENIED = 'CAMERA_ACCESS_DENIED',
    MICROPHONE_ACCESS_DENIED = 'MICROPHONE_ACCESS_DENIED',
    SCREEN_CAPTURE_DENIED = 'SCREEN_CAPTURE_DENIED',
    NO_VIDEO_DEVICE = 'NO_VIDEO_DEVICE',
    NO_INPUT_DEVICE = 'NO_INPUT_DEVICE',
    SCREEN_EXTENSION_NOT_INSTALLED = 'SCREEN_EXTENSION_NOT_INSTALLED',
    GENERIC_ERROR = 'GENERIC_ERROR'
}

export class OpenViduError {

    name: OpenViduErrorName;
    message: string;

    constructor(name: OpenViduErrorName, message: string) {
        this.name = name;
        this.message = message;
    }

}