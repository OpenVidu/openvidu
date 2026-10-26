import type { EgressListItem, EgressSummary } from '@openvidu-dashboard/typings';

const MINUTE = 60_000;

/** Overrides; `undefined` removes a field. */
type Overrides = { [K in keyof EgressListItem]?: EgressListItem[K] | undefined };

/** An egress relative to now: an active room composite recording of demo-room by default. */
export function egressItem(overrides: Overrides = {}): EgressListItem {
	const item = {
		egressId: 'EG_a1b2',
		roomSid: 'RM_ab12cd',
		roomName: 'demo-room',
		type: 'room_composite',
		sourceType: 'sdk',
		status: 'active',
		startedAt: new Date(Date.now() - 40 * MINUTE).toISOString(),
		outputs: { kinds: ['file'], count: 1 },
		hasError: false,
		...overrides
	};

	return JSON.parse(JSON.stringify(item)) as EgressListItem;
}

const ended = (minutes: number) => ({
	endedAt: new Date(Date.now() - minutes * MINUTE).toISOString(),
	durationMs: 30 * MINUTE
});

/**
 * Egresses of the suites: an active recording, a complete one with a failed output, a failed track egress, a lost one
 * and a web egress.
 */
export const EGRESSES: EgressListItem[] = [
	egressItem(),
	egressItem({
		egressId: 'EG_done',
		status: 'complete',
		hasError: true,
		errorCode: 403,
		outputs: { kinds: ['file', 'stream'], count: 3 },
		...ended(60)
	}),
	egressItem({ egressId: 'EG_fail', type: 'track', status: 'failed', hasError: true, errorCode: 403, ...ended(90) }),
	egressItem({ egressId: 'EG_lost', status: 'failed', closedBy: 'reconciler', hasError: true, ...ended(120) }),
	egressItem({
		egressId: 'EG_web1',
		type: 'web',
		sourceType: 'web',
		roomSid: undefined,
		roomName: undefined,
		status: 'complete',
		...ended(150)
	})
];

export const EGRESS_SUMMARY: EgressSummary = {
	active: 1,
	startedInRange: 5,
	byType: { room_composite: 3, track: 1, web: 1 },
	byEndStatus: { complete: 2, failed: 2 },
	totalDurationMs: 2 * 60 * MINUTE,
	approximate: false
};
