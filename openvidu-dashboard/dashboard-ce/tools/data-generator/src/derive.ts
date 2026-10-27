import { type Long } from 'mongodb';
import {
	int64,
	subscriptionBitrate,
	trackBitrate,
	type EgressDoc,
	type IngressDoc,
	type IngressSessionDoc,
	type ParticipantDoc,
	type RoomBundle,
	type SubscriptionDoc,
	type TrackDoc
} from './model.js';
import type { Rng } from './random.js';

export type StatsMode = 'participant' | 'track';

export interface DeriveWindows {
	now: number;
	/** Raw events dated before this instant are not stored (events retention). */
	eventsFrom: number;
	/** Stats dated before this instant are not stored (stats retention). */
	statsFrom: number;
	/** 5-minute rollups dated before this instant are not stored (5-minute rollup retention). */
	fiveMinuteFrom: number;
	statsMode: StatsMode;
}

export interface EventDoc {
	_id: string;
	type: string;
	ts: Date;
	roomSid: string;
	roomName: string;
	participantSid?: string;
	identity?: string;
	trackSid?: string;
	egressId?: string;
	ingressId?: string;
	ingressSessionId?: string;
	nodeId: string;
	synthetic: boolean;
	payload: Record<string, unknown>;
}

export interface StatsDoc {
	ts: Date;
	meta: { roomSid: string; participantSid: string; trackSid?: string; kind: 'up' | 'down'; nodeId: string };
	score: number;
	minScore: number;
	medianScore: number;
	bytes: Long;
	packets: number;
	packetsLost: number;
	rttMs: number;
	jitterMs: number;
	nacks: number;
	plis: number;
	firs: number;
	frames: number;
	layers: { layer: number; bytes: Long; packets: number; frames: number }[];
	mimeType?: string;
}

const HOUR = 3_600_000;
const DAY = 86_400_000;
const FLUSH_MS = 30_000;
const POOR_SCORE = 3.1;
const LOST_SCORE = 2.1;

