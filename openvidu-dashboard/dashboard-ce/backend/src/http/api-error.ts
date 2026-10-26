import { ERROR_STATUS, type ErrorCode, type ValidationIssue } from '@openvidu-dashboard/typings';

/** An error answered with the API error envelope; handlers throw it and the error middleware sends it. */
export class ApiError extends Error {
	constructor(
		readonly code: ErrorCode,
		message: string,
		readonly details?: Record<string, unknown>
	) {
		super(message);
		this.name = 'ApiError';
	}

	get status(): number {
		return ERROR_STATUS[this.code];
	}

	static validation(issues: ValidationIssue[]): ApiError {
		return new ApiError('VALIDATION_ERROR', 'Invalid request', { issues });
	}
}
