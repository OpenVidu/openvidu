import { Injectable, TemplateRef } from '@angular/core';
import { ILogger } from '../../models/logger.model';
import { LoggerService } from '../logger/logger.service';
import {
	ActivitiesPanelDirective,
	AdditionalPanelsDirective,
	ChatPanelDirective,
	LayoutDirective,
	PanelDirective,
	ParticipantPanelItemDirective,
	ParticipantPanelItemElementsDirective,
	ParticipantsPanelDirective,
	StreamDirective,
	ToolbarAdditionalButtonsDirective,
	ToolbarAdditionalPanelButtonsDirective,
	ToolbarDirective
} from '../../directives/template/openvidu-components-angular.directive';
import {
	PreJoinDirective,
	ParticipantPanelAfterLocalParticipantDirective,
	LayoutAdditionalElementsDirective,
	LeaveButtonDirective,
	SettingsPanelGeneralAdditionalElementsDirective,
	ToolbarMoreOptionsAdditionalMenuItemsDirective
} from '../../directives/template/internals.directive';

/**
 * Configuration object for all templates in the videoconference component
 */
export interface TemplateConfiguration {
	// Toolbar templates
	toolbarTemplate: TemplateRef<any>;
	toolbarAdditionalButtonsTemplate?: TemplateRef<any>;
	toolbarAdditionalPanelButtonsTemplate?: TemplateRef<any>;
	toolbarLeaveButtonTemplate?: TemplateRef<any>;

	// Panel templates
	panelTemplate: TemplateRef<any>;
	chatPanelTemplate: TemplateRef<any>;
	participantsPanelTemplate: TemplateRef<any>;
	activitiesPanelTemplate: TemplateRef<any>;
	additionalPanelsTemplate?: TemplateRef<any>;

	// Participant templates
	participantPanelAfterLocalParticipantTemplate?: TemplateRef<any>;
	participantPanelItemTemplate: TemplateRef<any>;
	participantPanelItemElementsTemplate?: TemplateRef<any>;

	// Layout templates
	layoutTemplate: TemplateRef<any>;
	streamTemplate: TemplateRef<any>;
	layoutAdditionalElementsTemplate?: TemplateRef<any>;

	// Settings panel templates
	settingsPanelGeneralAdditionalElementsTemplate?: TemplateRef<any>;

	// Toolbar templates
	toolbarMoreOptionsAdditionalMenuItemsTemplate?: TemplateRef<any>;

	// PreJoin template
	preJoinTemplate?: TemplateRef<any>;
}

/**
 * Configuration object for panel component templates
 */
export interface PanelTemplateConfiguration {
	participantsPanelTemplate?: TemplateRef<any>;
	chatPanelTemplate?: TemplateRef<any>;
	activitiesPanelTemplate?: TemplateRef<any>;
	additionalPanelsTemplate?: TemplateRef<any>;
	backgroundEffectsPanelTemplate?: TemplateRef<any>;
	settingsPanelTemplate?: TemplateRef<any>;
}

/**
 * Configuration object for toolbar component templates
 */
export interface ToolbarTemplateConfiguration {
	toolbarAdditionalButtonsTemplate?: TemplateRef<any>;
	toolbarAdditionalPanelButtonsTemplate?: TemplateRef<any>;
	toolbarLeaveButtonTemplate?: TemplateRef<any>;
	toolbarMoreOptionsAdditionalMenuItemsTemplate?: TemplateRef<any>;
}

/**
 * Configuration object for layout component templates
 */
export interface LayoutTemplateConfiguration {
	layoutStreamTemplate?: TemplateRef<any>;
	layoutAdditionalElementsTemplate?: TemplateRef<any>;
}

/**
 * Configuration object for participants panel component templates
 */
export interface ParticipantsPanelTemplateConfiguration {
	participantPanelItemTemplate?: TemplateRef<any>;
	participantPanelAfterLocalParticipantTemplate?: TemplateRef<any>;
}

/**
 * Configuration object for participant panel item component templates
 */
export interface ParticipantPanelItemTemplateConfiguration {
	participantPanelItemElementsTemplate?: TemplateRef<any>;
}

/**
 * Configuration object for session component templates
 */
export interface SessionTemplateConfiguration {
	toolbarTemplate?: TemplateRef<any>;
	panelTemplate?: TemplateRef<any>;
	layoutTemplate?: TemplateRef<any>;
}

/**
 * External directives provided by the consumer
 */
