import type { InfoMigration, InfoSchema } from './info.js';

/** The analytics writer as the server nodes report it. */
export interface StatusWriter {
	/** Newest `lastSeenAt` of the server nodes, ISO 8601. */
	lastSeenAt?: string;
	nodes: number;
	/** Nodes whose last batch is within the fresh window of their own batch interval at `generatedAt`. */
	aliveNodes: number;
	/** Largest batch interval among the nodes seen in the last hour; absent when none reports one (read as 10 s). */
	batchIntervalMs?: number;
}

/** `GET /api/v1/status`: what every page polls to follow the server. */
export interface StatusResponse {
	/** MongoDB clock of the read. */
	generatedAt: string;
	schema: InfoSchema;
	migration: InfoMigration;
	writer: StatusWriter;
}
