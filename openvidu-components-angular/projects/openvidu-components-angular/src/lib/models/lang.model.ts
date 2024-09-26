export type AvailableLangs = 'en' | 'es' | 'de' | 'fr' | 'cn' | 'hi' | 'it' | 'ja' | 'nl' | 'pt';

export type AdditionalTranslationsType = Record<AvailableLangs, Record<string, any>>;

export interface LangOption {
	name: string;
	lang: AvailableLangs;
}
