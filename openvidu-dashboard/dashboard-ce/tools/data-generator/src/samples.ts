import {
	int64,
	subscriptionBitrate,
	trackBitrate,
	type ParticipantDoc,
	type RoomBundle,
	type RtpStats,
	type SubscriptionDoc,
	type TrackDoc
} from './model.js';
import { Rng } from './random.js';

/** Stats flush period of the server (`telemetryStatsUpdateInterval`). */
export const FLUSH_MS = 30_000;
/** MOS thresholds of the writer's quality bands: below `POOR_SCORE` a sample is poor, below `LOST_SCORE` lost. */
export const POOR_SCORE = 2.06;
export const LOST_SCORE = 1.25;
/** Bytes of the signal channel a connected participant flushes each period, counted for the participant only. */
export const SIGNAL_BYTES = { up: 300, down: 900 } as const;

/**
 * The stat the server flushes for one track of one participant in one period: its own published track (`up`) or a
 * track it receives (`down`). A track that sent or received nothing in the period, muted or not yet published, has
 * none.
 */
export interface TrackSample {
	ts: number;
	kind: 'up' | 'down';
	trackSid: string;
	mimeType: string;
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
	layers: { layer: number; bytes: number; packets: number }[];
}

/** What a participant flushed in one period, as the writer adds it to the participant, its room and the rollups. */
export interface FlushTraffic {
	ts: number;
	/** Media bytes of the `track_stats` documents, by direction. */
	up: number;
	down: number;
	/** The scores of the `track_stats` documents written for the period. */
	scores: number[];
}

/** How the server measures media: Pion counts padding and keeps the highest jitter and RTT of the period; mediasoup's
 * producer and consumer counters have no padding and report the jitter and RTT of the reading. */
export type Engine = 'pion' | 'mediasoup';

/** The media of a room that its participants' samples are drawn from. */
export class RoomMedia {
	private readonly tracksByParticipant = new Map<string, TrackDoc[]>();
	private readonly subsBySubscriber = new Map<string, SubscriptionDoc[]>();
	private readonly tracksById = new Map<string, TrackDoc>();
	private readonly muted = new Map<string, [number, number][]>();
	private readonly degraded: boolean;

	constructor(
		private readonly bundle: RoomBundle,
		private readonly engine: Engine,
		private readonly now: number
	) {
		for (const t of bundle.tracks) {
			this.tracksById.set(t._id, t);
			this.tracksByParticipant.set(t.participantSid, [
				...(this.tracksByParticipant.get(t.participantSid) ?? []),
				t
			]);
			this.muted.set(t._id, mutedSpans(t));
		}

		for (const s of bundle.subscriptions) {
			if (s.status !== 'failed') {
				this.subsBySubscriber.set(s.subscriberSid, [...(this.subsBySubscriber.get(s.subscriberSid) ?? []), s]);
			}
		}

		// A few rooms gather on a bad network: a venue, a region with poor connectivity.
		this.degraded = hashRng(`${bundle.room._id}|room`).chance(0.03);
	}

	/** Flush instants of a session that was connected, from its first flush after it became active. */
	flushes(p: ParticipantDoc): number[] {
		if (p.activeAt === null || p.status === 'aborted') {
			return [];
		}

		const start = p.activeAt.getTime();
		const end = p.leftAt?.getTime() ?? this.now;
		const instants: number[] = [];

		for (let ts = start + FLUSH_MS; ts <= end; ts += FLUSH_MS) {
			instants.push(ts);
		}

		return instants;
	}

	/** The track samples of a participant at one flush, its published tracks first. */
	samples(p: ParticipantDoc, ts: number): TrackSample[] {
		const mean = this.meanScore(p);
		const samples: TrackSample[] = [];
		const from = ts - FLUSH_MS;

		for (const t of this.tracksByParticipant.get(p._id) ?? []) {
			const sending = this.sendingMs(
				t,
				from,
				ts,
				t.publishedAt.getTime(),
				t.unpublishedAt?.getTime() ?? this.now
			);

			if (sending > 0) {
				samples.push(this.sample(p, t, 'up', ts, sending, trackBitrate(t), mean, upLayers(t)));
			}
		}

		for (const s of this.subsBySubscriber.get(p._id) ?? []) {
			const t = this.tracksById.get(s.trackSid);

			if (t === undefined) {
				continue;
			}

			const end = s.unsubscribedAt?.getTime() ?? t.unpublishedAt?.getTime() ?? this.now;
			const receiving = this.sendingMs(t, from, ts, s.subscribedAt.getTime(), end);
			const bitrate = subscriptionBitrate(s.source, s.maxVideoQuality, trackBitrate(t));

			if (receiving > 0 && bitrate > 0) {
				samples.push(this.sample(p, t, 'down', ts, receiving, bitrate, mean, downLayers(t, s)));
			}
		}

		return samples;
	}

