import { computed, Injectable, OnDestroy, signal } from '@angular/core';
import { createLocalTracks, LocalTrack, Room, Track } from 'livekit-client';
import { CameraType, CustomDevice, DeviceType } from '../../models/device.model';
import { ILogger } from '../../models/logger.model';
import { LoggerService } from '../logger/logger.service';
import { PlatformService } from '../platform/platform.service';
import { StorageService } from '../storage/storage.service';

/**
 * Device availability state for each media type
 */
interface DeviceAvailabilityState {
	hasDevices: boolean;
	isEnabled: boolean;
	permissionGranted: boolean;
	error?: string;
}

/**
 * Device service with improved performance and independent audio/video handling.
 *
 * Key improvements:
 * - Smart permission requests (single prompt when possible, fallback to separate)
 * - Angular Signals for reactive state management (cameras, microphones as signals)
 * - Live device detection - automatically updates when devices are connected/disconnected
 * - Better error handling with specific error types per device
 * - Performance optimizations with caching
 * - LiveKit client integration for modern track management
 *
 * @internal
 */
@Injectable({
	providedIn: 'root'
})
export class DeviceService implements OnDestroy {
	// Reactive device lists with Signals
	readonly cameras = signal<CustomDevice[]>([]);
	readonly microphones = signal<CustomDevice[]>([]);
	readonly cameraSelected = signal<CustomDevice | undefined>(undefined);
	readonly microphoneSelected = signal<CustomDevice | undefined>(undefined);

	// Reactive state management with Signals
	private readonly videoState = signal<DeviceAvailabilityState>({
		hasDevices: false,
		isEnabled: true,
		permissionGranted: false
	});

	private readonly audioState = signal<DeviceAvailabilityState>({
		hasDevices: false,
		isEnabled: true,
		permissionGranted: false
	});

	// Computed signals for common checks
	readonly hasVideoDevices = computed(() =>
		this.videoState().hasDevices && this.cameras().length > 0
	);

	readonly hasAudioDevices = computed(() =>
		this.audioState().hasDevices && this.microphones().length > 0
	);

	readonly hasVideoPermission = computed(() =>
		this.videoState().permissionGranted
	);

	readonly hasAudioPermission = computed(() =>
		this.audioState().permissionGranted
	);

	readonly allPermissionsGranted = computed(() =>
		this.videoState().permissionGranted && this.audioState().permissionGranted
	);

	// Constants
	private readonly CACHE_DURATION = 5000; // 5 seconds

	// Internal state
	private devicesCache: {
		timestamp: number;
		devices: MediaDeviceInfo[];
	} | null = null;
	private log: ILogger;
	private initializationPromise: Promise<void> | null = null;
	private deviceChangeHandler: (() => void) | null = null;

	constructor(
		private loggerSrv: LoggerService,
		private platformSrv: PlatformService,
		private storageSrv: StorageService
	) {
		this.log = this.loggerSrv.get('DeviceService');
	}

	/**
	 * Cleanup when service is destroyed
	 */
	ngOnDestroy(): void {
		// Remove device change listener
		if (this.deviceChangeHandler && navigator.mediaDevices?.removeEventListener) {
			navigator.mediaDevices.removeEventListener('devicechange', this.deviceChangeHandler);
			this.deviceChangeHandler = null;
			this.log.d('Device change detection disabled');
		}
	}

	/**
	 * Initialize media devices with parallel audio/video handling
	 * Returns a promise that resolves when initialization is complete
	 */
	async initializeDevices(): Promise<void> {
		// Prevent multiple simultaneous initializations
		if (this.initializationPromise) {
			return this.initializationPromise;
		}

		this.initializationPromise = this.performInitialization();

		try {
			await this.initializationPromise;
		} finally {
			this.initializationPromise = null;
		}
	}

