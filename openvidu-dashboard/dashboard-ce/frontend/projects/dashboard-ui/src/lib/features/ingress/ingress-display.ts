import { type IngressListItem, isEntityId } from '@openvidu-dashboard/typings';

import type { EntityPreview } from '../../core/entity-preview.js';

export function isIngressId(value: string): boolean {
	return isEntityId('ingress', value);
}

/** What detail headers and breadcrumbs show of an ingress before (or instead of) its detail. */
export function ingressPreview(
	item: Pick<IngressListItem, 'ingressId' | 'name' | 'status' | 'createdAt' | 'inputType'>
): EntityPreview {
	return { name: item.name ?? item.ingressId, status: item.status, startedAt: item.createdAt, kind: item.inputType };
}
