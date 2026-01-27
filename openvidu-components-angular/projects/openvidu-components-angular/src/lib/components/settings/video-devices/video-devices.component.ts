import { Component, effect, EventEmitter, Input, OnInit, Output, Signal, WritableSignal } from '@angular/core';
import { CustomDevice } from '../../../models/device.model';
import { ILogger } from '../../../models/logger.model';
import { DeviceService } from '../../../services/device/device.service';
import { LoggerService } from '../../../services/logger/logger.service';
import { ParticipantService } from '../../../services/participant/participant.service';
import { StorageService } from '../../../services/storage/storage.service';

/**
 * @internal
 */
@Component({
	selector: 'ov-video-devices-select',
	templateUrl: './video-devices.component.html',
	styleUrls: ['./video-devices.component.scss'],
	standalone: false
})
export class VideoDevicesComponent implements OnInit {
	@Input() compact: boolean = false;
	@Output() onVideoDeviceChanged = new EventEmitter<CustomDevice>();
	@Output() onVideoEnabledChanged = new EventEmitter<boolean>();
	@Output() onVideoDevicesLoaded = new EventEmitter<CustomDevice[]>();

	cameraStatusChanging: boolean = false;
	isCameraEnabled: boolean = false;

	protected readonly cameras: WritableSignal<CustomDevice[]>;
	protected readonly cameraSelected: WritableSignal<CustomDevice | undefined>;
	protected readonly hasVideoDevices: Signal<boolean>;

	private log: ILogger;

	constructor(
		private storageSrv: StorageService,
		private deviceSrv: DeviceService,
		private participantService: ParticipantService,
		private loggerSrv: LoggerService
	) {
		this.log = this.loggerSrv.get('VideoDevicesComponent');
		this.cameras = this.deviceSrv.cameras;
		this.cameraSelected = this.deviceSrv.cameraSelected;
		this.hasVideoDevices = this.deviceSrv.hasVideoDevices;

		// Use effect instead of subscription for reactive updates
		effect(() => {
			const participant = this.participantService.localParticipantSignal();
			if (participant) {
				this.isCameraEnabled = participant.isCameraEnabled;
				this.storageSrv.setCameraEnabled(this.isCameraEnabled);
			}
		});
	}

	async ngOnInit() {
		// Emit initial device list (reactively)
		this.onVideoDevicesLoaded.emit(this.cameras());
		this.isCameraEnabled = this.participantService.isMyCameraEnabled();
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
				this.onVideoDeviceChanged.emit(this.cameraSelected());
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
}
