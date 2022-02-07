import { Type } from '@angular/core';

export interface LibConfig {
	environment: {
		production: boolean;
		useProdLibrary?: boolean;
		customComponents?: { LibraryComponents: Type<any> };
	};
}


export enum LibraryComponents {
	TOOLBAR = 'ov-toolbar',
	LAYOUT = 'ov-layout',
	PANEL = 'ov-panel',
	CHAT_PANEL = 'ov-chat-panel',
	PARTICIPANTS_PANEL = 'ov-participants-panel',
	STREAM = "ov-stream"
}
