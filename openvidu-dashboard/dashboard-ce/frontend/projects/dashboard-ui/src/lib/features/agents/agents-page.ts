import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatOption, MatSelect } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { type ListResponse, type ParticipantListItem, type ParticipantsSummary } from '@openvidu-dashboard/typings';
import { RoomChip } from '../../components/badges/room-chip.js';
import { CursorPaginator } from '../../components/data-table/cursor-paginator.js';
import { Notice } from '../../components/feedback/notice.js';
import { ListSearch } from '../../components/search/list-search.js';
import { KpiTile } from '../../components/tiles/kpi-tile.js';
import { TileRow } from '../../components/tiles/tile-row.js';
import { StorageService } from '../../core/preferences/storage.js';
import { injectListLoader } from '../../core/refresh/list-loader.js';
import { LiveCountersService } from '../../core/refresh/live-counters.js';
import { ListStateService } from '../../core/state/list-state.js';
import { QueryStateService } from '../../core/state/query-state.js';
import { formatNumber } from '../../format/formatters.js';
import { injectLiveCounters } from '../overview/overview-data.js';
import {
	injectParticipantSessions,
	PARTICIPANT_STATUS_LABELS,
	PARTICIPANT_STATUSES
} from '../participants/participant-sessions.js';
import { ParticipantSessionsTable } from '../participants/participant-sessions-table/participant-sessions-table.js';
import { type AgentsListRequest, ParticipantsDataService } from '../participants/participants-data.js';

const NOTICE_KEY = 'ovd.agents-notice-dismissed';

interface AgentsData {
	page: ListResponse<ParticipantListItem>;
	summary: ParticipantsSummary | null;
}

/** Agent sessions: participant sessions of kind AGENT with the live agents counter. */
@Component({
	selector: 'ovd-agents-page',
	imports: [
		CursorPaginator,
		KpiTile,
		ListSearch,
		MatFormField,
		MatLabel,
		MatOption,
		MatSelect,
		Notice,
		ParticipantSessionsTable,
		RoomChip,
		RouterLink,
		TileRow
	],
	templateUrl: './agents-page.html',
	styleUrl: './agents-page.scss'
})
export class AgentsPage {
	private readonly data = inject(ParticipantsDataService);
	private readonly query = inject(QueryStateService);
	private readonly listState = inject(ListStateService);
	private readonly storage = inject(StorageService);

	protected readonly statuses = PARTICIPANT_STATUSES;
	protected readonly statusLabels = PARTICIPANT_STATUS_LABELS;
	protected readonly limit = this.query.limit;
	protected readonly sessions = injectParticipantSessions({ kindColumn: false });
	protected readonly activeAgents = inject(LiveCountersService).activeAgents;
	protected readonly noticeOpen = signal(this.storage.get(NOTICE_KEY) !== 'true');
	protected readonly participantsLink = computed(() => this.listState.withRange({ kind: 'AGENT' }));

	private readonly request = computed<AgentsListRequest>(() => ({
		range: this.listState.range(),
		q: this.sessions.q(),
		status: this.sessions.status(),
		room: this.sessions.room(),
		sort: this.sessions.sort(),
		order: this.sessions.order(),
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

			this.sessions.remember(page.items);
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

	protected clearFilters(): void {
		void this.query.navigate({ q: null, status: null, room: null });
	}

	protected dismissNotice(): void {
		this.noticeOpen.set(false);
		this.storage.set(NOTICE_KEY, 'true');
	}

	protected retry(): void {
		void this.loader.scheduler.refresh();
	}
}
