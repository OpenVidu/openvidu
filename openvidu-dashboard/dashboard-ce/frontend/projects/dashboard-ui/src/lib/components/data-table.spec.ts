import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { childComponent, routeElement } from '../../testing/harness.js';
import { BreakpointService, type ScreenSize } from '../core/breakpoints.js';
import { PreferencesService } from '../core/preferences.js';
import { CursorPaginator, shownRange } from './cursor-paginator.js';
import { DataTable, type SortChange, TableCell, type TableColumn } from './data-table.js';
import { SectionCard } from './section-card.js';

interface Room {
	sid: string;
	name: string;
	status: string;
	startedAt: string;
	durationMs: number;
	participants: number;
	bandwidth: number;
	kind: string;
	client: string;
}

const COLUMNS: TableColumn[] = [
	{ key: 'name', header: 'Name', sortable: true, hideable: false, card: 'title' },
	{ key: 'status', header: 'Status', hideable: false, card: 'status' },
	{ key: 'startedAt', header: 'Started', sortable: true, hideable: false, card: 'timestamp' },
	{ key: 'durationMs', header: 'Duration', sortable: true, card: 'metric' },
	{ key: 'participants', header: 'Participants', sortable: true, card: 'metric' },
	{ key: 'bandwidth', header: 'Bandwidth' },
	{ key: 'kind', header: 'Kind' },
	{ key: 'client', header: 'Client' }
];

const ROWS: Room[] = [1, 2].map((n) => ({
	sid: `RM_${String(n)}`,
	name: `room-${String(n)}`,
	status: 'active',
	startedAt: '12:00',
	durationMs: 1000 * n,
	participants: n,
	bandwidth: n * 10,
	kind: 'egress',
	client: 'js'
}));

@Component({
	selector: 'ovd-host',
	imports: [DataTable, TableCell],
	template: `
		<ovd-data-table
			tableId="rooms"
			caption="Rooms"
			[columns]="columns()"
			[rows]="rows()"
			[trackBy]="track"
			[sort]="sort()"
			[order]="'desc'"
			[loading]="loading()"
			[error]="error()"
			[pageSize]="10"
			(sortChange)="changes.push($event)"
		>
			@for (column of columns(); track column.key) {
				<ng-template [ovdCell]="column.key" let-row>{{ value(row, column.key) }}</ng-template>
			}
			<p ovdTableEmpty>No rooms match</p>
		</ovd-data-table>
	`
})
class Host {
	readonly columns = signal<TableColumn[]>(COLUMNS);
	readonly rows = signal<Room[]>(ROWS);
	readonly sort = signal<string | null>('startedAt');
	readonly loading = signal(false);
	readonly error = signal<unknown>(null);
	readonly changes: SortChange[] = [];
	readonly track = (row: Room): string => row.sid;

	value(row: Room, key: string): string {
		return String(row[key as keyof Room]);
	}
}

@Component({
	selector: 'ovd-section-host',
	imports: [DataTable, SectionCard, TableCell],
	template: `
		<ovd-section-card heading="Participants" sectionId="participants">
			<ovd-data-table
				tableId="room-participants"
				caption="Participants"
				[columns]="columns"
				[rows]="rows"
				[trackBy]="track"
			>
				@for (column of columns; track column.key) {
					<ng-template [ovdCell]="column.key" let-row>{{ row.sid }}</ng-template>
				}
			</ovd-data-table>
		</ovd-section-card>
	`
})
class SectionHost {
	readonly columns = COLUMNS;
	readonly rows = ROWS;
	readonly track = (row: Room): string => row.sid;
}

