import { join } from 'node:path';

import cookieParser from 'cookie-parser';
import express, { type Express, type Router } from 'express';

import type { TrustProxy } from '../config/variables.js';
import type { Logger } from '../logging/logger.js';
import { apiNotFound, errorHandler } from './errors.js';
import { requestContext } from './request-context.js';

export interface HttpAppOptions {
	logger: Logger;
	/** Directory of the built SPA (`index.html` and its assets). */
	appRoot: string;
	trustProxy: TrustProxy;
	/** Routes mounted under `/api/v1`. */
	apiRouter: Router;
	/** Development-only documentation, mounted under `/api/v1` when present. */
	docsRouter?: Router;
}

export const JSON_BODY_LIMIT = '1mb';

/** Express application of the dashboard: API under `/api`, the SPA for every other GET and HEAD. */
export function createHttpApp(options: HttpAppOptions): Express {
	const app = express();

	app.disable('x-powered-by');
	app.set('trust proxy', options.trustProxy);

	app.get('/api/healthcheck', (_req, res) => {
		res.json({ status: 'ok' });
	});
	app.use('/api', requestContext(options.logger), express.json({ limit: JSON_BODY_LIMIT }), cookieParser());
	app.use('/api/v1', options.apiRouter);

	if (options.docsRouter) {
		app.use('/api/v1', options.docsRouter);
	}

	app.use('/api', apiNotFound);

	app.use(express.static(options.appRoot, { index: false, fallthrough: true }));
	const indexFile = join(options.appRoot, 'index.html');

	app.get('/{*splat}', (_req, res, next) => {
		res.sendFile(indexFile, (error) => {
			if (error) {
				next(error);
			}
		});
	});

	app.use(errorHandler(options.logger));

	return app;
}
