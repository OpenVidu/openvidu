import { Component, EventEmitter, HostListener, OnDestroy, OnInit, Output } from '@angular/core';

import { Subscription } from 'rxjs';
import { ILogger } from '../../models/logger.model';
import { PanelType } from '../../models/panel.model';
import { ParticipantAbstractModel } from '../../models/participant.model';
import { CdkOverlayService } from '../../services/cdk-overlay/cdk-overlay.service';
import { OpenViduAngularConfigService } from '../../services/config/openvidu-angular.config.service';
import { LayoutService } from '../../services/layout/layout.service';
import { LoggerService } from '../../services/logger/logger.service';
import { PanelService } from '../../services/panel/panel.service';
import { ParticipantService } from '../../services/participant/participant.service';

/**
 * @internal
 */
@Component({
	selector: 'ov-pre-join',
	templateUrl: './pre-join.component.html',
	styleUrls: ['./pre-join.component.css']
})
export class PreJoinComponent implements OnInit, OnDestroy {
	@Output() onJoinButtonClicked = new EventEmitter<any>();

	localParticipant: ParticipantAbstractModel;
	windowSize: number;
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
		private loggerSrv: LoggerService,
		private participantService: ParticipantService,
		protected panelService: PanelService,
		private libService: OpenViduAngularConfigService,
		protected cdkSrv: CdkOverlayService
	) {
		this.log = this.loggerSrv.get('PreJoinComponent');
	}

	ngOnInit() {
		this.subscribeToPrejoinDirectives();
		this.subscribeToLocalParticipantEvents();

		this.windowSize = window.innerWidth;
		this.isLoading = false;
	}

	async ngOnDestroy() {
		this.cdkSrv.setSelector('body');
		if (this.localParticipantSubscription) this.localParticipantSubscription.unsubscribe();
		if (this.screenShareStateSubscription) this.screenShareStateSubscription.unsubscribe();
		if (this.backgroundEffectsButtonSub) this.backgroundEffectsButtonSub.unsubscribe();
		if (this.minimalSub) this.minimalSub.unsubscribe();
		this.panelService.closePanel();
	}

	onDeviceSelectorClicked() {
		// Some devices as iPhone do not show the menu panels correctly
		// Updating the container where the panel is added fix the problem.
		this.cdkSrv.setSelector('#prejoin-container');
	}

	onVideoMutedClicked(hasVideo: boolean) {
		if (!hasVideo) {
			this.panelService.closePanel();
		}
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
