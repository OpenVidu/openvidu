import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { loadConfigFile } from '../../src/config/config-file.js';
import { LEGACY_VARIABLES, parseConfig, PRE_SCHEMA_VARIABLES, variablesSchema } from '../../src/config/variables.js';

const required = { ADMIN_USERNAME: 'admin', ADMIN_PASSWORD: 'secret' };

function valid(env: NodeJS.ProcessEnv) {
	const result = parseConfig(env);

	if (result.kind !== 'config') {
		throw new Error(`expected a configuration, got ${JSON.stringify(result)}`);
	}

	return result;
}

function invalid(env: NodeJS.ProcessEnv): string[] {
	const result = parseConfig(env);

	if (result.kind !== 'invalid') {
		throw new Error(`expected an invalid configuration, got ${result.kind}`);
	}

	return result.errors;
}

describe('configuration variables', () => {
	it('applies the defaults', () => {
		const { config, warnings } = valid({ ...required });
		expect(warnings).toEqual([]);
		expect(config).toEqual({
			port: 5000,
			logLevel: 'info',
			admin: { username: 'admin', password: 'secret' },
			database: { name: 'openvidu' },
			session: { refreshTokenTtlSeconds: 604_800, cookieSecure: 'auto' },
			http: { trustProxy: ['loopback', 'linklocal', 'uniquelocal'] },
			lists: { totalMaxRangeMs: 7 * 86_400_000 },
			analytics: { cacheTtlSeconds: 60 }
		});
	});

	it('reads every variable', () => {
		const { config } = valid({
			...required,
			SERVER_PORT: '6000',
			LOG_LEVEL: 'DEBUG',
			DATABASE_URL: 'mongodb://db:27017',
			DATABASE_NAME: 'analytics',
			DATABASE_TLS_CA_FILE: '/certs/ca.pem',
			MONGO_NODES: 'm1,m2',
			MONGO_PORT: '27017',
			MONGO_ADMIN_USERNAME: 'root',
			MONGO_ADMIN_PASSWORD: 'pw',
			MONGO_REPLICA_SET_NAME: 'rs0',
			DASHBOARD_JWT_SECRET: 'x'.repeat(48),
			DASHBOARD_REFRESH_TOKEN_TTL: '43200',
			DASHBOARD_COOKIE_SECURE: 'false'
		});
		expect(config.port).toBe(6000);
		expect(config.logLevel).toBe('debug');
		expect(config.database).toEqual({
			name: 'analytics',
			url: 'mongodb://db:27017',
			tlsCaFile: '/certs/ca.pem',
			nodes: 'm1,m2',
			port: '27017',
			username: 'root',
			password: 'pw',
			replicaSet: 'rs0'
		});
		expect(config.session).toEqual({
			jwtSecret: 'x'.repeat(48),
			refreshTokenTtlSeconds: 43_200,
			cookieSecure: 'false'
		});
	});

	it.each([
		['ADMIN_USERNAME unset', { ADMIN_PASSWORD: 'secret' }, 'ADMIN_USERNAME is required'],
		['ADMIN_PASSWORD empty', { ADMIN_USERNAME: 'admin', ADMIN_PASSWORD: '  ' }, 'ADMIN_PASSWORD is required'],
		['port not a number', { ...required, SERVER_PORT: 'http' }, 'SERVER_PORT ("http") must be a TCP port'],
		['port out of range', { ...required, SERVER_PORT: '70000' }, 'SERVER_PORT ("70000") must be a TCP port'],
		[
			'TTL not a number',
			{ ...required, DASHBOARD_REFRESH_TOKEN_TTL: 'soon' },
			'DASHBOARD_REFRESH_TOKEN_TTL ("soon") must be a positive integer of seconds'
		],
		[
			'TTL zero',
			{ ...required, DASHBOARD_REFRESH_TOKEN_TTL: '0' },
			'DASHBOARD_REFRESH_TOKEN_TTL ("0") must be a positive integer of seconds'
		],
		[
			'cookie mode',
			{ ...required, DASHBOARD_COOKIE_SECURE: 'yes' },
			'DASHBOARD_COOKIE_SECURE ("yes") must be auto, true or false'
		]
	])('rejects %s', (_name, env, message) => {
		expect(invalid(env)).toContain(message);
	});

	it.each([
		[
			'secret under 32 bytes',
			{ ...required, DASHBOARD_JWT_SECRET: 'short' },
			'DASHBOARD_JWT_SECRET must be at least 32 bytes'
		],
		[
			'trust proxy true',
			{ ...required, DASHBOARD_TRUST_PROXY: 'true' },
			'DASHBOARD_TRUST_PROXY ("true") must not be true: any client could then choose its own address'
		],
		[
			'trust proxy entry',
			{ ...required, DASHBOARD_TRUST_PROXY: 'loopback, proxy.local' },
			'DASHBOARD_TRUST_PROXY ("loopback, proxy.local") must be false, a hop count, or a list of addresses, CIDRs, loopback, linklocal and uniquelocal'
		],
		[
			'trust proxy CIDR',
			{ ...required, DASHBOARD_TRUST_PROXY: '10.0.0.0/33' },
			'DASHBOARD_TRUST_PROXY ("10.0.0.0/33") must be false, a hop count, or a list of addresses, CIDRs, loopback, linklocal and uniquelocal'
		],
		[
			'base path',
			{ ...required, DASHBOARD_BASE_PATH: 'dashboard' },
			'DASHBOARD_BASE_PATH ("dashboard") must be a path starting with /'
		],
		[
			'total range',
			{ ...required, DASHBOARD_LIST_TOTAL_MAX_RANGE: '1w' },
			'DASHBOARD_LIST_TOTAL_MAX_RANGE ("1w") must be a duration such as 30m, 24h or 7d'
		],
		[
			'analytics cache TTL',
			{ ...required, DASHBOARD_ANALYTICS_CACHE_TTL: '1.5' },
			'DASHBOARD_ANALYTICS_CACHE_TTL ("1.5") must be a non-negative integer of seconds'
		]
	])('rejects %s', (_name, env, message) => {
		expect(invalid(env)).toContain(message);
	});

	it('reads the proxy, base path and total range settings', () => {
		const read = (env: NodeJS.ProcessEnv) => valid({ ...required, ...env }).config.http;

		expect(read({ DASHBOARD_TRUST_PROXY: 'false' }).trustProxy).toBe(false);
		expect(read({ DASHBOARD_TRUST_PROXY: '2' }).trustProxy).toBe(2);
		expect(read({ DASHBOARD_TRUST_PROXY: 'loopback, 10.0.0.0/8, fd00::/8, 192.168.1.10' }).trustProxy).toEqual([
			'loopback',
			'10.0.0.0/8',
			'fd00::/8',
			'192.168.1.10'
		]);
		expect(read({ DASHBOARD_BASE_PATH: '/admin' }).basePath).toBe('/admin/');
		expect(valid({ ...required, DASHBOARD_LIST_TOTAL_MAX_RANGE: '24h' }).config.lists.totalMaxRangeMs).toBe(
			86_400_000
		);
		expect(valid({ ...required, DASHBOARD_JWT_SECRET: 'x'.repeat(32) }).config.session.jwtSecret).toHaveLength(32);
		expect(valid(required).config.analytics.cacheTtlSeconds).toBe(60);
		expect(valid({ ...required, DASHBOARD_ANALYTICS_CACHE_TTL: '0' }).config.analytics.cacheTtlSeconds).toBe(0);
	});

	it('reports every invalid variable and never echoes secrets', () => {
		const errors = invalid({
			ADMIN_USERNAME: 'admin',
			ADMIN_PASSWORD: '',
			SERVER_PORT: 'x',
			DASHBOARD_JWT_SECRET: ''
		});
		expect(errors).toHaveLength(2);
		expect(errors.join('\n')).not.toContain('""');
	});

	it('stops before validating anything when MongoDB is disabled', () => {
		expect(parseConfig({ MONGO_ENABLED: 'false' })).toEqual({ kind: 'mongo-disabled' });
		expect(parseConfig({ MONGO_ENABLED: 'no' })).toEqual({ kind: 'mongo-disabled' });
		expect(parseConfig({ ...required, MONGO_ENABLED: 'TRUE' }).kind).toBe('config');
	});

	it('falls back to info on an unknown log level', () => {
		const { config, warnings } = valid({ ...required, LOG_LEVEL: 'loud' });
		expect(config.logLevel).toBe('info');
		expect(warnings).toEqual(['LOG_LEVEL "loud" is not a log level; using info']);
	});

	it('names every variable after the legacy list or the DASHBOARD_ and DATABASE_ prefixes', () => {
		const names = [...Object.keys(variablesSchema.shape), ...PRE_SCHEMA_VARIABLES];
		const legacy: readonly string[] = LEGACY_VARIABLES;

		for (const name of names) {
			expect(legacy.includes(name) || name.startsWith('DASHBOARD_') || name.startsWith('DATABASE_'), name).toBe(
				true
			);
		}
	});
});