	/** Milliseconds of `[from, to]` a track was published within `[start, end]` and not muted. */
	private sendingMs(t: TrackDoc, from: number, to: number, start: number, end: number): number {
		const lo = Math.max(from, start);
		const hi = Math.min(to, end);

		if (hi <= lo) {
			return 0;
		}

		let ms = hi - lo;

		for (const [mutedFrom, mutedTo] of this.muted.get(t._id) ?? []) {
			ms -= Math.max(0, Math.min(hi, mutedTo) - Math.max(lo, mutedFrom));
		}

		return ms;
	}

	/** The mean score of a session: most connect from a good network, some from a fair one and a few from a bad one. */
	private meanScore(p: ParticipantDoc): number {
		const base = this.bundle.meanScores.get(p._id) ?? 4.2;
		const draw = hashRng(`${p._id}|network`).next();
		const network = draw < 0.05 ? 2.6 : draw < 0.15 ? 1.2 : 0;

		return base - network - (this.degraded ? 0.9 : 0);
	}

	private sample(
		p: ParticipantDoc,
		t: TrackDoc,
		kind: 'up' | 'down',
		ts: number,
		activeMs: number,
		bitrate: number,
		mean: number,
		layers: readonly { layer: number; share: number }[]
	): TrackSample {
		const rng = hashRng(`${p._id}|${t._id}|${kind}|${String(ts)}`);
		const video = t.type === 'VIDEO';
		// Now and then a sample dips: a burst of loss, a CPU spike.
		const dip = rng.chance(0.02) ? rng.float(1, 2.5) : 0;
		const score = round2(clamp(mean + rng.gaussian(0, 0.3) - dip, 1, 4.5));
		const quality = score < LOST_SCORE ? 3 : score < POOR_SCORE ? 2 : score < 3.5 ? 1 : 0;
		const media = (bitrate / 8) * (activeMs / 1000) * rng.float(0.85, 1.15);
		// Pion probes the downlink bandwidth of video subscribers with padding; mediasoup counts none.
		const padding =
			this.engine === 'pion' && kind === 'down' && video && rng.chance(0.15)
				? (bitrate / 8) * (FLUSH_MS / 1000) * rng.float(0.02, 0.1)
				: 0;
		const bytes = Math.round(media + padding);
		const packetSize = video ? 1_100 : 80;
		const packets = Math.round(media / packetSize) + Math.round(padding / 250);
		const lossShare = [0.002, 0.02, 0.06, 0.15][quality] ?? 0;
		const packetsLost = Math.round(packets * lossShare * rng.float(0.5, 1.5));
		const rttBase = [40, 110, 240, 450][quality] ?? 40;
		const jitterBase = (video ? [5, 14, 30, 60] : [2, 6, 15, 30])[quality] ?? 5;
		// Pion keeps the highest value of the period, mediasoup the one of the reading.
		const spread = this.engine === 'pion' ? rng.float(1, 1.6) : rng.float(0.8, 1.2);

		return {
			ts,
			kind,
			trackSid: t._id,
			mimeType: t.mimeType,
			score,
			minScore: round2(clamp(score - rng.float(0, 0.6), 1, score)),
			medianScore: round2(clamp(score + rng.float(-0.1, 0.1), 1, 4.5)),
			bytes,
			packets,
			packetsLost,
			rttMs: Math.round(rttBase * spread),
			jitterMs: round2(jitterBase * (this.engine === 'pion' ? rng.float(1, 1.6) : rng.float(0.8, 1.2))),
			nacks: video ? Math.round(packetsLost * rng.float(0.8, 1.6)) : 0,
			plis: video && rng.chance([0.02, 0.05, 0.2, 0.4][quality] ?? 0) ? 1 : 0,
			firs: 0,
			layers: layers.map(({ layer, share }) => ({
				layer,
				bytes: Math.round(media * share),
				packets: Math.round((media * share) / packetSize)
			}))
		};
	}
}

/** A `track_stats` document before its storage shape: a track's sample, or the merged samples of one direction. */
export type StatsSample = Omit<TrackSample, 'trackSid' | 'mimeType'> & { trackSid?: string; mimeType?: string };

