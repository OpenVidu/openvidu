import { computed, DestroyRef, DOCUMENT, effect, inject, Service, signal } from '@angular/core';
import type { ThemePreference } from '@openvidu-dashboard/typings';

import { PreferencesService } from './preferences.js';

export type ColorScheme = 'light' | 'dark';

const NEXT: Readonly<Record<ThemePreference, ThemePreference>> = { system: 'light', light: 'dark', dark: 'system' };

/**
 * Applies the theme preference as `data-theme` on `<html>` (absent for system) and exposes the scheme in effect, which
 * follows `prefers-color-scheme` in system mode so charts and icons can re-theme in place. The inline script of
 * `index.html` applies the stored preference before the first paint.
 */
@Service()
export class ThemeService {
	private readonly preferences = inject(PreferencesService);
	private readonly document = inject(DOCUMENT);
	private readonly systemDark = signal(false);

	readonly preference = this.preferences.theme;
	readonly scheme = computed<ColorScheme>(() => {
		const preference = this.preference();

		if (preference === 'system') {
			return this.systemDark() ? 'dark' : 'light';
		}

		return preference;
	});

	constructor() {
		const media = this.document.defaultView?.matchMedia('(prefers-color-scheme: dark)');

		if (media) {
			const onChange = (event: MediaQueryListEvent): void => {
				this.systemDark.set(event.matches);
			};

			this.systemDark.set(media.matches);
			media.addEventListener('change', onChange);
			inject(DestroyRef).onDestroy(() => {
				media.removeEventListener('change', onChange);
			});
		}

		effect(() => {
			const preference = this.preference();
			const root = this.document.documentElement;

			if (preference === 'system') {
				root.removeAttribute('data-theme');
			} else {
				root.setAttribute('data-theme', preference);
			}
		});
	}

	/** system → light → dark → system. */
	cycle(): void {
		this.preferences.update({ theme: NEXT[this.preference()] });
	}
}
