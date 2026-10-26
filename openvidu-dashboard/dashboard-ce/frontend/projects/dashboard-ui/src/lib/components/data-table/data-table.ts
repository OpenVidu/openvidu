import { NgTemplateOutlet } from '@angular/common';
import {
	Component,
	computed,
	contentChildren,
	Directive,
	effect,
	inject,
	input,
	output,
	signal,
	TemplateRef,
	untracked,
	viewChild
} from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatTooltip } from '@angular/material/tooltip';
import type { SortOrder } from '@openvidu-dashboard/typings';

import { PreferencesService } from '../../core/preferences/preferences.js';
import { BreakpointService } from '../../core/ui/breakpoints.js';
import { ErrorBanner } from '../feedback/error-banner.js';
import { Skeleton } from '../feedback/skeleton.js';
import { InfoTip } from '../info-tip/info-tip.js';
import { SectionHeaderActions } from '../tiles/section-card.js';

export interface TableColumn {
	key: string;
	header: string;
	sortable?: boolean;
	/** False for the status, the identifying link and the primary timestamp, which never hide. */
	hideable?: boolean;
	/** Place of the column in the card layout; columns without one go to the "More" area. */
	card?: 'title' | 'status' | 'timestamp' | 'metric';
	align?: 'start' | 'end';
	/** Header tooltip, e.g. the time zone of a timestamp column. */
	headerHint?: string;
	/** Explanation of the header, shown by an info tip beside it and beside the label of the card layout. */
	info?: string;
	/** Why the column cannot sort now, e.g. a range wider than the sort's limit; the header is disabled with it as tooltip. */
	sortDisabledReason?: string;
	/** Hidden until the viewer shows it from the Columns menu. */
	defaultHidden?: boolean;
}

export interface SortChange {
	key: string;
	order: SortOrder;
}

const CARD_METRICS = 3;

/** Template of the cells of one column: `<ng-template ovdCell="name" let-row>`. */
@Directive({ selector: 'ng-template[ovdCell]' })
export class TableCell {
	readonly column = input.required<string>({ alias: 'ovdCell' });
	readonly template = inject<TemplateRef<{ $implicit: unknown }>>(TemplateRef);
}

/**
 * A table that emits sort changes and never navigates: sticky header, `aria-sort`, a column menu stored as a viewer
 * preference (in the section header inside an `ovd-section-card`), skeleton rows until the first response and previous
 * rows kept under an error. It shows every selected column and scrolls sideways when they do not fit; on XSmall
 * viewports its rows render as cards.
 */
@Component({
	selector: 'ovd-data-table',
	imports: [
		NgTemplateOutlet,
		MatButton,
		MatIconButton,
		MatFormField,
		MatLabel,
		MatIcon,
		MatMenu,
		MatMenuItem,
		MatMenuTrigger,
		MatOption,
		MatSelect,
		MatTooltip,
		ErrorBanner,
		InfoTip,
		Skeleton
	],
	templateUrl: './data-table.html',
	styleUrl: './data-table.scss'
})
export class DataTable<T> {
	private readonly preferences = inject(PreferencesService);
	private readonly breakpoints = inject(BreakpointService);
	protected readonly sectionActions = inject(SectionHeaderActions, { optional: true });
	/** A response has arrived: skeletons never render again. */
	private readonly responded = signal(false);

	readonly columns = input.required<readonly TableColumn[]>();
	readonly rows = input.required<readonly T[]>();
	readonly trackBy = input.required<(row: T) => string>();
	/** Key of the column preferences, e.g. `rooms`. */
	readonly tableId = input.required<string>();
	readonly caption = input.required<string>();
	readonly sort = input<string | null>(null);
	readonly order = input<SortOrder>('desc');
	readonly loading = input(false);
	readonly error = input<unknown>(null);
	readonly pageSize = input(25);
	readonly sortChange = output<SortChange>();
	readonly retry = output();

