import { NgComponentOutlet } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import type { OverviewRecentRoom, StatusWriter } from '@openvidu-dashboard/typings';

import { LiveChip } from '../../components/badges/live-chip.js';
import { StatusBadge } from '../../components/badges/status-badge.js';
import { CopyButton } from '../../components/copy-button/copy-button.js';
import { DataTable, TableCell, type TableColumn } from '../../components/data-table/data-table.js';
import { Duration } from '../../components/duration/duration.js';
import { EmptyState } from '../../components/feedback/empty-state.js';
import { ErrorBanner } from '../../components/feedback/error-banner.js';
import { Notice } from '../../components/feedback/notice.js';
import { Skeleton } from '../../components/feedback/skeleton.js';
import { FeatureContent, FeatureGate } from '../../components/lock/feature-gate.js';
import { KpiTile } from '../../components/tiles/kpi-tile.js';
import { SectionCard } from '../../components/tiles/section-card.js';
import { TileRow } from '../../components/tiles/tile-row.js';
import { FeatureService } from '../../core/info.js';
import { injectRefreshScheduler } from '../../core/refresh/refresh.js';
import { ServerStatusService } from '../../core/refresh/server-status.js';
import { injectTicker } from '../../core/refresh/ticker.js';
import { QueryStateService } from '../../core/state/query-state.js';
import { formatNumber, formatTimestamp } from '../../format/formatters.js';
import { INFO_TEXTS } from '../../format/info-texts.js';
import { RECONCILER_ESTIMATE } from '../../format/labels.js';
import { OVERVIEW_NODES_CARD, OverviewDataService } from './overview-data.js';

const DAY_MS = 86_400_000;
const APPROXIMATE_HINT =
	'The zone starts its day off the hour, so the first hourly rollup also holds the end of the previous day';
/** Consecutive overview responses with stale entities before their notice shows. */
const STALE_RESPONSES = 2;

/**
 * The landing page: live tiles, the stale entities hint, today's rollups, the server status, the recent rooms and the
 * per-node card (PRO, locked in CE), polled with `If-None-Match` at the live interval.
 */
@Component({
	selector: 'ovd-overview-page',
	imports: [
		CopyButton,
		DataTable,
		Duration,
		EmptyState,
		ErrorBanner,
		FeatureContent,
		FeatureGate,
		KpiTile,
		LiveChip,
		MatIcon,
		MatProgressBar,
		NgComponentOutlet,
		Notice,
		RouterLink,
		SectionCard,
		Skeleton,
		StatusBadge,
		TableCell,
		TileRow
	],
	templateUrl: './overview-page.html',
	styleUrl: './overview-page.scss'
})
export class OverviewPage {
	private readonly data = inject(OverviewDataService);
	private readonly server = inject(ServerStatusService);

	protected readonly tz = inject(QueryStateService).tz;
	protected readonly now = injectTicker();
	protected readonly nodesCard = inject(OVERVIEW_NODES_CARD);
	protected readonly estimate = RECONCILER_ESTIMATE;
	protected readonly info = INFO_TEXTS;
	/** The By node heading explains node liveness only where the card shows nodes. */
	protected readonly perNode = inject(FeatureService).enabledSignal('per-node-breakdown');
	protected readonly approximateText = APPROXIMATE_HINT;
	/** The column order of the Rooms list. */
	protected readonly recentColumns = computed<TableColumn[]>(() => [
		{ key: 'sid', header: 'SID', hideable: false, card: 'title' },
		{ key: 'name', header: 'Name' },
		{ key: 'status', header: 'Status', hideable: false, card: 'status' },
		{ key: 'createdAt', header: 'Started', hideable: false, card: 'timestamp', headerHint: this.tz() },
		{ key: 'duration', header: 'Duration', align: 'end', card: 'metric' },
		{
			key: 'uniqueIdentities',
			header: 'Unique identities',
			align: 'end',
			card: 'metric',
			info: INFO_TEXTS.uniqueIdentities
		}
	]);
	protected readonly trackRoom = (room: OverviewRecentRoom): string => room.sid;

	private readonly scheduler = injectRefreshScheduler({ load: () => this.data.load(this.tz()) });