	private async performInitialization(): Promise<void> {
		this.clear();

		try {
			// Try to get devices with parallel audio/video permission requests
			const devices = await this.getLocalDevicesOptimized();

			if (devices.length === 0) {
				this.log.w('No media devices found or permissions denied');
				return;
			}

			this.processDevices(devices);
			this.updateSelectedDevices();

			// Setup live device detection
			this.setupDeviceChangeDetection();

			this.log.d('Media devices initialized', {
				cameras: this.cameras().length,
				microphones: this.microphones().length
			});
		} catch (error) {
			this.log.e('Error initializing devices', error);
			throw error;
		}
	}

	/**
	 * Optimized device retrieval with independent audio/video handling
	 * This solves the critical bug where audio device failure affects video device detection
	 */
	private async getLocalDevicesOptimized(): Promise<MediaDeviceInfo[]> {
		// Check cache first
		if (this.devicesCache && Date.now() - this.devicesCache.timestamp < this.CACHE_DURATION) {
			this.log.d('Using cached devices');
			return this.devicesCache.devices;
		}

		try {
			// Try parallel permission requests for better performance
			const results = await this.requestPermissionsParallel();

			// Get devices after permissions are granted
			const devices = await this.enumerateDevices();

			// Update cache
			this.devicesCache = {
				timestamp: Date.now(),
				devices
			};

			// Update state based on results
			this.updateDeviceStates(results);

			return devices;
		} catch (error) {
			this.log.e('Error getting devices', error);

			// Fallback: try to enumerate devices without permissions
			return await this.fallbackDeviceEnumeration();
		}
	}

	/**
	 * Smart permission request strategy:
	 * 1. Try both together (single prompt - better UX)
	 * 2. If fails, try individually (fallback for granular permissions)
	 *
	 * This minimizes user friction while maintaining independence
	 */
	private async requestPermissionsParallel(): Promise<{
		video: { success: boolean; error?: any };
		audio: { success: boolean; error?: any };
	}> {
		const results = {
			video: { success: false, error: undefined as any },
			audio: { success: false, error: undefined as any }
		};

		// Strategy 1: Try requesting both together (single prompt)
		try {
			this.log.d('Requesting both audio and video permissions together');
			const tracks = await createLocalTracks({ audio: true, video: true });

			// Check which tracks we got
			const videoTrack = tracks.find(t => t.kind === Track.Kind.Video);
			const audioTrack = tracks.find(t => t.kind === Track.Kind.Audio);

			if (videoTrack) {
				results.video.success = true;
				this.log.d('Video permission granted');
			}

			if (audioTrack) {
				results.audio.success = true;
				this.log.d('Audio permission granted');
			}

			// Stop tracks immediately after getting permission
			tracks.forEach(t => t.stop());

			// If both succeeded, return early (best case - single prompt!)
			if (results.video.success && results.audio.success) {
				this.log.d('Both permissions granted with single prompt');
				return results;
			}
		} catch (error: any) {
			this.log.w('Combined permission request failed, trying individually', error);
			// Continue to fallback strategy
		}

		// Strategy 2: Fallback - request individually if combined request failed
		// This handles cases where user denied one but might allow the other
		const promises: Promise<void>[] = [];

		// Try video if not already granted
		if (!results.video.success) {
			promises.push(
				this.requestVideoPermission().then(
					(tracks) => {
						results.video.success = true;
						tracks.forEach(t => t.stop());
						this.log.d('Video permission granted individually');
					},
					(error) => {
						results.video.error = error;
						this.log.w('Video permission denied', error);
					}
				)
			);
		}

		// Try audio if not already granted
		if (!results.audio.success) {
			promises.push(
				this.requestAudioPermission().then(
					(tracks) => {
						results.audio.success = true;
						tracks.forEach(t => t.stop());
						this.log.d('Audio permission granted individually');
					},
					(error) => {
						results.audio.error = error;
						this.log.w('Audio permission denied', error);
					}
				)
			);
		}

		// Wait for fallback requests to complete
		if (promises.length > 0) {
			await Promise.allSettled(promises);
		}

		return results;
	}

