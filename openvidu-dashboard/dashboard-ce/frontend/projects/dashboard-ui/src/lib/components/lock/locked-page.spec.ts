import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { InfoResponse } from '@openvidu-dashboard/typings';
import { describe, expect, it, vi } from 'vitest';

import { infoResponse, settle, signIn, statusResponse } from '../../../testing/fixtures.js';
import { AuthService } from '../../core/auth/auth.js';
import { InfoService } from '../../core/info.js';
import { EntityPreviewService } from '../../core/state/entity-preview.js';
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

async function loadInfo(http: HttpTestingController, info: InfoResponse): Promise<void> {
	const load = TestBed.inject(InfoService).load();

	http.expectOne('api/v1/info').flush(info);
	await load;
}

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
