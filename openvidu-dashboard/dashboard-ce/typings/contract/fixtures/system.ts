import { DEFAULT_RETENTION_MS, type NodeDocument, type SchemaMetaDocument } from '../../src/index.js';
import { at, i64, NODE_ALPHA, NODE_BETA, REGION, schemaVersion, SERVER_VERSION } from './scenario.js';

export const nodes: NodeDocument[] = [
	{
		_id: NODE_ALPHA,
		firstSeenAt: new Date('2026-10-01T08:00:00Z'),
		lastSeenAt: at('10:35:10'),
		serverVersion: SERVER_VERSION,
		region: REGION,
		batchIntervalMs: 10_000
	},
	{
		_id: NODE_BETA,
		firstSeenAt: new Date('2026-10-05T12:00:00Z'),
		lastSeenAt: at('10:35:10'),
		serverVersion: SERVER_VERSION,
		region: REGION,
		batchIntervalMs: 10_000
	}
];

const initializedAt = at('08:00:00');

export const schemaMeta: SchemaMetaDocument[] = [
	{ _id: 'schema', version: schemaVersion, writerVersion: SERVER_VERSION, updatedAt: initializedAt },
	{
		_id: 'retention',
		eventsMs: DEFAULT_RETENTION_MS.events ?? 0,
		statsMs: DEFAULT_RETENTION_MS.stats ?? 0,
		tracksMs: DEFAULT_RETENTION_MS.tracks ?? 0,
		entitiesMs: DEFAULT_RETENTION_MS.entities ?? 0,
		rollups5MinMs: DEFAULT_RETENTION_MS.rollups5Min ?? 0,
		rollupsHourlyMs: DEFAULT_RETENTION_MS.rollupsHourly ?? 0,
		rollupsDailyMs: DEFAULT_RETENTION_MS.rollupsDaily,
		updatedAt: initializedAt
	},
	{ _id: 'capabilities', timeseries: true, transactions: true, serverVersion: '8.0.29', detectedAt: initializedAt },
	{ _id: 'config', statsDetail: 'participant', recordedAt: initializedAt },
	{
		_id: 'migration',
		state: 'completed',
		checkpoint: { phase: 'cleanup', events: i64(1_791_791_990), stats: i64(1_791_791_995) },
		processed: 125_000,
		total: 125_000,
		startedAt: at('08:00:05'),
		finishedAt: at('08:20:00'),
		writerVersion: SERVER_VERSION,
		fromSchemaVersion: 0,
		counts: { events: 98_000, stats: 26_800, synthetic: 120, skipped: 80 },
		nodeId: NODE_ALPHA,
		legacyRetainedUntil: new Date('2026-11-13T08:00:00Z')
	},
	{
		_id: 'reconciler',
		lastRunAt: at('10:35:20'),
		lastRunDurationMs: 38,
		nodeId: NODE_ALPHA,
		candidates: { room: 0, participant: 2, egress: 0, ingressSession: 0 },
		closed: { room: 0, participant: 1, track: 0, subscription: 0, egress: 0, ingressSession: 0 },
		partial: false
	}
];
