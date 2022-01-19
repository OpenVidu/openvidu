import { fakeAsync, flush, TestBed } from '@angular/core/testing';
import { Device } from 'openvidu-browser';
import { CameraType, IDevice } from '../../models/device.model';
import { LoggerService } from '../logger/logger.service';
import { LoggerServiceMock } from '../logger/logger.service.mock';
import { PlatformService } from '../platform/platform.service';
import { PlatformServiceMock } from '../platform/platform.service.mock';
import { StorageService } from '../storage/storage.service';
import { StorageServiceMock } from '../storage/storage.service.mock';

import { DeviceService } from './device.service';

const OV_EMPTY_DEVICES: Device[] = [];
const OV_AUDIO_EMPTY_DEVICES: Device[] = [{ deviceId: '1', kind: 'audioinput', label: '' }];
const OV_VIDEO_EMPTY_DEVICES: Device[] = [{ deviceId: '2', kind: 'videoinput', label: '' }];
const OV_AUDIO_DEVICES: Device[] = [
	{ deviceId: '1', kind: 'audioinput', label: 'mic1' },
	{ deviceId: '2', kind: 'audioinput', label: 'mic2' }
];
const OV_VIDEO_DEVICES: Device[] = [
	{ deviceId: '3', kind: 'videoinput', label: 'cam1' },
	{ deviceId: '4', kind: 'videoinput', label: 'cam2' }
];
const OV_MOBILE_VIDEO_DEVICES: Device[] = [
	{ deviceId: '5', kind: 'videoinput', label: 'CAMfront' },
	{ deviceId: '6', kind: 'videoinput', label: 'cam1' }
];
const OV_BOTH_DEVICES: Device[] = OV_AUDIO_DEVICES.concat(OV_VIDEO_DEVICES);

const CUSTOM_AUDIO_DEVICES: IDevice[] = [
	{ device: '1', label: 'mic1' },
	{ device: '2', label: 'mic2' }
];
const CUSTOM_VIDEO_DEVICES: IDevice[] = [
	{ device: '3', label: 'cam1', type: CameraType.FRONT },
	{ device: '4', label: 'cam2', type: CameraType.BACK }
];

const CUSTOM_MOBILE_VIDEO_DEVICES: IDevice[] = [
	{ device: '5', label: 'CAMfront', type: CameraType.FRONT },
	{ device: '6', label: 'cam1BACK', type: CameraType.BACK }
];
const CUSTOM_AUDIO_STORAGE_DEVICE: IDevice = { device: '10', label: 'storageAudio' };
const CUSTOM_VIDEO_STORAGE_DEVICE: IDevice = { device: '11', label: 'storageVideo' };

