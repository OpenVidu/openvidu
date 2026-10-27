import { describe, expect, expectTypeOf, it } from 'vitest';

import {
	DEFAULT_PREFERENCES,
	type InfoMigration,
	type InfoResponse,
	type InfoRetention,
	type InfoStorageEntry,
	type NavigationMeta,
	PAGE_SIZES,
	RANGE_PRESET_FROM,
	REFRESH_INTERVALS_MS,
	type RelativeTime,
	type WriterSchemaStatus
} from '../src/index.js';

describe('UI contract', () => {
	it('gives every preference a default the UI offers', () => {
		expect(PAGE_SIZES).toContain(DEFAULT_PREFERENCES.pageSize);
		expect(REFRESH_INTERVALS_MS).toContain(DEFAULT_PREFERENCES.refreshMs.live);
		expect(Object.keys(DEFAULT_PREFERENCES.refreshMs)).toEqual(['live']);
		expect(RANGE_PRESET_FROM[DEFAULT_PREFERENCES.defaultPreset]).toBe('now-24h');
		expect(DEFAULT_PREFERENCES).toMatchObject({ theme: 'system', timeZone: 'browser', railPinned: false });
	});

	it('types the relative time grammar', () => {
		const accepted: RelativeTime[] = ['now', 'now-15m', 'now-24h', 'now-7d', 'now/d', 'now/M'];

		// @ts-expect-error weeks are not part of the grammar
		const rejected: RelativeTime = 'now-1w';

		expect(accepted).toHaveLength(6);
		expect(rejected).toBe('now-1w');
	});

	it('exposes the info fields read by the shell and the About page without any', () => {
		expectTypeOf<InfoResponse['edition']>().toEqualTypeOf<'ce' | 'pro'>();
		expectTypeOf<InfoResponse['versions']>().toEqualTypeOf<{ dashboard: string; server?: string }>();
		expectTypeOf<InfoResponse['schema']['status']>().toEqualTypeOf<WriterSchemaStatus>();
		expectTypeOf<InfoResponse['schema']['writer']>().toEqualTypeOf<number | undefined>();
		expectTypeOf<NonNullable<InfoMigration['progress']>>().toEqualTypeOf<{
			processed: number;
			total: number;
			startedAt?: string;
			finishedAt?: string;
		}>();
		expectTypeOf<InfoMigration['error']>().toEqualTypeOf<string | undefined>();
		expectTypeOf<InfoResponse['retention']>().toEqualTypeOf<InfoRetention | undefined>();
		expectTypeOf<InfoResponse['storage']>().toEqualTypeOf<Record<string, InfoStorageEntry>>();
		expectTypeOf<InfoResponse['database']['version']>().toBeString();
		expectTypeOf<InfoResponse['openapiDocsEnabled']>().toBeBoolean();
		expectTypeOf<InfoResponse['features']>().not.toBeAny();
	});

	it('declares the route metadata of a sidenav entry', () => {
		expectTypeOf<keyof NavigationMeta>().toEqualTypeOf<
			'label' | 'icon' | 'path' | 'order' | 'feature' | 'liveCapable' | 'rangeScoped' | 'timed' | 'retention'
		>();
		expectTypeOf<NavigationMeta['retention']>().toEqualTypeOf<keyof InfoRetention | undefined>();
	});
});
