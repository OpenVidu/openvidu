import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { DeletionJob, StatusResponse } from '@openvidu-dashboard/typings';
import { beforeEach, describe, expect, it } from 'vitest';

import { deletionJob, statusResponse } from '../../testing/fixtures.js';
import { ServerStatusService, STATUS_POLL_FAST_MS } from '../core/refresh/server-status.js';
import { BannerSlot } from './banner-slot.js';

@Component({ template: '' })
class Page {}

/** A running Entities deletion. */
function job(overrides: Partial<DeletionJob> = {}): DeletionJob {
	return deletionJob({ class: 'entities', collection: { index: 1, total: 9 }, ...overrides });
}

describe('BannerSlot', () => {
	let fixture: ComponentFixture<BannerSlot>;
	let element: HTMLElement;

	beforeEach(async () => {
		TestBed.configureTestingModule({
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				provideRouter([
					{ path: 'rooms', component: Page },
					{ path: 'overview', component: Page },
					{ path: 'settings', component: Page }
				])
			]
		});
		await TestBed.inject(Router).navigateByUrl('/rooms');
		fixture = TestBed.createComponent(BannerSlot);
		element = fixture.nativeElement as HTMLElement;
		await fixture.whenStable();
	});

	async function status(overrides: Partial<StatusResponse>): Promise<void> {
		const load = TestBed.inject(ServerStatusService).load();

		TestBed.inject(HttpTestingController).expectOne('api/v1/status').flush(statusResponse(overrides));
		await load;
		await fixture.whenStable();
	}

	const deletionBanner = () => element.querySelector('.deletion');

	it('Banner of a running deletion', async () => {
		await status({ deletion: job() });

		expect(deletionBanner()?.querySelector('.text')?.textContent.trim()).toBe(
			'Deleting analytics data (Entities)… Lists and figures may change.'
		);

		const link = deletionBanner()?.querySelector('a');

		expect(link?.textContent.trim()).toBe('View progress');
		expect(link?.getAttribute('href')).toBe('/settings?tab=data');
	});

	it('Banner of a Total deletion', async () => {
		await TestBed.inject(Router).navigateByUrl('/overview');
		await status({ deletion: job({ class: 'all' }) });

		expect(deletionBanner()?.textContent).toContain(
			'Deleting analytics data (all classes)… Lists and figures may change.'
		);
	});

	it('Banner of a Total deletion: a Legacy deletion names the data before 3.10', async () => {
		await status({ deletion: job({ class: 'legacy' }) });

		expect(deletionBanner()?.textContent).toContain('Deleting analytics data (data before 3.10)…');
	});

	it('No banner on the Data tab', async () => {
		await status({ deletion: job({ class: 'events' }) });
		expect(deletionBanner()).not.toBeNull();

		await TestBed.inject(Router).navigateByUrl('/settings?tab=data');
		await fixture.whenStable();
		expect(deletionBanner()).toBeNull();

		await TestBed.inject(Router).navigateByUrl('/settings?tab=preferences');
		await fixture.whenStable();
		expect(deletionBanner()).not.toBeNull();
	});

	it('Banner ends with the job', async () => {
		for (const state of ['completed', 'interrupted', 'failed'] as const) {
			await status({ deletion: job() });
			expect(deletionBanner(), state).not.toBeNull();

			await status({ deletion: job({ state }) });
			expect(deletionBanner(), state).toBeNull();
		}
	});

	it('Dismissed banner and a new job', async () => {
		await status({ deletion: job({ class: 'events' }) });
		deletionBanner()?.querySelector<HTMLButtonElement>('button[aria-label="Dismiss"]')?.click();
		await fixture.whenStable();
		expect(deletionBanner()).toBeNull();

		await status({ deletion: job({ class: 'events', deleted: 5_000 }) });
		expect(deletionBanner()).toBeNull();

		await status({ deletion: job({ class: 'events', state: 'completed' }) });
		await status({ deletion: job({ id: 'job-2', class: 'stats' }) });
		expect(deletionBanner()?.textContent).toContain('Deleting analytics data (Stats)…');
	});

	it('Schema mismatch', async () => {
		await status({ schema: { dashboard: 2, writer: 3, status: 'newer' } });

		const warning = element.querySelector('.warning');

		expect(warning?.textContent).toContain('v3');
		expect(warning?.textContent).toContain('v2');
		expect(warning?.querySelector('button')).toBeNull();
	});

	it('Schema initialized while the page is open', async () => {
		await status({ schema: { dashboard: 2, status: 'uninitialized' } });

		expect(element.querySelector('.warning')?.textContent).toContain(
			'The OpenVidu server has not initialized the analytics database yet.'
		);
		// The next status comes within 10 s while the schema is uninitialized.
		expect(TestBed.inject(ServerStatusService).pollInterval()).toBe(STATUS_POLL_FAST_MS);

		await status({});
		expect(element.querySelector('.warning')).toBeNull();
	});
});
