import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { PanelStatusInfo, PanelSettingsOptions, PanelType } from '../../../models/panel.model';
import { OpenViduComponentsConfigService } from '../../../services/config/openvidu-components-angular.config.service';
import { PanelService } from '../../../services/panel/panel.service';
import { PlatformService } from '../../../services/platform/platform.service';
import { CustomDevice } from '../../../models/device.model';
import { LangOption } from '../../../models/lang.model';

/**
 * @internal
 */
@Component({
	selector: 'ov-settings-panel',
	templateUrl: './settings-panel.component.html',
	styleUrls: ['../panel.component.scss', './settings-panel.component.scss']
})
export class SettingsPanelComponent implements OnInit {
	@Output() onVideoEnabledChanged = new EventEmitter<boolean>();
	@Output() onVideoDeviceChanged = new EventEmitter<CustomDevice>();
	@Output() onAudioEnabledChanged = new EventEmitter<boolean>();
	@Output() onAudioDeviceChanged = new EventEmitter<CustomDevice>();
	@Output() onLangChanged = new EventEmitter<LangOption>();
	settingsOptions: typeof PanelSettingsOptions = PanelSettingsOptions;
	selectedOption: PanelSettingsOptions = PanelSettingsOptions.GENERAL;
	showCaptions: boolean = true;
	panelSubscription: Subscription;
	isMobile: boolean = false;
	private captionsSubs: Subscription;
	constructor(
		private panelService: PanelService,
		private platformService: PlatformService,
		private libService: OpenViduComponentsConfigService
	) {}
	ngOnInit() {
		this.isMobile = this.platformService.isMobile();
		this.subscribeToPanelToggling();
		this.subscribeToDirectives();
	}

	ngOnDestroy() {
		if (this.captionsSubs) this.captionsSubs.unsubscribe();
	}

	close() {
		this.panelService.togglePanel(PanelType.SETTINGS);
	}
	onSelectionChanged(option: PanelSettingsOptions) {
		this.selectedOption = option;
	}

	private subscribeToDirectives() {
		this.captionsSubs = this.libService.captionsButton$.subscribe((value: boolean) => {
			this.showCaptions = value;
		});
	}

	private subscribeToPanelToggling() {
		this.panelSubscription = this.panelService.panelStatusObs.subscribe((ev: PanelStatusInfo) => {
			if (ev.panelType === PanelType.SETTINGS && !!ev.subOptionType) {
				this.selectedOption = ev.subOptionType as PanelSettingsOptions;
			}
		});
	}
}
