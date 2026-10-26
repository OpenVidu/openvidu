import { HttpHeaders, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { infoResponse, settle, signIn } from '../../../testing/fixtures.js';
import { routeElement } from '../../../testing/harness.js';
import { AuthService, safeRedirect } from '../../core/auth/auth.js';
import { InfoService } from '../../core/info.js';
import { ToastService } from '../../core/ui/toast.js';
import { DASHBOARD_ROUTES } from '../../routes.js';
import { composeRoutes } from '../../routing/compose-routes.js';

function setup(): HttpTestingController {
	TestBed.configureTestingModule({
		providers: [
			provideRouter(composeRoutes(DASHBOARD_ROUTES)),
			provideHttpClient(),
			provideHttpClientTesting(),
			{ provide: ToastService, useValue: { show: vi.fn() } }
		]
	});

	return TestBed.inject(HttpTestingController);
}

function url(): string {
	return TestBed.inject(Router).url;
}

describe('safeRedirect', () => {
	it.each([
		['/rooms?status=active', '/rooms?status=active'],
		['https://evil.example', null],
		['//evil.example', null],
		['/login?redirect=/x', null],
		[null, null]
	])('accepts %j as %j', (value, expected) => {
		expect(safeRedirect(value)).toBe(expected);
	});
});

describe('LoginPage', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	async function open(path: string): Promise<{ harness: RouterTestingHarness; http: HttpTestingController }> {
		const http = setup();
		const harness = await RouterTestingHarness.create(path);

		return { harness, http };
	}

	function fill(harness: RouterTestingHarness, username: string, password: string): void {
		const [user, pass] = [...routeElement(harness).querySelectorAll('input')];

		for (const [input, value] of [
			[user, username],
			[pass, password]
		] as const) {
			if (input !== undefined) {
				input.value = value;
				input.dispatchEvent(new Event('input'));
			}
		}
	}

	function submit(harness: RouterTestingHarness): void {
		routeElement(harness)
			.querySelector('form')
			?.dispatchEvent(new Event('submit', { cancelable: true }));
	}

	it('signs in and lands on the redirect target', async () => {
		const { harness, http } = await open('/login?redirect=%2Frooms%3Fstatus%3Dactive');

		fill(harness, 'admin', 'secret');
		submit(harness);
		await settle();
		http.expectOne('api/v1/auth/login').flush({ accessToken: 'token', expiresAt: '2026-10-14T00:15:00.000Z' });
		await settle();
		http.expectOne('api/v1/info').flush(infoResponse());
		await settle();
		await harness.fixture.whenStable();

		expect(url().startsWith('/rooms?status=active')).toBe(true);
	});

	it('clears the password and focuses the username on invalid credentials', async () => {
		const { harness, http } = await open('/login');

		fill(harness, 'admin', 'wrong');
		submit(harness);
		await settle();
		http.expectOne('api/v1/auth/login').flush(
			{ error: { code: 'INVALID_CREDENTIALS', message: 'no' } },
			{ status: 401, statusText: 'x' }
		);
		await settle();
		await harness.fixture.whenStable();

		const element = routeElement(harness);
		const [user, pass] = [...element.querySelectorAll('input')];

		expect(element.querySelector('.message')?.textContent).toBe('Invalid username or password');
		expect(pass?.value).toBe('');
		expect(user?.value).toBe('admin');
		expect(document.activeElement).toBe(user);
	});

	it('counts down a rate limit and enables the form again at zero', async () => {
		const { harness, http } = await open('/login');

		vi.useFakeTimers();
		fill(harness, 'admin', 'wrong');
		submit(harness);
		await vi.advanceTimersByTimeAsync(0);
		http.expectOne('api/v1/auth/login').flush(
			{ error: { code: 'RATE_LIMITED', message: 'slow down' } },
			{ status: 429, statusText: 'x', headers: new HttpHeaders({ 'Retry-After': '3' }) }
		);
		await vi.advanceTimersByTimeAsync(0);
		harness.fixture.detectChanges();

		const element = routeElement(harness);
		const button = element.querySelector<HTMLButtonElement>('button[type="submit"]');

		expect(element.querySelector('.message')?.textContent).toBe('Too many attempts, try again in 3 s');
		expect(button?.disabled).toBe(true);

		await vi.advanceTimersByTimeAsync(1000);
		harness.fixture.detectChanges();
		expect(element.querySelector('.message')?.textContent).toBe('Too many attempts, try again in 2 s');

		await vi.advanceTimersByTimeAsync(2000);
		harness.fixture.detectChanges();
		expect(element.querySelector('.message')?.textContent).toBe('');
		expect(button?.disabled).toBe(false);
	});

	it('shows the unreachable banner with retry', async () => {
		const { harness, http } = await open('/login');

		fill(harness, 'admin', 'secret');
		submit(harness);
		await settle();
		http.expectOne('api/v1/auth/login').error(new ProgressEvent('error'), { status: 0 });
		await settle();
		await harness.fixture.whenStable();

		expect(routeElement(harness).querySelector('.unreachable')?.textContent).toContain(
			'The server is unreachable.'
		);
	});

	it('sends a signed-in user to the redirect target', async () => {
		const http = setup();

		await signIn(TestBed.inject(AuthService), http);
		await RouterTestingHarness.create('/login?redirect=%2Fsettings');

		expect(url()).toBe('/settings');
	});

	it('shows the edition and version of the public info before sign-in', async () => {
		const http = setup();
		const load = TestBed.inject(InfoService).load();

		http.expectOne('api/v1/info').flush({ edition: 'ce', versions: { dashboard: '3.10.0' } });
		await load;

		const harness = await RouterTestingHarness.create('/login');
		const footer = routeElement(harness).querySelector('footer')?.textContent ?? '';

		expect(footer).toContain('CE');
		expect(footer).toContain('3.10.0');
		expect(footer).toContain('Documentation');
	});

	it('requires both fields before calling the server', async () => {
		const { harness, http } = await open('/login');

		submit(harness);
		await settle();

		http.expectNone('api/v1/auth/login');
	});
});
