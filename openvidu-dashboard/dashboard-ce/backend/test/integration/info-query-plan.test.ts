import { generate } from '@openvidu-dashboard/data-generator/generator';
import { Collection } from '@openvidu-dashboard/typings';
import { type Db, MongoClient } from 'mongodb';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';

import { oldestQuery } from '../../src/info/info-service.js';
import { expectIndexBacked } from '../support/query-plan.js';

/** The oldest-document query of every collection About dates, explained on a generated database. */

const mongoUri = inject('mongoUri');
const DATABASE = 'dashboard_test_info_plan';

const DATED = [
	Collection.ROOMS,
	Collection.PARTICIPANTS,
	Collection.EGRESSES,
	Collection.INGRESSES,
	Collection.INGRESS_SESSIONS,
	Collection.EVENTS,
	Collection.ANALYTICS_5MIN,
	Collection.ANALYTICS_HOURLY,
	Collection.ANALYTICS_DAILY
];

describe.skipIf(mongoUri === '')('info oldest-document queries', () => {
	let client: MongoClient;
	let db: Db;

	beforeAll(async () => {
		client = new MongoClient(mongoUri);
		db = client.db(DATABASE);
		await db.dropDatabase();
		await generate(db, {
			scenario: 'S',
			days: 1,
			statsMode: 'participant',
			seed: 1,
			retentionDays: { events: 7, stats: 7, tracks: 7, entities: 90 },
			timeseries: true,
			rollups: { fiveMinute: true, nodes: true, roomSums: true },
			mediaNodes: true
		});
	}, 600_000);

	afterAll(async () => {
		await db.dropDatabase();
		await client.close();
	});

	it.each(DATED)('%s reads one document through an index', async (name) => {
		const query = oldestQuery(db, name);

		if (query === null) {
			throw new Error(`${name} has no oldest-document query`);
		}

		await expectIndexBacked(db, query.cursor.clone(), { maxDocsExamined: 1, collscanThreshold: 0 });

		const [oldest] = await query.cursor.toArray();

		expect(oldest?.[query.field]).toBeInstanceOf(Date);
	});

	it('dates nodes by their first heartbeat without an index', async () => {
		const query = oldestQuery(db, Collection.NODES);

		if (query === null) {
			throw new Error('nodes has no oldest-document query');
		}

		expect(query.field).toBe('firstSeenAt');
		await expectIndexBacked(db, query.cursor.clone(), { maxDocsExamined: 10, collscanThreshold: 10 });
	});

	it('leaves tracks, subscriptions and stats undated', () => {
		expect(oldestQuery(db, Collection.TRACKS)).toBeNull();
		expect(oldestQuery(db, Collection.TRACK_SUBSCRIPTIONS)).toBeNull();
		expect(oldestQuery(db, Collection.TRACK_STATS)).toBeNull();
	});
});
