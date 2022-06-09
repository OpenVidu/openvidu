import { Component, HostListener, OnDestroy, OnInit, Output, EventEmitter, ViewChild, AfterViewInit } from '@angular/core';
import { MatMenuTrigger } from '@angular/material/menu';
import { MatSelect } from '@angular/material/select';

import { PublisherProperties } from 'openvidu-browser';
import { Subscription } from 'rxjs';
import { CustomDevice } from '../../models/device.model';
import { ILogger } from '../../models/logger.model';
import { PanelType } from '../../models/panel.model';
import { ParticipantAbstractModel } from '../../models/participant.model';
import { CdkOverlayService } from '../../services/cdk-overlay/cdk-overlay.service';
import { OpenViduAngularConfigService } from '../../services/config/openvidu-angular.config.service';
import { DeviceService } from '../../services/device/device.service';
import { LayoutService } from '../../services/layout/layout.service';
import { LoggerService } from '../../services/logger/logger.service';
import { OpenViduService } from '../../services/openvidu/openvidu.service';
import { PanelService } from '../../services/panel/panel.service';
import { ParticipantService } from '../../services/participant/participant.service';
import { StorageService } from '../../services/storage/storage.service';
import { TranslateService } from '../../services/translate/translate.service';
import { VirtualBackgroundService } from '../../services/virtual-background/virtual-background.service';

/**
 * @internal
 */
@Component({
	selector: 'ov-pre-join',
	templateUrl: './pre-join.component.html',
	styleUrls: ['./pre-join.component.css']
})
export class PreJoinComponent implements OnInit, OnDestroy, AfterViewInit {
	/**
	 * @ignore
	 */
	@ViewChild(MatMenuTrigger) public menuTrigger: MatMenuTrigger;
	/**
	 * @ignore
	 */
	@ViewChild(MatSelect) matSelect: MatSelect;

	@Output() onJoinButtonClicked = new EventEmitter<any>();
	languages: { name: string; ISO: string }[] = [];
	langSelected: { name: string; ISO: string };
	cameras: CustomDevice[];
	microphones: CustomDevice[];
	cameraSelected: CustomDevice;
	microphoneSelected: CustomDevice;
	isVideoMuted: boolean;
	isAudioMuted: boolean;
	videoMuteChanging: boolean;
	localParticipant: ParticipantAbstractModel;
	windowSize: number;
	hasVideoDevices: boolean;
	hasAudioDevices: boolean;
	isLoading = true;
	nickname: string;
	/**
	 * @ignore
	 */
	showBackgroundEffectsButton: boolean = true;
	/**
	 * @ignore
	 */
	isMinimal: boolean = false;
	showLogo: boolean = true;

	private log: ILogger;
	private localParticipantSubscription: Subscription;
	private screenShareStateSubscription: Subscription;
	private minimalSub: Subscription;
	private displayLogoSub: Subscription;
	private backgroundEffectsButtonSub: Subscription;

	@HostListener('window:resize')
	sizeChange() {
		this.windowSize = window.innerWidth;
		this.layoutService.update();
	}

	constructor(
		private layoutService: LayoutService,
		private deviceSrv: DeviceService,
		private loggerSrv: LoggerService,
		private openviduService: OpenViduService,
		private participantService: ParticipantService,
		protected panelService: PanelService,
		private libService: OpenViduAngularConfigService,
		private storageSrv: StorageService,
		private backgroundService: VirtualBackgroundService,
		private translateService: TranslateService,
		protected cdkSrv: CdkOverlayService
	) {
		this.log = this.loggerSrv.get('PreJoinComponent');
	}

	ngOnInit() {
		this.subscribeToPrejoinDirectives();
		this.subscribeToLocalParticipantEvents();
		this.languages = this.translateService.getLanguagesInfo();
		this.langSelected = this.translateService.getLangSelected();

		this.windowSize = window.innerWidth;
		this.hasVideoDevices = this.deviceSrv.hasVideoDeviceAvailable();
		this.hasAudioDevices = this.deviceSrv.hasAudioDeviceAvailable();
		this.microphones = this.deviceSrv.getMicrophones();
		this.cameras = this.deviceSrv.getCameras();
		this.cameraSelected = this.deviceSrv.getCameraSelected();
		this.microphoneSelected = this.deviceSrv.getMicrophoneSelected();

		this.isVideoMuted = this.deviceSrv.isVideoMuted();
		this.isAudioMuted = this.deviceSrv.isAudioMuted();

		this.isLoading = false;
	}

