import { Injectable, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { OPENVIDU_DARK_THEME, OPENVIDU_LIGHT_THEME, OpenViduThemeMode, OpenViduThemeVariables } from '../../models/theme.model';

/**
 * Service for managing OpenVidu component themes dynamically
 *
 * This service allows you to:
 * - Switch between light, dark, and auto themes
 * - Apply custom theme variables
 * - Listen to theme changes
 * - Integrate with Angular Material themes
 *
 * @example
 * ```typescript
 * // Inject the service
 * constructor(private themeService: OpenViduThemeService) {}
 *
 * // Switch to dark theme
 * this.themeService.setTheme('dark');
 *
 * // Apply custom variables
 * this.themeService.updateThemeVariables({
 *   '--ov-primary-action-color': '#ff5722',
 *   '--ov-accent-action-color': '#4caf50'
 * });
 *
 * // Listen to theme changes
 * this.themeService.currentTheme$.subscribe(theme => {
 *   console.log('Current theme:', theme);
 * });
 * ```
 *
 * @internal
 */
@Injectable({
	providedIn: 'root'
})
export class OpenViduThemeService {
	private readonly THEME_STORAGE_KEY = 'openvidu-theme';
	private readonly THEME_ATTRIBUTE = 'data-ov-theme';

	private currentThemeSubject = new BehaviorSubject<OpenViduThemeMode>(OpenViduThemeMode.None);
	private currentVariablesSubject = new BehaviorSubject<OpenViduThemeVariables>({});

	/**
	 * Observable that emits the current theme mode
	 */
	public readonly currentTheme$: Observable<OpenViduThemeMode> = this.currentThemeSubject.asObservable();

	/**
	 * Observable that emits the current theme variables
	 */
	public readonly currentVariables$: Observable<OpenViduThemeVariables> = this.currentVariablesSubject.asObservable();

	constructor(@Inject(DOCUMENT) private document: Document) {
		this.initializeTheme();
		this.setupSystemThemeListener();
	}

	/**
	 * Gets the current theme mode
	 */
	getCurrentTheme(): OpenViduThemeMode {
		return this.currentThemeSubject.value;
	}

	/**
	 * Gets the current theme variables
	 */
	getCurrentVariables(): OpenViduThemeVariables {
		return this.currentVariablesSubject.value;
	}

	/**
	 * Sets the theme mode (light, dark, or auto)
	 * @param theme The theme mode to apply
	 */
	setTheme(theme: OpenViduThemeMode): void {
		this.currentThemeSubject.next(theme);
		this.applyTheme(theme);
		this.saveThemeToStorage(theme);
	}

	/**
	 * Updates specific theme variables
	 * @param variables Object containing CSS variables to update
	 */
	updateThemeVariables(variables: OpenViduThemeVariables): void {
		const mergedVariables = { ...this.currentVariablesSubject.value, ...variables };
		this.currentVariablesSubject.next(mergedVariables);
		this.applyCSSVariables(variables);
	}

	/**
	 * Replaces all theme variables with a new set
	 * @param variables Complete set of theme variables
	 */
	setThemeVariables(variables: OpenViduThemeVariables): void {
		this.currentVariablesSubject.next(variables);
		this.applyCSSVariables(variables);
	}

	/**
	 * Resets theme variables to default values based on current theme
	 */
	resetThemeVariables(): void {
		const currentTheme = this.getCurrentTheme();
		const defaultVariables = this.getDefaultVariablesForTheme(currentTheme);
		this.setThemeVariables(defaultVariables);
	}

	/**
	 * Applies a predefined theme configuration
	 * @param themeVariables Predefined theme configuration (e.g., OPENVIDU_LIGHT_THEME)
	 */
	applyThemeConfiguration(themeVariables: OpenViduThemeVariables): void {
		this.setThemeVariables(themeVariables);
	}

	/**
	 * Toggles between light and dark themes
	 */
	toggleTheme(): void {
		const currentTheme = this.getCurrentTheme();
		if (currentTheme === OpenViduThemeMode.Light) {
			this.setTheme(OpenViduThemeMode.Dark);
		} else if (currentTheme === OpenViduThemeMode.Dark) {
			this.setTheme(OpenViduThemeMode.Light);
		} else {
			// If auto, switch to opposite of system preference
			const prefersDark = this.prefersDarkMode();
			this.setTheme(prefersDark ? OpenViduThemeMode.Light : OpenViduThemeMode.Dark);
		}
	}

	/**
	 * Gets a specific CSS variable value
	 * @param variableName The CSS variable name (with or without --)
	 */
	getThemeVariable(variableName: string): string {
		const varName = variableName.startsWith('--') ? variableName : `--${variableName}`;
		return getComputedStyle(this.document.documentElement).getPropertyValue(varName).trim();
	}

	/**
	 * Checks if the system prefers dark mode
	 */
	prefersDarkMode(): boolean {
		return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
	}

	private initializeTheme(): void {
		const savedTheme = this.getThemeFromStorage();
		const initialTheme = savedTheme || OpenViduThemeMode.None;
		this.applyTheme(initialTheme);
		this.currentThemeSubject.next(initialTheme);
	}

	private applyTheme(theme: OpenViduThemeMode): void {
		const documentElement = this.document.documentElement;

		if (theme === OpenViduThemeMode.Auto || theme === OpenViduThemeMode.None) {
			documentElement.removeAttribute(this.THEME_ATTRIBUTE);
		} else {
			documentElement.setAttribute(this.THEME_ATTRIBUTE, theme);
		}

		// Apply default variables for the theme
		const defaultVariables = this.getDefaultVariablesForTheme(theme);
		this.applyCSSVariables(defaultVariables);
	}

	private applyCSSVariables(variables: OpenViduThemeVariables): void {
		const documentElement = this.document.documentElement;

		Object.entries(variables).forEach(([property, value]) => {
			if (value !== undefined) {
				documentElement.style.setProperty(property, value);
			}
		});
	}

	private getDefaultVariablesForTheme(theme: OpenViduThemeMode): OpenViduThemeVariables {
		switch (theme) {
			case OpenViduThemeMode.Light:
				return OPENVIDU_LIGHT_THEME;
			case OpenViduThemeMode.Dark:
				return OPENVIDU_DARK_THEME;
			case OpenViduThemeMode.None:
				return {};
			case OpenViduThemeMode.Auto:
				// Auto theme - use system preference
				return this.prefersDarkMode() ? OPENVIDU_DARK_THEME : OPENVIDU_LIGHT_THEME;
			default:
				return {};
		}
	}

	private setupSystemThemeListener(): void {
		if (window.matchMedia) {
			const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

			const handleSystemThemeChange = (event: MediaQueryListEvent) => {
				if (this.getCurrentTheme() === OpenViduThemeMode.Auto) {
					const defaultVariables = this.getDefaultVariablesForTheme(OpenViduThemeMode.Auto);
					this.applyCSSVariables(defaultVariables);
				}
			};

			// Use the newer addEventListener if available, otherwise use the deprecated addListener
			if (mediaQuery.addEventListener) {
				mediaQuery.addEventListener('change', handleSystemThemeChange);
			}
		}
	}

	private saveThemeToStorage(theme: OpenViduThemeMode): void {
		try {
			localStorage.setItem(this.THEME_STORAGE_KEY, theme);
		} catch (error) {
			console.warn('Failed to save theme to localStorage:', error);
		}
	}

	private getThemeFromStorage(): OpenViduThemeMode | null {
		try {
			const saved = localStorage.getItem(this.THEME_STORAGE_KEY) as OpenViduThemeMode;
			if (saved && [OpenViduThemeMode.Light, OpenViduThemeMode.Dark, OpenViduThemeMode.Auto].includes(saved)) {
				return saved;
			}
		} catch (error) {
			console.warn('Failed to read theme from localStorage:', error);
		}
		return null;
	}
}
