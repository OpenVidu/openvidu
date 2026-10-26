import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';

import { resetMediaQueries, setMediaQuery } from '../../../testing/media.js';
import { PreferencesService } from './preferences.js';
import { ThemeService } from './theme.js';

const DARK = '(prefers-color-scheme: dark)';

describe('ThemeService', () => {
	afterEach(() => {
		resetMediaQueries();
		document.documentElement.removeAttribute('data-theme');
	});

	it('cycles system → light → dark → system and writes data-theme', () => {
		const theme = TestBed.inject(ThemeService);
		const seen: (string | null)[] = [];

		for (let step = 0; step < 4; step++) {
			TestBed.tick();
			seen.push(document.documentElement.getAttribute('data-theme'));
			theme.cycle();
		}

		expect(seen).toEqual([null, 'light', 'dark', null]);
		expect(TestBed.inject(PreferencesService).theme()).toBe('light');
	});

	it('follows the OS in system mode without reload', () => {
		setMediaQuery(DARK, false);

		const theme = TestBed.inject(ThemeService);

		expect(theme.scheme()).toBe('light');
		setMediaQuery(DARK, true);
		expect(theme.scheme()).toBe('dark');
	});

	it('ignores the OS once a theme is chosen', () => {
		setMediaQuery(DARK, true);

		const theme = TestBed.inject(ThemeService);

		TestBed.inject(PreferencesService).update({ theme: 'light' });
		expect(theme.scheme()).toBe('light');
	});
});
