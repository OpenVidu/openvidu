import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { PanelStatusInfo, PanelSettingsOptions, PanelType } from '../../../models/panel.model';
import { OpenViduComponentsConfigService } from '../../../services/config/directive-config.service';
import { PanelService } from '../../../services/panel/panel.service';
import { PlatformService } from '../../../services/platform/platform.service';
import { ViewportService } from '../../../services/viewport/viewport.service';
import { CustomDevice } from '../../../models/device.model';
import { LangOption } from '../../../models/lang.model';

/**
 * @internal
 */
@Component({
	selector: 'ov-settings-panel',
	templateUrl: './settings-panel.component.html',
	styleUrls: ['../panel.component.scss', './settings-panel.component.scss'],
	standalone: false
})
export class SettingsPanelComponent implements OnInit {
	@Output() onVideoEnabledChanged = new EventEmitter<boolean>();
	@Output() onVideoDeviceChanged = new EventEmitter<CustomDevice>();
	@Output() onAudioEnabledChanged = new EventEmitter<boolean>();
	@Output() onAudioDeviceChanged = new EventEmitter<CustomDevice>();
	@Output() onLangChanged = new EventEmitter<LangOption>();
	settingsOptions: typeof PanelSettingsOptions = PanelSettingsOptions;
	selectedOption: PanelSettingsOptions = PanelSettingsOptions.GENERAL;
	showCameraButton: boolean = true;
	showMicrophoneButton: boolean = true;
	showCaptions: boolean = true;
	showThemeSelector: boolean = false;
	isMobile: boolean = false;
	private destroy$ = new Subject<void>();

	constructor(
		private panelService: PanelService,
		private platformService: PlatformService,
		private libService: OpenViduComponentsConfigService,
		public viewportService: ViewportService
	) {}

	// Computed properties for responsive behavior
	get isCompactView(): boolean {
		return this.viewportService.isMobileView() || this.viewportService.isTabletDown();
	}

	get isVerticalLayout(): boolean {
		return this.viewportService.isMobileView();
	}

	get shouldHideMenuText(): boolean {
		return !this.viewportService.isMobileView() && this.viewportService.isTablet();
	}
	ngOnInit() {
		this.isMobile = this.platformService.isMobile();
		this.subscribeToPanelToggling();
		this.subscribeToDirectives();
	}

	ngOnDestroy() {
		this.destroy$.next();
		this.destroy$.complete();
	}

	close() {
		this.panelService.togglePanel(PanelType.SETTINGS);
	}
	onSelectionChanged(option: PanelSettingsOptions) {
		this.selectedOption = option;
	}

	private subscribeToDirectives() {
		this.libService.cameraButton$.pipe(takeUntil(this.destroy$)).subscribe((value: boolean) => (this.showCameraButton = value));
		this.libService.microphoneButton$.pipe(takeUntil(this.destroy$)).subscribe((value: boolean) => (this.showMicrophoneButton = value));
		this.libService.captionsButton$.pipe(takeUntil(this.destroy$)).subscribe((value: boolean) => (this.showCaptions = value));
		this.libService.showThemeSelector$.pipe(takeUntil(this.destroy$)).subscribe((value: boolean) => (this.showThemeSelector = value));
	}

	private subscribeToPanelToggling() {
		this.panelService.panelStatusObs.pipe(takeUntil(this.destroy$)).subscribe((ev: PanelStatusInfo) => {
			if (ev.panelType === PanelType.SETTINGS && !!ev.subOptionType) {
				this.selectedOption = ev.subOptionType as PanelSettingsOptions;
			}
		});
	}
}
