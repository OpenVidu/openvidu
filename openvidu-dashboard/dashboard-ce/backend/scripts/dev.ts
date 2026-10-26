/**
 * Configuration of `./dashboard.sh dev`, exported as `@openvidu-dashboard/backend/dev` for the development scripts of
 * extending workspaces: the variable files of the backend development server and the check that runs before it.
 */
import { fileURLToPath } from 'node:url';

import { MongoClient } from 'mongodb';

import { WriterSchemaStatus } from '@openvidu-dashboard/typings';

import { applyEnvFile, loadConfigFile } from '../src/config/config-file.js';
import { type DashboardConfig, parseConfig } from '../src/config/variables.js';
import { mongoClientOptions, resolveMongoUrl } from '../src/mongo/mongo-client.js';
import { olderSchemaMessage, readSchemaStatus } from '../src/schema/schema-status.js';

/** The defaults for openvidu-local-deployment running on this machine. */
export const DEV_ENV_FILE = fileURLToPath(new URL('../dev.env', import.meta.url));

const MONGO_HINT =
	'Start openvidu-local-deployment, set DATABASE_URL in the .env of the backend, or run ./dashboard.sh demo for ' +
	'generated data.';

/**
 * Loads the files that exist, in order, into `env`: a variable keeps the first value it gets, so the environment wins
 * over every file and each file over the ones after it.
 *
 * @throws Error when a file cannot be read.
 */
export function loadDevEnv(files: readonly string[], env: NodeJS.ProcessEnv = process.env): void {
	for (const file of files) {
		const result = applyEnvFile(file, env);

		if (result.kind === 'unreadable') {
			throw new Error(`Cannot read ${file}: ${result.reason}`);
		}
	}
}

/**
 * Checks the configuration in `env` and that its MongoDB answers with a schema this dashboard supports, printing the
 * problem or what the backend will use.
 *
 * @returns Whether the backend can start.
 */
export async function checkDevConfig(env: NodeJS.ProcessEnv = process.env): Promise<boolean> {
	const problem = await findProblem(env);

	if (problem !== undefined) {
		process.stderr.write(`${problem}\n`);
	}

	return problem === undefined;
}

async function findProblem(env: NodeJS.ProcessEnv): Promise<string | undefined> {
	const file = loadConfigFile(env);

	if (file.kind === 'unreadable') {
		return `Cannot read ${file.path} (DASHBOARD_CONFIG_PATH): ${file.reason}`;
	}

	const parsed = parseConfig(env);

	if (parsed.kind === 'mongo-disabled') {
		return 'MONGO_ENABLED is false: the dashboard stops at startup';
	}

	if (parsed.kind === 'invalid') {
		return parsed.errors.map((error) => `Invalid configuration: ${error}`).join('\n');
	}

	return findMongoProblem(parsed.config);
}

async function findMongoProblem(config: DashboardConfig): Promise<string | undefined> {
	const url = resolveMongoUrl(config.database);

	if (url.kind === 'missing') {
		return `Define DATABASE_URL, or ${url.variables.join(', ')}`;
	}

	const redacted = url.url.replace(/\/\/([^:@/]+):[^@/]*@/, '//$1:***@');
	let client: MongoClient;

	try {
		client = new MongoClient(url.url, { ...mongoClientOptions(config.database), serverSelectionTimeoutMS: 3_000 });
	} catch (error) {
		return `Cannot use the MongoDB settings: ${errorMessage(error)}`;
	}

	try {
		const schema = await readSchemaStatus(client.db(config.database.name));

		if (schema.status === WriterSchemaStatus.OLDER && schema.writer !== undefined) {
			return `${olderSchemaMessage(schema.writer)} (pull the latest images of the deployment)`;
		}
	} catch (error) {
		return `MongoDB does not answer at ${redacted}: ${errorMessage(error)}\n${MONGO_HINT}`;
	} finally {
		await client.close();
	}

	process.stdout.write(`User ${config.admin.username}; MongoDB ${redacted}, database ${config.database.name}\n`);

	return undefined;
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
