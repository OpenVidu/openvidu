import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { CHART_GAP_PX, CHART_MIN_WIDTH_PX, ChartGrid } from './chart-grid.js';

@Component({
	selector: 'ovd-host',
	imports: [ChartGrid],
	template: `
		<ovd-chart-grid>
			@for (chart of charts(); track chart) {
				<div class="chart">{{ chart }}</div>
			}
		</ovd-chart-grid>
	`
})
class ChartGridHost {
	readonly charts = signal(['a', 'b', 'c', 'd']);
}

/** Width of a grid that fits `columns` charts of the minimum width. */
function fits(columns: number): number {
	return columns * CHART_MIN_WIDTH_PX + (columns - 1) * CHART_GAP_PX;
}

async function grid(width: number, charts?: string[]) {
	const fixture = TestBed.createComponent(ChartGridHost);

	if (charts !== undefined) {
		fixture.componentInstance.charts.set(charts);
	}

	const element = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('ovd-chart-grid');

	if (element === null) {
		throw new Error('no chart grid');
	}

	Object.defineProperty(element, 'clientWidth', { configurable: true, value: width });
	await fixture.whenStable();
	fixture.detectChanges();

	return { fixture, element, basis: () => element.style.getPropertyValue('--ovd-chart-basis') };
}

const share = (columns: number) =>
	`calc((100% - ${String((columns - 1) * CHART_GAP_PX)}px) / ${String(columns)} - 0.5px)`;

describe('ChartGrid', () => {
	it('puts four charts with room for three in two rows of two', async () => {
		expect((await grid(fits(3))).basis()).toBe(share(2));
	});

	it('puts four charts with room for four in one row', async () => {
		expect((await grid(fits(4))).basis()).toBe(share(4));
	});

	it('puts three charts with room for two in a row of two and a shared row below', async () => {
		expect((await grid(fits(2), ['a', 'b', 'c'])).basis()).toBe(share(2));
	});

	it('puts five charts with room for three in rows of three and two', async () => {
		expect((await grid(fits(3), ['a', 'b', 'c', 'd', 'e'])).basis()).toBe(share(3));
	});

	it('gives every chart its own row when two do not fit', async () => {
		expect((await grid(fits(2) - 1)).basis()).toBe(share(1));
	});

	it('wraps at the minimum width until it is measured', async () => {
		expect((await grid(0)).basis()).toBe('');
	});

	it('lays the charts out again when one is added', async () => {
		const { fixture, basis } = await grid(fits(3));

		expect(basis()).toBe(share(2));
		fixture.componentInstance.charts.update((charts) => [...charts, 'e']);
		fixture.detectChanges();
		await new Promise((resolve) => setTimeout(resolve));
		fixture.detectChanges();
		expect(basis()).toBe(share(3));
	});
});