	/**
	 * Request video permission independently
	 */
	private async requestVideoPermission(): Promise<LocalTrack[]> {
		try {
			return await createLocalTracks({ audio: false, video: true });
		} catch (error: any) {
			this.videoState.update(state => ({
				...state,
				permissionGranted: false,
				error: error.name || 'Unknown error'
			}));
			throw error;
		}
	}

	/**
	 * Request audio permission independently
	 */
	private async requestAudioPermission(): Promise<LocalTrack[]> {
		try {
			return await createLocalTracks({ audio: true, video: false });
		} catch (error: any) {
			this.audioState.update(state => ({
				...state,
				permissionGranted: false,
				error: error.name || 'Unknown error'
			}));
			throw error;
		}
	}

	/**
	 * Enumerate devices using LiveKit's Room API or browser API
	 */
	private async enumerateDevices(): Promise<MediaDeviceInfo[]> {
		try {
			// Use LiveKit's Room.getLocalDevices if available, otherwise fallback to browser API
			const devices = await Room.getLocalDevices();
			return this.filterValidDevices(devices);
		} catch (error) {
			this.log.w('LiveKit device enumeration failed, using browser API', error);

			// Firefox compatibility
			if (this.platformSrv.isFirefox()) {
				return await this.getDevicesFirefox();
			}

			const devices = await navigator.mediaDevices.enumerateDevices();
			return this.filterValidDevices(devices);
		}
	}

	/**
	 * Firefox-specific device enumeration
	 */
	private async getDevicesFirefox(): Promise<MediaDeviceInfo[]> {
		try {
			// Firefox may need explicit getUserMedia call
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
			stream.getTracks().forEach(track => track.stop());

			const devices = await navigator.mediaDevices.enumerateDevices();
			return this.filterValidDevices(devices);
		} catch (error) {
			this.log.w('Firefox getUserMedia failed, trying enumerate directly', error);
			const devices = await navigator.mediaDevices.enumerateDevices();
			return this.filterValidDevices(devices);
		}
	}

	/**
	 * Filter out invalid or default devices
	 */
	private filterValidDevices(devices: MediaDeviceInfo[]): MediaDeviceInfo[] {
		return devices.filter(
			(d) => d.label && d.deviceId && d.deviceId !== 'default'
		);
	}

	/**
	 * Fallback device enumeration without permissions
	 */
	private async fallbackDeviceEnumeration(): Promise<MediaDeviceInfo[]> {
		try {
			this.log.d('Attempting device enumeration without permissions');
			const devices = await navigator.mediaDevices.enumerateDevices();

			// Filter devices that have IDs but may not have labels
			return devices.filter(d => d.deviceId && d.deviceId !== 'default');
		} catch (error) {
			this.log.e('Fallback device enumeration failed', error);
			return [];
		}
	}

	/**
	 * Update device states based on permission results
	 */
	private updateDeviceStates(results: {
		video: { success: boolean; error?: any };
		audio: { success: boolean; error?: any };
	}): void {
		// Update video state
		this.videoState.update(state => ({
			...state,
			permissionGranted: results.video.success,
			error: results.video.error?.name
		}));

		// Update audio state
		this.audioState.update(state => ({
			...state,
			permissionGranted: results.audio.success,
			error: results.audio.error?.name
		}));
	}

	/**
	 * Process raw devices into typed camera and microphone lists
	 */
	private processDevices(devices: MediaDeviceInfo[]): void {
		// Process video devices
		const camerasArray = devices
			.filter((d) => d.kind === DeviceType.VIDEO_INPUT)
			.map((d) => this.createCustomDevice(d, CameraType.BACK));

		// Process audio devices
		const microphonesArray = devices
			.filter((d) => d.kind === DeviceType.AUDIO_INPUT)
			.map((d) => ({ label: d.label, device: d.deviceId }));

		// Detect camera types (front/back)
		this.detectCameraTypes(camerasArray);

		// Update signals
		this.cameras.set(camerasArray);
		this.microphones.set(microphonesArray);

		// Update availability states
		this.updateDeviceAvailability(camerasArray.length, microphonesArray.length);
	}

