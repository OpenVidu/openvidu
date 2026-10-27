/** Service identifiers of the dashboard container; PRO rebinds them in `DashboardOptions.configure`. */
export const TOKENS = {
	Config: Symbol.for('openvidu-dashboard.Config'),
	Logger: Symbol.for('openvidu-dashboard.Logger'),
	MongoClient: Symbol.for('openvidu-dashboard.MongoClient'),
	Database: Symbol.for('openvidu-dashboard.Database'),
	Shutdown: Symbol.for('openvidu-dashboard.Shutdown'),
	/** `() => Date`, replaced in tests. */
	Clock: Symbol.for('openvidu-dashboard.Clock'),
	RouteRegistry: Symbol.for('openvidu-dashboard.RouteRegistry'),
	/** `FeatureKey[]` reported by info; empty on CE. */
	Features: Symbol.for('openvidu-dashboard.Features'),
	InfoService: Symbol.for('openvidu-dashboard.InfoService'),
	SessionRepository: Symbol.for('openvidu-dashboard.SessionRepository'),
	AuthService: Symbol.for('openvidu-dashboard.AuthService'),
	RoomsService: Symbol.for('openvidu-dashboard.RoomsService'),
	ParticipantsService: Symbol.for('openvidu-dashboard.ParticipantsService'),
	EgressService: Symbol.for('openvidu-dashboard.EgressService'),
	IngressService: Symbol.for('openvidu-dashboard.IngressService'),
	AnalyticsService: Symbol.for('openvidu-dashboard.AnalyticsService'),
	OverviewService: Symbol.for('openvidu-dashboard.OverviewService'),
	StatusService: Symbol.for('openvidu-dashboard.StatusService'),
	/** The freshness windows of the writer's batch interval, for the stale flags of rooms and participants. */
	WriterFreshness: Symbol.for('openvidu-dashboard.WriterFreshness'),
	/** `boolean`: the overview adds the server nodes; false on CE. */
	OverviewExtension: Symbol.for('openvidu-dashboard.OverviewExtension'),
	/** `AnalyticsCatalogue`: the metrics and dimensions the analytics endpoints compute; PRO adds its own. */
	AnalyticsCatalogue: Symbol.for('openvidu-dashboard.AnalyticsCatalogue'),
	/** Allows the PRO metrics, dimensions and scopes of the enabled features. */
	AnalyticsFeatureGate: Symbol.for('openvidu-dashboard.AnalyticsFeatureGate'),
	StatsModeReader: Symbol.for('openvidu-dashboard.StatsModeReader'),
	/** Bound by the signing-key startup hook. */
	SigningKey: Symbol.for('openvidu-dashboard.SigningKey'),
	/** Bound by the base-path startup hook. */
	BasePath: Symbol.for('openvidu-dashboard.BasePath')
} as const;
