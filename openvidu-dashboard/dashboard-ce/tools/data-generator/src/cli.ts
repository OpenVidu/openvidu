import { setTimeout as sleep } from 'node:timers/promises';

import { flag, intOption, type ParsedValues, requireString, stringOption } from './args.js';
import type { StatsMode } from './derive.js';
import type { GenerateOptions, World } from './generator.js';
import type { LiveWriter } from './live.js';
import { SCENARIOS, type ScenarioName } from './model.js';

/** The options of the `generate` and `live` scripts. */
export const CLI_OPTIONS = {
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
	'min-active-rooms': { type: 'string' },
	'nodes-without-media-stats': { type: 'string' },
	'media-nodes': { type: 'boolean' },
	legacy: { type: 'boolean' },
	live: { type: 'boolean' }
} as const;

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

/** The generation options of the parsed command line. */
export function generateOptions(values: ParsedValues): GenerateOptions {
	return {
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
		nodesWithoutMediaStats: intOption(values, 'nodes-without-media-stats', 0),
		mediaNodes: flag(values, 'media-nodes'),
		legacy: flag(values, 'legacy')
	};
}

/** Live batch interval: the writer's default. */
const TICK_MS = 10_000;

/**
 * Ticks the live writer every 10 s from the start of its world, catching up on the ticks due, until `SIGINT` or
 * `SIGTERM` stops it after the current tick.
 */
export async function writeLive(writer: LiveWriter, world: World): Promise<void> {
	const stop = new AbortController();

	for (const signal of ['SIGINT', 'SIGTERM'] as const) {
		process.once(signal, () => {
			stop.abort();
		});
	}

	console.log('Writing live every 10 s; stop with Ctrl+C');

	// A signal can arrive during any await.
	const stopped = () => stop.signal.aborted;

	for (let at = world.start + TICK_MS; !stopped(); at += TICK_MS) {
		await sleep(Math.max(0, at - Date.now()), undefined, { signal: stop.signal }).catch(() => undefined);

		if (!stopped()) {
			await writer.tick(at);
		}
	}
}
