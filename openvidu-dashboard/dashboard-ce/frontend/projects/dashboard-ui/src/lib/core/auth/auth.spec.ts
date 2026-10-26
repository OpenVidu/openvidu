import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { settle } from '../../../testing/fixtures.js';
import { HttpService } from '../http/http.js';
import { authGuard, authInterceptor, AuthService } from './auth.js';

@Component({ template: 'page' })
class Page {}

const TOKENS = { accessToken: 'fresh', expiresAt: '2026-10-14T00:15:00.000Z' };

describe('AuthService and authInterceptor', () => {
	let auth: AuthService;
	let http: HttpService;
	let controller: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				provideRouter([
					{ path: 'login', component: Page },
					{ path: 'rooms', component: Page, canActivate: [authGuard] },
					{ path: 'settings', component: Page, canActivate: [authGuard] }
				]),
				provideHttpClient(withInterceptors([authInterceptor])),
				provideHttpClientTesting()
			]
		});
		auth = TestBed.inject(AuthService);
		http = TestBed.inject(HttpService);
		controller = TestBed.inject(HttpTestingController);
	});

	async function signIn(token = 'old'): Promise<void> {
		const login = auth.login('admin', 'secret');

		controller.expectOne('api/v1/auth/login').flush({ accessToken: token, expiresAt: TOKENS.expiresAt });
		await login;
	}

	it('keeps the token in memory and attaches it as a bearer', async () => {
		await signIn('abc');

		const rooms = http.get('rooms');
		const request = controller.expectOne('api/v1/rooms');

		expect(request.request.headers.get('Authorization')).toBe('Bearer abc');
		request.flush({ items: [] });
		await rooms;
		expect(auth.username()).toBe('admin');
		expect(localStorage.length + sessionStorage.length).toBe(0);
	});

	it('sends no bearer outside the API and never refreshes on a failed login', async () => {
		const login = auth.login('admin', 'wrong');

		controller
			.expectOne('api/v1/auth/login')
			.flush({ error: { code: 'INVALID_CREDENTIALS', message: 'no' } }, { status: 401, statusText: 'x' });

		await expect(login).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
		controller.expectNone('api/v1/auth/refresh');
	});

	it('runs one refresh for three concurrent 401s and replays each request once', async () => {
		await signIn();

		const results = [http.get('rooms'), http.get('participants'), http.get('egress')];

		for (const url of ['api/v1/rooms', 'api/v1/participants', 'api/v1/egress']) {
			controller
				.expectOne(url)
				.flush({ error: { code: 'UNAUTHORIZED', message: 'expired' } }, { status: 401, statusText: 'x' });
		}

		controller.expectOne('api/v1/auth/refresh').flush(TOKENS);
		await settle();

		for (const url of ['api/v1/rooms', 'api/v1/participants', 'api/v1/egress']) {
			const replay = controller.expectOne(url);

			expect(replay.request.headers.get('Authorization')).toBe('Bearer fresh');
			replay.flush({ url });
		}

		expect(await Promise.all(results)).toEqual([
			{ url: 'api/v1/rooms' },
			{ url: 'api/v1/participants' },
			{ url: 'api/v1/egress' }
		]);
		controller.verify();
	});

	it('clears the session and navigates to the login with the current URL when the refresh fails', async () => {
		await signIn();

		const harness = await RouterTestingHarness.create('/rooms?status=active');
		const rooms = http.get('rooms');

		controller
			.expectOne('api/v1/rooms')
			.flush({ error: { code: 'UNAUTHORIZED', message: 'x' } }, { status: 401, statusText: 'x' });
		controller
			.expectOne('api/v1/auth/refresh')
			.flush({ error: { code: 'UNAUTHORIZED', message: 'x' } }, { status: 401, statusText: 'x' });

		await expect(rooms).rejects.toMatchObject({ status: 401 });
		await harness.fixture.whenStable();

		expect(auth.accessToken()).toBeNull();
		expect(TestBed.inject(Router).url).toBe('/login?redirect=%2Frooms%3Fstatus%3Dactive');
	});

	it('restores the session silently at startup', async () => {
		const restored = auth.restore();

		controller.expectOne('api/v1/auth/refresh').flush(TOKENS);
		await settle();
		controller.expectOne('api/v1/auth/me').flush({ username: 'admin', edition: 'ce', expiresAt: TOKENS.expiresAt });

		expect(await restored).toBe(true);
		expect(auth.username()).toBe('admin');
	});

	it('guards protected routes with a redirect to the login', async () => {
		const harness = await RouterTestingHarness.create();

		await harness.navigateByUrl('/settings?tab=about');

		expect(TestBed.inject(Router).url).toBe('/login?redirect=%2Fsettings%3Ftab%3Dabout');
	});

	it('signs out on the server, drops the token and shows the login without redirect', async () => {
		await signIn();

		const harness = await RouterTestingHarness.create('/rooms');
		const logout = auth.logout();

		controller.expectOne('api/v1/auth/logout').flush(null, { status: 204, statusText: 'No Content' });
		await logout;
		await harness.fixture.whenStable();

		expect(auth.authenticated()).toBe(false);
		expect(TestBed.inject(Router).url).toBe('/login');
	});
});
