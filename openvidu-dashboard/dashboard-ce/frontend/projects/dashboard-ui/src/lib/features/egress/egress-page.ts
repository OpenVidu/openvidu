import { Component, computed, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatTooltip } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import {
	EGRESS_IN_FLIGHT_STATUSES,
	type EgressListItem,
	EgressSort,
	EgressStatus,
	type EgressSummary,
	EgressType,
	type ListResponse
} from '@openvidu-dashboard/typings';

import { CopyButton } from '../../components/copy-button.js';
import { CursorPaginator } from '../../components/cursor-paginator.js';
import { DataTable, type SortChange, TableCell, type TableColumn } from '../../components/data-table.js';
import { RangePickerService } from '../../components/date-time-range-picker.js';
import { Duration } from '../../components/duration.js';
import { EmptyState } from '../../components/empty-state.js';
import { KindBadge } from '../../components/kind-badge.js';
import { KpiTile } from '../../components/kpi-tile.js';
import { exactListId, ListSearch, listSearchQuery } from '../../components/list-search.js';
import { RoomChip } from '../../components/room-chip.js';
import { StatusBadge } from '../../components/status-badge.js';
import { TileRow } from '../../components/tile-row.js';
import { EntityPreviewService } from '../../core/entity-preview.js';
import { injectListLoader } from '../../core/list-loader.js';
import { ListStateService } from '../../core/list-state.js';
import { QueryStateService } from '../../core/query-state.js';
import { injectRankedSortLimits, rankedSortReasons } from '../../core/ranked-sort.js';
import { resolveRange } from '../../core/relative-time.js';
import { injectTicker } from '../../core/ticker.js';
import { formatDuration, formatNumber, formatTimestamp } from '../../format/formatters.js';
import { EGRESS_STATUS_LABELS, EGRESS_TYPE_LABELS, RECONCILER_ESTIMATE } from '../../format/labels.js';
import { isRoomSid } from '../rooms/room-display.js';
import { egressErrorHint, egressErrorMarker, egressPreview } from './egress-display.js';
import { EgressDataService, type EgressListRequest } from './egress-data.js';
import { EgressOutputs } from './egress-outputs.js';

const STATUSES = Object.values(EgressStatus);
const TYPES = Object.values(EgressType);
const SORTS = Object.values(EgressSort);
/** Sorts ranked in memory over the range, with their column names. */
const RANKED_SORTS: Readonly<Partial<Record<EgressSort, string>>> = { endedAt: 'Ended', duration: 'Duration' };

/** Options of the status select; Active stands for every in-flight status. */
const STATUS_OPTIONS: readonly { key: string; label: string; statuses: readonly EgressStatus[] }[] = [
	{ key: 'in-flight', label: 'Active', statuses: EGRESS_IN_FLIGHT_STATUSES },
	{ key: 'complete', label: 'Complete', statuses: ['complete'] },
	{ key: 'failed', label: 'Failed', statuses: ['failed'] },
	{ key: 'aborted', label: 'Aborted', statuses: ['aborted'] },
	{ key: 'limit_reached', label: 'Limit reached', statuses: ['limit_reached'] }
];

interface EgressData {
	page: ListResponse<EgressListItem>;
	summary: EgressSummary | null;
}

/** Egresses started in the range: summary tiles, status, type, room and search filters, and live refresh. */
@Component({
	selector: 'ovd-egress-page',
	imports: [
		CopyButton,
		CursorPaginator,
		DataTable,
		Duration,
		EgressOutputs,
		EmptyState,
		KindBadge,
		KpiTile,
		ListSearch,
		MatButton,
		MatFormField,
		MatIcon,
		MatLabel,
		MatOption,
		MatSelect,
		MatTooltip,
		RoomChip,
		RouterLink,
		StatusBadge,
		TableCell,
		TileRow
	],
	templateUrl: './egress-page.html',
	styleUrl: './egress-page.scss'
})
export class EgressPage {
	private readonly data = inject(EgressDataService);
	private readonly query = inject(QueryStateService);
	private readonly listState = inject(ListStateService);
	private readonly previews = inject(EntityPreviewService);
	private readonly rangePicker = inject(RangePickerService);
	private readonly limits = injectRankedSortLimits();
	/** Last summary received, kept on the tiles when a summary request fails. */
	private lastSummary: EgressSummary | null = null;

	protected readonly statusOptions = STATUS_OPTIONS;
	protected readonly types = TYPES;
	protected readonly typeLabels = EGRESS_TYPE_LABELS;
	protected readonly estimate = RECONCILER_ESTIMATE;
	protected readonly now = injectTicker();
	protected readonly tz = this.query.tz;
	protected readonly limit = this.query.limit;

	protected readonly statuses = computed(() => this.query.csv('status', STATUSES));
	protected readonly selectedStatusOptions = computed(() => {
		const statuses = this.statuses();

		return STATUS_OPTIONS.filter((option) => option.statuses.every((status) => statuses.includes(status))).map(
			(option) => option.key
		);
	});
	protected readonly selectedTypes = computed(() => this.query.csv('type', TYPES));
	protected readonly q = computed(() => listSearchQuery(this.query.q(), 'egress'));
	protected readonly exactId = computed(() => exactListId(this.q(), 'egress'));
	protected readonly room = computed(() => {
		const value = this.query.value('room');

		return value !== null && isRoomSid(value) ? value : null;
	});
	private readonly rangeMs = computed(() => {
		const resolved = resolveRange(this.listState.range(), new Date());

		return resolved === undefined ? Number.POSITIVE_INFINITY : resolved.to.getTime() - resolved.from.getTime();
	});
	private readonly sortReasons = computed(() =>
		rankedSortReasons(RANKED_SORTS, this.rangeMs(), this.limits()?.rankedSortMaxRangeMs)
	);
	private readonly urlSort = computed(() => this.query.oneOf('sort', SORTS, EgressSort.STARTED_AT));
	/** The URL's sort, or Started descending when the range is too wide for it. */
	protected readonly sort = computed<EgressSort>(() =>
		this.sortReasons()[this.urlSort()] === undefined ? this.urlSort() : EgressSort.STARTED_AT
	);
	protected readonly order = computed(() => (this.sort() === this.urlSort() ? this.query.order() : 'desc'));

