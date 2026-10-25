import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { childComponent, routeElement } from '../../testing/harness.js';
import { GlobalSearch, SEARCH_DEBOUNCE_MS, sidTarget } from './global-search.js';

@Component({ selector: 'ovd-page', template: 'page' })
class Page {}

@Component({ selector: 'ovd-host', imports: [GlobalSearch], template: '<ovd-global-search />' })
class Host {}

describe('sidTarget', () => {
	it.each([
		['RM_ab12cd', '/rooms/RM_ab12cd'],
		[' PA_x1y2 ', '/participants/PA_x1y2'],
		['EG_a1b2', '/egress/EG_a1b2'],
		['IN_c3d4', '/ingress/IN_c3d4'],
		['dem', null],
		['RM_', null],
		['TR_abc', null]
	])('maps %j to %s', (query, target) => {
		expect(sidTarget(query)).toBe(target);
	});
});

describe('GlobalSearch', () => {
	let harness: RouterTestingHarness;
	let controller: HttpTestingController;

	beforeEach(async () => {
		vi.useFakeTimers();
		TestBed.configureTestingModule({
			providers: [
				provideRouter([
					{ path: 'overview', component: Host },
					{ path: '**', component: Page }
				]),
				provideHttpClient(),
				provideHttpClientTesting()
			]
		});
		controller = TestBed.inject(HttpTestingController);
		harness = await RouterTestingHarness.create('/overview');
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	function input(): HTMLInputElement {
		const element = routeElement(harness).querySelector('input');

		if (element === null) {
			throw new Error('search input missing');
		}

		return element;
	}

	function type(value: string): void {
		input().value = value;
		input().dispatchEvent(new Event('input'));
	}

	it('offers to open an exact ID and opens it on Enter without listing results', async () => {
		type('PA_x1y2');
		input().dispatchEvent(new Event('focusin'));
		await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);
		controller.expectNone(() => true);

		const search = childComponent(harness, 'ovd-global-search') as { exact(): { path: string } | null };

		expect(search.exact()?.path).toBe('/participants/PA_x1y2');
		harness.fixture.detectChanges();
		expect(document.querySelector('mat-option.exact')?.textContent.trim()).toBe('Open participant PA_x1y2');

		input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
		await vi.advanceTimersByTimeAsync(50);

		expect(TestBed.inject(Router).url).toMatch(/^\/participants\/PA_x1y2\?from=.+&to=now&tz=/);
	});

	it('clears the box with "Clear search", keeping the focus and closing the results', async () => {
		const clearButton = () =>
			routeElement(harness).querySelector<HTMLButtonElement>(
				'ovd-global-search button[aria-label="Clear search"]'
			);

		harness.fixture.detectChanges();
		expect(clearButton()).toBeNull();

		type('dem');
		await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);

		for (const request of controller.match((req) => req.params.get('q') === 'dem')) {
			request.flush({ items: [], nextCursor: null, prevCursor: null });
		}

		harness.fixture.detectChanges();
		clearButton()?.click();
		harness.fixture.detectChanges();

		const search = childComponent(harness, 'ovd-global-search') as { groups(): unknown[]; searched(): boolean };

		expect(input().value).toBe('');
		expect(document.activeElement).toBe(input());
		expect(search.groups()).toEqual([]);
		expect(search.searched()).toBe(false);
		expect(clearButton()).toBeNull();
	});

	it('sends nothing below 2 characters and hints at the minimum', async () => {
		type('d');
		await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);
		harness.fixture.detectChanges();
		controller.expectNone(() => true);
		expect(routeElement(harness).querySelector('mat-hint')?.textContent).toBe('Type at least 2 characters');
		expect(input().placeholder).toBe('Name, identity or ID');
	});

	it('runs one prefix request per list after the debounce and cancels them when the text changes', async () => {
		type('de');
		await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS - 1);
		controller.expectNone(() => true);
		await vi.advanceTimersByTimeAsync(1);

		const first = controller.match((req) => req.params.get('q') === 'de');

		expect(first.map((req) => req.request.url).sort()).toEqual([
			'api/v1/egresses',
			'api/v1/ingresses',
			'api/v1/participants',
			'api/v1/rooms'
		]);
		expect(first.every((req) => req.request.params.get('limit') === '5')).toBe(true);

		type('dem');
		await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);

		expect(first.every((req) => req.cancelled)).toBe(true);

		const second = controller.match((req) => req.params.get('q') === 'dem');

		expect(second).toHaveLength(4);

		for (const request of second) {
			request.flush({
				items: request.request.url === 'api/v1/rooms' ? [{ sid: 'RM_ab12cd', name: 'demo-room' }] : [],
				nextCursor: null,
				prevCursor: null
			});
		}

		await vi.advanceTimersByTimeAsync(50);

		const search = childComponent(harness, 'ovd-global-search') as {
			groups(): { source: { title: string }; results: { label: string; link: string }[]; seeAll: string }[];
		};
		const groups = search.groups();

		expect(groups).toHaveLength(1);
		expect(groups[0]?.source.title).toBe('Rooms');
		expect(groups[0]?.results).toEqual([{ label: 'demo-room', secondary: 'RM_ab12cd', link: '/rooms/RM_ab12cd' }]);
		expect(groups[0]?.seeAll).toMatch(/^\/rooms\?.*q=dem/);
	});
});