export function deriveEvents(
	rng: Rng,
	bundle: RoomBundle,
	windows: DeriveWindows,
	emit: (doc: EventDoc) => void
): void {
	const { room } = bundle;
	const base = { roomSid: room._id, roomName: room.name, nodeId: room.nodeId };
	const push = (
		type: string,
		ts: Date | null,
		extra: Partial<EventDoc>,
		payload: Record<string, unknown>,
		synthetic = false
	): void => {
		if (ts === null || ts.getTime() < windows.eventsFrom) {
			return;
		}

		emit({ _id: rng.id(synthetic ? 'AE_SYN_' : 'AE_'), type, ts, ...base, ...extra, synthetic, payload });
	};
	const roomMin = { sid: room._id, name: room.name };
	const roomFull = {
		...roomMin,
		empty_timeout: Math.round(room.config.emptyTimeoutMs / 1000),
		departure_timeout: Math.round(room.config.departureTimeoutMs / 1000),
		max_participants: room.config.maxParticipants,
		creation_time: unixSeconds(room.createdAt),
		creation_time_ms: unixMs(room.createdAt)
	};
	const tracksById = new Map(bundle.tracks.map((t) => [t._id, t]));

	push('ROOM_CREATED', room.createdAt, {}, { room: roomFull });

	if (room.closedBy === 'reconciler') {
		push(
			'ROOM_ENDED',
			room.endedAt,
			{},
			{ room: roomMin, room_end_reason: RECONCILED, reconciler: { reason: 'node-dead' } },
			true
		);
	} else {
		push('ROOM_ENDED', room.endedAt, {}, { room: roomFull, ...enumField('room_end_reason', roomEndReason(room)) });
	}

	for (const p of bundle.participants) {
		const ref = { participantSid: p._id, identity: p.identity };
		const info = participantInfo(p);
		push('PARTICIPANT_JOINED', p.joinedAt, ref, {
			room: roomMin,
			participant: info,
			client_info: clientInfo(p),
			client_meta: { region: p.region, node: p.nodeId }
		});
		push('PARTICIPANT_ACTIVE', p.activeAt, ref, {
			room: roomMin,
			participant: { ...info, state: 'ACTIVE' },
			client_meta: {
				...(p.connectTimeMs === null ? {} : { client_connect_time: p.connectTimeMs }),
				...(p.connectionType === null ? {} : { connection_type: p.connectionType })
			}
		});

		if (p.closedBy === 'reconciler') {
			push(
				p.status === 'aborted' ? 'PARTICIPANT_CONNECTION_ABORTED' : 'PARTICIPANT_LEFT',
				p.leftAt,
				ref,
				{
					room: roomMin,
					participant: { sid: p._id, identity: p.identity, disconnect_reason: RECONCILED },
					reconciler: { reason: 'node-dead' }
				},
				true
			);
		} else {
			push(p.status === 'aborted' ? 'PARTICIPANT_CONNECTION_ABORTED' : 'PARTICIPANT_LEFT', p.leftAt, ref, {
				room: roomMin,
				participant: {
					...info,
					state: 'DISCONNECTED',
					...(p.isPublisher ? { is_publisher: true } : {}),
					...enumField('disconnect_reason', p.disconnectReason ?? 'UNKNOWN_REASON')
				}
			});
		}
	}

	for (const t of bundle.tracks) {
		const ref = { participantSid: t.participantSid, identity: t.identity, trackSid: t._id };
		const participant = { sid: t.participantSid, identity: t.identity };
		push('TRACK_PUBLISHED', t.publishedAt, ref, { room: roomMin, participant, track: trackInfo(t) });
		push('TRACK_UNPUBLISHED', t.unpublishedAt, ref, {
			room: roomMin,
			participant: { sid: t.participantSid },
			track: trackInfo(t)
		});
	}

	for (const s of bundle.subscriptions) {
		const ref = { participantSid: s.subscriberSid, identity: s.subscriberIdentity, trackSid: s.trackSid };
		const track = tracksById.get(s.trackSid);
		const participant = { sid: s.subscriberSid };

		if (s.status === 'failed') {
			push('TRACK_SUBSCRIBE_FAILED', s.subscribedAt, ref, {
				room: roomMin,
				participant,
				track: { sid: s.trackSid },
				error: s.error ?? 'could not find published track'
			});
		} else {
			push('TRACK_SUBSCRIBED', s.subscribedAt, ref, {
				room: roomMin,
				participant,
				track: track === undefined ? { sid: s.trackSid } : trackInfo(track),
				publisher: { sid: s.publisherSid, identity: s.publisherIdentity }
			});
			push('TRACK_UNSUBSCRIBED', s.unsubscribedAt, ref, {
				room: roomMin,
				participant,
				track: { sid: s.trackSid, ...(track === undefined ? {} : trackType(track)) }
			});
		}
	}

	for (const e of bundle.egresses) {
		const ref = { egressId: e._id };
		const egress = egressInfo(e);

		push('EGRESS_STARTED', e.startedAt, ref, { egress: { ...egress, updated_at: unixNs(e.startedAt) } });

		for (const h of e.endedAt === null ? e.statusHistory.slice(1) : e.statusHistory.slice(1, -1)) {
			push('EGRESS_UPDATED', h.at, ref, {
				egress: { ...egress, ...egressStatus(h.status), updated_at: unixNs(h.at) }
			});
		}

		if (e.endedAt !== null) {
			push(
				'EGRESS_ENDED',
				e.endedAt,
				ref,
				{
					egress: {
						...egress,
						...egressStatus(e.status),
						ended_at: unixNs(e.endedAt),
						updated_at: unixNs(e.endedAt),
						...(e.error === null ? {} : { error: e.error }),
						...(e.errorCode === null ? {} : { error_code: e.errorCode }),
						...egressResults(e)
					},
					...(e.closedBy === 'reconciler' ? { reconciler: { reason: 'node-dead' } } : {})
				},
				e.closedBy === 'reconciler'
			);
		}
	}

	for (const i of bundle.ingresses) {
		push('INGRESS_CREATED', i.createdAt, { ingressId: i._id }, { ingress: { ...ingressInfo(i), state: {} } });
	}

	const ingressesById = new Map(bundle.ingresses.map((i) => [i._id, i]));

	for (const s of bundle.ingressSessions) {
		const ref = { ingressId: s.ingressId, ingressSessionId: s._id, identity: s.participantIdentity };
		const ingress = ingressesById.get(s.ingressId);
		const definition = ingress === undefined ? { ingress_id: s.ingressId } : ingressInfo(ingress);
		const state = {
			room_id: s.roomSid,
			started_at: unixNs(s.startedAt),
			resource_id: s._id
		};
		push('INGRESS_STARTED', s.startedAt, ref, {
			ingress: {
				...definition,
				state: {
					status: 'ENDPOINT_PUBLISHING',
					video: {
						mime_type: s.video.mimeType,
						average_bitrate: s.video.averageBitrate,
						width: s.video.width,
						height: s.video.height,
						framerate: s.video.framerate
					},
					audio: {
						mime_type: s.audio.mimeType,
						average_bitrate: s.audio.averageBitrate,
						channels: s.audio.channels,
						sample_rate: s.audio.sampleRate
					},
					...state,
					updated_at: unixNs(s.startedAt)
				}
			}
		});

		if (s.endedAt !== null) {
			push('INGRESS_ENDED', s.endedAt, ref, {
				ingress: {
					...definition,
					state: {
						...enumField('status', INGRESS_STATES[s.status]),
						...(s.error === null ? {} : { error: s.error }),
						...state,
						ended_at: unixNs(s.endedAt),
						updated_at: unixNs(s.endedAt)
					}
				}
			});
		}
	}
}

