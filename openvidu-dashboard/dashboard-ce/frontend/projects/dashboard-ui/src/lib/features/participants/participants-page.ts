import { Component, computed, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatChip, MatChipRemove } from '@angular/material/chips';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatOption, MatSelect } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import {
	type ListResponse,
	type ParticipantKind,
	type ParticipantListItem,
	type ParticipantsSummary,
	ParticipantSort,
	ParticipantStatus,
	VISIBLE_PARTICIPANT_KINDS
} from '@openvidu-dashboard/typings';

import { KindBadge } from '../../components/badges/kind-badge.js';
import { RoomChip } from '../../components/badges/room-chip.js';
import { SourceIcon } from '../../components/badges/source-icon.js';
import { StatusBadge } from '../../components/badges/status-badge.js';
import { CopyButton } from '../../components/copy-button/copy-button.js';
import { CursorPaginator } from '../../components/data-table/cursor-paginator.js';
import { DataTable, type SortChange, TableCell, type TableColumn } from '../../components/data-table/data-table.js';
import { RangePickerService } from '../../components/date-time-range-picker/date-time-range-picker.js';
import { Duration } from '../../components/duration/duration.js';
import { EmptyState } from '../../components/feedback/empty-state.js';
import { exactListId, ListSearch, listSearchQuery } from '../../components/search/list-search.js';
import { KpiTile } from '../../components/tiles/kpi-tile.js';
import { TileRow } from '../../components/tiles/tile-row.js';
import { injectListLoader } from '../../core/refresh/list-loader.js';
import { EntityPreviewService } from '../../core/state/entity-preview.js';
import { ListStateService } from '../../core/state/list-state.js';
import { QueryStateService } from '../../core/state/query-state.js';
import { injectRankedSortLimits, rankedSortReasons } from '../../core/state/ranked-sort.js';
import { resolveRange } from '../../core/state/relative-time.js';
import { formatNumber, formatTimestamp } from '../../format/formatters.js';
import { INFO_TEXTS } from '../../format/info-texts.js';
import { PARTICIPANT_KIND_LABELS } from '../../format/labels.js';
import { isRoomSid } from '../rooms/room-display.js';
import { kindFilter, kindParam, participantPreview, servicesHint } from './participant-display.js';
import { ParticipantsDataService, type ParticipantsListRequest } from './participants-data.js';

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

interface ParticipantsData {
	page: ListResponse<ParticipantListItem>;
	summary: ParticipantsSummary | null;
}

/** Participant sessions of the range: summary tiles, identity search, kind, status, room and publisher filters. */
@Component({
	selector: 'ovd-participants-page',
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
		MatChip,
		MatChipRemove,
		MatFormField,
		MatIcon,
		MatLabel,
		MatOption,
		MatSelect,
		RoomChip,
		RouterLink,
		SourceIcon,
		StatusBadge,
		TableCell,
		TileRow
	],
	templateUrl: './participants-page.html',
	styleUrl: './participants-page.scss'
})
export class ParticipantsPage {
	protected readonly infoTexts = INFO_TEXTS;
	private readonly data = inject(ParticipantsDataService);
	private readonly query = inject(QueryStateService);
	private readonly listState = inject(ListStateService);
	private readonly previews = inject(EntityPreviewService);
	private readonly rangePicker = inject(RangePickerService);
	private readonly limits = injectRankedSortLimits();

	protected readonly kinds = VISIBLE_PARTICIPANT_KINDS;
	protected readonly kindLabels = PARTICIPANT_KIND_LABELS;
	protected readonly statuses = STATUSES;
	protected readonly statusLabels = STATUS_LABELS;
	protected readonly tz = this.query.tz;
	protected readonly limit = this.query.limit;
	protected readonly q = computed(() => listSearchQuery(this.query.q(), 'participant'));
	protected readonly exactId = computed(() => exactListId(this.q(), 'participant'));
	protected readonly selectedKinds = computed(() => kindFilter(this.query.value('kind')));
	protected readonly status = computed(() => {
		const value = this.query.value('status');

		return STATUSES.includes(value as ParticipantStatus) ? (value as ParticipantStatus) : null;
	});
	protected readonly room = computed(() => {
		const value = this.query.value('room');

		return value !== null && isRoomSid(value) ? value : null;
	});
	protected readonly publisher = computed(() => this.query.value('publisher') === 'true');
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

	private readonly request = computed<ParticipantsListRequest>(() => ({
		range: this.listState.range(),
		q: this.q(),
		kind: this.selectedKinds(),
		status: this.status(),
		room: this.room(),
		publisher: this.publisher(),
		sort: this.sort(),
		order: this.order(),
		cursor: this.query.cursor(),
		limit: this.limit()
	}));

	/** Last summary received, kept on the tiles when a summary request fails. */
	private lastSummary: ParticipantsSummary | null = null;

	private readonly loader = injectListLoader<ParticipantsListRequest, ParticipantsData>({
		request: this.request,
		fetch: async (request): Promise<ParticipantsData> => {
			const [page, summary] = await Promise.all([
				this.data.list(request),
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
	protected readonly servicesHint = computed(() => {
		const summary = this.summary();

		return summary === null ? null : servicesHint(summary.active.byKind);
	});
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
			{ key: 'kind', header: 'Kind' },
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

	protected readonly trackParticipant = (item: ParticipantListItem): string => item.sid;

	protected time(value: string): string {
		return formatTimestamp(value, { tz: this.tz(), now: new Date(), rangeMs: this.rangeMs() });
	}

	/** Hint of an active session the list response marks stale. */
	protected staleHint(item: ParticipantListItem): string | undefined {
		return item.stale === true ? 'No recent stats from this session' : undefined;
	}

	protected setKinds(kinds: ParticipantKind[]): void {
		void this.query.navigate({ kind: kindParam(kinds) });
	}

	protected tile(value: number | undefined): string | null {
		return value === undefined ? null : formatNumber(value);
	}

	/** The range counts come from the hourly rollups: the tiles prefix them with "≈". */
	protected approximate(): boolean {
		return this.summary()?.approximate === true;
	}

	protected setStatus(status: ParticipantStatus | null): void {
		void this.query.navigate({ status });
	}

	protected removePublisher(): void {
		void this.query.navigate({ publisher: null });
	}

	protected setSort(change: SortChange): void {
		void this.query.navigate({ sort: change.key, order: change.order });
	}

	protected clearFilters(): void {
		void this.query.navigate({ q: null, kind: null, status: null, room: null, publisher: null });
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
