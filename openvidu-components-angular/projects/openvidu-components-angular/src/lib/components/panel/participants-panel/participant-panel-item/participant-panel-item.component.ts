import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ContentChild, Input, OnDestroy, OnInit, TemplateRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { ParticipantPanelItemElementsDirective } from '../../../../directives/template/openvidu-components-angular.directive';
import { ParticipantModel } from '../../../../models/participant.model';
import { OpenViduComponentsConfigService } from '../../../../services/config/directive-config.service';
import { ParticipantService } from '../../../../services/participant/participant.service';
import { TemplateManagerService, ParticipantPanelItemTemplateConfiguration } from '../../../../services/template/template-manager.service';

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
		this._externalItemElements = externalItemElements;
		if (externalItemElements) {
			this.updateTemplatesAndMarkForCheck();
		}
	}

	/**
	 * @internal
	 * Template configuration managed by the service
	 */
	templateConfig: ParticipantPanelItemTemplateConfiguration = {};

	// Store directive references for template setup
	private _externalItemElements?: ParticipantPanelItemElementsDirective;

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
		private cd: ChangeDetectorRef,
		private templateManagerService: TemplateManagerService
	) {}

	/**
	 * @ignore
	 */
	ngOnInit(): void {
		this.setupTemplates();
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

	/**
	 * @internal
	 * Sets up all templates using the template manager service
	 */
	private setupTemplates(): void {
		this.templateConfig = this.templateManagerService.setupParticipantPanelItemTemplates(
			this._externalItemElements
		);

		// Apply templates to component properties for backward compatibility
		this.applyTemplateConfiguration();
	}

	/**
	 * @internal
	 * Applies the template configuration to component properties
	 */
	private applyTemplateConfiguration(): void {
		if (this.templateConfig.participantPanelItemElementsTemplate) {
			this.participantPanelItemElementsTemplate = this.templateConfig.participantPanelItemElementsTemplate;
		}
	}

	/**
	 * @internal
	 * Updates templates and triggers change detection
	 */
	private updateTemplatesAndMarkForCheck(): void {
		this.setupTemplates();
		this.cd.markForCheck();
	}

	private subscribeToParticipantPanelItemDirectives() {
		this.muteButtonSub = this.libService.participantItemMuteButton$.subscribe((value: boolean) => {
			this.showMuteButton = value;
			this.cd.markForCheck();
		});
	}
}
