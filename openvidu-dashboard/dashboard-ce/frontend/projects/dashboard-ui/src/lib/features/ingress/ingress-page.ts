import { Component, computed, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatTooltip } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import {
	IngressInputType,
	type IngressListItem,
	IngressSort,
	type IngressStatus,
	type IngressSummary,
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
import { StatusBadge } from '../../components/status-badge.js';
import { TileRow } from '../../components/tile-row.js';
import { EntityPreviewService } from '../../core/entity-preview.js';
import { injectListLoader } from '../../core/list-loader.js';
import { ListStateService } from '../../core/list-state.js';
import { QueryStateService } from '../../core/query-state.js';
import { injectRankedSortLimits, rankedSortReasons } from '../../core/ranked-sort.js';
import { resolveRange } from '../../core/relative-time.js';
import { INFO_TEXTS } from '../../format/info-texts.js';
import { formatDuration, formatNumber, formatTimestamp } from '../../format/formatters.js';
import { INGRESS_INPUT_LABELS, INGRESS_STATUS_LABELS } from '../../format/labels.js';
import { IngressDataService, type IngressListRequest } from './ingress-data.js';
import { ingressPreview } from './ingress-display.js';

/** Status select order: what is publishing first. */
const STATUSES: IngressStatus[] = ['publishing', 'buffering', 'inactive', 'error', 'complete', 'deleted'];
const INPUT_TYPES = Object.values(IngressInputType);
const SORTS = Object.values(IngressSort);
/** Sorts ranked by a metric, limited by the range; Created ranks over any range. */
const METRIC_SORTS: Readonly<Partial<Record<IngressSort, string>>> = {
	totalDuration: 'Total duration',
	sessions: 'Sessions',
	lastSession: 'Last session'
};

interface IngressData {
	page: ListResponse<IngressListItem>;
	summary: IngressSummary | null;
}

/**
 * Ingress definitions active in the range (created in it, with a session started in it, or publishing): summary tiles,
 * input type, status and search filters, metric sorts and live refresh.
 */
@Component({
	selector: 'ovd-ingress-page',
	imports: [
		CopyButton,
		CursorPaginator,
		DataTable,
		Duration,
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
		RouterLink,
		StatusBadge,
		TableCell,
		TileRow
	],
	templateUrl: './ingress-page.html',
	styleUrl: './ingress-page.scss'
})
export class IngressPage {
	protected readonly infoTexts = INFO_TEXTS;
	private readonly data = inject(IngressDataService);
	private readonly query = inject(QueryStateService);
	private readonly listState = inject(ListStateService);
	private readonly previews = inject(EntityPreviewService);
	private readonly rangePicker = inject(RangePickerService);
	private readonly limits = injectRankedSortLimits();
	/** Last summary received, kept on the tiles when a summary request fails. */
	private lastSummary: IngressSummary | null = null;

	protected readonly statuses = STATUSES;
	protected readonly statusLabels = INGRESS_STATUS_LABELS;
	protected readonly inputTypes = INPUT_TYPES;
	protected readonly inputLabels = INGRESS_INPUT_LABELS;
	protected readonly tz = this.query.tz;
	protected readonly limit = this.query.limit;

	protected readonly status = computed(() => {
		const value = this.query.value('status');

		return STATUSES.includes(value as IngressStatus) ? (value as IngressStatus) : null;
	});
	protected readonly inputType = computed(() => {
		const value = this.query.value('inputType');

		return INPUT_TYPES.includes(value as IngressInputType) ? (value as IngressInputType) : null;
	});
	protected readonly q = computed(() => listSearchQuery(this.query.q(), 'ingress'));
	protected readonly exactId = computed(() => exactListId(this.q(), 'ingress'));
	private readonly rangeMs = computed(() => {
		const resolved = resolveRange(this.listState.range(), new Date());

		return resolved === undefined ? Number.POSITIVE_INFINITY : resolved.to.getTime() - resolved.from.getTime();
	});
	private readonly sortReasons = computed(() =>
		rankedSortReasons(METRIC_SORTS, this.rangeMs(), this.limits()?.rankedSortMaxRangeMs)
	);
	private readonly urlSort = computed(() => this.query.oneOf('sort', SORTS, IngressSort.CREATED_AT));
	/** The URL's sort, or Created descending when the range is too wide for it. */
	protected readonly sort = computed<IngressSort>(() =>
		this.sortReasons()[this.urlSort()] === undefined ? this.urlSort() : IngressSort.CREATED_AT
	);
	protected readonly order = computed(() => (this.sort() === this.urlSort() ? this.query.order() : 'desc'));

	private readonly request = computed<IngressListRequest>(() => ({
		range: this.listState.range(),
		status: this.status(),
		inputType: this.inputType(),
		q: this.q(),
		sort: this.sort(),
		order: this.order(),
		cursor: this.query.cursor(),
		limit: this.limit()
	}));

	private readonly loader = injectListLoader<IngressListRequest, IngressData>({
		request: this.request,
		fetch: async (request) => {
			const [page, summary] = await Promise.all([
				this.data.list(request),
				this.data.summary(request.range).catch(() => null)
			]);

			for (const item of page.items) {
				this.previews.set('ingress', item.ingressId, ingressPreview(item));
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
		const metric = (sort: IngressSort) => ({
			sortable: true,
			...(reasons[sort] === undefined ? {} : { sortDisabledReason: reasons[sort] })
		});

		return [
			{ key: 'ingressId', header: 'Ingress ID', hideable: false, card: 'title' },
			{ key: 'name', header: 'Name' },
			{ key: 'room', header: 'Room', card: 'metric' },
			{ key: 'input', header: 'Input' },
			{ key: 'status', header: 'Status', hideable: false, card: 'status' },
			{
				key: IngressSort.CREATED_AT,
				header: 'Created',
				sortable: true,
				hideable: false,
				card: 'timestamp',
				headerHint: this.tz()
			},
			{
				key: IngressSort.TOTAL_DURATION,
				header: 'Total duration',
				align: 'end',
				...metric('totalDuration')
			},
			{ key: IngressSort.SESSIONS, header: 'Sessions', align: 'end', card: 'metric', ...metric('sessions') },
			{
				key: IngressSort.LAST_SESSION,
				header: 'Last session',
				headerHint: this.tz(),
				...metric('lastSession')
			}
		];
	});

	protected readonly trackIngress = (item: IngressListItem): string => item.ingressId;

	protected tile(value: number | undefined): string | null {
		return value === undefined ? null : formatNumber(value);
	}

	/** The range counts come from the hourly rollups: the tiles prefix them with "≈". */
	protected approximate(): boolean {
		return this.summary()?.approximate === true;
	}

	protected inputHint(summary: IngressSummary | null): string | undefined {
		return summary === null
			? undefined
			: INPUT_TYPES.map(
					(type) => `${INGRESS_INPUT_LABELS[type]} ${formatNumber(summary.byInputType[type])}`
				).join(' · ');
	}

	protected total(summary: IngressSummary | null): string | null {
		return summary === null ? null : formatDuration(summary.totalDurationMs);
	}

	protected time(value: string | undefined): string {
		return value === undefined
			? '—'
			: formatTimestamp(value, { tz: this.tz(), now: new Date(), rangeMs: this.rangeMs() });
	}

	protected number(value: number): string {
		return formatNumber(value);
	}

	/** The rooms list searched by the ingress room name, in the current range. */
	protected roomParams(item: IngressListItem) {
		return this.listState.withRange({ q: item.roomName });
	}

	protected deletedHint(item: IngressListItem): string {
		return item.deletedAt === undefined ? 'Deleted' : `Deleted ${this.time(item.deletedAt)}`;
	}

	protected setStatus(status: IngressStatus | null): void {
		void this.query.navigate({ status });
	}

	protected setInputType(inputType: IngressInputType | null): void {
		void this.query.navigate({ inputType });
	}

	protected setSort(change: SortChange): void {
		void this.query.navigate({ sort: change.key, order: change.order });
	}

	protected clearFilters(): void {
		void this.query.navigate({ status: null, inputType: null, q: null });
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
