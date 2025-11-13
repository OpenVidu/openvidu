import { TestBed } from '@angular/core/testing';
import { DeviceService } from './device.service';
import { LoggerService } from '../logger/logger.service';
import { PlatformService } from '../platform/platform.service';
import { StorageService } from '../storage/storage.service';
import { CameraType, CustomDevice } from '../../models/device.model';

describe('DeviceService', () => {
  let service: DeviceService;
  let loggerInstance: any;
  let loggerServiceMock: any;
  let platformServiceMock: any;
  let storageServiceMock: any;

  const asDevice = (deviceId: string, kind: MediaDeviceKind, label: string): MediaDeviceInfo => ({
    deviceId, kind, label,
    groupId: `${kind}-${deviceId}`,
    toJSON() { return this; }
  } as MediaDeviceInfo);

  beforeEach(() => {
    loggerInstance = { d: jasmine.createSpy('d'), i: jasmine.createSpy('i'), e: jasmine.createSpy('e'), w: jasmine.createSpy('w') };
    loggerServiceMock = { get: jasmine.createSpy('get').and.returnValue(loggerInstance) };
    platformServiceMock = { isMobile: jasmine.createSpy('isMobile').and.returnValue(false), isFirefox: jasmine.createSpy('isFirefox').and.returnValue(false) };
    storageServiceMock = {
      getVideoDevice: jasmine.createSpy('getVideoDevice').and.returnValue(null),
      getAudioDevice: jasmine.createSpy('getAudioDevice').and.returnValue(null),
      setVideoDevice: jasmine.createSpy('setVideoDevice'),
      setAudioDevice: jasmine.createSpy('setAudioDevice'),
      isCameraEnabled: jasmine.createSpy('isCameraEnabled').and.returnValue(true),
      isMicrophoneEnabled: jasmine.createSpy('isMicrophoneEnabled').and.returnValue(true)
    };

    TestBed.configureTestingModule({
      providers: [
        DeviceService,
        { provide: LoggerService, useValue: loggerServiceMock },
        { provide: PlatformService, useValue: platformServiceMock },
        { provide: StorageService, useValue: storageServiceMock }
      ]
    });
    service = TestBed.inject(DeviceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initializeDevices', () => {
    it('initializes devices with camera and microphone', async () => {
      const devices = [asDevice('cam-1', 'videoinput', 'Front Camera'), asDevice('mic-1', 'audioinput', 'Primary Mic')];
      spyOn<any>(service, 'getLocalDevices').and.resolveTo(devices);
      await service.initializeDevices();
      expect(service.getCameras().length).toBe(1);
      expect(service.getMicrophones().length).toBe(1);
    });

    it('calls clear before initializing', async () => {
      const clearSpy = spyOn(service, 'clear');
      spyOn<any>(service, 'getLocalDevices').and.resolveTo([]);
      await service.initializeDevices();
      expect(clearSpy).toHaveBeenCalled();
    });

    it('sets camera type for mobile devices with front camera label', async () => {
      platformServiceMock.isMobile.and.returnValue(true);
      const devices = [asDevice('cam-front', 'videoinput', 'Front Camera')];
      spyOn<any>(service, 'getLocalDevices').and.resolveTo(devices);
      await service.initializeDevices();
      expect(service.getCameras()[0].type).toBe(CameraType.FRONT);
    });

    it('sets first camera as FRONT for desktop', async () => {
      platformServiceMock.isMobile.and.returnValue(false);
      const devices = [
        asDevice('cam-1', 'videoinput', 'Camera 1'),
        asDevice('cam-2', 'videoinput', 'Camera 2')
      ];
      spyOn<any>(service, 'getLocalDevices').and.resolveTo(devices);
      await service.initializeDevices();
      expect(service.getCameras()[0].type).toBe(CameraType.FRONT);
      expect(service.getCameras()[1].type).toBe(CameraType.BACK);
    });

    it('honors stored device selections', async () => {
      const devices = [asDevice('cam-1', 'videoinput', 'Camera 1'), asDevice('cam-2', 'videoinput', 'Camera 2')];
      storageServiceMock.getVideoDevice.and.returnValue({ device: 'cam-2', label: 'Camera 2' });
      spyOn<any>(service, 'getLocalDevices').and.resolveTo(devices);
      await service.initializeDevices();
      expect(service.getCameraSelected()?.device).toBe('cam-2');
    });

    it('handles device access denied error', async () => {
      spyOn<any>(service, 'getLocalDevices').and.resolveTo([]);
      (service as any).deviceAccessDeniedError = true;
      await service.initializeDevices();
      expect(loggerInstance.w).toHaveBeenCalledWith('Media devices permissions were not granted.');
    });

    it('handles errors when getting devices', async () => {
      spyOn<any>(service, 'getLocalDevices').and.rejectWith(new Error('Test error'));
      await service.initializeDevices();
      expect(loggerInstance.e).toHaveBeenCalledWith('Error getting media devices', jasmine.any(Error));
    });

    it('selects first device when no storage device found', async () => {
      const devices = [
        asDevice('cam-1', 'videoinput', 'Camera 1'),
        asDevice('mic-1', 'audioinput', 'Microphone 1')
      ];
      storageServiceMock.getVideoDevice.and.returnValue(null);
      storageServiceMock.getAudioDevice.and.returnValue(null);
      spyOn<any>(service, 'getLocalDevices').and.resolveTo(devices);
      await service.initializeDevices();
      expect(service.getCameraSelected()?.device).toBe('cam-1');
      expect(service.getMicrophoneSelected()?.device).toBe('mic-1');
    });

    it('logs devices after initialization', async () => {
      const devices = [
        asDevice('cam-1', 'videoinput', 'Camera 1'),
        asDevice('mic-1', 'audioinput', 'Mic 1')
      ];
      spyOn<any>(service, 'getLocalDevices').and.resolveTo(devices);
      await service.initializeDevices();
      expect(loggerInstance.d).toHaveBeenCalledWith('Media devices', jasmine.any(Array), jasmine.any(Array));
    });

    it('handles empty device list', async () => {
      spyOn<any>(service, 'getLocalDevices').and.resolveTo([]);
      (service as any).deviceAccessDeniedError = false;
      await service.initializeDevices();
      expect(service.getCameras().length).toBe(0);
      expect(service.getMicrophones().length).toBe(0);
    });

    it('properly initializes with only cameras', async () => {
      const devices = [
        asDevice('cam-1', 'videoinput', 'Camera 1'),
        asDevice('cam-2', 'videoinput', 'Camera 2')
      ];
      spyOn<any>(service, 'getLocalDevices').and.resolveTo(devices);
      await service.initializeDevices();
      expect(service.getCameras().length).toBe(2);
      expect(service.getMicrophones().length).toBe(0);
    });

    it('properly initializes with only microphones', async () => {
      const devices = [
        asDevice('mic-1', 'audioinput', 'Microphone 1'),
        asDevice('mic-2', 'audioinput', 'Microphone 2')
      ];
      spyOn<any>(service, 'getLocalDevices').and.resolveTo(devices);
      await service.initializeDevices();
      expect(service.getCameras().length).toBe(0);
      expect(service.getMicrophones().length).toBe(2);
    });
  });

  describe('refreshDevices', () => {
    it('refreshes devices when access not denied', async () => {
      const devices = [asDevice('cam-1', 'videoinput', 'Camera 1')];
      const spy = spyOn<any>(service, 'getLocalDevices').and.resolveTo(devices);
      (service as any).deviceAccessDeniedError = false;
      await service.refreshDevices();
      expect(spy).toHaveBeenCalled();
      expect(service.getCameras().length).toBe(1);
    });

    it('skips refresh when access denied', async () => {
      const spy = spyOn<any>(service, 'getLocalDevices').and.resolveTo([]);
      (service as any).deviceAccessDeniedError = true;
      await service.refreshDevices();
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('setCameraSelected', () => {
    it('updates camera selection and saves to storage', () => {
      const cameras: CustomDevice[] = [
        { device: 'cam-1', label: 'Camera 1', type: CameraType.FRONT },
        { device: 'cam-2', label: 'Camera 2', type: CameraType.BACK }
      ];
      (service as any).cameras = cameras;
      service.setCameraSelected('cam-2');
      expect(service.getCameraSelected()).toBe(cameras[1]);
      expect(storageServiceMock.setVideoDevice).toHaveBeenCalledWith(cameras[1]);
    });

    it('does not save when device not found', () => {
      (service as any).cameras = [];
      service.setCameraSelected('nonexistent');
      expect(service.getCameraSelected()).toBeUndefined();
      expect(storageServiceMock.setVideoDevice).not.toHaveBeenCalled();
    });
  });

  describe('setMicSelected', () => {
    it('updates microphone selection and saves to storage', () => {
      const microphones: CustomDevice[] = [
        { device: 'mic-1', label: 'Microphone 1' },
        { device: 'mic-2', label: 'Microphone 2' }
      ];
      (service as any).microphones = microphones;
      service.setMicSelected('mic-2');
      expect(service.getMicrophoneSelected()).toBe(microphones[1]);
      expect(storageServiceMock.setAudioDevice).toHaveBeenCalledWith(microphones[1]);
    });

    it('does not save when device not found', () => {
      (service as any).microphones = [];
      service.setMicSelected('nonexistent');
      expect(service.getMicrophoneSelected()).toBeUndefined();
      expect(storageServiceMock.setAudioDevice).not.toHaveBeenCalled();
    });
  });

  describe('needUpdateVideoTrack', () => {
    it('detects when video track needs update due to deviceId change', () => {
      const cam1: CustomDevice = { device: 'cam-1', label: 'Camera 1', type: CameraType.FRONT };
      const cam2: CustomDevice = { device: 'cam-2', label: 'Camera 2', type: CameraType.BACK };
      (service as any).cameraSelected = cam1;
      expect(service.needUpdateVideoTrack(cam1)).toBeFalse();
      expect(service.needUpdateVideoTrack(cam2)).toBeTrue();
    });

    it('detects when video track needs update due to label change', () => {
      const cam1: CustomDevice = { device: 'cam-1', label: 'Camera 1', type: CameraType.FRONT };
      const cam1WithDifferentLabel: CustomDevice = { device: 'cam-1', label: 'Different Camera', type: CameraType.FRONT };
      (service as any).cameraSelected = cam1;
      expect(service.needUpdateVideoTrack(cam1WithDifferentLabel)).toBeTrue();
    });
  });

  describe('needUpdateAudioTrack', () => {
    it('detects when audio track needs update due to deviceId change', () => {
      const mic1: CustomDevice = { device: 'mic-1', label: 'Microphone 1' };
      const mic2: CustomDevice = { device: 'mic-2', label: 'Microphone 2' };
      (service as any).microphoneSelected = mic1;
      expect(service.needUpdateAudioTrack(mic1)).toBeFalse();
      expect(service.needUpdateAudioTrack(mic2)).toBeTrue();
    });

    it('detects when audio track needs update due to label change', () => {
      const mic1: CustomDevice = { device: 'mic-1', label: 'Microphone 1' };
      const mic1WithDifferentLabel: CustomDevice = { device: 'mic-1', label: 'Different Microphone' };
      (service as any).microphoneSelected = mic1;
      expect(service.needUpdateAudioTrack(mic1WithDifferentLabel)).toBeTrue();
    });
  });

  describe('clear', () => {
    it('clears all device state', () => {
      (service as any).cameras = [{ device: 'cam', label: 'Camera', type: CameraType.FRONT }];
      (service as any).microphones = [{ device: 'mic', label: 'Microphone' }];
      (service as any).cameraSelected = { device: 'cam', label: 'Camera', type: CameraType.FRONT };
      (service as any).microphoneSelected = { device: 'mic', label: 'Microphone' };
      (service as any).videoDevicesEnabled = false;
      (service as any).audioDevicesEnabled = false;

      service.clear();

      expect(service.getCameras().length).toBe(0);
      expect(service.getMicrophones().length).toBe(0);
      expect(service.getCameraSelected()).toBeUndefined();
      expect(service.getMicrophoneSelected()).toBeUndefined();
      expect((service as any).videoDevicesEnabled).toBeTrue();
      expect((service as any).audioDevicesEnabled).toBeTrue();
    });
  });

  describe('device availability checks', () => {
    it('reports camera enabled based on availability and storage', () => {
      (service as any).cameras = [{ device: 'cam', label: 'Camera', type: CameraType.FRONT }];
      (service as any).videoDevicesEnabled = true;
      storageServiceMock.isCameraEnabled.and.returnValue(true);
      expect(service.isCameraEnabled()).toBeTrue();
    });

    it('reports camera disabled when no devices available', () => {
      (service as any).cameras = [];
      expect(service.isCameraEnabled()).toBeFalse();
    });

    it('reports camera disabled when camera disabled in storage', () => {
      (service as any).cameras = [{ device: 'cam', label: 'Camera', type: CameraType.FRONT }];
      storageServiceMock.isCameraEnabled.and.returnValue(false);
      expect(service.isCameraEnabled()).toBeFalse();
    });

    it('reports microphone enabled based on availability and storage', () => {
      (service as any).microphones = [{ device: 'mic', label: 'Microphone' }];
      (service as any).audioDevicesEnabled = true;
      storageServiceMock.isMicrophoneEnabled.and.returnValue(true);
      expect(service.isMicrophoneEnabled()).toBeTrue();
    });

    it('reports microphone disabled when no devices available', () => {
      (service as any).microphones = [];
      expect(service.isMicrophoneEnabled()).toBeFalse();
    });

    it('reports video device available when cameras exist and enabled', () => {
      (service as any).cameras = [{ device: 'cam', label: 'Camera', type: CameraType.FRONT }];
      (service as any).videoDevicesEnabled = true;
      expect(service.hasVideoDeviceAvailable()).toBeTrue();
    });

    it('reports audio device available when microphones exist and enabled', () => {
      (service as any).microphones = [{ device: 'mic', label: 'Microphone' }];
      (service as any).audioDevicesEnabled = true;
      expect(service.hasAudioDeviceAvailable()).toBeTrue();
    });
  });

  describe('getters', () => {
    it('returns cameras list', () => {
      const cameras: CustomDevice[] = [{ device: 'cam-1', label: 'Camera 1', type: CameraType.FRONT }];
      (service as any).cameras = cameras;
      expect(service.getCameras()).toBe(cameras);
    });

    it('returns microphones list', () => {
      const microphones: CustomDevice[] = [{ device: 'mic-1', label: 'Microphone 1' }];
      (service as any).microphones = microphones;
      expect(service.getMicrophones()).toBe(microphones);
    });

    it('returns selected camera', () => {
      const camera: CustomDevice = { device: 'cam-1', label: 'Camera 1', type: CameraType.FRONT };
      (service as any).cameraSelected = camera;
      expect(service.getCameraSelected()).toBe(camera);
    });

    it('returns selected microphone', () => {
      const microphone: CustomDevice = { device: 'mic-1', label: 'Microphone 1' };
      (service as any).microphoneSelected = microphone;
      expect(service.getMicrophoneSelected()).toBe(microphone);
    });
  });

  describe('private method: getDeviceFromStorage', () => {
    it('returns device when found in storage', () => {
      const devices: CustomDevice[] = [
        { device: 'cam-1', label: 'Camera 1', type: CameraType.FRONT },
        { device: 'cam-2', label: 'Camera 2', type: CameraType.BACK }
      ];
      const storageDevice = { device: 'cam-2', label: 'Camera 2', type: CameraType.BACK };

      const result = (service as any).getDeviceFromStorage(devices, storageDevice);
      expect(result).toBe(devices[1]);
    });

    it('returns undefined when storage device is null', () => {
      const devices: CustomDevice[] = [{ device: 'cam-1', label: 'Camera 1', type: CameraType.FRONT }];
      const result = (service as any).getDeviceFromStorage(devices, null);
      expect(result).toBeUndefined();
    });

    it('returns undefined when device not found', () => {
      const devices: CustomDevice[] = [{ device: 'cam-1', label: 'Camera 1', type: CameraType.FRONT }];
      const storageDevice = { device: 'cam-999', label: 'Not Found' };

      const result = (service as any).getDeviceFromStorage(devices, storageDevice);
      expect(result).toBeUndefined();
    });
  });

  describe('private method: getDeviceById', () => {
    it('returns device when found by id', () => {
      const devices: CustomDevice[] = [
        { device: 'cam-1', label: 'Camera 1', type: CameraType.FRONT },
        { device: 'cam-2', label: 'Camera 2', type: CameraType.BACK }
      ];

      const result = (service as any).getDeviceById(devices, 'cam-2');
      expect(result).toBe(devices[1]);
    });

    it('returns undefined when device not found', () => {
      const devices: CustomDevice[] = [{ device: 'cam-1', label: 'Camera 1', type: CameraType.FRONT }];
      const result = (service as any).getDeviceById(devices, 'cam-999');
      expect(result).toBeUndefined();
    });

    it('returns first device when searching with first id', () => {
      const devices: CustomDevice[] = [
        { device: 'cam-1', label: 'Camera 1', type: CameraType.FRONT },
        { device: 'cam-2', label: 'Camera 2', type: CameraType.BACK }
      ];

      const result = (service as any).getDeviceById(devices, 'cam-1');
      expect(result).toBe(devices[0]);
    });
  });

  describe('private method: createCustomDevice', () => {
    it('creates custom device with provided type', () => {
      const mediaDevice = asDevice('cam-1', 'videoinput', 'Camera 1');
      const result = (service as any).createCustomDevice(mediaDevice, CameraType.FRONT);

      expect(result).toEqual({
        label: 'Camera 1',
        device: 'cam-1',
        type: CameraType.FRONT
      });
    });

    it('creates custom device with BACK type', () => {
      const mediaDevice = asDevice('cam-2', 'videoinput', 'Camera 2');
      const result = (service as any).createCustomDevice(mediaDevice, CameraType.BACK);

      expect(result.type).toBe(CameraType.BACK);
    });

    it('preserves device label and id', () => {
      const mediaDevice = asDevice('unique-id', 'videoinput', 'Special Camera');
      const result = (service as any).createCustomDevice(mediaDevice, CameraType.FRONT);

      expect(result.label).toBe('Special Camera');
      expect(result.device).toBe('unique-id');
    });
  });  describe('private method: saveDeviceToStorage', () => {
    it('calls save function when device is defined', () => {
      const device: CustomDevice = { device: 'cam-1', label: 'Camera 1', type: CameraType.FRONT };
      const saveFn = jasmine.createSpy('saveFn');

      (service as any).saveDeviceToStorage(device, saveFn);

      expect(saveFn).toHaveBeenCalledWith(device);
    });

    it('does not call save function when device is undefined', () => {
      const saveFn = jasmine.createSpy('saveFn');

      (service as any).saveDeviceToStorage(undefined, saveFn);

      expect(saveFn).not.toHaveBeenCalled();
    });
  });

  describe('initializeCustomDevices', () => {
    it('separates videos and audios correctly', () => {
      const devices = [
        asDevice('cam-1', 'videoinput', 'Camera 1'),
        asDevice('cam-2', 'videoinput', 'Camera 2'),
        asDevice('mic-1', 'audioinput', 'Microphone 1'),
        asDevice('mic-2', 'audioinput', 'Microphone 2')
      ];
      (service as any).devices = devices;

      (service as any).initializeCustomDevices();

      expect(service.getCameras().length).toBe(2);
      expect(service.getMicrophones().length).toBe(2);
    });

    it('sets correct camera types for mobile with front camera label', async () => {
      platformServiceMock.isMobile.and.returnValue(true);
      const devices = [
        asDevice('cam-back', 'videoinput', 'Back Camera'),
        asDevice('cam-front', 'videoinput', 'Front Camera')
      ];
      (service as any).devices = devices;

      (service as any).initializeCustomDevices();

      expect(service.getCameras()[0].type).toBe(CameraType.BACK);
      expect(service.getCameras()[1].type).toBe(CameraType.FRONT);
    });

    it('sets first camera as FRONT for desktop and others as BACK', () => {
      platformServiceMock.isMobile.and.returnValue(false);
      const devices = [
        asDevice('cam-1', 'videoinput', 'Camera 1'),
        asDevice('cam-2', 'videoinput', 'Camera 2'),
        asDevice('cam-3', 'videoinput', 'Camera 3')
      ];
      (service as any).devices = devices;

      (service as any).initializeCustomDevices();

      const cameras = service.getCameras();
      expect(cameras[0].type).toBe(CameraType.FRONT);
      expect(cameras[1].type).toBe(CameraType.BACK);
      expect(cameras[2].type).toBe(CameraType.BACK);
    });
  });

  describe('protected methods', () => {
    describe('getPermissionStrategies', () => {
      it('returns array of three strategies', () => {
        const strategies = service['getPermissionStrategies']();
        expect(strategies.length).toBe(3);
        expect(strategies[0]).toEqual({ audio: true, video: true });
        expect(strategies[1]).toEqual({ audio: true, video: false });
        expect(strategies[2]).toEqual({ audio: false, video: true });
      });
    });

    describe('filterValidDevices', () => {
      it('filters out devices without label', () => {
        const devices = [
          asDevice('cam-1', 'videoinput', 'Camera 1'),
          asDevice('cam-2', 'videoinput', '')
        ];
        const result = service['filterValidDevices'](devices);
        expect(result.length).toBe(1);
        expect(result[0].deviceId).toBe('cam-1');
      });

      it('filters out devices without deviceId', () => {
        const devices = [
          asDevice('cam-1', 'videoinput', 'Camera 1'),
          { ...asDevice('', 'videoinput', 'Camera 2'), deviceId: '' }
        ];
        const result = service['filterValidDevices'](devices);
        expect(result.length).toBe(1);
        expect(result[0].deviceId).toBe('cam-1');
      });

      it('filters out default device', () => {
        const devices = [
          asDevice('cam-1', 'videoinput', 'Camera 1'),
          asDevice('default', 'videoinput', 'Default Camera')
        ];
        const result = service['filterValidDevices'](devices);
        expect(result.length).toBe(1);
        expect(result[0].deviceId).toBe('cam-1');
      });

      it('returns all valid devices', () => {
        const devices = [
          asDevice('cam-1', 'videoinput', 'Camera 1'),
          asDevice('cam-2', 'videoinput', 'Camera 2'),
          asDevice('mic-1', 'audioinput', 'Microphone 1')
        ];
        const result = service['filterValidDevices'](devices);
        expect(result.length).toBe(3);
      });
    });

    describe('handleFallbackByErrorType', () => {
      it('handles NotReadableError by enumerating devices', async () => {
        const mockDevices = [
          asDevice('cam-1', 'videoinput', 'Camera 1'),
          asDevice('default', 'videoinput', 'Default')
        ];
        spyOn(navigator.mediaDevices, 'enumerateDevices').and.resolveTo(mockDevices);

        const error = { name: 'NotReadableError', message: 'Device busy' };
        const result = await service['handleFallbackByErrorType'](error);

        expect(result.length).toBe(1);
        expect(result[0].deviceId).toBe('cam-1');
        expect(loggerInstance.w).toHaveBeenCalledWith('Device busy, using enumerateDevices() instead');
      });

      it('handles AbortError by enumerating devices', async () => {
        const mockDevices = [asDevice('mic-1', 'audioinput', 'Microphone 1')];
        spyOn(navigator.mediaDevices, 'enumerateDevices').and.resolveTo(mockDevices);

        const error = { name: 'AbortError', message: 'Aborted' };
        const result = await service['handleFallbackByErrorType'](error);

        expect(result.length).toBe(1);
        expect(result[0].deviceId).toBe('mic-1');
      });

      it('handles NotAllowedError by setting access denied flag', async () => {
        const error = { name: 'NotAllowedError', message: 'Permission denied' };
        const result = await service['handleFallbackByErrorType'](error);

        expect(result).toEqual([]);
        expect((service as any).deviceAccessDeniedError).toBeTrue();
        expect(loggerInstance.w).toHaveBeenCalledWith('Permission denied to access devices');
      });

      it('handles SecurityError by setting access denied flag', async () => {
        const error = { name: 'SecurityError', message: 'Security error' };
        const result = await service['handleFallbackByErrorType'](error);

        expect(result).toEqual([]);
        expect((service as any).deviceAccessDeniedError).toBeTrue();
      });

      it('returns empty array for unknown errors', async () => {
        const error = { name: 'UnknownError', message: 'Unknown' };
        const result = await service['handleFallbackByErrorType'](error);

        expect(result).toEqual([]);
      });

      it('handles null error gracefully', async () => {
        const result = await service['handleFallbackByErrorType'](null);
        expect(result).toEqual([]);
      });

      it('handles undefined error gracefully', async () => {
        const result = await service['handleFallbackByErrorType'](undefined);
        expect(result).toEqual([]);
      });
    });
  });
});