/** Reason and disconnect reason of the reconciler's synthetic close events. */
const RECONCILED = 'RECONCILED';

/** Protojson names of the ingress session states; the zero value `ENDPOINT_INACTIVE` is never written. */
const INGRESS_STATES: Record<IngressSessionDoc['status'], string> = {
	buffering: 'ENDPOINT_BUFFERING',
	publishing: 'ENDPOINT_PUBLISHING',
	error: 'ENDPOINT_ERROR',
	complete: 'ENDPOINT_COMPLETE'
};

/** Protojson zero values, which the writer's codec omits. */
const ZERO_ENUMS = new Set(['STANDARD', 'AUDIO', 'LOW', 'ROOM_END_UNKNOWN', 'UNKNOWN_REASON', 'EGRESS_STARTING']);

/** `{ [name]: value }`, or nothing when the value is absent: the driver would store `undefined` as `null`. */
function defined(name: string, value: string | undefined): Record<string, string> {
	return value === undefined ? {} : { [name]: value };
}

function enumField(name: string, value: string): Record<string, string> {
	return ZERO_ENUMS.has(value) ? {} : { [name]: value };
}

function roomEndReason(room: RoomBundle['room']): string {
	return `ROOM_END_${room.endReason ?? 'UNKNOWN'}`;
}

function unixSeconds(date: Date): Long {
	return int64(Math.floor(date.getTime() / 1000));
}

function unixMs(date: Date): Long {
	return int64(date.getTime());
}

function unixNs(date: Date): Long {
	return int64(date.getTime()).multiply(1_000_000);
}

function participantInfo(p: ParticipantDoc): Record<string, unknown> {
	return {
		sid: p._id,
		identity: p.identity,
		...(p.name === '' ? {} : { name: p.name }),
		...enumField('kind', p.kind),
		...(p.kindDetails.length === 0 ? {} : { kind_details: p.kindDetails }),
		joined_at: unixSeconds(p.joinedAt),
		joined_at_ms: unixMs(p.joinedAt),
		permission: {
			...(p.permission.canSubscribe ? { can_subscribe: true } : {}),
			...(p.permission.canPublish ? { can_publish: true } : {}),
			...(p.permission.canPublishData ? { can_publish_data: true } : {}),
			...(p.permission.hidden ? { hidden: true } : {})
		},
		region: p.region
	};
}

function clientInfo(p: ParticipantDoc): Record<string, unknown> {
	const c = p.client;
	const fields: [string, string][] = [
		['sdk', c.sdk],
		['version', c.version],
		['os', c.os],
		['os_version', c.osVersion],
		['browser', c.browser],
		['browser_version', c.browserVersion],
		['device_model', c.deviceModel],
		['network', c.network]
	];

	return Object.fromEntries(fields.filter(([, value]) => value !== ''));
}

function trackType(t: TrackDoc): Record<string, string> {
	return enumField('type', t.type);
}

function trackLayers(layers: TrackDoc['codecs'][number]['layers']): Record<string, unknown>[] {
	return layers.map((l) => ({
		...enumField('quality', l.quality),
		width: l.width,
		height: l.height,
		bitrate: l.bitrate
	}));
}

function trackInfo(t: TrackDoc): Record<string, unknown> {
	const layers = t.codecs[0]?.layers ?? [];

	return {
		sid: t._id,
		...trackType(t),
		name: t.name,
		...(t.muted ? { muted: true } : {}),
		...(t.width > 0 ? { width: t.width, height: t.height } : {}),
		...(t.simulcast ? { simulcast: true } : {}),
		source: t.source,
		mime_type: t.mimeType,
		...(layers.length === 0 ? {} : { layers: trackLayers(layers) }),
		codecs: t.codecs.map((c) => ({
			mime_type: c.mimeType,
			...(c.layers.length === 0 ? {} : { layers: trackLayers(c.layers) })
		})),
		...(t.encryption === 'GCM' ? { encryption: 'GCM' } : {})
	};
}

function egressStatus(status: EgressDoc['status']): Record<string, string> {
	return enumField('status', `EGRESS_${status.toUpperCase()}`);
}

/**
 * The request of an egress as the writer stores it in `rawRequest` and in its events: the set member of the oneof under
 * its name.
 */
