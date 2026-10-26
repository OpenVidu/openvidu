import {
	type CountByParticipantKind,
	type CountByTrackSource,
	isEntityId,
	ParticipantKind,
	type ParticipantListItem,
	type TrackSource,
	VISIBLE_PARTICIPANT_KINDS
} from '@openvidu-dashboard/typings';

import { SOURCE_LABELS } from '../../components/source-icon.js';
import type { EntityPreview } from '../../core/entity-preview.js';
import { PARTICIPANT_KIND_LABELS } from '../../format/labels.js';

export function isParticipantSid(value: string): boolean {
	return isEntityId('participant', value);
}

/** `kind` URL value that lists every kind; an absent `kind` lists STANDARD participants. */
export const EVERY_KIND = 'all';

/** Kinds of a `kind` URL value: STANDARD when absent or invalid, none (every kind) for `all`. */
export function kindFilter(value: string | null): ParticipantKind[] {
	if (value === EVERY_KIND) {
		return [];
	}

	const kinds = [...new Set((value ?? '').split(','))].filter((kind): kind is ParticipantKind =>
		VISIBLE_PARTICIPANT_KINDS.includes(kind as ParticipantKind)
	);

	return kinds.length === 0 ? [ParticipantKind.STANDARD] : kinds;
}

/** `kind` URL value of a selection: absent for STANDARD alone, `all` for an empty selection. */
export function kindParam(kinds: readonly ParticipantKind[]): string | null {
	if (kinds.length === 0) {
		return EVERY_KIND;
	}

	return kinds.length === 1 && kinds[0] === ParticipantKind.STANDARD ? null : kinds.join(',');
}

/** "Egress 3 · Agent 2": the visible service kinds with a non-zero count. */
export function servicesHint(byKind: CountByParticipantKind): string | null {
	const parts = VISIBLE_PARTICIPANT_KINDS.filter(
		(kind) => kind !== ParticipantKind.STANDARD && (byKind[kind] ?? 0) > 0
	).map((kind) => `${PARTICIPANT_KIND_LABELS[kind]} ${String(byKind[kind] ?? 0)}`);

	return parts.length === 0 ? null : parts.join(' · ');
}

/** What detail headers and breadcrumbs show of a participant session before (or instead of) its detail. */
export function participantPreview(
	item: Pick<ParticipantListItem, 'identity' | 'status' | 'joinedAt' | 'roomSid' | 'roomName'>
): EntityPreview {
	return {
		name: item.identity,
		status: item.status,
		startedAt: item.joinedAt,
		room: { sid: item.roomSid, name: item.roomName }
	};
}

/** Sources with at least one publication, camera first. */
export function publishedSources(bySource: CountByTrackSource): TrackSource[] {
	return (Object.keys(SOURCE_LABELS) as TrackSource[]).filter((source) => (bySource[source] ?? 0) > 0);
}
