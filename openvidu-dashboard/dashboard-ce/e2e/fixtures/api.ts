import { createHash } from 'node:crypto';

import { test as base, type Page, type Route } from '@playwright/test';
import {
	type EgressListItem,
	type EgressSummary,
	FeatureKey,
	type InfoResponse,
	type IngressListItem,
	type IngressSummary,
	type ListResponse,
	type OverviewResponse,
	ParticipantKind,
	type ParticipantListItem,
	type ParticipantsSummary,
	type RoomListItem,
	type RoomSummary,
	type StatusResponse
} from '@openvidu-dashboard/typings';

import {
	ANALYTICS_SUMMARY,
	analyticsBreakdowns,
	analyticsCsv,
	type AnalyticsFixtures,
	analyticsSeries
} from './analytics.js';
import { activeOverview, activeStatus } from './overview.js';

export type LoginOutcome = 'ok' | 'invalid' | 'rate-limited' | 'unreachable';

/** Answers `GET <path>` of a route the CE mock does not know, such as a PRO one. */
export type ApiRouteHandler = (route: Route, params: URLSearchParams) => Promise<void>;

export interface ApiOptions {
	/** A refresh cookie exists: the silent restore at start succeeds. */
	signedIn: boolean;
	edition: 'ce' | 'pro';
	/** Fields merged into the full info document. */
	info: Partial<InfoResponse>;
	/** `GET /api/v1/info` answers 503. */
	infoFails: boolean;
	login: LoginOutcome;
	/** `Retry-After` of a rate-limited login. */
	retryAfter: number;
	/** Rooms of `GET rooms`, filtered by `status`, `features` and `q` (a SID or a name prefix). */
	rooms: RoomListItem[];
	/** Body of `GET rooms/summary`. */
	roomSummary: RoomSummary;
	/** Fields merged into every `GET rooms` page, e.g. `nextCursor`. */
	roomsPage?: Partial<ListResponse<RoomListItem>>;
	/** Sessions of `GET participants` (filtered by `q`, `kind`, `status`, `room`) and, of kind AGENT, `GET agents`. */
	participants: ParticipantListItem[];
	/** Egresses of `GET egresses`, filtered by `q` (an id or a room name prefix), `status`, `type` and `room`. */
	egresses?: EgressListItem[];
	/** Body of `GET egresses/summary`. */
	egressSummary?: EgressSummary;
	/** Ingresses of `GET ingresses`, filtered by `q` (an id or a name prefix), `status` and `inputType`. */
	ingresses?: IngressListItem[];
	/** Body of `GET ingresses/summary`. */
	ingressSummary?: IngressSummary;
	/** Handlers of the paths the CE mock does not answer, such as the PRO routes, by path; read on every request. */
	routes?: Record<string, ApiRouteHandler>;
	/** Values of the series and keys of the breakdowns the CE fixtures do not define, such as the PRO ones. */
	analytics?: AnalyticsFixtures;
	/** Analytics paths (`breakdowns`, `export.csv`…) that answer `500` with a request id. */
	analyticsFail?: string[];
	/**
	 * Body of `GET overview`, built per request (an active deployment by default); its ETag is the body without
	 * `generatedAt`, so an unchanged body answers `304` to `If-None-Match`.
	 */
	overview?: () => OverviewResponse;
	/** `GET overview` answers `500` with a request id. */
	overviewFails?: boolean;
	/** Body of `GET status`, built per request (a healthy writer by default). */
	status?: () => StatusResponse;
}

export interface RecordedRequest {
	method: string;
	path: string;
	/** Query parameters of the request. */
	params: URLSearchParams;
	authorization: string | null;
}

export const DEFAULT_API: ApiOptions = {
	signedIn: true,
	edition: 'ce',
	info: {},
	infoFails: false,
	login: 'ok',
	retryAfter: 3,
	rooms: [],
	participants: [],
	roomSummary: { activeRooms: 0, roomsInRange: 0, participantSessions: 0, activeParticipants: 0, approximate: false }
};

const TOKEN = 'e2e-access-token';
const EMPTY_INGRESS_SUMMARY: IngressSummary = {
	publishingNow: 0,
	ingressesInRange: 0,
	byInputType: { rtmp: 0, whip: 0, url: 0 },
	sessionsInRange: 0,
	totalDurationMs: 0,
	approximate: false
};
const EMPTY_EGRESS_SUMMARY: EgressSummary = {
	active: 0,
	startedInRange: 0,
	byType: {},
	byEndStatus: {},
	totalDurationMs: 0,
	approximate: false
};
const EXPIRES_AT = '2099-01-01T00:00:00.000Z';

