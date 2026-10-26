import { computed, inject, Service, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, type Params, Router } from '@angular/router';
import { PAGE_SIZES, type PageSize, RANGE_PRESET_FROM, SortOrder } from '@openvidu-dashboard/typings';
import { filter } from 'rxjs';

import { PreferencesService } from '../preferences/preferences.js';
import { QueryStateService, type RangeParams } from './query-state.js';
import { isTimeZone } from './relative-time.js';
import { RouteStateService } from './route-state.js';
import { SessionZoneService } from './session-zone.js';

/**
 * The range and the zone that follow the user across pages, kept in memory for the session. A range-scoped route opened
 * without a valid range receives the last one (or the default preset), and a timed route opened without a valid `tz`
 * receives the session zone, both through a URL replacement; a valid `tz` in the URL becomes the session zone. Invalid
 * page parameters are removed the same way.
 */
@Service()
export class ListStateService {
	private readonly router = inject(Router);
	private readonly query = inject(QueryStateService);
	private readonly routeState = inject(RouteStateService);
	private readonly preferences = inject(PreferencesService);
	private readonly session = inject(SessionZoneService);
	private readonly last = signal<Pick<RangeParams, 'from' | 'to'> | null>(null);

	/** The default preset ending now, in the current zone. */
	readonly defaultRange = computed<RangeParams>(() => ({
		from: RANGE_PRESET_FROM[this.preferences.defaultPreset()],
		to: 'now',
		tz: this.query.tz()
	}));

	/** Range of the current URL, else the last one of the session, else the default preset; always in the current zone. */
	readonly range = computed<RangeParams>(() => {
		const last = this.last();

		return this.query.urlRange() ?? (last === null ? this.defaultRange() : { ...last, tz: this.query.tz() });
	});

	/** Query parameters that carry the range to a range-scoped route. */
	readonly rangeParams = computed<Params>(() => {
		const { from, to, tz } = this.range();

		return { from, to, tz };
	});

	constructor() {
		this.router.events
			.pipe(
				filter((event) => event instanceof NavigationEnd),
				takeUntilDestroyed()
			)
			.subscribe(() => {
				void this.normalize();
			});
	}

	/** `params` plus the current range. */
	withRange(params: Params = {}): Params {
		return { ...this.rangeParams(), ...params };
	}

	private async normalize(): Promise<void> {
		const meta = this.routeState.pageMeta();
		const params = this.query.params();
		const fix: Params = {};
		const tz = params.get('tz');

		if (meta?.timed === true || meta?.rangeScoped === true) {
			if (tz !== null && isTimeZone(tz)) {
				this.session.set(tz);
			} else {
				fix['tz'] = this.query.tz();
			}
		}

		if (meta?.rangeScoped !== true) {
			await this.replace(fix);

			return;
		}

		const urlRange = this.query.urlRange();

		if (urlRange) {
			this.last.set({ from: urlRange.from, to: urlRange.to });
		} else {
			const { from, to } = this.last() ?? this.defaultRange();

			// The range goes before the zone in the URL, as the links that carry them write them.
			delete fix['tz'];
			Object.assign(fix, { from, to, tz: this.query.tz() });
		}

		const limit = params.get('limit');

		if (limit !== null && !PAGE_SIZES.includes(Number(limit) as PageSize)) {
			fix['limit'] = null;
		}

		const order = params.get('order');

		if (order !== null && !Object.values<string>(SortOrder).includes(order)) {
			fix['order'] = null;
		}

		await this.replace(fix);
	}

	private async replace(fix: Params): Promise<void> {
		if (Object.keys(fix).length > 0) {
			await this.router.navigate([], { queryParams: fix, queryParamsHandling: 'merge', replaceUrl: true });
		}
	}
}
