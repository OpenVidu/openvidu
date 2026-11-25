import { cutRoom, roomLife, type RoomLife } from '@openvidu-dashboard/data-generator/cut';
import {
	generateRoom,
	SCENARIOS,
	type GeneratorContext,
	type RoomBundle
} from '@openvidu-dashboard/data-generator/model';
import { Rng } from '@openvidu-dashboard/data-generator/random';
import { describe, expect, it } from 'vitest';

const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 12, 14, 0, 0);

function context(seed: number): GeneratorContext {
	return {
		rng: new Rng(seed),
		shapeRng: new Rng(seed + 1),
		ingressRng: new Rng(seed + 2),
		egressRng: new Rng(seed + 3),
		mediaRng: new Rng(seed + 4),
		apiRng: new Rng(seed + 5),
		scenario: SCENARIOS.S,
		now: NOW,
		windowStart: NOW - DAY,
		retentionEntitiesMs: 90 * DAY,
		retentionTracksMs: 7 * DAY,
		withoutMediaStats: new Set()
	};
}

/**
 * The lives of `count` rooms of one context, created `ago` before the generation instant, in progress at it or ended
 * before it.
 */
function lives(active: boolean, count: number, ago = 30 * MINUTE): RoomLife[] {
	const ctx = context(active ? 11 : 23);

	return Array.from({ length: count }, (_, index) =>
		roomLife(
			generateRoom(ctx, { index, createdAt: NOW - ago - index * MINUTE, active, hosts: [{ nodeId: 'ND_test' }] }),
			'pion',
			'track'
		)
	);
}

/** The first life that matches, so that each test reads a room with what it checks. */
function find(candidates: readonly RoomLife[], match: (bundle: RoomBundle) => boolean): RoomLife {
	const life = candidates.find((candidate) => match(candidate.bundle));

	if (life === undefined) {
		throw new Error('no generated room matches');
	}

	return life;
}

function cutAt(life: RoomLife, t: number): RoomBundle {
	const cut = cutRoom(life, t);

	if (cut === undefined) {
		throw new Error('room cut before its creation');
	}

	return cut;
}

const time = (at: Date | null | undefined) => at?.getTime() ?? Number.NaN;
const ACTIVE = lives(true, 400);
const CLOSED = lives(false, 60, 3 * HOUR);