export function egressRawRequest(e: EgressDoc): Record<string, unknown> {
	const r = e.request as Partial<
		Record<'participantIdentity' | 'trackId' | 'videoTrackId' | 'audioTrackId', string>
	> & {
		preset?: string;
		layout?: string;
	};
	const options = { options: { preset: r.preset ?? 'H264_720P_30' } };
	const output = e.outputs[0];
	const outputs =
		output === undefined
			? {}
			: output.kind === 'file'
				? { file_outputs: [{ file_type: 'MP4', ...defined('filepath', output.filename) }] }
				: output.kind === 'stream'
					? { stream_outputs: [{ protocol: 'RTMP', urls: ['rtmps://stream.example.com/live/***'] }] }
					: { segment_outputs: [defined('playlist_name', output.playlistName)] };

	switch (e.type) {
		case 'room_composite':
			return { room_composite: { room_name: e.roomName, layout: r.layout ?? 'grid', ...options, ...outputs } };
		case 'web':
			return { web: { url: 'https://app.example.com/***', ...options, ...outputs } };
		case 'participant':
			return {
				participant: {
					room_name: e.roomName,
					...defined('identity', r.participantIdentity),
					...options,
					...outputs
				}
			};
		case 'track_composite':
			return {
				track_composite: {
					room_name: e.roomName,
					...defined('audio_track_id', r.audioTrackId),
					...defined('video_track_id', r.videoTrackId),
					...options,
					...outputs
				}
			};
		case 'track':
			return { track: { room_name: e.roomName, ...defined('track_id', r.trackId) } };
	}
}

function egressInfo(e: EgressDoc): Record<string, unknown> {
	return {
		egress_id: e._id,
		room_id: e.roomSid,
		room_name: e.roomName,
		...(e.sourceType === 'sdk' ? { source_type: 'EGRESS_SOURCE_TYPE_SDK' } : {}),
		started_at: unixNs(e.startedAt),
		request: egressRawRequest(e)
	};
}

function egressResults(e: EgressDoc): Record<string, unknown> {
	const files: Record<string, unknown>[] = [];
	const streams: Record<string, unknown>[] = [];
	const segments: Record<string, unknown>[] = [];

	for (const o of e.outputs) {
		const times = {
			started_at: unixNs(o.startedAt),
			...(o.endedAt === null ? {} : { ended_at: unixNs(o.endedAt) }),
			duration: int64(o.durationMs).multiply(1_000_000)
		};

		if (o.kind === 'file') {
			files.push({ ...defined('filename', o.filename), ...times, size: o.size, location: o.location });
		} else if (o.kind === 'stream') {
			streams.push({ url: 'rtmps://stream.example.com/live/***', status: o.status, ...times });
		} else {
			segments.push({
				...defined('playlist_name', o.playlistName),
				playlist_location: o.location,
				...times,
				size: o.size
			});
		}
	}

	return {
		...(files.length === 0 ? {} : { file_results: files }),
		...(streams.length === 0 ? {} : { stream_results: streams }),
		...(segments.length === 0 ? {} : { segment_results: segments })
	};
}

function ingressInfo(i: IngressDoc): Record<string, unknown> {
	return {
		ingress_id: i._id,
		name: i.name,
		url: i.url,
		...(i.inputType === 'rtmp' ? {} : { input_type: `${i.inputType.toUpperCase()}_INPUT` }),
		room_name: i.roomName,
		participant_identity: i.participantIdentity,
		participant_name: i.participantName,
		...(i.reusable ? { reusable: true } : {}),
		...(i.enabled ? { enabled: true } : {}),
		...(i.enableTranscoding ? { enable_transcoding: true } : {})
	};
}

