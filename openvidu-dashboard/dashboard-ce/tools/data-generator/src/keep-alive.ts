import { setTimeout as sleep } from 'node:timers/promises';

import { MongoClient } from 'mongodb';
import { intOption, parseCli, requireString } from './args.js';
import { BATCH_INTERVAL_MS, COLLECTIONS } from './schema.js';

/**
 * Keeps a generated database live while a local demo runs: every interval, the node heartbeats and the stats time of
 * the active rooms and sessions move to now, as a running server would keep them.
 */
async function main(): Promise<void> {
	const values = parseCli({ uri: { type: 'string' }, db: { type: 'string' }, interval: { type: 'string' } });
	const intervalMs = intOption(values, 'interval', 15) * 1000;
	const client = new MongoClient(requireString(values, 'uri'));
	const db = client.db(requireString(values, 'db'));
	const stop = new AbortController();

	for (const signal of ['SIGINT', 'SIGTERM'] as const) {
		process.once(signal, () => {
			stop.abort();
		});
	}

	await client.connect();

	try {
		while (!stop.signal.aborted) {
			const now = new Date();

			await db
				.collection(COLLECTIONS.nodes)
				.updateMany({}, { $set: { lastSeenAt: now, batchIntervalMs: BATCH_INTERVAL_MS } });
			await db.collection(COLLECTIONS.rooms).updateMany({ status: 'active' }, { $set: { lastStatsAt: now } });
			await db
				.collection(COLLECTIONS.participants)
				.updateMany({ status: 'active' }, { $set: { lastStatsAt: now } });
			await sleep(intervalMs, undefined, { signal: stop.signal }).catch(() => undefined);
		}
	} finally {
		await client.close();
	}
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
