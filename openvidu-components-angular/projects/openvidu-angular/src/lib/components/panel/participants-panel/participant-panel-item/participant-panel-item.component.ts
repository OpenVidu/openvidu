import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ContentChild, Input, OnDestroy, OnInit, TemplateRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { ParticipantPanelItemElementsDirective } from '../../../../directives/template/openvidu-angular.directive';
import { ParticipantAbstractModel } from '../../../../models/participant.model';
import { OpenViduAngularConfigService } from '../../../../services/config/openvidu-angular.config.service';
import { ParticipantService } from '../../../../services/participant/participant.service';

/**
 *
 * The **ParticipantPanelItemComponent** is hosted inside of the {@link ParticipantsPanelComponent}.
 * It is in charge of displaying the participants information inside of the ParticipansPanelComponent.
 *
 * <div class="custom-table-container">
 * <div>
 *  <h3>API Directives</h3>
 *
 * This component allows us to show or hide certain HTML elements with the following {@link https://angular.io/guide/attribute-directives Angular attribute directives}
 * with the aim of fully customizing the ToolbarComponent.
 *
 * | **Name**                  | **Type**  | **Reference**                                   |
 * | :----------------------------: | :-------: | :---------------------------------------------: |
 * | **muteButton** | `boolean` | {@link ParticipantPanelItemMuteButtonDirective} |
 *
 * <p class="component-link-text">
 * <span class="italic">See all {@link ApiDirectiveModule API Directives}</span>
 * </p>
 *
 * </div>
 * <div>
 *
 * <h3>OpenVidu Angular Directives</h3>
 *
 * The ParticipantPanelItemComponent can be replaced with a custom component. It provides us the following {@link https://angular.io/guide/structural-directives Angular structural directives}
 * for doing this.
 *
 * |            **Directive**           |                 **Reference**                 |
 * |:----------------------------------:|:---------------------------------------------:|
 * |     ***ovParticipantPanelItem**     |     {@link ParticipantPanelItemDirective}     |
 *
 * </br>
 *
 * It is also providing us a way to **add additional buttons** to the default participant panel item.
 * It will recognise the following directive in a child element.
 *
 * |            **Directive**           |                 **Reference**                 |
 * |:----------------------------------:|:---------------------------------------------:|
 * | ***ovParticipantPanelItemElements** | {@link ParticipantPanelItemElementsDirective} |
 *
 * <p class="component-link-text">
 * 	<span class="italic">See all {@link OpenViduAngularDirectiveModule OpenVidu Angular Directives}</span>
 * </p>
 * </div>
 * </div>
 */

@Component({
	selector: 'ov-participant-panel-item',
	templateUrl: './participant-panel-item.component.html',
	styleUrls: ['./participant-panel-item.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush
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

	@Input()
	set participant(participant: ParticipantAbstractModel) {
		this._participant = participant;
	}

	/**
     * @ignore
     */
	_participant: ParticipantAbstractModel;

	/**
     * @ignore
     */
	constructor(private libService: OpenViduAngularConfigService, protected participantService: ParticipantService, private cd: ChangeDetectorRef) {}

	ngOnInit(): void {
		this.subscribeToParticipantPanelItemDirectives();
	}
	ngOnDestroy(): void {
		if (this.muteButtonSub) this.muteButtonSub.unsubscribe();
	}

	/**
	 * @ignore
	 */
	toggleMuteForcibly() {
		this.participantService.setRemoteMutedForcibly(this._participant.id, !this._participant.isMutedForcibly);
	}

	private subscribeToParticipantPanelItemDirectives() {
		this.muteButtonSub = this.libService.participantItemMuteButton.subscribe((value: boolean) => {
			this.showMuteButton = value;
			this.cd.markForCheck();
		});
	}
}