/** The `track_stats` documents of one participant at one flush: one per track sample, or one per direction merged. */
export function statsDocuments(samples: readonly TrackSample[], mode: 'participant' | 'track'): StatsSample[] {
	if (mode === 'track') {
		return [...samples];
	}

	return (['up', 'down'] as const).flatMap((kind) => {
		const group = samples.filter((s) => s.kind === kind);

		return group.length === 0 ? [] : [merge(group)];
	});
}

/** The writer's merge of the samples of one direction: sums, the highest RTT and jitter, the mean of the scores. */
function merge(group: readonly TrackSample[]): Omit<TrackSample, 'trackSid' | 'mimeType'> {
	const layers = new Map<number, { bytes: number; packets: number }>();

	for (const s of group) {
		for (const l of s.layers) {
			const merged = layers.get(l.layer) ?? { bytes: 0, packets: 0 };
			merged.bytes += l.bytes;
			merged.packets += l.packets;
			layers.set(l.layer, merged);
		}
	}

	const sum = (pick: (s: TrackSample) => number) => group.reduce((total, s) => total + pick(s), 0);
	const medians = group.map((s) => s.medianScore).sort((a, b) => a - b);
	const middle = Math.floor(medians.length / 2);

	return {
		ts: group[0]?.ts ?? 0,
		kind: group[0]?.kind ?? 'up',
		score: round2(sum((s) => s.score) / group.length),
		minScore: Math.min(...group.map((s) => s.minScore)),
		medianScore:
			medians.length % 2 === 1
				? (medians[middle] ?? 0)
				: round2(((medians[middle - 1] ?? 0) + (medians[middle] ?? 0)) / 2),
		bytes: sum((s) => s.bytes),
		packets: sum((s) => s.packets),
		packetsLost: sum((s) => s.packetsLost),
		rttMs: Math.max(...group.map((s) => s.rttMs)),
		jitterMs: Math.max(...group.map((s) => s.jitterMs)),
		nacks: sum((s) => s.nacks),
		plis: sum((s) => s.plis),
		firs: sum((s) => s.firs),
		layers: [...layers.entries()]
			.sort((a, b) => a[0] - b[0])
			.map(([layer, l]) => ({ layer, bytes: l.bytes, packets: l.packets }))
	};
}

/** Spans a track was muted: from publication when it was published muted for good, else between its toggles. */
function mutedSpans(t: TrackDoc): [number, number][] {
	if (t.muted && t.muteChanges.length === 0) {
		return [[t.publishedAt.getTime(), Number.POSITIVE_INFINITY]];
	}

	const spans: [number, number][] = [];

	for (let i = 0; i < t.muteChanges.length; i += 2) {
		const muted = t.muteChanges[i];
		const unmuted = t.muteChanges[i + 1];

		if (muted !== undefined) {
			spans.push([muted.at.getTime(), unmuted?.at.getTime() ?? Number.POSITIVE_INFINITY]);
		}
	}

	return spans;
}

/** The simulcast layers a publisher sends, each with its share of the bytes. */
function upLayers(t: TrackDoc): { layer: number; share: number }[] {
	if (t.type !== 'VIDEO') {
		return [];
	}

	const layers = t.codecs[0]?.layers ?? [];
	const total = layers.reduce((sum, l) => sum + l.bitrate, 0);

	return layers.map((l, layer) => ({ layer, share: total === 0 ? 0 : l.bitrate / total }));
}

/** The one layer a subscriber receives, the quality it asked for. */
function downLayers(t: TrackDoc, s: SubscriptionDoc): { layer: number; share: number }[] {
	if (t.type !== 'VIDEO') {
		return [];
	}

	const layer = s.maxVideoQuality === 'LOW' ? 0 : s.maxVideoQuality === 'MEDIUM' ? 1 : 2;

	return [{ layer: t.simulcast ? layer : 0, share: 1 }];
}

/** A generator seeded by a key: the same key always draws the same values, whatever was generated before. */
export function hashRng(key: string): Rng {
	// FNV-1a.
	let hash = 0x811c9dc5;

	for (let i = 0; i < key.length; i += 1) {
		hash ^= key.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193);
	}

	return new Rng(hash >>> 0);
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function round2(value: number): number {
	return Math.round(value * 100) / 100;
}

/** The writer's quality accumulator: every score counts, below the bands as poor and lost. */
class Quality {
	sum = 0;
	count = 0;
	min: number | null = null;
	poor = 0;
	lost = 0;
	last: number | null = null;
	lastAt: number | null = null;

