import { inject, InjectionToken, Service, type Type } from '@angular/core';
import type {
	ListResponse,
	RoomFeature,
	RoomListItem,
	RoomSort,
	RoomStatusFilter,
	RoomSummary,
	SortOrder
} from '@openvidu-dashboard/typings';

import { HttpService, type QueryValue } from '../../core/http.js';
import type { RangeParams } from '../../core/query-state.js';
import { resolveRange } from '../../core/relative-time.js';

/** Loads the Node select of the Rooms filter bar, shown with `per-node-breakdown`; CE renders the locked select. */
export const ROOMS_NODE_FILTER = new InjectionToken<(() => Promise<Type<unknown>>) | null>('ROOMS_NODE_FILTER', {
	factory: () => null
});

export interface RoomsListRequest {
	range: RangeParams;
	status: RoomStatusFilter;
	q: string | null;
	features: readonly RoomFeature[];
	nodeId: string | null;
	sort: RoomSort;
	order: SortOrder;
	cursor: string | null;
	limit: number;
}

/** `from` and `to` resolved to ISO instants in `tz` at `now`, as the API expects; left as typed when unresolvable. */
export function apiRange(range: RangeParams, now: Date = new Date()): Record<string, string> {
	const resolved = resolveRange(range, now);

	return resolved === undefined
		? { from: range.from, to: range.to, tz: range.tz }
		: { from: resolved.from.toISOString(), to: resolved.to.toISOString(), tz: range.tz };
}

/** Requests of the rooms list and its summary. */
@Service()
export class RoomsDataService {
	private readonly http = inject(HttpService);

	list(request: RoomsListRequest): Promise<ListResponse<RoomListItem>> {
		const params: Record<string, QueryValue> = {
			...apiRange(request.range),
			status: request.status,
			q: request.q,
			features: request.features,
			nodeId: request.nodeId,
			sort: request.sort,
			order: request.order,
			cursor: request.cursor,
			limit: request.limit
		};

		return this.http.get('rooms', { params });
	}

	summary(range: RangeParams): Promise<RoomSummary> {
		return this.http.get('rooms/summary', { params: apiRange(range) });
	}
}
