import { inject, Service } from '@angular/core';
import type {
	IngressInputType,
	IngressListItem,
	IngressSort,
	IngressStatus,
	IngressSummary,
	ListResponse,
	SortOrder
} from '@openvidu-dashboard/typings';

import { HttpService } from '../../core/http/http.js';
import type { RangeParams } from '../../core/state/query-state.js';
import { apiRange } from '../rooms/rooms-data.js';

export interface IngressListRequest {
	range: RangeParams;
	status: IngressStatus | null;
	inputType: IngressInputType | null;
	q: string | null;
	sort: IngressSort;
	order: SortOrder;
	cursor: string | null;
	limit: number;
}

/** Requests of the ingress list and its summary. */
@Service()
export class IngressDataService {
	private readonly http = inject(HttpService);

	list(request: IngressListRequest): Promise<ListResponse<IngressListItem>> {
		return this.http.get('ingresses', {
			params: {
				...apiRange(request.range),
				status: request.status,
				inputType: request.inputType,
				q: request.q,
				sort: request.sort,
				order: request.order,
				cursor: request.cursor,
				limit: request.limit
			}
		});
	}

	summary(range: RangeParams): Promise<IngressSummary> {
		return this.http.get('ingresses/summary', { params: apiRange(range) });
	}
}
