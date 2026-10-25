import { TZDate } from '@date-fns/tz';
// Per-function entry points: the date-fns barrel takes most of a second to load and delays startup.
import { startOfDay } from 'date-fns/startOfDay';
import { startOfMonth } from 'date-fns/startOfMonth';

const RELATIVE = /^now(?:-(\d+)([mhd])|\/([dM]))?$/;
const UNIT_MS = { m: 60_000, h: 3_600_000, d: 86_400_000 } as const;

/** True when `zone` is `UTC` or an IANA zone this runtime knows; numeric offsets are not zones. */
export function isTimeZone(zone: string): boolean {
	if (/^[+-]\d/.test(zone)) {
		return false;
	}

	try {
		new Intl.DateTimeFormat('en-US', { timeZone: zone });

		return true;
	} catch {
		return false;
	}
}

/**
 * Resolves a time expression at `now`: ISO 8601 with offset or `Z`, `now`, `now-<n>m|h|d` (a duration back) or
 * `now/d` and `now/M` (start of the current day or month in `zone`). Returns undefined when it is neither.
 */
export function resolveTimeExpression(expression: string, now: Date, zone: string): Date | undefined {
	const relative = RELATIVE.exec(expression);

	if (relative) {
		const [, amount, unit, snap] = relative;

		if (amount !== undefined && unit !== undefined) {
			return new Date(now.getTime() - Number(amount) * UNIT_MS[unit as keyof typeof UNIT_MS]);
		}

		if (snap !== undefined) {
			const local = new TZDate(now.getTime(), zone);
			const start = snap === 'd' ? startOfDay(local) : startOfMonth(local);

			return new Date(start.getTime());
		}

		return new Date(now.getTime());
	}

	if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(expression)) {
		return undefined;
	}

	const date = new Date(expression);

	return Number.isNaN(date.getTime()) ? undefined : date;
}
