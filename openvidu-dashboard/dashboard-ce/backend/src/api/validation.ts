import type { ValidationIssue } from '@openvidu-dashboard/typings';
import type { core, ZodType } from 'zod';

import { ApiError } from '../http/api-error.js';

export function zodIssues(issues: readonly core.$ZodIssue[]): ValidationIssue[] {
	return issues.map((issue) => ({ path: issue.path.map(String), message: issue.message }));
}

/** Parses one part of a request; every issue of every part ends up in one `VALIDATION_ERROR`. */
export function parsePart<T>(schema: ZodType<T>, value: unknown, issues: ValidationIssue[]): T | undefined {
	const result = schema.safeParse(value);

	if (result.success) {
		return result.data;
	}

	issues.push(...zodIssues(result.error.issues));

	return undefined;
}

export function throwIfInvalid(issues: ValidationIssue[]): void {
	if (issues.length > 0) {
		throw ApiError.validation(issues);
	}
}
