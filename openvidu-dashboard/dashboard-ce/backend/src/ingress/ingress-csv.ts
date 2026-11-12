import type { IngressListItem } from '@openvidu-dashboard/typings';

import type { CsvColumn } from '../api/csv.js';

/** Columns of the ingresses export: the list item's fields, which carry no URL, stream key or participant name. */
export const INGRESS_CSV_COLUMNS: readonly CsvColumn<IngressListItem>[] = [
	{ header: 'ingressId', value: (ingress) => ingress.ingressId },
	{ header: 'name', value: (ingress) => ingress.name },
	{ header: 'inputType', value: (ingress) => ingress.inputType },
	{ header: 'roomName', value: (ingress) => ingress.roomName },
	{ header: 'participantIdentity', value: (ingress) => ingress.participantIdentity },
	{ header: 'status', value: (ingress) => ingress.status },
	{ header: 'enabled', value: (ingress) => ingress.enabled },
	{ header: 'reusable', value: (ingress) => ingress.reusable },
	{ header: 'createdAt', value: (ingress) => ingress.createdAt },
	{ header: 'deletedAt', value: (ingress) => ingress.deletedAt },
	{ header: 'sessions', value: (ingress) => ingress.sessions },
	{ header: 'totalDurationMs', value: (ingress) => ingress.totalDurationMs },
	{ header: 'lastSessionAt', value: (ingress) => ingress.lastSessionAt },
	{ header: 'hasError', value: (ingress) => ingress.hasError }
];
