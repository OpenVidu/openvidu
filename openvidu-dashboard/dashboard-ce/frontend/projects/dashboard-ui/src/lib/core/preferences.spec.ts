import { TestBed } from '@angular/core/testing';
import { DEFAULT_PREFERENCES } from '@openvidu-dashboard/typings';
import { beforeEach, describe, expect, it } from 'vitest';

import { parsePreferences, PREFERENCES_KEY, PreferencesService } from './preferences.js';
import { BROWSER_STORAGE } from './storage.js';

function memoryStorage(initial: Record<string, string> = {}): Storage {
	const data = new Map(Object.entries(initial));

	return {
		get length() {
			return data.size;
		},
		clear: () => {
			data.clear();
		},
		getItem: (key) => data.get(key) ?? null,
		key: (index) => [...data.keys()][index] ?? null,
		removeItem: (key) => {
			data.delete(key);
		},
		setItem: (key, value) => {
			data.set(key, value);
		}
	};
}

describe('parsePreferences', () => {
	it.each([
		['nothing stored', null],
		['corrupt JSON', '{"version":1,'],
		['a non-object', '[1,2]'],
		['an unknown version', JSON.stringify({ version: 2, theme: 'dark' })],
		['no version', JSON.stringify({ theme: 'dark' })]
	])('returns the defaults for %s', (_case, raw) => {
		expect(parsePreferences(raw)).toEqual(DEFAULT_PREFERENCES);
	});

	it('keeps valid fields, defaults each invalid one and ignores a stored history interval', () => {
		const raw = JSON.stringify({
			version: 1,
			theme: 'dark',
			timeZone: 'mars',
			defaultPreset: '7d',
			pageSize: 7,
			refreshMs: { live: 30_000, history: 30_000 },
			railPinned: 'yes',
			hiddenColumns: { rooms: ['bandwidth', 3], broken: 'x' }
		});

		expect(parsePreferences(raw)).toEqual({
			theme: 'dark',
			timeZone: 'browser',
			defaultPreset: '7d',
			pageSize: 25,
			refreshMs: { live: 30_000 },
			railPinned: false,
			hiddenColumns: { rooms: ['bandwidth'] }
		});
	});

	it('defaults to system theme, browser zone, last 24 h, 25 rows and 10 s live refresh', () => {
		expect(DEFAULT_PREFERENCES).toEqual({
			theme: 'system',
			timeZone: 'browser',
			defaultPreset: '24h',
			pageSize: 25,
			refreshMs: { live: 10_000 },
			railPinned: false,
			hiddenColumns: {}
		});
	});
});

describe('PreferencesService', () => {
	let storage: Storage;

	beforeEach(() => {
		storage = memoryStorage({ [PREFERENCES_KEY]: JSON.stringify({ version: 1, pageSize: 50 }) });
		TestBed.configureTestingModule({ providers: [{ provide: BROWSER_STORAGE, useValue: storage }] });
	});

	it('reads the stored document under the versioned key', () => {
		expect(TestBed.inject(PreferencesService).pageSize()).toBe(50);
	});

	it('persists every change with its version', () => {
		const preferences = TestBed.inject(PreferencesService);

		preferences.update({ theme: 'dark' });
		preferences.setRefreshInterval('live', 30_000);
		preferences.setHiddenColumns('rooms', ['bandwidth']);

		expect(JSON.parse(storage.getItem(PREFERENCES_KEY) ?? '')).toMatchObject({
			version: 1,
			theme: 'dark',
			pageSize: 50,
			refreshMs: { live: 30_000 },
			hiddenColumns: { rooms: ['bandwidth'] }
		});
		expect(preferences.hiddenColumns('rooms')).toEqual(['bandwidth']);
	});

	it('resets to the defaults and clears the stored document', () => {
		const preferences = TestBed.inject(PreferencesService);

		preferences.reset();

		expect(preferences.preferences()).toEqual(DEFAULT_PREFERENCES);
		expect(storage.getItem(PREFERENCES_KEY)).toBeNull();
	});

	it('resolves the default zone: any IANA zone, or the browser zone', () => {
		const preferences = TestBed.inject(PreferencesService);

		preferences.update({ timeZone: 'UTC' });
		expect(preferences.timeZone()).toBe('UTC');

		preferences.update({ timeZone: 'Asia/Tokyo' });
		expect(preferences.timeZone()).toBe('Asia/Tokyo');

		preferences.update({ timeZone: 'browser' });
		expect(preferences.timeZone()).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
	});

	it('reads a stored zone, the utc of earlier builds as UTC and an invalid zone as the browser zone', () => {
		const stored = (timeZone: string) => parsePreferences(JSON.stringify({ version: 1, timeZone })).timeZone;

		expect(stored('America/New_York')).toBe('America/New_York');
		expect(stored('utc')).toBe('UTC');
		expect(stored('UTC')).toBe('UTC');
		expect(stored('Mars/Base')).toBe('browser');
	});

	it('keeps working when storage throws', () => {
		TestBed.resetTestingModule();
		TestBed.configureTestingModule({
			providers: [
				{
					provide: BROWSER_STORAGE,
					useValue: {
						getItem: () => {
							throw new Error('denied');
						},
						setItem: () => {
							throw new Error('denied');
						}
					}
				}
			]
		});

		const preferences = TestBed.inject(PreferencesService);

		preferences.update({ pageSize: 100 });

		expect(preferences.pageSize()).toBe(100);
	});
});
