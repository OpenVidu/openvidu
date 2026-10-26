import { type EgressListItem, type EgressOutputKind, type EgressStatus, isEntityId } from '@openvidu-dashboard/typings';

import type { EntityPreview } from '../../core/state/entity-preview.js';

/** Icon of each output kind. */
export const EGRESS_OUTPUT_ICONS: Readonly<Record<EgressOutputKind, string>> = {
	file: 'video_file',
	stream: 'cast',
	segments: 'segment',
	images: 'image'
};

const OUTPUT_LABELS: Readonly<Record<EgressOutputKind, string>> = {
	file: 'File',
	stream: 'Stream',
	segments: 'Segments',
	images: 'Images'
};

export function isEgressId(value: string): boolean {
	return isEntityId('egress', value);
}

export function outputLabel(kind: EgressOutputKind): string {
	return OUTPUT_LABELS[kind];
}

const ERROR_STATUSES: readonly EgressStatus[] = ['failed', 'aborted', 'limit_reached'];

/** Whether a row shows the error marker: an error its status badge does not already tell. */
export function egressErrorMarker(item: Pick<EgressListItem, 'hasError' | 'status'>): boolean {
	return item.hasError && !ERROR_STATUSES.includes(item.status);
}

/** Tooltip of the error marker of a row. */
export function egressErrorHint(item: Pick<EgressListItem, 'errorCode'>): string {
	return item.errorCode === undefined
		? 'Egress failed — open the detail for the error'
		: `Egress failed (code ${String(item.errorCode)}) — open the detail for the error`;
}

/** What detail headers and breadcrumbs show of an egress before (or instead of) its detail. */
export function egressPreview(
	item: Pick<EgressListItem, 'egressId' | 'type' | 'status' | 'closedBy' | 'startedAt' | 'roomSid' | 'roomName'>
): EntityPreview {
	return {
		name: item.egressId,
		status: item.status,
		startedAt: item.startedAt,
		estimated: item.closedBy === 'reconciler',
		kind: item.type,
		...(item.roomSid === undefined ? {} : { room: { sid: item.roomSid, name: item.roomName ?? item.roomSid } })
	};
}
