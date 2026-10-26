import { effect, inject, InjectionToken, Service, signal, type Type, untracked } from '@angular/core';
import type { OverviewResponse } from '@openvidu-dashboard/typings';

import { HttpService } from '../../core/http/http.js';
import { LiveCountersService } from '../../core/refresh/live-counters.js';
import { injectRefreshScheduler, type RefreshScheduler } from '../../core/refresh/refresh.js';
import { QueryStateService } from '../../core/state/query-state.js';

/** The last overview body and when the browser received and last confirmed it. */
export interface OverviewSnapshot {
	body: OverviewResponse;
	/** Browser time of the `200` that delivered `body`. */
	receivedAt: number;
	/** Browser time of the last `200` or `304`: freshness is judged at this instant. */
	confirmedAt: number;
}

/**
 * The server clock at browser time `now`: `generatedAt` plus the browser time elapsed since the body arrived, so a
 * skewed browser clock never changes an age.
 */
export function serverNow(snapshot: OverviewSnapshot, now: number): Date {
	return new Date(Date.parse(snapshot.body.generatedAt) + elapsed(snapshot, now));
}

/** Browser time since the body arrived; a ticker read before the arrival counts as none. */
function elapsed(snapshot: OverviewSnapshot, now: number): number {
	return Math.max(0, now - snapshot.receivedAt);
}

/** Component of the PRO "By node" card, given `overview`, the last overview response; CE provides none and renders the lock. */
export const OVERVIEW_NODES_CARD = new InjectionToken<Type<unknown> | null>('OVERVIEW_NODES_CARD', {
	factory: () => null
});

/**
 * `GET /api/v1/overview` with `If-None-Match`: a `304` keeps the last body. Every new body feeds the live counters
 * other pages show (the Agents tile).
 */
@Service()
export class OverviewDataService {
	private readonly http = inject(HttpService);
	private readonly counters = inject(LiveCountersService);
	private readonly current = signal<OverviewSnapshot | null>(null);
	private etag: string | null = null;
	private tz: string | null = null;

	readonly snapshot = this.current.asReadonly();

	async load(tz: string): Promise<void> {
		const result = await this.http.getConditional<OverviewResponse>('overview', tz === this.tz ? this.etag : null, {
			params: { tz }
		});

		const now = Date.now();

		if (result.status === 200) {
			this.etag = result.etag;
			this.tz = tz;
			this.current.set({ body: result.body, receivedAt: now, confirmedAt: now });
			this.counters.setActiveAgents(result.body.live.participantsByKind.AGENT);
		} else {
			const current = this.current();

			if (current !== null) {
				this.current.set({ ...current, confirmedAt: now });
			}
		}
	}
}

/**
 * Polls the overview at the live refresh interval for a page that shows its counters (the Agents tile) without
 * taking the header refresh control from the page's own list.
 */
export function injectLiveCounters(): RefreshScheduler {
	const data = inject(OverviewDataService);
	const tz = inject(QueryStateService).tz;
	const scheduler = injectRefreshScheduler({ register: false, load: () => data.load(tz()) });
	let first = true;

	effect(() => {
		tz();

		if (first) {
			first = false;

			return;
		}

		untracked(() => void scheduler.refresh());
	});

	return scheduler;
}
