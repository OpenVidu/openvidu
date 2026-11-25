import { MongoClient } from 'mongodb';
import { flag, parseCli, requireString } from './args.js';
import { CLI_OPTIONS, generateOptions, writeLive } from './cli.js';
import { generate } from './generator.js';
import { LiveWriter } from './live.js';

function formatInt(value: number): string {
	return value.toLocaleString('en-US');
}

async function main(): Promise<void> {
	const values = parseCli(CLI_OPTIONS);
	const uri = requireString(values, 'uri');
	const dbName = requireString(values, 'db');
	const client = new MongoClient(uri);
	await client.connect();

	try {
		const db = client.db(dbName);

		if (flag(values, 'drop')) {
			await db.dropDatabase();
			console.log(`Dropped database ${dbName}`);
		}

		const summary = await generate(db, {
			...generateOptions(values),
			log: (line) => {
				console.log(line);
			}
		});

		console.log('\nSummary');

		for (const [collection, count] of Object.entries(summary.counts).sort((a, b) => b[1] - a[1])) {
			console.log(`  ${collection.padEnd(20)} ${formatInt(count).padStart(12)}`);
		}

		console.log(`  ${'total'.padEnd(20)} ${formatInt(summary.inserted).padStart(12)}`);
		console.log(
			`Elapsed ${summary.elapsedSeconds.toFixed(1)} s, ` +
				`${formatInt(Math.round(summary.inserted / Math.max(summary.elapsedSeconds, 0.001)))} inserts/s`
		);

		if (flag(values, 'live')) {
			await writeLive(new LiveWriter(db, summary.world), summary.world);
		}
	} finally {
		await client.close();
	}
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
