import { AfterViewInit, Component, OnInit, Output, ViewChild, EventEmitter, OnDestroy } from '@angular/core';
import { MatLegacyMenuTrigger as MatMenuTrigger } from '@angular/material/legacy-menu';
import { MatLegacySelect as MatSelect } from '@angular/material/legacy-select';
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
	styleUrls: ['./lang-selector.component.css']
})
export class LangSelectorComponent implements OnInit, AfterViewInit, OnDestroy {
	@Output() onLangSelectorClicked = new EventEmitter<void>();
	langSelected: LangOption | undefined;
	languages: LangOption[] = [];

	private langSub: Subscription;

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
		this.subscribeToLangSelected();
		this.languages = this.translateService.getLanguagesInfo();
	}

	ngOnDestroy(): void {
		this.langSub?.unsubscribe();
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
	}

	subscribeToLangSelected() {
		this.langSub = this.translateService.langSelectedObs.subscribe((lang) => {
			this.langSelected = lang;
		});
	}
}
