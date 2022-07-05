import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { LayoutService } from '../../../services/layout/layout.service';

@Component({
	selector: 'ov-subtitles-settings',
	templateUrl: './subtitles.component.html',
	styleUrls: ['./subtitles.component.css']
})
export class SubtitlesSettingComponent implements OnInit, OnDestroy {
	subtitlesEnabled: boolean;
	languagesAvailable = [];
	subtitlesSubs: Subscription;
	langSelected: string = 'English';

	constructor(private layoutService: LayoutService) {}

	ngOnInit(): void {
		this.subscribeToSubtitles();
	}

	ngOnDestroy() {
		if (this.subtitlesSubs) this.subtitlesSubs.unsubscribe();
	}

	onLangSelected(lang: string){
		this.langSelected = lang;
	}

	toggleSubtitles() {
		this.layoutService.toggleSubtitles();
	}

	private subscribeToSubtitles() {
		this.subtitlesSubs = this.layoutService.subtitlesTogglingObs.subscribe((value: boolean) => {
			this.subtitlesEnabled = value;
			// this.cd.markForCheck();
		});
	}
}