	protected readonly cells = contentChildren(TableCell);
	protected readonly expanded = signal<ReadonlySet<string>>(new Set());
	private readonly columnsButton = viewChild<TemplateRef<unknown>>('columnsButton');

	protected readonly templates = computed(() => {
		const map = new Map<string, TemplateRef<{ $implicit: unknown }>>();

		for (const cell of this.cells()) {
			map.set(cell.column(), cell.template);
		}

		return map;
	});
	protected readonly hiddenByUser = computed(
		() =>
			new Set(
				this.preferences.hasHiddenColumns(this.tableId())
					? this.preferences.hiddenColumns(this.tableId())
					: this.columns()
							.filter((column) => column.defaultHidden === true)
							.map((column) => column.key)
			)
	);
	protected readonly hideable = computed(() => this.columns().filter((column) => column.hideable !== false));
	protected readonly visible = computed(() =>
		this.columns().filter((column) => column.hideable === false || !this.hiddenByUser().has(column.key))
	);
	protected readonly cards = computed(() => this.breakpoints.size() === 'xsmall');
	protected readonly cardColumns = computed(() => {
		const columns = this.columns().filter(
			(column) => column.hideable === false || !this.hiddenByUser().has(column.key)
		);
		const metrics = columns.filter((column) => column.card === 'metric').slice(0, CARD_METRICS);

		return {
			title: columns.find((column) => column.card === 'title'),
			status:
				columns.find((column) => column.card === 'status') ?? columns.find((column) => column.key === 'status'),
			timestamp: columns.find((column) => column.card === 'timestamp'),
			metrics,
			more: columns.filter(
				(column) =>
					(column.card === undefined && column.key !== 'status') ||
					(column.card === 'metric' && !metrics.includes(column))
			)
		};
	});
	protected readonly sortable = computed(() => this.columns().filter((column) => column.sortable === true));
	protected readonly skeletonRows = computed(() => !this.responded() && this.rows().length === 0);
	protected readonly skeletonIndexes = computed(() => Array.from({ length: this.pageSize() }, (_, index) => index));
	protected readonly empty = computed(() => this.responded() && this.error() === null && this.rows().length === 0);
	/** The Columns button renders in the table toolbar, or in the section header inside a section card. */
	protected readonly columnsInToolbar = computed(
		() => this.sectionActions === null && !this.cards() && this.hideable().length > 0
	);

	constructor() {
		effect(() => {
			if (this.rows().length > 0 || !this.loading() || this.error() !== null) {
				untracked(() => {
					this.responded.set(true);
				});
			}
		});

		effect((onCleanup) => {
			const template = this.columnsButton();
			const actions = this.sectionActions;

			if (actions === null || template === undefined || this.cards() || this.hideable().length === 0) {
				return;
			}

			actions.add(template);
			onCleanup(() => {
				actions.remove(template);
			});
		});
	}

	protected ariaSort(column: TableColumn): 'ascending' | 'descending' | 'none' | null {
		if (column.sortable !== true) {
			return null;
		}

		if (this.sort() !== column.key) {
			return 'none';
		}

		return this.order() === 'asc' ? 'ascending' : 'descending';
	}

	protected toggleSort(column: TableColumn): void {
		const order: SortOrder = this.sort() === column.key && this.order() === 'desc' ? 'asc' : 'desc';

		this.sortChange.emit({ key: column.key, order });
	}

	protected selectSort(key: string): void {
		this.sortChange.emit({ key, order: this.order() });
	}

	protected flipOrder(): void {
		const key = this.sort();

		if (key !== null) {
			this.sortChange.emit({ key, order: this.order() === 'asc' ? 'desc' : 'asc' });
		}
	}

	protected toggleColumn(key: string, shown: boolean): void {
		const hidden = new Set(this.hiddenByUser());

		if (shown) {
			hidden.delete(key);
		} else {
			hidden.add(key);
		}

		this.preferences.setHiddenColumns(this.tableId(), [...hidden]);
	}

	protected toggleMore(id: string): void {
		const next = new Set(this.expanded());

		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
		}

		this.expanded.set(next);
	}
}