/** An error answer in the API's shape. */
export function error(code: string, status: number, headers: Record<string, string> = {}) {
	return { status, headers, json: { error: { code, message: code } } };
}

/** The dashboard API mocked with `page.route()`: auth endpoints, info, empty lists; every request is recorded. */
export class MockApi {
	readonly requests: RecordedRequest[] = [];
	private signedIn: boolean;
	private accessToken = TOKEN;
	private readonly proOnly = new Set<string>();
	private roomsFail = false;

	constructor(
		private readonly page: Page,
		readonly options: ApiOptions
	) {
		this.signedIn = options.signedIn;
	}

	async install(): Promise<void> {
		await this.page.route('**/api/v1/**', (route) => this.handle(route));
	}

	/** Paths of the recorded requests, e.g. `GET rooms`. */
	calls(): string[] {
		return this.requests.map((request) => `${request.method} ${request.path}`);
	}

	/** Makes `GET rooms` answer `500` with a request id until called with `false`. */
	failRooms(fail = true): void {
		this.roomsFail = fail;
	}

	/** Makes the next request with the current token answer 401, as when the access token expires. */
	expireToken(): void {
		this.accessToken = `${TOKEN}-rotated-${String(Date.now())}`;
	}

	/** Answers `403 PRO_FEATURE` to `GET <path>` and switches the info document to CE, as a licence downgrade would. */
	downgrade(path: string): void {
		this.proOnly.add(path);
	}

	fullInfo(): InfoResponse {
		const edition = this.proOnly.size > 0 ? 'ce' : this.options.edition;

		return {
			edition,
			versions: { dashboard: '3.10.0', server: '3.10.0' },
			schema: { dashboard: 2, writer: 2, status: 'ok' },
			migration: {
				state: 'completed',
				progress: { processed: 1_200_000, total: 1_200_000, finishedAt: '2026-10-12T10:04:00.000Z' }
			},
			retention: {
				eventsMs: 7 * 86_400_000,
				statsMs: 7 * 86_400_000,
				tracksMs: 7 * 86_400_000,
				entitiesMs: 90 * 86_400_000,
				rollups5MinMs: 7 * 86_400_000,
				rollupsHourlyMs: 400 * 86_400_000,
				rollupsDailyMs: null
			},
			database: { version: '8.0.29', timeseriesSupported: true },
			storage: {
				rooms: {
					documents: 1203,
					storageBytes: 1_234_567,
					indexBytes: 234_567,
					oldest: '2026-09-01T00:00:00.000Z'
				}
			},
			features: edition === 'pro' ? Object.values(FeatureKey) : [],
			limits: { rankedSortMaxRangeMs: 7 * 86_400_000, participantRankedSortMaxRangeMs: 86_400_000 },
			openapiDocsEnabled: false,
			...this.options.info
		};
	}

