import { FeatureKey } from '@openvidu-dashboard/typings';

import type { RouteRegistry } from '../api/route-registry.js';
import { participantsListResponse, participantsSummary } from './participants-responses.js';
import { agentsListQuery, participantsListQuery, participantsSummaryQuery } from './participants-schemas.js';
import type { ParticipantsService } from './participants-service.js';

const TAGS = ['Participants'];

/**
 * Participant routes: the search and agents lists and their summary, and the locks of the `participant-detail` routes
 * (the detail and its sub-resources). `now` is read per request.
 */
export function registerParticipantsRoutes(
	registry: RouteRegistry,
	participants: () => ParticipantsService,
	now: () => Date
): void {
	registry.register({
		method: 'get',
		path: '/participants',
		edition: 'ce',
		summary: 'Search participant sessions',
		tags: TAGS,
		security: 'bearer',
		request: { query: participantsListQuery(now) },
		responses: { 200: { description: 'One page of participant sessions', schema: participantsListResponse } },
		handler: ({ query }) => participants().list(query)
	});
	registry.register({
		method: 'get',
		path: '/participants/summary',
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
		edition: 'ce',
		summary: 'List agent sessions',
		tags: ['Agents'],
		security: 'bearer',
		request: { query: agentsListQuery(now) },
		responses: { 200: { description: 'One page of agent sessions', schema: participantsListResponse } },
		handler: ({ query }) => participants().agents(query)
	});

	for (const path of ['', '/sessions', '/tracks', '/subscriptions', '/events', '/series']) {
		registry.lock({ method: 'get', path: `/participants/{sid}${path}`, feature: FeatureKey.PARTICIPANT_DETAIL });
	}
}