describe('data generator cut', () => {
	it('cuts a closed room after its end into its life', () => {
		for (const life of CLOSED) {
			expect(cutAt(life, life.end)).toEqual(life.bundle);
			expect(cutAt(life, life.end + HOUR)).toBe(life.bundle);
		}
	});

	it('leaves out a room before its creation', () => {
		const [life] = CLOSED;

		expect(life === undefined ? 'none' : cutRoom(life, time(life.bundle.room.createdAt) - 1)).toBeUndefined();
	});

	it('writes nothing dated after the instant of the cut', () => {
		for (const life of ACTIVE.slice(0, 40)) {
			const cut = cutAt(life, NOW);
			const instants = [
				cut.room.createdAt,
				cut.room.lastStatsAt,
				cut.room.lastEventAt,
				...cut.participants.flatMap((p) => [
					p.joinedAt,
					p.activeAt,
					p.lastStatsAt,
					p.quality.lastScoreAt,
					...p.resumedAt
				]),
				...cut.tracks.flatMap((t) => [t.publishedAt, ...t.muteChanges.map((change) => change.at)]),
				...cut.subscriptions.map((s) => s.subscribedAt),
				...cut.egresses.flatMap((e) => [e.startedAt, e.updatedAt, ...e.statusHistory.map((h) => h.at)]),
				...cut.ingressSessions.map((s) => s.startedAt),
				...cut.ingresses.map((i) => i.createdAt),
				...cut.apiCalls.map((call) => call.at),
				...[...(cut.traffic?.values() ?? [])].flat().map((flush) => new Date(flush.ts))
			].flatMap((at) => (at === null ? [] : [at.getTime()]));

			expect(
				instants.filter((at) => at > NOW),
				cut.room.name
			).toEqual([]);
			expect(cut.room.status, cut.room.name).toBe('active');
			expect(cut.room.endedAt, cut.room.name).toBeNull();
		}
	});

	it('gives the sessions, tracks and subscriptions open at the instant their open state', () => {
		const life = find(ACTIVE, (b) =>
			b.subscriptions.some(
				(s) => s.status !== 'failed' && time(s.subscribedAt) <= NOW && time(s.unsubscribedAt) > NOW
			)
		);
		const cut = cutAt(life, NOW);
		const open = cut.participants.filter(
			(p) => time(life.bundle.participants.find((q) => q._id === p._id)?.leftAt) > NOW
		);

		expect(open.length).toBeGreaterThan(0);

		for (const p of open) {
			expect([p.leftAt, p.durationMs, p.disconnectReason, p.closedBy, p.expiresAt], p._id).toEqual([
				null,
				null,
				null,
				null,
				null
			]);
			expect(p.status, p._id).toBe(p.activeAt === null ? 'joining' : 'active');
			expect(p.trackSids, p._id).toEqual(cut.tracks.filter((t) => t.participantSid === p._id).map((t) => t._id));
			expect(p.tracks.subscribed, p._id).toBe(
				cut.subscriptions.filter((s) => s.subscriberSid === p._id && s.status !== 'failed').length
			);
		}

		for (const t of cut.tracks.filter((track) => track.unpublishedAt === null)) {
			expect([t.status, t.durationMs, t.closedBy, t.publishStats, t.expiresAt], t._id).toEqual([
				'published',
				null,
				null,
				null,
				null
			]);
			expect(t.subscribers.current, t._id).toBe(
				cut.subscriptions.filter((s) => s.trackSid === t._id && s.status === 'subscribed').length
			);
		}

		const subscribed = cut.subscriptions.filter((s) => s.status === 'subscribed');

		expect(subscribed.length).toBeGreaterThan(0);
		expect(subscribed.filter((s) => s.unsubscribedAt !== null || s.subscribeStats !== null)).toEqual([]);
		expect(cut.room.participants.active).toBe(
			cut.participants.filter((p) => p.kind === 'STANDARD' && p.status === 'active').length
		);
		expect(cut.room.participantSids).toEqual(cut.participants.map((p) => p._id));
	});

	it('keeps the mutes and resumes up to the instant', () => {
		const life = find(
			ACTIVE,
			(b) => b.tracks.some((t) => t.muteChanges.length >= 2) && b.participants.some((p) => p.resumedAt.length > 0)
		);
		const track = life.bundle.tracks.find((t) => t.muteChanges.length >= 2);
		const [muted, unmuted] = track?.muteChanges ?? [];
		const session = life.bundle.participants.find((p) => p.resumedAt.length > 0);
		const [resumed] = session?.resumedAt ?? [];
		const trackAt = (t: number) => cutAt(life, t).tracks.find((tr) => tr._id === track?._id);
		const sessionAt = (t: number) => cutAt(life, t).participants.find((p) => p._id === session?._id);

		expect(trackAt(time(muted?.at) - 1)).toMatchObject({ muted: false, muteChanges: [] });
		expect(trackAt(time(muted?.at))).toMatchObject({ muted: true, muteChanges: [muted] });
		expect(trackAt(time(unmuted?.at))).toMatchObject({ muted: false, muteChanges: [muted, unmuted] });
		expect(sessionAt(time(resumed) - 1)).toMatchObject({ resumes: 0, resumedAt: [] });
		expect(sessionAt(time(resumed))).toMatchObject({ resumes: 1, resumedAt: [resumed] });
	});

	it('sums the bytes and lastStatsAt of the stats flushed up to the instant', () => {
		const life = find(ACTIVE, (b) => b.participants.filter((p) => p.activeAt !== null).length >= 2);
		const t = NOW + 7 * MINUTE + 12_345;
		const cut = cutAt(life, t);
		let roomUp = 0;

		for (const p of cut.participants) {
			const flushed = (life.bundle.traffic?.get(p._id) ?? []).filter((flush) => flush.ts <= t);

			expect(cut.traffic?.get(p._id), p._id).toEqual(flushed);
			expect(time(p.lastStatsAt), p._id).toBe(flushed.at(-1)?.ts ?? Number.NaN);
			roomUp += flushed.reduce((sum, flush) => sum + flush.up, 0);
		}

		expect(cut.room.bytes.up.toNumber()).toBe(roomUp);
		expect(time(cut.room.lastStatsAt)).toBe(Math.max(...cut.participants.map((p) => time(p.lastStatsAt) || 0)));
	});

	it('takes the status of an egress at the instant from its history', () => {
		const stopped = (e: RoomBundle['egresses'][number]) =>
			e.roomSid !== null && e.statusHistory.some((h) => h.status === 'ending');
		const life = find(ACTIVE, (b) => b.egresses.some(stopped));
		const egress = life.bundle.egresses.find(stopped);
		const at = (status: string) => time(egress?.statusHistory.find((h) => h.status === status)?.at);
		const egressAt = (t: number) => cutAt(life, t).egresses.find((e) => e._id === egress?._id);

		expect(egressAt(at('active') - 1)).toMatchObject({ status: 'starting', outputs: [], endedAt: null });

		const recording = egressAt(at('active'));

		expect(recording).toMatchObject({ status: 'active', endedAt: null, durationMs: null, expiresAt: null });
		expect(recording?.outputs.length).toBe(egress?.outputs.length);
		expect(
			recording?.outputs.filter(
				(o) => o.size !== undefined || o.endedAt !== undefined || (o.kind === 'stream' && o.status !== 'ACTIVE')
			)
		).toEqual([]);
		expect(egressAt(at('ending'))?.status).toBe('ending');
		expect(egressAt(time(egress?.endedAt))).toEqual(egress);
	});

	it('shows an ingress session buffering until it publishes', () => {
		const life = find(ACTIVE, (b) =>
			b.ingressSessions.some((s) => time(s.publishedAt) - time(s.startedAt) >= MINUTE)
		);
		const session = life.bundle.ingressSessions.find((s) => time(s.publishedAt) - time(s.startedAt) >= MINUTE);
		const sessionAt = (t: number) => cutAt(life, t).ingressSessions.find((s) => s._id === session?._id);
		const ingressAt = (t: number) => cutAt(life, t).ingresses.find((i) => i._id === session?.ingressId);

		expect(sessionAt(time(session?.publishedAt) - 1)).toMatchObject({
			status: 'buffering',
			roomSid: null,
			video: null,
			audio: null,
			endedAt: null
		});
		expect(ingressAt(time(session?.publishedAt) - 1)).toMatchObject({ status: 'buffering', sessions: 1 });
		expect(sessionAt(time(session?.publishedAt))).toMatchObject({
			status: 'publishing',
			roomSid: life.bundle.room._id,
			endedAt: null
		});
		expect(ingressAt(time(session?.publishedAt))?.status).toBe('publishing');
		expect(sessionAt(time(session?.endedAt))).toEqual(session);
	});

	it('shows a session connecting until it is active or aborts', () => {
		const life = find(ACTIVE, (b) =>
			b.participants.some(
				(p) => time(p.joinedAt) <= NOW && (p.activeAt === null ? time(p.leftAt) : time(p.activeAt)) > NOW
			)
		);
		const session = life.bundle.participants.find(
			(p) => time(p.joinedAt) <= NOW && (p.activeAt === null ? time(p.leftAt) : time(p.activeAt)) > NOW
		);
		const cut = cutAt(life, NOW);
		const joining = cut.participants.find((p) => p._id === session?._id);

		expect(joining).toMatchObject({ status: 'joining', activeAt: null, connectTimeMs: null, lastStatsAt: null });
		expect(cut.room.participants.active).toBe(
			cut.participants.filter((p) => p.kind === 'STANDARD' && p.status === 'active').length
		);
		expect(cut.subscriptions.filter((s) => s.subscriberSid === session?._id)).toEqual([]);
	});
});
