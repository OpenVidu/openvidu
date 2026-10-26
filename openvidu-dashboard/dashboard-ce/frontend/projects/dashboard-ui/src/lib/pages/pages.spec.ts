import { HttpHeaders, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { InfoResponse, StatusResponse } from '@openvidu-dashboard/typings';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { infoResponse, settle, signIn, statusResponse } from '../../testing/fixtures.js';
import { routeElement } from '../../testing/harness.js';
import { AuthService, safeRedirect } from '../core/auth.js';
import { EntityPreviewService } from '../core/entity-preview.js';
import { InfoService } from '../core/info.js';
import { browserTimeZone, PREFERENCES_KEY, PreferencesService } from '../core/preferences.js';
import { ServerStatusService } from '../core/server-status.js';
import { SessionZoneService } from '../core/session-zone.js';
import { ToastService } from '../core/toast.js';
import { composeRoutes } from '../routing/compose-routes.js';
import { DASHBOARD_ROUTES } from '../routes.js';
import { formatRetention, migrationLine, retentionRows } from './about-tab.js';

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

async function loadStatus(http: HttpTestingController, body: StatusResponse): Promise<void> {
	const load = TestBed.inject(ServerStatusService).load();

	http.expectOne('api/v1/status').flush(body);
	await load;
}

async function loadInfo(http: HttpTestingController, info: InfoResponse): Promise<void> {
	const load = TestBed.inject(InfoService).load();

	http.expectOne('api/v1/info').flush(info);
	await load;
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

describe('About helpers', () => {
	it('lists the default retention per data class', () => {
		expect(
			retentionRows({
				eventsMs: 7 * 86_400_000,
				statsMs: 7 * 86_400_000,
				tracksMs: 7 * 86_400_000,
				entitiesMs: 90 * 86_400_000,
				rollups5MinMs: 7 * 86_400_000,
				rollupsHourlyMs: 400 * 86_400_000,
				rollupsDailyMs: null
			}).map((row) => `${row.label} ${row.value}`)
		).toEqual([
			'Events 7 days',
			'Stats 7 days',
			'Tracks and subscriptions 7 days',
			'Entities 90 days',
			'5-minute rollups 7 days',
			'Hourly rollups 400 days',
			'Daily rollups Kept forever'
		]);
		expect(formatRetention(86_400_000)).toBe('1 day');
		expect(formatRetention(43_200_000)).toBe('12 hours');
		expect(formatRetention(36 * 3_600_000)).toBe('36 hours');
		expect(formatRetention(1_825 * 86_400_000)).toBe('1,825 days');
	});

	it.each([
		[{ state: 'none' }, null],
		[{ state: 'pending' }, null],
		[{ state: 'running', progress: { processed: 300_000, total: 1_200_000 } }, '300,000 / 1,200,000 records'],
		[
			{
				state: 'completed',
				progress: { processed: 1_200_000, total: 1_200_000, finishedAt: '2026-10-12T10:04:00Z' }
			},
			'Migration completed at 10:04:00'
		],
		[{ state: 'failed', error: 'legacy event without a room' }, 'Migration failed: legacy event without a room']
	] as const)('describes migration %j', (migration, text) => {
		expect(migrationLine(migration, 'UTC')).toBe(text);
	});
});

describe('SettingsPage', () => {
	async function settings(
		path: string,
		info: InfoResponse | null
	): Promise<{ harness: RouterTestingHarness; http: HttpTestingController }> {
		const http = setup();

		await signIn(TestBed.inject(AuthService), http);

		if (info === null) {
			const load = TestBed.inject(InfoService).load();

			http.expectOne('api/v1/info').flush(null, { status: 503, statusText: 'Unavailable' });
			await load;
		} else {
			await loadInfo(http, info);
		}

		const harness = await RouterTestingHarness.create(path);

		return { harness, http };
	}

	it('opens About with the version, the running migration, the retention and the storage', async () => {
		const { harness } = await settings(
			'/settings?tab=about',
			infoResponse({
				migration: { state: 'running', progress: { processed: 300_000, total: 1_200_000 } },
				retention: {
					eventsMs: 7 * 86_400_000,
					statsMs: 7 * 86_400_000,
					tracksMs: 7 * 86_400_000,
					entitiesMs: 90 * 86_400_000,
					rollups5MinMs: 7 * 86_400_000,
					rollupsHourlyMs: 400 * 86_400_000,
					rollupsDailyMs: null
				},
				storage: {
					rooms: {
						documents: 1203,
						storageBytes: 12_000_000,
						indexBytes: 345_678,
						oldest: '2026-09-01T00:00:00Z'
					}
				}
			})
		);
		const element = harness.fixture.nativeElement as HTMLElement;
		const about = element.querySelector('ovd-about-tab');
		const tables = [...(about?.querySelectorAll('table') ?? [])];

		expect(element.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toContain('About');
		expect(about?.querySelector('.version span')?.textContent).toBe('OpenVidu 3.10.0');
		expect(about?.querySelector('.version ovd-edition-badge')?.textContent.trim()).toBe('COMMUNITY');
		expect(about?.textContent).not.toContain('Schema');
		expect(about?.textContent).not.toContain('MongoDB');
		expect(about?.textContent).not.toContain('openvidu-livekit');
		expect(about?.textContent).toContain('300,000 / 1,200,000 records (25 %)');
		expect(about?.querySelector('mat-progress-bar')).not.toBeNull();
		expect(tables[0]?.querySelector('tbody tr')?.textContent).toContain('Events');
		expect(tables[1]?.querySelector('tbody tr')?.textContent).toContain('1,203');
		expect(tables[1]?.querySelector('tbody tr')?.textContent).toContain('12.3 MB');
		expect(about?.textContent).not.toContain('License');
		expect(about?.textContent).not.toContain('Links');
		expect(about?.querySelector('ovd-external-link')).toBeNull();
	});

	it('hides a migration that ended before the tab opened and follows the status poll while it runs', async () => {
		const { harness, http } = await settings(
			'/settings?tab=about',
			infoResponse({ migration: { state: 'completed', progress: { processed: 10, total: 10 } } })
		);
		const element = harness.fixture.nativeElement as HTMLElement;

		http.expectOne('api/v1/status').flush(statusResponse());
		await harness.fixture.whenStable();
		expect(element.querySelector('.migration')).toBeNull();

		await loadStatus(
			http,
			statusResponse({ migration: { state: 'running', progress: { processed: 5, total: 10 } } })
		);
		http.match('api/v1/info');
		await harness.fixture.whenStable();
		expect(element.querySelector('.migration mat-progress-bar')).not.toBeNull();
		expect(element.querySelector('.migration')?.textContent).toContain('(50 %)');

		await loadStatus(
			http,
			statusResponse({
				migration: {
					state: 'completed',
					progress: { processed: 10, total: 10, finishedAt: '2026-10-12T10:04:00Z' }
				}
			})
		);
		await harness.fixture.whenStable();
		expect(element.querySelector('.migration')?.textContent).toMatch(/Migration completed at \d{2}:\d{2}:\d{2}/);
	});

	it('shows a loading state while the info is in flight and the tables once it arrives', async () => {
		const http = setup();

		await signIn(TestBed.inject(AuthService), http);

		const load = TestBed.inject(InfoService).load();
		const harness = await RouterTestingHarness.create('/settings?tab=about');
		const element = harness.fixture.nativeElement as HTMLElement;
		const about = () => element.querySelector('ovd-about-tab');

		expect(about()?.querySelector('ovd-skeleton')).not.toBeNull();
		expect(about()?.querySelector('.version')).toBeNull();
		expect(about()?.querySelector('table')).toBeNull();
		expect(about()?.textContent).not.toContain('Server info unavailable');

		for (const request of http.match('api/v1/info')) {
			request.flush(infoResponse());
		}

		await load;
		await harness.fixture.whenStable();

		expect(about()?.querySelector('ovd-skeleton')).toBeNull();
		expect(about()?.querySelector('.version ovd-edition-badge')).not.toBeNull();
		expect([...(about()?.querySelectorAll('h2') ?? [])].map((heading) => heading.textContent.trim())).toEqual([
			'Retention',
			'Storage'
		]);
		expect(about()?.querySelector('table')).not.toBeNull();
	});

	it('reports unavailable server info with retry while Preferences stays usable', async () => {
		const { harness, http } = await settings('/settings?tab=about', null);
		const element = harness.fixture.nativeElement as HTMLElement;

		expect(element.querySelector('ovd-about-tab ovd-notice.error')?.textContent).toContain(
			'Server info unavailable'
		);
		element.querySelector<HTMLButtonElement>('ovd-about-tab ovd-notice button')?.click();
		http.expectOne('api/v1/info');

		const preferences = [...element.querySelectorAll<HTMLElement>('[role="tab"]')].find((tab) =>
			tab.textContent.includes('Preferences')
		);

		preferences?.click();
		await harness.fixture.whenStable();
		expect(url()).toBe('/settings?tab=preferences');
		expect(element.textContent).toContain('Rows per page');
		expect(
			[...element.querySelectorAll('ovd-preferences-tab mat-label')]
				.map((label) => label.textContent.trim())
				.filter((label) => label.includes('refresh'))
		).toEqual(['Auto-refresh of live views']);
	});

	it('saves any default zone, applies it to the session and resets to the browser zone', async () => {
		const { harness } = await settings('/settings?tab=preferences', infoResponse());
		const element = harness.fixture.nativeElement as HTMLElement;
		const radio = (label: string) =>
			[...element.querySelectorAll<HTMLElement>('ovd-preferences-tab mat-radio-button')]
				.find((button) => button.textContent.includes(label))
				?.querySelector<HTMLInputElement>('input');

		await harness.fixture.whenStable();
		expect(radio(`Browser (${browserTimeZone()})`)?.checked).toBe(true);
		expect(element.querySelector('ovd-preferences-tab ovd-zone-select')).toBeNull();

		radio('Another zone')?.click();
		await harness.fixture.whenStable();
		expect(TestBed.inject(PreferencesService).preferences().timeZone).toBe('UTC');

		const select = element.querySelector<HTMLInputElement>('ovd-preferences-tab ovd-zone-select input');

		expect(select?.value).toBe('UTC');
		select?.focus();
		select?.dispatchEvent(new Event('focusin'));

		if (select) {
			select.value = 'new_york';
		}

		select?.dispatchEvent(new Event('input'));
		await harness.fixture.whenStable();
		[...document.querySelectorAll<HTMLElement>('mat-option')]
			.find((option) => option.textContent.trim() === 'America/New_York')
			?.click();
		await harness.fixture.whenStable();

		expect(TestBed.inject(PreferencesService).preferences().timeZone).toBe('America/New_York');
		expect(TestBed.inject(SessionZoneService).zone()).toBe('America/New_York');
		expect((JSON.parse(localStorage.getItem(PREFERENCES_KEY) ?? '{}') as { timeZone?: string }).timeZone).toBe(
			'America/New_York'
		);

		await harness.navigateByUrl('/overview');
		await harness.fixture.whenStable();
		expect(url()).toBe('/overview?tz=America%2FNew_York');

		await harness.navigateByUrl('/settings?tab=preferences');
		await harness.fixture.whenStable();
		[...element.querySelectorAll<HTMLButtonElement>('ovd-preferences-tab button')]
			.find((button) => button.textContent.trim() === 'Reset to defaults')
			?.click();
		await harness.fixture.whenStable();
		expect(TestBed.inject(SessionZoneService).zone()).toBe(browserTimeZone());
	});

	it('shows a stored utc of an earlier build as UTC', async () => {
		localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ version: 1, timeZone: 'utc' }));

		const { harness } = await settings('/settings?tab=preferences', infoResponse());
		const element = harness.fixture.nativeElement as HTMLElement;

		await harness.fixture.whenStable();
		expect(element.querySelector<HTMLInputElement>('ovd-preferences-tab ovd-zone-select input')?.value).toBe('UTC');
		localStorage.removeItem(PREFERENCES_KEY);
	});
});

