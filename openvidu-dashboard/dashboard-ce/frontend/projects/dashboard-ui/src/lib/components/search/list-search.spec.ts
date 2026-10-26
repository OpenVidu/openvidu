import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { routeElement } from '../../../testing/harness.js';
import {
	EXACT_ID_HINT,
	LIST_SEARCH_DEBOUNCE_MS,
	ListSearch,
	listSearchQuery,
	SHORT_SEARCH_HINT
} from './list-search.js';

@Component({
	selector: 'ovd-rooms-host',
	imports: [ListSearch],
	template: '<ovd-list-search label="Room name or SID" entity="room" />'
})
class RoomsHost {}

@Component({ selector: 'ovd-room-host', template: 'room' })
class RoomHost {}

async function open(url: string) {
	TestBed.configureTestingModule({
		providers: [
			provideRouter([
				{ path: 'rooms', component: RoomsHost },
				{ path: 'rooms/:roomSid', component: RoomHost }
			])
		]
	});

	const harness = await RouterTestingHarness.create(url);
	const element = routeElement(harness);
	const input = element.querySelector('input');

	if (input === null) {
		throw new Error('no search input');
	}

	const type = async (text: string) => {
		input.value = text;
		input.dispatchEvent(new Event('input'));
		await harness.fixture.whenStable();
	};

	return { harness, element, input, type };
}

describe('listSearchQuery', () => {
	it('accepts two characters or an exact ID of the entity', () => {
		expect(listSearchQuery('d', 'room')).toBeNull();
		expect(listSearchQuery('de', 'room')).toBe('de');
		expect(listSearchQuery('RM_a', 'room')).toBe('RM_a');
	});
});

describe('ListSearch', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('labels the field, hints at one character and writes q after the debounce', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });

		const { harness, element, type } = await open('/rooms?from=now-1h&to=now&cursor=abc&page=2');

		expect(element.querySelector('mat-label')?.textContent).toBe('Room name or SID');

		await type('d');
		expect(element.querySelector('mat-hint')?.textContent).toBe(SHORT_SEARCH_HINT);
		await vi.advanceTimersByTimeAsync(LIST_SEARCH_DEBOUNCE_MS);
		expect(TestBed.inject(Router).url).toBe('/rooms?from=now-1h&to=now&cursor=abc&page=2');

		await type('demo');
		expect(element.querySelector('mat-hint')).toBeNull();
		await vi.advanceTimersByTimeAsync(LIST_SEARCH_DEBOUNCE_MS);
		await harness.fixture.whenStable();
		expect(TestBed.inject(Router).url).toBe('/rooms?from=now-1h&to=now&q=demo');
	});

	it('clears the box and removes q with "Clear search"', async () => {
		const { harness, element, input } = await open('/rooms?q=cam');

		expect(input.value).toBe('cam');
		element.querySelector<HTMLButtonElement>('button[aria-label="Clear search"]')?.click();
		await harness.fixture.whenStable();
		expect(input.value).toBe('');
		expect(TestBed.inject(Router).url).toBe('/rooms');
	});

	it('hints at an exact ID and opens its detail on Enter', async () => {
		const { harness, element, input, type } = await open('/rooms?from=now-6h&to=now&tz=UTC');

		await type('RM_ab12cd');
		expect(element.querySelector('mat-hint')?.textContent).toBe(EXACT_ID_HINT);

		input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
		await harness.fixture.whenStable();
		expect(TestBed.inject(Router).url).toBe('/rooms/RM_ab12cd?from=now-6h&to=now&tz=UTC');
	});

	it('rewrites the box when q changes outside it', async () => {
		const { harness, input } = await open('/rooms?q=cam');

		await harness.navigateByUrl('/rooms?q=demo');
		expect(input.value).toBe('demo');
	});
});
