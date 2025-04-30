import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ContentChild, Input, OnDestroy, OnInit, TemplateRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { ParticipantPanelItemElementsDirective } from '../../../../directives/template/openvidu-components-angular.directive';
import { ParticipantModel } from '../../../../models/participant.model';
import { OpenViduComponentsConfigService } from '../../../../services/config/directive-config.service';
import { ParticipantService } from '../../../../services/participant/participant.service';

/**
 *
 * The **ParticipantPanelItemComponent** is hosted inside of the {@link ParticipantsPanelComponent}.
 * It is in charge of displaying the participants information inside of the ParticipansPanelComponent.
 */

@Component({
	selector: 'ov-participant-panel-item',
	templateUrl: './participant-panel-item.component.html',
	styleUrls: ['./participant-panel-item.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	standalone: false
})
export class ParticipantPanelItemComponent implements OnInit, OnDestroy {
	/**
	 * @ignore
	 */
	@ContentChild('participantPanelItemElements', { read: TemplateRef }) participantPanelItemElementsTemplate: TemplateRef<any>;

	/**
	 * @ignore
	 */
	showMuteButton: boolean = true;
	private muteButtonSub: Subscription;

	/**
	 * @ignore
	 */
	@ContentChild(ParticipantPanelItemElementsDirective)
	set externalItemElements(externalItemElements: ParticipantPanelItemElementsDirective) {
		// This directive will has value only when ITEM ELEMENTS component tagget with '*ovParticipantPanelItemElements' directive
		// is inside of the P PANEL ITEM component tagged with '*ovParticipantPanelItem' directive
		if (externalItemElements) {
			this.participantPanelItemElementsTemplate = externalItemElements.template;
		}
	}

	/**
	 * The participant to be displayed
	 * @ignore
	 */
	@Input()
	set participant(participant: ParticipantModel) {
		this._participant = participant;
	}

	/**
	 * @ignore
	 */
	_participant: ParticipantModel;

	/**
	 * @ignore
	 */
	constructor(
		private libService: OpenViduComponentsConfigService,
		private participantService: ParticipantService,
		private cd: ChangeDetectorRef
	) {}

	/**
	 * @ignore
	 */
	ngOnInit(): void {
		this.subscribeToParticipantPanelItemDirectives();
	}

	/**
	 * @ignore
	 */
	ngOnDestroy(): void {
		if (this.muteButtonSub) this.muteButtonSub.unsubscribe();
	}

	/**
	 * @ignore
	 */
	toggleMuteForcibly() {
		if (this._participant) {
			this.participantService.setRemoteMutedForcibly(this._participant.sid, !this._participant.isMutedForcibly);
		}
	}

	private subscribeToParticipantPanelItemDirectives() {
		this.muteButtonSub = this.libService.participantItemMuteButton$.subscribe((value: boolean) => {
			this.showMuteButton = value;
			this.cd.markForCheck();
		});
	}
}
