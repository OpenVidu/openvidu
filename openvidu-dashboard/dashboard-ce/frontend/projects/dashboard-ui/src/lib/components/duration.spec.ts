import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Duration, liveDurationMs, liveTotalMs } from './duration.js';

const NOW = new Date('2026-10-13T12:00:00Z');
const MINUTE = 60_000;

describe('liveDurationMs', () => {
	it('counts from the start while running', () => {
		expect(liveDurationMs({ start: new Date(NOW.getTime() - 2 * MINUTE), running: true }, NOW)).toBe(2 * MINUTE);
	});

	it('ignores a stored duration while running, such as the 0 of an active egress output', () => {
		expect(liveDurationMs({ start: new Date(NOW.getTime() - 3 * MINUTE), storedMs: 0, running: true }, NOW)).toBe(
			3 * MINUTE
		);
		expect(liveDurationMs({ start: null, storedMs: 0, running: true }, NOW)).toBe(0);
	});

	it('prefers the stored duration once ended', () => {
		expect(
			liveDurationMs({ start: new Date(NOW.getTime() - 9 * MINUTE), storedMs: 5 * MINUTE, running: false }, NOW)
		).toBe(5 * MINUTE);
	});

	it('takes the end minus the start once ended without a stored duration', () => {
		expect(
			liveDurationMs(
				{ start: '2026-10-13T11:00:00Z', end: '2026-10-13T11:03:00Z', storedMs: null, running: false },
				NOW
			)
		).toBe(3 * MINUTE);
	});

	it('has none when ended without an end time, or without a start', () => {
		expect(liveDurationMs({ start: '2026-10-13T11:00:00Z', running: false }, NOW)).toBeUndefined();
		expect(liveDurationMs({ running: true }, NOW)).toBeUndefined();
	});
});

describe('liveTotalMs', () => {
	it('adds the elapsed time of the running part', () => {
		expect(liveTotalMs(60 * MINUTE, new Date(NOW.getTime() - 5 * MINUTE), NOW)).toBe(65 * MINUTE);
		expect(liveTotalMs(60 * MINUTE, undefined, NOW)).toBe(60 * MINUTE);
	});
});

describe('Duration', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('counts up every second while running and reads "—" when unknown', async () => {
		vi.useFakeTimers({ now: NOW, toFake: ['Date', 'setInterval', 'clearInterval'] });

		const fixture = TestBed.createComponent(Duration);
		const element = fixture.nativeElement as HTMLElement;

		fixture.componentRef.setInput('start', new Date(NOW.getTime() - 2 * MINUTE).toISOString());
		fixture.componentRef.setInput('running', true);
		await fixture.whenStable();
		expect(element.textContent).toBe('2 m 00 s');

		vi.advanceTimersByTime(10_000);
		await fixture.whenStable();
		expect(element.textContent).toBe('2 m 10 s');

		fixture.componentRef.setInput('running', false);
		fixture.componentRef.setInput('start', null);
		await fixture.whenStable();
		expect(element.textContent).toBe('—');
	});

	it('adds the running part to a stored total', async () => {
		vi.useFakeTimers({ now: NOW, toFake: ['Date', 'setInterval', 'clearInterval'] });

		const fixture = TestBed.createComponent(Duration);

		fixture.componentRef.setInput('totalMs', 60 * MINUTE);
		fixture.componentRef.setInput('start', new Date(NOW.getTime() - 5 * MINUTE).toISOString());
		fixture.componentRef.setInput('running', true);
		await fixture.whenStable();
		expect((fixture.nativeElement as HTMLElement).textContent).toBe('1 h 05 m');
	});
});