	add(score: number, at: number): void {
		if (score <= 0) {
			return;
		}

		this.sum += score;
		this.count += 1;
		this.min = this.min === null ? score : Math.min(this.min, score);
		this.poor += score < POOR_SCORE ? 1 : 0;
		this.lost += score < LOST_SCORE ? 1 : 0;

		if (this.lastAt === null || at >= this.lastAt) {
			this.last = score;
			this.lastAt = at;
		}
	}
}

interface StreamTotals {
	bytes: number;
	packets: number;
	packetsLost: number;
	nacks: number;
	plis: number;
	firs: number;
	jitterMaxMs: number;
	rttMaxMs: number;
	layers: Map<number, { bytes: number; packets: number }>;
}

/**
 * Sums the stats a room's participants flushed over their whole sessions into what the writer keeps: the bytes,
 * quality and `lastStatsAt` of each participant and of the room, the final publish and subscribe stats of each track
 * and subscription, and the traffic of each flush for the rollups (`bundle.traffic`). The `track_stats` documents
 * written inside the stats window are the same samples.
 */
export function applyStats(bundle: RoomBundle, engine: Engine, now: number, mode: 'participant' | 'track'): void {
	const media = new RoomMedia(bundle, engine, now);
	const traffic = new Map<string, FlushTraffic[]>();
	const roomQuality = new Quality();
	const tracks = new Map<string, StreamTotals>();
	const subscriptions = new Map<string, StreamTotals>();
	let roomUp = 0;
	let roomDown = 0;
	let roomStatsAt: number | null = null;

	for (const p of bundle.participants) {
		const flushes = media.flushes(p);
		const last = flushes.at(-1);
		// Signal statistics flow on every server, with or without media statistics.
		p.lastStatsAt = last === undefined ? null : new Date(last);
		roomStatsAt = last === undefined ? roomStatsAt : Math.max(roomStatsAt ?? 0, last);

		if (p.mediaStats === false) {
			traffic.set(
				p._id,
				flushes.map((ts) => ({ ts, up: 0, down: 0, scores: [] }))
			);
			continue;
		}

		const quality = new Quality();
		const flushed: FlushTraffic[] = [];
		let up = SIGNAL_BYTES.up * flushes.length;
		let down = SIGNAL_BYTES.down * flushes.length;

		for (const ts of flushes) {
			const samples = media.samples(p, ts);
			const entry: FlushTraffic = { ts, up: 0, down: 0, scores: [] };

			for (const doc of statsDocuments(samples, mode)) {
				entry[doc.kind] += doc.bytes;
				entry.scores.push(doc.score);
				quality.add(doc.score, ts);
				roomQuality.add(doc.score, ts);
			}

			for (const sample of samples) {
				const key = sample.kind === 'up' ? sample.trackSid : `${sample.trackSid}:${p._id}`;
				addTotals(sample.kind === 'up' ? tracks : subscriptions, key, sample);
			}

			up += entry.up;
			down += entry.down;
			roomUp += entry.up;
			roomDown += entry.down;
			flushed.push(entry);
		}

		traffic.set(p._id, flushed);
		p.bytes = { up: int64(up), down: int64(down) };
		p.quality = {
			scoreSum: round2(quality.sum),
			scoreCount: quality.count,
			minScore: quality.min,
			poor: quality.poor,
			lost: quality.lost,
			lastScore: quality.last,
			lastScoreAt: quality.lastAt === null ? null : new Date(quality.lastAt)
		};
	}

	const { room } = bundle;
	room.lastStatsAt = roomStatsAt === null ? null : new Date(roomStatsAt);

	if (room.mediaStats !== false) {
		room.bytes = { up: int64(roomUp), down: int64(roomDown) };
		room.quality = {
			scoreSum: round2(roomQuality.sum),
			scoreCount: roomQuality.count,
			minScore: roomQuality.min,
			poor: roomQuality.poor,
			lost: roomQuality.lost
		};
	}

	// The final stats come in TRACK_PUBLISH_STATS and TRACK_SUBSCRIBE_STATS as the track or subscription closes; what
	// the reconciler closed sends none.
	for (const t of bundle.tracks) {
		if (t.publishStats !== null) {
			t.publishStats = t.closedBy === 'reconciler' ? null : finalStats(t.publishStats, tracks.get(t._id), true);
		}
	}

	for (const s of bundle.subscriptions) {
		if (s.subscribeStats !== null && s.closedBy === 'reconciler') {
			s.subscribeStats = null;
		} else if (s.subscribeStats !== null) {
			const totals = finalStats({ ...s.subscribeStats, layers: [] }, subscriptions.get(s._id), false);
			s.subscribeStats = totals === null ? null : withoutLayers(totals);
		}
	}

	bundle.traffic = traffic;
}

