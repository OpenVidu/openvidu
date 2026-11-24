import type { DeletionJob, InfoResponse, StatusResponse } from '@openvidu-dashboard/typings';

/** A full CE info document with a completed migration; override any field. */
export function infoResponse(overrides: Partial<InfoResponse> = {}): InfoResponse {
	return {
		edition: 'ce',
		versions: { dashboard: '3.10.0', server: '3.10.0' },
		schema: { dashboard: 2, writer: 2, status: 'ok' },
		migration: { state: 'completed', progress: { processed: 10, total: 10 } },
		database: { version: '8.0.29', timeseriesSupported: true },
		storage: {},
		deletions: {},
		features: [],
		limits: { rankedSortMaxRangeMs: 7 * 86_400_000, participantRankedSortMaxRangeMs: 86_400_000 },
		openapiDocsEnabled: false,
		...overrides
	};
}

/** A running Events deletion job that deleted nothing yet; override any field. */
export function deletionJob(overrides: Partial<DeletionJob> = {}): DeletionJob {
	return {
		id: 'job-1',
		class: 'events',
		includeLegacy: false,
		state: 'running',
		cutoff: '2026-11-19T10:07:00.000Z',
		startedAt: '2026-11-19T10:07:00.000Z',
		currentClass: 'events',
		collection: { index: 1, total: 1 },
		deleted: 0,
		...overrides
	};
}

/** A status whose writer batch is `writerAgeMs` older than `generatedAt`, or never seen when `null`. */
export function statusResponse(
	overrides: Partial<StatusResponse> = {},
	writerAgeMs: number | null = 4_000
): StatusResponse {
	const generatedAt = overrides.generatedAt ?? '2026-10-13T12:00:00.000Z';

	return {
		generatedAt,
		schema: { dashboard: 2, writer: 2, status: 'ok' },
		migration: { state: 'completed', progress: { processed: 10, total: 10 } },
		writer:
			writerAgeMs === null
				? {}
				: {
						lastSeenAt: new Date(Date.parse(generatedAt) - writerAgeMs).toISOString()
					},
		...overrides
	};
}

/** Resolves after pending macrotasks, so promise chains started by a flushed request can finish. */
export function settle(): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, 0);
	});
}

/** Signs in through the mocked login endpoint. */
export async function signIn(
	auth: { login(username: string, password: string): Promise<void> },
	http: { expectOne(url: string): { flush(body: object): void } }
): Promise<void> {
	const login = auth.login('admin', 'secret');

	http.expectOne('api/v1/auth/login').flush({ accessToken: 'token', expiresAt: '2026-10-14T00:15:00.000Z' });
	await login;
}
