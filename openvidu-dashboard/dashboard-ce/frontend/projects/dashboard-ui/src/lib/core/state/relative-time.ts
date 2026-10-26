import { TZDate } from '@date-fns/tz';
import type { TimeExpression } from '@openvidu-dashboard/typings';
import { startOfDay, startOfMonth } from 'date-fns';

const RELATIVE = /^now(?:-(\d+)([mhd])|\/([dM]))?$/;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/;
const UNIT_MS = { m: 60_000, h: 3_600_000, d: 86_400_000 } as const;

/** A resolved range: absolute instants for a request. */
export interface ResolvedRange {
	from: Date;
	to: Date;
}

/** True when `zone` is `UTC` or an IANA zone this runtime knows; numeric offsets are not zones. */
export function isTimeZone(zone: string): boolean {
	if (zone === '' || /^[+-]\d/.test(zone)) {
		return false;
	}

	try {
		new Intl.DateTimeFormat('en-US', { timeZone: zone });

		return true;
	} catch {
		return false;
	}
}

export function isRelativeTime(value: string): boolean {
	return RELATIVE.test(value);
}

/** True for the relative grammar or an ISO 8601 instant with offset or `Z`. */
export function isTimeExpression(value: string): value is TimeExpression {
	return RELATIVE.test(value) || (ISO.test(value) && !Number.isNaN(new Date(value).getTime()));
}

/**
 * Resolves a time expression at `now`: `now`, `now-<n>m|h|d`, `now/d` and `now/M` (start of the current day or month
 * in `zone`) or ISO 8601. Returns undefined for anything else.
 */
export function resolveTime(expression: string, now: Date, zone: string): Date | undefined {
	const relative = RELATIVE.exec(expression);

	if (relative) {
		const [, amount, unit, snap] = relative;

		if (amount !== undefined && unit !== undefined) {
			return new Date(now.getTime() - Number(amount) * UNIT_MS[unit as keyof typeof UNIT_MS]);
		}

		if (snap !== undefined) {
			const local = new TZDate(now.getTime(), zone);

			return new Date((snap === 'd' ? startOfDay(local) : startOfMonth(local)).getTime());
		}

		return new Date(now.getTime());
	}

	return isTimeExpression(expression) ? new Date(expression) : undefined;
}

/** Resolves both ends of a range; undefined when either end is invalid or `from` is not before `to`. */
export function resolveRange(range: { from: string; to: string; tz: string }, now: Date): ResolvedRange | undefined {
	const from = resolveTime(range.from, now, range.tz);
	const to = resolveTime(range.to, now, range.tz);

	return from !== undefined && to !== undefined && from < to ? { from, to } : undefined;
}

/** Span of a range at `now` in milliseconds; infinite when the range does not resolve. */
export function rangeSpanMs(range: { from: string; to: string; tz: string }, now: Date): number {
	const resolved = resolveRange(range, now);

	return resolved === undefined ? Number.POSITIVE_INFINITY : resolved.to.getTime() - resolved.from.getTime();
}
