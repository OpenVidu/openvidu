import type { IngressDocument, IngressListItem } from '@openvidu-dashboard/typings';

import { iso } from '../api/mapping.js';
import { compact } from '../util/compact.js';

/** Fields of an ingress document the list item needs; `lastError` is read only as a flag. */
export const INGRESS_LIST_PROJECTION = {
	name: 1,
	inputType: 1,
	roomName: 1,
	participantIdentity: 1,
	status: 1,
	enabled: 1,
	reusable: 1,
	createdAt: 1,
	deletedAt: 1,
	sessions: 1,
	totalDurationMs: 1,
	lastSessionAt: 1,
	lastError: 1
} as const;

type ListFields = Pick<
	IngressDocument,
	| '_id'
	| 'name'
	| 'inputType'
	| 'roomName'
	| 'participantIdentity'
	| 'status'
	| 'enabled'
	| 'reusable'
	| 'createdAt'
	| 'deletedAt'
	| 'sessions'
	| 'totalDurationMs'
	| 'lastSessionAt'
	| 'lastError'
>;

export function toIngressListItem(doc: ListFields): IngressListItem {
	return compact<IngressListItem>({
		ingressId: doc._id,
		name: doc.name,
		inputType: doc.inputType,
		roomName: doc.roomName,
		participantIdentity: doc.participantIdentity,
		status: doc.status,
		enabled: doc.enabled,
		reusable: doc.reusable,
		createdAt: iso(doc.createdAt),
		deletedAt: iso(doc.deletedAt),
		sessions: doc.sessions,
		totalDurationMs: doc.totalDurationMs,
		lastSessionAt: iso(doc.lastSessionAt),
		hasError: doc.lastError !== undefined
	});
}
