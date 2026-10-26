import type { Server } from 'node:http';

import { Container } from 'inversify';
import { type Db, MongoClient } from 'mongodb';

import {
	type Edition,
	type FeatureKey,
	type InfoLicense,
	type InfoSchema,
	WriterSchemaStatus
} from '@openvidu-dashboard/typings';

import { loadConfigFile } from '../config/config-file.js';
import { type DashboardConfig, parseConfig } from '../config/variables.js';
import { TOKENS } from '../di/tokens.js';
import { AnalyticsCache } from '../analytics/analytics-cache.js';
import { type AnalyticsCatalogue, CE_ANALYTICS_CATALOGUE } from '../analytics/analytics-catalogue.js';
import { AnalyticsFeatureGate } from '../analytics/analytics-gate.js';
import { registerAnalyticsRoutes } from '../analytics/analytics-routes.js';
import { AnalyticsService } from '../analytics/analytics-service.js';
import { docsRouter, openApiDocument } from '../api/openapi.js';
import { registerProbes } from '../api/probes.js';
import { rankedSortLimits } from '../api/ranked-limits.js';
import { RouteRegistry } from '../api/route-registry.js';
import { registerAuthRoutes } from '../auth/auth-routes.js';
import { AuthService } from '../auth/auth-service.js';
import { bearerAuthenticator } from '../auth/bearer.js';
import { SessionRepository } from '../auth/session-repository.js';
import { provisionSigningKey } from '../auth/signing-key.js';
import { registerEgressRoutes } from '../egress/egress-routes.js';
import { EgressService } from '../egress/egress-service.js';
import { createHttpApp } from '../http/app.js';
import { resolveBasePath } from '../http/base-path.js';
import { InfoService } from '../info/info-service.js';
import { registerIngressRoutes } from '../ingress/ingress-routes.js';
import { IngressService } from '../ingress/ingress-service.js';
import { registerInfoRoute } from '../info/info-routes.js';
import { createLogger, type Logger } from '../logging/logger.js';
import { mongoClientOptions, resolveMongoUrl } from '../mongo/mongo-client.js';
import { registerOverviewRoutes } from '../overview/overview-routes.js';
import { type OverviewExtension, OverviewService } from '../overview/overview-service.js';
import { registerParticipantsRoutes } from '../participants/participants-routes.js';
import { ParticipantsService } from '../participants/participants-service.js';
import { registerRoomsRoutes } from '../rooms/rooms-routes.js';
import { RoomsService } from '../rooms/rooms-service.js';
import { olderSchemaMessage, readSchemaStatus } from '../schema/schema-status.js';
import { StatsModeReader } from '../stats/stats-mode.js';
import { registerStatusRoutes } from '../status/status-routes.js';
import { WriterFreshness } from '../status/freshness.js';
import { StatusService } from '../status/status-service.js';
import { registerTracksRoutes } from '../tracks/tracks-routes.js';
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

	const container = buildContainer(options, config, logger, client, db, shutdown);

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
		...(docsEnabled(env) ? { docsRouter: docsRouter(() => openApiDocument(registry, options.version)) } : {})
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

