import { accessSync, constants } from 'node:fs';

import type { MongoClientOptions } from 'mongodb';

import type { DashboardConfig } from '../config/variables.js';

export type MongoUrlResult = { kind: 'url'; url: string } | { kind: 'missing'; variables: string[] };

const COMPOSITION_VARIABLES = [
	['MONGO_NODES', 'nodes'],
	['MONGO_PORT', 'port'],
	['MONGO_ADMIN_USERNAME', 'username'],
	['MONGO_ADMIN_PASSWORD', 'password'],
	['MONGO_REPLICA_SET_NAME', 'replicaSet']
] as const;

/**
 * `DATABASE_URL`, or the URL composed from the `MONGO_*` variables as OpenVidu 3.9 does: every node of
 * `MONGO_NODES` gets `MONGO_PORT`, credentials are used as given, and reads prefer the primary.
 */
export function resolveMongoUrl(database: DashboardConfig['database']): MongoUrlResult {
	if (database.url) {
		return { kind: 'url', url: database.url };
	}

	const missing = COMPOSITION_VARIABLES.filter(([, key]) => !database[key]).map(([name]) => name);

	if (missing.length > 0) {
		return { kind: 'missing', variables: missing };
	}

	const { nodes = '', port = '', username = '', password = '', replicaSet = '' } = database;
	const hosts = nodes
		.split(',')
		.map((node) => `${node.trim()}:${port}`)
		.join(',');

	return {
		kind: 'url',
		url: `mongodb://${username}:${password}@${hosts}/?replicaSet=${replicaSet}&readPreference=primaryPreferred`
	};
}

/** Options of the client; a CA file switches TLS on and must be readable now, not at the first connection. */
export function mongoClientOptions(database: DashboardConfig['database']): MongoClientOptions {
	const options: MongoClientOptions = { serverSelectionTimeoutMS: 10_000, appName: 'openvidu-dashboard' };

	if (database.tlsCaFile) {
		accessSync(database.tlsCaFile, constants.R_OK);
		options.tls = true;
		options.tlsCAFile = database.tlsCaFile;
	}

	return options;
}
