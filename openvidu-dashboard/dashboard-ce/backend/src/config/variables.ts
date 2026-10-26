import { isIP } from 'node:net';

import * as z from 'zod';

import { compact } from '../util/compact.js';

/** Variables read by OpenVidu Dashboard 3.9, kept with the same names and meaning. */
export const LEGACY_VARIABLES = [
	'SERVER_PORT',
	'ADMIN_USERNAME',
	'ADMIN_PASSWORD',
	'MONGO_ENABLED',
	'DATABASE_URL',
	'DATABASE_NAME',
	'MONGO_NODES',
	'MONGO_PORT',
	'MONGO_ADMIN_USERNAME',
	'MONGO_ADMIN_PASSWORD',
	'MONGO_REPLICA_SET_NAME',
	'DASHBOARD_CONFIG_PATH',
	'LOG_LEVEL'
] as const;

export const LOG_LEVELS = ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export const COOKIE_SECURE_MODES = ['auto', 'true', 'false'] as const;
export type CookieSecureMode = (typeof COOKIE_SECURE_MODES)[number];

const optionalText = z
	.string()
	.optional()
	.transform((value) => (value === undefined || value.trim() === '' ? undefined : value));

const requiredText = z.string({ error: 'is required' }).trim().min(1, { error: 'is required' });

/** Express `trust proxy` setting: `false`, a hop count, or addresses, CIDRs and the Express subnet names. */
export type TrustProxy = false | number | string[];

const TRUST_PROXY_NAMES = ['loopback', 'linklocal', 'uniquelocal'];

function isTrustProxyEntry(entry: string): boolean {
	if (TRUST_PROXY_NAMES.includes(entry)) {
		return true;
	}

	const [address = '', prefix, ...rest] = entry.split('/');
	const family = isIP(address);

	if (family === 0 || rest.length > 0) {
		return false;
	}

	if (prefix === undefined) {
		return true;
	}

	const bits = Number(prefix);

	return Number.isInteger(bits) && bits >= 0 && bits <= (family === 4 ? 32 : 128);
}

const trustProxy = z
	.string()
	.optional()
	.transform((value, context): TrustProxy => {
		const text = (value ?? '').trim();

		if (text === '') {
			return [...TRUST_PROXY_NAMES];
		}

		if (text === 'true') {
			context.addIssue({
				code: 'custom',
				message: 'must not be true: any client could then choose its own address'
			});

			return z.NEVER;
		}

		if (text === 'false') {
			return false;
		}

		if (/^\d+$/.test(text)) {
			return Number(text);
		}

		const entries = text.split(',').map((entry) => entry.trim());

		if (entries.some((entry) => !isTrustProxyEntry(entry))) {
			context.addIssue({
				code: 'custom',
				message:
					'must be false, a hop count, or a list of addresses, CIDRs, loopback, linklocal and uniquelocal'
			});

			return z.NEVER;
		}

		return entries;
	});

const DURATION_UNITS_MS = { m: 60_000, h: 3_600_000, d: 86_400_000 } as const;

/** `<n>m`, `<n>h` or `<n>d` as milliseconds. */
const duration = z
	.string()
	.regex(/^[1-9]\d*[mhd]$/, { error: 'must be a duration such as 30m, 24h or 7d' })
	.transform(
		(value) => Number(value.slice(0, -1)) * DURATION_UNITS_MS[value.slice(-1) as keyof typeof DURATION_UNITS_MS]
	);

