import type { Server } from 'node:http';

import { type Container } from 'inversify';
import { type Db, MongoClient } from 'mongodb';

import { type Edition, type InfoSchema, WriterSchemaStatus } from '@openvidu-dashboard/typings';

import { docsRouter, type OpenApiLicense, openApiDocument } from '../api/openapi.js';
import { type RouteRegistry } from '../api/route-registry.js';
import { type AuthService } from '../auth/auth-service.js';
import { bearerAuthenticator } from '../auth/bearer.js';
import { type SessionRepository } from '../auth/session-repository.js';
import { provisionSigningKey } from '../auth/signing-key.js';
import { loadConfigFile } from '../config/config-file.js';
import { type DashboardConfig, parseConfig } from '../config/variables.js';
import { buildContainer } from '../di/container.js';
import { TOKENS } from '../di/tokens.js';
import { createHttpApp } from '../http/app.js';
import { resolveBasePath } from '../http/base-path.js';
import { createLogger, type Logger } from '../logging/logger.js';
import { mongoClientOptions, resolveMongoUrl } from '../mongo/mongo-client.js';
import { olderSchemaMessage, readSchemaStatus } from '../schema/schema-status.js';
import { type Exit, Shutdown } from './shutdown.js';

/** Process exit codes of the dashboard; an extending edition's startup hooks may exit with codes of their own. */
export const ExitCode = {
	OK: 0,
	FAILURE: 1,
	SCHEMA_TOO_OLD: 3
} as const;

export interface StartupContext {
	config: DashboardConfig;
	logger: Logger;
	client: MongoClient;
	db: Db;
	container: Container;
	shutdown: Shutdown;
}

/** Runs after the schema gate and before listening; a rejection stops the dashboard with exit code 1. */
export type StartupHook = (context: StartupContext) => Promise<void>;

export interface DashboardOptions {
	edition: Edition;
	version: string;
	/** Directory of the built SPA. */
	appRoot: string;
	env?: NodeJS.ProcessEnv;
	startupHooks?: StartupHook[];
	/** Overrides of the CE bindings, applied before the startup hooks. */
	configure?: (container: Container) => void;
	exit?: Exit;
	/** Installs SIGTERM and SIGINT handlers (default true). */
	handleSignals?: boolean;
	/** License of the API in the OpenAPI document; default Apache 2.0. */
	apiLicense?: OpenApiLicense;
}

export interface RunningDashboard {
	server: Server;
	container: Container;
	shutdown: Shutdown;
}

/**
 * Starts the dashboard: configuration, MongoDB ping, writer schema gate, startup hooks, listen. A failure at any
 * step exits through the shutdown routine without listening; so does a signal received during startup.
 */
