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

	const PARTICIPANT_HEADER =
		'sid,identity,name,kind,status,roomSid,roomName,joinedAt,leftAt,durationMs,connectionType,isPublisher,' +
		'publishedSources,client.sdk,client.version,client.os,client.osVersion,client.browser,client.browserVersion,' +
		'agent.name,agent.openvidu';

	it('Header row: the 21 participant columns, then mediaNode with per-node-breakdown', () => {
		expect(lines(columnsCsv(participantCsvColumns(false), []))[0]).toBe(PARTICIPANT_HEADER);
		expect(PARTICIPANT_HEADER.split(',')).toHaveLength(21);
		expect(lines(columnsCsv(participantCsvColumns(true), []))[0]).toBe(`${PARTICIPANT_HEADER},mediaNode`);
	});

	it('Session without client information: its six client cells are empty', () => {
		const [, row] = lines(columnsCsv(participantCsvColumns(false), [session]));

		expect(row).toBe(
			'PA_a,alice,,STANDARD,active,RM_a,demo,2026-11-12T10:01:00.000Z,,,,true,CAMERA;MICROPHONE,,,,,,,,'
		);
	});

	it('No client address', () => {
		// The item as a careless mapper could build it: what only the detail shows must still reach no cell.
		const leaky = {
			...session,
			kind: 'AGENT',
			agent: { name: 'support' },
			client: { sdk: 'JS', version: '2.15.7', address: '203.0.113.7', deviceModel: 'Pixel 9' },
			metadata: 'meta-secret',
			attributes: { customer: 'acme' }
		} as ParticipantListItem;
		const [header, row] = lines(columnsCsv(participantCsvColumns(true), [leaky]));
		const headers = header?.split(',') ?? [];

		expect(headers).toHaveLength(22);
		expect(headers.filter((name) => /address|device|metadata|attribute/i.test(name))).toEqual([]);
		expect(headers.filter((name) => name.startsWith('agent.'))).toEqual(['agent.name', 'agent.openvidu']);
		expect(headers.filter((name) => name.includes('.') && !/^(client|agent)\./.test(name))).toEqual([]);

		for (const value of ['203.0.113.7', 'Pixel 9', 'meta-secret', 'acme']) {
			expect(row, value).not.toContain(value);
		}
	});

	it('Agent columns', () => {
		const rows = lines(
			columnsCsv(participantCsvColumns(false), [
				{
					...session,
					sid: 'PA_ov',
					kind: 'AGENT',
					agent: { name: 'speech-processing-dev', openvidu: 'speech-processing' }
				},
				{ ...session, sid: 'PA_3p', kind: 'AGENT', agent: { name: 'dummy-agent' } },
				session
			])
		).slice(1);

		expect(rows.map((row) => row.split(',').slice(-2))).toEqual([
			['speech-processing-dev', 'speech-processing'],
			['dummy-agent', ''],
			['', '']
		]);
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
