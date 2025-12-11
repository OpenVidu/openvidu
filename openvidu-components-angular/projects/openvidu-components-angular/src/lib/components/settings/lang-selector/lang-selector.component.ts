import { Component, OnInit, Output, ViewChild, EventEmitter, Input, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppMaterialModule } from '../../../openvidu-components-angular.material.module';
import { MatMenuTrigger } from '@angular/material/menu';
import { MatSelect } from '@angular/material/select';
import { StorageService } from '../../../services/storage/storage.service';
import { TranslateService } from '../../../services/translate/translate.service';
import { AvailableLangs, LangOption } from '../../../models/lang.model';
import { Subscription } from 'rxjs';

/**
 * @internal
 */
@Component({
	selector: 'ov-lang-selector',
	templateUrl: './lang-selector.component.html',
	styleUrls: ['./lang-selector.component.scss'],
	standalone: true,
	imports: [CommonModule, AppMaterialModule]
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
		this.languages = this.translateService.getAvailableLanguages();
	}

	ngOnDestroy(): void {
		this.langSub?.unsubscribe();
	}

	onLangSelected(lang: AvailableLangs) {
		this.translateService.setCurrentLanguage(lang);
		this.storageSrv.setLang(lang);
	}

	subscribeToLangSelected() {
		this.langSub = this.translateService.selectedLanguageOption$.subscribe((lang) => {
			this.langSelected = lang;
			this.onLangChanged.emit(lang);
		});
	}
}
