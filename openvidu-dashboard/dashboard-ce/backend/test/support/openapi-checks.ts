/** The parts of an OpenAPI document that `documentationIssues` checks. */
export interface CheckedDocument {
	info: { description?: string; license?: { name?: string } };
	servers?: { url: string }[];
	tags?: { name: string; description?: string }[];
	paths: Record<string, Record<string, CheckedOperation>>;
}

export interface CheckedOperation {
	operationId?: string;
	tags?: string[];
	parameters?: {
		name: string;
		in: string;
		description?: string;
		style?: string;
		explode?: boolean;
		schema?: { type?: string };
	}[];
	requestBody?: unknown;
	responses: Record<string, { content?: Record<string, { schema?: { $ref?: string } }> }>;
}

/**
 * Every break of the `api-conventions` rules of the OpenAPI document, one line each: metadata, unique operation IDs,
 * declared tags, described parameters, list parameters as `form` arrays, `ApiError` bodies, `400` only with input,
 * `If-None-Match` with `304`, and `403` only on the operations in `allowed403`.
 */
export function documentationIssues(document: CheckedDocument, allowed403: readonly string[] = []): string[] {
	const issues: string[] = [];
	const declared = new Map((document.tags ?? []).map((tag) => [tag.name, tag.description]));
	const usedTags = new Set<string>();
	const operationIds = new Set<string>();

	if (!document.info.description) {
		issues.push('info has no description');
	}

	if (!document.info.license?.name) {
		issues.push('info has no license');
	}

	if (document.servers?.length !== 1) {
		issues.push('the document needs exactly one server');
	}

	for (const [path, item] of Object.entries(document.paths)) {
		for (const [method, operation] of Object.entries(item)) {
			const name = `${method.toUpperCase()} ${path}`;
			const id = operation.operationId;

			if (id === undefined || id === '') {
				issues.push(`${name} has no operationId`);
			} else if (operationIds.has(id)) {
				issues.push(`${name} repeats the operationId ${id}`);
			} else {
				operationIds.add(id);
			}

			if ((operation.tags ?? []).length === 0) {
				issues.push(`${name} has no tags`);
			}

			for (const tag of operation.tags ?? []) {
				usedTags.add(tag);

				if (!declared.get(tag)) {
					issues.push(`${name} uses the tag ${tag}, not declared with a description`);
				}
			}

			const parameters = operation.parameters ?? [];

			for (const parameter of parameters) {
				if (!parameter.description) {
					issues.push(`${name} ${parameter.in} parameter ${parameter.name} has no description`);
				}

				if (
					parameter.in === 'query' &&
					parameter.schema?.type === 'array' &&
					(parameter.style !== 'form' || parameter.explode !== false)
				) {
					issues.push(`${name} list parameter ${parameter.name} is not a form array without explode`);
				}
			}

			const hasInput = parameters.some((parameter) => parameter.in !== 'header') || operation.requestBody;

			for (const [status, response] of Object.entries(operation.responses)) {
				if (Number(status) >= 400 && response.content?.['application/json']?.schema?.$ref === undefined) {
					issues.push(`${name} ${status} has no ApiError body`);
				}
			}

			if ('400' in operation.responses && !hasInput) {
				issues.push(`${name} declares 400 without any input`);
			}

			if ('403' in operation.responses && (id === undefined || !allowed403.includes(id))) {
				issues.push(`${name} declares 403`);
			}

			if (
				'304' in operation.responses &&
				!parameters.some((parameter) => parameter.in === 'header' && parameter.name === 'If-None-Match')
			) {
				issues.push(`${name} answers 304 without the If-None-Match parameter`);
			}
		}
	}

	for (const tag of declared.keys()) {
		if (!usedTags.has(tag)) {
			issues.push(`tag ${tag} has no operation`);
		}
	}

	return issues;
}
