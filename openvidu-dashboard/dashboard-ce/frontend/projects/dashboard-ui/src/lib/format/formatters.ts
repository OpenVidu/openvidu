import { TZDate } from '@date-fns/tz';
import { format, isSameDay } from 'date-fns';

const NUMBER = new Intl.NumberFormat('en');
const BYTE_UNITS = ['B', 'kB', 'MB', 'GB', 'TB', 'PB'] as const;
const DAY_MS = 86_400_000;

/** Up to three significant digits, without trailing zeros. */
function significant(value: number): string {
	return String(Number(value.toPrecision(3)));
}

/** `1,203`. */
export function formatNumber(value: number): string {
	return NUMBER.format(value);
}

/** A ratio (0–1) as a percentage with one decimal: `98.7 %`. */
export function formatPercent(ratio: number): string {
	return `${(ratio * 100).toFixed(1)} %`;
}

/** Decimal units with up to three significant digits: `12.3 MB`. */
export function formatBytes(bytes: number): string {
	let value = Math.abs(bytes);
	let unit = 0;

	while (value >= 1000 && unit < BYTE_UNITS.length - 1) {
		value /= 1000;
		unit++;
	}

	if (Number(value.toPrecision(3)) >= 1000 && unit < BYTE_UNITS.length - 1) {
		value /= 1000;
		unit++;
	}

	return `${bytes < 0 ? '-' : ''}${unit === 0 ? String(Math.round(value)) : significant(value)} ${BYTE_UNITS[unit] ?? 'B'}`;
}

/** Bits per second as kbps below 1 Mbps, Mbps above: `850 kbps`, `2.5 Mbps`. */
export function formatBitrate(bitsPerSecond: number): string {
	return bitsPerSecond >= 1_000_000
		? `${significant(bitsPerSecond / 1_000_000)} Mbps`
		: `${significant(bitsPerSecond / 1000)} kbps`;
}

function pad(value: number): string {
	return String(value).padStart(2, '0');
}

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;

export interface DurationOptions {
	/** Truncate to the smallest unit shown instead of rounding to it, as a running counter does. */
	floor?: boolean;
}

/** Smallest unit a duration of this length shows: seconds below an hour, minutes below a day, then hours. */
function durationUnitMs(ms: number): number {
	return ms < HOUR_MS ? SECOND_MS : ms < DAY_MS ? MINUTE_MS : HOUR_MS;
}

/** `850 ms`, `42 s`, `12 m 05 s`, `1 h 02 m`, `3 d 4 h`, rounded to the smallest unit shown (truncated with `floor`). */
export function formatDuration(ms: number, options: DurationOptions = {}): string {
	const value = Math.max(0, ms);
	const fit = options.floor === true ? Math.floor : Math.round;

	if (fit(value) < SECOND_MS) {
		return `${String(fit(value))} ms`;
	}

	let unit = durationUnitMs(value);
	let total = fit(value / unit) * unit;

	// Rounding up can reach the next unit, as 59.6 s does: round again at that unit.
	if (durationUnitMs(total) !== unit) {
		unit = durationUnitMs(total);
		total = fit(value / unit) * unit;
	}

	if (total < MINUTE_MS) {
		return `${String(total / SECOND_MS)} s`;
	}

	if (total < HOUR_MS) {
		return `${String(Math.floor(total / MINUTE_MS))} m ${pad((total % MINUTE_MS) / SECOND_MS)} s`;
	}

	if (total < DAY_MS) {
		return `${String(Math.floor(total / HOUR_MS))} h ${pad((total % HOUR_MS) / MINUTE_MS)} m`;
	}

	return `${String(Math.floor(total / DAY_MS))} d ${String((total % DAY_MS) / HOUR_MS)} h`;
}

export interface TimestampOptions {
	/** IANA zone or `UTC`; `UTC` adds a ` UTC` suffix. */
	tz: string;
	/** With `rangeMs` of at most 24 h, timestamps on the current day of `now` omit the date. */
	now?: Date;
	rangeMs?: number;
	/** Milliseconds, for event timelines. */
	milliseconds?: boolean;
}

/** `2026-10-13 12:31:05` in the zone, `12:31:05` inside the current day of a 24 h range, ` UTC` suffix for UTC. */
export function formatTimestamp(value: Date | string | number, options: TimestampOptions): string {
	const date = new TZDate(new Date(value).getTime(), options.tz);
	const omitDate =
		options.now !== undefined &&
		options.rangeMs !== undefined &&
		options.rangeMs <= DAY_MS &&
		isSameDay(date, new TZDate(options.now.getTime(), options.tz));
	const time = options.milliseconds === true ? 'HH:mm:ss.SSS' : 'HH:mm:ss';
	const text = format(date, omitDate ? time : `yyyy-MM-dd ${time}`);

	return options.tz === 'UTC' ? `${text} UTC` : text;
}
