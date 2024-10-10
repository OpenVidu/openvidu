import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { LangOption } from '../../models/lang.model';

@Injectable({
	providedIn: 'root'
})
export class TranslateServiceMock {
	// Simulación de las opciones de lenguaje
	private languageOptions: LangOption[] = [
		{ name: 'English', lang: 'en' },
		{ name: 'Español', lang: 'es' }
	];

	// Comportamiento simulado del BehaviorSubject
	private _selectedLanguageSubject: BehaviorSubject<LangOption> = new BehaviorSubject<LangOption>(this.languageOptions[0]);
	selectedLanguageOption$: Observable<LangOption> = this._selectedLanguageSubject.asObservable();
	private activeTranslations: Record<string, any> = { hello: 'Hello', goodbye: 'Goodbye' }; // Simulación de traducciones

	// Métodos simulados
	addTranslations(translations: Partial<Record<string, any>>): void {
		// Puedes agregar lógica para simular la adición de traducciones
	}

	async setCurrentLanguage(lang: string): Promise<void> {
		const matchingOption = this.languageOptions.find(option => option.lang === lang);
		if (matchingOption) {
			this._selectedLanguageSubject.next(matchingOption);
		}
	}

	getSelectedLanguage(): LangOption {
		return this._selectedLanguageSubject.getValue();
	}

	getAvailableLanguages(): LangOption[] {
		return this.languageOptions;
	}

	translate(key: string): string {
		// Retorna la traducción simulada
		return this.activeTranslations[key] || '';
	}
}
