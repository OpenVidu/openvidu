import { Component, computed, inject, input, output } from '@angular/core';
import { MatTooltip } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { type RoomListItem, RoomSort, type SortOrder } from '@openvidu-dashboard/typings';

import { StatusBadge } from '../../../components/badges/status-badge.js';
import { CopyButton } from '../../../components/copy-button/copy-button.js';
import { DataTable, type SortChange, TableCell, type TableColumn } from '../../../components/data-table/data-table.js';
import { Duration } from '../../../components/duration/duration.js';
import { UnavailableValue } from '../../../components/feedback/unavailable-value.js';
import { MediaNodeLabel } from '../../../components/media-node/media-node.js';
import type { Download } from '../../../core/http/http.js';
import { injectTicker } from '../../../core/refresh/ticker.js';
import { QueryStateService } from '../../../core/state/query-state.js';
import { formatNumber, formatTimestamp, type TimestampOptions } from '../../../format/formatters.js';
import { INFO_TEXTS } from '../../../format/info-texts.js';
import { MEDIA_STATS_TEXTS, RECONCILER_ESTIMATE } from '../../../format/labels.js';
import { formatBandwidth, ROOM_FEATURES } from '../room-display.js';

/** Columns of the Rooms table whose sort a list ranks in memory over its range. */
export type RankedRoomSort = 'endedAt' | 'duration' | 'uniqueIdentities' | 'active';

export interface RoomColumnsOptions {
	tz: string;
	rows: readonly RoomListItem[];
	/** Sort fields of each ranked column; without it, only Started sorts. */
	ranked?: (sort: RankedRoomSort) => Partial<TableColumn>;
	/** Adds the Node column, hidden by default. */
	node?: boolean;
}

/** The columns of every table of rooms, in order. */
export function roomColumns({ tz, rows, ranked = () => ({}), node = false }: RoomColumnsOptions): TableColumn[] {
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
			headerHint: tz
		},
		{ key: RoomSort.ENDED_AT, header: 'Ended', headerHint: tz, ...ranked('endedAt') },
		{ key: RoomSort.DURATION, header: 'Duration', align: 'end', card: 'metric', ...ranked('duration') },
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
		{
			key: 'bytes',
			header: 'Data up / down',
			align: 'end',
			info: INFO_TEXTS.dataUpDown,
			...(rows.some((room) => room.mediaStats === false)
				? { warning: MEDIA_STATS_TEXTS.column, warningWhen: (room: RoomListItem) => room.mediaStats === false }
				: {})
		},
		{ key: 'features', header: 'Features', info: INFO_TEXTS.roomFeatures },
		...(node ? [{ key: 'node', header: 'Node', defaultHidden: true }] : [])
	];
}

/** A table of rooms with the cells of the Rooms page; the empty state is projected with `ovdTableEmpty`. */
@Component({
	selector: 'ovd-rooms-table',
	imports: [
		CopyButton,
		DataTable,
		Duration,
		MatTooltip,
		MediaNodeLabel,
		RouterLink,
		StatusBadge,
		TableCell,
		UnavailableValue
	],
	templateUrl: './rooms-table.html',
	styleUrl: './rooms-table.scss'
})
export class RoomsTable {
	private readonly tz = inject(QueryStateService).tz;
	private readonly now = injectTicker();

	readonly tableId = input.required<string>();
	readonly caption = input('Rooms');
	readonly columns = input.required<readonly TableColumn[]>();
	readonly rows = input.required<readonly RoomListItem[]>();
	readonly sort = input<string | null>(RoomSort.CREATED_AT);
	readonly order = input<SortOrder>('desc');
	readonly loading = input(false);
	readonly error = input<unknown>(null);
	readonly pageSize = input(25);
	/** Downloads the CSV of the list; with it the table shows Export CSV. */
	readonly exportCsv = input<(() => Promise<Download>) | null>(null);
	/** Span of the list's range, which sets how much of a date the times show. */
	readonly rangeMs = input<number>();

	readonly sortChange = output<SortChange>();
	readonly retry = output();

	protected readonly features = ROOM_FEATURES;
	protected readonly estimate = RECONCILER_ESTIMATE;
	private readonly timeOptions = computed<TimestampOptions>(() => {
		const rangeMs = this.rangeMs();

		return { tz: this.tz(), now: this.now(), ...(rangeMs === undefined ? {} : { rangeMs }) };
	});

	protected readonly trackRoom = (room: RoomListItem): string => room.sid;

	protected time(value: string): string {
		return formatTimestamp(value, this.timeOptions());
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
}
