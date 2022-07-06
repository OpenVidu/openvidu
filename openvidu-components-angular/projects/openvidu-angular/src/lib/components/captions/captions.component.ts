import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { PanelSettingsOptions, PanelType } from '../../models/panel.model';
import { PanelEvent, PanelService } from '../../services/panel/panel.service';
import { DocumentService } from '../../services/document/document.service';
import { MediaChange } from '@angular/flex-layout';

//TODO: BORRAR
import { LoremIpsum } from 'lorem-ipsum';

/**
 * @internal
 */
@Component({
	selector: 'ov-captions',
	templateUrl: './captions.component.html',
	styleUrls: ['./captions.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class CaptionsComponent implements OnInit {
	/**
	 * @ignore
	 */
	subtitleText: string;
	/**
	 * @ignore
	 */
	screenSize: string;
	/**
	 * @ignore
	 */
	settingsPanelOpened: boolean;
	private screenSizeSub: Subscription;
	private panelTogglingSubscription: Subscription;
  interval: NodeJS.Timer;

	constructor(private documentService: DocumentService, private panelService: PanelService, private cd: ChangeDetectorRef) {}

	ngOnInit(): void {
		this.subscribeToScreenSize();
    this.subscribeToPanelToggling();

		//TODO: Subscribe to openvidu-browser subtitle event
		// TODO: REMOVE ------------------
		const lorem = new LoremIpsum();
		this.interval = setInterval(() => {
			this.subtitleText = lorem.generateSentences(1);
			this.cd.markForCheck();
		}, 3000);
		// TODO: REMOVE ------------------
	}

	ngOnDestroy() {
		if (this.screenSizeSub) this.screenSizeSub.unsubscribe();
    if(this.panelTogglingSubscription) this.panelTogglingSubscription.unsubscribe();
		//TODO: Unsubscribe to openvidu-browser subtitle event
    clearInterval(this.interval);
	}

	onSettingsCliked() {
		this.panelService.togglePanel(PanelType.SETTINGS, PanelSettingsOptions.SUBTITLES);
	}

	private subscribeToPanelToggling() {
		this.panelTogglingSubscription = this.panelService.panelOpenedObs.subscribe((ev: PanelEvent) => {
			this.settingsPanelOpened = ev.opened;
			this.cd.markForCheck();
		});
	}

	private subscribeToScreenSize() {
		this.screenSizeSub = this.documentService.screenSizeObs.subscribe((change: MediaChange[]) => {
			this.screenSize = change[0].mqAlias;
			console.log(this.screenSize);
			this.cd.markForCheck();
		});
	}
}
