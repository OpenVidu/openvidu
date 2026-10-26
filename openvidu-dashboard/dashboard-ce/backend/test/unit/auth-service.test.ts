import { decodeJwt, SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';

import { AuthService, hashToken } from '../../src/auth/auth-service.js';
import type { SessionDocument, SessionRepository } from '../../src/auth/session-repository.js';
import { ApiError } from '../../src/http/api-error.js';
import { silentLogger } from '../support/silent-logger.js';

/** In-memory twin of SessionRepository with the same rotation semantics. */
class MemorySessions {
	readonly documents: SessionDocument[] = [];

	ensureIndexes(): Promise<void> {
		return Promise.resolve();
	}

	insert(session: SessionDocument): Promise<void> {
		this.documents.push({ ...session });

		return Promise.resolve();
	}

	rotate(tokenHash: string, at: Date): Promise<SessionDocument | null> {
		const session = this.documents.find((document) => document.tokenHash === tokenHash);

		if (!session) {
			return Promise.resolve(null);
		}

		const before = { ...session };

		session.rotatedAt ??= at;

		return Promise.resolve(before);
	}

	findByHash(tokenHash: string): Promise<SessionDocument | null> {
		return Promise.resolve(this.documents.find((document) => document.tokenHash === tokenHash) ?? null);
	}

	revokeFamily(familyId: string, at: Date): Promise<void> {
		for (const document of this.documents) {
			if (document.familyId === familyId) {
				document.revokedAt ??= at;
			}
		}

		return Promise.resolve();
	}
}

const KEY = new TextEncoder().encode('k'.repeat(32));

function service(now: () => Date, logger = silentLogger()) {
	const sessions = new MemorySessions();
	const auth = new AuthService({
		username: 'admin',
		password: 'secret',
		edition: 'ce',
		key: KEY,
		refreshTokenTtlSeconds: 604_800,
		sessions: sessions as unknown as SessionRepository,
		logger,
		now
	});

	return { auth, sessions, logger };
}

async function reason(promise: Promise<unknown>): Promise<unknown> {
	try {
		await promise;
	} catch (error) {
		return error instanceof ApiError ? error.details?.reason : error;
	}

	return 'resolved';
}

describe('auth service', () => {
	it('checks both credentials', () => {
		const { auth } = service(() => new Date());

		expect(auth.checkCredentials('admin', 'secret')).toBe(true);
		expect(auth.checkCredentials('admin', 'wrong')).toBe(false);
		expect(auth.checkCredentials('root', 'secret')).toBe(false);
		expect(auth.checkCredentials('', '')).toBe(false);
	});

	it('issues 15-minute HS256 tokens with the claims of the spec', async () => {
		const { auth } = service(() => new Date('2026-10-13T12:00:00Z'));
		const { accessToken, expiresAt } = await auth.issueAccessToken();

		expect(decodeJwt(accessToken)).toEqual({ sub: 'admin', iat: 1_791_892_800, exp: 1_791_893_700, edition: 'ce' });
		expect(expiresAt).toBe('2026-10-13T12:15:00.000Z');
	});

	it('rejects tokens signed with another key, with alg none and expired ones', async () => {
		let now = new Date('2026-10-13T12:00:00Z');
		const { auth } = service(() => now);
		const { accessToken } = await auth.issueAccessToken();
		const forged = await new SignJWT({ edition: 'ce' })
			.setProtectedHeader({ alg: 'HS256' })
			.setSubject('admin')
			.setIssuedAt()
			.setExpirationTime('15m')
			.sign(new TextEncoder().encode('x'.repeat(32)));
		const [header, payload] = accessToken.split('.');
		const unsigned = `${Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url')}.${payload ?? ''}.`;

		expect((await auth.verifyAccessToken(accessToken)).username).toBe('admin');
		expect(await reason(auth.verifyAccessToken(forged))).toBe('invalid');
		expect(await reason(auth.verifyAccessToken(unsigned))).toBe('invalid');
		expect(header).toBeDefined();
		now = new Date('2026-10-13T12:16:00Z');
		expect(await reason(auth.verifyAccessToken(accessToken))).toBe('expired');
	});

	it('logs in, rotates and stores only token hashes', async () => {
		const { auth, sessions } = service(() => new Date('2026-10-13T12:00:00Z'));
		const login = await auth.login('admin', 'secret', { ip: '203.0.113.9', userAgent: 'test' });

		expect(login).not.toBeNull();
		expect(await auth.login('admin', 'nope', {})).toBeNull();

		const rotated = await auth.refresh(login?.refreshToken, {});

		expect(rotated.refreshToken).not.toBe(login?.refreshToken);
		expect(sessions.documents).toHaveLength(2);
		expect(sessions.documents.every((document) => document.familyId === sessions.documents[0]?.familyId)).toBe(
			true
		);
		expect(JSON.stringify(sessions.documents)).not.toContain(login?.refreshToken ?? '?');
		expect(sessions.documents[0]?.tokenHash).toBe(hashToken(login?.refreshToken ?? ''));
	});

	it('treats a second refresh within 10 seconds as a concurrent one', async () => {
		let now = new Date('2026-10-13T12:00:00Z');
		const { auth } = service(() => now);
		const login = await auth.login('admin', 'secret', {});
		const first = await auth.refresh(login?.refreshToken, {});

		now = new Date('2026-10-13T12:00:01Z');
		const second = await auth.refresh(login?.refreshToken, {});

		expect(await auth.refresh(first.refreshToken, {})).toBeDefined();
		expect(await auth.refresh(second.refreshToken, {})).toBeDefined();
	});

	it('revokes the family when a rotated token is replayed after the grace window', async () => {
		let now = new Date('2026-10-13T12:00:00Z');
		const { auth, logger } = service(() => now);
		const login = await auth.login('admin', 'secret', {});
		const successor = await auth.refresh(login?.refreshToken, {});

		now = new Date('2026-10-13T12:05:00Z');
		expect(await reason(auth.refresh(login?.refreshToken, {}))).toBe('invalid');
		expect(await reason(auth.refresh(successor.refreshToken, {}))).toBe('invalid');
		expect(logger.lines.some((line) => line.startsWith('warn') && line.includes('revoked'))).toBe(true);
	});

	it('rejects missing, unknown and expired refresh tokens', async () => {
		let now = new Date('2026-10-13T12:00:00Z');
		const { auth } = service(() => now);
		const login = await auth.login('admin', 'secret', {});

		expect(await reason(auth.refresh(undefined, {}))).toBe('missing');
		expect(await reason(auth.refresh('unknown', {}))).toBe('invalid');
		now = new Date('2026-10-21T12:00:00Z');
		expect(await reason(auth.refresh(login?.refreshToken, {}))).toBe('expired');
	});

	it('revokes the family on logout and tolerates no cookie', async () => {
		const { auth } = service(() => new Date('2026-10-13T12:00:00Z'));
		const login = await auth.login('admin', 'secret', {});

		await auth.logout(undefined);
		await auth.logout(login?.refreshToken);
		expect(await reason(auth.refresh(login?.refreshToken, {}))).toBe('invalid');
	});
});