function addTotals(map: Map<string, StreamTotals>, key: string, sample: TrackSample): void {
	let totals = map.get(key);

	if (totals === undefined) {
		totals = {
			bytes: 0,
			packets: 0,
			packetsLost: 0,
			nacks: 0,
			plis: 0,
			firs: 0,
			jitterMaxMs: 0,
			rttMaxMs: 0,
			layers: new Map()
		};
		map.set(key, totals);
	}

	totals.bytes += sample.bytes;
	totals.packets += sample.packets;
	totals.packetsLost += sample.packetsLost;
	totals.nacks += sample.nacks;
	totals.plis += sample.plis;
	totals.firs += sample.firs;
	totals.jitterMaxMs = Math.max(totals.jitterMaxMs, sample.jitterMs);
	totals.rttMaxMs = Math.max(totals.rttMaxMs, sample.rttMs);

	for (const l of sample.layers) {
		const layer = totals.layers.get(l.layer) ?? { bytes: 0, packets: 0 };
		layer.bytes += l.bytes;
		layer.packets += l.packets;
		totals.layers.set(l.layer, layer);
	}
}

/** The final stats of one layer of a stream: what one TRACK_PUBLISH_STATS or TRACK_SUBSCRIBE_STATS reports. */
export interface LayerStats {
	layer: number;
	bytes: number;
	packets: number;
	packetsLost: number;
	nacks: number;
	plis: number;
	firs: number;
}

/**
 * The final stats of a stream by layer, one per simulcast layer of a video track and one for the rest: the counters
 * shared by the bytes of each layer, so that they add up to the stream's.
 */
export function layerStats(stats: Omit<RtpStats, 'layers'> & { layers?: RtpStats['layers'] }): LayerStats[] {
	const layers = stats.layers ?? [];

	if (layers.length === 0) {
		return [
			{
				layer: 0,
				bytes: stats.bytes.toNumber(),
				packets: stats.packets,
				packetsLost: stats.packetsLost,
				nacks: stats.nacks,
				plis: stats.plis,
				firs: stats.firs
			}
		];
	}

	const total = layers.reduce((sum, l) => sum + l.bytes.toNumber(), 0);
	const split = (value: number, index: number): number => {
		const shares = layers.map((l) => (total === 0 ? 0 : Math.floor((value * l.bytes.toNumber()) / total)));
		const given = shares.reduce((sum, share) => sum + share, 0);

		return index === layers.length - 1 ? (shares[index] ?? 0) + value - given : (shares[index] ?? 0);
	};

	return layers.map((l, index) => ({
		layer: l.layer,
		bytes: l.bytes.toNumber(),
		packets: l.packets,
		packetsLost: split(stats.packetsLost, index),
		nacks: split(stats.nacks, index),
		plis: split(stats.plis, index),
		firs: split(stats.firs, index)
	}));
}

/** The final stats of a stream from the sum of its samples; none when it never sent a packet, as the server reports. */
function finalStats(stats: RtpStats, totals: StreamTotals | undefined, withLayers: boolean): RtpStats | null {
	if (totals === undefined || totals.packets === 0) {
		return null;
	}

	const layers =
		withLayers && totals.layers.size > 0
			? [...totals.layers.entries()]
					.sort((a, b) => a[0] - b[0])
					.map(([layer, l]) => ({ layer, bytes: int64(l.bytes), packets: l.packets }))
			: [];
	// The writer adds up the stats of the layers of a video track.
	const bytes = layers.length === 0 ? totals.bytes : layers.reduce((sum, l) => sum + l.bytes.toNumber(), 0);
	const packets = layers.length === 0 ? totals.packets : layers.reduce((sum, l) => sum + l.packets, 0);

	return {
		...stats,
		bytes: int64(bytes),
		packets,
		packetsLost: totals.packetsLost,
		packetLossPct: round2((totals.packetsLost / (packets + totals.packetsLost)) * 100),
		nacks: totals.nacks,
		plis: totals.plis,
		firs: totals.firs,
		jitterMaxMs: Math.round(totals.jitterMaxMs * 1000) / 1000,
		rttMaxMs: totals.rttMaxMs,
		layers
	};
}

function withoutLayers({ layers: _layers, ...stats }: RtpStats): Omit<RtpStats, 'layers'> {
	return stats;
}
