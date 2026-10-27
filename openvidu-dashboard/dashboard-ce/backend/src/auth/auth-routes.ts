import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import * as z from 'zod';

import { ApiError } from '../http/api-error.js';
import { errorBody } from '../http/errors.js';
import type { RouteRegistry } from '../api/route-registry.js';
import type { AuthService, ClientInfo } from './auth-service.js';
import {
	clearRefreshCookie,
	readRefreshCookie,
	REFRESH_COOKIE,
	type RefreshCookiePolicy,
	setRefreshCookie
} from './cookies.js';

export const LOGIN_WINDOW_MS = 15 * 60_000;
export const LOGIN_FAILED_ATTEMPTS = 10;

const credentials = z
	.strictObject({
		username: z.string({ error: 'is required' }).min(1, { error: 'is required' }),
		password: z.string({ error: 'is required' }).min(1, { error: 'is required' })
	})
	.meta({ id: 'LoginRequest' });

const tokenResponse = z
	.object({ accessToken: z.string(), expiresAt: z.iso.datetime() })
	.meta({ id: 'AuthTokenResponse' });

const setsRefreshCookie = z.object({
	'Set-Cookie': z.string().meta({
		description: `${REFRESH_COOKIE}=<token>; Path=<base path>api/v1/auth; HttpOnly; SameSite=Strict (Secure over HTTPS)`
	})
});

const clearsRefreshCookie = z.object({
	'Set-Cookie': z.string().meta({ description: `${REFRESH_COOKIE}=; Max-Age=0: clears the refresh cookie` })
});

const meResponse = z
	.object({ username: z.string(), edition: z.enum(['ce', 'pro']), expiresAt: z.iso.datetime() })
	.meta({ id: 'MeResponse' });

/** 10 failed logins per client IP in 15 minutes, per replica; successful logins do not count. */
export function loginLimiter(): RequestHandler {
	return rateLimit({
		windowMs: LOGIN_WINDOW_MS,
		limit: LOGIN_FAILED_ATTEMPTS,
		skipSuccessfulRequests: true,
		standardHeaders: false,
		legacyHeaders: false,
		handler: (req, res) => {
			const resetTime = (req as { rateLimit?: { resetTime?: Date } }).rateLimit?.resetTime;
			const seconds = resetTime ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000)) : 1;

			res.setHeader('Retry-After', String(seconds));
			res.status(429).json(errorBody('RATE_LIMITED', 'Too many failed logins; try again later'));
		}
	});
}

function client(req: { ip?: string | undefined; get(name: string): string | undefined }): ClientInfo {
	const userAgent = req.get('User-Agent');

	return { ...(req.ip === undefined ? {} : { ip: req.ip }), ...(userAgent === undefined ? {} : { userAgent }) };
}

/** `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` and `GET /auth/me`. */
export function registerAuthRoutes(
	registry: RouteRegistry,
	auth: () => AuthService,
	cookiePolicy: () => RefreshCookiePolicy
): void {
	registry.tag('Auth', 'Login, token refresh and logout of the administrator');
	registry.register({
		method: 'post',
		path: '/auth/login',
		operationId: 'login',
		edition: 'ce',
		summary: 'Log in with the administrator credentials',
		tags: ['Auth'],
		security: 'public',
		before: [loginLimiter()],
		request: { body: credentials },
		responses: {
			200: {
				description: 'Logged in; the refresh token is set as a cookie',
				schema: tokenResponse,
				headers: setsRefreshCookie
			},
			401: { description: 'Wrong credentials (INVALID_CREDENTIALS)' },
			429: {
				description: 'Too many failed logins (RATE_LIMITED)',
				headers: z.object({
					'Retry-After': z.string().meta({ description: 'Seconds until the next attempt is accepted' })
				})
			}
		},
		handler: async ({ body, req, res }) => {
			const session = await auth().login(body.username, body.password, client(req));

			if (session === null) {
				throw new ApiError('INVALID_CREDENTIALS', 'Invalid username or password');
			}

			setRefreshCookie(res, req, cookiePolicy(), session.refreshToken);

			return session.tokens;
		}
	});

	registry.register({
		method: 'post',
		path: '/auth/refresh',
		operationId: 'refreshSession',
		edition: 'ce',
		summary: 'Rotate the refresh cookie and get a new access token',
		tags: ['Auth'],
		security: 'public',
		refreshCookie: 'required',
		responses: {
			200: {
				description: 'New access token; the refresh cookie is rotated',
				schema: tokenResponse,
				headers: setsRefreshCookie
			},
			401: {
				description: 'Missing, unknown, expired or revoked session; the cookie is cleared',
				headers: clearsRefreshCookie
			}
		},
		handler: async ({ req, res }) => {
			try {
				const session = await auth().refresh(readRefreshCookie(req), client(req));

				setRefreshCookie(res, req, cookiePolicy(), session.refreshToken);

				return session.tokens;
			} catch (error) {
				clearRefreshCookie(res, req, cookiePolicy());

				throw error;
			}
		}
	});

	registry.register({
		method: 'post',
		path: '/auth/logout',
		operationId: 'logout',
		edition: 'ce',
		summary: 'End the session of the refresh cookie',
		tags: ['Auth'],
		security: 'public',
		refreshCookie: 'optional',
		responses: { 204: { description: 'Logged out; the cookie is cleared', headers: clearsRefreshCookie } },
		handler: async ({ req, res }) => {
			await auth().logout(readRefreshCookie(req));
			clearRefreshCookie(res, req, cookiePolicy());
			res.status(204).end();
		}
	});

	registry.register({
		method: 'get',
		path: '/auth/me',
		operationId: 'getCurrentAdmin',
		edition: 'ce',
		summary: 'The authenticated administrator',
		tags: ['Auth'],
		security: 'bearer',
		responses: { 200: { description: 'Current session', schema: meResponse } },
		handler: ({ req }) => {
			const session = req.auth;

			if (session === undefined) {
				throw new ApiError('UNAUTHORIZED', 'Missing access token', { reason: 'missing' });
			}

			return { username: session.username, edition: session.edition, expiresAt: session.expiresAt.toISOString() };
		}
	});
}
