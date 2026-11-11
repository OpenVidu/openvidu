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
	dataUp: 'Bytes the participants sent to the server.',
	dataDown: 'Bytes the server sent to the participants.',
	sdk: 'Software development kit the client connected with.',

	liveParticipants: 'Regular participants connected now. Egress, ingress and agents are not counted.',
	livePublishers: 'Participants connected now that publish at least one track: camera, microphone or screen.',
	liveAgents:
		'Agent sessions connected now. Agents join rooms as participants of kind Agent but are not counted as participants.',
	todayParticipants: 'Participant sessions that started today. Only regular participants count.',
	todayMinutes: 'Minutes of the participant sessions that ended today.',
	dataPipeline: 'The OpenVidu server writes analytics in batches. This card shows when the last batch arrived.',
	byNode: 'Media nodes of this deployment. A node is alive while its analytics batches keep arriving, and draining while it waits for its rooms to end before it stops. One that stopped reporting is listed for 24 hours, and one that was stopped, for an hour.',

	dailyUniqueIdentities:
		'Distinct participant identities per UTC day, counted once the day has closed; over several days the daily values are added up, so someone who joined on two days counts twice.',
	connectionSuccess:
		'Share of participant sessions that finished connecting; the rest were aborted before becoming active.',
	activeRoomsChart: 'The most rooms open at the same time in each bucket, sampled every minute.',
	recordedRoomsTile:
		'Share of the rooms ended in the range that were recorded: an egress with a file or HLS output started recording. Live streams and images alone do not count.',
	roomTopologyChart:
		'Rooms ended in each bucket by their shape, from the most regular participants connected at once (N) and the most of them sending audio or video at once (P): Empty (N = 0), Single participant (N = 1), No publishers (P = 0), 1:1 (N = 2), 1:N (one sender, N ≥ 3) and N:M (several senders, N ≥ 3). A muted track counts once unmuted; agents, ingress and SIP participants do not count.',
	recordedRoomsChart:
		'Share of the rooms ended in each bucket that were recorded: an egress with a file or HLS output started recording. Live streams and images alone do not count.',
	roomSizeChart:
		'Rooms ended in the range with several participants, by the most regular participants connected at once.',
	activeEgressChart: 'The most egress in progress at the same time in each bucket, sampled every minute.',
	activeIngressChart: 'The most ingress sessions publishing at the same time in each bucket, sampled every minute.',
	activeParticipantsChart:
		'The most participants connected at the same time in each bucket, sampled every minute. Only regular participants count.',
	participantKind: 'Every participant session by kind, services included.',

	activeParticipants: 'Regular participants connected now.',
	roomFeatures: 'Services the room used: E egress, I ingress, A agent.',

	ingressSessions: 'An ingress is a reusable input; each stream published to it is one session.',

	egressTotalDuration: 'Time from each egress request to its end, failed egress included.'
} as const;

/** Tooltip of a value prefixed with "≈": a count summed from the hourly rollups. */
export const APPROXIMATE_TEXT = 'Hour-aligned sums of the hourly rollups: the range exceeds the exact-count limit';
