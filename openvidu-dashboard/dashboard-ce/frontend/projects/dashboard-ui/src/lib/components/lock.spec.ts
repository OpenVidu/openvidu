import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, inject, type OnInit } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { describe, expect, it } from 'vitest';

import { routeElement } from '../../testing/harness.js';
import { infoResponse } from '../../testing/fixtures.js';
import { HttpService } from '../core/http.js';
import { InfoService } from '../core/info.js';
import { EntityPreviewService } from '../core/entity-preview.js';
import { ListStateService } from '../core/list-state.js';
import { LockedPage } from '../pages/locked-page.js';
import { BreadcrumbService } from '../routing/breadcrumbs.js';
import { Breadcrumbs } from './breadcrumbs.js';
import { FeatureContent, FeatureGate } from './feature-gate.js';

@Component({ selector: 'ovd-quality-card', template: 'real quality card' })
class QualityCard implements OnInit {
	private readonly http = inject(HttpService);

	ngOnInit(): void {
		void this.http.get('analytics/quality').catch(() => undefined);
	}
}

@Component({
	selector: 'ovd-host',
	imports: [FeatureGate, FeatureContent, QualityCard],
	template: `
		<ovd-feature-gate feature="analytics-quality">
			<ng-template ovdFeatureContent><ovd-quality-card /></ng-template>
		</ovd-feature-gate>
	`
})
class Host {}

async function withInfo(features: string[]): Promise<void> {
	const info = TestBed.inject(InfoService);
	const load = info.load();

	TestBed.inject(HttpTestingController)
		.expectOne('api/v1/info')
		.flush(infoResponse({ features: features as never[] }));
	await load;
}

describe('FeatureGate and ProLockOverlay', () => {
	it('renders the card lock without any request when the feature is disabled', async () => {
		TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
		await withInfo([]);

		const fixture = TestBed.createComponent(Host);

		await fixture.whenStable();

		const element = fixture.nativeElement as HTMLElement;
		const lock = element.querySelector<HTMLElement>('ovd-pro-lock-overlay');

		expect(lock?.textContent).toContain('Quality analytics is available in OpenVidu PRO');
		expect(lock?.style.minHeight).toBe('');
		expect(lock?.querySelector('a')?.getAttribute('target')).toBe('_blank');
		expect(lock?.querySelector('a')?.getAttribute('rel')).toBe('noopener');
		TestBed.inject(HttpTestingController).verify();
	});

	it('renders the real component when the feature is enabled', async () => {
		TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
		await withInfo(['analytics-quality']);

		const fixture = TestBed.createComponent(Host);

		await fixture.whenStable();

		expect((fixture.nativeElement as HTMLElement).textContent).toContain('real quality card');
		TestBed.inject(HttpTestingController).expectOne('api/v1/analytics/quality');
	});
});

@Component({ selector: 'ovd-crumbs-host', imports: [Breadcrumbs], template: '<ovd-breadcrumbs />' })
class CrumbsHost {}

describe('Breadcrumbs', () => {
	it('carries the current range in crumb links and ends with the identifier and its copy button', async () => {
		TestBed.configureTestingModule({
			providers: [
				provideRouter([
					{
						path: 'rooms',
						data: {
							navigation: {
								label: 'Rooms',
								icon: 'meeting_room',
								path: '/rooms',
								order: 3,
								liveCapable: true,
								rangeScoped: true
							}
						},
						children: [
							{ path: '', component: CrumbsHost },
							{
								path: ':roomSid',
								component: CrumbsHost,
								data: {
									page: { liveCapable: true, rangeScoped: false },
									breadcrumb: { param: 'roomSid' }
								}
							}
						]
					}
				])
			]
		});
		TestBed.inject(ListStateService);

		const harness = await RouterTestingHarness.create('/rooms?from=now-6h&to=now&tz=UTC');

		await harness.navigateByUrl('/rooms/RM_ab12cd');

		const nav = routeElement(harness).querySelector('nav[aria-label="Breadcrumb"]');

		expect(nav?.querySelector('a')?.getAttribute('href')).toBe('/rooms?from=now-6h&to=now&tz=UTC');
		expect(nav?.querySelector('a')?.textContent.trim()).toBe('Rooms');
		expect(nav?.querySelector('[aria-current="page"]')?.textContent.trim()).toBe('RM_ab12cd');
		expect(nav?.querySelector('ovd-copy-button button')?.getAttribute('aria-label')).toBe('Copy room SID');

		TestBed.inject(BreadcrumbService).setMissing('RM_ab12cd');
		await harness.fixture.whenStable();
		expect(nav?.querySelector('ovd-copy-button')).toBeNull();
	});
});

describe('LockedPage', () => {
	it('renders the PRO header from the list preview over a silhouette of three tiles and one block', async () => {
		TestBed.configureTestingModule({
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				provideRouter([
					{
						path: 'participants/:participantSid',
						component: LockedPage,
						data: {
							page: { liveCapable: true, rangeScoped: false, feature: 'participant-detail' },
							entity: { kind: 'participant', param: 'participantSid' }
						}
					}
				])
			]
		});
		await withInfo([]);
		TestBed.inject(EntityPreviewService).set('participant', 'PA_x1y2', {
			name: 'alice',
			status: 'left',
			estimated: true
		});

		const harness = await RouterTestingHarness.create('/participants/PA_x1y2');
		const element = routeElement(harness);

		expect(element.querySelector('header.title h1.ovd-page-title')?.textContent.trim()).toBe('alice');
		expect(element.querySelector('header.title ovd-copy-button button')?.getAttribute('aria-label')).toBe(
			'Copy identity'
		);
		expect(element.querySelector('header.title ovd-status-badge')?.textContent).toContain('left');
		expect(element.querySelector('.entity')).toBeNull();
		expect(element.querySelectorAll('.backdrop .tile')).toHaveLength(3);
		expect(element.querySelectorAll('.backdrop .block')).toHaveLength(1);
		expect(element.querySelector('.backdrop .wide')).toBeNull();
		TestBed.inject(HttpTestingController).verify();
	});
});
