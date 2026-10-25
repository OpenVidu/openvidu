/**
 * Texts of the info tips, one per term: a term that appears on several pages reads the same everywhere.
 */
export const INFO_TEXTS = {
	participantSessions:
		'Each time someone joins a room starts a participant session; leaving and joining again starts another. Only regular participants count: egress, ingress and agents are services.',
	uniqueIdentities:
		'Distinct participant identities among those sessions: someone who joined three times counts once.',
	services:
		'Egress, ingress, agent and other non-user sessions. They join rooms as participants but are not counted as participants.',
	dataUpDown: 'Up: bytes the participants sent to the server. Down: bytes the server sent to the participants.',
	sdk: 'Software development kit the client connected with.',

	liveParticipants: 'Regular participants connected now. Egress, ingress and agents are not counted.',
	livePublishers: 'Participants connected now that publish at least one track: camera, microphone or screen.',
	liveAgents:
		'Agent sessions connected now. Agents join rooms as participants of kind Agent but are not counted as participants.',
	todayParticipants: 'Participant sessions that started today. Only regular participants count.',
	todayMinutes: 'Minutes of the participant sessions that ended today.',
	dataPipeline:
		'The OpenVidu server writes analytics in batches. This card shows when the last batch arrived and how many nodes are reporting.',
	byNode: 'Nodes that reported analytics recently. A node is alive while its analytics batches keep arriving.',

	dailyUniqueIdentities:
		'Distinct participant identities per UTC day, counted once the day has closed; over several days the daily values are added up, so someone who joined on two days counts twice.',
	connectionSuccess:
		'Share of participant sessions that finished connecting; the rest were aborted before becoming active.',
	sessionsChart:
		'Participant sessions that started in each bucket, and those aborted before becoming active. Only regular participants count.',
	participantKind: 'Every participant session by kind, services included.',

	activeParticipants: 'Regular participants connected now.',
	roomFeatures: 'Services the room used: E egress, I ingress, A agent.',

	ingressSessions: 'An ingress is a reusable input; each stream published to it is one session.'
} as const;

/** Tooltip of a value prefixed with "≈": a count summed from the hourly rollups. */
export const APPROXIMATE_TEXT = 'Hour-aligned sums of the hourly rollups: the range exceeds the exact-count limit';
