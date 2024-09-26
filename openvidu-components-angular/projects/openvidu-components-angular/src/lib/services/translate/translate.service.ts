import { Injectable } from '@angular/core';
import * as cn from '../../lang/cn.json';
import * as de from '../../lang/de.json';
import * as en from '../../lang/en.json';
import * as es from '../../lang/es.json';
import * as fr from '../../lang/fr.json';
import * as hi from '../../lang/hi.json';
import * as it from '../../lang/it.json';
import * as ja from '../../lang/ja.json';
import * as nl from '../../lang/nl.json';
import * as pt from '../../lang/pt.json';
import { StorageService } from '../storage/storage.service';
import { AdditionalTranslationsType, AvailableLangs, LangOption } from '../../models/lang.model';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Service responsible for managing translations for the application.
 * This service provides methods to add additional translations and to translate keys into the currently selected language.
 *
 * The pipe {@link TranslatePipe} is used to translate keys in the templates.
 */
@Injectable({
	providedIn: 'root'
})
export class TranslateService {
	// Maps language codes to their respective translations
	private translationsByLanguage: Record<AvailableLangs, any> = { en, es, de, fr, cn, hi, it, ja, nl, pt };

	// Stores additional translations provided by the application
	private additionalTranslations: Record<AvailableLangs, any> | {} = {};

	// List of available language options with their display names and language codes
	private languageOptions: LangOption[] = [
		{ name: 'English', lang: 'en' },
		{ name: 'Español', lang: 'es' },
		{ name: 'Deutsch', lang: 'de' },
		{ name: 'Français', lang: 'fr' },
		{ name: '中国', lang: 'cn' },
		{ name: 'हिन्दी', lang: 'hi' },
		{ name: 'Italiano', lang: 'it' },
		{ name: '日本語', lang: 'ja' },
		{ name: 'Dutch', lang: 'nl' },
		{ name: 'Português', lang: 'pt' }
	];

	// The currently active translations for the selected language
	private activeTranslations: any;

	// The currently selected language option
	private selectedLanguageOption: LangOption;

	// BehaviorSubject to manage the currently selected language option
	private _selectedLanguageSubject: BehaviorSubject<LangOption> = new BehaviorSubject<LangOption>({ name: 'English', lang: 'en' });

	// Observable that emits changes to the selected language option
	selectedLanguageOption$: Observable<LangOption>;

	constructor(private storageService: StorageService) {
		this.selectedLanguageOption$ = this._selectedLanguageSubject.asObservable();
		this.refreshSelectedLanguage();
	}

	/**
	 * Adds multiple translations to the additional translations storage.
	 * @param translations - A record where each key is a language code and the value is an object of translations for that language.
	 */
	addTranslations(translations: Partial<AdditionalTranslationsType>): void {
		this.additionalTranslations = translations;
	}

	/**
	 * Sets the current language based on the provided language code.
	 * Updates the selected language and emits the change.
	 * @param lang - The language code to set.
	 *
	 * @internal
	 */
	async setCurrentLanguage(lang: AvailableLangs): Promise<void> {
		// Find the language option that matches the provided language code
		const selectedLanguageOption = this.languageOptions.find((option) => option.lang === lang);

		if (selectedLanguageOption) {
			// Fetch the language data and update the current language
			this.activeTranslations = await this.fetchLanguageData(lang);
			this.selectedLanguageOption = selectedLanguageOption;
			this._selectedLanguageSubject.next(this.selectedLanguageOption);
			// Notify subscribers of the language change
			this._selectedLanguageSubject.next(this.selectedLanguageOption);
		}
	}

	/**
	 * Updates the available language options.
	 * @param options - The new language options to set.
	 *
	 * @internal
	 */
	updateLanguageOptions(options?: LangOption[]): void {
		if (options && options.length > 0) {
			this.languageOptions = options;
			this.refreshSelectedLanguage();
		}
	}

	/**
	 * Retrieves the currently selected language option.
	 * @returns The currently selected language option.
	 *
	 * @internal
	 */
	getSelectedLanguage(): LangOption {
		return this.selectedLanguageOption;
	}

	/**
	 * Retrieves the list of all available language options.
	 * @returns An array of available language options.
	 */
	getAvailableLanguages(): LangOption[] {
		return this.languageOptions;
	}

	/**
	 * Translates a given key into the current language.
	 *
	 * This method first attempts to find the translation in the official translations.
	 * If the translation is not found, it then looks for the translation in the additional translations registered by the app.
	 *
	 * @param key - The key to be translated.
	 * @returns The translated string if found, otherwise an empty string.
	 */
	translate(key: string): string {
		// Attempt to find the translation in the official translations
		let translation = this.findTranslation(this.activeTranslations, key);

		if (!translation) {
			// If not found, look for the translation in the additional translations
			const additionalLangTranslations = this.additionalTranslations[this.selectedLanguageOption.lang];
			translation = this.findTranslation(additionalLangTranslations, key);
		}

		return translation || '';
	}

	/**
	 * Finds and returns a translation string from a nested translations source object based on a dot-separated key.
	 *
	 * @param translationsSource - The source object containing nested translation strings.
	 * @param key - A dot-separated string representing the path to the desired translation.
	 * @returns The translation string if found, otherwise `undefined`.
	 */
	private findTranslation(translationsSource: any, key: string): string | undefined {
		let translation = translationsSource;

		// Traverse the object tree based on the key structure
		key.split('.').forEach((nestedKey) => {
			try {

				translation = translation[nestedKey];
			} catch (error) {
			}
		});

		return translation;
	}

	/**
	 * Updates the currently selected language based on the stored language setting.
	 */
	private async refreshSelectedLanguage() {
		const storedLang = this.storageService.getLang();
		const matchingOption = this.languageOptions.find((option) => option.lang === storedLang);

		if (storedLang && matchingOption) {
			this.selectedLanguageOption = matchingOption;
		} else {
			// Default to the first language option if no language is found in storage
			this.selectedLanguageOption = this.languageOptions[0];
		}
		this.activeTranslations = await this.fetchLanguageData(this.selectedLanguageOption.lang);
		this._selectedLanguageSubject.next(this.selectedLanguageOption);
	}

	/**
	 * Fetches the language data from the source based on the provided language code.
	 * @param lang - The language code to fetch data for.
	 * @returns The language data associated with the provided language code.
	 */
	private async fetchLanguageData(lang: AvailableLangs): Promise<any> {
		if (!(lang in this.translationsByLanguage)) {
			// Language not found in default languages options
			// Try to find it in the assets/lang directory
			try {
				const response = await fetch(`assets/lang/${lang}.json`);
				return await response.json();
			} catch (error) {
				console.error(`Not found ${lang}.json in assets/lang`, error);
				return {};
			}
		} else {
			return this.translationsByLanguage[lang];
		}
	}
}
