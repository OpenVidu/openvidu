import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { KpiTile } from './kpi-tile.js';
import { balancedColumns, TileRow } from './tile-row.js';

@Component({
	selector: 'ovd-host',
	imports: [TileRow],
	template: `
		<ovd-tile-row>
			@for (tile of tiles(); track tile) {
				<div class="tile">{{ tile }}</div>
			}
		</ovd-tile-row>
	`
})
class TileRowHost {
	readonly tiles = signal(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
}

@Component({
	selector: 'ovd-kpi-host',
	imports: [KpiTile, TileRow],
	template: `
		<ovd-tile-row>
			@for (value of values; track $index) {
				<ovd-kpi-tile label="Figure" [value]="value" />
			}
		</ovd-tile-row>
	`
})
class KpiRowHost {
	readonly values = ['9 m 41 s', '3 (peak 3)', '3', '100.0 %', '4.1 · Excellent', '0', '7'];
}

/** A ResizeObserver whose last instance reports the width it is given. */
class FakeResizeObserver {
	static last: FakeResizeObserver | undefined;

	observed = false;

	constructor(private readonly callback: ResizeObserverCallback) {
		FakeResizeObserver.last = this;
	}

	observe(): void {
		this.observed = true;
	}

	disconnect(): void {
		this.observed = false;
	}

	resize(width: number): void {
		this.callback([{ contentRect: { width } } as ResizeObserverEntry], this as unknown as ResizeObserver);
	}
}

describe('balancedColumns', () => {
	it('uses the fewest rows and spreads the tiles evenly', () => {
		const roomForFive = 5 * 180 + 4 * 12;

		expect(balancedColumns(7, roomForFive)).toBe(4);
		expect(balancedColumns(6, 6 * 180 + 5 * 12)).toBe(6);
		expect(balancedColumns(8, roomForFive)).toBe(4);
		expect(balancedColumns(3, 100)).toBe(1);
		expect(balancedColumns(0, roomForFive)).toBe(1);
		expect(balancedColumns(6, 328, 150)).toBe(2);
	});
});

describe('TileRow', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		FakeResizeObserver.last = undefined;
	});

	it('sets its columns from its width and recomputes when a tile is added', async () => {
		vi.stubGlobal('ResizeObserver', FakeResizeObserver);
		vi.stubGlobal('requestAnimationFrame', (run: FrameRequestCallback) => {
			run(0);

			return 1;
		});
		vi.stubGlobal('cancelAnimationFrame', () => undefined);

		const fixture = TestBed.createComponent(TileRowHost);
		const row = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('ovd-tile-row');
		const columns = () => row?.style.getPropertyValue('--ovd-tile-columns');

		await fixture.whenStable();
		FakeResizeObserver.last?.resize(5 * 180 + 4 * 12);
		fixture.detectChanges();
		expect(columns()).toBe('4');

		fixture.componentInstance.tiles.update((tiles) => [...tiles, 'h', 'i', 'j']);
		fixture.detectChanges();
		await new Promise((resolve) => setTimeout(resolve));
		fixture.detectChanges();
		expect(columns()).toBe('5');
	});

	it('wraps at the minimum width until it is measured', async () => {
		const fixture = TestBed.createComponent(TileRowHost);
		const row = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('ovd-tile-row');

		await fixture.whenStable();
		expect(row?.classList.contains('measured')).toBe(false);
		expect(row?.style.getPropertyValue('--ovd-tile-min')).toBe('150px');
	});

	it('widens its tiles to keep the widest value on one line when the row allows it', async () => {
		const box = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
			this: HTMLElement
		) {
			const width = this.style.whiteSpace === 'nowrap' ? 20 * this.textContent.trim().length : 0;

			return { width } as DOMRect;
		});
		const fixture = TestBed.createComponent(KpiRowHost);
		const row = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('ovd-tile-row');

		if (row === null) {
			throw new Error('no tile row');
		}

		// Room for five 150 px tiles, but "4.1 · Excellent" needs 300 px on one line: two columns of 4 + 3 rows.
		Object.defineProperty(row, 'clientWidth', { configurable: true, value: 5 * 150 + 4 * 12 });
		await fixture.whenStable();
		fixture.detectChanges();
		expect(row.style.getPropertyValue('--ovd-tile-columns')).toBe('2');
		expect(row.querySelectorAll('ovd-kpi-tile .value')).toHaveLength(7);
		box.mockRestore();
	});

	it('measures its width after the first render, before any resize event', async () => {
		const fixture = TestBed.createComponent(TileRowHost);
		const row = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('ovd-tile-row');

		if (row === null) {
			throw new Error('no tile row');
		}

		Object.defineProperty(row, 'clientWidth', { configurable: true, value: 5 * 150 + 4 * 12 });
		await fixture.whenStable();
		fixture.detectChanges();
		expect(row.classList.contains('measured')).toBe(true);
		expect(row.style.getPropertyValue('--ovd-tile-columns')).toBe('4');
	});
});
