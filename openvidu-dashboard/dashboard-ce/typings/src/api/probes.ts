import type { WriterSchemaStatus } from './info.js';

/** `GET /api/v1/health`: the process is up; MongoDB is not checked. */
export interface HealthResponse {
	status: 'ok';
	version: string;
}

export interface ReadyChecks {
	mongo: 'ok' | 'error';
	schema?: WriterSchemaStatus;
}

/** `GET /api/v1/ready` when ready; otherwise a `NOT_READY` error with `details.checks`. */
export interface ReadyResponse {
	status: 'ready';
	checks: ReadyChecks;
}
