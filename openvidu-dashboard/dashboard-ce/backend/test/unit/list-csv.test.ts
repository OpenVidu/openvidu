import { describe, expect, it } from 'vitest';

import type { EgressListItem, IngressListItem, ParticipantListItem, RoomListItem } from '@openvidu-dashboard/typings';

import { columnsCsv } from '../../src/api/csv.js';
import { EGRESS_CSV_COLUMNS } from '../../src/egress/egress-csv.js';
import { INGRESS_CSV_COLUMNS } from '../../src/ingress/ingress-csv.js';
import { participantCsvColumns } from '../../src/participants/participants-csv.js';
import { roomCsvColumns } from '../../src/rooms/rooms-csv.js';

const room: RoomListItem = {
	sid: 'RM_a',
	name: 'Sales, Q4 "review"',
	status: 'active',
	createdAt: '2026-11-12T10:00:00.000Z',
	participants: { sessions: 4, unique: 3, active: 3, peakActive: 3 },
	egress: { total: 1, active: 1 },
	ingress: { sessions: 0, active: 0 },
	bytes: { up: 1200, down: 3400 },
	features: { egress: true, ingress: false, agent: true, sip: false }
};

const session: ParticipantListItem = {
	sid: 'PA_a',
	identity: 'alice',
	kind: 'STANDARD',
	status: 'active',
	roomSid: 'RM_a',
	roomName: 'demo',
	joinedAt: '2026-11-12T10:01:00.000Z',
	isPublisher: true,
	publishedSources: ['CAMERA', 'MICROPHONE']
};

/** Header and data rows of a CSV body, split at CRLF. */
function lines(body: string): string[] {
	return body.split('\r\n').slice(0, -1);
}

describe('list CSV columns', () => {
	it('writes the 21 room columns, and the media node last with per-node-breakdown', () => {
		expect(lines(columnsCsv(roomCsvColumns(false), []))).toEqual([
			'sid,name,status,createdAt,endedAt,durationMs,closedBy,participants.sessions,participants.unique,' +
				'participants.active,participants.peakActive,egress.total,egress.active,ingress.sessions,ingress.active,' +
				'bytes.up,bytes.down,features.egress,features.ingress,features.agent,features.sip'
		]);

		const [header, first, second] = lines(
			columnsCsv(roomCsvColumns(true), [
				{ ...room, mediaNode: 'mn-a' },
				{ ...room, sid: 'RM_b' }
			])
		);

		expect(header?.endsWith(',features.sip,mediaNode')).toBe(true);
		expect(first?.endsWith(',mn-a')).toBe(true);
		expect(second?.endsWith(',false,')).toBe(true);
	});

	it('leaves the end of an active room empty and quotes its name', () => {
		expect(lines(columnsCsv(roomCsvColumns(false), [room]))[1]).toBe(
			'RM_a,"Sales, Q4 ""review""",active,2026-11-12T10:00:00.000Z,,,,4,3,3,3,1,1,0,0,1200,3400,true,false,true,false'
		);
	});

	it('leaves the bytes of a room without media statistics empty, not 0', () => {
		const row = lines(
			columnsCsv(roomCsvColumns(false), [{ ...room, mediaStats: false, bytes: { up: 0, down: 0 } }])
		)[1];

		expect(row).toContain(',0,0,,,true,false,true,false');
	});

	it('writes the 19 participant columns, the published sources in one cell and an absent client empty', () => {
		const [header, row] = lines(columnsCsv(participantCsvColumns(false), [session]));

		expect(header).toBe(
			'sid,identity,name,kind,status,roomSid,roomName,joinedAt,leftAt,durationMs,connectionType,isPublisher,' +
				'publishedSources,client.sdk,client.version,client.os,client.osVersion,client.browser,client.browserVersion'
		);
		expect(row).toBe(
			'PA_a,alice,,STANDARD,active,RM_a,demo,2026-11-12T10:01:00.000Z,,,,true,CAMERA;MICROPHONE,,,,,,'
		);
		expect(lines(columnsCsv(participantCsvColumns(true), []))[0]?.endsWith(',mediaNode')).toBe(true);
	});

	it('writes the egress columns, an egress without room with empty room cells', () => {
		const egress: EgressListItem = {
			egressId: 'EG_a',
			type: 'web',
			sourceType: 'web',
			status: 'failed',
			startedAt: '2026-11-12T10:00:00.000Z',
			outputs: { kinds: ['file', 'stream'], count: 2 },
			hasError: true,
			errorCode: 503
		};
		const [header, row] = lines(columnsCsv(EGRESS_CSV_COLUMNS, [egress]));

		expect(header).toBe(
			'egressId,roomSid,roomName,type,sourceType,status,closedBy,startedAt,endedAt,durationMs,outputs.kinds,' +
				'outputs.count,hasError,errorCode'
		);
		expect(row).toBe('EG_a,,,web,web,failed,,2026-11-12T10:00:00.000Z,,,file;stream,2,true,503');
	});

	it('writes the ingress columns', () => {
		const ingress: IngressListItem = {
			ingressId: 'IN_a',
			inputType: 'rtmp',
			roomName: 'demo',
			participantIdentity: 'cam',
			status: 'deleted',
			enabled: false,
			reusable: true,
			createdAt: '2026-11-10T10:00:00.000Z',
			deletedAt: '2026-11-11T10:00:00.000Z',
			sessions: 2,
			totalDurationMs: 60000,
			hasError: false
		};

		expect(lines(columnsCsv(INGRESS_CSV_COLUMNS, [ingress]))).toEqual([
			'ingressId,name,inputType,roomName,participantIdentity,status,enabled,reusable,createdAt,deletedAt,sessions,' +
				'totalDurationMs,lastSessionAt,hasError',
			'IN_a,,rtmp,demo,cam,deleted,false,true,2026-11-10T10:00:00.000Z,2026-11-11T10:00:00.000Z,2,60000,,false'
		]);
	});
});
