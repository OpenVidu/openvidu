import { Component, input, output } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import type { ParticipantListItem, SortOrder } from '@openvidu-dashboard/typings';

import { KindBadge } from '../../../components/badges/kind-badge.js';
import { SourceIcon } from '../../../components/badges/source-icon.js';
import { StatusBadge } from '../../../components/badges/status-badge.js';
import { CopyButton } from '../../../components/copy-button/copy-button.js';
import { DataTable, type SortChange, TableCell, type TableColumn } from '../../../components/data-table/data-table.js';
import { Duration } from '../../../components/duration/duration.js';
import { EmptyState } from '../../../components/feedback/empty-state.js';

/** The table of a list of participant sessions, with its cells and its empty states. */
@Component({
	selector: 'ovd-participant-sessions-table',
	imports: [
		CopyButton,
		DataTable,
		Duration,
		EmptyState,
		KindBadge,
		MatButton,
		RouterLink,
		SourceIcon,
		StatusBadge,
		TableCell
	],
	templateUrl: './participant-sessions-table.html',
	styleUrl: './participant-sessions-table.scss'
})
export class ParticipantSessionsTable {
	readonly tableId = input.required<string>();
	readonly caption = input.required<string>();
	readonly columns = input.required<readonly TableColumn[]>();
	readonly rows = input.required<readonly ParticipantListItem[]>();
	readonly sort = input.required<string>();
	readonly order = input.required<SortOrder>();
	readonly loading = input(false);
	readonly error = input<unknown>(null);
	readonly pageSize = input.required<number>();
	/** The exact participant SID searched for, which gets its own empty state. */
	readonly exactId = input<string | null>(null);
	/** What the list holds, for its empty state: "No participants match". */
	readonly noun = input.required<string>();
	readonly time = input.required<(value: string) => string>();

	readonly sortChange = output<SortChange>();
	readonly retry = output();
	readonly clearSearch = output();
	readonly clearFilters = output();
	readonly widenRange = output();

	protected readonly trackSession = (item: ParticipantListItem): string => item.sid;

	/** Hint of an active session the list response marks stale. */
	protected staleHint(item: ParticipantListItem): string | undefined {
		return item.stale === true ? 'No recent stats from this session' : undefined;
	}
}