function buildContainer(
	options: DashboardOptions,
	config: DashboardConfig,
	logger: Logger,
	client: MongoClient,
	db: Db,
	shutdown: Shutdown
): Container {
	const env = options.env ?? process.env;
	const container = new Container();

	container.bind(TOKENS.Config).toConstantValue(config);
	container.bind(TOKENS.Logger).toConstantValue(logger);
	container.bind(TOKENS.MongoClient).toConstantValue(client);
	container.bind(TOKENS.Database).toConstantValue(db);
	container.bind(TOKENS.Shutdown).toConstantValue(shutdown);
	container.bind<() => Date>(TOKENS.Clock).toConstantValue(() => new Date());
	container.bind<FeatureKey[]>(TOKENS.Features).toConstantValue([]);
	container.bind<() => InfoLicense | undefined>(TOKENS.LicenseInfo).toConstantValue(() => undefined);
	container.bind(TOKENS.RouteRegistry).toConstantValue(new RouteRegistry(options.edition));
	container.bind<AnalyticsCatalogue>(TOKENS.AnalyticsCatalogue).toConstantValue(CE_ANALYTICS_CATALOGUE);
	container
		.bind(TOKENS.SessionRepository)
		.toResolvedValue((database: Db) => new SessionRepository(database), [TOKENS.Database])
		.inSingletonScope();
	container
		.bind(TOKENS.StatsModeReader)
		.toResolvedValue(
			(database: Db, clock: () => Date) => new StatsModeReader(database, clock),
			[TOKENS.Database, TOKENS.Clock]
		)
		.inSingletonScope();
	container
		.bind(TOKENS.InfoService)
		.toResolvedValue(
			(database: Db, statsMode: StatsModeReader) =>
				new InfoService(database, {
					edition: options.edition,
					version: options.version,
					features: () => container.get<FeatureKey[]>(TOKENS.Features),
					limits: rankedSortLimits(config.lists.totalMaxRangeMs),
					license: () => container.get<() => InfoLicense | undefined>(TOKENS.LicenseInfo)(),
					openapiDocsEnabled: docsEnabled(env),
					statsMode
				}),
			[TOKENS.Database, TOKENS.StatsModeReader]
		)
		.inSingletonScope();
	container
		.bind(TOKENS.AuthService)
		.toResolvedValue(
			(key: Uint8Array, sessions: SessionRepository, clock: () => Date) =>
				new AuthService({
					username: config.admin.username,
					password: config.admin.password,
					edition: options.edition,
					key,
					refreshTokenTtlSeconds: config.session.refreshTokenTtlSeconds,
					sessions,
					logger,
					now: clock
				}),
			[TOKENS.SigningKey, TOKENS.SessionRepository, TOKENS.Clock]
		)
		.inSingletonScope();

	container
		.bind(TOKENS.WriterFreshness)
		.toResolvedValue(
			(database: Db, clock: () => Date) => new WriterFreshness(database, clock),
			[TOKENS.Database, TOKENS.Clock]
		)
		.inSingletonScope();

	container
		.bind(TOKENS.RoomsService)
		.toResolvedValue(
			(database: Db, clock: () => Date, freshness: WriterFreshness) =>
				new RoomsService(database, {
					totalMaxRangeMs: config.lists.totalMaxRangeMs,
					freshness,
					now: clock
				}),
			[TOKENS.Database, TOKENS.Clock, TOKENS.WriterFreshness]
		)
		.inSingletonScope();

	container
		.bind(TOKENS.ParticipantsService)
		.toResolvedValue(
			(database: Db, clock: () => Date, freshness: WriterFreshness) =>
				new ParticipantsService(database, {
					totalMaxRangeMs: config.lists.totalMaxRangeMs,
					freshness,
					now: clock
				}),
			[TOKENS.Database, TOKENS.Clock, TOKENS.WriterFreshness]
		)
		.inSingletonScope();

	container
		.bind(TOKENS.EgressService)
		.toResolvedValue(
			(database: Db, clock: () => Date) =>
				new EgressService(database, { totalMaxRangeMs: config.lists.totalMaxRangeMs, now: clock }),
			[TOKENS.Database, TOKENS.Clock]
		)
		.inSingletonScope();

	container
		.bind(TOKENS.IngressService)
		.toResolvedValue(
			(database: Db, clock: () => Date) =>
				new IngressService(database, { totalMaxRangeMs: config.lists.totalMaxRangeMs, now: clock }),
			[TOKENS.Database, TOKENS.Clock]
		)
		.inSingletonScope();

	container
		.bind(TOKENS.AnalyticsFeatureGate)
		.toResolvedValue(() => new AnalyticsFeatureGate(() => container.get<FeatureKey[]>(TOKENS.Features)))
		.inSingletonScope();

	container
		.bind(TOKENS.AnalyticsService)
		.toResolvedValue(
			(database: Db, clock: () => Date, gate: AnalyticsFeatureGate, catalogue: AnalyticsCatalogue) =>
				new AnalyticsService(database, {
					now: clock,
					gate,
					catalogue,
					cache: new AnalyticsCache(config.analytics.cacheTtlSeconds * 1000, clock)
				}),
			[TOKENS.Database, TOKENS.Clock, TOKENS.AnalyticsFeatureGate, TOKENS.AnalyticsCatalogue]
		)
		.inSingletonScope();

	container.bind<OverviewExtension>(TOKENS.OverviewExtension).toConstantValue(() => ({}));
	container
		.bind(TOKENS.OverviewService)
		.toResolvedValue(
			(database: Db, clock: () => Date, extension: OverviewExtension) =>
				new OverviewService(database, { now: clock, extension }),
			[TOKENS.Database, TOKENS.Clock, TOKENS.OverviewExtension]
		)
		.inSingletonScope();
	container
		.bind(TOKENS.StatusService)
		.toResolvedValue(
			(database: Db, clock: () => Date, info: InfoService) => new StatusService(database, { info, now: clock }),
			[TOKENS.Database, TOKENS.Clock, TOKENS.InfoService]
		)
		.inSingletonScope();

	logger.info(
		config.analytics.cacheTtlSeconds > 0
			? `Analytics cache: completed buckets kept for ${String(config.analytics.cacheTtlSeconds)} s`
			: 'Analytics cache disabled (DASHBOARD_ANALYTICS_CACHE_TTL=0)'
	);

	const registry = container.get<RouteRegistry>(TOKENS.RouteRegistry);
	const now = () => container.get<() => Date>(TOKENS.Clock)();

	registerProbes(registry, options.version, db);
	registerAuthRoutes(
		registry,
		() => container.get<AuthService>(TOKENS.AuthService),
		() => ({
			basePath: container.get<string>(TOKENS.BasePath),
			ttlSeconds: config.session.refreshTokenTtlSeconds,
			secure: config.session.cookieSecure
		})
	);
	registerInfoRoute(registry, () => container.get<InfoService>(TOKENS.InfoService));
	registerRoomsRoutes(registry, () => container.get<RoomsService>(TOKENS.RoomsService), now);
	registerParticipantsRoutes(registry, () => container.get<ParticipantsService>(TOKENS.ParticipantsService), now);
	registerTracksRoutes(registry);
	registerEgressRoutes(registry, () => container.get<EgressService>(TOKENS.EgressService), now);
	registerIngressRoutes(registry, () => container.get<IngressService>(TOKENS.IngressService), now);
	registerAnalyticsRoutes(registry, () => container.get<AnalyticsService>(TOKENS.AnalyticsService), now);
	registerOverviewRoutes(registry, () => container.get<OverviewService>(TOKENS.OverviewService));
	registerStatusRoutes(registry, () => container.get<StatusService>(TOKENS.StatusService));

	return container;
}
