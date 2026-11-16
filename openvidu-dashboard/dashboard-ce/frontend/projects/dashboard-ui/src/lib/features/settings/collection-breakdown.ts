import { Component, computed, inject, input } from '@angular/core';
import { MatTooltip } from '@angular/material/tooltip';
import { Collection } from '@openvidu-dashboard/typings';

import { QueryStateService } from '../../core/state/query-state.js';
import { formatBytes, formatNumber, formatTimestamp } from '../../format/formatters.js';
import type { StorageCollectionEntry } from './storage-classes.js';

/** Collections without an index that leads with their time field, which the info endpoint never dates. */
const UNDATED: ReadonlySet<Collection> = new Set([
	Collection.TRACKS,
	Collection.TRACK_SUBSCRIPTIONS,
	Collection.TRACK_STATS
]);
const UNDATED_HINT = "Not shown: no index starts with this collection's time field";

/** The collections behind one data class of the Storage table, with their documents, size and oldest document. */
@Component({
	selector: 'ovd-collection-breakdown',
	imports: [MatTooltip],
	template: `
		<table [attr.aria-label]="caption()">
			<thead>
				<tr>
					<th scope="col">Collection</th>
					<th scope="col" class="end">Documents</th>
					<th scope="col" class="end">Size</th>
					<th scope="col">Oldest</th>
				</tr>
			</thead>
			<tbody>
				@for (row of rows(); track row.collection) {
					<tr>
						<th scope="row" class="ovd-mono">{{ row.collection }}</th>
						<td class="end ovd-tabular">{{ row.documents }}</td>
						<td class="end ovd-tabular">{{ row.size }}</td>
						<td class="ovd-tabular">
							@if (row.undatedHint) {
								<span tabindex="0" [matTooltip]="row.undatedHint">{{ row.oldest }}</span>
							} @else {
								{{ row.oldest }}
							}
						</td>
					</tr>
				} @empty {
					<tr>
						<td colspan="4">No collections yet</td>
					</tr>
				}
			</tbody>
		</table>
	`,
	styles: `
		:host {
			display: block;
			padding: 4px 0 8px 32px;
		}

		table {
			border-collapse: collapse;
		}

		th,
		td {
			padding: 4px 16px 4px 0;
			text-align: start;
			white-space: nowrap;
			font: var(--mat-sys-body-small);
		}

		thead th {
			color: var(--mat-sys-on-surface-variant);
		}

		.end {
			text-align: end;
		}
	`
})
export class CollectionBreakdown {
	private readonly tz = inject(QueryStateService).tz;

	/** The class the collections belong to. */
	readonly label = input.required<string>();
	readonly collections = input.required<readonly StorageCollectionEntry[]>();

	protected readonly caption = computed(() => `Collections of ${this.label()}`);
	protected readonly rows = computed(() =>
		this.collections().map(({ collection, entry }) => ({
			collection,
			documents: formatNumber(entry.documents),
			size: formatBytes(entry.storageBytes + entry.indexBytes),
			oldest: entry.oldest === undefined ? '—' : formatTimestamp(entry.oldest, { tz: this.tz() }),
			undatedHint: entry.oldest === undefined && UNDATED.has(collection) ? UNDATED_HINT : null
		}))
	);
}
