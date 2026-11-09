import { Rollups } from '@openvidu-dashboard/data-generator/derive';
import { Long } from 'mongodb';
import { describe, expect, it } from 'vitest';

type Bundle = Parameters<Rollups['add']>[0];
type Windows = Parameters<Rollups['add']>[1];

const at = (time: string) => new Date(`2026-10-12T${time}Z`);
const NOW = at('12:00:00');
const windows: Windows = {
	now: NOW.getTime(),
	eventsFrom: 0,
	statsFrom: 0,
	fiveMinuteFrom: 0,
	statsMode: 'participant'
};

/** A room of `mediaNode` from `start` to `end` with one STANDARD session for its whole life. */
function room(sid: string, start: Date, end: Date, mediaNode?: string): Bundle {
	const node = mediaNode === undefined ? {} : { mediaNode };

	return {
		room: {
			_id: sid,
			createdAt: start,
			endedAt: end,
			durationMs: end.getTime() - start.getTime(),
			endReason: 'API_DELETE',
			participants: { sessions: 1 },
			...node
		},
		participants: [
			{
				_id: `PA_${sid}`,
				identity: `user-${sid}`,
				kind: 'STANDARD',
				status: 'left',
				joinedAt: start,
				activeAt: start,
				leftAt: end,
				durationMs: end.getTime() - start.getTime(),
				disconnectReason: 'CLIENT_INITIATED',
				connectTimeMs: 300,
				connectionType: 'udp',
				client: { sdk: 'JS', os: 'linux', browser: 'Chrome' },
				tracks: { published: 0, subscribed: 0 },
				bytes: { up: Long.fromNumber(1000), down: Long.fromNumber(1000) },
				...node
			}
		],
		tracks: [],
		subscriptions: [],
		egresses: [],
		ingresses: [],
		ingressSessions: [],
		meanScores: new Map()
	} as unknown as Bundle;
}

function peaks(doc: { rooms: { peakActive?: number }; participants: { peakActive?: number } } | undefined) {
	return [doc?.rooms.peakActive, doc?.participants.peakActive];
}

describe('data generator peaks', () => {
	it('keeps the most rooms and sessions active at any minute of each bucket', () => {
		const rollups = new Rollups({ fiveMinute: true, nodes: false, roomSums: true });

		rollups.add(room('RM_a', at('10:00:00'), at('10:20:00')), windows);
		rollups.add(room('RM_b', at('10:10:00'), at('10:30:00')), windows);
		rollups.samplePeaks(windows, at('00:00:00').getTime(), new Map());

		const fiveMinutes = (time: string) =>
			rollups.fiveMinuteDocs().find((doc) => doc._id === `global:2026-10-12T${time}Z`);

		expect(peaks(fiveMinutes('10:05:00'))).toEqual([1, 1]);
		expect(peaks(fiveMinutes('10:10:00'))).toEqual([2, 2]);
		expect(peaks(fiveMinutes('10:15:00'))).toEqual([2, 2]);
		expect(peaks(fiveMinutes('10:20:00'))).toEqual([1, 1]);
		expect(peaks(fiveMinutes('10:25:00'))).toEqual([1, 1]);
		expect(peaks(fiveMinutes('10:30:00'))).toEqual([0, 0]);
		expect(peaks(rollups.hourlyDocs().find((doc) => doc._id === 'global:2026-10-12T10:00:00Z'))).toEqual([2, 2]);
		expect(peaks(rollups.dailyDocs().find((doc) => doc._id === 'global:2026-10-12T00:00:00Z'))).toEqual([2, 2]);
	});

	it('writes the global documents of idle buckets with the peaks only', () => {
		const rollups = new Rollups({ fiveMinute: true, nodes: false, roomSums: true });

		rollups.add(room('RM_a', at('10:00:00'), at('10:20:00')), windows);
		rollups.samplePeaks(windows, at('00:00:00').getTime(), new Map());

		const hourly = rollups.hourlyDocs();

		expect(hourly.map((doc) => doc._id)).toHaveLength(13);
		expect(hourly.find((doc) => doc._id === 'global:2026-10-12T11:00:00Z')).toEqual({
			_id: 'global:2026-10-12T11:00:00Z',
			scope: 'global',
			bucket: at('11:00:00'),
			rooms: { peakActive: 0 },
			participants: { peakActive: 0 }
		});
		expect(rollups.fiveMinuteDocs()).toHaveLength(145);
	});

	it('samples a media node while it holds an active entity or is alive', () => {
		const rollups = new Rollups({ fiveMinute: false, nodes: true, roomSums: true });

		rollups.add(room('RM_a', at('10:00:00'), at('10:20:00'), 'mn-a'), windows);
		rollups.samplePeaks(
			windows,
			at('09:00:00').getTime(),
			new Map([
				['mn-a', [[at('09:00:00').getTime(), at('10:40:00').getTime()]]],
				['mn-idle', [[at('09:30:00').getTime(), NOW.getTime()]]]
			])
		);

		const ids = rollups.hourlyDocs().map((doc) => doc._id);

		expect(ids.filter((id) => id.startsWith('node:mn-a:'))).toEqual([
			'node:mn-a:2026-10-12T09:00:00Z',
			'node:mn-a:2026-10-12T10:00:00Z'
		]);
		expect(ids.filter((id) => id.startsWith('node:mn-idle:'))).toHaveLength(4);
		expect(peaks(rollups.hourlyDocs().find((doc) => doc._id === 'node:mn-a:2026-10-12T10:00:00Z'))).toEqual([1, 1]);
		expect(peaks(rollups.hourlyDocs().find((doc) => doc._id === 'node:mn-idle:2026-10-12T11:00:00Z'))).toEqual([
			0, 0
		]);
	});
});
