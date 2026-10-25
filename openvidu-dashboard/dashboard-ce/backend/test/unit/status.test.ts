import { describe, expect, it } from 'vitest';

import { staleFlag, writerBatchInterval } from '../../src/status/freshness.js';
import { foldWriter } from '../../src/status/status-service.js';

const NOW = new Date('2026-10-13T12:00:00.000Z');
const seen = (secondsAgo: number, batchIntervalMs?: number) => ({
	lastSeenAt: new Date(NOW.getTime() - secondsAgo * 1000),
	...(batchIntervalMs === undefined ? {} : { batchIntervalMs })
});

describe('writer status', () => {
	it('takes the newest batch and counts the nodes seen within 30 s', () => {
		expect(foldWriter([seen(50), seen(4), seen(30)], NOW)).toEqual({
			lastSeenAt: '2026-10-13T11:59:56.000Z',
			nodes: 3,
			aliveNodes: 2
		});
	});

	it('reports no batch without nodes', () => {
		expect(foldWriter([], NOW)).toEqual({ nodes: 0, aliveNodes: 0 });
	});

	it('judges each node by its own interval and reports the largest one', () => {
		expect(foldWriter([seen(80, 60_000), seen(40, 10_000)], NOW)).toMatchObject({
			aliveNodes: 1,
			batchIntervalMs: 60_000
		});
	});
});

describe('writer batch interval', () => {
	it('takes the largest interval of the nodes seen in the last hour', () => {
		expect(writerBatchInterval([seen(5, 10_000), seen(20 * 60, 30_000), seen(2 * 3600, 60_000)], NOW)).toBe(30_000);
	});

	it('is undefined when no node reports one', () => {
		expect(writerBatchInterval([seen(25)], NOW)).toBeUndefined();
	});
});

describe('stale flag', () => {
	const at = (secondsAgo: number) => new Date(NOW.getTime() - secondsAgo * 1000);

	it('marks an active entity whose last stats flush is older than the window', () => {
		expect(staleFlag('active', at(100), 90_000, NOW)).toBe(true);
		expect(staleFlag('active', at(100), 135_000, NOW)).toBeUndefined();
	});

	it('never marks a closed entity or one without stats', () => {
		expect(staleFlag('closed', at(7200), 90_000, NOW)).toBeUndefined();
		expect(staleFlag('active', undefined, 90_000, NOW)).toBeUndefined();
	});
});
