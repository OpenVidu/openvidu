import type { ParticipantListItem } from '@openvidu-dashboard/typings';

const MINUTE = 60_000;

/** Overrides; `undefined` removes a field. */
type Overrides = { [K in keyof ParticipantListItem]?: ParticipantListItem[K] | undefined };

/** A participant session relative to now: a left STANDARD session of alice by default. */
export function participantItem(overrides: Overrides = {}): ParticipantListItem {
	const item = {
		sid: 'PA_x1y2',
		identity: 'alice',
		kind: 'STANDARD',
		status: 'left',
		roomSid: 'RM_ab12cd',
		roomName: 'demo-room',
		joinedAt: new Date(Date.now() - 60 * MINUTE).toISOString(),
		leftAt: new Date(Date.now() - 18 * MINUTE).toISOString(),
		durationMs: 42 * MINUTE,
		connectionType: 'udp',
		nodeId: 'node-a',
		isPublisher: true,
		publishedSources: ['CAMERA', 'MICROPHONE'],
		client: { sdk: 'JS', version: '2.6.1', browser: 'Chrome', browserVersion: '130', os: 'macOS', osVersion: '14' },
		...overrides
	};

	return JSON.parse(JSON.stringify(item)) as ParticipantListItem;
}

/** Sessions of the suites: alice, a reconnecting bob, a SIP caller and two agents. */
export const PARTICIPANTS: ParticipantListItem[] = [
	participantItem(),
	participantItem({ sid: 'PA_bob2', identity: 'bob', status: 'active', leftAt: undefined, durationMs: undefined }),
	participantItem({
		sid: 'PA_sip1',
		identity: 'sip-caller',
		kind: 'SIP',
		client: undefined,
		connectionType: undefined
	}),
	participantItem({
		sid: 'PA_agent1',
		identity: 'agent-1',
		kind: 'AGENT',
		status: 'active',
		leftAt: undefined,
		durationMs: undefined,
		client: { sdk: 'GO', version: '1.2' }
	}),
	participantItem({
		sid: 'PA_agent2',
		identity: 'agent-2',
		kind: 'AGENT',
		roomSid: 'RM_other',
		roomName: 'other-room'
	})
];
