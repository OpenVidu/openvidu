import type { ErrorRequestHandler, RequestHandler } from 'express';
import { errors as joseErrors } from 'jose';
import { ZodError } from 'zod';

import type { ApiError as ApiErrorBody, ErrorCode } from '@openvidu-dashboard/typings';

import type { Logger } from '../logging/logger.js';
import { ApiError } from './api-error.js';
import { zodIssues } from '../api/validation.js';

export function errorBody(code: ErrorCode, message: string, details?: Record<string, unknown>): ApiErrorBody {
	return { error: details === undefined ? { code, message } : { code, message, details } };
}

/** JSON 404 for `/api` paths no route answered, so the SPA fallback never serves them. */
export const apiNotFound: RequestHandler = (req, res) => {
	res.status(404).json(errorBody('NOT_FOUND', `No API route for ${req.method} ${req.path}`));
};

interface BodyParserError {
	type: string;
}

function isBodyParserError(error: unknown): error is BodyParserError {
	return typeof error === 'object' && error !== null && typeof (error as { type?: unknown }).type === 'string';
}

/** Maps every error to the envelope: API errors as thrown, validation 400, token 401, body 400, anything else 500. */
export function errorHandler(logger: Logger): ErrorRequestHandler {
	return (error: unknown, req, res, next) => {
		if (res.headersSent) {
			next(error);

			return;
		}

		const log = (req as { log?: Logger }).log ?? logger;
		let apiError: ApiError;

		if (error instanceof ApiError) {
			apiError = error;
		} else if (error instanceof ZodError) {
			apiError = ApiError.validation(zodIssues(error.issues));
		} else if (error instanceof joseErrors.JOSEError) {
			apiError = new ApiError('UNAUTHORIZED', 'Invalid access token', {
				reason: error instanceof joseErrors.JWTExpired ? 'expired' : 'invalid'
			});
		} else if (isBodyParserError(error) && error.type === 'entity.too.large') {
			apiError = new ApiError('VALIDATION_ERROR', 'The JSON body is larger than 1 MB');
		} else if (isBodyParserError(error) && error.type.startsWith('entity.')) {
			apiError = new ApiError('VALIDATION_ERROR', 'The body is not valid JSON');
		} else {
			log.error(`Unhandled error serving ${req.method} ${req.originalUrl}`, error);
			res.status(500).json(errorBody('INTERNAL_ERROR', 'Internal server error'));

			return;
		}

		if (apiError.code === 'UNAUTHORIZED') {
			res.setHeader('WWW-Authenticate', 'Bearer');
		}

		res.status(apiError.status).json(errorBody(apiError.code, apiError.message, apiError.details));
	};
}