export function deriveStats(rng: Rng, bundle: RoomBundle, windows: DeriveWindows, emit: (doc: StatsDoc) => void): void {
	const tracksById = new Map(bundle.tracks.map((t) => [t._id, t]));
	const tracksByParticipant = groupBy(bundle.tracks, (t) => t.participantSid);
	const subsBySubscriber = groupBy(
		bundle.subscriptions.filter((s) => s.status !== 'failed'),
		(s) => s.subscriberSid
	);
	const nodeId = bundle.room.nodeId;

	for (const p of bundle.participants) {
		if (p.status === 'aborted' || p.activeAt === null) {
			continue;
		}

		const meanScore = bundle.meanScores.get(p._id) ?? 4;
		const start = p.activeAt.getTime();
		const end = p.leftAt?.getTime() ?? windows.now;
		const tracks = tracksByParticipant.get(p._id) ?? [];
		const subs = subsBySubscriber.get(p._id) ?? [];
		const meta = { roomSid: p.roomSid, participantSid: p._id, nodeId };

		for (let ts = start + FLUSH_MS; ts <= end; ts += FLUSH_MS) {
			if (ts < windows.statsFrom) {
				continue;
			}

			const published = tracks.filter(
				(t) => t.publishedAt.getTime() <= ts && (t.unpublishedAt === null || t.unpublishedAt.getTime() >= ts)
			);
			const open = subs.filter(
				(s) => s.subscribedAt.getTime() <= ts && (s.unsubscribedAt === null || s.unsubscribedAt.getTime() >= ts)
			);

			if (windows.statsMode === 'track') {
				for (const t of published) {
					emit(
						sample(rng, new Date(ts), { ...meta, trackSid: t._id, kind: 'up' }, [t], meanScore, t.mimeType)
					);
				}

				for (const s of open) {
					const t = tracksById.get(s.trackSid);

					if (t !== undefined) {
						emit(
							sample(
								rng,
								new Date(ts),
								{ ...meta, trackSid: t._id, kind: 'down' },
								[[s, t]],
								meanScore,
								t.mimeType
							)
						);
					}
				}
			} else {
				if (published.length > 0) {
					emit(sample(rng, new Date(ts), { ...meta, kind: 'up' }, published, meanScore));
				}

				if (open.length > 0) {
					const pairs: [SubscriptionDoc, TrackDoc][] = [];

					for (const s of open) {
						const t = tracksById.get(s.trackSid);

						if (t !== undefined) {
							pairs.push([s, t]);
						}
					}

					emit(sample(rng, new Date(ts), { ...meta, kind: 'down' }, pairs, meanScore));
				}
			}
		}
	}
}

function sample(
	rng: Rng,
	ts: Date,
	meta: StatsDoc['meta'],
	sources: readonly (TrackDoc | [SubscriptionDoc, TrackDoc])[],
	meanScore: number,
	mimeType?: string
): StatsDoc {
	let bytes = 0;
	let frames = 0;
	const layers = new Map<number, { bytes: number; packets: number; frames: number }>();

	for (const source of sources) {
		const track = Array.isArray(source) ? source[1] : source;
		const bitrate = Array.isArray(source)
			? subscriptionBitrate(source[0].source, source[0].maxVideoQuality, trackBitrate(track))
			: trackBitrate(track);
		const flushBytes = (bitrate / 8) * (FLUSH_MS / 1000) * rng.float(0.85, 1.15);
		bytes += flushBytes;

		if (track.type === 'VIDEO') {
			const videoFrames = 30 * (FLUSH_MS / 1000);
			frames += videoFrames;
			const layerCount = Array.isArray(source) ? 1 : (track.codecs[0]?.layers.length ?? 1);

			for (let i = 0; i < layerCount; i += 1) {
				const layer = layers.get(i) ?? { bytes: 0, packets: 0, frames: 0 };
				layer.bytes += flushBytes / layerCount;
				layer.packets += Math.round(flushBytes / layerCount / 1_100);
				layer.frames += videoFrames / layerCount;
				layers.set(i, layer);
			}
		}
	}

	const packets = Math.round(bytes / 1_100);
	const score = round2(Math.min(4.5, Math.max(1, meanScore + rng.gaussian(0, 0.15))));

	return {
		ts,
		meta,
		score,
		minScore: round2(Math.max(1, score - rng.float(0, 0.4))),
		medianScore: score,
		bytes: int64(bytes),
		packets,
		packetsLost: Math.round(packets * rng.clampedGaussian(0.005, 0.006, 0, 0.08)),
		rttMs: Math.round(rng.clampedGaussian(90, 50, 5, 800)),
		jitterMs: Math.round(rng.clampedGaussian(12, 8, 1, 120)),
		nacks: rng.int(0, 3),
		plis: rng.chance(0.05) ? 1 : 0,
		firs: 0,
		frames: Math.round(frames),
		layers: [...layers.entries()].map(([layer, l]) => ({
			layer,
			bytes: int64(l.bytes),
			packets: l.packets,
			frames: Math.round(l.frames)
		})),
		...(mimeType === undefined ? {} : { mimeType })
	};
}

type Counter = Record<string, number>;

interface Bucket {
	rooms: {
		created: number;
		ended: number;
		endedByReason: Counter;
		participantsSum?: number;
		durationMsSum?: number;
	};
	participants: {
		joined: number;
		active: number;
		aborted: number;
		left: number;
		byKind: Counter;
		bySdk: Counter;
		byConnectionType: Counter;
		byOs: Counter;
		byBrowser: Counter;
		disconnectReasons: Counter;
		connectTimeSumMs: number;
		connectTimeCount: number;
		minutes: number;
	};
	tracks: { published: number; subscribed: number; subscribeFailed: number };
	egress: { started: number; endedByStatus: Counter; byType: Counter; durationMs: number };
	ingress: { sessionsStarted: number; sessionsEnded: number; byInputType: Counter; durationMs: number };
	bytes: { up: number; down: number };
	quality: { scoreSum: number; scoreCount: number; poor: number; lost: number };
	identities?: Set<string>;
}

