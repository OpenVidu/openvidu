import { Component, computed, inject, input } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatOption, MatSelect } from '@angular/material/select';
import { PAGE_SIZES, type PageSize } from '@openvidu-dashboard/typings';

import { PreferencesService } from '../core/preferences.js';
import { QueryStateService } from '../core/query-state.js';
import { formatNumber } from '../format/formatters.js';

/** "Showing x–y of total", or "Showing x–y" when the total is unknown. */
export function shownRange(rangeStart: number, rowCount: number, total?: number): string {
	if (rowCount === 0) {
		return total === undefined ? 'No rows' : `0 of ${formatNumber(total)}`;
	}

	const range = `Showing ${formatNumber(rangeStart)}–${formatNumber(rangeStart + rowCount - 1)}`;

	return total === undefined ? range : `${range} of ${formatNumber(total)}`;
}

/**
 * Prev/Next over opaque cursors, written to the URL with the page number that numbers the rows, and the page size,
 * written to the URL and the preferences. Hidden while the first page has no rows.
 */
@Component({
	selector: 'ovd-cursor-paginator',
	imports: [MatButton, MatFormField, MatLabel, MatIcon, MatOption, MatSelect],
	host: { '[hidden]': 'rowCount() === 0 && prevCursor() === null' },
	template: `
		<mat-form-field class="size" subscriptSizing="dynamic">
			<mat-label>Rows per page</mat-label>
			<mat-select [value]="limit()" (selectionChange)="setLimit($event.value)">
				@for (size of sizes; track size) {
					<mat-option [value]="size">{{ size }}</mat-option>
				}
			</mat-select>
		</mat-form-field>
		<span class="range ovd-tabular" aria-live="polite">{{ range() }}</span>
		<div class="buttons">
			<button
				matButton="outlined"
				type="button"
				[disabled]="prevCursor() === null"
				(click)="go(prevCursor(), -1)"
			>
				<mat-icon svgIcon="chevron_left" />
				Prev
			</button>
			<button matButton="outlined" type="button" [disabled]="nextCursor() === null" (click)="go(nextCursor(), 1)">
				Next
				<mat-icon svgIcon="chevron_right" iconPositionEnd />
			</button>
		</div>
	`,
	styles: `
		:host {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 8px 16px;
			margin-top: 12px;
		}

		:host([hidden]) {
			display: none;
		}

		.size {
			width: 160px;
		}

		.range {
			flex: 1;
			color: var(--mat-sys-on-surface-variant);
		}

		.buttons {
			display: flex;
			gap: 8px;
		}

		button {
			min-height: 44px;
		}
	`
})
export class CursorPaginator {
	private readonly query = inject(QueryStateService);
	private readonly preferences = inject(PreferencesService);

	readonly limit = input.required<PageSize>();
	readonly nextCursor = input<string | null>(null);
	readonly prevCursor = input<string | null>(null);
	readonly total = input<number>();
	readonly rowCount = input.required<number>();

	protected readonly sizes = PAGE_SIZES;
	/** 1-based index of the first row: the URL's page number times the page size. */
	private readonly rangeStart = computed(() => (this.query.page() - 1) * this.limit() + 1);
	protected readonly range = computed(() => shownRange(this.rangeStart(), this.rowCount(), this.total()));

	protected go(cursor: string | null, step: 1 | -1): void {
		if (cursor !== null) {
			const page = this.query.page() + step;

			void this.query.navigate({ cursor, page: page > 1 ? page : null });
		}
	}

	protected setLimit(limit: PageSize): void {
		this.preferences.update({ pageSize: limit });
		void this.query.navigate({ limit });
	}
}
