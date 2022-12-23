import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { PanelEvent, PanelSettingsOptions, PanelType } from '../../../models/panel.model';
import { OpenViduAngularConfigService } from '../../../services/config/openvidu-angular.config.service';
import { PanelService } from '../../../services/panel/panel.service';
import { PlatformService } from '../../../services/platform/platform.service';

/**
 * @internal
 */
@Component({
	selector: 'ov-settings-panel',
	templateUrl: './settings-panel.component.html',
	styleUrls: ['../panel.component.css', './settings-panel.component.css']
})
export class SettingsPanelComponent implements OnInit {
	settingsOptions: typeof PanelSettingsOptions = PanelSettingsOptions;
	selectedOption: PanelSettingsOptions = PanelSettingsOptions.GENERAL;
	showCaptions: boolean = true;
	panelSubscription: Subscription;
	isMobile: boolean = false;
	private captionsSubs: Subscription;
	constructor(
		private panelService: PanelService,
		private platformService: PlatformService,
		private libService: OpenViduAngularConfigService
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
		this.captionsSubs = this.libService.captionsButtonObs.subscribe((value: boolean) => {
			this.showCaptions = value;
		});
	}

	private subscribeToPanelToggling() {
		this.panelSubscription = this.panelService.panelOpenedObs.subscribe((ev: PanelEvent) => {
			if (ev.type === PanelType.SETTINGS && !!ev.expand) {
				this.selectedOption = ev.expand as PanelSettingsOptions;
			}
		});
	}
}
