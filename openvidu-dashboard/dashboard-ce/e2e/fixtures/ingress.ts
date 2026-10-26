import type { IngressListItem, IngressSummary } from '@openvidu-dashboard/typings';

const MINUTE = 60_000;

/** Overrides; `undefined` removes a field. */
type Overrides = { [K in keyof IngressListItem]?: IngressListItem[K] | undefined };

/** An ingress relative to now: a reusable RTMP ingress publishing into demo-room by default. */
export function ingressItem(overrides: Overrides = {}): IngressListItem {
	const item = {
		ingressId: 'IN_c3d4',
		name: 'cam-1',
		inputType: 'rtmp',
		roomName: 'demo-room',
		participantIdentity: 'cam-1',
		status: 'publishing',
		enabled: true,
		reusable: true,
		createdAt: new Date(Date.now() - 120 * MINUTE).toISOString(),
		sessions: 3,
		totalDurationMs: 7_800_000,
		lastSessionAt: new Date(Date.now() - 10 * MINUTE).toISOString(),
		hasError: false,
		...overrides
	};

	return JSON.parse(JSON.stringify(item)) as IngressListItem;
}

/** Ingresses of the suites: publishing, never used, failed, deleted. */
export const INGRESSES: IngressListItem[] = [
	ingressItem(),
	ingressItem({
		ingressId: 'IN_wh1p',
		name: 'whip-desk',
		inputType: 'whip',
		status: 'inactive',
		reusable: false,
		sessions: 0,
		totalDurationMs: 0,
		lastSessionAt: undefined
	}),
	ingressItem({
		ingressId: 'IN_url1',
		name: 'mirror',
		inputType: 'url',
		status: 'error',
		hasError: true,
		reusable: false
	}),
	ingressItem({
		ingressId: 'IN_gone',
		name: 'old-cam',
		status: 'deleted',
		deletedAt: new Date(Date.now() - 60 * MINUTE).toISOString()
	})
];

export const INGRESS_SUMMARY: IngressSummary = {
	publishingNow: 1,
	ingressesInRange: 4,
	byInputType: { rtmp: 2, whip: 1, url: 1 },
	sessionsInRange: 7,
	totalDurationMs: 3 * 60 * MINUTE,
	approximate: true
};
