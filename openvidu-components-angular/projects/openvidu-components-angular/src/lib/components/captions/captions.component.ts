import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnInit, QueryList, ViewChildren } from '@angular/core';
import { Subscription } from 'rxjs';
import { PanelService } from '../../services/panel/panel.service';

import { animate, style, transition, trigger } from '@angular/animations';
import { CaptionModel, CaptionsLangOption } from '../../models/caption.model';
import { PanelStatusInfo, PanelSettingsOptions, PanelType } from '../../models/panel.model';
import { CaptionService } from '../../services/caption/caption.service';
import { OpenViduService } from '../../services/openvidu/openvidu.service';
import { ParticipantService } from '../../services/participant/participant.service';

/**
 * @internal
 */
@Component({
	selector: 'ov-captions',
	templateUrl: './captions.component.html',
	styleUrls: ['./captions.component.scss'],
	animations: [
		trigger('captionAnimation', [
			transition(':enter', [style({ opacity: 0 }), animate('50ms ease-in', style({ opacity: 1 }))])
			// transition(':leave', [style({ opacity: 1 }), animate('10ms ease-out', style({ opacity: 0 }))])
		])
	],
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class CaptionsComponent implements OnInit {
	scrollContainer: QueryList<ElementRef>;

	@ViewChildren('captionEventElement')
	set captionEventRef(captionEventsRef: QueryList<ElementRef>) {
		setTimeout(() => {
			if (captionEventsRef) {
				this.scrollContainer = captionEventsRef;
			}
		}, 0);
	}

	settingsPanelOpened: boolean;

	captionEvents: CaptionModel[] = [];

	// session: Session;
	isSttReady: boolean = true;

	private deleteFirstTimeout: NodeJS.Timeout;
	private deleteAllTimeout: NodeJS.Timeout;

	private DELETE_TIMEOUT = 10 * 1000;
	private MAX_EVENTS_LIMIT = 3;
	private captionLanguageSubscription: Subscription;
	private captionLangSelected: CaptionsLangOption;
	private screenSizeSub: Subscription;
	private panelTogglingSubscription: Subscription;
	private sttStatusSubscription: Subscription;

	constructor(
		private panelService: PanelService,
		private openviduService: OpenViduService,
		private participantService: ParticipantService,
		private captionService: CaptionService,
		private cd: ChangeDetectorRef
	) {}

	async ngOnInit(): Promise<void> {
		// this.subscribeToSTTStatus();
		// this.captionService.setCaptionsEnabled(true);
		// this.captionLangSelected = this.captionService.getLangSelected();
		// await this.openviduService.subscribeRemotesToSTT(this.captionLangSelected.lang);
		// this.subscribeToCaptionLanguage();
		// this.subscribeToPanelToggling();
		// this.subscribeToTranscription();
	}

	async ngOnDestroy() {
		// await this.openviduService.unsubscribeRemotesFromSTT();
		// this.captionService.setCaptionsEnabled(false);
		// if (this.screenSizeSub) this.screenSizeSub.unsubscribe();
		// if (this.panelTogglingSubscription) this.panelTogglingSubscription.unsubscribe();
		// if(this.sttStatusSubscription) this.sttStatusSubscription.unsubscribe();
		// // this.session.off('speechToTextMessage');
		// this.captionEvents = [];
	}

	onSettingsCliked() {
		this.panelService.togglePanel(PanelType.SETTINGS, PanelSettingsOptions.CAPTIONS);
	}

	private subscribeToTranscription() {
		// this.session.on('speechToTextMessage', (event: SpeechToTextEvent) => {
		// 	if(!!event.text) {
		// 		clearInterval(this.deleteAllTimeout);
		// 		const { connectionId, data } = event.connection;
		// 		const nickname: string = this.participantService.getNicknameFromConnectionData(data);
		// 		const color = this.participantService.getRemoteParticipantByConnectionId(connectionId)?.colorProfile || '';
		// 		const caption: CaptionModel = {
		// 			connectionId,
		// 			nickname,
		// 			color,
		// 			text: event.text,
		// 			type: event.reason
		// 		};
		// 		this.updateCaption(caption);
		// 		// Delete all events when there are no more events for a period of time
		// 		this.deleteAllEventsAfterDelay(this.DELETE_TIMEOUT);
		// 		this.cd.markForCheck();
		// 	}
		// });
	}
	private updateCaption(caption: CaptionModel): void {
		let captionEventsCopy = [...this.captionEvents];
		let eventsNumber = captionEventsCopy.length;

		if (eventsNumber === 0) {
			captionEventsCopy.push(caption);
		} else {
			const lastCaption: CaptionModel | undefined = captionEventsCopy[eventsNumber - 1];
			const sameSpeakerAsAbove: boolean = lastCaption.connectionId === caption.connectionId;
			const lastSpeakerHasStoppedTalking = lastCaption.type === 'recognized';

			if (sameSpeakerAsAbove) {
				if (lastSpeakerHasStoppedTalking) {
					// Add event if different from previous one
					if (caption.text !== lastCaption.text) {
						this.deleteFirstEventAfterDelay(this.DELETE_TIMEOUT);
						captionEventsCopy.push(caption);
					}
				} else {
					//Updating last 'recognizing' caption
					lastCaption.text = caption.text;
					lastCaption.type = caption.type;
				}
			} else {
				// Different speaker is talking
				const speakerExists: boolean = captionEventsCopy.some((ev) => ev.connectionId === caption.connectionId);
				if (speakerExists) {
					// Speaker is already showing
					if (lastSpeakerHasStoppedTalking) {
						this.deleteFirstEventAfterDelay(this.DELETE_TIMEOUT);
						captionEventsCopy.push(caption);
					} else {
						// There was an interruption. Last event is still being 'recognizing' (speaker is talking)
						// Update last speaker event.
						const lastSpeakerCaption = captionEventsCopy.find((cap) => cap.connectionId === caption.connectionId);
						if (lastSpeakerCaption) {
							if (lastSpeakerCaption.type === 'recognized') {
								captionEventsCopy.push(caption);
							} else {
								lastSpeakerCaption.text = caption.text;
								lastSpeakerCaption.type = caption.type;
							}
						}
					}
				} else {
					this.deleteFirstEventAfterDelay(this.DELETE_TIMEOUT);
					captionEventsCopy.push(caption);
				}
			}
		}

		if (captionEventsCopy.length === this.MAX_EVENTS_LIMIT) {
			clearInterval(this.deleteFirstTimeout);
			captionEventsCopy.shift();
		}

		this.captionEvents = [...captionEventsCopy];
		this.scrollToBottom();
	}

	private deleteFirstEventAfterDelay(timeout: number) {
		this.deleteFirstTimeout = setTimeout(() => {
			this.captionEvents.shift();
			this.cd.markForCheck();
		}, timeout);
	}

	private deleteAllEventsAfterDelay(timeout: number) {
		this.deleteAllTimeout = setTimeout(() => {
			this.captionEvents = [];
			this.cd.markForCheck();
		}, timeout);
	}

	// private subscribeToSTTStatus() {
	// 	this.sttStatusSubscription = this.openviduService.isSttReadyObs.subscribe((ready: boolean) => {
	// 		this.isSttReady = ready;
	// 		this.cd.markForCheck();
	// 	});
	// }

	// private subscribeToCaptionLanguage() {
	// 	this.captionLanguageSubscription = this.captionService.captionLangObs.subscribe((langOpt) => {
	// 		this.captionLangSelected = langOpt;
	// 		this.cd.markForCheck();
	// 	});
	// }

	// private subscribeToPanelToggling() {
	// 	this.panelTogglingSubscription = this.panelService.panelStatusObs.subscribe((ev: PanelStatusInfo) => {
	// 		this.settingsPanelOpened = ev.opened;
	// 		setTimeout(() => this.cd.markForCheck(), 300);
	// 	});
	// }

	private scrollToBottom(): void {
		setTimeout(() => {
			try {
				this.scrollContainer.forEach((el: ElementRef, index: number) => {
					el.nativeElement.scroll({
						top: this.scrollContainer.get(index)?.nativeElement.scrollHeight,
						left: 0
						// behavior: 'smooth'
					});
				});
			} catch (err) {}
		}, 20);
	}
}