interface FiveMinuteBucket {
	rooms: { created: number; ended: number };
	participants: { connected: number; joined: number; active: number; left: number; aborted: number };
	egress: { started: number; ended: number };
	bytes: { up: number; down: number };
	quality: { scoreSum: number; scoreCount: number; poor: number; lost: number };
}

export interface RollupDoc {
	_id: string;
	scope: string;
	bucket: Date;
	rooms: Bucket['rooms'];
	participants: Bucket['participants'];
	tracks: Bucket['tracks'];
	egress: Bucket['egress'];
	ingress: Bucket['ingress'];
	bytes: { up: Long; down: Long };
	quality: Bucket['quality'];
	uniqueIdentities?: number;
}

export interface FiveMinuteRollupDoc extends Omit<FiveMinuteBucket, 'bytes'> {
	_id: string;
	scope: string;
	bucket: Date;
	bytes: { up: Long; down: Long };
}

/** Rollups beyond the global hourly and daily documents. */
export interface RollupOptions {
	/** `analytics_5min` documents inside the 5-minute rollup window. */
	fiveMinute: boolean;
	/** `node:<nodeId>` documents beside `global` in every rollup collection. */
	nodes: boolean;
	/** `rooms.participantsSum` and `rooms.durationMsSum` at room end. */
	roomSums: boolean;
}

export const BASE_ROLLUPS: RollupOptions = { fiveMinute: false, nodes: false, roomSums: false };

const FIVE_MINUTES = 300_000;

type Update = (bucket: Bucket, daily: boolean) => void;
type FiveMinuteUpdate = (bucket: FiveMinuteBucket) => void;

/** Accumulates the hourly, daily and (optionally) five-minute rollups of every bundle it receives. */
export class Rollups {
	private readonly hourly = new Map<string, Bucket>();
	private readonly daily = new Map<string, Bucket>();
	private readonly fiveMinute = new Map<string, FiveMinuteBucket>();
	private scopes: string[] = ['global'];
	private fiveMinuteFrom = Number.POSITIVE_INFINITY;

	constructor(private readonly options: RollupOptions = BASE_ROLLUPS) {}

	add(bundle: RoomBundle, windows: DeriveWindows): void {
		const { room } = bundle;

		this.scopes = this.options.nodes ? ['global', `node:${room.nodeId}`] : ['global'];
		this.fiveMinuteFrom = windows.fiveMinuteFrom;
		this.at(
			room.createdAt,
			(b) => {
				b.rooms.created += 1;
			},
			(f) => {
				f.rooms.created += 1;
			}
		);
		this.at(
			room.endedAt,
			(b) => {
				b.rooms.ended += 1;
				inc(b.rooms.endedByReason, room.endReason ?? 'UNKNOWN');

				if (this.options.roomSums) {
					b.rooms.participantsSum = (b.rooms.participantsSum ?? 0) + bundle.room.participants.sessions;
					b.rooms.durationMsSum = (b.rooms.durationMsSum ?? 0) + (room.durationMs ?? 0);
				}
			},
			(f) => {
				f.rooms.ended += 1;
			}
		);

		for (const p of bundle.participants) {
			this.addParticipant(p, bundle, windows);
		}

		for (const t of bundle.tracks) {
			this.at(t.publishedAt, (b) => {
				b.tracks.published += 1;
			});
		}

		for (const s of bundle.subscriptions) {
			this.at(s.subscribedAt, (b) => {
				if (s.status === 'failed') {
					b.tracks.subscribeFailed += 1;
				} else {
					b.tracks.subscribed += 1;
				}
			});
		}

		for (const e of bundle.egresses) {
			this.at(
				e.startedAt,
				(b) => {
					b.egress.started += 1;
					inc(b.egress.byType, e.type);
				},
				(f) => {
					f.egress.started += 1;
				}
			);
			this.at(
				e.endedAt,
				(b) => {
					inc(b.egress.endedByStatus, e.status);
					b.egress.durationMs += e.durationMs ?? 0;
				},
				(f) => {
					f.egress.ended += 1;
				}
			);
		}

		for (const s of bundle.ingressSessions) {
			this.at(s.startedAt, (b) => {
				b.ingress.sessionsStarted += 1;
				inc(b.ingress.byInputType, s.inputType);
			});
			this.at(s.endedAt, (b) => {
				b.ingress.sessionsEnded += 1;
				b.ingress.durationMs += s.durationMs ?? 0;
			});
		}
	}

	hourlyDocs(): RollupDoc[] {
		return sortedEntries(this.hourly).map(([scope, bucket, b]) => toDoc(scope, bucket, b, false));
	}

