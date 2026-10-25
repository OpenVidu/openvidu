import type { PageSize, RelativeTime } from '../api/lists.js';

export const ThemePreference = {
	SYSTEM: 'system',
	LIGHT: 'light',
	DARK: 'dark'
} as const;
export type ThemePreference = (typeof ThemePreference)[keyof typeof ThemePreference];

/** The stored default zone that stands for the browser's zone. */
export const BROWSER_TIME_ZONE = 'browser';

/** Default zone of new sessions: the browser's, or an IANA zone (`UTC` included). */
export type TimeZonePreference = typeof BROWSER_TIME_ZONE | (string & {});

export const RangePreset = {
	LAST_HOUR: '1h',
	LAST_6_HOURS: '6h',
	LAST_24_HOURS: '24h',
	LAST_7_DAYS: '7d',
	LAST_30_DAYS: '30d',
	LAST_90_DAYS: '90d',
	THIS_MONTH: 'month'
} as const;
export type RangePreset = (typeof RangePreset)[keyof typeof RangePreset];

/** `from` of each preset; every preset ends at `now`. */
export const RANGE_PRESET_FROM: Readonly<Record<RangePreset, RelativeTime>> = {
	'1h': 'now-1h',
	'6h': 'now-6h',
	'24h': 'now-24h',
	'7d': 'now-7d',
	'30d': 'now-30d',
	'90d': 'now-90d',
	month: 'now/M'
};

/** Auto-refresh intervals in milliseconds; `0` is off. */
export const REFRESH_INTERVALS_MS = [0, 10_000, 30_000, 60_000, 300_000] as const;
export type RefreshIntervalMs = (typeof REFRESH_INTERVALS_MS)[number];

/** Views with an auto-refresh interval preference; Analytics refreshes only on demand. */
export const RefreshKind = {
	LIVE: 'live'
} as const;
export type RefreshKind = (typeof RefreshKind)[keyof typeof RefreshKind];

/** Viewer preferences kept in browser storage; they describe the viewer, never the deployment. */
export interface Preferences {
	theme: ThemePreference;
	timeZone: TimeZonePreference;
	defaultPreset: RangePreset;
	pageSize: PageSize;
	refreshMs: Record<RefreshKind, RefreshIntervalMs>;
	/** The desktop sidenav stays collapsed as a rail. */
	railPinned: boolean;
	/** Hidden column keys per table id. */
	hiddenColumns: Record<string, string[]>;
}

/** Version of the stored preferences document; a new version discards older documents. */
export const PREFERENCES_VERSION = 1;

export const DEFAULT_PREFERENCES: Readonly<Preferences> = {
	theme: 'system',
	timeZone: 'browser',
	defaultPreset: '24h',
	pageSize: 25,
	refreshMs: { live: 10_000 },
	railPinned: false,
	hiddenColumns: {}
};
