import type { Db, Document } from 'mongodb';
import { describe, expect, it } from 'vitest';

import { StatsModeReader } from '../../src/stats/stats-mode.js';

describe('stats mode', () => {
	function reader(document: Document | null) {
		let reads = 0;
		const db = {
			collection: () => ({
				findOne: () => {
					reads += 1;

					return Promise.resolve(document);
				}
			})
		} as unknown as Db;

		return { reader: new StatsModeReader(db, () => new Date('2026-10-13T12:00:00Z')), reads: () => reads };
	}

	it('reads the recorded mode once a minute and defaults to participant', async () => {
		const track = reader({ _id: 'config', statsDetail: 'track' });

		expect(await track.reader.read()).toBe('track');
		expect(await track.reader.read()).toBe('track');
		expect(track.reads()).toBe(1);
		expect(await reader({ _id: 'config', statsDetail: 'participant' }).reader.read()).toBe('participant');
		expect(await reader(null).reader.read()).toBe('participant');
	});

	it('takes the mode of a config document read by GET /info', async () => {
		const absent = reader(null);

		absent.reader.remember({ statsDetail: 'track' });
		expect(await absent.reader.read()).toBe('track');
		expect(absent.reads()).toBe(0);
	});
});
