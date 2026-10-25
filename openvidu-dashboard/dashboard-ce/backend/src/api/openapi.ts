import { Router } from 'express';
import * as z from 'zod';
import {
	createDocument,
	type ZodOpenApiOperationObject,
	type ZodOpenApiPathsObject,
	type ZodOpenApiResponseObject
} from 'zod-openapi';

import { ErrorCode } from '@openvidu-dashboard/typings';

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

/** The object a parameter schema parses: the input of a transformed object (resolved ranges, for instance). */
function inputObject(schema: z.ZodType): z.ZodObject {
	return (schema instanceof z.ZodPipe ? inputObject(schema.in as z.ZodType) : schema) as z.ZodObject;
}

function operation(route: RouteDefinition, locked: boolean): ZodOpenApiOperationObject {
	const responses: Record<string, ZodOpenApiResponseObject> = {};

	for (const [status, response] of Object.entries(route.responses)) {
		responses[status] = {
			description: response.description,
			...(response.schema
				? { content: { [response.contentType ?? 'application/json']: { schema: response.schema } } }
				: {}),
			...(response.headers ? { headers: response.headers } : {})
		};
	}

	const errors: [string, string][] = [['400', 'Invalid request']];

	if (route.security !== 'public') {
		errors.push(['401', 'Missing, invalid or expired access token']);
	}

	if (route.edition === 'pro') {
		errors.push(['403', 'PRO feature on CE']);
	}

	for (const [status, description] of errors) {
		responses[status] ??= { description, content: { 'application/json': { schema: errorSchema } } };
	}

	const security =
		route.security === 'bearer'
			? [{ bearerAuth: [] }]
			: route.security === 'optional-bearer'
				? [{}, { bearerAuth: [] }]
				: [];

	return {
		summary: route.summary,
		tags: route.tags,
		security,
		...(locked ? { description: `PRO feature \`${route.feature ?? ''}\`: CE answers 403 PRO_FEATURE.` } : {}),
		...(route.request?.params || route.request?.query
			? {
					requestParams: {
						...(route.request.params ? { path: inputObject(route.request.params) } : {}),
						...(route.request.query ? { query: inputObject(route.request.query) } : {})
					}
				}
			: {}),
		...(route.request?.body
			? { requestBody: { content: { 'application/json': { schema: route.request.body } } } }
			: {}),
		responses: responses
	};
}

/** OpenAPI 3.1 document of every registered route, built from the schemas that validate them. */
export function openApiDocument(registry: RouteRegistry, version: string): ReturnType<typeof createDocument> {
	const paths: ZodOpenApiPathsObject = {};

	for (const route of registry.list()) {
		const path = `/api/v1${route.path}`;

		paths[path] ??= {};
		paths[path][route.method] = operation(route, registry.isLocked(route));
	}

	return createDocument({
		openapi: '3.1.0',
		info: { title: 'OpenVidu Dashboard API', version },
		components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
		paths
	});
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