	/**
	 * Detect camera types (front/back) based on platform and labels
	 */
	private detectCameraTypes(cameras: CustomDevice[]): void {
		if (cameras.length === 0) return;

		if (this.platformSrv.isMobile()) {
			// On mobile, detect by label
			cameras.forEach((camera) => {
				if (camera.label.toLowerCase().includes(CameraType.FRONT.toLowerCase())) {
					camera.type = CameraType.FRONT;
				}
			});
		} else {
			// On desktop, first camera is typically front-facing
			cameras[0].type = CameraType.FRONT;
		}
	}

	/**
	 * Update device availability states
	 */
	private updateDeviceAvailability(cameraCount: number, microphoneCount: number): void {
		this.videoState.update(state => ({
			...state,
			hasDevices: cameraCount > 0
		}));

		this.audioState.update(state => ({
			...state,
			hasDevices: microphoneCount > 0
		}));
	}

	/**
	 * Create custom device object
	 */
	private createCustomDevice(device: MediaDeviceInfo, defaultType: CameraType): CustomDevice {
		return {
			label: device.label,
			device: device.deviceId,
			type: defaultType
		};
	}

	/**
	 * Update selected devices from storage or use defaults
	 */
	private updateSelectedDevices(): void {
		const storedCamera = this.storageSrv.getVideoDevice();
		const selectedCam = this.findDeviceOrDefault(
			this.cameras(),
			storedCamera?.device
		);
		if (selectedCam) {
			this.cameraSelected.set(selectedCam);
		}

		const storedMic = this.storageSrv.getAudioDevice();
		const selectedMic = this.findDeviceOrDefault(
			this.microphones(),
			storedMic?.device
		);
		if (selectedMic) {
			this.microphoneSelected.set(selectedMic);
		}
	}

	/**
	 * Find device by ID or return first available
	 */
	private findDeviceOrDefault(devices: CustomDevice[], deviceId?: string): CustomDevice | undefined {
		if (devices.length === 0) return undefined;
		return deviceId
			? devices.find((d) => d.device === deviceId) || devices[0]
			: devices[0];
	}

	/**
	 * Refresh devices (e.g., when a device is plugged/unplugged)
	 */
	async refreshDevices(): Promise<void> {
		// Invalidate cache
		this.devicesCache = null;

		const devices = await this.getLocalDevicesOptimized();
		this.processDevices(devices);
		this.updateSelectedDevices();

		this.log.d('Devices refreshed', {
			cameras: this.cameras().length,
			microphones: this.microphones().length
		});
	}

	/**
	 * Setup live device change detection
	 * Automatically refreshes device list when devices are connected/disconnected
	 */
	private setupDeviceChangeDetection(): void {
		if (!navigator.mediaDevices?.addEventListener) {
			this.log.w('Device change detection not supported');
			return;
		}

		// Remove existing listener if any
		if (this.deviceChangeHandler) {
			navigator.mediaDevices.removeEventListener('devicechange', this.deviceChangeHandler);
		}

		// Create new handler
		this.deviceChangeHandler = async () => {
			this.log.d('Device change detected, refreshing device list');
			await this.refreshDevices();
		};

		// Register listener
		navigator.mediaDevices.addEventListener('devicechange', this.deviceChangeHandler);
		this.log.d('Device change detection enabled');
	}

	// Public API methods (compatible with original DeviceService)

	/**
	 * Check if camera is enabled based on storage and device availability
	 */
	isCameraEnabled(): boolean {
		return this.hasVideoDeviceAvailable() && this.storageSrv.isCameraEnabled();
	}

