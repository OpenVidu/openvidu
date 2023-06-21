import { LangOption } from './lang.model';

/**
 * @internal
 */
export interface CaptionModel {
	connectionId: string;
	nickname: string;
	color: string;
	type: 'recognizing' | 'recognized';
	text: string;
}

export interface CaptionsLangOption extends LangOption {}