	private async handle(route: Route): Promise<void> {
		const request = route.request();
		const url = new URL(request.url());
		const path = url.pathname.replace(/^.*\/api\/v1\//, '');
		const authorization = request.headers().authorization ?? null;
		const method = request.method();
		const handler = method === 'GET' ? this.options.routes?.[path] : undefined;

		this.requests.push({ method, path, params: url.searchParams, authorization });

		const authorized = this.signedIn && authorization === `Bearer ${this.accessToken}`;

		switch (`${method} ${path}`) {
			case 'POST auth/refresh':
				if (this.signedIn) {
					this.accessToken = `${TOKEN}-${String(this.requests.length)}`;
					await route.fulfill({ json: { accessToken: this.accessToken, expiresAt: EXPIRES_AT } });
				} else {
					await route.fulfill(error('UNAUTHORIZED', 401));
				}

				return;
			case 'POST auth/login':
				await this.login(route);

				return;
			case 'POST auth/logout':
				this.signedIn = false;
				await route.fulfill({ status: 204 });

				return;
			case 'GET auth/me':
				await route.fulfill(
					authorized
						? { json: { username: 'admin', edition: this.options.edition, expiresAt: EXPIRES_AT } }
						: error('UNAUTHORIZED', 401)
				);

				return;
			case 'GET info':
				if (this.options.infoFails) {
					await route.fulfill(error('NOT_READY', 503));
				} else if (authorization !== null && !authorized) {
					await route.fulfill(error('UNAUTHORIZED', 401));
				} else {
					await route.fulfill({
						json: authorized
							? this.fullInfo()
							: { edition: this.options.edition, versions: { dashboard: '3.10.0' } }
					});
				}

				return;
			default:
				if (!authorized) {
					await route.fulfill(error('UNAUTHORIZED', 401));
				} else if (method === 'GET' && this.proOnly.has(path)) {
					await route.fulfill(error('PRO_FEATURE', 403));
				} else if (handler !== undefined) {
					await handler(route, url.searchParams);
				} else if (method === 'GET' && path === 'rooms') {
					await this.rooms(route, new URL(request.url()).searchParams);
				} else if (method === 'GET' && path === 'rooms/summary') {
					await route.fulfill({ json: this.options.roomSummary });
				} else if (method === 'GET' && path === 'participants/summary') {
					await route.fulfill({ json: this.participantsSummary() });
				} else if (method === 'GET' && (path === 'participants' || path === 'agents')) {
					await this.participants(route, path, new URL(request.url()).searchParams);
				} else if (method === 'GET' && path === 'egresses') {
					await this.egresses(route, new URL(request.url()).searchParams);
				} else if (method === 'GET' && path === 'egresses/summary') {
					await route.fulfill({ json: this.options.egressSummary ?? EMPTY_EGRESS_SUMMARY });
				} else if (method === 'GET' && path === 'ingresses') {
					await this.ingresses(route, new URL(request.url()).searchParams);
				} else if (method === 'GET' && path === 'ingresses/summary') {
					await route.fulfill({ json: this.options.ingressSummary ?? EMPTY_INGRESS_SUMMARY });
				} else if (method === 'GET' && path === 'overview') {
					await this.overview(route);
				} else if (method === 'GET' && path === 'status') {
					await route.fulfill({ json: (this.options.status ?? activeStatus)() });
				} else if (method === 'GET' && path.startsWith('analytics/')) {
					await this.analytics(route, path.slice('analytics/'.length), url.searchParams);
				} else {
					await route.fulfill(error('NOT_FOUND', 404));
				}
		}
	}

	private async overview(route: Route): Promise<void> {
		if (this.options.overviewFails === true) {
			await route.fulfill(error('INTERNAL_ERROR', 500, { 'X-Request-Id': 'e2e-overview' }));

			return;
		}

		const body = (this.options.overview ?? activeOverview)();
		const { generatedAt: _generatedAt, ...stable } = body;
		const etag = `W/"${createHash('sha1').update(JSON.stringify(stable)).digest('base64url')}"`;

		await route.fulfill(
			route.request().headers()['if-none-match'] === etag
				? { status: 304, headers: { ETag: etag } }
				: { json: body, headers: { ETag: etag } }
		);
	}

	private async analytics(route: Route, path: string, params: URLSearchParams): Promise<void> {
		if (this.options.analyticsFail?.includes(path)) {
			await route.fulfill(error('INTERNAL_ERROR', 500, { 'X-Request-Id': `e2e-${path}` }));

			return;
		}

		switch (path) {
			case 'series':
				await route.fulfill({ json: analyticsSeries(params, this.options.analytics) });
				break;
			case 'breakdowns':
				await route.fulfill({ json: analyticsBreakdowns(params, this.options.analytics) });
				break;
			case 'summary':
				await route.fulfill({ json: { ...ANALYTICS_SUMMARY, scope: params.get('scope') ?? 'global' } });
				break;
			case 'export.csv': {
				const csv = analyticsCsv(params);

				await route.fulfill({
					body: csv.body,
					headers: {
						'Content-Type': 'text/csv; charset=utf-8',
						'Content-Disposition': `attachment; filename=${csv.fileName}`
					}
				});
				break;
			}
			default:
				await route.fulfill(error('NOT_FOUND', 404));
		}
	}

	private async rooms(route: Route, params: URLSearchParams): Promise<void> {
		if (this.roomsFail) {
			await route.fulfill(error('INTERNAL_ERROR', 500, { 'X-Request-Id': 'e2e-request-1' }));

			return;
		}

		const q = params.get('q')?.toLowerCase() ?? '';
		const status = params.get('status') ?? 'all';
		const features = (params.get('features') ?? '').split(',').filter((feature) => feature !== '');
		const items = this.options.rooms.filter((room) => {
			if (q.startsWith('rm_')) {
				return room.sid.toLowerCase() === q;
			}

			return (
				(status === 'all' || room.status === status) &&
				(q === '' || room.name.toLowerCase().startsWith(q)) &&
				(features.length === 0 ||
					features.some((feature) => room.features[feature as keyof RoomListItem['features']]))
			);
		});
		const body: ListResponse<RoomListItem> = {
			items,
			nextCursor: null,
			prevCursor: null,
			...(q.startsWith('rm_') ? { total: items.length } : this.options.roomsPage)
		};

		await route.fulfill({ json: body });
	}

	private async ingresses(route: Route, params: URLSearchParams): Promise<void> {
		const q = params.get('q')?.toLowerCase() ?? '';
		const status = params.get('status');
		const inputType = params.get('inputType');
		const items = (this.options.ingresses ?? []).filter((item) => {
			if (q.startsWith('in_')) {
				return item.ingressId.toLowerCase() === q;
			}

			return (
				(q === '' || (item.name ?? '').toLowerCase().startsWith(q)) &&
				(status === null || status === 'all' || item.status === status) &&
				(inputType === null || item.inputType === inputType)
			);
		});

		await route.fulfill({ json: { items, nextCursor: null, prevCursor: null, total: items.length } });
	}

	private async egresses(route: Route, params: URLSearchParams): Promise<void> {
		const q = params.get('q')?.toLowerCase() ?? '';
		const csv = (name: string) => (params.get(name) ?? '').split(',').filter((value) => value !== '');
		const [statuses, types] = [csv('status'), csv('type')];
		const room = params.get('room');
		const items = (this.options.egresses ?? []).filter((item) => {
			if (q.startsWith('eg_')) {
				return item.egressId.toLowerCase() === q;
			}

			return (
				(q === '' || (item.roomName ?? '').toLowerCase().startsWith(q)) &&
				(statuses.length === 0 || statuses.includes(item.status)) &&
				(types.length === 0 || types.includes(item.type)) &&
				(room === null || item.roomSid === room)
			);
		});

		await route.fulfill({ json: { items, nextCursor: null, prevCursor: null, total: items.length } });
	}

	/** Counts of the participant fixtures: STANDARD as participants, every other kind as services. */
	private participantsSummary(): ParticipantsSummary {
		const kinds = Object.values(ParticipantKind);
		const count = (items: readonly ParticipantListItem[]) =>
			Object.fromEntries(
				kinds.map((kind) => [kind, items.filter((item) => item.kind === kind).length])
			) as Record<ParticipantKind, number>;
		const active = count(this.options.participants.filter((item) => item.status === 'active'));
		const sessions = count(this.options.participants);
		const total = Object.values(active).reduce((sum, n) => sum + n, 0);

		return {
			active: { participants: active.STANDARD, services: total - active.STANDARD, byKind: active },
			sessions: { participants: sessions.STANDARD, byKind: sessions },
			approximate: false
		};
	}

	private async participants(route: Route, path: string, params: URLSearchParams): Promise<void> {
		const q = params.get('q')?.toLowerCase() ?? '';
		const kinds =
			path === 'agents' ? ['AGENT'] : (params.get('kind') ?? '').split(',').filter((kind) => kind !== '');
		const status = params.get('status');
		const room = params.get('room');
		const items = this.options.participants.filter((item) => {
			if (q.startsWith('pa_')) {
				return item.sid.toLowerCase() === q;
			}

			return (
				(q === '' || item.identity.toLowerCase().startsWith(q)) &&
				(kinds.length === 0 || kinds.includes(item.kind)) &&
				(status === null || item.status === status) &&
				(room === null || item.roomSid === room)
			);
		});

		await route.fulfill({ json: { items, nextCursor: null, prevCursor: null, total: items.length } });
	}

	private async login(route: Route): Promise<void> {
		switch (this.options.login) {
			case 'ok':
				this.signedIn = true;
				this.accessToken = `${TOKEN}-login`;
				await route.fulfill({ json: { accessToken: this.accessToken, expiresAt: EXPIRES_AT } });

				return;
			case 'invalid':
				await route.fulfill(error('INVALID_CREDENTIALS', 401));

				return;
			case 'rate-limited':
				await route.fulfill(error('RATE_LIMITED', 429, { 'Retry-After': String(this.options.retryAfter) }));

				return;
			default:
				await route.abort('connectionrefused');
		}
	}
}

export const test = base.extend<{ apiOptions: Partial<ApiOptions>; api: MockApi }>({
	apiOptions: [{}, { option: true }],
	api: [
		async ({ page, apiOptions }, use) => {
			const api = new MockApi(page, { ...DEFAULT_API, ...apiOptions });

			await api.install();
			await use(api);
		},
		{ auto: true }
	]
});

export { expect, type Page } from '@playwright/test';
