import {
	AGENT_NAME_ATTRIBUTE,
	OPENVIDU_AGENT_ATTRIBUTE,
	type ParticipantAgent,
	type ParticipantClientSummary,
	type ParticipantDocument,
	ParticipantKind,
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

/** Agent name and OpenVidu agent type of an `AGENT` session; no other attribute leaves the backend. */
function agentFacts(doc: Pick<ParticipantDocument, 'kind' | 'attributes'>): ParticipantAgent | undefined {
	if (doc.kind !== ParticipantKind.AGENT || doc.attributes === undefined) {
		return undefined;
	}

	const attributes = doc.attributes;
	const value = (key: string) => (attributes[key] === '' ? undefined : attributes[key]);
	const agent = compact<ParticipantAgent>({
		name: value(AGENT_NAME_ATTRIBUTE),
		openvidu: value(OPENVIDU_AGENT_ATTRIBUTE)
	});

	return Object.keys(agent).length === 0 ? undefined : agent;
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
		mediaNode: doc.mediaNode,
		isPublisher: doc.isPublisher,
		publishedSources: publishedSources(doc),
		client: clientSummary(doc),
		agent: agentFacts(doc)
	});
}

/** Sources with at least one publication, in `TrackSource` order. */
function publishedSources(doc: Pick<ParticipantDocument, 'tracks'>): TrackSource[] {
	const { bySource } = doc.tracks;

	return Object.values(TrackSource).filter((source) => (bySource[source] ?? 0) > 0);
}
