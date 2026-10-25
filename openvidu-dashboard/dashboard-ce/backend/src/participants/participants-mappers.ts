import {
	type ParticipantClientSummary,
	type ParticipantDocument,
	type ParticipantListItem,
	TrackSource
} from '@openvidu-dashboard/typings';

import { iso } from '../api/mapping.js';
import { compact } from '../util/compact.js';

function clientSummary(doc: Pick<ParticipantDocument, 'client'>): ParticipantClientSummary | undefined {
	const client = doc.client;

	if (client === undefined) {
		return undefined;
	}

	const summary = compact<ParticipantClientSummary>({
		sdk: client.sdk,
		version: client.version,
		os: client.os,
		osVersion: client.osVersion,
		browser: client.browser,
		browserVersion: client.browserVersion
	});

	return Object.keys(summary).length === 0 ? undefined : summary;
}

export function toParticipantListItem(doc: ParticipantDocument): ParticipantListItem {
	return compact<ParticipantListItem>({
		sid: doc._id,
		identity: doc.identity,
		name: doc.name,
		kind: doc.kind,
		status: doc.status,
		roomSid: doc.roomSid,
		roomName: doc.roomName,
		joinedAt: iso(doc.joinedAt),
		leftAt: iso(doc.leftAt),
		durationMs: doc.durationMs,
		connectionType: doc.connectionType,
		nodeId: doc.nodeId,
		isPublisher: doc.isPublisher,
		publishedSources: publishedSources(doc),
		client: clientSummary(doc)
	});
}

/** Sources with at least one publication, in `TrackSource` order. */
function publishedSources(doc: Pick<ParticipantDocument, 'tracks'>): TrackSource[] {
	const { bySource } = doc.tracks;

	return Object.values(TrackSource).filter((source) => (bySource[source] ?? 0) > 0);
}