describe('LockedPage', () => {
	it('shows the entity header from list data, the lock and a link back to the list with the range', async () => {
		const http = setup();

		await signIn(TestBed.inject(AuthService), http);
		await loadInfo(http, infoResponse());
		TestBed.inject(EntityPreviewService).set('room', 'RM_ab12cd', {
			name: 'demo-room',
			status: 'active',
			startedAt: '2026-10-13T12:31:05Z'
		});

		const harness = await RouterTestingHarness.create('/rooms?from=now-6h&to=now&tz=UTC');

		await settle();

		for (const request of http.match((req) => req.url.startsWith('api/v1/rooms'))) {
			request.flush({});
		}

		await harness.navigateByUrl('/rooms/RM_ab12cd');

		const element = harness.fixture.nativeElement as HTMLElement;

		expect(element.querySelector('h1')?.textContent).toBe('demo-room');
		expect(element.querySelector('ovd-locked-page .title ovd-copy-button button')?.getAttribute('aria-label')).toBe(
			'Copy room name'
		);
		expect(element.querySelector('ovd-locked-page ovd-copy-chip')).toBeNull();
		expect(element.querySelector('ovd-locked-page ovd-status-badge')?.textContent).toContain('active');
		expect(element.querySelector('ovd-pro-lock-overlay')?.textContent).toContain(
			'Room detail is available in OpenVidu PRO'
		);
		expect(element.querySelector('ovd-pro-lock-overlay a[href^="/rooms"]')?.getAttribute('href')).toBe(
			'/rooms?from=now-6h&to=now&tz=UTC'
		);
		http.expectOne('api/v1/status').flush(statusResponse());
		http.verify();
	});
});
