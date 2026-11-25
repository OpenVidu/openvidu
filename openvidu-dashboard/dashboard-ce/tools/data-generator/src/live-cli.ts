import { MongoClient } from 'mongodb';
import { parseCli, requireString } from './args.js';
import { CLI_OPTIONS, generateOptions, writeLive } from './cli.js';
import { LiveWriter } from './live.js';
import { restartLive } from './restart.js';

const MINUTE = 60_000;

/**
 * Restarts the live writing of a kept database (`restartLive()`): the time since its last heartbeat is an outage, and
 * a new world, drawn from the seed and now, is written every 10 s until `SIGINT` or `SIGTERM`. It takes the options of
 * the generation; those of the generation alone (`--days`, `--drop`, `--active-window`…) have no effect.
 */
async function main(): Promise<void> {
	const values = parseCli(CLI_OPTIONS);
	const client = new MongoClient(requireString(values, 'uri'));
	await client.connect();

	try {
		const db = client.db(requireString(values, 'db'));
		const world = await restartLive(db, generateOptions(values), Math.floor(Date.now() / MINUTE) * MINUTE);
		console.log(`Restarted live writing at ${new Date(world.start).toISOString()}`);
		await writeLive(new LiveWriter(db, world), world);
	} finally {
		await client.close();
	}
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
