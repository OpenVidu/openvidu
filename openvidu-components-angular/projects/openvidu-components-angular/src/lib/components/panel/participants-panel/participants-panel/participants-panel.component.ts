import {
	AfterViewInit,
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	ContentChild,
	OnDestroy,
	OnInit,
	TemplateRef,
	ViewChild
} from '@angular/core';
// import { ParticipantModel } from '../../../../models/participant.model';
import { ParticipantService } from '../../../../services/participant/participant.service';
import { PanelService } from '../../../../services/panel/panel.service';
import { ParticipantPanelItemDirective } from '../../../../directives/template/openvidu-components-angular.directive';
import { Subscription } from 'rxjs';
import { ParticipantModel } from '../../../../models/participant.model';

/**
 * The **ParticipantsPanelComponent** is hosted inside of the {@link PanelComponent}.
 * It is in charge of displaying the participants connected to the session.
 * This component is composed by the {@link ParticipantPanelItemComponent}.
 */
@Component({
	selector: 'ov-participants-panel',
	templateUrl: './participants-panel.component.html',
	styleUrls: ['../../panel.component.scss', './participants-panel.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	standalone: false
})
export class ParticipantsPanelComponent implements OnInit, OnDestroy, AfterViewInit {
	/**
	 * @ignore
	 */
	localParticipant: ParticipantModel | undefined;
	/**
	 * @ignore
	 */
	remoteParticipants: ParticipantModel[] = [];

	/**
	 * @ignore
	 */
	@ViewChild('defaultParticipantPanelItem', { static: false, read: TemplateRef }) defaultParticipantPanelItemTemplate: TemplateRef<any>;

	/**
	 * @ignore
	 */
	@ContentChild('participantPanelItem', { read: TemplateRef }) participantPanelItemTemplate: TemplateRef<any>;

	/**
	 * @ignore
	 */
	@ContentChild(ParticipantPanelItemDirective)
	set externalParticipantPanelItem(externalParticipantPanelItem: ParticipantPanelItemDirective) {
		// This directive will has value only when PARTICIPANT PANEL ITEM component tagged with '*ovParticipantPanelItem'
		// is inside of the PARTICIPANTS PANEL component tagged with '*ovParticipantsPanel'
		if (externalParticipantPanelItem) {
			this.participantPanelItemTemplate = externalParticipantPanelItem.template;
		}
	}

	private localParticipantSubs: Subscription;
	private remoteParticipantsSubs: Subscription;

	/**
	 * @ignore
	 */
	constructor(
		private participantService: ParticipantService,
		private panelService: PanelService,
		private cd: ChangeDetectorRef
	) {}

	/**
	 * @ignore
	 */
	ngOnInit(): void {
		this.localParticipantSubs = this.participantService.localParticipant$.subscribe((p: ParticipantModel | undefined) => {
			if (p) {
				this.localParticipant = p;
				this.cd.markForCheck();
			}
		});

		this.remoteParticipantsSubs = this.participantService.remoteParticipants$.subscribe((p: ParticipantModel[]) => {
			this.remoteParticipants = p;
			this.cd.markForCheck();
		});
	}

	/**
	 * @ignore
	 */
	ngOnDestroy() {
		if (this.localParticipantSubs) this.localParticipantSubs.unsubscribe();
		if (this.remoteParticipantsSubs) this.remoteParticipantsSubs.unsubscribe;
	}

	/**
	 * @ignore
	 */
	ngAfterViewInit() {
		if (!this.participantPanelItemTemplate) {
			// the user has override the default participants panel but not the 'participant-panel-item'
			// so the default component must be injected
			this.participantPanelItemTemplate = this.defaultParticipantPanelItemTemplate;
			this.cd.detectChanges();
		}
	}

	/**
	 * @ignore
	 */
	close() {
		this.panelService.closePanel();
	}
}
