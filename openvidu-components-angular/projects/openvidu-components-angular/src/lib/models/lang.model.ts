type OpenViduLangs = 'en' | 'es' | 'de' | 'fr' | 'cn' | 'hi' | 'it' | 'ja' | 'nl' | 'pt';
export type AvailableLangs = OpenViduLangs | string;

export type AdditionalTranslationsType = Record<AvailableLangs, Record<string, any>>;

export interface LangOption {
	name: string;
	lang: AvailableLangs;
}
