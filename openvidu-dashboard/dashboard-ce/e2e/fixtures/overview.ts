import type { InfoMigration, OverviewResponse, StatusResponse } from '@openvidu-dashboard/typings';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const DAY = 86_400_000;

/** A busy deployment at `now`: live counters, today's rollups and recent rooms. */
export function activeOverview(now = Date.now()): OverviewResponse {
	const ago = (ms: number) => new Date(now - ms).toISOString();

	return {
		generatedAt: new Date(now).toISOString(),
		live: {
			rooms: 12,
			participants: 85,
			services: 7,
			participantsByKind: { STANDARD: 85, INGRESS: 0, EGRESS: 3, SIP: 2, AGENT: 2, CONNECTOR: 0, BRIDGE: 0 },
			publishers: 52,
			egresses: 3,
			ingressSessions: 1,
			stale: { rooms: 1, participants: 4, olderThanMs: 90_000 }
		},
		today: {
			tz: 'UTC',
			since: new Date(Math.floor(now / DAY) * DAY).toISOString(),
			rooms: 143,
			participantSessions: 1204,
			participantMinutes: 18_340,
			egresses: 21,
			ingressSessions: 4,
			approximate: false
		},
		recentRooms: [
			{
				sid: 'RM_ab12cd',
				name: 'demo-room',
				status: 'active',
				createdAt: ago(42 * MINUTE),
				participants: { active: 5, sessions: 9, unique: 7 },
				nodeId: 'node-a',
				lastStatsAt: ago(5 * SECOND)
			},
			{
				sid: 'RM_cd34ef',
				name: 'stale-room',
				status: 'active',
				createdAt: ago(60 * MINUTE),
				participants: { active: 2, sessions: 2, unique: 2 },
				nodeId: 'node-b',
				lastStatsAt: ago(3 * MINUTE),
				stale: true
			},
			{
				sid: 'RM_ef56gh',
				name: 'crashed-room',
				status: 'closed',
				createdAt: ago(120 * MINUTE),
				endedAt: ago(90 * MINUTE),
				durationMs: 30 * MINUTE,
				closedBy: 'reconciler',
				participants: { active: 0, sessions: 7, unique: 5 }
			}
		]
	};
}

/** A deployment whose writer has not initialized the analytics database. */
export function freshOverview(now = Date.now()): OverviewResponse {
	const active = activeOverview(now);

	return {
		generatedAt: active.generatedAt,
		live: {
			rooms: 0,
			participants: 0,
			services: 0,
			participantsByKind: { STANDARD: 0, INGRESS: 0, EGRESS: 0, SIP: 0, AGENT: 0, CONNECTOR: 0, BRIDGE: 0 },
			publishers: 0,
			egresses: 0,
			ingressSessions: 0,
			stale: { rooms: 0, participants: 0, olderThanMs: 90_000 }
		},
		today: {
			...active.today,
			rooms: 0,
			participantSessions: 0,
			participantMinutes: 0,
			egresses: 0,
			ingressSessions: 0
		},
		recentRooms: []
	};
}

/** The server status at `now`: two nodes reporting, the newest batch `writerAgo` old, and the migration given. */
export function activeStatus(
	now = Date.now(),
	writerAgo = 4 * SECOND,
	migration: InfoMigration = { state: 'completed', progress: { processed: 10, total: 10 } }
): StatusResponse {
	return {
		generatedAt: new Date(now).toISOString(),
		schema: { dashboard: 1, writer: 1, status: 'ok' },
		migration,
		writer: {
			lastSeenAt: new Date(now - writerAgo).toISOString(),
			nodes: 2,
			aliveNodes: writerAgo <= 30 * SECOND ? 2 : 0
		}
	};
}

/** The server status of a deployment whose writer has not initialized the analytics database. */
export function freshStatus(now = Date.now()): StatusResponse {
	return {
		generatedAt: new Date(now).toISOString(),
		schema: { dashboard: 1, status: 'uninitialized' },
		migration: { state: 'none' },
		writer: { nodes: 0, aliveNodes: 0 }
	};
}
