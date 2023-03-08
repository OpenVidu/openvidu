import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { PublisherProperties } from 'openvidu-browser';
import { Subscription } from 'rxjs';
import { CustomDevice } from '../../../models/device.model';
import { PanelType } from '../../../models/panel.model';
import { ParticipantAbstractModel } from '../../../models/participant.model';
import { VideoType } from '../../../models/video-type.model';
import { DeviceService } from '../../../services/device/device.service';
import { OpenViduService } from '../../../services/openvidu/openvidu.service';
import { PanelService } from '../../../services/panel/panel.service';
import { ParticipantService } from '../../../services/participant/participant.service';
import { StorageService } from '../../../services/storage/storage.service';
import { VirtualBackgroundService } from '../../../services/virtual-background/virtual-background.service';

/**
 * @internal
 */
@Component({
	selector: 'ov-video-devices-select',
	templateUrl: './video-devices.component.html',
	styleUrls: ['./video-devices.component.css']
})
export class VideoDevicesComponent implements OnInit, OnDestroy {
	@Output() onDeviceSelectorClicked = new EventEmitter<void>();
	@Output() onVideoMutedClicked = new EventEmitter<boolean>();

	videoMuteChanging: boolean;
	isVideoMuted: boolean;
	cameraSelected: CustomDevice | null;
	hasVideoDevices: boolean;
	cameras: CustomDevice[] = [];
	localParticipantSubscription: Subscription;

	constructor(
		private openviduService: OpenViduService,
		protected panelService: PanelService,
		private storageSrv: StorageService,
		private deviceSrv: DeviceService,
		protected participantService: ParticipantService,
		private backgroundService: VirtualBackgroundService
	) {}

	async ngOnInit() {
		this.subscribeToParticipantMediaProperties();
		if (this.openviduService.isSessionConnected()) {
			// Updating devices only with session connected
			await this.deviceSrv.refreshDevices();
		}

		this.hasVideoDevices = this.deviceSrv.hasVideoDeviceAvailable();
		if (this.hasVideoDevices) {
			this.cameras = this.deviceSrv.getCameras();
			this.cameraSelected = this.deviceSrv.getCameraSelected();
		}
		if (this.openviduService.isSessionConnected()) {
			this.isVideoMuted = !this.participantService.getLocalParticipant().isCameraVideoActive();
		} else {
			this.isVideoMuted = this.deviceSrv.isVideoMuted();
		}
	}
	async ngOnDestroy() {
		this.cameras = [];
		if (this.localParticipantSubscription) this.localParticipantSubscription.unsubscribe();
	}

	async toggleCam() {
		this.videoMuteChanging = true;
		const publish = this.isVideoMuted;
		await this.participantService.publishVideo(publish);
		if (this.isVideoMuted && this.panelService.isExternalPanelOpened()) {
			this.panelService.togglePanel(PanelType.BACKGROUND_EFFECTS);
		}
		this.videoMuteChanging = false;
		this.onVideoMutedClicked.emit(publish);
	}

	async onCameraSelected(event: any) {
		const device: CustomDevice = event?.value;

		// Is New deviceId different from the old one?
		if (this.deviceSrv.needUpdateVideoTrack(device)) {
			const mirror = this.deviceSrv.cameraNeedsMirror(device.device);
			// Reapply Virtual Background to new Publisher if necessary
			const backgroundSelected = this.backgroundService.backgroundSelected.getValue();
			const isBackgroundApplied = this.backgroundService.isBackgroundApplied();

			if (isBackgroundApplied) {
				await this.backgroundService.removeBackground();
			}
			const pp: PublisherProperties = { videoSource: device.device, audioSource: false, mirror };
			await this.openviduService.replaceTrack(VideoType.CAMERA, pp);

			if (isBackgroundApplied) {
				const bgSelected = this.backgroundService.backgrounds.find((b) => b.id === backgroundSelected);
				if (bgSelected) {
					await this.backgroundService.applyBackground(bgSelected);
				}
			}

			this.deviceSrv.setCameraSelected(device.device);
			this.cameraSelected = this.deviceSrv.getCameraSelected();
		}
	}

	/**
	 * @internal
	 * Compare two devices to check if they are the same. Used by the mat-select
	 */
	compareObjectDevices(o1: CustomDevice, o2: CustomDevice): boolean {
		return o1.label === o2.label;
	  }

	protected subscribeToParticipantMediaProperties() {
		this.localParticipantSubscription = this.participantService.localParticipantObs.subscribe((p: ParticipantAbstractModel) => {
			if (p) {
				this.isVideoMuted = !p.isCameraVideoActive();
				this.storageSrv.setVideoMuted(this.isVideoMuted);
			}
		});
	}
}
