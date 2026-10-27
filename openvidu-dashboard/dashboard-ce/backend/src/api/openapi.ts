import { Router } from 'express';
import * as z from 'zod';
import {
	createDocument,
	type ZodOpenApiOperationObject,
	type ZodOpenApiPathsObject,
	type ZodOpenApiResponseObject
} from 'zod-openapi';

import { type Edition, ErrorCode } from '@openvidu-dashboard/typings';

import { REFRESH_COOKIE } from '../auth/cookies.js';
import type { RouteDefinition, RouteRegistry } from './route-registry.js';

const errorSchema = z
	.object({
		error: z.object({
			code: z.enum(Object.values(ErrorCode) as [ErrorCode, ...ErrorCode[]]),
			message: z.string(),
			details: z.record(z.string(), z.unknown()).optional()
		})
	})
	.meta({ id: 'ApiError' });

const ifNoneMatch = z.object({
	'If-None-Match': z
		.string()
		.optional()
		.meta({ description: 'ETag of a previous response; the server answers 304 while it still matches' })
});

const DESCRIPTION = `REST API of the OpenVidu Dashboard, read from the analytics database that the OpenVidu server writes.

**Authentication.** \`POST /api/v1/auth/login\` returns an access token valid for 15 minutes, sent as
\`Authorization: Bearer <token>\`, and sets the \`${REFRESH_COOKIE}\` cookie, scoped to the auth endpoints;
\`POST /api/v1/auth/refresh\` exchanges that cookie for a new access token.

**Time ranges.** \`from\` and \`to\` take an ISO 8601 instant with an offset or a relative expression (\`now\`,
\`now-<n>m|h|d\`, \`now/d\`, \`now/M\`), resolved in the IANA time zone \`tz\` (default \`UTC\`).

**Pagination.** Lists return \`items\`, the opaque cursors \`nextCursor\` and \`prevCursor\`, and \`total\`. Pass a
cursor back unchanged with the same filters; \`limit\` sets the page size.

**Errors.** Every error answers \`{ error: { code, message, details? } }\` (\`ApiError\`); a \`400\` lists the invalid
parameters in \`details.issues\`.

**Conditional requests.** A response with an \`ETag\` answers \`304\` to a matching \`If-None-Match\`.

**Request IDs.** Every response carries \`X-Request-Id\`: the one the request sent, or a generated one.

**Versioning.** Additive changes (new endpoints, optional parameters, response fields and enum values) stay in \`v1\`;
clients ignore unknown fields and enum values.`;

const APACHE_LICENSE: OpenApiLicense = { name: 'Apache 2.0', identifier: 'Apache-2.0' };

export interface OpenApiLicense {
	name: string;
	identifier?: string;
	url?: string;
}

export interface OpenApiOptions {
	version: string;
	/** Public base path of the dashboard, ending with `/`; default `/`. */
	basePath?: string;
	/** Default Apache 2.0. */
	license?: OpenApiLicense;
}

/** The object a parameter schema parses: the input of a transformed object (resolved ranges, for instance). */
function inputObject(schema: z.ZodType): z.ZodObject {
	return (schema instanceof z.ZodPipe ? inputObject(schema.in as z.ZodType) : schema) as z.ZodObject;
}

function security(route: RouteDefinition): Record<string, string[]>[] {
	switch (route.security) {
		case 'bearer':
			return [{ bearerAuth: [] }];
		case 'optional-bearer':
			return [{}, { bearerAuth: [] }];
		default:
			if (route.refreshCookie === undefined) {
				return [];
			}

			return route.refreshCookie === 'required' ? [{ refreshCookie: [] }] : [{}, { refreshCookie: [] }];
	}
}

