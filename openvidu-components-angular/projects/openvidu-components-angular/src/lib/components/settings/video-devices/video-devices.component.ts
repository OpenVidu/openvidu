import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { CustomDevice } from '../../../models/device.model';
import { DeviceService } from '../../../services/device/device.service';
import { ParticipantService } from '../../../services/participant/participant.service';
import { StorageService } from '../../../services/storage/storage.service';
import { ParticipantModel } from '../../../models/participant.model';
import { LoggerService } from '../../../services/logger/logger.service';
import { ILogger } from '../../../models/logger.model';

/**
 * @internal
 */
@Component({
	selector: 'ov-video-devices-select',
	templateUrl: './video-devices.component.html',
	styleUrls: ['./video-devices.component.scss'],
	standalone: false
})
export class VideoDevicesComponent implements OnInit, OnDestroy {
	@Input() compact: boolean = false;
	@Output() onVideoDeviceChanged = new EventEmitter<CustomDevice>();
	@Output() onVideoEnabledChanged = new EventEmitter<boolean>();
	@Output() onVideoDevicesLoaded = new EventEmitter<CustomDevice[]>();

	cameraStatusChanging: boolean;
	isCameraEnabled: boolean;
	cameraSelected: CustomDevice | undefined;
	hasVideoDevices: boolean;
	cameras: CustomDevice[] = [];
	localParticipantSubscription: Subscription;

	private log: ILogger;

	constructor(
		private storageSrv: StorageService,
		private deviceSrv: DeviceService,
		private participantService: ParticipantService,
		private loggerSrv: LoggerService
	) {
		this.log = this.loggerSrv.get('VideoDevicesComponent');
	}

	async ngOnInit() {
		this.subscribeToParticipantMediaProperties();

		this.hasVideoDevices = this.deviceSrv.hasVideoDeviceAvailable();
		if (this.hasVideoDevices) {
			this.cameras = this.deviceSrv.getCameras();
			this.cameraSelected = this.deviceSrv.getCameraSelected();
		}

		this.onVideoDevicesLoaded.emit(this.cameras);
		this.isCameraEnabled = this.participantService.isMyCameraEnabled();
	}

	async ngOnDestroy() {
		this.cameras = [];
		if (this.localParticipantSubscription) this.localParticipantSubscription.unsubscribe();
	}

	async toggleCam(event: any) {
		event.stopPropagation();
		this.cameraStatusChanging = true;
		this.isCameraEnabled = !this.isCameraEnabled;
		await this.participantService.setCameraEnabled(this.isCameraEnabled);
		this.storageSrv.setCameraEnabled(this.isCameraEnabled);
		this.onVideoEnabledChanged.emit(this.isCameraEnabled);
		this.cameraStatusChanging = false;
	}

	async onCameraSelected(event: any) {
		try {
			const device: CustomDevice = event?.value;

			// Is New deviceId different from the old one?
			if (this.deviceSrv.needUpdateVideoTrack(device)) {

				this.cameraStatusChanging = true;

				await this.participantService.switchCamera(device.device);

				this.deviceSrv.setCameraSelected(device.device);
				this.cameraSelected = device;
				this.onVideoDeviceChanged.emit(this.cameraSelected);
			}
		} catch (error) {
			this.log.e('Error switching camera', error);
		} finally {
			this.cameraStatusChanging = false;
		}
	}

	/**
	 * @internal
	 * Compare two devices to check if they are the same. Used by the mat-select
	 */
	compareObjectDevices(o1: CustomDevice, o2: CustomDevice): boolean {
		return o1.label === o2.label;
	}

	/**
	 * This subscription is necessary to update the camera status when the user changes it from toolbar and
	 * the settings panel is opened. With this, the camera status is updated in the settings panel.
	 */
	private subscribeToParticipantMediaProperties() {
		this.localParticipantSubscription = this.participantService.localParticipant$.subscribe((p: ParticipantModel | undefined) => {
			if (p) {
				this.isCameraEnabled = p.isCameraEnabled;
				this.storageSrv.setCameraEnabled(this.isCameraEnabled);
			}
		});
	}
}
