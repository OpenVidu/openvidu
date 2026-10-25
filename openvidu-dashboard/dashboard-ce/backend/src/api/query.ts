import * as z from 'zod';

import { SortOrder } from '@openvidu-dashboard/typings';

import { isTimeZone, resolveTimeExpression } from './time-expression.js';

export const DEFAULT_FROM = 'now-24h';
export const DEFAULT_TO = 'now';

/** IANA zone or `UTC`; default `UTC`. */
export const tzParam = z
	.string()
	.refine(isTimeZone, { error: 'must be an IANA time zone such as Europe/Madrid, or UTC' })
	.default('UTC')
	.meta({ description: 'IANA time zone for relative snapping and buckets', examples: ['Europe/Madrid'] });

const timeExpression = z
	.string()
	.meta({ description: 'ISO 8601 with offset, now, now-<n>m|h|d, now/d or now/M', examples: ['now-24h'] });

export const limitParam = z.coerce
	.number({ error: 'must be an integer between 1 and 100' })
	.int({ error: 'must be an integer between 1 and 100' })
	.min(1, { error: 'must be an integer between 1 and 100' })
	.max(100, { error: 'must be an integer between 1 and 100' })
	.default(25);

export const orderParam = z.enum([SortOrder.ASC, SortOrder.DESC], { error: 'must be asc or desc' });

/** Trimmed search text; empty means no search. */
export const qParam = z
	.string()
	.transform((value) => value.trim())
	.pipe(z.string().max(100, { error: 'must be at most 100 characters' }))
	.transform((value) => (value === '' ? undefined : value))
	.optional();

/**
 * Comma-separated values of an enumeration, e.g. `?kind=EGRESS,AGENT`; an unknown value is an issue on the parameter,
 * and so are a repeated value and an empty list when `strict`.
 */
export function csvParam<const T extends readonly [string, ...string[]]>(
	values: T,
	options: { strict?: boolean } = {}
) {
	const allowed = new Set<string>(values);
	const isAllowed = (item: string): item is T[number] => allowed.has(item);

	return z.string().transform((value, context) => {
		const items = value
			.split(',')
			.map((item) => item.trim())
			.filter((item) => item !== '');

		if (!items.every(isAllowed)) {
			const unknown = items.find((item) => !isAllowed(item)) ?? '';

			context.addIssue({
				code: 'custom',
				message: options.strict
					? `${unknown} is not one of ${values.join(', ')}`
					: `must be a comma-separated list of ${values.join(', ')}`
			});

			return z.NEVER;
		}

		if (options.strict && items.length === 0) {
			context.addIssue({ code: 'custom', message: 'must list at least one value' });

			return z.NEVER;
		}

		const repeated = items.find((item, index) => items.indexOf(item) !== index);

		if (options.strict && repeated !== undefined) {
			context.addIssue({ code: 'custom', message: `lists ${repeated} more than once` });

			return z.NEVER;
		}

		return items;
	});
}

export interface ResolvedRange {
	from: Date;
	to: Date;
	tz: string;
}

const rangeShape = { from: timeExpression.default(DEFAULT_FROM), to: timeExpression.default(DEFAULT_TO), tz: tzParam };

/** Resolves `from` and `to` at `instant`, adding an issue per invalid bound; `from` must be strictly before `to`. */
function resolveBounds(
	value: { from?: string | undefined; to?: string | undefined; tz: string },
	instant: Date,
	context: z.RefinementCtx
): { from?: Date; to?: Date } | undefined {
	const from = value.from === undefined ? undefined : resolveTimeExpression(value.from, instant, value.tz);
	const to = value.to === undefined ? undefined : resolveTimeExpression(value.to, instant, value.tz);
	let valid = true;

	if (value.from !== undefined && from === undefined) {
		context.addIssue({ code: 'custom', path: ['from'], message: 'is not a time expression' });
		valid = false;
	}

	if (value.to !== undefined && to === undefined) {
		context.addIssue({ code: 'custom', path: ['to'], message: 'is not a time expression' });
		valid = false;
	}

	if (valid && from !== undefined && to !== undefined && from.getTime() >= to.getTime()) {
		context.addIssue({ code: 'custom', path: ['from'], message: 'must be before to' });
		valid = false;
	}

	return valid ? { ...(from ? { from } : {}), ...(to ? { to } : {}) } : undefined;
}

interface RawBounds {
	from?: string | undefined;
	to?: string | undefined;
	tz: string;
}

/**
 * Query over a time range: `from`, `to` and `tz` resolved at `now()` when the request is parsed, plus the resource's
 * own parameters. OpenAPI documents the input object.
 */
export function rangedQuery<S extends z.core.$ZodLooseShape>(now: () => Date, shape: S) {
	const input = z.object({ ...rangeShape, ...shape });

	type Output = Omit<z.output<typeof input>, 'from' | 'to'> & { from: Date; to: Date; tz: string };

	return input.transform((value, context): Output => {
		const bounds = resolveBounds(value as RawBounds, now(), context);

		if (bounds?.from === undefined || bounds.to === undefined) {
			return z.NEVER;
		}

		return { ...(value as object), from: bounds.from, to: bounds.to } as Output;
	});
}

/** `from`, `to` and `tz` resolved at `now()`. */
export function timeRangeQuery(now: () => Date) {
	return rangedQuery(now, {}).transform(({ from, to, tz }): ResolvedRange => ({ from, to, tz }));
}

/**
 * Query of a series whose range defaults to its entity's lifetime: `from` and `to` are optional and resolved at
 * `now()` when given.
 */
export function optionalRangeQuery<S extends z.core.$ZodLooseShape>(now: () => Date, shape: S) {
	const input = z.object({ from: timeExpression.optional(), to: timeExpression.optional(), tz: tzParam, ...shape });

	type Output = Omit<z.output<typeof input>, 'from' | 'to'> & { from?: Date; to?: Date; tz: string };

	return input.transform((value, context): Output => {
		const bounds = resolveBounds(value as RawBounds, now(), context);

		if (bounds === undefined) {
			return z.NEVER;
		}

		const { from: _from, to: _to, ...rest } = value as RawBounds;

		return { ...rest, ...bounds } as Output;
	});
}
