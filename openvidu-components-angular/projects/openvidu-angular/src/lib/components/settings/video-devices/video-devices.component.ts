import { Component, OnInit, OnDestroy } from '@angular/core';
import { PublisherProperties } from 'openvidu-browser';
import { Subscription } from 'rxjs';
import { CustomDevice } from '../../../models/device.model';
import { PanelType } from '../../../models/panel.model';
import { ParticipantAbstractModel } from '../../../models/participant.model';
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
	videoMuteChanging: boolean;
	isVideoMuted: boolean;
	cameraSelected: CustomDevice;
	hasVideoDevices: boolean;
	cameras: CustomDevice[];
	localParticipantSubscription: Subscription;

	constructor(
		private openviduService: OpenViduService,
		protected panelService: PanelService,
		private storageSrv: StorageService,
		private deviceSrv: DeviceService,
		protected participantService: ParticipantService,
		private backgroundService: VirtualBackgroundService
	) {}

	ngOnInit(): void {
		this.subscribeToParticipantMediaProperties();
		this.hasVideoDevices = this.deviceSrv.hasVideoDeviceAvailable();
		this.cameras = this.deviceSrv.getCameras();
		this.cameraSelected = this.deviceSrv.getCameraSelected();
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
		await this.openviduService.publishVideo(publish);
		this.storageSrv.setVideoMuted(this.isVideoMuted);
		if (this.isVideoMuted && this.panelService.isExternalPanelOpened()) {
			this.panelService.togglePanel(PanelType.BACKGROUND_EFFECTS);
		}
		this.videoMuteChanging = false;
	}

	async onCameraSelected(event: any) {
		const videoSource = event?.value;
		// Is New deviceId different from the old one?
		if (this.deviceSrv.needUpdateVideoTrack(videoSource)) {
			const mirror = this.deviceSrv.cameraNeedsMirror(videoSource);
			//TODO: Uncomment this when replaceTrack issue is fixed
			// const pp: PublisherProperties = { videoSource, audioSource: false, mirror };
			// await this.openviduService.replaceTrack(VideoType.CAMERA, pp);
			// TODO: Remove this when replaceTrack issue is fixed
			const pp: PublisherProperties = { videoSource, audioSource: this.deviceSrv.getMicrophoneSelected().device, mirror };

			// Reapply Virtual Background to new Publisher if necessary
			const backgroundSelected = this.backgroundService.backgroundSelected.getValue();
			if (this.backgroundService.isBackgroundApplied()) {
				await this.backgroundService.removeBackground();
			}
			await this.openviduService.republishTrack(pp);
			if (this.backgroundService.isBackgroundApplied()) {
				const bgSelected = this.backgroundService.backgrounds.find((b) => b.id === backgroundSelected);
				if (bgSelected) {
					await this.backgroundService.applyBackground(bgSelected);
				}
			}

			this.deviceSrv.setCameraSelected(videoSource);
			this.cameraSelected = this.deviceSrv.getCameraSelected();
		}
	}

	protected subscribeToParticipantMediaProperties() {
		this.localParticipantSubscription = this.participantService.localParticipantObs.subscribe((p: ParticipantAbstractModel) => {
			if (p) {
				this.isVideoMuted = !p.isCameraVideoActive();
			}
		});
	}
}