export async function startDashboard(options: DashboardOptions): Promise<RunningDashboard | undefined> {
	const env = options.env ?? process.env;
	const exit = options.exit ?? ((code: number) => process.exit(code));
	let logger = createLogger();

	const file = loadConfigFile(env);

	if (file.kind === 'missing') {
		logger.warn(`Configuration file ${file.path} (DASHBOARD_CONFIG_PATH) not found; using the environment only`);
	} else if (file.kind === 'unreadable') {
		logger.error(`Cannot read the configuration file ${file.path} (DASHBOARD_CONFIG_PATH): ${file.reason}`);
		exit(ExitCode.FAILURE);

		return undefined;
	}

	const parsed = parseConfig(env);

	if (parsed.kind === 'mongo-disabled') {
		logger.info('MongoDB is disabled. Stopping application.');
		exit(ExitCode.OK);

		return undefined;
	}

	for (const warning of parsed.warnings) {
		logger.warn(warning);
	}

	if (parsed.kind === 'invalid') {
		for (const error of parsed.errors) {
			logger.error(`Invalid configuration: ${error}`);
		}

		exit(ExitCode.FAILURE);

		return undefined;
	}

	const { config } = parsed;
	logger = createLogger(config.logLevel);

	const shutdown = new Shutdown(logger, exit);

	if (options.handleSignals ?? true) {
		for (const signal of ['SIGTERM', 'SIGINT'] as const) {
			process.on(signal, () => {
				void shutdown.run(ExitCode.OK, `${signal} received`);
			});
		}
	}

	const fail = async (message: string, code: number = ExitCode.FAILURE): Promise<undefined> => {
		logger.error(message);
		await shutdown.run(code);

		return undefined;
	};

	const url = resolveMongoUrl(config.database);

	if (url.kind === 'missing') {
		for (const variable of url.variables) {
			logger.error(`Environment variable "${variable}" is not defined`);
		}

		return fail('Define every MONGO_* variable or DATABASE_URL before running OpenVidu Dashboard');
	}

	let clientOptions;

	try {
		clientOptions = mongoClientOptions(config.database);
	} catch (error) {
		return fail(
			`Cannot read the CA file ${config.database.tlsCaFile ?? ''} (DATABASE_TLS_CA_FILE): ${String(error)}`
		);
	}

	const client = new MongoClient(url.url, clientOptions);
	shutdown.onShutdown(() => client.close());
	const db = client.db(config.database.name);

	logger.info('Connecting to MongoDB');

	try {
		await client.connect();
		await db.command({ ping: 1 });
	} catch (error) {
		if (shutdown.isRequested()) {
			return undefined;
		}

		return fail(`Cannot connect to MongoDB: ${error instanceof Error ? error.message : String(error)}`);
	}

	if (shutdown.isRequested()) {
		return undefined;
	}

	const schema = await readSchemaStatus(db);

	if (schema.status === WriterSchemaStatus.OLDER && schema.writer !== undefined) {
		return fail(olderSchemaMessage(schema.writer), ExitCode.SCHEMA_TOO_OLD);
	}

	logSchema(logger, schema);

	const container = buildContainer({
		edition: options.edition,
		version: options.version,
		docsEnabled: docsEnabled(env),
		config,
		logger,
		client,
		db,
		shutdown
	});

	try {
		options.configure?.(container);
	} catch (error) {
		return fail(`Startup failed: ${error instanceof Error ? error.message : String(error)}`);
	}

	const unimplemented =
		options.edition === 'pro' ? container.get<RouteRegistry>(TOKENS.RouteRegistry).unimplemented() : [];

	if (unimplemented.length > 0) {
		return fail(`Startup failed: PRO routes without a definition: ${unimplemented.join(', ')}`);
	}

	const context: StartupContext = { config, logger, client, db, container, shutdown };

	for (const hook of [...ceStartupHooks(options), ...(options.startupHooks ?? [])]) {
		try {
			await hook(context);
		} catch (error) {
			return fail(`Startup failed: ${error instanceof Error ? error.message : String(error)}`);
		}

		if (shutdown.isRequested()) {
			return undefined;
		}
	}

	const registry = container.get<RouteRegistry>(TOKENS.RouteRegistry);
	const app = createHttpApp({
		logger,
		appRoot: options.appRoot,
		trustProxy: config.http.trustProxy,
		apiRouter: registry.router(bearerAuthenticator(() => container.get<AuthService>(TOKENS.AuthService))),
		...(docsEnabled(env)
			? {
					docsRouter: docsRouter(() =>
						openApiDocument(registry, {
							version: options.version,
							basePath: container.get<string>(TOKENS.BasePath),
							...(options.apiLicense ? { license: options.apiLicense } : {})
						})
					)
				}
			: {})
	});

	return new Promise((resolve) => {
		const server = app.listen(config.port, (error) => {
			if (error) {
				void fail(`Cannot listen on port ${String(config.port)}: ${error.message}`).then(resolve);

				return;
			}

			shutdown.attachServer(server);
			logger.info(
				`OpenVidu Dashboard ${options.version} (${options.edition}) listening on port ${String(config.port)}`
			);
			resolve({ server, container, shutdown });
		});
	});
}

/** The OpenAPI document and its page are served outside production only. */
export function docsEnabled(env: NodeJS.ProcessEnv): boolean {
	return env.NODE_ENV !== 'production';
}

/** CE startup hooks, run after the schema gate and before the edition's own hooks. */
function ceStartupHooks(options: DashboardOptions): StartupHook[] {
	return [
		({ config, container, logger }) => {
			const resolution = resolveBasePath(config.http.basePath, options.appRoot);

			if (resolution.source === 'default') {
				logger.warn('No DASHBOARD_BASE_PATH and no built SPA with a <base href>: the public base path is /');
			}

			container.bind(TOKENS.BasePath).toConstantValue(resolution.basePath);

			return Promise.resolve();
		},
		async ({ config, container, db }) => {
			container.bind(TOKENS.SigningKey).toConstantValue(await provisionSigningKey(db, config.session.jwtSecret));
		},
		async ({ container }) => {
			await container.get<SessionRepository>(TOKENS.SessionRepository).ensureIndexes();
		}
	];
}

function logSchema(logger: Logger, schema: InfoSchema): void {
	if (schema.status === WriterSchemaStatus.NEWER) {
		logger.warn(
			`Analytics schema version ${String(schema.writer)} is newer than ${String(schema.dashboard)}, the latest ` +
				'this dashboard knows; upgrade the dashboard to see every field'
		);
	} else if (schema.status === WriterSchemaStatus.UNINITIALIZED) {
		logger.info('The OpenVidu server has not initialized the analytics database yet');
	}
}
