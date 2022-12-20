
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

export interface CaptionsLangOption {

	name: string;
	lang: string;

}

