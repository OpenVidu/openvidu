import { Component, computed, effect, inject, signal } from '@angular/core';
import { MatProgressBar } from '@angular/material/progress-bar';
import { formatRetentionLength, type InfoMigration, type InfoRetention } from '@openvidu-dashboard/typings';

import { Notice } from '../../components/feedback/notice.js';
import { Skeleton } from '../../components/feedback/skeleton.js';
import { InfoService } from '../../core/info.js';
import { ServerStatusService } from '../../core/refresh/server-status.js';
import { QueryStateService } from '../../core/state/query-state.js';
import { formatBytes, formatNumber, formatTimestamp } from '../../format/formatters.js';
import { EditionBadge } from '../../shell/edition-badge.js';

/** `7 days`, `36 hours`, `Kept forever` for a retention without limit. */
export function formatRetention(ms: number | null): string {
	return ms === null ? 'Kept forever' : formatRetentionLength(ms, { formatCount: formatNumber });
}

/** One row per data class, in the order the writer expires them. */
export function retentionRows(retention: InfoRetention): { label: string; value: string }[] {
	return [
		{ label: 'Events', value: formatRetention(retention.eventsMs) },
		{ label: 'Stats', value: formatRetention(retention.statsMs) },
		{ label: 'Tracks and subscriptions', value: formatRetention(retention.tracksMs) },
		{ label: 'Entities', value: formatRetention(retention.entitiesMs) },
		{ label: '5-minute rollups', value: formatRetention(retention.rollups5MinMs) },
		{ label: 'Hourly rollups', value: formatRetention(retention.rollupsHourlyMs) },
		{ label: 'Daily rollups', value: formatRetention(retention.rollupsDailyMs) }
	];
}

/** The progress of a running migration, or the outcome of one that ended; `null` for none or pending. */
export function migrationLine(migration: InfoMigration, tz: string): string | null {
	const progress = migration.progress;

	switch (migration.state) {
		case 'running':
			return `${formatNumber(progress?.processed ?? 0)} / ${formatNumber(progress?.total ?? 0)} records`;
		case 'completed':
			return progress?.finishedAt === undefined
				? 'Migration completed'
				: `Migration completed at ${formatTimestamp(progress.finishedAt, { tz }).slice(11, 19)}`;
		case 'failed':
			return `Migration failed${migration.error === undefined ? '' : `: ${migration.error}`}`;
		default:
			return null;
	}
}

/**
 * The OpenVidu version with the edition, the legacy migration while it runs (and its outcome when it ends while the
 * tab is open), the retention per data class and the storage per collection.
 */
@Component({
	selector: 'ovd-about-tab',
	imports: [EditionBadge, MatProgressBar, Notice, Skeleton],
	templateUrl: './about-tab.html',
	styleUrl: './about-tab.scss'
})
export class AboutTab {
	private readonly service = inject(InfoService);
	private readonly server = inject(ServerStatusService);
	private readonly tz = inject(QueryStateService).tz;
	/** A migration seen running in this tab; its outcome stays visible until the tab is left. */
	private readonly seenRunning = signal(false);

	protected readonly info = this.service.info;
	protected readonly unavailable = computed(() => this.info() === null && this.service.error() !== null);
	/** From the server status poll (every 10 s while it runs), or the info document until the first status. */
	private readonly migrationState = computed(() => this.server.status()?.migration ?? this.info()?.migration ?? null);

	protected readonly running = computed(() => this.migrationState()?.state === 'running');
	protected readonly failed = computed(() => this.migrationState()?.state === 'failed');
	protected readonly migration = computed(() => {
		const migration = this.migrationState();

		if (migration === null || !(this.running() || (this.seenRunning() && migration.state !== 'none'))) {
			return null;
		}

		return migrationLine(migration, this.tz());
	});
	protected readonly migrationPercent = computed(() => {
		const progress = this.migrationState()?.progress;

		return progress !== undefined && progress.total > 0
			? Math.floor((progress.processed / progress.total) * 100)
			: 0;
	});
	protected readonly retention = computed(() => {
		const retention = this.info()?.retention;

		return retention === undefined ? null : retentionRows(retention);
	});
	protected readonly storage = computed(() =>
		Object.entries(this.info()?.storage ?? {}).map(([collection, entry]) => ({
			collection,
			documents: formatNumber(entry.documents),
			size: formatBytes(entry.storageBytes + entry.indexBytes),
			oldest: entry.oldest === undefined ? '—' : formatTimestamp(entry.oldest, { tz: this.tz() })
		}))
	);

	constructor() {
		effect(() => {
			if (this.running()) {
				this.seenRunning.set(true);
			}
		});
	}

	protected retry(): void {
		void this.service.load();
	}
}
