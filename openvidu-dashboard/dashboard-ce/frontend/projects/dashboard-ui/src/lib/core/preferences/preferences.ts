import { computed, inject, Service, signal } from '@angular/core';
import {
	BROWSER_TIME_ZONE,
	DEFAULT_PREFERENCES,
	PAGE_SIZES,
	type PageSize,
	type Preferences,
	PREFERENCES_VERSION,
	RANGE_PRESET_FROM,
	type RangePreset,
	REFRESH_INTERVALS_MS,
	type RefreshIntervalMs,
	type RefreshKind,
	ThemePreference,
	type TimeZonePreference
} from '@openvidu-dashboard/typings';

import { isTimeZone } from '../state/relative-time.js';
import { StorageService } from './storage.js';

export const PREFERENCES_KEY = 'ovd.prefs.v1';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function oneOf<T>(allowed: readonly T[], value: unknown, fallback: T): T {
	return allowed.includes(value as T) ? (value as T) : fallback;
}

function hiddenColumns(value: unknown): Record<string, string[]> {
	if (!isRecord(value)) {
		return {};
	}

	const result: Record<string, string[]> = {};

	for (const [table, keys] of Object.entries(value)) {
		if (Array.isArray(keys)) {
			result[table] = keys.filter((key): key is string => typeof key === 'string');
		}
	}

	return result;
}

/** The stored default zone: `browser`, or a valid IANA zone; `utc` from earlier builds reads as `UTC`. */
function timeZonePreference(value: unknown): TimeZonePreference {
	if (value === 'utc') {
		return 'UTC';
	}

	return typeof value === 'string' && value !== BROWSER_TIME_ZONE && isTimeZone(value) ? value : BROWSER_TIME_ZONE;
}

/** Validates a stored preferences document field by field; anything unreadable falls back to its default. */
export function parsePreferences(raw: string | null): Preferences {
	if (raw === null) {
		return structuredClone(DEFAULT_PREFERENCES);
	}

	let document: unknown;

	try {
		document = JSON.parse(raw);
	} catch {
		return structuredClone(DEFAULT_PREFERENCES);
	}

	if (!isRecord(document) || document['version'] !== PREFERENCES_VERSION) {
		return structuredClone(DEFAULT_PREFERENCES);
	}

	const refresh = isRecord(document['refreshMs']) ? document['refreshMs'] : {};

	return {
		theme: oneOf(Object.values(ThemePreference), document['theme'], DEFAULT_PREFERENCES.theme),
		timeZone: timeZonePreference(document['timeZone']),
		defaultPreset: oneOf(
			Object.keys(RANGE_PRESET_FROM) as RangePreset[],
			document['defaultPreset'],
			DEFAULT_PREFERENCES.defaultPreset
		),
		pageSize: oneOf<PageSize>(PAGE_SIZES, document['pageSize'], DEFAULT_PREFERENCES.pageSize),
		refreshMs: {
			live: oneOf<RefreshIntervalMs>(REFRESH_INTERVALS_MS, refresh['live'], DEFAULT_PREFERENCES.refreshMs.live)
		},
		railPinned:
			typeof document['railPinned'] === 'boolean' ? document['railPinned'] : DEFAULT_PREFERENCES.railPinned,
		hiddenColumns: hiddenColumns(document['hiddenColumns'])
	};
}

/** The browser's IANA zone, `UTC` when the runtime does not report one. */
export function browserTimeZone(): string {
	return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

/** Viewer preferences in browser storage under one versioned key, exposed as signals. */
@Service()
export class PreferencesService {
	private readonly storage = inject(StorageService);
	private readonly state = signal<Preferences>(parsePreferences(this.storage.get(PREFERENCES_KEY)));

	readonly preferences = this.state.asReadonly();
	readonly theme = computed(() => this.state().theme);
	readonly pageSize = computed(() => this.state().pageSize);
	readonly defaultPreset = computed(() => this.state().defaultPreset);
	readonly railPinned = computed(() => this.state().railPinned);
	/** Default zone of a session: the stored zone, or the browser's. */
	readonly timeZone = computed(() => {
		const zone = this.state().timeZone;

		return zone === BROWSER_TIME_ZONE ? browserTimeZone() : zone;
	});

	update(patch: Partial<Preferences>): void {
		const next = { ...this.state(), ...patch };

		this.state.set(next);
		this.storage.set(PREFERENCES_KEY, JSON.stringify({ version: PREFERENCES_VERSION, ...next }));
	}

	refreshInterval(kind: RefreshKind): RefreshIntervalMs {
		return this.state().refreshMs[kind];
	}

	setRefreshInterval(kind: RefreshKind, interval: RefreshIntervalMs): void {
		this.update({ refreshMs: { ...this.state().refreshMs, [kind]: interval } });
	}

	hiddenColumns(table: string): readonly string[] {
		return this.state().hiddenColumns[table] ?? [];
	}

	/** True once the viewer has chosen the columns of `table`; until then tables apply their defaults. */
	hasHiddenColumns(table: string): boolean {
		return table in this.state().hiddenColumns;
	}

	setHiddenColumns(table: string, keys: readonly string[]): void {
		this.update({ hiddenColumns: { ...this.state().hiddenColumns, [table]: [...keys] } });
	}

	/** Restores every default and clears the stored document. */
	reset(): void {
		this.state.set(structuredClone(DEFAULT_PREFERENCES));
		this.storage.remove(PREFERENCES_KEY);
	}
}
