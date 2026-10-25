import { FeatureKey } from '@openvidu-dashboard/typings';

import type { RouteRegistry } from '../api/route-registry.js';
import { roomsListResponse, roomSummary } from './rooms-responses.js';
import { roomsListQuery, roomsSummaryQuery } from './rooms-schemas.js';
import type { RoomsService } from './rooms-service.js';

const TAGS = ['Rooms'];

/**
 * Rooms routes: the list and the summary, and the locks of the `room-detail` routes (the detail, its children, events
 * and series). `now` is read per request.
 */
export function registerRoomsRoutes(registry: RouteRegistry, rooms: () => RoomsService, now: () => Date): void {
	registry.register({
		method: 'get',
		path: '/rooms',
		edition: 'ce',
		summary: 'List room sessions',
		tags: TAGS,
		security: 'bearer',
		request: { query: roomsListQuery(now) },
		responses: { 200: { description: 'One page of rooms', schema: roomsListResponse } },
		handler: ({ query }) => rooms().list(query)
	});
	// Registered before /rooms/{sid} so the literal segment wins.
	registry.register({
		method: 'get',
		path: '/rooms/summary',
		edition: 'ce',
		summary: 'Room and participant counts of a range',
		tags: TAGS,
		security: 'bearer',
		request: { query: roomsSummaryQuery(now) },
		responses: { 200: { description: 'Counts above the rooms table', schema: roomSummary } },
		handler: ({ query }) => rooms().summary(query)
	});

	for (const path of ['', '/participants', '/egresses', '/ingress-sessions', '/events', '/series']) {
		registry.lock({ method: 'get', path: `/rooms/{sid}${path}`, feature: FeatureKey.ROOM_DETAIL });
	}
}
