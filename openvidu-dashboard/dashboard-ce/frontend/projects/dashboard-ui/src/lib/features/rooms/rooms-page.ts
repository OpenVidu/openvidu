import { NgComponentOutlet } from '@angular/common';
import { Component, computed, effect, inject, signal, type Type, untracked } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { MatChipListbox, MatChipOption } from '@angular/material/chips';
import { type RoomFeature, RoomSort, RoomStatusFilter, type RoomSummary } from '@openvidu-dashboard/typings';

import { CursorPaginator } from '../../components/data-table/cursor-paginator.js';
import { type SortChange, type TableColumn } from '../../components/data-table/data-table.js';
import { RangePickerService } from '../../components/date-time-range-picker/date-time-range-picker.js';
import { EmptyState } from '../../components/feedback/empty-state.js';
import { exactListId, ListSearch, listSearchQuery } from '../../components/search/list-search.js';
import { KpiTile } from '../../components/tiles/kpi-tile.js';
import { TileRow } from '../../components/tiles/tile-row.js';
import { FeatureService } from '../../core/info.js';
import { injectListLoader, type ListLoader } from '../../core/refresh/list-loader.js';
import { injectTicker } from '../../core/refresh/ticker.js';
import { EntityPreviewService } from '../../core/state/entity-preview.js';
import { ListStateService } from '../../core/state/list-state.js';
import { QueryStateService } from '../../core/state/query-state.js';
import { injectRankedSort } from '../../core/state/ranked-sort.js';
import { rangeSpanMs } from '../../core/state/relative-time.js';
import { formatNumber } from '../../format/formatters.js';
import { INFO_TEXTS } from '../../format/info-texts.js';
import { ROOM_FEATURES, roomPreview } from './room-display.js';
import { ROOMS_NODE_FILTER, RoomsDataService, type RoomsListRequest } from './rooms-data.js';
import { roomColumns, RoomsTable } from './rooms-table/rooms-table.js';

const STATUSES = Object.values(RoomStatusFilter);
const SORTS = Object.values(RoomSort);
const FEATURE_KEYS = ROOM_FEATURES.map((feature) => feature.key);
/** Sorts ranked in memory over the range, with their column names. */
const RANKED_SORTS: Readonly<Partial<Record<RoomSort, string>>> = {
	endedAt: 'Ended',
	duration: 'Duration',
	uniqueIdentities: 'Unique identities',
	active: 'Active'
};

interface RoomsData {
	rooms: Awaited<ReturnType<RoomsDataService['list']>>;
	summary: RoomSummary | null;
}

/** Room sessions of the range with summary tiles, status, search, feature and node filters, and live refresh. */
@Component({
	selector: 'ovd-rooms-page',
	imports: [
		CursorPaginator,
		EmptyState,
		KpiTile,
		ListSearch,
		MatButton,
		MatButtonToggle,
		MatButtonToggleGroup,
		MatChipListbox,
		MatChipOption,
		NgComponentOutlet,
		RoomsTable,
		TileRow
	],
	templateUrl: './rooms-page.html',
	styleUrl: './rooms-page.scss'
})
export class RoomsPage {
	protected readonly infoTexts = INFO_TEXTS;
	private readonly data = inject(RoomsDataService);
	private readonly query = inject(QueryStateService);
	private readonly listState = inject(ListStateService);
	private readonly previews = inject(EntityPreviewService);
	private readonly rangePicker = inject(RangePickerService);

	protected readonly features = ROOM_FEATURES;
	protected readonly now = injectTicker();
	protected readonly tz = this.query.tz;
	protected readonly limit = this.query.limit;
	/** The `ROOMS_NODE_FILTER` select and the Node column with `per-node-breakdown`; nothing about nodes without it. */
	protected readonly nodeFilter = inject(FeatureService).enabledSignal('per-node-breakdown');
	private readonly loadNodeFilter = inject(ROOMS_NODE_FILTER);
	protected readonly nodeSelect = signal<Type<unknown> | null>(null);

	protected readonly status = computed(() => this.query.oneOf('status', STATUSES, RoomStatusFilter.ALL));
	protected readonly q = computed(() => listSearchQuery(this.query.q(), 'room'));
	protected readonly exactId = computed(() => exactListId(this.q(), 'room'));
	protected readonly selectedFeatures = computed(() => this.query.csv('features', FEATURE_KEYS));
	/** The media node label of the `node` parameter, ignored without `per-node-breakdown`. */
	protected readonly node = computed(() => (this.nodeFilter() ? this.query.value('node') : null));
	protected readonly rangeMs = computed(() => rangeSpanMs(this.listState.range(), this.now()));
	/** Range span when the range last changed, so the ticker never re-renders the headers. */
	private readonly requestRangeMs = computed(() => {
		this.listState.range();

		return untracked(this.rangeMs);
	});
	private readonly rankedSort = injectRankedSort({
		sorts: SORTS,
		fallback: RoomSort.CREATED_AT,
		ranked: RANKED_SORTS,
		rangeMs: this.requestRangeMs
	});
	protected readonly sort = this.rankedSort.sort;
	protected readonly order = this.rankedSort.order;

	private readonly request = computed<RoomsListRequest>(() => ({
		range: this.listState.range(),
		status: this.status(),
		q: this.q(),
		features: this.selectedFeatures(),
		mediaNode: this.node(),
		sort: this.sort(),
		order: this.order(),
		cursor: this.query.cursor(),
		limit: this.limit()
	}));

	/** Last summary received, kept on the tiles when a summary request fails. */
	private lastSummary: RoomSummary | null = null;

	private readonly loader: ListLoader<RoomsData> = injectListLoader<RoomsListRequest, RoomsData>({
		request: this.request,
		fetch: async (request): Promise<RoomsData> => {
			const [rooms, summary] = await Promise.all([
				this.data.list(request),
				this.data.summary(request.range).catch(() => null)
			]);

			for (const room of rooms.items) {
				this.previews.set('room', room.sid, roomPreview(room));
			}

			this.lastSummary = summary ?? this.lastSummary;

			return { rooms, summary: this.lastSummary };
		}
	});

	protected readonly loading = this.loader.loading;
	protected readonly error = this.loader.error;
	protected readonly rows = computed(() => this.loader.data()?.rooms.items ?? []);
	protected readonly page = computed(() => this.loader.data()?.rooms ?? null);
	protected readonly summary = computed(() => this.loader.data()?.summary ?? null);

	protected readonly columns = computed<TableColumn[]>(() =>
		roomColumns({
			tz: this.tz(),
			rows: this.rows(),
			ranked: (sort) => this.rankedSort.column(sort),
			node: this.nodeFilter()
		})
	);

	constructor() {
		effect(() => {
			const load = this.loadNodeFilter;

			if (this.nodeFilter() && load !== null && untracked(this.nodeSelect) === null) {
				void load().then((component) => {
					this.nodeSelect.set(component);
				});
			}
		});
	}

	protected tile(value: number | undefined): string | null {
		return value === undefined ? null : formatNumber(value);
	}

	/** The range counts come from the hourly rollups: the tiles prefix them with "≈". */
	protected approximate(): boolean {
		return this.summary()?.approximate === true;
	}

	protected setStatus(status: RoomStatusFilter): void {
		void this.query.navigate({ status: status === RoomStatusFilter.ALL ? null : status });
	}

	protected setFeatures(features: RoomFeature[]): void {
		void this.query.navigate({ features });
	}

	protected setSort(change: SortChange): void {
		void this.query.navigate({ sort: change.key, order: change.order });
	}

	protected clearFilters(): void {
		void this.query.navigate({ status: null, q: null, features: null, node: null });
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
