import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ParticipantsDataService } from '../participants/participants-data.js';
import { apiRange, RoomsDataService, type RoomsListRequest } from './rooms-data.js';

const NOW = new Date('2026-10-13T12:00:00Z');

describe('RoomsDataService', () => {
	let rooms: RoomsDataService;
	let http: HttpTestingController;

	beforeEach(() => {
		vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
		TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
		rooms = TestBed.inject(RoomsDataService);
		http = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		http.verify();
		vi.useRealTimers();
	});

	const list: RoomsListRequest = {
		range: { from: 'now-24h', to: 'now', tz: 'Europe/Madrid' },
		status: 'closed',
		q: 'demo',
		features: ['egress', 'agent'],
		nodeId: 'node-a',
		sort: 'endedAt',
		order: 'asc',
		cursor: 'abc',
		limit: 50
	};

	it('resolves the range to instants and keeps an unresolvable one as typed', () => {
		expect(apiRange({ from: 'now-1h', to: 'now', tz: 'UTC' }, NOW)).toEqual({
			from: '2026-10-13T11:00:00.000Z',
			to: '2026-10-13T12:00:00.000Z',
			tz: 'UTC'
		});
		expect(apiRange({ from: 'later', to: 'now', tz: 'UTC' }, NOW)).toEqual({ from: 'later', to: 'now', tz: 'UTC' });
	});

	it('serialises every list parameter and leaves out the empty ones', async () => {
		const full = rooms.list(list);

		http.expectOne(
			(req) =>
				req.urlWithParams ===
				'api/v1/rooms?from=2026-10-12T12:00:00.000Z&to=2026-10-13T12:00:00.000Z&tz=Europe/Madrid&status=closed' +
					'&q=demo&features=egress,agent&nodeId=node-a&sort=endedAt&order=asc&cursor=abc&limit=50'
		).flush({ items: [], nextCursor: null, prevCursor: null });
		await full;

		const bare = rooms.list({ ...list, q: null, features: [], nodeId: null, cursor: null });

		http.expectOne(
			(req) =>
				req.urlWithParams ===
				'api/v1/rooms?from=2026-10-12T12:00:00.000Z&to=2026-10-13T12:00:00.000Z&tz=Europe/Madrid&status=closed' +
					'&sort=endedAt&order=asc&limit=50'
		).flush({ items: [], nextCursor: null, prevCursor: null });
		await bare;
	});

	it('requests the summary of the range', async () => {
		const summary = rooms.summary({ from: 'now-24h', to: 'now', tz: 'UTC' });

		http.expectOne('api/v1/rooms/summary?from=2026-10-12T12:00:00.000Z&to=2026-10-13T12:00:00.000Z&tz=UTC').flush({
			activeRooms: 1
		});
		expect(await summary).toEqual({ activeRooms: 1 });
	});
});

describe('ParticipantsDataService', () => {
	let participants: ParticipantsDataService;
	let http: HttpTestingController;

	beforeEach(() => {
		vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
		TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
		participants = TestBed.inject(ParticipantsDataService);
		http = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		http.verify();
		vi.useRealTimers();
	});

	it('serialises the list and the agents list', async () => {
		const range = { from: 'now-24h', to: 'now', tz: 'UTC' };
		const empty = { items: [], nextCursor: null, prevCursor: null };
		const window = 'from=2026-10-12T12:00:00.000Z&to=2026-10-13T12:00:00.000Z&tz=UTC';
		const calls: [Promise<unknown>, string][] = [
			[
				participants.list({
					range,
					q: 'ali',
					kind: ['STANDARD', 'SIP'],
					status: 'left',
					room: 'RM_a',
					publisher: true,
					sort: 'duration',
					order: 'desc',
					cursor: null,
					limit: 25
				}),
				`api/v1/participants?${window}&q=ali&status=left&room=RM_a&sort=duration&order=desc&limit=25&kind=STANDARD,SIP&publisher=true`
			],
			[
				participants.agents({
					range,
					q: 'agent-',
					status: 'active',
					room: null,
					sort: 'joinedAt',
					order: 'asc',
					cursor: 'c',
					limit: 10
				}),
				`api/v1/agents?${window}&q=agent-&status=active&sort=joinedAt&order=asc&cursor=c&limit=10`
			]
		];

		for (const [call, expected] of calls) {
			http.expectOne((req) => req.urlWithParams === expected).flush(empty);
			await call;
		}
	});
});
