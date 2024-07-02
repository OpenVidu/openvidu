import { Component, OnInit, Output, ViewChild, EventEmitter, Input, OnDestroy } from '@angular/core';
import { MatMenuTrigger } from '@angular/material/menu';
import { MatSelect } from '@angular/material/select';
import { StorageService } from '../../../services/storage/storage.service';
import { TranslateService } from '../../../services/translate/translate.service';
import { LangOption } from '../../../models/lang.model';
import { Subscription } from 'rxjs';

/**
 * @internal
 */
@Component({
	selector: 'ov-lang-selector',
	templateUrl: './lang-selector.component.html',
	styleUrls: ['./lang-selector.component.scss']
})
export class LangSelectorComponent implements OnInit, OnDestroy {
	/**
	 * @internal
	 */
	@Input() compact: boolean;
	@Output() onLangChanged: EventEmitter<LangOption> = new EventEmitter<LangOption>();
	langSelected: LangOption;
	languages: LangOption[] = [];

	/**
	 * @ignore
	 */
	@ViewChild(MatMenuTrigger) public menuTrigger: MatMenuTrigger;

	/**
	 * @ignore
	 */
	@ViewChild(MatSelect) matSelect: MatSelect;

	private langSub: Subscription;

	constructor(
		private translateService: TranslateService,
		private storageSrv: StorageService
	) {}

	ngOnInit(): void {
		this.subscribeToLangSelected();
		this.languages = this.translateService.getLanguagesInfo();
	}

	ngOnDestroy(): void {
		this.langSub?.unsubscribe();
	}

	onLangSelected(lang: string) {
		this.translateService.setLanguage(lang);
		this.storageSrv.setLang(lang);
	}

	subscribeToLangSelected() {
		this.langSub = this.translateService.langSelectedObs.subscribe((lang) => {
			this.langSelected = lang;
			this.onLangChanged.emit(lang);
		});
	}
}
