import { inject, Service } from '@angular/core';
import type {
	ListResponse,
	ParticipantKind,
	ParticipantListItem,
	ParticipantSort,
	ParticipantStatus,
	ParticipantsSummary,
	SortOrder
} from '@openvidu-dashboard/typings';

import { HttpService, type QueryValue } from '../../core/http.js';
import type { RangeParams } from '../../core/query-state.js';
import { apiRange } from '../rooms/rooms-data.js';

export interface ParticipantsListRequest {
	range: RangeParams;
	q: string | null;
	/** Empty for every kind. */
	kind: readonly ParticipantKind[];
	status: ParticipantStatus | null;
	room: string | null;
	/** Sessions that published at least one track. */
	publisher: boolean;
	sort: ParticipantSort;
	order: SortOrder;
	cursor: string | null;
	limit: number;
}

export type AgentsListRequest = Omit<ParticipantsListRequest, 'kind' | 'publisher'>;

function listParams(request: AgentsListRequest): Record<string, QueryValue> {
	return {
		...apiRange(request.range),
		q: request.q,
		status: request.status,
		room: request.room,
		sort: request.sort,
		order: request.order,
		cursor: request.cursor,
		limit: request.limit
	};
}

/** Requests of the participants search list, its summary and the agents list. */
@Service()
export class ParticipantsDataService {
	private readonly http = inject(HttpService);

	summary(range: RangeParams): Promise<ParticipantsSummary> {
		return this.http.get('participants/summary', { params: apiRange(range) });
	}

	list(request: ParticipantsListRequest): Promise<ListResponse<ParticipantListItem>> {
		return this.http.get('participants', {
			params: { ...listParams(request), kind: request.kind, publisher: request.publisher ? 'true' : null }
		});
	}

	agents(request: AgentsListRequest): Promise<ListResponse<ParticipantListItem>> {
		return this.http.get('agents', { params: listParams(request) });
	}
}
