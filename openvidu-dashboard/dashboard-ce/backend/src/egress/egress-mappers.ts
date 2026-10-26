import type {
	EgressDocument,
	EgressListItem,
	EgressOutputKind,
	EgressOutputsSummary
} from '@openvidu-dashboard/typings';

import { iso } from '../api/mapping.js';
import { compact } from '../util/compact.js';

/** Fields of an egress document the list item needs; locations, URLs and messages are read only as flags. */
export const EGRESS_LIST_PROJECTION = {
	roomSid: 1,
	roomName: 1,
	type: 1,
	sourceType: 1,
	status: 1,
	closedBy: 1,
	startedAt: 1,
	endedAt: 1,
	durationMs: 1,
	error: 1,
	errorCode: 1,
	'outputs.kind': 1,
	'outputs.error': 1
} as const;

type ListFields = Pick<
	EgressDocument,
	| '_id'
	| 'roomSid'
	| 'roomName'
	| 'type'
	| 'sourceType'
	| 'status'
	| 'closedBy'
	| 'startedAt'
	| 'endedAt'
	| 'durationMs'
	| 'error'
	| 'errorCode'
> & { outputs: Pick<EgressDocument['outputs'][number], 'kind' | 'error'>[] };

/** Distinct output kinds in order of first appearance and the number of outputs. */
export function outputsSummary(outputs: readonly { kind: EgressOutputKind }[]): EgressOutputsSummary {
	return { kinds: [...new Set(outputs.map((output) => output.kind))], count: outputs.length };
}

export function toEgressListItem(doc: ListFields): EgressListItem {
	return compact<EgressListItem>({
		egressId: doc._id,
		roomSid: doc.roomSid,
		roomName: doc.roomName,
		type: doc.type,
		sourceType: doc.sourceType,
		status: doc.status,
		closedBy: doc.closedBy,
		startedAt: iso(doc.startedAt),
		endedAt: iso(doc.endedAt),
		durationMs: doc.durationMs,
		outputs: outputsSummary(doc.outputs),
		hasError: doc.error !== undefined || doc.outputs.some((output) => output.error !== undefined),
		errorCode: doc.errorCode
	});
}
