import type { RtpLayerStats } from './entities.js';
import type { StatsDirection, StoredEventType } from './enums.js';

/**
 * `events`: one raw analytics event. `_id` is the LiveKit event id (`AE_…`); events written by the reconciler use
 * `AE_SYN_…`. References are lifted from the event; those that do not apply are absent.
 */
export interface EventDocument {
	_id: string;
	type: StoredEventType;
	ts: Date;
	roomSid?: string;
	roomName?: string;
	participantSid?: string;
	identity?: string;
	trackSid?: string;
	egressId?: string;
	ingressId?: string;
	ingressSessionId?: string;
	nodeId: string;
	synthetic: boolean;
	/** The protocol event in protojson naming (snake_case, enum names, typed numbers) without lifted keys or secrets. */
	payload: Record<string, unknown>;
}

export interface TrackStatsMeta {
	roomSid: string;
	participantSid: string;
	/** Present in `track` stats detail only. */
	trackSid?: string;
	kind: StatsDirection;
	nodeId: string;
}

/**
 * `track_stats`: one 30-second flush per participant and direction (`participant` detail) or per track and direction
 * (`track` detail). Time-series collection (`timeField: ts`, `metaField: meta`); MongoDB adds an ObjectId `_id`.
 */
export interface TrackStatsDocument {
	ts: Date;
	meta: TrackStatsMeta;
	score: number;
	minScore: number;
	medianScore: number;
	bytes: number;
	packets: number;
	packetsLost: number;
	rttMs: number;
	jitterMs: number;
	nacks: number;
	plis: number;
	firs: number;
	frames: number;
	layers: RtpLayerStats[];
	/** Present in `track` stats detail only. */
	mimeType?: string;
}
