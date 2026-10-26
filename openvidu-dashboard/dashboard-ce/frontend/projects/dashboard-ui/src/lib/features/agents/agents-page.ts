import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatOption, MatSelect } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import {
	type ListResponse,
	type ParticipantListItem,
	type ParticipantsSummary,
	ParticipantSort,
	ParticipantStatus
} from '@openvidu-dashboard/typings';
import { CopyButton } from '../../components/copy-button.js';
import { CursorPaginator } from '../../components/cursor-paginator.js';
import { DataTable, type SortChange, TableCell, type TableColumn } from '../../components/data-table.js';
import { RangePickerService } from '../../components/date-time-range-picker.js';
import { Duration } from '../../components/duration.js';
import { EmptyState } from '../../components/empty-state.js';
import { KpiTile } from '../../components/kpi-tile.js';
import { exactListId, ListSearch, listSearchQuery } from '../../components/list-search.js';
import { Notice } from '../../components/notice.js';
import { RoomChip } from '../../components/room-chip.js';
import { SourceIcon } from '../../components/source-icon.js';
import { StatusBadge } from '../../components/status-badge.js';
import { TileRow } from '../../components/tile-row.js';
import { EntityPreviewService } from '../../core/entity-preview.js';
import { injectListLoader } from '../../core/list-loader.js';
import { ListStateService } from '../../core/list-state.js';
import { LiveCountersService } from '../../core/live-counters.js';
import { QueryStateService } from '../../core/query-state.js';
import { injectRankedSortLimits, rankedSortReasons } from '../../core/ranked-sort.js';
import { resolveRange } from '../../core/relative-time.js';
import { StorageService } from '../../core/storage.js';
import { formatNumber, formatTimestamp } from '../../format/formatters.js';
import { injectLiveCounters } from '../overview/overview-data.js';
import { participantPreview } from '../participants/participant-display.js';
import { type AgentsListRequest, ParticipantsDataService } from '../participants/participants-data.js';
import { isRoomSid } from '../rooms/room-display.js';

const STATUSES = Object.values(ParticipantStatus);
const SORTS = Object.values(ParticipantSort);
const STATUS_LABELS: Readonly<Record<ParticipantStatus, string>> = {
	joining: 'Joining',
	active: 'Active',
	left: 'Left',
	aborted: 'Aborted'
};
/** Sorts ranked in memory over the range, with their column names. */
const RANKED_SORTS: Readonly<Partial<Record<ParticipantSort, string>>> = { leftAt: 'Left', duration: 'Duration' };
const NOTICE_KEY = 'ovd.agents-notice-dismissed';

interface AgentsData {
	page: ListResponse<ParticipantListItem>;
	summary: ParticipantsSummary | null;
}

/** Agent sessions: participant sessions of kind AGENT with the live agents counter. */
@Component({
	selector: 'ovd-agents-page',
	imports: [
		CopyButton,
		CursorPaginator,
		DataTable,
		Duration,
		EmptyState,
		KpiTile,
		ListSearch,
		MatButton,
		MatFormField,
		MatLabel,
		MatOption,
		MatSelect,
		Notice,
		RoomChip,
		RouterLink,
		SourceIcon,
		StatusBadge,
		TableCell,
		TileRow
	],
	templateUrl: './agents-page.html',
	styleUrl: './agents-page.scss'
})
export class AgentsPage {
	private readonly data = inject(ParticipantsDataService);
	private readonly query = inject(QueryStateService);
	private readonly listState = inject(ListStateService);
	private readonly previews = inject(EntityPreviewService);
	private readonly rangePicker = inject(RangePickerService);
	private readonly storage = inject(StorageService);
	private readonly limits = injectRankedSortLimits();

	protected readonly statuses = STATUSES;
	protected readonly statusLabels = STATUS_LABELS;
	protected readonly tz = this.query.tz;
	protected readonly limit = this.query.limit;
	protected readonly activeAgents = inject(LiveCountersService).activeAgents;
	protected readonly noticeOpen = signal(this.storage.get(NOTICE_KEY) !== 'true');
	protected readonly participantsLink = computed(() => this.listState.withRange({ kind: 'AGENT' }));

	protected readonly q = computed(() => listSearchQuery(this.query.q(), 'participant'));
	protected readonly exactId = computed(() => exactListId(this.q(), 'participant'));
	protected readonly status = computed(() => {
		const value = this.query.value('status');

		return STATUSES.includes(value as ParticipantStatus) ? (value as ParticipantStatus) : null;
	});
	protected readonly room = computed(() => {
		const value = this.query.value('room');

		return value !== null && isRoomSid(value) ? value : null;
	});
	private readonly rangeMs = computed(() => {
		const resolved = resolveRange(this.listState.range(), new Date());

		return resolved === undefined ? Number.POSITIVE_INFINITY : resolved.to.getTime() - resolved.from.getTime();
	});
	/** The ranked sorts apply up to the participants limit, or with any range inside one room. */
	private readonly sortReasons = computed(() =>
		rankedSortReasons(
			RANKED_SORTS,
			this.rangeMs(),
			this.room() === null ? this.limits()?.participantRankedSortMaxRangeMs : undefined
		)
	);
	private readonly urlSort = computed(() => this.query.oneOf('sort', SORTS, ParticipantSort.JOINED_AT));
	/** The URL's sort, or Joined descending when the range is too wide for it. */
	protected readonly sort = computed<ParticipantSort>(() =>
		this.sortReasons()[this.urlSort()] === undefined ? this.urlSort() : ParticipantSort.JOINED_AT
	);
	protected readonly order = computed(() => (this.sort() === this.urlSort() ? this.query.order() : 'desc'));