describe('DeviceService', () => {
	let service: DeviceService;
	let spyGetDevices;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				{ provide: LoggerService, useClass: LoggerServiceMock },
				{ provide: PlatformService, useClass: PlatformServiceMock },
				{ provide: StorageService, useClass: StorageServiceMock }
			]
		});
		service = TestBed.inject(DeviceService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});

	it('should be defined OV', () => {
		expect(service['OV']).toBeDefined();
	});

	it('should initialize devices', fakeAsync(() => {
		spyGetDevices = spyOn(service['OV'], 'getDevices').and.returnValue(Promise.resolve(OV_EMPTY_DEVICES));

		expect(service['OV']).toBeDefined();

		service.initDevices();
		flush();

		expect(spyGetDevices).toHaveBeenCalled();
		expect(service['devices']).toBeDefined();
		expect(service['devices'].length).toEqual(0);
	}));

	it('should not initialize devices', fakeAsync(() => {
		spyGetDevices = spyOn(service['OV'], 'getDevices').and.returnValue(Promise.resolve(undefined));
		const spyInitOpenViduDevices = spyOn<any>(service, 'initOpenViduDevices').and.callThrough();

		expect(service['OV']).toBeDefined();

		spyInitOpenViduDevices.call(service);
		flush();

		expect(spyGetDevices).toHaveBeenCalled();
		expect(service['devices']).not.toBeDefined();

		expect(service.hasVideoDeviceAvailable()).toBeFalsy();
		expect(service.hasAudioDeviceAvailable()).toBeFalsy();
	}));

	it('should not have any devices available', fakeAsync(() => {
		spyGetDevices = spyOn(service['OV'], 'getDevices').and.returnValue(Promise.resolve(OV_EMPTY_DEVICES));
		service.initDevices();
		flush();
		expect(spyGetDevices).toHaveBeenCalled();

		expect(service.hasAudioDeviceAvailable()).toBeFalsy();
		expect(service['micSelected']).not.toBeDefined();

		expect(service.hasVideoDeviceAvailable()).toBeFalsy();
		expect(service['camSelected']).not.toBeDefined();
	}));

	it('should only have audio devices available', fakeAsync(() => {
		spyGetDevices = spyOn(service['OV'], 'getDevices').and.returnValue(Promise.resolve(OV_AUDIO_DEVICES));
		service.initDevices();
		flush();
		expect(service['devices'].length).toEqual(2);

		expect(service.hasAudioDeviceAvailable()).toBeTruthy();
		expect(service['micSelected']).toBeDefined();
		// 2 + empty microphone - resetDevices method
		expect(service['microphones'].length).toEqual(2 + 1);

		expect(service.hasVideoDeviceAvailable()).toBeFalsy();
		expect(service['camSelected']).not.toBeDefined();
		// 2 + empty camera - resetDevices method
		expect(service['cameras'].length).toEqual(0 + 1);
	}));

	it('should only have video devices available', fakeAsync(() => {
		spyGetDevices = spyOn(service['OV'], 'getDevices').and.returnValue(Promise.resolve(OV_VIDEO_DEVICES));
		service.initDevices();
		flush();
		expect(service['devices'].length).toEqual(2);

		expect(service.hasAudioDeviceAvailable()).toBeFalsy();
		expect(service['micSelected']).not.toBeDefined();

		expect(service['microphones'].length).toEqual(0 + 1);

		expect(service.hasVideoDeviceAvailable()).toBeTruthy();
		expect(service['camSelected']).toBeDefined();
		expect(service['cameras'].length).toEqual(2 + 1);
	}));

	it('should have video and audio devices available', fakeAsync(() => {
		spyGetDevices = spyOn(service['OV'], 'getDevices').and.returnValue(Promise.resolve(OV_BOTH_DEVICES));
		service.initDevices();
		flush();
		expect(service['devices'].length).toEqual(4);

		expect(service.hasAudioDeviceAvailable()).toBeTruthy();
		expect(service['micSelected']).toBeDefined();
		expect(service['microphones'].length).toEqual(2 + 1);

		expect(service.hasVideoDeviceAvailable()).toBeTruthy();
		expect(service['camSelected']).toBeDefined();
		expect(service['cameras'].length).toEqual(2 + 1);
	}));

	it('should return first audio device available', fakeAsync(() => {
		spyGetDevices = spyOn(service['OV'], 'getDevices').and.returnValue(Promise.resolve(OV_AUDIO_DEVICES));
		const spyInitOpenViduDevices = spyOn<any>(service, 'initOpenViduDevices').and.callThrough();
		const spyInitAudioDevices = spyOn<any>(service, 'initAudioDevices').and.callThrough();

		spyInitOpenViduDevices.call(service);
		flush();
		expect(spyInitOpenViduDevices).toHaveBeenCalled();

		spyInitAudioDevices.call(service);
		expect(spyInitAudioDevices).toHaveBeenCalled();
		expect(service.hasAudioDeviceAvailable()).toBeTruthy();

		expect(service.getMicSelected().label).toEqual(OV_AUDIO_DEVICES[0].label);
	}));

	it('should return first video device available', fakeAsync(() => {
		spyGetDevices = spyOn(service['OV'], 'getDevices').and.returnValue(Promise.resolve(OV_VIDEO_DEVICES));
		const spyInitOpenViduDevices = spyOn<any>(service, 'initOpenViduDevices').and.callThrough();
		const spyInitVideoDevices = spyOn<any>(service, 'initVideoDevices').and.callThrough();

		spyInitOpenViduDevices.call(service);
		flush();
		expect(spyInitOpenViduDevices).toHaveBeenCalled();

		spyInitVideoDevices.call(service);
		expect(spyInitVideoDevices).toHaveBeenCalled();
		expect(service.hasVideoDeviceAvailable()).toBeTruthy();

		expect(service.getCamSelected().label).toEqual(OV_VIDEO_DEVICES[0].label);
	}));

	it('should return a microphone by a id', fakeAsync(() => {
		spyGetDevices = spyOn(service['OV'], 'getDevices').and.returnValue(Promise.resolve(OV_AUDIO_DEVICES));
		const spyInitOpenViduDevices = spyOn<any>(service, 'initOpenViduDevices').and.callThrough();
		const spyInitAudioDevices = spyOn<any>(service, 'initAudioDevices').and.callThrough();
		const spyGetMicrophoneByDeviceField = spyOn<any>(service, 'getMicrophoneByDeviceField').and.callThrough();

		spyInitOpenViduDevices.call(service);
		flush();
		expect(spyInitOpenViduDevices).toHaveBeenCalled();

		spyInitAudioDevices.call(service);
		expect(spyInitAudioDevices).toHaveBeenCalled();

		const device = spyGetMicrophoneByDeviceField.call(service, OV_AUDIO_DEVICES[0].deviceId);

		expect(device).toBeDefined();
		expect(device.device).toEqual(OV_AUDIO_DEVICES[0].deviceId);
	}));

	it('should return a microphone by a label', fakeAsync(() => {
		spyGetDevices = spyOn(service['OV'], 'getDevices').and.returnValue(Promise.resolve(OV_AUDIO_DEVICES));
		const spyInitOpenViduDevices = spyOn<any>(service, 'initOpenViduDevices').and.callThrough();
		const spyInitAudioDevices = spyOn<any>(service, 'initAudioDevices').and.callThrough();
		const spyGetMicrophoneByDeviceField = spyOn<any>(service, 'getMicrophoneByDeviceField').and.callThrough();

		spyInitOpenViduDevices.call(service);
		flush();
		expect(spyInitOpenViduDevices).toHaveBeenCalled();

		spyInitAudioDevices.call(service);
		expect(spyInitAudioDevices).toHaveBeenCalled();

		const device = spyGetMicrophoneByDeviceField.call(service, OV_AUDIO_DEVICES[1].label);

		expect(device).toBeDefined();
		expect(device.label).toEqual(OV_AUDIO_DEVICES[1].label);
	}));

	it('should return a camera by a id', fakeAsync(() => {
		spyGetDevices = spyOn(service['OV'], 'getDevices').and.returnValue(Promise.resolve(OV_VIDEO_DEVICES));
		const spyInitOpenViduDevices = spyOn<any>(service, 'initOpenViduDevices').and.callThrough();
		const spyInitVideoDevices = spyOn<any>(service, 'initVideoDevices').and.callThrough();
		const spyGetCameraByDeviceField = spyOn<any>(service, 'getCameraByDeviceField').and.callThrough();

		spyInitOpenViduDevices.call(service);
		flush();
		expect(spyInitOpenViduDevices).toHaveBeenCalled();

		spyInitVideoDevices.call(service);
		expect(spyInitVideoDevices).toHaveBeenCalled();

		const device = spyGetCameraByDeviceField.call(service, OV_VIDEO_DEVICES[0].deviceId);

		expect(device).toBeDefined();
		expect(device.device).toEqual(OV_VIDEO_DEVICES[0].deviceId);
	}));

	it('should return a camera by a label', fakeAsync(() => {
		spyGetDevices = spyOn(service['OV'], 'getDevices').and.returnValue(Promise.resolve(OV_VIDEO_DEVICES));
		const spyInitOpenViduDevices = spyOn<any>(service, 'initOpenViduDevices').and.callThrough();
		const spyInitVideoDevices = spyOn<any>(service, 'initVideoDevices').and.callThrough();
		const spyGetCameraByDeviceField = spyOn<any>(service, 'getCameraByDeviceField').and.callThrough();

		spyInitOpenViduDevices.call(service);
		flush();
		expect(spyInitOpenViduDevices).toHaveBeenCalled();

		spyInitVideoDevices.call(service);
		expect(spyInitVideoDevices).toHaveBeenCalled();

		const device = spyGetCameraByDeviceField.call(service, OV_VIDEO_DEVICES[0].label);

		expect(device).toBeDefined();
		expect(device.label).toEqual(OV_VIDEO_DEVICES[0].label);
	}));

	it('camera should need mirror', fakeAsync(() => {
		spyGetDevices = spyOn(service['OV'], 'getDevices').and.returnValue(Promise.resolve(OV_VIDEO_DEVICES));
		const spyInitOpenViduDevices = spyOn<any>(service, 'initOpenViduDevices').and.callThrough();
		const spyInitVideoDevices = spyOn<any>(service, 'initVideoDevices').and.callThrough();
		const spyCameraNeedsMirror = spyOn<any>(service, 'cameraNeedsMirror').and.callThrough();

		spyInitOpenViduDevices.call(service);
		flush();
		expect(spyInitOpenViduDevices).toHaveBeenCalled();

		spyInitVideoDevices.call(service);
		expect(spyInitVideoDevices).toHaveBeenCalled();

		const mirror = spyCameraNeedsMirror.call(service, OV_VIDEO_DEVICES[0].label);

		expect(mirror).toBeDefined();
		expect(mirror).toBeTruthy();
	}));

	it('camera should not need mirror', fakeAsync(() => {
		spyGetDevices = spyOn(service['OV'], 'getDevices').and.returnValue(Promise.resolve(OV_VIDEO_DEVICES));
		const spyInitOpenViduDevices = spyOn<any>(service, 'initOpenViduDevices').and.callThrough();
		const spyInitVideoDevices = spyOn<any>(service, 'initVideoDevices').and.callThrough();
		const spyCameraNeedsMirror = spyOn<any>(service, 'cameraNeedsMirror').and.callThrough();

		spyInitOpenViduDevices.call(service);
		flush();
		expect(spyInitOpenViduDevices).toHaveBeenCalled();

		spyInitVideoDevices.call(service);
		expect(spyInitVideoDevices).toHaveBeenCalled();

		const mirror = spyCameraNeedsMirror.call(service, OV_VIDEO_DEVICES[1].label);

		expect(mirror).toBeDefined();
		expect(mirror).toBeFalsy();
	}));

	it('should return camera devices', fakeAsync(() => {
		spyGetDevices = spyOn(service['OV'], 'getDevices').and.returnValue(Promise.resolve(OV_BOTH_DEVICES));
		const spyInitOpenViduDevices = spyOn<any>(service, 'initOpenViduDevices').and.callThrough();
		const spyInitVideoDevices = spyOn<any>(service, 'initVideoDevices').and.callThrough();

		spyInitOpenViduDevices.call(service);
		flush();
		expect(spyInitOpenViduDevices).toHaveBeenCalled();

		spyInitVideoDevices.call(service);
		expect(spyInitVideoDevices).toHaveBeenCalled();

		const cameras = service.getCameras();

		expect(cameras).toEqual(CUSTOM_VIDEO_DEVICES);
	}));

	it('should return microphone devices', fakeAsync(() => {
		spyGetDevices = spyOn(service['OV'], 'getDevices').and.returnValue(Promise.resolve(OV_BOTH_DEVICES));
		const spyInitOpenViduDevices = spyOn<any>(service, 'initOpenViduDevices').and.callThrough();
		const spyInitAudioDevices = spyOn<any>(service, 'initAudioDevices').and.callThrough();

		spyInitOpenViduDevices.call(service);
		flush();
		expect(spyInitOpenViduDevices).toHaveBeenCalled();

		spyInitAudioDevices.call(service);
		expect(spyInitAudioDevices).toHaveBeenCalled();

		const microphones = service.getMicrophones();

		expect(microphones).toEqual(CUSTOM_AUDIO_DEVICES);
	}));

	it('should need replace audio track', fakeAsync(() => {
		spyGetDevices = spyOn(service['OV'], 'getDevices').and.returnValue(Promise.resolve(OV_BOTH_DEVICES));
		const spyInitOpenViduDevices = spyOn<any>(service, 'initOpenViduDevices').and.callThrough();
		const spyInitAudioDevices = spyOn<any>(service, 'initAudioDevices').and.callThrough();

		spyInitOpenViduDevices.call(service);
		flush();
		expect(spyInitOpenViduDevices).toHaveBeenCalled();

		spyInitAudioDevices.call(service);
		expect(spyInitAudioDevices).toHaveBeenCalled();

		const micSelected = service.getMicSelected();
		expect(micSelected).toBeDefined();

		const newDevice = CUSTOM_AUDIO_DEVICES.find((device) => micSelected.device !== device.device);

		expect(newDevice).toBeDefined();

		const needUpdateAudioTrack = service.needUpdateAudioTrack(newDevice.device);
		expect(needUpdateAudioTrack).toBeTruthy();
	}));

	it('should not need replace audio track', fakeAsync(() => {
		spyGetDevices = spyOn(service['OV'], 'getDevices').and.returnValue(Promise.resolve(OV_BOTH_DEVICES));
		const spyInitOpenViduDevices = spyOn<any>(service, 'initOpenViduDevices').and.callThrough();
		const spyInitAudioDevices = spyOn<any>(service, 'initAudioDevices').and.callThrough();

		spyInitOpenViduDevices.call(service);
		flush();
		expect(spyInitOpenViduDevices).toHaveBeenCalled();

		spyInitAudioDevices.call(service);
		expect(spyInitAudioDevices).toHaveBeenCalled();

		const micSelected = service.getMicSelected();
		expect(micSelected).toBeDefined();

		const newDevice = CUSTOM_AUDIO_DEVICES.find((device) => micSelected.device === device.device);

		expect(newDevice).toBeDefined();

		const needUpdateAudioTrack = service.needUpdateAudioTrack(newDevice.device);
		expect(needUpdateAudioTrack).toBeFalsy();
	}));

	it('should need replace video track', fakeAsync(() => {
		spyGetDevices = spyOn(service['OV'], 'getDevices').and.returnValue(Promise.resolve(OV_BOTH_DEVICES));
		const spyInitOpenViduDevices = spyOn<any>(service, 'initOpenViduDevices').and.callThrough();
		const spyInitVideoDevices = spyOn<any>(service, 'initVideoDevices').and.callThrough();

		spyInitOpenViduDevices.call(service);
		flush();
		expect(spyInitOpenViduDevices).toHaveBeenCalled();

		spyInitVideoDevices.call(service);
		expect(spyInitVideoDevices).toHaveBeenCalled();

		const camSelected = service.getCamSelected();
		expect(camSelected).toBeDefined();

		const newDevice = CUSTOM_VIDEO_DEVICES.find((device) => camSelected.device !== device.device);

		expect(newDevice).toBeDefined();

		const needUpdateVideoTrack = service.needUpdateVideoTrack(newDevice.device);
		expect(needUpdateVideoTrack).toBeTruthy();
	}));

	it('should not need replace video track', fakeAsync(() => {
		spyGetDevices = spyOn(service['OV'], 'getDevices').and.returnValue(Promise.resolve(OV_BOTH_DEVICES));
		const spyInitOpenViduDevices = spyOn<any>(service, 'initOpenViduDevices').and.callThrough();
		const spyInitVideoDevices = spyOn<any>(service, 'initVideoDevices').and.callThrough();

		spyInitOpenViduDevices.call(service);
		flush();
		expect(spyInitOpenViduDevices).toHaveBeenCalled();

		spyInitVideoDevices.call(service);
		expect(spyInitVideoDevices).toHaveBeenCalled();

		const camSelected = service.getCamSelected();
		expect(camSelected).toBeDefined();

		const newDevice = CUSTOM_VIDEO_DEVICES.find((device) => camSelected.device === device.device);

		expect(newDevice).toBeDefined();

		const needUpdateVideoTrack = service.needUpdateVideoTrack(newDevice.device);
		expect(needUpdateVideoTrack).toBeFalsy();
	}));

	it('should set cam selected', fakeAsync(() => {
		spyGetDevices = spyOn(service['OV'], 'getDevices').and.returnValue(Promise.resolve(OV_BOTH_DEVICES));
		const spyInitOpenViduDevices = spyOn<any>(service, 'initOpenViduDevices').and.callThrough();
		const spyInitVideoDevices = spyOn<any>(service, 'initVideoDevices').and.callThrough();

		spyInitOpenViduDevices.call(service);
		flush();
		expect(spyInitOpenViduDevices).toHaveBeenCalled();

		spyInitVideoDevices.call(service);
		expect(spyInitVideoDevices).toHaveBeenCalled();

		const camSelected = service.getCamSelected();
		expect(camSelected).toBeDefined();
		expect(camSelected).toEqual(CUSTOM_VIDEO_DEVICES[0]);

		const newDevice = CUSTOM_VIDEO_DEVICES.find((device) => camSelected.device !== device.device);
		expect(newDevice).toBeDefined();
		service.setCamSelected(newDevice.device);

		const newCamSelected = service.getCamSelected();
		expect(newCamSelected).toEqual(newDevice);
	}));

	it('should set mic selected', fakeAsync(() => {
		spyGetDevices = spyOn(service['OV'], 'getDevices').and.returnValue(Promise.resolve(OV_BOTH_DEVICES));
		const spyInitOpenViduDevices = spyOn<any>(service, 'initOpenViduDevices').and.callThrough();
		const spyInitAudioDevices = spyOn<any>(service, 'initAudioDevices').and.callThrough();

		spyInitOpenViduDevices.call(service);
		flush();
		expect(spyInitOpenViduDevices).toHaveBeenCalled();

		spyInitAudioDevices.call(service);
		expect(spyInitAudioDevices).toHaveBeenCalled();

		const micSelected = service.getMicSelected();
		expect(micSelected).toBeDefined();
		expect(micSelected).toEqual(CUSTOM_AUDIO_DEVICES[0]);

		const newDevice = CUSTOM_AUDIO_DEVICES.find((device) => micSelected.device !== device.device);
		expect(newDevice).toBeDefined();
		service.setMicSelected(newDevice.device);

		const newMicSelected = service.getMicSelected();
		expect(newMicSelected).toEqual(newDevice);
	}));

	it('should set front type in mobile devices', fakeAsync(() => {
		spyGetDevices = spyOn(service['OV'], 'getDevices').and.returnValue(Promise.resolve(OV_MOBILE_VIDEO_DEVICES));
		const spyPlatformSrvIsMobile = spyOn(service['platformSrv'], 'isMobile').and.returnValue(true);
		const spyInitOpenViduDevices = spyOn<any>(service, 'initOpenViduDevices').and.callThrough();
		const spyInitVideoDevices = spyOn<any>(service, 'initVideoDevices').and.callThrough();

		spyInitOpenViduDevices.call(service);
		flush();
		expect(spyInitOpenViduDevices).toHaveBeenCalled();

		spyInitVideoDevices.call(service);
		expect(spyInitVideoDevices).toHaveBeenCalled();

		expect(spyPlatformSrvIsMobile).toHaveBeenCalled();

		const cameras = service.getCameras();

		expect(cameras.length).toEqual(2);
		const frontCamera = cameras.find((device) => device.type === CameraType.FRONT);
		expect(frontCamera).toBeDefined();
		expect(frontCamera).toEqual(CUSTOM_MOBILE_VIDEO_DEVICES[0]);
	}));

	it('devices should have video empty labels', fakeAsync(() => {
		spyGetDevices = spyOn(service['OV'], 'getDevices').and.returnValue(Promise.resolve(OV_VIDEO_EMPTY_DEVICES));
		const spyInitOpenViduDevices = spyOn<any>(service, 'initOpenViduDevices').and.callThrough();
		const spyInitVideoDevices = spyOn<any>(service, 'initVideoDevices').and.callThrough();

		spyInitOpenViduDevices.call(service);
		flush();
		expect(spyInitOpenViduDevices).toHaveBeenCalled();

		spyInitVideoDevices.call(service);
		expect(spyInitVideoDevices).toHaveBeenCalled();

		expect(service.areEmptyLabels()).toBeTruthy();
	}));

	it('devices should have audio empty labels', fakeAsync(() => {
		spyGetDevices = spyOn(service['OV'], 'getDevices').and.returnValue(Promise.resolve(OV_AUDIO_EMPTY_DEVICES));
		const spyInitOpenViduDevices = spyOn<any>(service, 'initOpenViduDevices').and.callThrough();
		const spyInitAudioDevices = spyOn<any>(service, 'initAudioDevices').and.callThrough();

		spyInitOpenViduDevices.call(service);
		flush();
		expect(spyInitOpenViduDevices).toHaveBeenCalled();

		spyInitAudioDevices.call(service);
		expect(spyInitAudioDevices).toHaveBeenCalled();

		expect(service.areEmptyLabels()).toBeTruthy();
	}));

	it('should return first mic when storage audio device is not one of openvidu devices', fakeAsync(() => {
		const spyInitOpenViduDevices = spyOn<any>(service, 'initOpenViduDevices').and.callThrough();
		const spyInitAudioDevices = spyOn<any>(service, 'initAudioDevices').and.callThrough();
		spyGetDevices = spyOn(service['OV'], 'getDevices').and.returnValue(Promise.resolve(OV_BOTH_DEVICES));
		const spysaveMicToStorage = spyOn<any>(service, 'saveMicToStorage').and.callThrough();

		spysaveMicToStorage.call(service, CUSTOM_AUDIO_STORAGE_DEVICE);

		spyInitOpenViduDevices.call(service);
		flush();
		expect(spyInitOpenViduDevices).toHaveBeenCalled();

		spyInitAudioDevices.call(service);
		expect(spyInitAudioDevices).toHaveBeenCalled();
		expect(service.hasAudioDeviceAvailable()).toBeTruthy();

		expect(service.getMicSelected()).toEqual(CUSTOM_AUDIO_DEVICES[0]);
	}));

	it('should return first cam when storage video device is not one of openvidu devices', fakeAsync(() => {
		const spyInitOpenViduDevices = spyOn<any>(service, 'initOpenViduDevices').and.callThrough();
		const spyInitVideoDevices = spyOn<any>(service, 'initVideoDevices').and.callThrough();
		spyGetDevices = spyOn(service['OV'], 'getDevices').and.returnValue(Promise.resolve(OV_BOTH_DEVICES));
		const spysaveCamToStorage = spyOn<any>(service, 'saveCamToStorage').and.callThrough();

		spysaveCamToStorage.call(service, CUSTOM_VIDEO_STORAGE_DEVICE);

		spyInitOpenViduDevices.call(service);
		flush();
		expect(spyInitOpenViduDevices).toHaveBeenCalled();

		spyInitVideoDevices.call(service);
		expect(spyInitVideoDevices).toHaveBeenCalled();
		expect(service.hasVideoDeviceAvailable()).toBeTruthy();

		expect(service.getCamSelected()).toEqual(CUSTOM_VIDEO_DEVICES[0]);
	}));

	it('should return storage audio device', fakeAsync(() => {
		const spyInitOpenViduDevices = spyOn<any>(service, 'initOpenViduDevices').and.callThrough();
		const spyInitAudioDevices = spyOn<any>(service, 'initAudioDevices').and.callThrough();
		spyGetDevices = spyOn(service['OV'], 'getDevices').and.returnValue(Promise.resolve(OV_BOTH_DEVICES));
		const spysaveMicToStorage = spyOn<any>(service, 'saveMicToStorage').and.callThrough();

		spysaveMicToStorage.call(service, CUSTOM_AUDIO_DEVICES[1]);

		spyInitOpenViduDevices.call(service);
		flush();
		expect(spyInitOpenViduDevices).toHaveBeenCalled();

		spyInitAudioDevices.call(service);
		expect(spyInitAudioDevices).toHaveBeenCalled();
		expect(service.hasAudioDeviceAvailable()).toBeTruthy();

		expect(service.getMicSelected()).toEqual(CUSTOM_AUDIO_DEVICES[1]);
	}));

	it('should return storage video device', fakeAsync(() => {
		const spyInitOpenViduDevices = spyOn<any>(service, 'initOpenViduDevices').and.callThrough();
		const spyInitVideoDevices = spyOn<any>(service, 'initVideoDevices').and.callThrough();
		spyGetDevices = spyOn(service['OV'], 'getDevices').and.returnValue(Promise.resolve(OV_BOTH_DEVICES));
		const spysaveCamToStorage = spyOn<any>(service, 'saveCamToStorage').and.callThrough();

		spysaveCamToStorage.call(service, CUSTOM_VIDEO_DEVICES[1]);

		spyInitOpenViduDevices.call(service);
		flush();
		expect(spyInitOpenViduDevices).toHaveBeenCalled();

		spyInitVideoDevices.call(service);
		expect(spyInitVideoDevices).toHaveBeenCalled();
		expect(service.hasVideoDeviceAvailable()).toBeTruthy();

		expect(service.getCamSelected()).toEqual(CUSTOM_VIDEO_DEVICES[1]);
	}));
});
