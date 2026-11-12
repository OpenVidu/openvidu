import { inject, Service } from '@angular/core';
import type {
	EgressListItem,
	EgressSort,
	EgressStatus,
	EgressSummary,
	EgressType,
	ListResponse,
	SortOrder
} from '@openvidu-dashboard/typings';

import { type Download, HttpService, type QueryValue } from '../../core/http/http.js';
import type { RangeParams } from '../../core/state/query-state.js';
import { apiRange } from '../rooms/rooms-data.js';

export interface EgressListRequest {
	range: RangeParams;
	/** Empty: every status. */
	status: readonly EgressStatus[];
	type: readonly EgressType[];
	room: string | null;
	q: string | null;
	sort: EgressSort;
	order: SortOrder;
	cursor: string | null;
	limit: number;
}

function egressParams(request: EgressListRequest): Record<string, QueryValue> {
	return {
		...apiRange(request.range),
		status: request.status.length === 0 ? null : request.status,
		type: request.type,
		room: request.room,
		q: request.q,
		sort: request.sort,
		order: request.order,
		cursor: request.cursor,
		limit: request.limit
	};
}

/** Requests of the egress list, its CSV export and its summary. */
@Service()
export class EgressDataService {
	private readonly http = inject(HttpService);

	list(request: EgressListRequest): Promise<ListResponse<EgressListItem>> {
		return this.http.get('egresses', { params: egressParams(request) });
	}

	/** The CSV of every egress the request selects. */
	export(request: EgressListRequest): Promise<Download> {
		return this.http.download('egresses/export.csv', {
			params: { ...egressParams(request), cursor: null, limit: null }
		});
	}

	summary(range: RangeParams): Promise<EgressSummary> {
		return this.http.get('egresses/summary', { params: apiRange(range) });
	}
}
