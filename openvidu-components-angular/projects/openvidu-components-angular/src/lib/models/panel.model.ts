/**
 * Interface representing the different types of panels
 */
export enum PanelType {
	CHAT = 'chat',
	PARTICIPANTS = 'participants',
	BACKGROUND_EFFECTS = 'background-effects',
	ACTIVITIES = 'activities',
	SETTINGS = 'settings'
}

/**
 * Interface representing a panel event
 */

export interface PanelStatusInfo {
	/**
	 * Indicates whether the panel is currently opened.
	 */
	isOpened: boolean;

	/**
	 * The type of the panel. For example: 'chat', 'participants', 'settings', 'activities', etc.
	 */
	panelType?: PanelType | string;

	/**
	 * Additional information for the 'activities' and 'settings' panel, specifying the sub-option to be displayed.
	 */
	subOptionType?: string;

	/**
	 * The previous type of the panel before any changes.
	 */
	previousPanelType?: PanelType | string;
}

/**
 * @internal
 */
export enum PanelSettingsOptions {
	GENERAL = 'general',
	AUDIO = 'audio',
	VIDEO = 'video',
	CAPTIONS = 'captions'
}

/**
 * Interface representing a panel status event emmited by the library to the final app
 */
interface PanelStatusEvent {
	isOpened: boolean;
}

export interface ChatPanelStatusEvent extends PanelStatusEvent {}
export interface ParticipantsPanelStatusEvent extends PanelStatusEvent {}
export interface ActivitiesPanelStatusEvent extends PanelStatusEvent {}
export interface SettingsPanelStatusEvent extends PanelStatusEvent {}
// export interface BackgroundEffectsPanelStatusEvent extends PanelStatusEvent { }