	/**
	 * Check if microphone is enabled based on storage and device availability
	 */
	isMicrophoneEnabled(): boolean {
		return this.hasAudioDeviceAvailable() && this.storageSrv.isMicrophoneEnabled();
	}

	/**
	 * Get currently selected camera
	 */
	getCameraSelected(): CustomDevice | undefined {
		return this.cameraSelected();
	}

	/**
	 * Get currently selected microphone
	 */
	getMicrophoneSelected(): CustomDevice | undefined {
		return this.microphoneSelected();
	}

	/**
	 * Set selected camera and persist to storage
	 */
	setCameraSelected(deviceId: string): void {
		const device = this.cameras().find((c) => c.device === deviceId);
		if (!device) {
			this.log.w('Camera not found:', deviceId);
			return;
		}

		this.cameraSelected.set(device);
		this.storageSrv.setVideoDevice(device);
		this.log.d('Camera selected:', device.label);
	}

	/**
	 * Set selected microphone and persist to storage
	 */
	setMicSelected(deviceId: string): void {
		const device = this.microphones().find((m) => m.device === deviceId);
		if (!device) {
			this.log.w('Microphone not found:', deviceId);
			return;
		}

		this.microphoneSelected.set(device);
		this.storageSrv.setAudioDevice(device);
		this.log.d('Microphone selected:', device.label);
	}

	/**
	 * Check if video track needs to be updated
	 */
	needUpdateVideoTrack(newDevice: CustomDevice): boolean {
		const current = this.cameraSelected();
		return (
			current?.device !== newDevice.device ||
			current?.label !== newDevice.label
		);
	}

	/**
	 * Check if audio track needs to be updated
	 */
	needUpdateAudioTrack(newDevice: CustomDevice): boolean {
		const current = this.microphoneSelected();
		return (
			current?.device !== newDevice.device ||
			current?.label !== newDevice.label
		);
	}

	// ==========================================
	// Public API - Device Access
	// ==========================================

	/**
	 * Get list of available cameras
	 */
	getCameras(): CustomDevice[] {
		return this.cameras();
	}

	/**
	 * Get list of available microphones
	 */
	getMicrophones(): CustomDevice[] {
		return this.microphones();
	}

	// ==========================================
	// Public API - Device State
	// ==========================================

	/**
	 * Check if video devices are available
	 */
	hasVideoDeviceAvailable(): boolean {
		return this.hasVideoDevices();
	}

	/**
	 * Check if audio devices are available
	 */
	hasAudioDeviceAvailable(): boolean {
		return this.hasAudioDevices();
	}

	// ==========================================
	// Public API - Permission State
	// ==========================================

	/**
	 * Check if video permission was granted
	 */
	hasVideoPermissionGranted(): boolean {
		return this.hasVideoPermission();
	}

	/**
	 * Check if audio permission was granted
	 */
	hasAudioPermissionGranted(): boolean {
		return this.hasAudioPermission();
	}

	// ==========================================
	// Public API - Reactive State Access
	// For components that need direct signal access, use:
	// - this.cameras, this.microphones (device lists)
	// - this.cameraSelected, this.microphoneSelected (selections)
	// - this.hasVideoDevices, this.hasAudioDevices (availability)
	// - this.hasVideoPermission, this.hasAudioPermission (permissions)
	// - this.allPermissionsGranted (combined permissions)
	// ==========================================

	/**
	 * Clear all device data
	 */
	clear(): void {
		this.cameras.set([]);
		this.microphones.set([]);
		this.cameraSelected.set(undefined);
		this.microphoneSelected.set(undefined);
		this.devicesCache = null;

		this.videoState.set({
			hasDevices: false,
			isEnabled: true,
			permissionGranted: false
		});

		this.audioState.set({
			hasDevices: false,
			isEnabled: true,
			permissionGranted: false
		});
	}
}
