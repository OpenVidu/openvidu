import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

import { errors as joseErrors, jwtVerify, SignJWT } from 'jose';

import type { AuthTokenResponse, Edition } from '@openvidu-dashboard/typings';

import type { AuthContext } from '../api/route-registry.js';
import { ApiError } from '../http/api-error.js';
import type { Logger } from '../logging/logger.js';
import type { SessionRepository } from './session-repository.js';

export const ACCESS_TOKEN_TTL_SECONDS = 900;
/** A rotated refresh token presented again within this window is a concurrent refresh, not a replay. */
export const REUSE_GRACE_MS = 10_000;

export interface ClientInfo {
	ip?: string;
	userAgent?: string;
}

export interface IssuedSession {
	tokens: AuthTokenResponse;
	/** Opaque value of the refresh cookie. */
	refreshToken: string;
}

export interface AuthServiceOptions {
	username: string;
	password: string;
	edition: Edition;
	key: Uint8Array;
	refreshTokenTtlSeconds: number;
	sessions: SessionRepository;
	logger: Logger;
	now?: () => Date;
}

function sha256(value: string): Buffer {
	return createHash('sha256').update(value).digest();
}

function unauthorized(reason: 'missing' | 'invalid' | 'expired', message = 'Session expired or invalid'): ApiError {
	return new ApiError('UNAUTHORIZED', message, { reason });
}

/** Credentials, access tokens and the rotating refresh sessions of the single administrator. */
export class AuthService {
	private readonly usernameDigest: Buffer;
	private readonly passwordDigest: Buffer;
	private readonly now: () => Date;

	constructor(private readonly options: AuthServiceOptions) {
		this.usernameDigest = sha256(options.username);
		this.passwordDigest = sha256(options.password);
		this.now = options.now ?? (() => new Date());
	}

	/** Compares digests of both values in constant time, so timing reveals neither which one nor their length. */
	checkCredentials(username: string, password: string): boolean {
		const usernameMatches = timingSafeEqual(sha256(username), this.usernameDigest);
		const passwordMatches = timingSafeEqual(sha256(password), this.passwordDigest);

		return usernameMatches && passwordMatches;
	}

	async issueAccessToken(): Promise<AuthTokenResponse> {
		const issuedAt = Math.floor(this.now().getTime() / 1000);
		const expiresAt = issuedAt + ACCESS_TOKEN_TTL_SECONDS;
		const accessToken = await new SignJWT({ edition: this.options.edition })
			.setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
			.setSubject(this.options.username)
			.setIssuedAt(issuedAt)
			.setExpirationTime(expiresAt)
			.sign(this.options.key);

		return { accessToken, expiresAt: new Date(expiresAt * 1000).toISOString() };
	}

	/** Verifies signature, algorithm (HS256 only) and expiry; throws `UNAUTHORIZED` with the reason. */
	async verifyAccessToken(token: string): Promise<AuthContext> {
		try {
			const { payload } = await jwtVerify(token, this.options.key, {
				algorithms: ['HS256'],
				currentDate: this.now(),
				requiredClaims: ['sub', 'exp', 'iat']
			});

			if (payload.sub !== this.options.username || typeof payload.exp !== 'number') {
				throw unauthorized('invalid', 'Invalid access token');
			}

			return {
				username: payload.sub,
				edition: payload.edition === 'pro' ? 'pro' : 'ce',
				expiresAt: new Date(payload.exp * 1000)
			};
		} catch (error) {
			if (error instanceof ApiError) {
				throw error;
			}

			if (error instanceof joseErrors.JWTExpired) {
				throw unauthorized('expired', 'Access token expired');
			}

			throw unauthorized('invalid', 'Invalid access token');
		}
	}

	/** Starts a session family; null when the credentials do not match. */
	async login(username: string, password: string, client: ClientInfo): Promise<IssuedSession | null> {
		if (!this.checkCredentials(username, password)) {
			return null;
		}

		return this.startSession(randomUUID(), client);
	}

	/**
	 * Rotates a refresh token: a live token gets a successor of the same family; a token rotated more than 10 s ago
	 * revokes its family; a missing, unknown, expired or revoked one is `UNAUTHORIZED`.
	 */
	async refresh(refreshToken: string | undefined, client: ClientInfo): Promise<IssuedSession> {
		if (refreshToken === undefined || refreshToken === '') {
			throw unauthorized('missing', 'No session cookie');
		}

		const now = this.now();
		const session = await this.options.sessions.rotate(hashToken(refreshToken), now);

		if (session === null || session.revokedAt !== undefined) {
			throw unauthorized('invalid');
		}

		if (session.expiresAt.getTime() <= now.getTime()) {
			throw unauthorized('expired');
		}

		if (session.rotatedAt !== undefined && now.getTime() - session.rotatedAt.getTime() > REUSE_GRACE_MS) {
			await this.options.sessions.revokeFamily(session.familyId, now);
			this.options.logger.warn(`Refresh token reused after rotation: session family ${session.familyId} revoked`);

			throw unauthorized('invalid');
		}

		return this.startSession(session.familyId, client);
	}

	/** Revokes the family of the presented refresh token, if any. */
	async logout(refreshToken: string | undefined): Promise<void> {
		if (refreshToken === undefined || refreshToken === '') {
			return;
		}

		const session = await this.options.sessions.findByHash(hashToken(refreshToken));

		if (session) {
			await this.options.sessions.revokeFamily(session.familyId, this.now());
		}
	}

	private async startSession(familyId: string, client: ClientInfo): Promise<IssuedSession> {
		const refreshToken = randomBytes(32).toString('base64url');
		const createdAt = this.now();

		await this.options.sessions.insert({
			familyId,
			tokenHash: hashToken(refreshToken),
			createdAt,
			expiresAt: new Date(createdAt.getTime() + this.options.refreshTokenTtlSeconds * 1000),
			...(client.ip === undefined ? {} : { ip: client.ip }),
			...(client.userAgent === undefined ? {} : { userAgent: client.userAgent.slice(0, 512) })
		});

		return { tokens: await this.issueAccessToken(), refreshToken };
	}
}

export function hashToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}
