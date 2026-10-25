import type { Request, Response } from 'express';

import type { CookieSecureMode } from '../config/variables.js';

export const REFRESH_COOKIE = 'ov_dashboard_refresh';

export interface RefreshCookiePolicy {
	/** Public base path of the dashboard, ending with `/`. */
	basePath: string;
	ttlSeconds: number;
	secure: CookieSecureMode;
}

function attributes(policy: RefreshCookiePolicy, req: Request, maxAge: number): string {
	const secure = policy.secure === 'true' || (policy.secure === 'auto' && req.secure);

	return `Path=${policy.basePath}api/v1/auth; Max-Age=${String(maxAge)}; HttpOnly${secure ? '; Secure' : ''}; SameSite=Strict`;
}

/** Sets the refresh cookie, scoped to the auth endpoints so no other service on the origin receives it. */
export function setRefreshCookie(res: Response, req: Request, policy: RefreshCookiePolicy, token: string): void {
	res.append('Set-Cookie', `${REFRESH_COOKIE}=${token}; ${attributes(policy, req, policy.ttlSeconds)}`);
}

export function clearRefreshCookie(res: Response, req: Request, policy: RefreshCookiePolicy): void {
	res.append('Set-Cookie', `${REFRESH_COOKIE}=; ${attributes(policy, req, 0)}`);
}

export function readRefreshCookie(req: Request): string | undefined {
	const cookies = req.cookies as Record<string, string | undefined> | undefined;

	return cookies?.[REFRESH_COOKIE];
}
