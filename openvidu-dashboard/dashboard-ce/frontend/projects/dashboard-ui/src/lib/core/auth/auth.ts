import {
	HttpContext,
	HttpContextToken,
	HttpErrorResponse,
	type HttpInterceptorFn,
	type HttpRequest
} from '@angular/common/http';
import { computed, inject, Service, signal } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import type { AuthTokenResponse, MeResponse } from '@openvidu-dashboard/typings';
import { catchError, from, switchMap, throwError } from 'rxjs';

import { API_BASE, HttpService } from '../http/http.js';

/** Requests that must not trigger the refresh-and-replay flow: the auth endpoints themselves. */
export const SKIP_SESSION_REFRESH = new HttpContextToken<boolean>(() => false);

const noRefresh = (): HttpContext => new HttpContext().set(SKIP_SESSION_REFRESH, true);

/** Browser session: the access token lives in memory only; the refresh cookie restores it after a reload. */
@Service()
export class AuthService {
	private readonly http = inject(HttpService);
	private readonly router = inject(Router);
	private readonly token = signal<string | null>(null);
	private readonly user = signal<string | null>(null);
	private refreshing: Promise<string | null> | null = null;

	readonly accessToken = this.token.asReadonly();
	readonly username = this.user.asReadonly();
	readonly authenticated = computed(() => this.token() !== null);

	/** Signs in; rejects with an `ApiRequestError` (`INVALID_CREDENTIALS`, `RATE_LIMITED`, `NETWORK_ERROR`). */
	async login(username: string, password: string): Promise<void> {
		const tokens = await this.http.post<AuthTokenResponse>(
			'auth/login',
			{ username, password },
			{ context: noRefresh() }
		);

		this.token.set(tokens.accessToken);
		this.user.set(username);
	}

	/** One refresh shared by every caller while it runs; resolves to the new token or `null` when it fails. */
	refresh(): Promise<string | null> {
		this.refreshing ??= this.http
			.post<AuthTokenResponse>('auth/refresh', {}, { context: noRefresh() })
			.then((tokens) => {
				this.token.set(tokens.accessToken);

				return tokens.accessToken;
			})
			.catch(() => {
				this.clear();

				return null;
			})
			.finally(() => {
				this.refreshing = null;
			});

		return this.refreshing;
	}

	/** Silent restore at startup: a refresh, then the username of the restored session. */
	async restore(): Promise<boolean> {
		if ((await this.refresh()) === null) {
			return false;
		}

		try {
			this.user.set((await this.http.get<MeResponse>('auth/me')).username);
		} catch {
			// The session is valid even if the username could not be read; the user menu shows a placeholder.
		}

		return this.authenticated();
	}

	/** Ends the session on the server (best effort), forgets the token and shows the login page. */
	async logout(): Promise<void> {
		try {
			await this.http.post('auth/logout', {}, { context: noRefresh() });
		} catch {
			// The cookie expires on its own; the local session is dropped regardless.
		}

		this.clear();
		await this.router.navigate(['/login']);
	}

	/** Drops the session after a failed refresh and sends the user to the login with the current URL. */
	async expire(): Promise<void> {
		const redirect = this.router.url;

		this.clear();

		if (!redirect.startsWith('/login')) {
			await this.router.navigate(['/login'], { queryParams: { redirect } });
		}
	}

	private clear(): void {
		this.token.set(null);
		this.user.set(null);
	}
}

function withToken(req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
	return token === null ? req : req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

/**
 * Attaches the bearer token to API requests and, on `401`, runs one shared refresh and replays the request once with
 * the new token; when the refresh fails the session expires.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
	if (!req.url.startsWith(API_BASE) || req.context.get(SKIP_SESSION_REFRESH)) {
		return next(req);
	}

	const auth = inject(AuthService);
	const sent = auth.accessToken();

	return next(withToken(req, sent)).pipe(
		catchError((error: unknown) => {
			if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
				return throwError(() => error);
			}

			const current = auth.accessToken();

			if (current !== null && current !== sent) {
				return next(withToken(req, current));
			}

			return from(auth.refresh()).pipe(
				switchMap((fresh) => {
					if (fresh === null) {
						void auth.expire();

						return throwError(() => error);
					}

					return next(withToken(req, fresh));
				})
			);
		})
	);
};

/** An in-app path to return to after sign-in; anything else (absolute URLs, `//host`, the login page) is ignored. */
export function safeRedirect(value: string | null | undefined): string | null {
	if (value === null || value === undefined || !value.startsWith('/') || value.startsWith('//')) {
		return null;
	}

	return value.startsWith('/login') ? null : value;
}

/** Sends a signed-in user away from the login page, to `redirect` or the overview. */
export const loginGuard: CanActivateFn = (route) =>
	!inject(AuthService).authenticated() ||
	inject(Router).parseUrl(safeRedirect(route.queryParamMap.get('redirect')) ?? '/overview');

/** Lets authenticated users in; others go to the login page with the requested URL. */
export const authGuard: CanActivateFn = (_route, state) =>
	inject(AuthService).authenticated() ||
	inject(Router).createUrlTree(['/login'], { queryParams: { redirect: state.url } });
