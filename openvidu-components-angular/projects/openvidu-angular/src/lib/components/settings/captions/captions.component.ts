import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { CaptionService } from '../../../services/caption/caption.service';
import { LayoutService } from '../../../services/layout/layout.service';
import { OpenViduService } from '../../../services/openvidu/openvidu.service';

/**
 * @internal
 */
@Component({
	selector: 'ov-captions-settings',
	templateUrl: './captions.component.html',
	styleUrls: ['./captions.component.css']
})
export class CaptionsSettingComponent implements OnInit, OnDestroy {
	captionsEnabled: boolean;
	languagesAvailable: { name: string; ISO: string }[] = [];
	captionsSubscription: Subscription;
	langSelected: string;
	isOpenViduPro: boolean = false;

	constructor(private layoutService: LayoutService, private captionService: CaptionService, private openviduService: OpenViduService) {}

	ngOnInit(): void {
		this.isOpenViduPro = this.openviduService.isOpenViduPro();
		if (this.isOpenViduPro) {
			this.subscribeToCaptions();
			this.langSelected = this.captionService.getLangSelected().name;
			this.languagesAvailable = this.captionService.getCaptionLanguages();
		}
	}

	ngOnDestroy() {
		if (this.captionsSubscription) this.captionsSubscription.unsubscribe();
	}

	onLangSelected(lang: { name: string; ISO: string }) {
		this.langSelected = lang.name;
		this.captionService.setLanguage(lang.ISO);
	}

	toggleCaptions() {
		this.layoutService.toggleCaptions();
	}

	private subscribeToCaptions() {
		this.captionsSubscription = this.layoutService.captionsTogglingObs.subscribe((value: boolean) => {
			this.captionsEnabled = value;
			// this.cd.markForCheck();
		});
	}
}
