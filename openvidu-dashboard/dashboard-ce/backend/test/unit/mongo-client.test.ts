import { chmodSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { mongoClientOptions, resolveMongoUrl } from '../../src/mongo/mongo-client.js';

const composition = { nodes: 'mongo1,mongo2', port: '27017', username: 'root', password: 'pw', replicaSet: 'rs0' };

describe('MongoDB connection settings', () => {
	it('prefers DATABASE_URL', () => {
		expect(resolveMongoUrl({ name: 'openvidu', url: 'mongodb://db', ...composition })).toEqual({
			kind: 'url',
			url: 'mongodb://db'
		});
	});

	it('composes the URL from the MONGO_* variables', () => {
		expect(resolveMongoUrl({ name: 'openvidu', ...composition })).toEqual({
			kind: 'url',
			url: 'mongodb://root:pw@mongo1:27017,mongo2:27017/?replicaSet=rs0&readPreference=primaryPreferred'
		});
	});

	it('lists every missing composition variable', () => {
		expect(resolveMongoUrl({ name: 'openvidu', nodes: 'mongo1', replicaSet: 'rs0' })).toEqual({
			kind: 'missing',
			variables: ['MONGO_PORT', 'MONGO_ADMIN_USERNAME', 'MONGO_ADMIN_PASSWORD']
		});
	});

	it('switches TLS on with a readable CA file and fails on an unreadable one', () => {
		const dir = mkdtempSync(join(tmpdir(), 'dashboard-ca-'));
		const ca = join(dir, 'ca.pem');
		writeFileSync(ca, 'not checked here');
		expect(mongoClientOptions({ name: 'openvidu', tlsCaFile: ca })).toMatchObject({ tls: true, tlsCAFile: ca });
		expect(() => mongoClientOptions({ name: 'openvidu', tlsCaFile: join(dir, 'missing.pem') })).toThrow();

		if (process.getuid?.() !== 0) {
			chmodSync(ca, 0o000);
			expect(() => mongoClientOptions({ name: 'openvidu', tlsCaFile: ca })).toThrow();
		}

		expect(mongoClientOptions({ name: 'openvidu' }).tls).toBeUndefined();
	});
});
