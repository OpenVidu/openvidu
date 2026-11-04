import type { InfoMigration, InfoSchema } from './info.js';

/** The analytics writer as the server nodes report it. */
export interface StatusWriter {
	/** Newest `lastSeenAt` of the server nodes, ISO 8601. */
	lastSeenAt?: string;
	/** `stoppedAt` of the newest node document when no node is alive: the server stopped gracefully, ISO 8601. */
	stoppedAt?: string;
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