export interface ExternalDirectives {
	toolbar?: ToolbarDirective;
	toolbarAdditionalButtons?: ToolbarAdditionalButtonsDirective;
	toolbarAdditionalPanelButtons?: ToolbarAdditionalPanelButtonsDirective;
	toolbarLeaveButton?: LeaveButtonDirective;
	additionalPanels?: AdditionalPanelsDirective;
	panel?: PanelDirective;
	chatPanel?: ChatPanelDirective;
	activitiesPanel?: ActivitiesPanelDirective;
	participantsPanel?: ParticipantsPanelDirective;
	participantPanelAfterLocalParticipant?: ParticipantPanelAfterLocalParticipantDirective;
	participantPanelItem?: ParticipantPanelItemDirective;
	participantPanelItemElements?: ParticipantPanelItemElementsDirective;
	layout?: LayoutDirective;
	stream?: StreamDirective;
	preJoin?: PreJoinDirective;
	layoutAdditionalElements?: LayoutAdditionalElementsDirective;
	settingsPanelGeneralAdditionalElements?: SettingsPanelGeneralAdditionalElementsDirective;
	toolbarMoreOptionsAdditionalMenuItems?: ToolbarMoreOptionsAdditionalMenuItemsDirective;
}

/**
 * Default templates provided by the component
 */
export interface DefaultTemplates {
	toolbar: TemplateRef<any>;
	panel: TemplateRef<any>;
	chatPanel: TemplateRef<any>;
	participantsPanel: TemplateRef<any>;
	activitiesPanel: TemplateRef<any>;
	participantPanelItem: TemplateRef<any>;
	layout: TemplateRef<any>;
	stream: TemplateRef<any>;
}

/**
 * Service responsible for managing and configuring templates for the videoconference component.
 * This service centralizes all template setup logic, making the main component cleaner and more maintainable.
 */
@Injectable({
	providedIn: 'root'
})
export class TemplateManagerService {
	private log: ILogger;

	constructor(private loggerSrv: LoggerService) {
		this.log = this.loggerSrv.get('TemplateManagerService');
	}

	/**
	 * Sets up all templates based on external directives and default templates
	 */
	setupTemplates(externalDirectives: ExternalDirectives, defaultTemplates: DefaultTemplates): TemplateConfiguration {
		this.log.v('Setting up templates...');

		const config: TemplateConfiguration = {
			toolbarTemplate: this.setupToolbarTemplate(externalDirectives, defaultTemplates),
			panelTemplate: this.setupPanelTemplate(externalDirectives, defaultTemplates),
			layoutTemplate: this.setupLayoutTemplate(externalDirectives, defaultTemplates),
			preJoinTemplate: this.setupPreJoinTemplate(externalDirectives),

			// Individual templates
			chatPanelTemplate: this.setupChatPanelTemplate(externalDirectives, defaultTemplates),
			participantsPanelTemplate: this.setupParticipantsPanelTemplate(externalDirectives, defaultTemplates),
			activitiesPanelTemplate: this.setupActivitiesPanelTemplate(externalDirectives, defaultTemplates),
			participantPanelItemTemplate: this.setupParticipantPanelItemTemplate(externalDirectives, defaultTemplates),
			streamTemplate: this.setupStreamTemplate(externalDirectives, defaultTemplates),
			participantPanelAfterLocalParticipantTemplate: this.setupParticipantPanelAfterLocalParticipantTemplate(externalDirectives)
		};

		// Optional templates
		if (externalDirectives.toolbarAdditionalButtons) {
			config.toolbarAdditionalButtonsTemplate = externalDirectives.toolbarAdditionalButtons.template;
			this.log.v('Setting EXTERNAL TOOLBAR ADDITIONAL BUTTONS');
		}

		if (externalDirectives.toolbarLeaveButton) {
			config.toolbarLeaveButtonTemplate = externalDirectives.toolbarLeaveButton.template;
			this.log.v('Setting EXTERNAL TOOLBAR LEAVE BUTTON');
		}

		if (externalDirectives.toolbarAdditionalPanelButtons) {
			config.toolbarAdditionalPanelButtonsTemplate = externalDirectives.toolbarAdditionalPanelButtons.template;
			this.log.v('Setting EXTERNAL TOOLBAR ADDITIONAL PANEL BUTTONS');
		}

		if (externalDirectives.additionalPanels) {
			config.additionalPanelsTemplate = externalDirectives.additionalPanels.template;
			this.log.v('Setting EXTERNAL ADDITIONAL PANELS');
		}

		if (externalDirectives.participantPanelItemElements) {
			config.participantPanelItemElementsTemplate = externalDirectives.participantPanelItemElements.template;
			this.log.v('Setting EXTERNAL PARTICIPANT PANEL ITEM ELEMENTS');
		}

		if (externalDirectives.layoutAdditionalElements) {
			this.log.v('Setting EXTERNAL ADDITIONAL LAYOUT ELEMENTS');
			config.layoutAdditionalElementsTemplate = externalDirectives.layoutAdditionalElements.template;
		}

		if (externalDirectives.settingsPanelGeneralAdditionalElements) {
			this.log.v('Setting EXTERNAL SETTINGS PANEL GENERAL ADDITIONAL ELEMENTS');
			config.settingsPanelGeneralAdditionalElementsTemplate = externalDirectives.settingsPanelGeneralAdditionalElements.template;
		}

		if (externalDirectives.toolbarMoreOptionsAdditionalMenuItems) {
			this.log.v('Setting EXTERNAL TOOLBAR MORE OPTIONS ADDITIONAL MENU ITEMS');
			config.toolbarMoreOptionsAdditionalMenuItemsTemplate = externalDirectives.toolbarMoreOptionsAdditionalMenuItems.template;
		}

		this.log.v('Template setup completed', config);
		return config;
	}

