import { AfterViewInit, Component, OnInit, Output, ViewChild, EventEmitter } from '@angular/core';
import { MatMenuTrigger } from '@angular/material/menu';
import { MatSelect } from '@angular/material/select';
import { StorageService } from '../../../services/storage/storage.service';
import { TranslateService } from '../../../services/translate/translate.service';
import { LangOption } from '../../../models/lang.model';

/**
 * @internal
 */
@Component({
	selector: 'ov-lang-selector',
	templateUrl: './lang-selector.component.html',
	styleUrls: ['./lang-selector.component.css']
})
export class LangSelectorComponent implements OnInit, AfterViewInit {
	@Output() onLangSelectorClicked = new EventEmitter<void>();
	langSelected: LangOption | undefined;
	languages: LangOption[] = [];

	/**
	 * @ignore
	 */
	@ViewChild(MatMenuTrigger) public menuTrigger: MatMenuTrigger;

	/**
	 * @ignore
	 */
	@ViewChild(MatSelect) matSelect: MatSelect;

	constructor(private translateService: TranslateService, private storageSrv: StorageService) {}

	ngOnInit(): void {
		this.languages = this.translateService.getLanguagesInfo();
		this.langSelected = this.translateService.getLangSelected();
	}

	ngAfterViewInit() {
		this.menuTrigger?.menuOpened.subscribe(() => {
			this.onLangSelectorClicked.emit();
		});
		this.matSelect?.openedChange.subscribe(() => {
			this.onLangSelectorClicked.emit();
		});
	}

	onLangSelected(lang: string) {
		this.translateService.setLanguage(lang);
		this.storageSrv.setLang(lang);
		this.langSelected = this.translateService.getLangSelected();
	}
}
