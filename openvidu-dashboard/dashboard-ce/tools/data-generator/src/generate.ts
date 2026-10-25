import { MongoClient } from 'mongodb';
import { flag, intOption, parseCli, requireString, stringOption } from './args.js';
import type { StatsMode } from './derive.js';
import { generate } from './generator.js';
import { SCENARIOS, type ScenarioName } from './model.js';

function parseScenario(value: string): ScenarioName {
	if (value in SCENARIOS) {
		return value as ScenarioName;
	}

	throw new Error(`Unknown scenario ${value}; expected S, M or L`);
}

function parseStatsMode(value: string): StatsMode {
	if (value === 'participant' || value === 'track') {
		return value;
	}

	throw new Error(`Unknown stats mode ${value}; expected participant or track`);
}

function formatInt(value: number): string {
	return value.toLocaleString('en-US');
}

async function main(): Promise<void> {
	const values = parseCli({
		uri: { type: 'string' },
		db: { type: 'string' },
		scenario: { type: 'string' },
		days: { type: 'string' },
		'stats-mode': { type: 'string' },
		seed: { type: 'string' },
		'retention-events-days': { type: 'string' },
		'retention-stats-days': { type: 'string' },
		'retention-tracks-days': { type: 'string' },
		'retention-entities-days': { type: 'string' },
		'retention-rollups-5min-days': { type: 'string' },
		drop: { type: 'boolean' },
		'plain-stats': { type: 'boolean' },
		'five-minute-rollups': { type: 'boolean' },
		'node-rollups': { type: 'boolean' },
		'room-sums': { type: 'boolean' },
		'active-window': { type: 'string' },
		'min-active-rooms': { type: 'string' }
	});
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
			scenario: parseScenario(requireString(values, 'scenario')),
			days: intOption(values, 'days', 0),
			statsMode: parseStatsMode(stringOption(values, 'stats-mode', 'participant')),
			seed: intOption(values, 'seed', 1),
			retentionDays: {
				events: intOption(values, 'retention-events-days', 7),
				stats: intOption(values, 'retention-stats-days', 7),
				tracks: intOption(values, 'retention-tracks-days', 7),
				entities: intOption(values, 'retention-entities-days', 90),
				rollups5Min: intOption(values, 'retention-rollups-5min-days', 7)
			},
			timeseries: !flag(values, 'plain-stats'),
			rollups: {
				fiveMinute: flag(values, 'five-minute-rollups'),
				nodes: flag(values, 'node-rollups'),
				roomSums: flag(values, 'room-sums')
			},
			...(values['active-window'] === undefined
				? {}
				: { activeWindowMinutes: intOption(values, 'active-window', 60) }),
			...(values['min-active-rooms'] === undefined
				? {}
				: { minActiveRooms: intOption(values, 'min-active-rooms', 0) }),
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
	} finally {
		await client.close();
	}
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
