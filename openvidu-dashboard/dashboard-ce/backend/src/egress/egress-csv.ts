import type { EgressListItem } from '@openvidu-dashboard/typings';

import type { CsvColumn } from '../api/csv.js';

/** Columns of the egresses export: the list item's fields, which carry no output location, URL or request. */
export const EGRESS_CSV_COLUMNS: readonly CsvColumn<EgressListItem>[] = [
	{ header: 'egressId', value: (egress) => egress.egressId },
	{ header: 'roomSid', value: (egress) => egress.roomSid },
	{ header: 'roomName', value: (egress) => egress.roomName },
	{ header: 'type', value: (egress) => egress.type },
	{ header: 'sourceType', value: (egress) => egress.sourceType },
	{ header: 'status', value: (egress) => egress.status },
	{ header: 'closedBy', value: (egress) => egress.closedBy },
	{ header: 'startedAt', value: (egress) => egress.startedAt },
	{ header: 'endedAt', value: (egress) => egress.endedAt },
	{ header: 'durationMs', value: (egress) => egress.durationMs },
	{ header: 'outputs.kinds', value: (egress) => egress.outputs.kinds },
	{ header: 'outputs.count', value: (egress) => egress.outputs.count },
	{ header: 'hasError', value: (egress) => egress.hasError },
	{ header: 'errorCode', value: (egress) => egress.errorCode }
];
