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

import { type Download, HttpService, type QueryValue } from '../../core/http/http.js';
import type { RangeParams } from '../../core/state/query-state.js';
import { resolveRange } from '../../core/state/relative-time.js';

/**
 * Loads the Node select of the Rooms filter bar, shown with `per-node-breakdown`: it binds a media node label to the
 * `node` URL parameter. CE provides none and shows no select.
 */
export const ROOMS_NODE_FILTER = new InjectionToken<(() => Promise<Type<unknown>>) | null>('ROOMS_NODE_FILTER', {
	factory: () => null
});

export interface RoomsListRequest {
	range: RangeParams;
	status: RoomStatusFilter;
	q: string | null;
	features: readonly RoomFeature[];
	mediaNode: string | null;
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

function roomsParams(request: RoomsListRequest): Record<string, QueryValue> {
	return {
		...apiRange(request.range),
		status: request.status,
		q: request.q,
		features: request.features,
		mediaNode: request.mediaNode,
		sort: request.sort,
		order: request.order,
		cursor: request.cursor,
		limit: request.limit
	};
}

/** Requests of the rooms list, its CSV export and its summary. */
@Service()
export class RoomsDataService {
	private readonly http = inject(HttpService);

	list(request: RoomsListRequest): Promise<ListResponse<RoomListItem>> {
		return this.http.get('rooms', { params: roomsParams(request) });
	}

	/** The CSV of every room the request selects. */
	export(request: RoomsListRequest): Promise<Download> {
		return this.http.download('rooms/export.csv', {
			params: { ...roomsParams(request), cursor: null, limit: null }
		});
	}

	summary(range: RangeParams): Promise<RoomSummary> {
		return this.http.get('rooms/summary', { params: apiRange(range) });
	}
}
