import {
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	ContentChild,
	EventEmitter,
	OnInit,
	Output,
	TemplateRef
} from '@angular/core';
import { skip, Subject, takeUntil } from 'rxjs';
import {
	ActivitiesPanelDirective,
	AdditionalPanelsDirective,
	ChatPanelDirective,
	ParticipantsPanelDirective
} from '../../directives/template/openvidu-components-angular.directive';
import {
	ActivitiesPanelStatusEvent,
	ChatPanelStatusEvent,
	PanelStatusInfo,
	PanelType,
	ParticipantsPanelStatusEvent,
	SettingsPanelStatusEvent
} from '../../models/panel.model';
import { PanelService } from '../../services/panel/panel.service';
import { BackgroundEffect } from '../../models/background-effect.model';
import { TemplateManagerService, PanelTemplateConfiguration } from '../../services/template/template-manager.service';

/**
 *
 * The **PanelComponent** is hosted inside of the {@link VideoconferenceComponent}.
 * It is in charge of displaying the videoconference panels providing functionalities to the videoconference app
 * such as the chat ({@link ChatPanelComponent}) and list of participants ({@link ParticipantsPanelComponent})
 */

@Component({
	selector: 'ov-panel',
	templateUrl: './panel.component.html',
	styleUrls: ['./panel.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	standalone: false
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

	/**
	 * @ignore
	 */
	@ContentChild(ParticipantsPanelDirective)
	set externalParticipantPanel(externalParticipantsPanel: ParticipantsPanelDirective) {
		this._externalParticipantPanel = externalParticipantsPanel;
		if (externalParticipantsPanel) {
			this.updateTemplatesAndMarkForCheck();
		}
	}

	/**
	 * @ignore
	 */
	@ContentChild(ActivitiesPanelDirective)
	set externalActivitiesPanel(externalActivitiesPanel: ActivitiesPanelDirective) {
		this._externalActivitiesPanel = externalActivitiesPanel;
		if (externalActivitiesPanel) {
			this.updateTemplatesAndMarkForCheck();
		}
	}

	/**
	 * @ignore
	 */
	@ContentChild(ChatPanelDirective)
	set externalChatPanel(externalChatPanel: ChatPanelDirective) {
		this._externalChatPanel = externalChatPanel;
		if (externalChatPanel) {
			this.updateTemplatesAndMarkForCheck();
		}
	}

	/**
	 * @ignore
	 */
	@ContentChild(AdditionalPanelsDirective)
	set externalAdditionalPanels(externalAdditionalPanels: AdditionalPanelsDirective) {
		this._externalAdditionalPanels = externalAdditionalPanels;
		if (externalAdditionalPanels) {
			this.updateTemplatesAndMarkForCheck();
		}
	}

	/**
	 * This event is fired when the chat panel status has been changed.
	 * It provides the new status of the chat panel represented by the {@link ChatPanelStatusEvent} object.
	 */
	@Output() onChatPanelStatusChanged: EventEmitter<ChatPanelStatusEvent> = new EventEmitter<ChatPanelStatusEvent>();

	/**
	 * This event is fired when the participants panel status has been changed.
	 * It provides the new status of the participants panel represented by the {@link ParticipantsPanelStatusEvent} object.
	 */
	@Output() onParticipantsPanelStatusChanged: EventEmitter<ParticipantsPanelStatusEvent> =
		new EventEmitter<ParticipantsPanelStatusEvent>();

	/**
	 * This event is fired when the settings panel status has been changed.
	 * It provides the new status of the settings panel represented by the {@link SettingsPanelStatusEvent} object.
	 */
	@Output() onSettingsPanelStatusChanged: EventEmitter<SettingsPanelStatusEvent> = new EventEmitter<SettingsPanelStatusEvent>();

	/**
	 * This event is fired when the activities panel status has been changed.
	 * It provides the new status of the activities panel represented by the {@link ActivitiesPanelStatusEvent} object.
	 */
	@Output() onActivitiesPanelStatusChanged: EventEmitter<ActivitiesPanelStatusEvent> = new EventEmitter<ActivitiesPanelStatusEvent>();

	/**
	 * This event is fired when the background effects panel status has been changed.
	 * It provides the new status of the background effects panel represented by the {@link BackgroundEffectsPanelStatusEvent} object.
	 * @internal
	 */
	// @Output() onBackgroundEffectsPanelStatusChanged: EventEmitter<BackgroundEffectsPanelStatusEvent> = new EventEmitter<BackgroundEffectsPanelStatusEvent>();

	/**
	 * @ignore
	 */
	isParticipantsPanelOpened: boolean;
	/**
	 * @ignore
	 */
	isChatPanelOpened: boolean;
	/**
	 * @ignore
	 */
	isBackgroundEffectsPanelOpened: boolean;
	/**
	 * @ignore
	 */
	isSettingsPanelOpened: boolean;
	/**
	 * @ignore
	 */
	isActivitiesPanelOpened: boolean;

	/**
	 * @internal
	 */
	isExternalPanelOpened: boolean;

	/**
	 * @internal
	 * Template configuration managed by the service
	 */
	templateConfig: PanelTemplateConfiguration = {};

	// Store directive references for template setup
	private _externalParticipantPanel?: ParticipantsPanelDirective;
	private _externalChatPanel?: ChatPanelDirective;
	private _externalActivitiesPanel?: ActivitiesPanelDirective;
	private _externalAdditionalPanels?: AdditionalPanelsDirective;

	private destroy$ = new Subject<void>();

	private panelEmitersHandler: Map<
		PanelType,
		EventEmitter<ChatPanelStatusEvent | ParticipantsPanelStatusEvent | SettingsPanelStatusEvent | ActivitiesPanelStatusEvent>
	> = new Map();

	/**
	 * @ignore
	 */
	constructor(
		private panelService: PanelService,
		private cd: ChangeDetectorRef,
		private templateManagerService: TemplateManagerService
	) {}

	/**
	 * @ignore
	 */
	ngOnInit(): void {
		this.setupTemplates();
		this.subscribeToPanelToggling();
		this.panelEmitersHandler.set(PanelType.CHAT, this.onChatPanelStatusChanged);
		this.panelEmitersHandler.set(PanelType.PARTICIPANTS, this.onParticipantsPanelStatusChanged);
		this.panelEmitersHandler.set(PanelType.SETTINGS, this.onSettingsPanelStatusChanged);
		this.panelEmitersHandler.set(PanelType.ACTIVITIES, this.onActivitiesPanelStatusChanged);
	}

	/**
	 * @internal
	 * Sets up all templates using the template manager service
	 */
	private setupTemplates(): void {
		this.templateConfig = this.templateManagerService.setupPanelTemplates(
			this._externalParticipantPanel,
			this._externalChatPanel,
			this._externalActivitiesPanel,
			this._externalAdditionalPanels
		);

		// Apply templates to component properties for backward compatibility
		this.applyTemplateConfiguration();
	}

	/**
	 * @internal
	 * Applies the template configuration to component properties
	 */
	private applyTemplateConfiguration(): void {
		if (this.templateConfig.participantsPanelTemplate) {
			this.participantsPanelTemplate = this.templateConfig.participantsPanelTemplate;
		}
		if (this.templateConfig.chatPanelTemplate) {
			this.chatPanelTemplate = this.templateConfig.chatPanelTemplate;
		}
		if (this.templateConfig.activitiesPanelTemplate) {
			this.activitiesPanelTemplate = this.templateConfig.activitiesPanelTemplate;
		}
		if (this.templateConfig.additionalPanelsTemplate) {
			this.additionalPanelsTemplate = this.templateConfig.additionalPanelsTemplate;
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

	/**
	 * @ignore
	 */
	ngOnDestroy() {
		this.isChatPanelOpened = false;
		this.isParticipantsPanelOpened = false;
		this.destroy$.next();
		this.destroy$.complete();
	}

	private subscribeToPanelToggling() {
		this.panelService.panelStatusObs.pipe(skip(1), takeUntil(this.destroy$)).subscribe((ev: PanelStatusInfo) => {
			this.isChatPanelOpened = ev.isOpened && ev.panelType === PanelType.CHAT;
			this.isParticipantsPanelOpened = ev.isOpened && ev.panelType === PanelType.PARTICIPANTS;
			this.isBackgroundEffectsPanelOpened = ev.isOpened && ev.panelType === PanelType.BACKGROUND_EFFECTS;
			this.isSettingsPanelOpened = ev.isOpened && ev.panelType === PanelType.SETTINGS;
			this.isActivitiesPanelOpened = ev.isOpened && ev.panelType === PanelType.ACTIVITIES;
			this.isExternalPanelOpened =
				ev.isOpened &&
				!this.isSettingsPanelOpened &&
				!this.isBackgroundEffectsPanelOpened &&
				!this.isChatPanelOpened &&
				!this.isParticipantsPanelOpened &&
				!this.isActivitiesPanelOpened;
			this.cd.markForCheck();

			this.sendPanelStatusChangedEvent(ev);
		});
	}

	private sendPanelStatusChangedEvent(event: PanelStatusInfo) {
		const { panelType, isOpened, previousPanelType } = event;

		// Emit to the current panel
		if (panelType) {
			const panelMatch = this.panelEmitersHandler.get(panelType as PanelType);
			if (panelMatch) panelMatch.emit({ isOpened });
		}

		// Emit to the previous panel if it's different from the current one
		if (previousPanelType && panelType !== previousPanelType) {
			const previousPanelMatch = this.panelEmitersHandler.get(previousPanelType as PanelType);
			if (previousPanelMatch) previousPanelMatch.emit({ isOpened: false });
		}
	}
}
