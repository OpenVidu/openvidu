import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { StorageService } from '../storage/storage.service';

/**
 * @internal
 */
@Injectable({
	providedIn: 'root'
})
export class CaptionService {

	private langTitles = [
		{ name: 'English', ISO: 'en-US' },
		{ name: 'Español', ISO: 'es-ES' },
		{ name: 'Deutsch', ISO: 'de-DE' },
		{ name: 'Français', ISO: 'fr-FR' },
		{ name: '中国', ISO: 'zh-CN' },
		{ name: 'हिन्दी', ISO: 'hi-IN' },
		{ name: 'Italiano', ISO: 'it-IT' },
		{ name: 'やまと', ISO: 'jp-JP' },
		{ name: 'Português', ISO: 'pt-PT' }
	];
	captionLangSelected: { name: string; ISO: string };
	captionLangObs: Observable<{ name: string; ISO: string }>;
	private _captionLangObs: Subject<{ name: string; ISO: string }> = new Subject();
	private captionsEnabled: boolean = false;

	constructor(private storageService: StorageService) {
		const iso = this.storageService.getCaptionsLang();
		if (iso) {
			this.captionLangSelected = this.langTitles.find((lang) => lang.ISO === iso) || this.langTitles[0];
		}
		this.captionLangObs = this._captionLangObs.asObservable();
	}

	setCaptionsEnabled(value: boolean) {
		this.captionsEnabled = value;
	}

	areCaptionsEnabled(): boolean {
		return this.captionsEnabled;
	}

	setLanguage(lang: string) {
		const newLang = this.langTitles.find((l) => l.ISO === lang);
		if(!!newLang && newLang.ISO !== this.captionLangSelected.ISO){
			this.captionLangSelected = newLang;
			this.storageService.setCaptionLang(lang);
			this._captionLangObs.next(this.captionLangSelected);
		}
	}

	getLangSelected(): { name: string; ISO: string } {
		return this.captionLangSelected || this.langTitles[0];
	}

	getCaptionLanguages(): { name: string; ISO: string }[] {
		return this.langTitles;
	}
}