/** A URL path starting with `/`, normalized to end with `/`. */
const basePath = optionalText.pipe(
	z
		.string()
		.regex(/^\/[^\s?#]*$/, { error: 'must be a path starting with /' })
		.transform((value) => (value.endsWith('/') ? value : `${value}/`))
		.optional()
);

const port = z.coerce
	.number({ error: 'must be a TCP port' })
	.int({ error: 'must be a TCP port' })
	.min(1, { error: 'must be a TCP port' })
	.max(65_535, { error: 'must be a TCP port' });

/**
 * Every configuration variable, keyed by its environment name. New variables are prefixed `DASHBOARD_`, or
 * `DATABASE_` for database connection settings.
 */
export const variablesSchema = z.object({
	SERVER_PORT: port.default(5000),
	ADMIN_USERNAME: requiredText,
	ADMIN_PASSWORD: requiredText,
	DATABASE_URL: optionalText,
	DATABASE_NAME: optionalText.transform((value) => value ?? 'openvidu'),
	DATABASE_TLS_CA_FILE: optionalText,
	MONGO_NODES: optionalText,
	MONGO_PORT: optionalText,
	MONGO_ADMIN_USERNAME: optionalText,
	MONGO_ADMIN_PASSWORD: optionalText,
	MONGO_REPLICA_SET_NAME: optionalText,
	DASHBOARD_JWT_SECRET: optionalText.refine((value) => value === undefined || Buffer.byteLength(value) >= 32, {
		error: 'must be at least 32 bytes'
	}),
	DASHBOARD_REFRESH_TOKEN_TTL: z.coerce
		.number({ error: 'must be a positive integer of seconds' })
		.int({ error: 'must be a positive integer of seconds' })
		.positive({ error: 'must be a positive integer of seconds' })
		.default(604_800),
	DASHBOARD_COOKIE_SECURE: z.enum(COOKIE_SECURE_MODES, { error: 'must be auto, true or false' }).default('auto'),
	DASHBOARD_TRUST_PROXY: trustProxy,
	DASHBOARD_BASE_PATH: basePath,
	DASHBOARD_LIST_TOTAL_MAX_RANGE: duration.default(7 * DURATION_UNITS_MS.d),
	DASHBOARD_ANALYTICS_CACHE_TTL: z.coerce
		.number({ error: 'must be a non-negative integer of seconds' })
		.int({ error: 'must be a non-negative integer of seconds' })
		.min(0, { error: 'must be a non-negative integer of seconds' })
		.default(60)
});

export type Variables = z.output<typeof variablesSchema>;

/** Names read outside the schema: before parsing (`DASHBOARD_CONFIG_PATH`, `MONGO_ENABLED`) or leniently (`LOG_LEVEL`). */
export const PRE_SCHEMA_VARIABLES = ['DASHBOARD_CONFIG_PATH', 'MONGO_ENABLED', 'LOG_LEVEL'] as const;

export interface DashboardConfig {
	port: number;
	logLevel: LogLevel;
	admin: { username: string; password: string };
	database: {
		name: string;
		url?: string;
		tlsCaFile?: string;
		nodes?: string;
		port?: string;
		username?: string;
		password?: string;
		replicaSet?: string;
	};
	session: { jwtSecret?: string; refreshTokenTtlSeconds: number; cookieSecure: CookieSecureMode };
	http: { trustProxy: TrustProxy; basePath?: string };
	lists: { totalMaxRangeMs: number };
	/** Seconds the aggregates of completed rollup documents are kept in memory (0 disables the cache). */
	analytics: { cacheTtlSeconds: number };
}

export type ConfigResult =
	| { kind: 'config'; config: DashboardConfig; warnings: string[] }
	| { kind: 'mongo-disabled' }
	| { kind: 'invalid'; errors: string[]; warnings: string[] };

/** True unless `MONGO_ENABLED` is set to something other than `true`, as in 3.9. */
export function isMongoEnabled(env: NodeJS.ProcessEnv): boolean {
	const value = env.MONGO_ENABLED;

	return value === undefined || value.toLowerCase() === 'true';
}

/** `<NAME> ("<value>") <message>` per issue of `error`, without the values of passwords and secrets. */
export function variableErrors(env: NodeJS.ProcessEnv, error: z.ZodError): string[] {
	return error.issues.map((issue) => {
		const name = String(issue.path[0] ?? 'configuration');
		const value = env[name];
		const shown =
			value === undefined || name.includes('PASSWORD') || name.includes('SECRET') ? '' : ` ("${value}")`;

		return `${name}${shown} ${issue.message}`;
	});
}

/** Reads the configuration from the environment; every invalid variable is reported, not only the first. */
export function parseConfig(env: NodeJS.ProcessEnv): ConfigResult {
	if (!isMongoEnabled(env)) {
		return { kind: 'mongo-disabled' };
	}

	const warnings: string[] = [];
	const rawLevel = env.LOG_LEVEL?.trim().toLowerCase();
	let logLevel: LogLevel = 'info';

	if (rawLevel) {
		if ((LOG_LEVELS as readonly string[]).includes(rawLevel)) {
			logLevel = rawLevel as LogLevel;
		} else {
			warnings.push(`LOG_LEVEL "${env.LOG_LEVEL ?? ''}" is not a log level; using info`);
		}
	}

	const result = variablesSchema.safeParse(env);

	if (!result.success) {
		return { kind: 'invalid', errors: variableErrors(env, result.error), warnings };
	}

	const v = result.data;

	return {
		kind: 'config',
		warnings,
		config: {
			port: v.SERVER_PORT,
			logLevel,
			admin: { username: v.ADMIN_USERNAME, password: v.ADMIN_PASSWORD },
			database: compact<DashboardConfig['database']>({
				name: v.DATABASE_NAME,
				url: v.DATABASE_URL,
				tlsCaFile: v.DATABASE_TLS_CA_FILE,
				nodes: v.MONGO_NODES,
				port: v.MONGO_PORT,
				username: v.MONGO_ADMIN_USERNAME,
				password: v.MONGO_ADMIN_PASSWORD,
				replicaSet: v.MONGO_REPLICA_SET_NAME
			}),
			session: compact<DashboardConfig['session']>({
				jwtSecret: v.DASHBOARD_JWT_SECRET,
				refreshTokenTtlSeconds: v.DASHBOARD_REFRESH_TOKEN_TTL,
				cookieSecure: v.DASHBOARD_COOKIE_SECURE
			}),
			http: compact<DashboardConfig['http']>({
				trustProxy: v.DASHBOARD_TRUST_PROXY,
				basePath: v.DASHBOARD_BASE_PATH
			}),
			lists: { totalMaxRangeMs: v.DASHBOARD_LIST_TOTAL_MAX_RANGE },
			analytics: { cacheTtlSeconds: v.DASHBOARD_ANALYTICS_CACHE_TTL }
		}
	};
}
