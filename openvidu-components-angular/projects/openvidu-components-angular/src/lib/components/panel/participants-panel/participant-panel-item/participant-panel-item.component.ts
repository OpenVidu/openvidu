import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ContentChild, Input, OnDestroy, OnInit, TemplateRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { ParticipantPanelItemElementsDirective } from '../../../../directives/template/openvidu-components-angular.directive';
// import { ParticipantPanelAfterLocalParticipantDirective } from '../../../../directives/template/internals.directive';
import { ParticipantModel } from '../../../../models/participant.model';
import { OpenViduComponentsConfigService } from '../../../../services/config/directive-config.service';
import { ParticipantService } from '../../../../services/participant/participant.service';
import { TemplateManagerService, ParticipantPanelItemTemplateConfiguration } from '../../../../services/template/template-manager.service';

/**
 * The **ParticipantPanelItemComponent** is hosted inside of the {@link ParticipantsPanelComponent}.
 * It displays participant information with enhanced UI/UX, including support for custom content
 * injection through structural directives.
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

	// /**
	//  * @ignore
	//  */
	// @ContentChild(ParticipantPanelAfterLocalParticipantDirective)
	// set externalAfterLocalParticipant(afterLocalParticipant: ParticipantPanelAfterLocalParticipantDirective) {
	// 	this._externalAfterLocalParticipant = afterLocalParticipant;
	// 	if (afterLocalParticipant) {
	// 		this.updateTemplatesAndMarkForCheck();
	// 	}
	// }

	/**
	 * @internal
	 * Template configuration managed by the service
	 */
	templateConfig: ParticipantPanelItemTemplateConfiguration = {};

	// Store directive references for template setup
	private _externalItemElements?: ParticipantPanelItemElementsDirective;
	// private _externalAfterLocalParticipant?: ParticipantPanelAfterLocalParticipantDirective;

	/**
	 * The participant to be displayed
	 */
	@Input()
	set participant(participant: ParticipantModel) {
		this._participant = participant;
		this.cd.markForCheck();
	}

	/**
	 * @internal
	 * Current participant being displayed
	 */
	_participant: ParticipantModel;

	/**
	 * Whether to show the mute button for remote participants
	 */
	@Input()
	muteButton: boolean = true;

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
	 * Toggles the mute state of a remote participant
	 */
	toggleMuteForcibly() {
		if (this._participant && !this._participant.isLocal) {
			this.participantService.setRemoteMutedForcibly(this._participant.sid, !this._participant.isMutedForcibly);
		}
	}

	/**
	 * Gets the template for content after local participant
	 */
	// get afterLocalParticipantTemplate(): TemplateRef<any> | undefined {
	// 	return this._externalAfterLocalParticipant?.template;
	// }

	/**
	 * Checks if the current participant is the local participant
	 */
	get isLocalParticipant(): boolean {
		return this._participant?.isLocal || false;
	}

	/**
	 * Gets the participant's display name
	 */
	get participantDisplayName(): string {
		return this._participant?.name || '';
	}

	/**
	 * Checks if external elements are available
	 */
	get hasExternalElements(): boolean {
		return !!this.participantPanelItemElementsTemplate;
	}

	/**
	 * Checks if after local participant content is available
	 */
	// get hasAfterLocalContent(): boolean {
	// 	return this.isLocalParticipant && !!this.afterLocalParticipantTemplate;
	// }

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
