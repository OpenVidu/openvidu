import { computed, inject, Service } from '@angular/core';
import { type Params, Router } from '@angular/router';
import { PAGE_SIZES, type PageSize, SortOrder, type TimeExpression } from '@openvidu-dashboard/typings';

import type { QueryValue } from './http.js';
import { PreferencesService } from './preferences.js';
import { isTimeExpression, isTimeZone } from './relative-time.js';
import { RouteStateService } from './route-state.js';
import { SessionZoneService } from './session-zone.js';

export interface RangeParams {
	from: TimeExpression;
	to: TimeExpression;
	tz: string;
}

/** Parameters whose change keeps the current page; any other change drops `cursor` and `page`. */
const CURSOR_SAFE = new Set(['cursor', 'page']);

/**
 * Reads, validates and writes the URL query parameters. Every getter falls back silently to its default on an absent
 * or invalid value; `navigate()` merges a change into the URL as a new history entry and drops `cursor` and `page`
 * unless the change is the cursor or the page itself.
 */
@Service()
export class QueryStateService {
	private readonly router = inject(Router);
	private readonly routeState = inject(RouteStateService);
	private readonly preferences = inject(PreferencesService);
	private readonly session = inject(SessionZoneService);

	readonly params = this.routeState.queryParamMap;

	/** `tz` of the URL when valid, otherwise the session zone, otherwise the default zone of Settings. */
	readonly tz = computed(() => {
		const tz = this.params().get('tz');

		return tz !== null && isTimeZone(tz) ? tz : (this.session.zone() ?? this.preferences.timeZone());
	});

	/** The range of the URL when both ends are valid expressions, otherwise `null`. */
	readonly urlRange = computed<RangeParams | null>(() => {
		const from = this.params().get('from');
		const to = this.params().get('to');

		return from !== null && to !== null && isTimeExpression(from) && isTimeExpression(to)
			? { from, to, tz: this.tz() }
			: null;
	});

	/** `limit` of the URL when it is an offered page size, otherwise the stored page size. */
	readonly limit = computed<PageSize>(() => {
		const limit = Number(this.params().get('limit'));

		return PAGE_SIZES.includes(limit as PageSize) ? (limit as PageSize) : this.preferences.pageSize();
	});

	readonly order = computed<SortOrder>(() => this.oneOf('order', Object.values(SortOrder), SortOrder.DESC));
	readonly cursor = computed(() => this.value('cursor'));
	/** 1-based number of the page the cursor points to; 1 without a valid `page`. */
	readonly page = computed(() => {
		const page = Number(this.params().get('page'));

		return Number.isInteger(page) && page > 1 ? page : 1;
	});
	readonly q = computed(() => this.value('q')?.trim() ?? '');

	/** A non-empty parameter value, or `null`. */
	value(name: string): string | null {
		const value = this.params().get(name);

		return value === null || value === '' ? null : value;
	}

	/** The parameter when it is one of `allowed`, otherwise `fallback`. */
	oneOf<T extends string>(name: string, allowed: readonly T[], fallback: T): T {
		const value = this.params().get(name);

		return allowed.includes(value as T) ? (value as T) : fallback;
	}

	/** The comma-separated values of the parameter that are in `allowed`, in URL order and without duplicates. */
	csv<T extends string>(name: string, allowed: readonly T[]): T[] {
		const values = (this.params().get(name) ?? '').split(',').filter((v): v is T => allowed.includes(v as T));

		return [...new Set(values)];
	}

	/**
	 * Merges `patch` into the query parameters (`null`, `''` and `[]` remove a parameter, arrays become CSV) as a new
	 * history entry; `cursor` and `page` are dropped unless the patch only moves them or `keepCursor` says the patch
	 * leaves the page's list untouched.
	 */
	navigate(
		patch: Readonly<Record<string, QueryValue>>,
		options: { replaceUrl?: boolean; keepCursor?: boolean } = {}
	): Promise<boolean> {
		const queryParams: Params = {};

		for (const [key, value] of Object.entries(patch)) {
			queryParams[key] = serialize(value);
		}

		if (options.keepCursor !== true && Object.keys(patch).some((key) => !CURSOR_SAFE.has(key))) {
			queryParams['cursor'] = null;
			queryParams['page'] = null;
		}

		return this.router.navigate([], {
			queryParams,
			queryParamsHandling: 'merge',
			replaceUrl: options.replaceUrl ?? false
		});
	}
}

function serialize(value: QueryValue): string | null {
	if (value === null || value === undefined || value === '') {
		return null;
	}

	if (Array.isArray(value)) {
		return value.length === 0 ? null : value.join(',');
	}

	return String(value);
}
