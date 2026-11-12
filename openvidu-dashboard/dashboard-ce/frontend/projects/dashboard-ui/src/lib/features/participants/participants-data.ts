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

import { type Download, HttpService, type QueryValue } from '../../core/http/http.js';
import type { RangeParams } from '../../core/state/query-state.js';
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

function participantsParams(request: ParticipantsListRequest): Record<string, QueryValue> {
	return { ...listParams(request), kind: request.kind, publisher: request.publisher ? 'true' : null };
}

/** Requests of the participants search list, the agents list, their CSV exports and the summary. */
@Service()
export class ParticipantsDataService {
	private readonly http = inject(HttpService);

	summary(range: RangeParams): Promise<ParticipantsSummary> {
		return this.http.get('participants/summary', { params: apiRange(range) });
	}

	list(request: ParticipantsListRequest): Promise<ListResponse<ParticipantListItem>> {
		return this.http.get('participants', { params: participantsParams(request) });
	}

	agents(request: AgentsListRequest): Promise<ListResponse<ParticipantListItem>> {
		return this.http.get('agents', { params: listParams(request) });
	}

	/** The CSV of every participant session the request selects. */
	export(request: ParticipantsListRequest): Promise<Download> {
		return this.http.download('participants/export.csv', {
			params: { ...participantsParams(request), cursor: null, limit: null }
		});
	}

	/** The CSV of every agent session the request selects. */
	exportAgents(request: AgentsListRequest): Promise<Download> {
		return this.http.download('agents/export.csv', {
			params: { ...listParams(request), cursor: null, limit: null }
		});
	}
}
