import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { routeElement } from '../../../testing/harness.js';
import { setMediaQuery } from '../../../testing/media.js';
import { HIGHLIGHT_MS, KpiTile, TICKING_MS } from './kpi-tile.js';
import { SectionCard } from './section-card.js';

@Component({
	selector: 'ovd-host',
	imports: [KpiTile],
	template: `<ovd-kpi-tile label="Participants" [value]="value()" [loading]="loading()" />`
})
class TileHost {
	readonly value = signal<number | string | readonly string[] | null>(null);
	readonly loading = signal(true);
}

@Component({
	selector: 'ovd-linked-host',
	imports: [KpiTile],
	template: `<ovd-kpi-tile
		label="Agents"
		[value]="2"
		info="Agent sessions connected now."
		link="/agents"
		[queryParams]="{ status: 'active' }"
		approximate
	/>`
})
class LinkedHost {}

@Component({ selector: 'ovd-list', template: 'list' })
class ListPage {}

describe('KpiTile', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('shows a skeleton only on the first load, keeps the value while refreshing and highlights a change', async () => {
		vi.useFakeTimers();

		const fixture = TestBed.createComponent(TileHost);
		const element = fixture.nativeElement as HTMLElement;

		fixture.detectChanges();
		expect(element.querySelector('.skeleton')).not.toBeNull();

		fixture.componentInstance.value.set(87);
		fixture.componentInstance.loading.set(false);
		fixture.detectChanges();
		expect(element.querySelector('.value')?.textContent.trim()).toBe('87');
		expect(element.querySelector('.highlight')).toBeNull();

		fixture.componentInstance.loading.set(true);
		fixture.componentInstance.value.set(null);
		fixture.detectChanges();
		expect(element.querySelector('.skeleton')).toBeNull();
		expect(element.querySelector('.value')?.textContent.trim()).toBe('87');

		await vi.advanceTimersByTimeAsync(TICKING_MS);
		fixture.componentInstance.value.set(90);
		fixture.componentInstance.loading.set(false);
		fixture.detectChanges();
		expect(element.querySelector('.value.highlight')?.textContent.trim()).toBe('90');

		await vi.advanceTimersByTimeAsync(HIGHLIGHT_MS);
		fixture.detectChanges();
		expect(element.querySelector('.highlight')).toBeNull();
	});

	it('never highlights a value that ticks every second, such as a live duration', async () => {
		vi.useFakeTimers();

		const fixture = TestBed.createComponent(TileHost);
		const element = fixture.nativeElement as HTMLElement;

		fixture.componentInstance.loading.set(false);

		for (const value of ['12 m 05 s', '12 m 06 s', '12 m 07 s']) {
			fixture.componentInstance.value.set(value);
			fixture.detectChanges();
			expect(element.querySelector('.highlight')).toBeNull();
			await vi.advanceTimersByTimeAsync(1_000);
		}

		await vi.advanceTimersByTimeAsync(60_000);
		fixture.componentInstance.value.set('13 m');
		fixture.detectChanges();
		expect(element.querySelector('.value.highlight')?.textContent.trim()).toBe('13 m');
	});

	it('shows a bandwidth value on two lines', async () => {
		const fixture = TestBed.createComponent(TileHost);
		const element = fixture.nativeElement as HTMLElement;

		fixture.componentInstance.loading.set(false);
		fixture.componentInstance.value.set(['↑ 12.0 MB', '↓ 48.0 MB']);
		await fixture.whenStable();

		expect([...element.querySelectorAll('.value .line')].map((line) => line.textContent.trim())).toEqual([
			'↑ 12.0 MB',
			'↓ 48.0 MB'
		]);
	});

	it('does not highlight when reduced motion is requested', async () => {
		setMediaQuery('(prefers-reduced-motion: reduce)', true);

		const fixture = TestBed.createComponent(TileHost);
		const element = fixture.nativeElement as HTMLElement;

		fixture.componentInstance.value.set(87);
		await fixture.whenStable();
		fixture.componentInstance.value.set(90);
		await fixture.whenStable();

		expect(element.querySelector('.value')?.textContent.trim()).toBe('90');
		expect(element.querySelector('.highlight')).toBeNull();
	});
});