describe('configuration file', () => {
	function file(content: string): string {
		const path = join(mkdtempSync(join(tmpdir(), 'dashboard-config-')), 'dashboard.env');
		writeFileSync(path, content);

		return path;
	}

	it('loads values the environment does not set', () => {
		const env: NodeJS.ProcessEnv = { DASHBOARD_CONFIG_PATH: file('ADMIN_PASSWORD=secret\nSERVER_PORT=7000\n') };
		expect(loadConfigFile(env)).toMatchObject({ kind: 'loaded', applied: ['ADMIN_PASSWORD', 'SERVER_PORT'] });
		expect(env.ADMIN_PASSWORD).toBe('secret');
	});

	it('keeps the environment over the file', () => {
		const env: NodeJS.ProcessEnv = { DASHBOARD_CONFIG_PATH: file('SERVER_PORT=7000\n'), SERVER_PORT: '5000' };
		loadConfigFile(env);
		expect(env.SERVER_PORT).toBe('5000');
	});

	it('reports a missing file', () => {
		expect(loadConfigFile({ DASHBOARD_CONFIG_PATH: '/nonexistent/dashboard.env' })).toEqual({
			kind: 'missing',
			path: '/nonexistent/dashboard.env'
		});
		expect(loadConfigFile({})).toEqual({ kind: 'none' });
	});
});
