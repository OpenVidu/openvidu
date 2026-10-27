// Test support shared with the PRO backend suites through the `@openvidu-dashboard/backend/testing` export.
// The MongoDB URI that `inject('mongoUri')` reads is declared by the global setup.
export type {} from './global-mongo.js';

export { bootClient, type Client, get, issue, json, signIn } from './api-client.js';
export { boot, type BootedDashboard, refreshCookie } from './boot.js';
export { loadFixture, seedFixtures } from './fixtures.js';
export { freePort } from './free-port.js';
export { expectWithinBudgets } from './latency-budget.js';
export { type MongoHandle, startMongo } from './mongo-container.js';
export { type CheckedDocument, type CheckedOperation, documentationIssues } from './openapi-checks.js';
export {
	type ExplainSummary,
	expectIdLookup,
	expectIndexBacked,
	expectIndexes,
	type IndexBackedOptions,
	p95,
	type PlannableQuery
} from './query-plan.js';
export * from './rooms-seed.js';
export { silentLogger } from './silent-logger.js';