	private readonly request = computed<AgentsListRequest>(() => ({
		range: this.listState.range(),
		q: this.q(),
		status: this.status(),
		room: this.room(),
		sort: this.sort(),
		order: this.order(),
		cursor: this.query.cursor(),
		limit: this.limit()
	}));

	/** Last summary received, kept on the tile when a summary request fails. */
	private lastSummary: ParticipantsSummary | null = null;

	private readonly loader = injectListLoader<AgentsListRequest, AgentsData>({
		request: this.request,
		fetch: async (request): Promise<AgentsData> => {
			const [page, summary] = await Promise.all([
				this.data.agents(request),
				this.data.summary(request.range).catch(() => null)
			]);

			for (const item of page.items) {
				this.previews.set('participant', item.sid, participantPreview(item));

				if (this.previews.get('room', item.roomSid) === undefined) {
					this.previews.set('room', item.roomSid, { name: item.roomName });
				}
			}

			this.lastSummary = summary ?? this.lastSummary;

			return { page, summary: this.lastSummary };
		}
	});

	protected readonly loading = this.loader.loading;
	protected readonly error = this.loader.error;
	protected readonly page = computed(() => this.loader.data()?.page ?? null);
	protected readonly summary = computed(() => this.loader.data()?.summary ?? null);
	protected readonly sessionsTile = computed(() => {
		const summary = this.summary();

		if (summary === null) {
			return null;
		}

		return formatNumber(summary.sessions.byKind.AGENT);
	});
	protected readonly approximate = computed(() => this.summary()?.approximate === true);
	protected readonly rows = computed(() => this.page()?.items ?? []);
	protected readonly columns = computed<TableColumn[]>(() => {
		const reasons = this.sortReasons();
		const ranked = (sort: ParticipantSort) => ({
			sortable: true,
			...(reasons[sort] === undefined ? {} : { sortDisabledReason: reasons[sort] })
		});

		return [
			{ key: 'sid', header: 'SID', hideable: false, card: 'title' },
			{ key: 'identity', header: 'Identity' },
			{ key: 'name', header: 'Name' },
			{ key: 'room', header: 'Room', card: 'metric' },
			{ key: 'status', header: 'Status', hideable: false, card: 'status' },
			{
				key: ParticipantSort.JOINED_AT,
				header: 'Joined',
				sortable: true,
				hideable: false,
				card: 'timestamp',
				headerHint: this.tz()
			},
			{
				key: ParticipantSort.LEFT_AT,
				header: 'Left',
				headerHint: this.tz(),
				...ranked('leftAt')
			},
			{
				key: ParticipantSort.DURATION,
				header: 'Duration',
				align: 'end',
				card: 'metric',
				...ranked('duration')
			},
			{ key: 'published', header: 'Published', card: 'metric' },
			{ key: 'node', header: 'Node', defaultHidden: true }
		];
	});
	protected readonly trackAgent = (item: ParticipantListItem): string => item.sid;

	constructor() {
		injectLiveCounters();

		let previous: number | null | undefined;

		// A new count of live agents reloads the table with the current URL state.
		effect(() => {
			const count = this.activeAgents();

			untracked(() => {
				if (previous !== undefined && count !== previous) {
					void this.loader.scheduler.refresh();
				}

				previous = count;
			});
		});
	}

	protected counter(): string | null {
		const count = this.activeAgents();

		return count === null ? null : formatNumber(count);
	}

	/** Dates as on the other lists: the time alone inside the current day of a range up to 24 h. */
	protected time(value: string): string {
		return formatTimestamp(value, { tz: this.tz(), now: new Date(), rangeMs: this.rangeMs() });
	}

	protected setStatus(status: ParticipantStatus | null): void {
		void this.query.navigate({ status });
	}

	protected setSort(change: SortChange): void {
		void this.query.navigate({ sort: change.key, order: change.order });
	}

	protected clearFilters(): void {
		void this.query.navigate({ q: null, status: null, room: null });
	}

	protected clearSearch(): void {
		void this.query.navigate({ q: null });
	}

	protected dismissNotice(): void {
		this.noticeOpen.set(false);
		this.storage.set(NOTICE_KEY, 'true');
	}

	protected widenRange(): void {
		this.rangePicker.open();
	}

	protected retry(): void {
		void this.loader.scheduler.refresh();
	}
}
