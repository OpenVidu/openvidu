import { NgComponentOutlet } from '@angular/common';
import { Component, computed, effect, inject, signal, type Type, untracked } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { MatChipListbox, MatChipOption } from '@angular/material/chips';
import { MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatTooltip } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import {
	type RoomFeature,
	type RoomListItem,
	RoomSort,
	RoomStatusFilter,
	type RoomSummary
} from '@openvidu-dashboard/typings';

import { StatusBadge } from '../../components/badges/status-badge.js';
import { CopyButton } from '../../components/copy-button/copy-button.js';
import { CursorPaginator } from '../../components/data-table/cursor-paginator.js';
import { type SortChange, type TableColumn, DataTable, TableCell } from '../../components/data-table/data-table.js';
import { RangePickerService } from '../../components/date-time-range-picker/date-time-range-picker.js';
import { Duration } from '../../components/duration/duration.js';
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
import { injectRankedSortLimits, rankedSortReasons } from '../../core/state/ranked-sort.js';
import { resolveRange } from '../../core/state/relative-time.js';
import { formatNumber, formatTimestamp } from '../../format/formatters.js';
import { INFO_TEXTS } from '../../format/info-texts.js';
import { RECONCILER_ESTIMATE } from '../../format/labels.js';
import { formatBandwidth, ROOM_FEATURES, roomPreview } from './room-display.js';
import { ROOMS_NODE_FILTER, RoomsDataService, type RoomsListRequest } from './rooms-data.js';

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
		CopyButton,
		CursorPaginator,
		DataTable,
		Duration,
		EmptyState,
		KpiTile,
		ListSearch,
		MatButton,
		MatButtonToggle,
		MatButtonToggleGroup,
		MatChipListbox,
		MatChipOption,
		MatFormField,
		MatIcon,
		MatLabel,
		MatOption,
		MatSelect,
		MatSuffix,
		MatTooltip,
		NgComponentOutlet,
		RouterLink,
		StatusBadge,
		TableCell,
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
	private readonly limits = injectRankedSortLimits();

	protected readonly features = ROOM_FEATURES;
	protected readonly estimate = RECONCILER_ESTIMATE;
	protected readonly now = injectTicker();
	protected readonly tz = this.query.tz;
	protected readonly limit = this.query.limit;
	/** The `ROOMS_NODE_FILTER` select with `per-node-breakdown`, the locked select without it. */
	protected readonly nodeFilter = inject(FeatureService).enabledSignal('per-node-breakdown');
	private readonly loadNodeFilter = inject(ROOMS_NODE_FILTER);
	protected readonly nodeSelect = signal<Type<unknown> | null>(null);
	protected readonly nodeLockHint = 'Filtering by node is available in OpenVidu PRO';

	protected readonly status = computed(() => this.query.oneOf('status', STATUSES, RoomStatusFilter.ALL));
	protected readonly q = computed(() => listSearchQuery(this.query.q(), 'room'));
	protected readonly exactId = computed(() => exactListId(this.q(), 'room'));
	protected readonly selectedFeatures = computed(() => this.query.csv('features', FEATURE_KEYS));
	protected readonly nodeId = computed(() => (this.nodeFilter() ? this.query.value('nodeId') : null));
	private readonly rangeMs = computed(() => {
		const resolved = resolveRange(this.listState.range(), this.now());

		return resolved === undefined ? Number.POSITIVE_INFINITY : resolved.to.getTime() - resolved.from.getTime();
	});
	/** Range span when the range last changed, so the ticker never re-renders the headers. */
	private readonly requestRangeMs = computed(() => {
		this.listState.range();

		return untracked(this.rangeMs);
	});
	private readonly sortReasons = computed(() =>
		rankedSortReasons(RANKED_SORTS, this.requestRangeMs(), this.limits()?.rankedSortMaxRangeMs)
	);
	/** The URL's sort, or Started descending when the range is too wide for it. */
	protected readonly sort = computed<RoomSort>(() => {
		const sort = this.query.oneOf('sort', SORTS, RoomSort.CREATED_AT);

		return this.sortReasons()[sort] === undefined ? sort : RoomSort.CREATED_AT;
	});
	protected readonly order = computed(() =>
		this.sort() === this.query.oneOf('sort', SORTS, RoomSort.CREATED_AT) ? this.query.order() : 'desc'
	);

	private readonly request = computed<RoomsListRequest>(() => ({
		range: this.listState.range(),
		status: this.status(),
		q: this.q(),
		features: this.selectedFeatures(),
		nodeId: this.nodeId(),
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

	protected readonly columns = computed<TableColumn[]>(() => {
		const reasons = this.sortReasons();
		const ranked = (sort: RoomSort) => ({
			sortable: true,
			...(reasons[sort] === undefined ? {} : { sortDisabledReason: reasons[sort] })
		});

		return [
			{ key: 'sid', header: 'SID', hideable: false, card: 'title' },
			{ key: 'name', header: 'Name' },
			{ key: 'status', header: 'Status', hideable: false, card: 'status' },
			{
				key: RoomSort.CREATED_AT,
				header: 'Started',
				sortable: true,
				hideable: false,
				card: 'timestamp',
				headerHint: this.tz()
			},
			{ key: RoomSort.ENDED_AT, header: 'Ended', headerHint: this.tz(), ...ranked('endedAt') },
			{
				key: RoomSort.DURATION,
				header: 'Duration',
				align: 'end',
				card: 'metric',
				...ranked('duration')
			},
			{
				key: RoomSort.UNIQUE_IDENTITIES,
				header: 'Unique identities',
				align: 'end',
				card: 'metric',
				info: INFO_TEXTS.uniqueIdentities,
				...ranked('uniqueIdentities')
			},
			{
				key: RoomSort.ACTIVE,
				header: 'Active',
				align: 'end',
				card: 'metric',
				info: INFO_TEXTS.activeParticipants,
				...ranked('active')
			},
			{ key: 'bytes', header: 'Data up / down', align: 'end' },
			{ key: 'features', header: 'Features', info: INFO_TEXTS.roomFeatures },
			{ key: 'node', header: 'Node', defaultHidden: true }
		];
	});

	protected readonly trackRoom = (room: RoomListItem): string => room.sid;

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

	protected time(value: string): string {
		return formatTimestamp(value, { tz: this.tz(), now: this.now(), rangeMs: this.rangeMs() });
	}

	protected bandwidth(room: RoomListItem): string {
		return formatBandwidth(room.bytes);
	}

	/** "No stats since 12:31:05" for an active room the list response marks stale. */
	protected staleHint(room: RoomListItem): string | undefined {
		return room.stale === true && room.lastStatsAt !== undefined
			? `No stats since ${this.time(room.lastStatsAt)}`
			: undefined;
	}

	protected number(value: number): string {
		return formatNumber(value);
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
		void this.query.navigate({ status: null, q: null, features: null, nodeId: null });
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
