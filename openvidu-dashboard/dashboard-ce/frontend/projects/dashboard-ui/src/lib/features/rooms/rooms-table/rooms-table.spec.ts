import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { RoomListItem } from '@openvidu-dashboard/typings';
import { describe, expect, it } from 'vitest';

import { MEDIA_STATS_TEXTS } from '../../../format/labels.js';
import { roomColumns, RoomsTable } from './rooms-table.js';

function room(overrides: Partial<RoomListItem> = {}): RoomListItem {
	return {
		sid: 'RM_ab12cd',
		name: 'demo-room',
		status: 'closed',
		createdAt: '2026-10-13T10:00:00Z',
		endedAt: '2026-10-13T10:30:00Z',
		durationMs: 1_800_000,
		nodeId: 'ND_a',
		participants: { sessions: 7, unique: 6, active: 0, peakActive: 6 },
		egress: { total: 0, active: 0 },
		ingress: { sessions: 0, active: 0 },
		bytes: { up: 12_000_000, down: 48_000_000 },
		features: { egress: false, ingress: false, agent: false, sip: false },
		...overrides
	};
}

@Component({
	imports: [RoomsTable],
	template: `
		<ovd-rooms-table tableId="test-rooms" [columns]="columns" [rows]="rows()">
			<p ovdTableEmpty class="empty">Nothing here</p>
		</ovd-rooms-table>
	`
})
class Host {
	readonly rows = signal<RoomListItem[]>([]);
	readonly columns = roomColumns({ tz: 'UTC', rows: [] });
}

describe('roomColumns', () => {
	it('lists the Rooms columns with only Started sortable when no ranked sort is given', () => {
		const columns = roomColumns({ tz: 'UTC', rows: [room()] });

		expect(columns.map((column) => column.header)).toEqual([
			'SID',
			'Name',
			'Status',
			'Started',
			'Ended',
			'Duration',
			'Unique identities',
			'Active',
			'Data up / down',
			'Features'
		]);
		expect(columns.filter((column) => column.sortable === true).map((column) => column.key)).toEqual(['createdAt']);
	});

	it('adds the hidden Node column, the ranked sorts and the media statistics warning', () => {
		const columns = roomColumns({
			tz: 'UTC',
			rows: [room({ mediaStats: false })],
			ranked: () => ({ sortable: true }),
			node: true
		});

		expect(columns.at(-1)).toMatchObject({ key: 'node', header: 'Node', defaultHidden: true });
		expect(columns.find((column) => column.key === 'duration')?.sortable).toBe(true);
		expect(columns.find((column) => column.key === 'bytes')?.warning).toBe(MEDIA_STATS_TEXTS.column);
	});
});

describe('RoomsTable', () => {
	it('renders the projected empty state, then the rows', async () => {
		TestBed.configureTestingModule({ providers: [provideRouter([])] });

		const fixture = TestBed.createComponent(Host);

		await fixture.whenStable();
		expect((fixture.nativeElement as HTMLElement).querySelector('.empty')?.textContent).toBe('Nothing here');

		fixture.componentInstance.rows.set([room()]);
		await fixture.whenStable();

		const element = fixture.nativeElement as HTMLElement;

		expect(element.querySelector('.empty')).toBeNull();
		expect(element.querySelector('a[href="/rooms/RM_ab12cd"]')?.textContent).toBe('RM_ab12cd');
	});
});
