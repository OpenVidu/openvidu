import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { CaptionsLangOption } from '../../../models/caption.model';
import { CaptionService } from '../../../services/caption/caption.service';
import { LayoutService } from '../../../services/layout/layout.service';
import { OpenViduService } from '../../../services/openvidu/openvidu.service';
import { ServiceConfigService } from '../../../services/config/service-config.service';

/**
 * @internal
 */
@Component({
	selector: 'ov-captions-settings',
	templateUrl: './captions.component.html',
	styleUrls: ['./captions.component.scss']
})
export class CaptionsSettingComponent implements OnInit, OnDestroy {
	isSttReady: boolean = true;
	captionsEnabled: boolean;
	languagesAvailable: CaptionsLangOption[] = [];
	langSelected: string;
	isOpenViduPro: boolean = false;
	private captionsStatusSubs: Subscription;
	private sttStatusSubs: Subscription;

	private layoutService: LayoutService;

	constructor(private serviceConfig: ServiceConfigService, private captionService: CaptionService, private openviduService: OpenViduService) {
		this.layoutService = this.serviceConfig.getLayoutService();
	}

	ngOnInit(): void {
		// this.isOpenViduPro = this.openviduService.isOpenViduPro();
		// if (this.isOpenViduPro) {
		// 	this.subscribeToSttStatus();
		// 	this.subscribeToCaptionsStatus();
		// 	this.langSelected = this.captionService.getLangSelected().name;
		// 	this.languagesAvailable = this.captionService.getCaptionLanguages();
		// }
	}

	ngOnDestroy() {
		if (this.captionsStatusSubs) this.captionsStatusSubs.unsubscribe();
		if (this.sttStatusSubs) this.sttStatusSubs.unsubscribe();
	}

	onLangSelected(langOpt: CaptionsLangOption) {
		this.langSelected = langOpt.name;
		this.captionService.setLanguage(langOpt.lang);
	}

	toggleCaptions() {
		this.layoutService.toggleCaptions();
	}

	// private subscribeToSttStatus(){
	// 	this.sttStatusSubs = this.openviduService.isSttReadyObs.subscribe((ready: boolean) => {
	// 		this.isSttReady = ready;
	// 	});
	// }

	private subscribeToCaptionsStatus() {
		this.captionsStatusSubs = this.layoutService.captionsTogglingObs.subscribe((value: boolean) => {
			this.captionsEnabled = value;
			// this.cd.markForCheck();
		});
	}
}
