import { Container } from 'inversify';
import { type Db, type MongoClient } from 'mongodb';

import { type Edition, type FeatureKey } from '@openvidu-dashboard/typings';

import { AnalyticsCache } from '../analytics/analytics-cache.js';
import { type AnalyticsCatalogue, CE_ANALYTICS_CATALOGUE } from '../analytics/analytics-catalogue.js';
import { AnalyticsFeatureGate } from '../analytics/analytics-gate.js';
import { registerAnalyticsRoutes } from '../analytics/analytics-routes.js';
import { AnalyticsService } from '../analytics/analytics-service.js';
import { registerProbes } from '../api/probes.js';
import { rankedSortLimits } from '../api/ranked-limits.js';
import { RouteRegistry } from '../api/route-registry.js';
import { registerAuthRoutes } from '../auth/auth-routes.js';
import { AuthService } from '../auth/auth-service.js';
import { SessionRepository } from '../auth/session-repository.js';
import { type DashboardConfig } from '../config/variables.js';
import { registerEgressRoutes } from '../egress/egress-routes.js';
import { EgressService } from '../egress/egress-service.js';
import { registerInfoRoute } from '../info/info-routes.js';
import { InfoService } from '../info/info-service.js';
import { registerIngressRoutes } from '../ingress/ingress-routes.js';
import { IngressService } from '../ingress/ingress-service.js';
import { type Shutdown } from '../lifecycle/shutdown.js';
import { type Logger } from '../logging/logger.js';
import { registerOverviewRoutes } from '../overview/overview-routes.js';
import { type OverviewExtension, OverviewService } from '../overview/overview-service.js';
import { registerParticipantsRoutes } from '../participants/participants-routes.js';
import { ParticipantsService } from '../participants/participants-service.js';
import { registerRoomsRoutes } from '../rooms/rooms-routes.js';
import { RoomsService } from '../rooms/rooms-service.js';
import { StatsModeReader } from '../stats/stats-mode.js';
import { WriterFreshness } from '../status/freshness.js';
import { registerStatusRoutes } from '../status/status-routes.js';
import { StatusService } from '../status/status-service.js';
import { registerTracksRoutes } from '../tracks/tracks-routes.js';
import { TOKENS } from './tokens.js';

export interface ContainerInputs {
	edition: Edition;
	version: string;
	/** Whether the OpenAPI document and its page are served. */
	docsEnabled: boolean;
	config: DashboardConfig;
	logger: Logger;
	client: MongoClient;
	db: Db;
	shutdown: Shutdown;
}

/**
 * Binds the CE services and extension tokens and registers the CE routes. An extending edition rebinds them in its
 * `configure`, before the startup hooks.
 */
export function buildContainer(inputs: ContainerInputs): Container {
	const { edition, version, config, logger, client, db, shutdown } = inputs;
	const container = new Container();

	container.bind(TOKENS.Config).toConstantValue(config);
	container.bind(TOKENS.Logger).toConstantValue(logger);
	container.bind(TOKENS.MongoClient).toConstantValue(client);
	container.bind(TOKENS.Database).toConstantValue(db);
	container.bind(TOKENS.Shutdown).toConstantValue(shutdown);
	container.bind<() => Date>(TOKENS.Clock).toConstantValue(() => new Date());
	container.bind<FeatureKey[]>(TOKENS.Features).toConstantValue([]);
	container.bind(TOKENS.RouteRegistry).toConstantValue(new RouteRegistry(edition));
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
					edition: edition,
					version: version,
					features: () => container.get<FeatureKey[]>(TOKENS.Features),
					limits: rankedSortLimits(config.lists.totalMaxRangeMs),
					openapiDocsEnabled: inputs.docsEnabled,
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
					edition: edition,
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

	registerProbes(registry, version, db);
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
