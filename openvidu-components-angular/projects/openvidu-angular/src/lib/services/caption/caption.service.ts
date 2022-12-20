import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { CaptionsLangOption } from '../../models/caption.model';
import { StorageService } from '../storage/storage.service';

/**
 * @internal
 */
@Injectable({
	providedIn: 'root'
})
export class CaptionService {
	private langsOptions: CaptionsLangOption [] = [
		{ name: 'English', lang: 'en-US' },
		{ name: 'Español', lang: 'es-ES' },
		{ name: 'Deutsch', lang: 'de-DE' },
		{ name: 'Français', lang: 'fr-FR' },
		{ name: '中国', lang: 'zh-CN' },
		{ name: 'हिन्दी', lang: 'hi-IN' },
		{ name: 'Italiano', lang: 'it-IT' },
		{ name: 'やまと', lang: 'jp-JP' },
		{ name: 'Português', lang: 'pt-PT' }
	];
	captionLangSelected: CaptionsLangOption;
	captionLangObs: Observable<CaptionsLangOption>;
	private _captionLang: Subject<CaptionsLangOption> = new Subject();
	private captionsEnabled: boolean = false;

	constructor(private storageService: StorageService) {
		this.updateLangSelected();
		this.captionLangObs = this._captionLang.asObservable();

	}

	setLanguageOptions(options: CaptionsLangOption [] | undefined) {
		if(options && options.length > 0) {
			this.langsOptions = options;
			this.updateLangSelected();
		}
	}

	setCaptionsEnabled(value: boolean) {
		this.captionsEnabled = value;
	}

	areCaptionsEnabled(): boolean {
		return this.captionsEnabled;
	}

	setLanguage(lang: string) {
		const newLangOpt = this.langsOptions.find((opt) => opt.lang === lang);
		if (!!newLangOpt && newLangOpt.lang !== this.captionLangSelected.lang) {
			this.captionLangSelected = newLangOpt;
			this.storageService.setCaptionLang(lang);
			this._captionLang.next(this.captionLangSelected);
		}
	}

	getLangSelected(): CaptionsLangOption {
		return this.captionLangSelected;
	}

	getCaptionLanguages(): CaptionsLangOption[] {
		return this.langsOptions;
	}

	private updateLangSelected(): void {
		const storageLang = this.storageService.getCaptionsLang();
		const langOpt = this.langsOptions.find((opt) => opt.lang === storageLang);
		if (storageLang && langOpt) {
			this.captionLangSelected = langOpt;
		} else {
			this.captionLangSelected = this.langsOptions[0];
		}
	}
}
