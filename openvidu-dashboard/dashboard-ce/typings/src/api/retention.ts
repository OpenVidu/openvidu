const RETENTION_UNITS = [
	{ unit: 'day', ms: 86_400_000 },
	{ unit: 'hour', ms: 3_600_000 },
	{ unit: 'minute', ms: 60_000 },
	{ unit: 'second', ms: 1_000 }
] as const;

export type RetentionUnit = (typeof RETENTION_UNITS)[number]['unit'];

export interface RetentionLength {
	count: number;
	unit: RetentionUnit;
}

/** A retention in the largest of days, hours, minutes and seconds that divides it exactly (rounded seconds otherwise). */
export function retentionLength(ms: number): RetentionLength {
	const exact = RETENTION_UNITS.find((size) => ms >= size.ms && ms % size.ms === 0);

	return exact === undefined
		? { count: Math.round(ms / 1_000), unit: 'second' }
		: { count: ms / exact.ms, unit: exact.unit };
}

export interface RetentionLengthOptions {
	/** Form placed before a noun: `7-day`, `36-hour`. */
	adjective?: boolean;
	/** Formats the count, `String` by default. */
	formatCount?: (count: number) => string;
}

/**
 * The wording of a retention shared by the API messages and the UI: `7 days`, `1 day`, `36 hours`, or `7-day` and
 * `36-hour` before a noun.
 */
export function formatRetentionLength(ms: number, options: RetentionLengthOptions = {}): string {
	const { count, unit } = retentionLength(ms);
	const value = (options.formatCount ?? String)(count);

	if (options.adjective === true) {
		return `${value}-${unit}`;
	}

	return `${value} ${unit}${count === 1 ? '' : 's'}`;
}