	protected readonly snapshot = this.data.snapshot;
	protected readonly overview = computed(() => this.snapshot()?.body ?? null);
	protected readonly live = computed(() => this.overview()?.live ?? null);
	protected readonly today = computed(() => this.overview()?.today ?? null);
	/** The server status poll, not the page refresh: the card follows the server even with the auto-refresh off. */
	protected readonly status = this.server.status;
	protected readonly writerFresh = this.server.writerFresh;
	protected readonly error = this.scheduler.error;
	protected readonly loading = computed(() => this.overview() === null);

	protected readonly emptyDeployment = computed(() => {
		const overview = this.overview();

		if (overview === null) {
			return false;
		}

		const { live, today } = overview;
		const counters = [
			live.rooms,
			live.participants,
			live.egresses,
			live.ingressSessions,
			today.rooms,
			today.participantSessions,
			today.egresses,
			today.ingressSessions
		];

		return (
			this.status()?.schema.status === 'uninitialized' ||
			(overview.recentRooms.length === 0 && counters.every((value) => value === 0))
		);
	});
	/** Consecutive responses, `304` included, whose live counters report stale entities. */
	private readonly staleStreak = signal(0);
	protected readonly staleHint = computed(() => {
		const stale = this.live()?.stale;

		if (stale === undefined || stale.rooms + stale.participants === 0 || this.staleStreak() < STALE_RESPONSES) {
			return null;
		}

		const rooms = `${formatNumber(stale.rooms)} active room${stale.rooms === 1 ? '' : 's'}`;
		const participants = `${formatNumber(stale.participants)} participant${stale.participants === 1 ? '' : 's'}`;

		return `${rooms} and ${participants} have had no stats for over ${String(Math.round(stale.olderThanMs / 1000))} s and may be stale`;
	});
	protected readonly todayTitle = computed(() => `Today (${this.today()?.tz ?? this.tz()}, since 00:00)`);
	protected readonly todayEmpty = computed(() => {
		const today = this.today();

		return (
			today !== null &&
			[
				today.rooms,
				today.participantSessions,
				today.participantMinutes,
				today.egresses,
				today.ingressSessions
			].every((value) => value === 0)
		);
	});
	protected readonly migrationProgress = computed(() => {
		const migration = this.status()?.migration;

		if (migration?.state !== 'running') {
			return null;
		}

		const processed = migration.progress?.processed ?? 0;
		const total = migration.progress?.total ?? 0;

		return {
			percent: total > 0 ? Math.floor((processed / total) * 100) : 0,
			label: `${formatNumber(processed)} / ${formatNumber(total)}`
		};
	});
	constructor() {
		let first = true;

		effect(() => {
			const stale = this.snapshot()?.body.live.stale;

			untracked(() => {
				this.staleStreak.update((streak) =>
					stale !== undefined && stale.rooms + stale.participants > 0 ? streak + 1 : 0
				);
			});
		});

		effect(() => {
			this.tz();

			if (first) {
				first = false;

				return;
			}

			untracked(() => void this.scheduler.refresh());
		});
	}

	protected tile(value: number | undefined): string | null {
		return value === undefined ? null : formatNumber(value);
	}

	protected todayTile(value: number | undefined): string | null {
		return value === undefined ? null : formatNumber(value);
	}

	protected writerLine(writer: StatusWriter): string {
		return writer.lastSeenAt === undefined
			? 'Last batch: never'
			: `Last batch at ${formatTimestamp(writer.lastSeenAt, { tz: this.tz(), now: this.now(), rangeMs: DAY_MS })}`;
	}

	protected nodesLine(writer: StatusWriter): string {
		return writer.nodes === 0
			? 'no node has reported yet'
			: `${formatNumber(writer.aliveNodes)} of ${formatNumber(writer.nodes)} node${writer.nodes === 1 ? '' : 's'} reporting`;
	}

	/** Time only for today's rooms, the date as well for older ones. */
	protected time(value: string): string {
		return formatTimestamp(value, { tz: this.tz(), now: this.now(), rangeMs: DAY_MS });
	}

	protected number(value: number): string {
		return formatNumber(value);
	}

	/** "No stats since 12:31:05" for an active room the overview response marks stale. */
	protected roomStaleHint(room: OverviewRecentRoom): string | undefined {
		return room.stale === true && room.lastStatsAt !== undefined
			? `No stats since ${this.time(room.lastStatsAt)}`
			: undefined;
	}

	protected retry(): void {
		void this.scheduler.refresh();
	}
}