	/**
	 * Sets up the participantPanelAfterLocalParticipant template
	 */
	private setupParticipantPanelAfterLocalParticipantTemplate(externalDirectives: ExternalDirectives): TemplateRef<any> | undefined {
		if (externalDirectives.participantPanelAfterLocalParticipant) {
			this.log.v('Setting EXTERNAL PARTICIPANT PANEL AFTER LOCAL PARTICIPANT');
			return (externalDirectives.participantPanelAfterLocalParticipant as any).template;
		}
		return undefined;
	}

	/**
	 * Sets up the toolbar template
	 */
	private setupToolbarTemplate(externalDirectives: ExternalDirectives, defaultTemplates: DefaultTemplates): TemplateRef<any> {
		if (externalDirectives.toolbar) {
			this.log.v('Setting EXTERNAL TOOLBAR');
			return externalDirectives.toolbar.template;
		} else {
			this.log.v('Setting DEFAULT TOOLBAR');
			return defaultTemplates.toolbar;
		}
	}

	/**
	 * Sets up the panel template
	 */
	private setupPanelTemplate(externalDirectives: ExternalDirectives, defaultTemplates: DefaultTemplates): TemplateRef<any> {
		if (externalDirectives.panel) {
			this.log.v('Setting EXTERNAL PANEL');
			return externalDirectives.panel.template;
		} else {
			this.log.v('Setting DEFAULT PANEL');
			return defaultTemplates.panel;
		}
	}

	/**
	 * Sets up the layout template
	 */
	private setupLayoutTemplate(externalDirectives: ExternalDirectives, defaultTemplates: DefaultTemplates): TemplateRef<any> {
		if (externalDirectives.layout) {
			this.log.v('Setting EXTERNAL LAYOUT');
			return externalDirectives.layout.template;
		} else {
			this.log.v('Setting DEFAULT LAYOUT');
			return defaultTemplates.layout;
		}
	}

	/**
	 * Sets up the prejoin template
	 */
	private setupPreJoinTemplate(externalDirectives: ExternalDirectives): TemplateRef<any> | undefined {
		if (externalDirectives.preJoin) {
			this.log.v('Setting EXTERNAL PREJOIN');
			return externalDirectives.preJoin.template;
		} else {
			this.log.v('Setting DEFAULT PREJOIN (none)');
			return undefined;
		}
	}

	/**
	 * Sets up the chat panel template
	 */
	private setupChatPanelTemplate(externalDirectives: ExternalDirectives, defaultTemplates: DefaultTemplates): TemplateRef<any> {
		if (externalDirectives.chatPanel) {
			this.log.v('Setting EXTERNAL CHAT PANEL');
			return externalDirectives.chatPanel.template;
		} else {
			this.log.v('Setting DEFAULT CHAT PANEL');
			return defaultTemplates.chatPanel;
		}
	}

	/**
	 * Sets up the participants panel template
	 */
	private setupParticipantsPanelTemplate(externalDirectives: ExternalDirectives, defaultTemplates: DefaultTemplates): TemplateRef<any> {
		if (externalDirectives.participantsPanel) {
			this.log.v('Setting EXTERNAL PARTICIPANTS PANEL');
			return externalDirectives.participantsPanel.template;
		} else {
			this.log.v('Setting DEFAULT PARTICIPANTS PANEL');
			return defaultTemplates.participantsPanel;
		}
	}

	/**
	 * Sets up the activities panel template
	 */
	private setupActivitiesPanelTemplate(externalDirectives: ExternalDirectives, defaultTemplates: DefaultTemplates): TemplateRef<any> {
		if (externalDirectives.activitiesPanel) {
			this.log.v('Setting EXTERNAL ACTIVITIES PANEL');
			return externalDirectives.activitiesPanel.template;
		} else {
			this.log.v('Setting DEFAULT ACTIVITIES PANEL');
			return defaultTemplates.activitiesPanel;
		}
	}