function operation(route: RouteDefinition, edition: Edition): ZodOpenApiOperationObject {
	const responses: Record<string, ZodOpenApiResponseObject> = {};

	for (const [status, response] of Object.entries(route.responses)) {
		if (response.edition !== undefined && response.edition !== edition) {
			continue;
		}

		const content = response.schema
			? { [response.contentType ?? 'application/json']: { schema: response.schema } }
			: Number(status) >= 400
				? { 'application/json': { schema: errorSchema } }
				: undefined;

		responses[status] = {
			description: response.description,
			...(content ? { content } : {}),
			...(response.headers ? { headers: response.headers } : {})
		};
	}

	const errors: [string, string][] = [];

	if (route.request?.params || route.request?.query || route.request?.body) {
		errors.push(['400', 'Invalid request']);
	}

	if (route.security === 'bearer') {
		errors.push(['401', 'Missing, invalid or expired access token']);
	} else if (route.security === 'optional-bearer') {
		errors.push(['401', 'Invalid or expired access token']);
	}

	for (const [status, description] of errors) {
		responses[status] ??= { description, content: { 'application/json': { schema: errorSchema } } };
	}

	const conditional = '304' in responses;

	return {
		operationId: route.operationId,
		summary: route.summary,
		tags: route.tags,
		security: security(route),
		...(route.request?.params || route.request?.query || conditional
			? {
					requestParams: {
						...(route.request?.params ? { path: inputObject(route.request.params) } : {}),
						...(route.request?.query ? { query: inputObject(route.request.query) } : {}),
						...(conditional ? { header: ifNoneMatch } : {})
					}
				}
			: {}),
		...(route.request?.body
			? { requestBody: { content: { 'application/json': { schema: route.request.body } } } }
			: {}),
		responses
	};
}

function licenseObject(license: OpenApiLicense): { name: string; identifier?: string; url?: string } {
	return {
		name: license.name,
		...(license.identifier === undefined ? {} : { identifier: license.identifier }),
		...(license.url === undefined ? {} : { url: license.url })
	};
}

/** OpenAPI 3.1 document of every registered route, built from the schemas that validate them. */
export function openApiDocument(registry: RouteRegistry, options: OpenApiOptions): ReturnType<typeof createDocument> {
	const paths: ZodOpenApiPathsObject = {};
	const used = new Set<string>();

	for (const route of registry.list()) {
		const path = `/api/v1${route.path}`;

		paths[path] ??= {};
		paths[path][route.method] = operation(route, registry.edition);
		route.tags.forEach((tag) => used.add(tag));
	}

	const basePath = options.basePath ?? '/';
	const document = createDocument({
		openapi: '3.1.0',
		info: {
			title: 'OpenVidu Dashboard API',
			version: options.version,
			description: DESCRIPTION,
			license: licenseObject(options.license ?? APACHE_LICENSE)
		},
		servers: [{ url: basePath === '/' ? '/' : basePath.replace(/\/$/, '') }],
		tags: registry.tags().filter((tag) => used.has(tag.name)),
		components: {
			securitySchemes: {
				bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
				refreshCookie: {
					type: 'apiKey',
					in: 'cookie',
					name: REFRESH_COOKIE,
					description: 'Refresh token set by the login, readable only by the auth endpoints'
				}
			}
		},
		paths
	});

	liftParameterDocs(document);

	return document;
}

interface RenderedParameter {
	in: string;
	description?: string;
	style?: string;
	explode?: boolean;
	schema?: { description?: unknown; type?: unknown };
}

/**
 * zod-openapi keeps a description set before `.default()` or `.optional()` inside the parameter's schema; lift it to the
 * parameter. A query parameter rendered as an array is a comma-separated list (`csvParam`).
 */
function liftParameterDocs(document: ReturnType<typeof createDocument>): void {
	for (const item of Object.values(document.paths ?? {})) {
		for (const operation of Object.values(item as Record<string, { parameters?: RenderedParameter[] }>)) {
			for (const parameter of operation.parameters ?? []) {
				const description = parameter.schema?.description;

				if (parameter.description === undefined && typeof description === 'string') {
					parameter.description = description;
				}

				if (parameter.in === 'query' && parameter.schema?.type === 'array') {
					parameter.style = 'form';
					parameter.explode = false;
				}
			}
		}
	}
}

const SCALAR_PAGE = `<!doctype html>
<html>
	<head>
		<title>OpenVidu Dashboard API</title>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
	</head>
	<body>
		<div id="app"></div>
		<script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.74.0"></script>
		<script>
			Scalar.createApiReference('#app', { url: 'docs/openapi.json' });
		</script>
	</body>
</html>
`;

/** `GET /docs/openapi.json` and the browsable `GET /docs`, mounted under `/api/v1` outside production only. */
export function docsRouter(document: () => unknown): Router {
	const router = Router();

	router.get('/docs/openapi.json', (_req, res) => {
		res.json(document());
	});
	router.get('/docs', (_req, res) => {
		res.type('html').send(SCALAR_PAGE);
	});

	return router;
}