	ngAfterViewInit() {
		// Some devices as iPhone do not show the menu panels correctly
		// Updating the container where the panel is added fix the problem.
		this.menuTrigger?.menuOpened.subscribe(() => {
			this.cdkSrv.setSelector('#prejoin-container');
		});
		this.matSelect?.openedChange.subscribe(() => {
			this.cdkSrv.setSelector('#prejoin-container');
		});
	}

	async ngOnDestroy() {
		this.cdkSrv.setSelector('body');
		if (this.localParticipantSubscription) this.localParticipantSubscription.unsubscribe();
		if (this.screenShareStateSubscription) this.screenShareStateSubscription.unsubscribe();
		if (this.backgroundEffectsButtonSub) this.backgroundEffectsButtonSub.unsubscribe();
		if (this.minimalSub) this.minimalSub.unsubscribe();
		this.panelService.closePanel();
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
			const pp: PublisherProperties = { videoSource, audioSource: this.microphoneSelected.device, mirror };

			// Reapply Virtual Background to new Publisher if necessary
			const backgroundSelected = this.backgroundService.backgroundSelected.getValue();
			if (this.backgroundService.isBackgroundApplied()) {
				await this.backgroundService.removeBackground();
			}
			await this.openviduService.republishTrack(pp);
			if (this.backgroundService.isBackgroundApplied()) {
				await this.backgroundService.applyBackground(this.backgroundService.backgrounds.find((b) => b.id === backgroundSelected));
			}

			this.deviceSrv.setCameraSelected(videoSource);
			this.cameraSelected = this.deviceSrv.getCameraSelected();
		}
	}

	async onMicrophoneSelected(event: any) {
		const audioSource = event?.value;
		if (this.deviceSrv.needUpdateAudioTrack(audioSource)) {
			//TODO: Uncomment this when replaceTrack issue is fixed
			// const pp: PublisherProperties = { audioSource, videoSource: false };
			// await this.openviduService.replaceTrack(VideoType.CAMERA, pp);
			// TODO: Remove this when replaceTrack issue is fixed
			const mirror = this.deviceSrv.cameraNeedsMirror(this.cameraSelected.device);
			const pp: PublisherProperties = { videoSource: this.cameraSelected.device, audioSource, mirror };
			await this.openviduService.republishTrack(pp);

			this.deviceSrv.setMicSelected(audioSource);
			this.microphoneSelected = this.deviceSrv.getMicrophoneSelected();
		}
	}

	onLangSelected(lang: string) {
		this.translateService.setLanguage(lang);
		this.storageSrv.setLang(lang);
		this.langSelected = this.translateService.getLangSelected();
	}

	async toggleCam() {
		this.videoMuteChanging = true;
		const publish = this.isVideoMuted;
		await this.openviduService.publishVideo(publish);
		this.isVideoMuted = !this.isVideoMuted;
		this.storageSrv.setVideoMuted(this.isVideoMuted);
		if (this.isVideoMuted && this.panelService.isExternalPanelOpened()) {
			this.panelService.togglePanel(PanelType.BACKGROUND_EFFECTS);
		}
		this.videoMuteChanging = false;
	}

	toggleMic() {
		const publish = this.isAudioMuted;
		this.openviduService.publishAudio(publish);
		this.isAudioMuted = !this.isAudioMuted;
		this.storageSrv.setAudioMuted(this.isAudioMuted);
	}

	updateNickname() {
		this.nickname = this.nickname === '' ? this.participantService.getMyNickname() : this.nickname;
		this.participantService.setMyNickname(this.nickname);
		this.storageSrv.setNickname(this.nickname);
	}

	joinSession() {
		this.onJoinButtonClicked.emit();
		this.panelService.closePanel();
	}

	toggleBackgroundEffects() {
		this.panelService.togglePanel(PanelType.BACKGROUND_EFFECTS);
	}

	private subscribeToLocalParticipantEvents() {
		this.localParticipantSubscription = this.participantService.localParticipantObs.subscribe((p) => {
			this.localParticipant = p;
			this.nickname = this.localParticipant.getNickname();
		});
	}

	private subscribeToPrejoinDirectives() {
		this.minimalSub = this.libService.minimalObs.subscribe((value: boolean) => {
			this.isMinimal = value;
			// this.cd.markForCheck();
		});
		this.displayLogoSub = this.libService.displayLogoObs.subscribe((value: boolean) => {
			this.showLogo = value;
			// this.cd.markForCheck();
		});
		this.backgroundEffectsButtonSub = this.libService.backgroundEffectsButton.subscribe((value: boolean) => {
			this.showBackgroundEffectsButton = value;
			// this.cd.markForCheck();
		});
	}
}
