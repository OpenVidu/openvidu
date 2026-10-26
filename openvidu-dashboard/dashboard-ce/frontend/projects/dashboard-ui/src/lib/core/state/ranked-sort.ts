import { computed, inject, type Signal } from '@angular/core';
import type { InfoLimits } from '@openvidu-dashboard/typings';

import { InfoService } from '../info.js';

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

/** A range limit in words: "7 days", "24 hours". */
export function formatRangeLimit(ms: number): string {
	if (ms >= DAY_MS && ms % DAY_MS === 0) {
		const days = ms / DAY_MS;

		return `${String(days)} ${days === 1 ? 'day' : 'days'}`;
	}

	const hours = Math.max(1, Math.round(ms / HOUR_MS));

	return `${String(hours)} ${hours === 1 ? 'hour' : 'hours'}`;
}

/**
 * Why a ranked sort cannot apply to a range: "Narrow the range to 7 days to sort by Duration".
 *
 * @param limitMs The sort's limit from `GET /info`; `undefined` while unknown, which allows the sort.
 * @returns The reason, or `undefined` while the range allows the sort.
 */
export function rankedSortReason(column: string, rangeMs: number, limitMs: number | undefined): string | undefined {
	return limitMs !== undefined && rangeMs > limitMs
		? `Narrow the range to ${formatRangeLimit(limitMs)} to sort by ${column}`
		: undefined;
}

/**
 * Why each ranked sort of a list cannot apply to a range.
 *
 * @param columns Column name of each ranked sort.
 * @returns The reason of every sort the range rules out; the sorts left out apply.
 */
export function rankedSortReasons<S extends string>(
	columns: Readonly<Partial<Record<S, string>>>,
	rangeMs: number,
	limitMs: number | undefined
): Partial<Record<S, string>> {
	const reasons: Partial<Record<S, string>> = {};

	for (const [sort, column] of Object.entries(columns) as [S, string][]) {
		const reason = rankedSortReason(column, rangeMs, limitMs);

		if (reason !== undefined) {
			reasons[sort] = reason;
		}
	}

	return reasons;
}

/** The ranked sort limits of `GET /info`, `null` until the document arrives. */
export function injectRankedSortLimits(): Signal<InfoLimits | null> {
	const info = inject(InfoService);

	return computed(() => info.info()?.limits ?? null);
}