	private readonly request = computed<EgressListRequest>(() => ({
		range: this.listState.range(),
		status: this.statuses(),
		type: this.selectedTypes(),
		room: this.room(),
		q: this.q(),
		sort: this.sort(),
		order: this.order(),
		cursor: this.query.cursor(),
		limit: this.limit()
	}));

	private readonly loader = injectListLoader<EgressListRequest, EgressData>({
		request: this.request,
		fetch: async (request) => {
			const [page, summary] = await Promise.all([
				this.data.list(request),
				this.data.summary(request.range).catch(() => null)
			]);

			for (const item of page.items) {
				this.previews.set('egress', item.egressId, egressPreview(item));
			}

			this.lastSummary = summary ?? this.lastSummary;

			return { page, summary: this.lastSummary };
		}
	});

	protected readonly loading = this.loader.loading;
	protected readonly error = this.loader.error;
	protected readonly page = computed(() => this.loader.data()?.page ?? null);
	protected readonly rows = computed(() => this.page()?.items ?? []);
	protected readonly summary = computed(() => this.loader.data()?.summary ?? null);

	protected readonly columns = computed<TableColumn[]>(() => {
		const reasons = this.sortReasons();
		const ranked = (sort: EgressSort) => ({
			sortable: true,
			...(reasons[sort] === undefined ? {} : { sortDisabledReason: reasons[sort] })
		});

		return [
			{ key: 'egressId', header: 'Egress ID', hideable: false, card: 'title' },
			{ key: 'room', header: 'Room', card: 'metric' },
			{ key: 'type', header: 'Type' },
			{ key: 'status', header: 'Status', hideable: false, card: 'status' },
			{
				key: EgressSort.STARTED_AT,
				header: 'Started',
				sortable: true,
				hideable: false,
				card: 'timestamp',
				headerHint: this.tz()
			},
			{ key: EgressSort.ENDED_AT, header: 'Ended', headerHint: this.tz(), ...ranked('endedAt') },
			{ key: EgressSort.DURATION, header: 'Duration', align: 'end', ...ranked('duration') },
			{ key: 'outputs', header: 'Outputs', card: 'metric' }
		];
	});

	protected readonly trackEgress = (item: EgressListItem): string => item.egressId;

	protected tile(value: number | undefined): string | null {
		return value === undefined ? null : formatNumber(value);
	}

	/** The range counts come from the hourly rollups: the tiles prefix them with "≈". */
	protected approximate(): boolean {
		return this.summary()?.approximate === true;
	}

	protected typeHint(summary: EgressSummary | null): string | undefined {
		if (summary === null) {
			return undefined;
		}

		// The order of EGRESS_TYPE_LABELS, not the order of the response keys, so the hint stays put across refreshes.
		const parts = (Object.keys(EGRESS_TYPE_LABELS) as EgressType[])
			.filter((type) => (summary.byType[type] ?? 0) > 0)
			.map((type) => `${EGRESS_TYPE_LABELS[type]} ${formatNumber(summary.byType[type] ?? 0)}`);

		return parts.length === 0 ? undefined : parts.join(' · ');
	}

	protected failedHint(summary: EgressSummary | null): string | undefined {
		if (summary === null) {
			return undefined;
		}

		const parts = (['aborted', 'limit_reached'] as const)
			.filter((status) => (summary.byEndStatus[status] ?? 0) > 0)
			.map((status) => `${EGRESS_STATUS_LABELS[status]} ${formatNumber(summary.byEndStatus[status] ?? 0)}`);

		return parts.length === 0 ? undefined : parts.join(' · ');
	}

	protected recorded(summary: EgressSummary | null): string | null {
		return summary === null ? null : formatDuration(summary.totalDurationMs);
	}

	protected time(value: string): string {
		return formatTimestamp(value, { tz: this.tz(), now: this.now(), rangeMs: this.rangeMs() });
	}

	protected inFlight(item: EgressListItem): boolean {
		return EGRESS_IN_FLIGHT_STATUSES.includes(item.status);
	}

	protected errorMarker(item: EgressListItem): boolean {
		return egressErrorMarker(item);
	}

	protected errorHint(item: EgressListItem): string {
		return egressErrorHint(item);
	}

	protected setStatusOptions(keys: string[]): void {
		const statuses = STATUS_OPTIONS.filter((option) => keys.includes(option.key)).flatMap(
			(option) => option.statuses
		);

		void this.query.navigate({ status: statuses });
	}

	protected setTypes(types: EgressType[]): void {
		void this.query.navigate({ type: types });
	}

	protected setSort(change: SortChange): void {
		void this.query.navigate({ sort: change.key, order: change.order });
	}

	protected clearFilters(): void {
		void this.query.navigate({ status: null, type: null, room: null, q: null });
	}

	protected clearSearch(): void {
		void this.query.navigate({ q: null });
	}

	protected widenRange(): void {
		this.rangePicker.open();
	}

	protected retry(): void {
		void this.loader.scheduler.refresh();
	}
}
