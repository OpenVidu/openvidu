import { HttpErrorResponse } from '@angular/common/http';
import { type ApiError, ErrorCode } from '@openvidu-dashboard/typings';

/** Codes the UI adds for failures without an error envelope. */
export type ClientErrorCode = 'NETWORK_ERROR' | 'TIMEOUT' | 'UNKNOWN_ERROR';

/** A failed API request: the envelope's code and details, the HTTP status and the `X-Request-Id` of the response. */
export class ApiRequestError extends Error {
	constructor(
		readonly status: number,
		readonly code: ErrorCode | ClientErrorCode,
		message: string,
		readonly details: Readonly<Record<string, unknown>> = {},
		readonly requestId?: string,
		/** Seconds from `Retry-After`, on `429`. */
		readonly retryAfter?: number
	) {
		super(message);
		this.name = 'ApiRequestError';
	}
}

function isEnvelope(body: unknown): body is ApiError {
	if (typeof body !== 'object' || body === null || !('error' in body)) {
		return false;
	}

	const { error } = body;

	return (
		typeof error === 'object' &&
		error !== null &&
		'code' in error &&
		Object.values<unknown>(ErrorCode).includes(error.code)
	);
}

/** Maps any failure of an API call to an `ApiRequestError`. */
export function toApiRequestError(error: unknown): ApiRequestError {
	if (error instanceof ApiRequestError) {
		return error;
	}

	if (!(error instanceof HttpErrorResponse)) {
		return new ApiRequestError(0, 'UNKNOWN_ERROR', error instanceof Error ? error.message : String(error));
	}

	const requestId = error.headers.get('X-Request-Id') ?? undefined;
	const retryHeader = Number(error.headers.get('Retry-After'));
	const retryAfter = Number.isFinite(retryHeader) && retryHeader > 0 ? retryHeader : undefined;

	if (error.status === 0) {
		return new ApiRequestError(0, 'NETWORK_ERROR', 'The server is unreachable', {}, requestId);
	}

	if (isEnvelope(error.error)) {
		const { code, message, details } = error.error.error;

		return new ApiRequestError(error.status, code, message, details ?? {}, requestId, retryAfter);
	}

	return new ApiRequestError(error.status, 'UNKNOWN_ERROR', error.message, {}, requestId, retryAfter);
}
