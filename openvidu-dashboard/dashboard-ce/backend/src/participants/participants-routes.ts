import { FeatureKey, listCsvFileName } from '@openvidu-dashboard/typings';

import { listRows, registerCsvExport } from '../api/csv-export.js';
import type { RouteRegistry } from '../api/route-registry.js';
import { participantCsvColumns } from './participants-csv.js';
import { participantsListResponse, participantsSummary } from './participants-responses.js';
import {
	agentsExportQuery,
	agentsListQuery,
	participantsExportQuery,
	participantsListQuery,
	participantsSummaryQuery
} from './participants-schemas.js';
import type { ParticipantsService } from './participants-service.js';

const TAGS = ['Participants'];

/**
 * Participant routes: the search and agents lists with their CSV exports and summary, and the locks of the
 * `participant-detail` routes (the detail and its sub-resources). `now` and `features` are read per request.
 */
export function registerParticipantsRoutes(
	registry: RouteRegistry,
	participants: () => ParticipantsService,
	now: () => Date,
	features: () => readonly FeatureKey[]
): void {
	const columns = () => participantCsvColumns(features().includes(FeatureKey.PER_NODE_BREAKDOWN));

	registry.tag('Participants', 'Participant sessions of every kind');
	registry.tag('Agents', 'Sessions of AI agents');
	registry.register({
		method: 'get',
		path: '/participants',
		operationId: 'listParticipants',
		edition: 'ce',
		summary: 'Search participant sessions',
		tags: TAGS,
		security: 'bearer',
		request: { query: participantsListQuery(now) },
		responses: { 200: { description: 'One page of participant sessions', schema: participantsListResponse } },
		handler: ({ query }) => participants().list(query)
	});
	// Registered before /participants/{sid} so the literal segment wins.
	registerCsvExport(registry, {
		path: '/participants/export.csv',
		operationId: 'exportParticipantsCsv',
		edition: 'ce',
		summary: 'Every participant session of the list as CSV',
		tags: TAGS,
		request: { query: participantsExportQuery(now) },
		columns,
		rows: ({ query }) => listRows((params, options) => participants().list(params, options), query),
		fileName: ({ query }) => listCsvFileName('participants', query.from.toISOString(), query.to.toISOString())
	});
	registry.register({
		method: 'get',
		path: '/participants/summary',
		operationId: 'getParticipantsSummary',
		edition: 'ce',
		summary: 'Participant and service counts of a range',
		tags: TAGS,
		security: 'bearer',
		request: { query: participantsSummaryQuery(now) },
		responses: { 200: { description: 'Counts above the participants table', schema: participantsSummary } },
		handler: ({ query }) => participants().summary(query)
	});
	registry.register({
		method: 'get',
		path: '/agents',
		operationId: 'listAgents',
		edition: 'ce',
		summary: 'List agent sessions',
		tags: ['Agents'],
		security: 'bearer',
		request: { query: agentsListQuery(now) },
		responses: { 200: { description: 'One page of agent sessions', schema: participantsListResponse } },
		handler: ({ query }) => participants().agents(query)
	});
	registerCsvExport(registry, {
		path: '/agents/export.csv',
		operationId: 'exportAgentsCsv',
		edition: 'ce',
		summary: 'Every agent session of the list as CSV',
		tags: ['Agents'],
		request: { query: agentsExportQuery(now) },
		columns,
		rows: ({ query }) => listRows((params, options) => participants().agents(params, options), query),
		fileName: ({ query }) => listCsvFileName('agents', query.from.toISOString(), query.to.toISOString())
	});

	for (const path of ['', '/sessions', '/tracks', '/subscriptions', '/events', '/series']) {
		registry.lock({ method: 'get', path: `/participants/{sid}${path}`, feature: FeatureKey.PARTICIPANT_DETAIL });
	}
}