describe('DataTable', () => {
	const size = signal<ScreenSize>('large');

	beforeEach(() => {
		size.set('large');
		TestBed.configureTestingModule({ providers: [{ provide: BreakpointService, useValue: { size } }] });
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	async function render(): Promise<{ host: Host; element: HTMLElement; stable: () => Promise<void> }> {
		const fixture = TestBed.createComponent(Host);

		await fixture.whenStable();

		return {
			host: fixture.componentInstance,
			element: fixture.nativeElement as HTMLElement,
			stable: () => fixture.whenStable()
		};
	}

	function headers(element: HTMLElement): string[] {
		return [...element.querySelectorAll('th')].map((th) => th.textContent.trim());
	}

	it('emits sort changes from the headers with aria-sort and never navigates', async () => {
		const { host, element } = await render();
		const started = [...element.querySelectorAll('th')].find((th) => th.textContent.includes('Started'));
		const name = [...element.querySelectorAll('th')].find((th) => th.textContent.includes('Name'));

		expect(started?.getAttribute('aria-sort')).toBe('descending');
		expect(name?.getAttribute('aria-sort')).toBe('none');
		expect(element.querySelector('th:nth-child(2)')?.hasAttribute('aria-sort')).toBe(false);

		started?.querySelector('button')?.click();
		name?.querySelector('button')?.click();

		expect(host.changes).toEqual([
			{ key: 'startedAt', order: 'asc' },
			{ key: 'name', order: 'desc' }
		]);
		expect(element.querySelectorAll('th[scope="col"]')).toHaveLength(COLUMNS.length);
	});

	it('scrolls wide tables horizontally only', async () => {
		const { element } = await render();
		const scroll = element.querySelector('.scroll');

		if (scroll === null) {
			throw new Error('no scroll container');
		}

		expect(getComputedStyle(scroll).overflowX).toBe('auto');
		expect(getComputedStyle(scroll).overflowY).toBe('hidden');
	});

	it('hides columns from the column menu and keeps them hidden as a preference', async () => {
		const { element, stable } = await render();

		element.querySelector<HTMLButtonElement>('.toolbar button')?.click();
		await stable();

		const item = [...document.querySelectorAll<HTMLButtonElement>('[role="menuitemcheckbox"]')].find((button) =>
			button.textContent.includes('Bandwidth')
		);

		expect(item?.getAttribute('aria-checked')).toBe('true');
		item?.click();
		await stable();

		expect(TestBed.inject(PreferencesService).hiddenColumns('rooms')).toEqual(['bandwidth']);
		expect(headers(element)).not.toContain('Bandwidth');

		const reopened = await render();

		expect(headers(reopened.element)).not.toContain('Bandwidth');
		expect(headers(reopened.element)).toContain('Duration');
	});

	it('renders skeleton rows equal to the page size only until the first response', async () => {
		const fixture = TestBed.createComponent(Host);
		const host = fixture.componentInstance;
		const element = fixture.nativeElement as HTMLElement;

		host.rows.set([]);
		host.loading.set(true);
		await fixture.whenStable();
		expect(element.querySelectorAll('tr.skeleton-row')).toHaveLength(10);

		host.loading.set(false);
		await fixture.whenStable();
		expect(element.querySelectorAll('tr.skeleton-row')).toHaveLength(0);
		expect(element.textContent).toContain('No rooms match');

		host.loading.set(true);
		await fixture.whenStable();
		expect(element.querySelectorAll('tr.skeleton-row')).toHaveLength(0);
		expect(element.textContent).toContain('No rooms match');

		host.rows.set(ROWS);
		host.loading.set(false);
		await fixture.whenStable();
		host.loading.set(true);
		await fixture.whenStable();
		expect(element.querySelectorAll('tr.skeleton-row')).toHaveLength(0);
		expect(element.querySelectorAll('tbody tr')).toHaveLength(2);
	});

	it('keeps the rows under an error notice', async () => {
		const { host, element, stable } = await render();

		host.error.set(new Error('down'));
		await stable();
		expect(element.querySelector('ovd-error-banner')).not.toBeNull();
		expect(element.querySelectorAll('tbody tr')).toHaveLength(2);
	});

	it('puts the Columns button in the section header inside a section card', async () => {
		TestBed.configureTestingModule({ providers: [provideRouter([])] });

		const fixture = TestBed.createComponent(SectionHost);
		const element = fixture.nativeElement as HTMLElement;

		await fixture.whenStable();
		expect(element.querySelector('header .actions')?.textContent).toContain('Columns');
		expect(element.querySelector('ovd-data-table .toolbar')).toBeNull();
	});

	it('takes the card status from the Status column when no column claims the status slot', async () => {
		size.set('xsmall');

		const { host, element, stable } = await render();

		host.columns.set(
			COLUMNS.map((column): TableColumn => {
				if (column.card !== 'status') {
					return column;
				}

				const { card: _card, ...rest } = column;

				return rest;
			})
		);
		await stable();
		expect(element.querySelector('.card-line')?.textContent).toContain('active');
		element.querySelector<HTMLButtonElement>('.card .more')?.click();
		await stable();
		expect([...element.querySelectorAll('.card .metrics dt')].map((dt) => dt.textContent.trim())).not.toContain(
			'Status'
		);
	});

	it('disables a sortable header with its reason', async () => {
		const { host, element, stable } = await render();

		host.columns.set(
			COLUMNS.map((column) =>
				column.key === 'durationMs'
					? { ...column, sortDisabledReason: 'Narrow the range to 7 d to sort by Duration' }
					: column
			)
		);
		await stable();

		const duration = [...element.querySelectorAll('th')].find((th) => th.textContent.includes('Duration'));

		expect(duration?.querySelector<HTMLButtonElement>('button')?.disabled).toBe(true);
		duration?.querySelector('.sort.disabled')?.dispatchEvent(new MouseEvent('mouseenter'));
		await stable();
		expect(document.querySelector('.mat-mdc-tooltip')?.textContent.trim()).toBe(
			'Narrow the range to 7 d to sort by Duration'
		);
	});

	it('explains a header with an info tip that never sorts, in the table and in the cards', async () => {
		const { host, element, stable } = await render();

		host.columns.set(
			COLUMNS.map((column) =>
				column.key === 'participants' || column.key === 'kind'
					? { ...column, info: `About the ${column.header} column.` }
					: column
			)
		);
		await stable();

		const participants = [...element.querySelectorAll('th')].find((th) => th.textContent.includes('Participants'));
		const kind = [...element.querySelectorAll('th')].find((th) => th.textContent.includes('Kind'));

		expect(participants?.querySelector('ovd-info-tip button')?.getAttribute('aria-label')).toBe(
			'About Participants'
		);
		expect(kind?.querySelector('ovd-info-tip')).not.toBeNull();
		expect(participants?.getAttribute('aria-label')).toBe('Participants');
		expect(headers(element)).toContain('Participants');
		participants?.querySelector<HTMLButtonElement>('ovd-info-tip button')?.click();
		await stable();
		expect(host.changes).toEqual([]);

		size.set('xsmall');
		await stable();

		const label = [...element.querySelectorAll('.card .metrics dt')].find((dt) =>
			dt.textContent.includes('Participants')
		);

		expect(label?.querySelector('ovd-info-tip')).not.toBeNull();
	});

	it('shows every selected column at any non-phone width and turns rows into cards only on phones', async () => {
		const all = ['Name', 'Status', 'Started', 'Duration', 'Participants', 'Bandwidth', 'Kind', 'Client'];
		const { element, stable } = await render();

		expect(headers(element)).toEqual(all);

		for (const width of ['medium', 'small'] as const) {
			size.set(width);
			await stable();
			expect(headers(element)).toEqual(all);
		}

		TestBed.inject(PreferencesService).setHiddenColumns('rooms', ['client']);
		await stable();
		expect(headers(element)).toEqual(all.filter((header) => header !== 'Client'));

		size.set('xsmall');
		await stable();
		expect(element.querySelector('table')).toBeNull();
		expect(element.querySelector('.toolbar button')?.textContent ?? '').not.toContain('Columns');

		const card = element.querySelector('.card');

		expect(card?.querySelector('.card-title')?.textContent.trim()).toBe('room-1');
		expect(card?.querySelector('.card-line')?.textContent).toContain('active');
		expect(card?.querySelector('.card-line')?.textContent).toContain('12:00');
		expect([...(card?.querySelectorAll('.metrics dt') ?? [])].map((dt) => dt.textContent.trim())).toEqual([
			'Duration',
			'Participants'
		]);
		expect(element.querySelector('mat-select')).not.toBeNull();
	});
});

describe('CursorPaginator', () => {
	it.each([
		[51, 25, undefined, 'Showing 51–75'],
		[1, 25, 1203, 'Showing 1–25 of 1,203'],
		[1, 0, undefined, 'No rows'],
		[1, 0, 0, '0 of 0']
	])('reads the range from %i with %i rows and total %s', (start, rows, total, expected) => {
		expect(shownRange(start, rows, total)).toBe(expected);
	});

	@Component({
		selector: 'ovd-paginator-host',
		imports: [CursorPaginator],
		template: `<ovd-cursor-paginator [limit]="25" [nextCursor]="next()" [prevCursor]="prev()" [rowCount]="25" />`
	})
	class PaginatorHost {
		readonly next = signal<string | null>('abc');
		readonly prev = signal<string | null>(null);
	}

	it('is hidden while the first page has no rows', async () => {
		@Component({
			selector: 'ovd-empty-paginator-host',
			imports: [CursorPaginator],
			template: `<ovd-cursor-paginator [limit]="25" [rowCount]="0" />`
		})
		class EmptyHost {}

		TestBed.configureTestingModule({ providers: [provideRouter([])] });

		const fixture = TestBed.createComponent(EmptyHost);

		await fixture.whenStable();
		expect(
			(fixture.nativeElement as HTMLElement).querySelector('ovd-cursor-paginator')?.hasAttribute('hidden')
		).toBe(true);
	});

	it('numbers the rows from the URL page, writes the cursor with the page and stores a new page size', async () => {
		TestBed.configureTestingModule({ providers: [provideRouter([{ path: 'egress', component: PaginatorHost }])] });

		const harness = await RouterTestingHarness.create('/egress?cursor=prev&page=3&status=active');
		const element = routeElement(harness);
		const [prev, next] = [...element.querySelectorAll<HTMLButtonElement>('.buttons button')];

		expect(element.querySelector('.range')?.textContent.trim()).toBe('Showing 51–75');
		expect(element.querySelector('.range')?.getAttribute('aria-live')).toBe('polite');
		expect(prev?.disabled).toBe(true);
		expect(next?.disabled).toBe(false);

		next?.click();
		await harness.fixture.whenStable();
		expect(TestBed.inject(Router).url).toBe('/egress?cursor=abc&page=4&status=active');
		expect(element.querySelector('.range')?.textContent.trim()).toBe('Showing 76–100');

		const host = harness.routeDebugElement?.componentInstance as PaginatorHost;

		host.prev.set('first');
		await harness.fixture.whenStable();
		element.querySelector<HTMLButtonElement>('.buttons button')?.click();
		await harness.fixture.whenStable();
		expect(TestBed.inject(Router).url).toBe('/egress?cursor=first&page=3&status=active');

		TestBed.inject(PreferencesService);
		(childComponent(harness, 'ovd-cursor-paginator') as { setLimit(limit: number): void }).setLimit(100);
		await harness.fixture.whenStable();
		expect(TestBed.inject(Router).url).toBe('/egress?status=active&limit=100');
		expect(TestBed.inject(PreferencesService).pageSize()).toBe(100);
	});
});
