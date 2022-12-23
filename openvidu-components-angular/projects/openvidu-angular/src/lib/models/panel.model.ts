export enum PanelType {
	CHAT = 'chat',
	PARTICIPANTS = 'participants',
	BACKGROUND_EFFECTS = 'background-effects',
	ACTIVITIES = 'activities',
	SETTINGS = 'settings'

}

export interface PanelEvent {
	opened: boolean;
	type?: PanelType | string;
	expand?: string;
	oldType?: PanelType | string;
}

export enum PanelSettingsOptions {
	GENERAL = 'general',
	AUDIO = 'audio',
	VIDEO = 'video',
	CAPTIONS = 'captions'
}
