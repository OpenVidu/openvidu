/** Codes of the error envelope; each maps to one HTTP status. */
export const ErrorCode = {
	VALIDATION_ERROR: 'VALIDATION_ERROR',
	/** A ranked (metric) sort on a range wider than its limit (`GET /info` `limits`). */
	SORT_RANGE_TOO_WIDE: 'SORT_RANGE_TOO_WIDE',
	UNAUTHORIZED: 'UNAUTHORIZED',
	INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
	FORBIDDEN: 'FORBIDDEN',
	PRO_FEATURE: 'PRO_FEATURE',
	INVALID_LICENSE: 'INVALID_LICENSE',
	NOT_FOUND: 'NOT_FOUND',
	CONFLICT: 'CONFLICT',
	RATE_LIMITED: 'RATE_LIMITED',
	INTERNAL_ERROR: 'INTERNAL_ERROR',
	NOT_READY: 'NOT_READY'
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/** HTTP status of each error code. */
export const ERROR_STATUS: Readonly<Record<ErrorCode, number>> = {
	VALIDATION_ERROR: 400,
	SORT_RANGE_TOO_WIDE: 400,
	UNAUTHORIZED: 401,
	INVALID_CREDENTIALS: 401,
	FORBIDDEN: 403,
	PRO_FEATURE: 403,
	INVALID_LICENSE: 403,
	NOT_FOUND: 404,
	CONFLICT: 409,
	RATE_LIMITED: 429,
	INTERNAL_ERROR: 500,
	NOT_READY: 503
};

/** One input that failed validation; `path` names the parameter or body property. */
export interface ValidationIssue {
	path: string[];
	message: string;
}

/** `details.reason` of an `UNAUTHORIZED` error. */
export const UnauthorizedReason = {
	MISSING: 'missing',
	INVALID: 'invalid',
	EXPIRED: 'expired'
} as const;
export type UnauthorizedReason = (typeof UnauthorizedReason)[keyof typeof UnauthorizedReason];

/** Body of every error answered under `/api`. */
export interface ApiError {
	error: {
		code: ErrorCode;
		/** English, for logs and developers; the UI maps `code` to its own text. */
		message: string;
		details?: Record<string, unknown>;
	};
}
