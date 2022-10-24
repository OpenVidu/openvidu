import {
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	ElementRef,
	OnInit,
	QueryList, ViewChildren
} from '@angular/core';
import { Subscription } from 'rxjs';
import { PanelEvent, PanelService } from '../../services/panel/panel.service';

import { animate, style, transition, trigger } from '@angular/animations';
import { Session, SpeechToTextEvent } from 'openvidu-browser';
import { CaptionModel } from '../../models/caption.model';
import { PanelSettingsOptions, PanelType } from '../../models/panel.model';
import { CaptionService } from '../../services/caption/caption.service';
import { OpenViduService } from '../../services/openvidu/openvidu.service';
import { ParticipantService } from '../../services/participant/participant.service';

/**
 * @internal
 */
@Component({
	selector: 'ov-captions',
	templateUrl: './captions.component.html',
	styleUrls: ['./captions.component.css'],
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

	session: Session;

	private deleteTimeout: NodeJS.Timeout;

	private DELETE_TIMEOUT = 5 * 1000;
	private MAX_EVENTS_LIMIT = 3;
	private captionLanguageSubscription: Subscription;
	private captionLangSelected: { name: string; ISO: string };
	private screenSizeSub: Subscription;
	private panelTogglingSubscription: Subscription;

	constructor(
		private panelService: PanelService,
		private openviduService: OpenViduService,
		private participantService: ParticipantService,
		private captionService: CaptionService,
		private cd: ChangeDetectorRef
	) {}

	ngOnInit(): void {
		this.captionLangSelected = this.captionService.getLangSelected();
		this.session = this.openviduService.getWebcamSession();

		this.subscribeToCaptionLanguage();
		this.subscribeToPanelToggling();
		this.subscribeToTranscription();
	}

	ngOnDestroy() {
		if (this.screenSizeSub) this.screenSizeSub.unsubscribe();
		if (this.panelTogglingSubscription) this.panelTogglingSubscription.unsubscribe();
		this.session.off('speechToTextMessage');
		this.captionEvents = [];
	}

	onSettingsCliked() {
		this.panelService.togglePanel(PanelType.SETTINGS, PanelSettingsOptions.CAPTIONS);
	}

	private subscribeToTranscription() {
		this.session.on('speechToTextMessage', (event: SpeechToTextEvent) => {
			const { connectionId, data } = event.connection;
			const nickname: string = this.participantService.getNicknameFromConnectionData(data);
			const color = this.participantService.getRemoteParticipantByConnectionId(connectionId)?.colorProfile || '';

			const caption: CaptionModel = {
				connectionId,
				nickname,
				color,
				text: event.text,
				type: event.reason
			};
			this.updateCaption(caption);
			this.cd.markForCheck();
		});
	}
	private updateCaption(caption: CaptionModel): void {
		let captionEventsCopy = [...this.captionEvents];
		let eventsNumber = captionEventsCopy.length;

		if (eventsNumber === this.MAX_EVENTS_LIMIT) {
			captionEventsCopy.shift();
			eventsNumber--;
		}

		if (eventsNumber === 0) {
			captionEventsCopy.push(caption);
		} else {
			const lastCaption: CaptionModel = captionEventsCopy.slice(-1)[0];
			const sameAuthorAsAbove: boolean = lastCaption.connectionId === caption.connectionId;
			const allEventsAreSameSpeaker = captionEventsCopy.every((e) => e.connectionId === caption.connectionId);

			if (sameAuthorAsAbove) {
				if (lastCaption.type === 'recognized') {
					if (eventsNumber === 2 && allEventsAreSameSpeaker) {
						captionEventsCopy.shift();
						clearInterval(this.deleteTimeout);
					}
					captionEventsCopy.push(caption);
					this.deleteEventAfterDelay(this.DELETE_TIMEOUT);
				} else {
					lastCaption.text = caption.text;
					lastCaption.type = caption.type;
				}
			} else {
				// TODO: Test when STT is able to work with multiple streams
				if (eventsNumber === 2) {
					captionEventsCopy.shift();
					clearInterval(this.deleteTimeout);
				}
				captionEventsCopy.push(caption);
				this.deleteEventAfterDelay(this.DELETE_TIMEOUT);
			}
		}

		this.captionEvents = [...captionEventsCopy];
		this.scrollToBottom();
	}

	private deleteEventAfterDelay(timeout: number) {
		this.deleteTimeout = setTimeout(() => {
			this.captionEvents.shift();
			this.cd.markForCheck();
		}, timeout);
	}

	private subscribeToCaptionLanguage() {
		this.captionLanguageSubscription = this.captionService.captionLangObs.subscribe((lang) => {
			this.captionLangSelected = lang;
			this.cd.markForCheck();
		});
	}

	private subscribeToPanelToggling() {
		this.panelTogglingSubscription = this.panelService.panelOpenedObs.subscribe((ev: PanelEvent) => {
			this.settingsPanelOpened = ev.opened;
			setTimeout(() => this.cd.markForCheck(), 300);
		});
	}

	private scrollToBottom(): void {
		setTimeout(() => {
			try {
				this.scrollContainer.forEach((el: ElementRef) => {
					el.nativeElement.scroll({
						top: this.scrollContainer.first.nativeElement.scrollHeight,
						left: 0
						// behavior: 'smooth'
					});
				});
			} catch (err) {}
		}, 20);
	}
}