	dailyDocs(): RollupDoc[] {
		return sortedEntries(this.daily).map(([scope, bucket, b]) => toDoc(scope, bucket, b, true));
	}

	fiveMinuteDocs(): FiveMinuteRollupDoc[] {
		return sortedEntries(this.fiveMinute).map(([scope, bucket, b]) => {
			const date = new Date(bucket);

			return {
				_id: `${scope}:${date.toISOString().replace('.000Z', 'Z')}`,
				scope,
				bucket: date,
				...b,
				bytes: { up: int64(b.bytes.up), down: int64(b.bytes.down) },
				quality: { ...b.quality, scoreSum: round2(b.quality.scoreSum) }
			};
		});
	}

	private addParticipant(p: ParticipantDoc, bundle: RoomBundle, windows: DeriveWindows): void {
		if (p.kind !== 'STANDARD') {
			this.at(p.joinedAt, (b) => {
				inc(b.participants.byKind, p.kind);
			});
			this.addTraffic(p, bundle, windows);

			return;
		}

		this.at(
			p.joinedAt,
			(b, daily) => {
				b.participants.joined += 1;
				inc(b.participants.byKind, p.kind);
				inc(b.participants.bySdk, p.client.sdk || 'UNKNOWN');
				inc(b.participants.byOs, p.client.os || 'UNKNOWN');
				inc(b.participants.byBrowser, browserKey(p.client.browser));

				if (daily) {
					(b.identities ??= new Set()).add(p.identity);
				}
			},
			(f) => {
				f.participants.joined += 1;
			}
		);
		this.at(
			p.activeAt,
			(b) => {
				b.participants.active += 1;
				inc(b.participants.byConnectionType, p.connectionType ?? 'UNKNOWN');
				b.participants.connectTimeSumMs += p.connectTimeMs ?? 0;
				b.participants.connectTimeCount += 1;
			},
			(f) => {
				f.participants.active += 1;
			}
		);
		this.at(
			p.leftAt,
			(b) => {
				if (p.status === 'aborted') {
					b.participants.aborted += 1;
				} else {
					b.participants.left += 1;
					b.participants.minutes += (p.durationMs ?? 0) / 60_000;
				}

				inc(b.participants.disconnectReasons, p.disconnectReason ?? 'UNKNOWN');
			},
			(f) => {
				if (p.status === 'aborted') {
					f.participants.aborted += 1;
				} else {
					f.participants.left += 1;
				}
			}
		);

		this.addTraffic(p, bundle, windows);
	}

	/** Bytes and quality of every kind, as `track_stats` carries no participant kind. */
	private addTraffic(p: ParticipantDoc, bundle: RoomBundle, windows: DeriveWindows): void {
		if (p.status === 'aborted' || p.activeAt === null) {
			return;
		}

		// Bytes and quality are spread over the time the session was connected, as stats flushes would do.
		const start = p.activeAt.getTime();
		const end = p.leftAt?.getTime() ?? windows.now;
		const total = Math.max(1, end - start);
		const meanScore = bundle.meanScores.get(p._id) ?? 4;
		const directions = (p.tracks.published > 0 ? 1 : 0) + (p.tracks.subscribed > 0 ? 1 : 0);
		const spread = (slot: number, size: number, apply: (share: number, flushes: number) => void) => {
			const overlap = Math.min(end, slot + size) - Math.max(start, slot);

			apply(overlap / total, Math.floor(overlap / FLUSH_MS) * directions);
		};
		const addQuality = (quality: Bucket['quality'], flushes: number) => {
			quality.scoreSum += meanScore * flushes;
			quality.scoreCount += flushes;
			quality.poor += meanScore < POOR_SCORE && meanScore >= LOST_SCORE ? flushes : 0;
			quality.lost += meanScore < LOST_SCORE ? flushes : 0;
		};

		for (let hour = Math.floor(start / HOUR) * HOUR; hour < end; hour += HOUR) {
			spread(hour, HOUR, (share, flushes) => {
				this.at(new Date(hour), (b) => {
					b.bytes.up += p.bytes.up.toNumber() * share;
					b.bytes.down += p.bytes.down.toNumber() * share;
					addQuality(b.quality, flushes);
				});
			});
		}

		if (!this.options.fiveMinute) {
			return;
		}

		for (let slot = Math.floor(start / FIVE_MINUTES) * FIVE_MINUTES; slot < end; slot += FIVE_MINUTES) {
			spread(slot, FIVE_MINUTES, (share, flushes) => {
				this.atFiveMinutes(slot, (f) => {
					f.participants.connected += 1;
					f.bytes.up += p.bytes.up.toNumber() * share;
					f.bytes.down += p.bytes.down.toNumber() * share;
					addQuality(f.quality, flushes);
				});
			});
		}
	}

