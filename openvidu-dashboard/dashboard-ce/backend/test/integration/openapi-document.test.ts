import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';

import { ParticipantKind } from '@openvidu-dashboard/typings';

import { bootClient, type Client, json } from '../support/api-client.js';
import { type CheckedDocument, documentationIssues } from '../support/openapi-checks.js';

const mongoUri = inject('mongoUri');

/** The operations that may answer `403`: PRO metrics, dimensions and node scopes on CE. */
const CE_403 = ['getAnalyticsSeries', 'getAnalyticsBreakdowns', 'getAnalyticsSummary', 'exportAnalyticsCsv'];

interface Operation {
	security: Record<string, string[]>[];
	parameters?: { name: string; in: string; style?: string; explode?: boolean; schema: unknown }[];
	responses: Record<string, { headers?: Record<string, unknown> }>;
}

describe.skipIf(mongoUri === '')('OpenAPI document', () => {
	let ce: Client;
	let document: CheckedDocument & {
		servers: { url: string }[];
		paths: Record<string, Record<string, Operation>>;
		components: { securitySchemes: Record<string, unknown> };
	};

	beforeAll(async () => {
		ce = await bootClient(mongoUri, { NODE_ENV: 'development' });
		document = await json(ce, '/docs/openapi.json');
	});

	afterAll(async () => {
		await ce.dashboard.stop();
	});

	it('documents every operation by the api-conventions rules', () => {
		expect(documentationIssues(document, CE_403)).toEqual([]);
		expect(document.servers).toEqual([{ url: '/' }]);
	});

	it('documents the refresh cookie of the auth routes', () => {
		const refresh = document.paths['/api/v1/auth/refresh']?.post;
		const logout = document.paths['/api/v1/auth/logout']?.post;

		expect(document.components.securitySchemes.refreshCookie).toMatchObject({
			type: 'apiKey',
			in: 'cookie',
			name: 'ov_dashboard_refresh'
		});
		expect(refresh?.security).toEqual([{ refreshCookie: [] }]);
		expect(logout?.security).toEqual([{}, { refreshCookie: [] }]);
		expect(Object.keys(refresh?.responses['200']?.headers ?? {})).toEqual(['Set-Cookie']);
		expect(Object.keys(refresh?.responses['401']?.headers ?? {})).toEqual(['Set-Cookie']);
	});

	it('documents list parameters as arrays and conditional requests', () => {
		const kind = document.paths['/api/v1/participants']?.get?.parameters?.find(
			(parameter) => parameter.name === 'kind'
		);
		const overview = document.paths['/api/v1/overview']?.get;

		expect(kind).toMatchObject({
			style: 'form',
			explode: false,
			schema: {
				type: 'array',
				items: { type: 'string', enum: Object.values(ParticipantKind) }
			}
		});
		expect(overview?.parameters?.map((parameter) => `${parameter.in}:${parameter.name}`)).toContain(
			'header:If-None-Match'
		);
		expect(Object.keys(document.paths['/api/v1/health']?.get?.responses ?? {})).toEqual(['200']);
	});
});
