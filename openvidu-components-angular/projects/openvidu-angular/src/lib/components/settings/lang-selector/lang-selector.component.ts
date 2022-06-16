import { Component, OnInit } from '@angular/core';
import { StorageService } from '../../../services/storage/storage.service';
import { TranslateService } from '../../../services/translate/translate.service';

@Component({
	selector: 'ov-lang-selector',
	templateUrl: './lang-selector.component.html',
	styleUrls: ['./lang-selector.component.css']
})
export class LangSelectorComponent implements OnInit {
	langSelected: { name: string; ISO: string };
	languages: { name: string; ISO: string }[] = [];

	constructor(private translateService: TranslateService, private storageSrv: StorageService) {}

	ngOnInit(): void {
		this.languages = this.translateService.getLanguagesInfo();
		this.langSelected = this.translateService.getLangSelected();
	}

	onLangSelected(lang: string) {
		this.translateService.setLanguage(lang);
		this.storageSrv.setLang(lang);
		this.langSelected = this.translateService.getLangSelected();
	}
}
