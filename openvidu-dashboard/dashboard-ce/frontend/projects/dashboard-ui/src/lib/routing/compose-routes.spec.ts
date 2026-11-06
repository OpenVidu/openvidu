import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { NavigationMeta } from '@openvidu-dashboard/typings';
import { describe, expect, it } from 'vitest';

import { FeatureService } from '../core/info.js';
import { NavigationList } from '../shell/navigation-list.js';
import { composeRoutes, type DashboardRoute, navigationEntries } from './compose-routes.js';

@Component({ selector: 'ovd-ce-list', template: 'CE list' })
class CeList {}

@Component({ selector: 'ovd-ce-lock', template: 'CE lock' })
class CeLock {}

@Component({ selector: 'ovd-pro-detail', template: 'PRO detail' })
class ProDetail {}

function nav(label: string, path: string, order: number): NavigationMeta {
	return { label, icon: 'dashboard', path, order, liveCapable: false, rangeScoped: true };
}

const CE: DashboardRoute[] = [
	{
		path: 'rooms',
		data: { navigation: nav('Rooms', '/rooms', 3) },
		children: [
			{ path: '', component: CeList },
			{
				path: ':roomSid',
				component: CeLock,
				data: {
					page: { feature: 'room-detail', liveCapable: true, rangeScoped: false },
					breadcrumb: { param: 'roomSid' }
				}
			}
		]
	},
	{ path: 'overview', component: CeList, data: { navigation: nav('Overview', '/overview', 1) } },
	{ path: '**', redirectTo: 'overview' }
];

describe('composeRoutes', () => {
	it('replaces a route by path in a later config and keeps its metadata', async () => {
		const routes = composeRoutes(CE, [{ path: 'rooms', children: [{ path: ':roomSid', component: ProDetail }] }]);

		TestBed.configureTestingModule({ providers: [provideRouter(routes)] });

		const harness = await RouterTestingHarness.create('/rooms/RM_ab12cd');

		expect(harness.routeNativeElement?.textContent).toBe('PRO detail');

		const rooms = routes.find((route) => route.path === 'rooms');
		const detail = rooms?.children?.find((route) => route.path === ':roomSid');

		expect(rooms?.data?.['navigation']).toEqual(nav('Rooms', '/rooms', 3));
		expect(detail?.data?.['page']).toEqual({ feature: 'room-detail', liveCapable: true, rangeScoped: false });
		expect(rooms?.children?.find((route) => route.path === '')?.component).toBe(CeList);
	});

	it('inserts new paths before the catch-all route', () => {
		const routes = composeRoutes(CE, [{ path: 'agents', component: ProDetail }]);

		expect(routes.map((route) => route.path)).toEqual(['rooms', 'overview', 'agents', '**']);
	});

	it('lists the sidenav entries in order', () => {
		const routes = composeRoutes(CE, [
			{ path: 'agents', component: ProDetail, data: { navigation: nav('Agents', '/agents', 5) } }
		]);

		expect(navigationEntries(routes).map((entry) => entry.label)).toEqual(['Overview', 'Rooms', 'Agents']);
	});

	describe('an entry hidden without its feature', () => {
		const EXTRA: DashboardRoute[] = [
			{
				path: 'extra',
				data: {
					navigation: {
						...nav('Extra', '/extra', 80),
						feature: 'per-node-breakdown',
						hiddenWithoutFeature: true
					}
				},
				children: [{ path: ':id', component: ProDetail }]
			}
		];

		function configure(features: string[]) {
			const routes = composeRoutes(CE, EXTRA);

			TestBed.configureTestingModule({
				providers: [
					provideRouter(routes),
					{ provide: FeatureService, useValue: { enabled: (feature: string) => features.includes(feature) } }
				]
			});

			return routes;
		}

		it('behaves as an unknown path and leaves the sidenav without the feature', async () => {
			configure([]);

			const harness = await RouterTestingHarness.create('/extra/mn-a');

			expect(harness.routeNativeElement?.textContent).toBe('CE list');

			const fixture = TestBed.createComponent(NavigationList);

			await fixture.whenStable();
			expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Extra');
			expect((fixture.nativeElement as HTMLElement).querySelector('.lock')).toBeNull();
		});

		it('opens the page and lists the entry with the feature', async () => {
			configure(['per-node-breakdown']);

			const harness = await RouterTestingHarness.create('/extra/mn-a');

			expect(harness.routeNativeElement?.textContent).toBe('PRO detail');

			const fixture = TestBed.createComponent(NavigationList);

			await fixture.whenStable();
			expect((fixture.nativeElement as HTMLElement).textContent).toContain('Extra');
		});
	});
});