@Component({
	selector: 'ovd-section-host',
	imports: [SectionCard],
	template: `<ovd-section-card heading="Events" sectionId="events" [count]="312"><p>body</p></ovd-section-card>`
})
class SectionHost {}

@Component({
	selector: 'ovd-section-info-host',
	imports: [SectionCard],
	template: `<ovd-section-card heading="Data pipeline" sectionId="pipeline" info="Writer batches."
		><p>body</p></ovd-section-card
	>`
})
class SectionInfoHost {}

describe('SectionCard', () => {
	it('explains its heading with an info tip beside it, outside the heading', async () => {
		TestBed.configureTestingModule({ providers: [provideRouter([])] });

		const fixture = TestBed.createComponent(SectionInfoHost);

		await fixture.whenStable();

		const element = fixture.nativeElement as HTMLElement;

		expect(element.querySelector('header .heading-row ovd-info-tip button')?.getAttribute('aria-label')).toBe(
			'About Data pipeline'
		);
		expect(element.querySelector('h2 ovd-info-tip')).toBeNull();
		expect(element.querySelector('h2')?.textContent.trim()).toBe('Data pipeline');
	});

	it('keeps its collapsed state per route when the page renders again', async () => {
		TestBed.configureTestingModule({
			providers: [provideRouter([{ path: 'rooms/:sid', component: SectionHost }])]
		});

		const harness = await RouterTestingHarness.create('/rooms/RM_1');
		const toggle = (): HTMLButtonElement | null => harness.routeNativeElement?.querySelector('button') ?? null;
		const body = (): HTMLElement | null => harness.routeNativeElement?.querySelector('.body') ?? null;

		expect(harness.routeNativeElement?.querySelector('h2')?.textContent).toContain('(312)');
		toggle()?.click();
		await harness.fixture.whenStable();
		expect(body()?.hidden).toBe(true);
		expect(toggle()?.getAttribute('aria-expanded')).toBe('false');

		await harness.navigateByUrl('/rooms/RM_2');
		expect(body()?.hidden).toBe(false);

		await harness.navigateByUrl('/rooms/RM_1');
		expect(body()?.hidden).toBe(true);
	});

	it('explains its label with an info tip and its approximate value on the "≈" mark', async () => {
		TestBed.configureTestingModule({ providers: [provideRouter([])] });

		const fixture = TestBed.createComponent(LinkedHost);

		await fixture.whenStable();

		const element = fixture.nativeElement as HTMLElement;
		const approximate = element.querySelector('.value .approximate');

		expect(element.querySelector('.label ovd-info-tip button')?.getAttribute('aria-label')).toBe('About Agents');
		expect(approximate?.textContent.trim()).toBe('≈');
		expect(approximate?.getAttribute('tabindex')).toBe('0');
		approximate?.dispatchEvent(new MouseEvent('mouseenter'));
		await fixture.whenStable();
		expect(document.querySelector('.mat-mdc-tooltip')?.textContent.trim()).toBe(
			'Hour-aligned sums of the hourly rollups: the range exceeds the exact-count limit'
		);
	});

	it('opens its link from the label, never from the info tip', async () => {
		TestBed.configureTestingModule({
			providers: [
				provideRouter([
					{ path: '', component: LinkedHost },
					{ path: 'agents', component: ListPage }
				])
			]
		});

		const harness = await RouterTestingHarness.create('/');
		const element = routeElement(harness);
		const link = element.querySelector<HTMLAnchorElement>('.label a.link');

		expect(link?.getAttribute('href')).toBe('/agents?status=active');
		element.querySelector<HTMLButtonElement>('ovd-info-tip button')?.click();
		await harness.fixture.whenStable();
		expect(harness.routeNativeElement?.textContent).not.toBe('list');

		link?.click();
		await harness.fixture.whenStable();
		expect(harness.routeNativeElement?.textContent).toBe('list');
	});
});
