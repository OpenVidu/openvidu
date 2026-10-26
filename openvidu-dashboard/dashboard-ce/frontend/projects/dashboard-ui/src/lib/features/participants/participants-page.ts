import { Component, computed, inject } from '@angular/core';
import { MatChip, MatChipRemove } from '@angular/material/chips';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatOption, MatSelect } from '@angular/material/select';
import {
	type ListResponse,
	type ParticipantKind,
	type ParticipantListItem,
	type ParticipantsSummary,
	VISIBLE_PARTICIPANT_KINDS
} from '@openvidu-dashboard/typings';

import { RoomChip } from '../../components/badges/room-chip.js';
import { CursorPaginator } from '../../components/data-table/cursor-paginator.js';
import { ListSearch } from '../../components/search/list-search.js';
import { KpiTile } from '../../components/tiles/kpi-tile.js';
import { TileRow } from '../../components/tiles/tile-row.js';
import { injectListLoader } from '../../core/refresh/list-loader.js';
import { ListStateService } from '../../core/state/list-state.js';
import { QueryStateService } from '../../core/state/query-state.js';
import { formatNumber } from '../../format/formatters.js';
import { INFO_TEXTS } from '../../format/info-texts.js';
import { PARTICIPANT_KIND_LABELS } from '../../format/labels.js';
import { kindFilter, kindParam, servicesHint } from './participant-display.js';
import { injectParticipantSessions, PARTICIPANT_STATUS_LABELS, PARTICIPANT_STATUSES } from './participant-sessions.js';
import { ParticipantSessionsTable } from './participant-sessions-table/participant-sessions-table.js';
import { ParticipantsDataService, type ParticipantsListRequest } from './participants-data.js';

interface ParticipantsData {
	page: ListResponse<ParticipantListItem>;
	summary: ParticipantsSummary | null;
}

/** Participant sessions of the range: summary tiles, identity search, kind, status, room and publisher filters. */
@Component({
	selector: 'ovd-participants-page',
	imports: [
		CursorPaginator,
		KpiTile,
		ListSearch,
		MatChip,
		MatChipRemove,
		MatFormField,
		MatIcon,
		MatLabel,
		MatOption,
		MatSelect,
		ParticipantSessionsTable,
		RoomChip,
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

	protected readonly kinds = VISIBLE_PARTICIPANT_KINDS;
	protected readonly kindLabels = PARTICIPANT_KIND_LABELS;
	protected readonly statuses = PARTICIPANT_STATUSES;
	protected readonly statusLabels = PARTICIPANT_STATUS_LABELS;
	protected readonly limit = this.query.limit;
	protected readonly sessions = injectParticipantSessions({ kindColumn: true });
	protected readonly selectedKinds = computed(() => kindFilter(this.query.value('kind')));
	protected readonly publisher = computed(() => this.query.value('publisher') === 'true');

	private readonly request = computed<ParticipantsListRequest>(() => ({
		range: this.listState.range(),
		q: this.sessions.q(),
		kind: this.selectedKinds(),
		status: this.sessions.status(),
		room: this.sessions.room(),
		publisher: this.publisher(),
		sort: this.sessions.sort(),
		order: this.sessions.order(),
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

			this.sessions.remember(page.items);
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

	protected removePublisher(): void {
		void this.query.navigate({ publisher: null });
	}

	protected clearFilters(): void {
		void this.query.navigate({ q: null, kind: null, status: null, room: null, publisher: null });
	}

	protected retry(): void {
		void this.loader.scheduler.refresh();
	}
}