	private at(ts: Date | null, update: Update, fiveMinute?: FiveMinuteUpdate): void {
		if (ts === null) {
			return;
		}

		const ms = ts.getTime();

		for (const scope of this.scopes) {
			update(getOrCreate(this.hourly, scope, Math.floor(ms / HOUR) * HOUR, this.options.roomSums), false);
			update(getOrCreate(this.daily, scope, Math.floor(ms / DAY) * DAY, this.options.roomSums), true);
		}

		if (fiveMinute !== undefined) {
			this.atFiveMinutes(ms, fiveMinute);
		}
	}

	private atFiveMinutes(ms: number, update: FiveMinuteUpdate): void {
		if (!this.options.fiveMinute || ms < this.fiveMinuteFrom) {
			return;
		}

		const bucket = Math.floor(ms / FIVE_MINUTES) * FIVE_MINUTES;

		for (const scope of this.scopes) {
			const key = `${scope}|${String(bucket)}`;
			let five = this.fiveMinute.get(key);

			if (five === undefined) {
				five = {
					rooms: { created: 0, ended: 0 },
					participants: { connected: 0, joined: 0, active: 0, left: 0, aborted: 0 },
					egress: { started: 0, ended: 0 },
					bytes: { up: 0, down: 0 },
					quality: { scoreSum: 0, scoreCount: 0, poor: 0, lost: 0 }
				};
				this.fiveMinute.set(key, five);
			}

			update(five);
		}
	}
}

/** `[scope, bucket, value]` of a map keyed by `<scope>|<bucket>`, by scope then bucket. */
function sortedEntries<T>(map: Map<string, T>): [string, number, T][] {
	return [...map.entries()]
		.map(([key, value]): [string, number, T] => {
			const separator = key.lastIndexOf('|');

			return [key.slice(0, separator), Number(key.slice(separator + 1)), value];
		})
		.sort((a, b) => a[0].localeCompare(b[0]) || a[1] - b[1]);
}

function getOrCreate(map: Map<string, Bucket>, scope: string, bucketStart: number, roomSums: boolean): Bucket {
	const key = `${scope}|${String(bucketStart)}`;
	let bucket = map.get(key);

	if (bucket === undefined) {
		bucket = {
			rooms: {
				created: 0,
				ended: 0,
				endedByReason: {},
				...(roomSums ? { participantsSum: 0, durationMsSum: 0 } : {})
			},
			participants: {
				joined: 0,
				active: 0,
				aborted: 0,
				left: 0,
				byKind: {},
				bySdk: {},
				byConnectionType: {},
				byOs: {},
				byBrowser: {},
				disconnectReasons: {},
				connectTimeSumMs: 0,
				connectTimeCount: 0,
				minutes: 0
			},
			tracks: { published: 0, subscribed: 0, subscribeFailed: 0 },
			egress: { started: 0, endedByStatus: {}, byType: {}, durationMs: 0 },
			ingress: { sessionsStarted: 0, sessionsEnded: 0, byInputType: {}, durationMs: 0 },
			bytes: { up: 0, down: 0 },
			quality: { scoreSum: 0, scoreCount: 0, poor: 0, lost: 0 }
		};
		map.set(key, bucket);
	}

	return bucket;
}

function toDoc(scope: string, bucket: number, b: Bucket, daily: boolean): RollupDoc {
	const date = new Date(bucket);

	return {
		_id: `${scope}:${date.toISOString().replace('.000Z', 'Z')}`,
		scope,
		bucket: date,
		rooms: b.rooms,
		participants: { ...b.participants, minutes: round2(b.participants.minutes) },
		tracks: b.tracks,
		egress: b.egress,
		ingress: b.ingress,
		bytes: { up: int64(b.bytes.up), down: int64(b.bytes.down) },
		quality: { ...b.quality, scoreSum: round2(b.quality.scoreSum) },
		...(daily ? { uniqueIdentities: b.identities?.size ?? 0 } : {})
	};
}

const BROWSER_KEYS = new Set(['chrome', 'firefox', 'safari', 'edge']);

/** Rollup key of a client browser: the lower-case name of a known browser, else `other`. */
function browserKey(browser: string): string {
	const key = browser.toLowerCase();

	return BROWSER_KEYS.has(key) ? key : 'other';
}

function inc(counter: Counter, key: string): void {
	counter[key] = (counter[key] ?? 0) + 1;
}

function groupBy<T>(items: readonly T[], key: (item: T) => string): Map<string, T[]> {
	const map = new Map<string, T[]>();

	for (const item of items) {
		const k = key(item);
		const list = map.get(k);

		if (list === undefined) {
			map.set(k, [item]);
		} else {
			list.push(item);
		}
	}

	return map;
}

function round2(value: number): number {
	return Math.round(value * 100) / 100;
}
