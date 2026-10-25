import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, describe, expect, it } from 'vitest';

import { FocusService, GLOBAL_SEARCH_ID, isEditableTarget, MAIN_CONTENT_ID } from './focus.js';

function byId(id: string): HTMLElement {
	const element = document.getElementById(id);

	if (element === null) {
		throw new Error(`#${id} is missing`);
	}

	return element;
}

function key(target: EventTarget, init: KeyboardEventInit): KeyboardEvent {
	const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });

	target.dispatchEvent(event);

	return event;
}

describe('FocusService', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	function setup(): FocusService {
		document.body.innerHTML = `
			<input id="${GLOBAL_SEARCH_ID}" />
			<textarea id="notes"></textarea>
			<main id="${MAIN_CONTENT_ID}"><h1>Rooms</h1><button id="action">Act</button></main>`;
		TestBed.configureTestingModule({ providers: [provideRouter([])] });

		const focus = TestBed.inject(FocusService);

		focus.start();

		return focus;
	}

	it('focuses the global search on / outside text fields', () => {
		setup();

		const event = key(byId('action'), { key: '/' });

		expect(document.activeElement?.id).toBe(GLOBAL_SEARCH_ID);
		expect(event.defaultPrevented).toBe(true);
	});

	it('leaves / alone in text fields and with modifiers', () => {
		setup();

		const notes = byId('notes');

		notes.focus();
		expect(key(notes, { key: '/' }).defaultPrevented).toBe(false);
		expect(key(document.body, { key: '/', ctrlKey: true }).defaultPrevented).toBe(false);
		expect(document.activeElement).toBe(notes);
	});

	it('moves focus to the page h1 and to the main landmark', async () => {
		const focus = setup();

		await focus.focusPageTitle();
		expect(document.activeElement?.tagName).toBe('H1');
		expect(document.activeElement?.getAttribute('tabindex')).toBe('-1');

		focus.skipToContent();
		expect(document.activeElement?.id).toBe(MAIN_CONTENT_ID);
	});

	it('recognises editable targets', () => {
		const div = document.createElement('div');

		div.contentEditable = 'true';
		expect(isEditableTarget(document.createElement('input'))).toBe(true);
		expect(isEditableTarget(document.createElement('select'))).toBe(true);
		expect(isEditableTarget(document.createElement('button'))).toBe(false);
		expect(isEditableTarget(null)).toBe(false);
	});
});
