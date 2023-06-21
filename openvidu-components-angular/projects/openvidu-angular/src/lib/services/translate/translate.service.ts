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
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { LangOption } from '../../models/lang.model';

/**
 * @internal
 */
@Injectable({
	providedIn: 'root'
})
export class TranslateService {
	private availableLanguages = { en, es, de, fr, cn, hi, it, ja, nl, pt };
	private langOptions: LangOption[] = [
		{ name: 'English', lang: 'en' },
		{ name: 'Español', lang: 'es' },
		{ name: 'Deutsch', lang: 'de' },
		{ name: 'Français', lang: 'fr' },
		{ name: '中国', lang: 'cn' },
		{ name: 'हिन्दी', lang: 'hi' },
		{ name: 'Italiano', lang: 'it' },
		{ name: 'やまと', lang: 'ja' },
		{ name: 'Dutch', lang: 'nl' },
		{ name: 'Português', lang: 'pt' }
	];
	private currentLang: any;
	langSelected: LangOption | undefined;
	langSelectedObs: Observable<LangOption | undefined>;
	private _langSelected: BehaviorSubject<LangOption  | undefined> = new BehaviorSubject<LangOption | undefined>(undefined);

	constructor(private storageService: StorageService) {
		const iso = this.storageService.getLang() || 'en';
		this.langSelected = this.langOptions.find((l) => l.lang === iso) || this.langOptions[0];
		this.currentLang = this.availableLanguages[this.langSelected.lang];
		this.langSelectedObs = this._langSelected.asObservable();
		this._langSelected.next(this.langSelected);
	}

	setLanguage(lang: string) {
		const matchingLang = this.langOptions.find((l) => l.lang === lang);
		if (matchingLang) {
			this.currentLang = this.availableLanguages[lang];
			this.langSelected = matchingLang;
			this._langSelected.next(this.langSelected);
		}
	}

	getLangSelected(): LangOption | undefined {
		return this.langSelected;
	}

	getLanguagesInfo() {
		return this.langOptions;
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