	/**
	 * Sets up the participant panel item template
	 */
	private setupParticipantPanelItemTemplate(
		externalDirectives: ExternalDirectives,
		defaultTemplates: DefaultTemplates
	): TemplateRef<any> {
		if (externalDirectives.participantPanelItem) {
			this.log.v('Setting EXTERNAL PARTICIPANT PANEL ITEM');
			return externalDirectives.participantPanelItem.template;
		} else {
			this.log.v('Setting DEFAULT PARTICIPANT PANEL ITEM');
			return defaultTemplates.participantPanelItem;
		}
	}

	/**
	 * Sets up the stream template
	 */
	private setupStreamTemplate(externalDirectives: ExternalDirectives, defaultTemplates: DefaultTemplates): TemplateRef<any> {
		if (externalDirectives.stream) {
			this.log.v('Setting EXTERNAL STREAM');
			return externalDirectives.stream.template;
		} else {
			this.log.v('Setting DEFAULT STREAM');
			return defaultTemplates.stream;
		}
	}

	/**
	 * Sets up templates for the PanelComponent
	 */
	setupPanelTemplates(
		externalParticipantsPanel?: ParticipantsPanelDirective,
		externalChatPanel?: ChatPanelDirective,
		externalActivitiesPanel?: ActivitiesPanelDirective,
		externalAdditionalPanels?: AdditionalPanelsDirective
	): PanelTemplateConfiguration {
		this.log.v('Setting up panel templates...');

		return {
			participantsPanelTemplate: externalParticipantsPanel?.template,
			chatPanelTemplate: externalChatPanel?.template,
			activitiesPanelTemplate: externalActivitiesPanel?.template,
			additionalPanelsTemplate: externalAdditionalPanels?.template
		};
	}

	/**
	 * Sets up templates for the ToolbarComponent
	 */
	setupToolbarTemplates(
		externalAdditionalButtons?: ToolbarAdditionalButtonsDirective,
		externalAdditionalPanelButtons?: ToolbarAdditionalPanelButtonsDirective,
		externalLeaveButton?: LeaveButtonDirective,
		externalMoreOptionsAdditionalMenuItems?: ToolbarMoreOptionsAdditionalMenuItemsDirective
	): ToolbarTemplateConfiguration {
		this.log.v('Setting up toolbar templates...');

		return {
			toolbarAdditionalButtonsTemplate: externalAdditionalButtons?.template,
			toolbarAdditionalPanelButtonsTemplate: externalAdditionalPanelButtons?.template,
			toolbarLeaveButtonTemplate: externalLeaveButton?.template,
			toolbarMoreOptionsAdditionalMenuItemsTemplate: externalMoreOptionsAdditionalMenuItems?.template
		};
	}

	/**
	 * Sets up templates for the LayoutComponent
	 */
	setupLayoutTemplates(
		externalStream?: StreamDirective,
		externalLayoutAdditionalElements?: LayoutAdditionalElementsDirective
	): LayoutTemplateConfiguration {
		this.log.v('Setting up layout templates...');

		return {
			layoutStreamTemplate: externalStream?.template,
			layoutAdditionalElementsTemplate: externalLayoutAdditionalElements?.template
		};
	}

	/**
	 * Sets up templates for the ParticipantsPanelComponent
	 */
	setupParticipantsPanelTemplates(
		externalParticipantPanelItem?: ParticipantPanelItemDirective,
		defaultParticipantPanelItem?: TemplateRef<any>,
		externalParticipantPanelAfterLocalParticipant?: TemplateRef<any>
	): ParticipantsPanelTemplateConfiguration {
		this.log.v('Setting up participants panel templates...');

		return {
			participantPanelItemTemplate: externalParticipantPanelItem?.template || defaultParticipantPanelItem,
			participantPanelAfterLocalParticipantTemplate: externalParticipantPanelAfterLocalParticipant
		};
	}

	/**
	 * Sets up templates for the ParticipantPanelItemComponent
	 */
	setupParticipantPanelItemTemplates(
		externalParticipantPanelItemElements?: ParticipantPanelItemElementsDirective
	): ParticipantPanelItemTemplateConfiguration {
		this.log.v('Setting up participant panel item templates...');

		return {
			participantPanelItemElementsTemplate: externalParticipantPanelItemElements?.template
		};
	}

	/**
	 * Sets up templates for the SessionComponent
	 */
	setupSessionTemplates(
		toolbarTemplate?: TemplateRef<any>,
		panelTemplate?: TemplateRef<any>,
		layoutTemplate?: TemplateRef<any>
	): SessionTemplateConfiguration {
		this.log.v('Setting up session templates...');

		return {
			toolbarTemplate,
			panelTemplate,
			layoutTemplate
		};
	}
}
