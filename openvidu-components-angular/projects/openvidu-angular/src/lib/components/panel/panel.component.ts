import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ContentChild, OnInit, TemplateRef } from '@angular/core';
import { skip, Subscription } from 'rxjs';
import {
	ActivitiesPanelDirective, AdditionalPanelsDirective, ChatPanelDirective, ParticipantsPanelDirective
} from '../../directives/template/openvidu-angular.directive';
import { PanelEvent, PanelType } from '../../models/panel.model';
import { PanelService } from '../../services/panel/panel.service';

/**
 *
 * The **PanelComponent** is hosted inside of the {@link VideoconferenceComponent}.
 * It is in charge of displaying the videoconference panels providing functionalities to the videoconference app
 * such as the chat ({@link ChatPanelComponent}) and list of participants ({@link ParticipantsPanelComponent}) .
 *
 * <div class="custom-table-container">

 * <div>
 *
 * <h3>OpenVidu Angular Directives</h3>
 *
 * The PanelComponent can be replaced with a custom component. It provides us the following {@link https://angular.io/guide/structural-directives Angular structural directives}
 * for doing this.
 *
 * |            **Directive**           |                 **Reference**                 |
 * |:----------------------------------:|:---------------------------------------------:|
 * |           ***ovPanel**           |            {@link PanelDirective}           |
 *
 * </br>
 *
 * It is also providing us a way to **replace the children panels** to the default panel.
 * It will recognise the following directive in a child element.
 *
 * |            **Directive**           |                 **Reference**                 |
 * |:----------------------------------:|:---------------------------------------------:|
 * |           ***ovChatPanel**          |           {@link ChatPanelDirective}          |
 * |       ***ovParticipantsPanel**      |       {@link ParticipantsPanelDirective}      |
 * |        ***ovAdditionalPanels**      |       {@link AdditionalPanelsDirective}       |
 *
 * <p class="component-link-text">
 * 	<span class="italic">See all {@link OpenViduAngularDirectiveModule OpenVidu Angular Directives}</span>
 * </p>
 * </div>
 * </div>
 */

@Component({
	selector: 'ov-panel',
	templateUrl: './panel.component.html',
	styleUrls: ['./panel.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class PanelComponent implements OnInit {
	/**
	 * @ignore
	 */
	@ContentChild('participantsPanel', { read: TemplateRef }) participantsPanelTemplate: TemplateRef<any>;

	/**
	 * @ignore
	 */
	@ContentChild('backgroundEffectsPanel', { read: TemplateRef }) backgroundEffectsPanelTemplate: TemplateRef<any>;

	/**
	 * @ignore
	 */
	@ContentChild('settingsPanel', { read: TemplateRef }) settingsPanelTemplate: TemplateRef<any>;

	/**
	 * @ignore
	 */
	@ContentChild('activitiesPanel', { read: TemplateRef }) activitiesPanelTemplate: TemplateRef<any>;
	/**
	 * @ignore
	 */
	@ContentChild('chatPanel', { read: TemplateRef }) chatPanelTemplate: TemplateRef<any>;

	/**
	 * @ignore
	 */
	@ContentChild('additionalPanels', { read: TemplateRef }) additionalPanelsTemplate: TemplateRef<any>;

	@ContentChild(ParticipantsPanelDirective)
	set externalParticipantPanel(externalParticipantsPanel: ParticipantsPanelDirective) {
		// This directive will has value only when PARTICIPANTS PANEL component tagged with '*ovParticipantsPanel'
		// is inside of the PANEL component tagged with '*ovPanel'
		if (externalParticipantsPanel) {
			this.participantsPanelTemplate = externalParticipantsPanel.template;
		}
	}

	// TODO: backgroundEffectsPanel does not provides customization
	// @ContentChild(BackgroundEffectsPanelDirective)
	// set externalBackgroundEffectsPanel(externalBackgroundEffectsPanel: BackgroundEffectsPanelDirective) {
	// This directive will has value only when BACKGROUND EFFECTS PANEL component tagged with '*ovBackgroundEffectsPanel'
	// is inside of the PANEL component tagged with '*ovPanel'
	// if (externalBackgroundEffectsPanel) {
	// 	this.backgroundEffectsPanelTemplate = externalBackgroundEffectsPanel.template;
	// }
	// }

	// TODO: settingsPanel does not provides customization
	// @ContentChild(SettingsPanelDirective)
	// set externalSettingsPanel(externalSettingsPanel: SettingsPanelDirective) {
	// This directive will has value only when SETTINGS PANEL component tagged with '*ovSettingsPanel'
	// is inside of the PANEL component tagged with '*ovPanel'
	// if (externalSettingsPanel) {
	// 	this.settingsPanelTemplate = externalSettingsPanel.template;
	// }
	// }

	@ContentChild(ActivitiesPanelDirective)
	set externalActivitiesPanel(externalActivitiesPanel: ActivitiesPanelDirective) {
		// This directive will has value only when ACTIVITIES PANEL component tagged with '*ovActivitiesPanel'
		// is inside of the PANEL component tagged with '*ovPanel'
		if (externalActivitiesPanel) {
			this.activitiesPanelTemplate = externalActivitiesPanel.template;
		}
	}

	@ContentChild(ChatPanelDirective)
	set externalChatPanel(externalChatPanel: ChatPanelDirective) {
		// This directive will has value only when CHAT PANEL component tagged with '*ovChatPanel'
		// is inside of the PANEL component tagged with '*ovPanel'
		if (externalChatPanel) {
			this.chatPanelTemplate = externalChatPanel.template;
		}
	}

	@ContentChild(AdditionalPanelsDirective)
	set externalAdditionalPanels(externalAdditionalPanels: AdditionalPanelsDirective) {
		// This directive will has value only when ADDITIONAL PANELS component tagged with '*ovPanelAdditionalPanels'
		// is inside of the PANEL component tagged with '*ovPanel'
		if (externalAdditionalPanels) {
			this.additionalPanelsTemplate = externalAdditionalPanels.template;
		}
	}

	isParticipantsPanelOpened: boolean;
	isChatPanelOpened: boolean;
	isBackgroundEffectsPanelOpened: boolean;
	isSettingsPanelOpened: boolean;
	isActivitiesPanelOpened: boolean;

	/**
	 * @internal
	 */
	isExternalPanelOpened: boolean;
	private panelSubscription: Subscription;

	/**
	 * @ignore
	 */
	constructor(protected panelService: PanelService, private cd: ChangeDetectorRef) {}

	ngOnInit(): void {
		this.subscribeToPanelToggling();
	}

	ngOnDestroy() {
		this.isChatPanelOpened = false;
		this.isParticipantsPanelOpened = false;
		if (this.panelSubscription) this.panelSubscription.unsubscribe();
	}

	private subscribeToPanelToggling() {
		this.panelSubscription = this.panelService.panelOpenedObs.pipe(skip(1)).subscribe((ev: PanelEvent) => {
			this.isChatPanelOpened = ev.opened && ev.type === PanelType.CHAT;
			this.isParticipantsPanelOpened = ev.opened && ev.type === PanelType.PARTICIPANTS;
			this.isBackgroundEffectsPanelOpened = ev.opened && ev.type === PanelType.BACKGROUND_EFFECTS;
			this.isSettingsPanelOpened = ev.opened && ev.type === PanelType.SETTINGS;
			this.isActivitiesPanelOpened = ev.opened && ev.type === PanelType.ACTIVITIES;
			this.isExternalPanelOpened = ev.opened && ev.type !== PanelType.PARTICIPANTS && ev.type !== PanelType.CHAT;
			this.cd.markForCheck();
		});
	}
}
