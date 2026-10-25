import { randomUUID } from 'node:crypto';

import type { RequestHandler } from 'express';

import type { Logger } from '../logging/logger.js';

const REQUEST_ID = /^[A-Za-z0-9._-]{1,128}$/;

declare global {
	// Express merges these into every request.
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace Express {
		interface Request {
			/** `X-Request-Id` of the request, propagated from the proxy or generated. */
			id: string;
			/** Logger whose lines carry the request id. */
			log: Logger;
		}
	}
}

/** Sets the request id (incoming header when well formed, else a UUID), its response header and a child logger. */
export function requestContext(logger: Logger): RequestHandler {
	return (req, res, next) => {
		const incoming = req.get('X-Request-Id');

		req.id = incoming !== undefined && REQUEST_ID.test(incoming) ? incoming : randomUUID();
		req.log = logger.child({ requestId: req.id });
		res.setHeader('X-Request-Id', req.id);
		next();
	};
}
