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

/**
 * @internal
 */
@Injectable({
	providedIn: 'root'
})
export class TranslateService {
	private availableLanguages = { en, es, de, fr, cn, hi, it, ja, nl, pt };
	private langTitles = [
		{ name: 'English', ISO: 'en' },
		{ name: 'Español', ISO: 'es' },
		{ name: 'Deutsch', ISO: 'de' },
		{ name: 'Français', ISO: 'fr' },
		{ name: '中国', ISO: 'cn' },
		{ name: 'हिन्दी', ISO: 'hi' },
		{ name: 'Italiano', ISO: 'it' },
		{ name: 'やまと', ISO: 'ja' },
		{ name: 'Dutch', ISO: 'nl' },
		{ name: 'Português', ISO: 'pt' }
	];
	private currentLang: any;
	langSelected: { name: string; ISO: string };

	constructor(private storageService: StorageService) {
		const iso = this.storageService.getLang() || 'en';
		this.langSelected = this.langTitles.find((lang) => lang.ISO === iso) || this.langTitles[0];
		this.currentLang = this.availableLanguages[this.langSelected.ISO];
	}

	setLanguage(lang: string) {
		if(this.langTitles.some(l => l.ISO === lang)){
			this.currentLang = this.availableLanguages[lang];
			this.langSelected = this.langTitles.find((l) => l.ISO === lang);
		}
	}

	getLangSelected(): { name: string; ISO: string } {
		return this.langSelected;
	}

	getLanguagesInfo() {
		return this.langTitles;
	}

	translate(key: string): string {
		let result = this.currentLang;

		key.split('.').forEach((prop) => {
			try {
				result = result[prop];
			} catch (error) {
				return '';
			}
		});
		return result;
	}
}
