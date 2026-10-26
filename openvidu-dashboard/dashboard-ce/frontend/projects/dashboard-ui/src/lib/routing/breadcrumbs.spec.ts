import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { EntityPreviewService } from '../core/state/entity-preview.js';
import { ListStateService } from '../core/state/list-state.js';
import { BreadcrumbService } from './breadcrumbs.js';
import { composeRoutes } from './compose-routes.js';

@Component({ template: 'page' })
class Page {}

const routes = composeRoutes([
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
			{ path: '', component: Page },
			{
				path: ':roomSid',
				component: Page,
				data: { page: { liveCapable: true, rangeScoped: false }, breadcrumb: { param: 'roomSid' } }
			}
		]
	},
	{
		path: 'participants',
		data: {
			navigation: {
				label: 'Participants',
				icon: 'group',
				path: '/participants',
				order: 4,
				liveCapable: false,
				rangeScoped: true
			}
		},
		children: [
			{ path: '', component: Page },
			{
				path: ':participantSid',
				component: Page,
				data: { page: { liveCapable: false, rangeScoped: true }, breadcrumb: { param: 'participantSid' } }
			}
		]
	},
	{
		path: 'settings',
		component: Page,
		data: { page: { liveCapable: false, rangeScoped: false }, breadcrumb: 'Settings' }
	}
]);

describe('BreadcrumbService', () => {
	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
		TestBed.inject(ListStateService);
	});

	it('reads <Section> / <identifier> with a range link and the identifier to copy', async () => {
		const harness = await RouterTestingHarness.create('/rooms?from=now-6h&to=now&tz=UTC');

		await harness.navigateByUrl('/rooms/RM_ab12cd');

		expect(TestBed.inject(BreadcrumbService).items()).toEqual([
			{ label: 'Rooms', link: '/rooms', queryParams: { from: 'now-6h', to: 'now', tz: 'UTC' } },
			{ label: 'RM_ab12cd', copy: 'RM_ab12cd', copyLabel: 'room SID' }
		]);
	});

	it('names a participant by its SID under Participants, whatever its room', async () => {
		await RouterTestingHarness.create('/participants/PA_x1y2?from=now-24h&to=now&tz=UTC');

		expect(TestBed.inject(BreadcrumbService).items()).toEqual([
			{ label: 'Participants', link: '/participants', queryParams: { from: 'now-24h', to: 'now', tz: 'UTC' } },
			{ label: 'PA_x1y2', copy: 'PA_x1y2', copyLabel: 'participant SID' }
		]);
	});

	it('ends with plain text for a page without entity', async () => {
		await RouterTestingHarness.create('/settings');

		expect(TestBed.inject(BreadcrumbService).items()).toEqual([{ label: 'Settings' }]);
	});

	it('keeps the identifier even when the room name is cached', async () => {
		TestBed.inject(EntityPreviewService).set('room', 'RM_cached', { name: 'cached-room' });
		await RouterTestingHarness.create('/rooms/RM_cached');

		expect(TestBed.inject(BreadcrumbService).items().at(-1)).toEqual({
			label: 'RM_cached',
			copy: 'RM_cached',
			copyLabel: 'room SID'
		});
	});
});
