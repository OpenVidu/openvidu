import type { ParticipantListItem } from '@openvidu-dashboard/typings';

import type { CsvColumn } from '../api/csv.js';

const PARTICIPANT_CSV_COLUMNS: readonly CsvColumn<ParticipantListItem>[] = [
	{ header: 'sid', value: (session) => session.sid },
	{ header: 'identity', value: (session) => session.identity },
	{ header: 'name', value: (session) => session.name },
	{ header: 'kind', value: (session) => session.kind },
	{ header: 'status', value: (session) => session.status },
	{ header: 'roomSid', value: (session) => session.roomSid },
	{ header: 'roomName', value: (session) => session.roomName },
	{ header: 'joinedAt', value: (session) => session.joinedAt },
	{ header: 'leftAt', value: (session) => session.leftAt },
	{ header: 'durationMs', value: (session) => session.durationMs },
	{ header: 'connectionType', value: (session) => session.connectionType },
	{ header: 'isPublisher', value: (session) => session.isPublisher },
	{ header: 'publishedSources', value: (session) => session.publishedSources },
	{ header: 'client.sdk', value: (session) => session.client?.sdk },
	{ header: 'client.version', value: (session) => session.client?.version },
	{ header: 'client.os', value: (session) => session.client?.os },
	{ header: 'client.osVersion', value: (session) => session.client?.osVersion },
	{ header: 'client.browser', value: (session) => session.client?.browser },
	{ header: 'client.browserVersion', value: (session) => session.client?.browserVersion }
];

/**
 * Columns of the participants and agents exports; the media node label comes last with `per-node-breakdown`, as the
 * Node column.
 */
export function participantCsvColumns(perNode: boolean): readonly CsvColumn<ParticipantListItem>[] {
	return perNode
		? [...PARTICIPANT_CSV_COLUMNS, { header: 'mediaNode', value: (session) => session.mediaNode }]
		: PARTICIPANT_CSV_COLUMNS;
}
