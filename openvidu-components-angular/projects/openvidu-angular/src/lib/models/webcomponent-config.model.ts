import { ISettings } from './settings.model';

export interface ISessionConfig {
	sessionName: string;
	user: string;
	tokens: string[];
	ovSettings: ISettings;
}

export enum Theme {
	DARK = 'dark',
	LIGHT = 'light'
}
