import { computed, inject } from '@angular/core';
import { type ParticipantListItem, ParticipantSort, ParticipantStatus } from '@openvidu-dashboard/typings';

import type { SortChange, TableColumn } from '../../components/data-table/data-table.js';
import { RangePickerService } from '../../components/date-time-range-picker/date-time-range-picker.js';
import { exactListId, listSearchQuery } from '../../components/search/list-search.js';
import { EntityPreviewService } from '../../core/state/entity-preview.js';
import { ListStateService } from '../../core/state/list-state.js';
import { QueryStateService } from '../../core/state/query-state.js';
import { injectRankedSort } from '../../core/state/ranked-sort.js';
import { rangeSpanMs } from '../../core/state/relative-time.js';
import { formatTimestamp } from '../../format/formatters.js';
import { isRoomSid } from '../rooms/room-display.js';
import { participantPreview } from './participant-display.js';

export const PARTICIPANT_STATUSES = Object.values(ParticipantStatus);
export const PARTICIPANT_STATUS_LABELS: Readonly<Record<ParticipantStatus, string>> = {
	joining: 'Joining',
	active: 'Active',
	left: 'Left',
	aborted: 'Aborted'
};

const SORTS = Object.values(ParticipantSort);
/** Sorts ranked in memory over the range, with their column names. */
const RANKED_SORTS: Readonly<Partial<Record<ParticipantSort, string>>> = { leftAt: 'Left', duration: 'Duration' };

/**
 * The URL state of a list of participant sessions (search, status, room, range and sort), its columns and actions,
 * shared by the Participants and Agents pages. Call it in an injection context.
 */
export function injectParticipantSessions(options: { kindColumn: boolean }) {
	const query = inject(QueryStateService);
	const listState = inject(ListStateService);
	const previews = inject(EntityPreviewService);
	const rangePicker = inject(RangePickerService);

	const q = computed(() => listSearchQuery(query.q(), 'participant'));
	const room = computed(() => {
		const value = query.value('room');

		return value !== null && isRoomSid(value) ? value : null;
	});
	const rangeMs = computed(() => rangeSpanMs(listState.range(), new Date()));
	const ranked = injectRankedSort({
		sorts: SORTS,
		fallback: ParticipantSort.JOINED_AT,
		ranked: RANKED_SORTS,
		rangeMs,
		// The ranked sorts apply up to the participants limit, or with any range inside one room.
		limitMs: (limits) => (room() === null ? limits?.participantRankedSortMaxRangeMs : undefined)
	});

	return {
		q,
		exactId: computed(() => exactListId(q(), 'participant')),
		status: computed(() => {
			const value = query.value('status');

			return PARTICIPANT_STATUSES.includes(value as ParticipantStatus) ? (value as ParticipantStatus) : null;
		}),
		room,
		sort: ranked.sort,
		order: ranked.order,
		columns: computed<TableColumn[]>(() => [
			{ key: 'sid', header: 'SID', hideable: false, card: 'title' },
			{ key: 'identity', header: 'Identity' },
			{ key: 'name', header: 'Name' },
			{ key: 'room', header: 'Room', card: 'metric' },
			...(options.kindColumn ? [{ key: 'kind', header: 'Kind' }] : []),
			{ key: 'status', header: 'Status', hideable: false, card: 'status' },
			{
				key: ParticipantSort.JOINED_AT,
				header: 'Joined',
				sortable: true,
				hideable: false,
				card: 'timestamp',
				headerHint: query.tz()
			},
			{ key: ParticipantSort.LEFT_AT, header: 'Left', headerHint: query.tz(), ...ranked.column('leftAt') },
			{
				key: ParticipantSort.DURATION,
				header: 'Duration',
				align: 'end',
				card: 'metric',
				...ranked.column('duration')
			},
			{ key: 'published', header: 'Published', card: 'metric' },
			{ key: 'node', header: 'Node', defaultHidden: true }
		]),
		/** Dates as on the other lists: the time alone inside the current day of a range up to 24 h. */
		time: (value: string): string =>
			formatTimestamp(value, { tz: query.tz(), now: new Date(), rangeMs: rangeMs() }),
		/** Keeps the participant and room headers of the listed sessions for their detail pages. */
		remember(items: readonly ParticipantListItem[]): void {
			for (const item of items) {
				previews.set('participant', item.sid, participantPreview(item));

				if (previews.get('room', item.roomSid) === undefined) {
					previews.set('room', item.roomSid, { name: item.roomName });
				}
			}
		},
		setStatus(status: ParticipantStatus | null): void {
			void query.navigate({ status });
		},
		setSort(change: SortChange): void {
			void query.navigate({ sort: change.key, order: change.order });
		},
		clearSearch(): void {
			void query.navigate({ q: null });
		},
		widenRange(): void {
			rangePicker.open();
		}
	};
}
