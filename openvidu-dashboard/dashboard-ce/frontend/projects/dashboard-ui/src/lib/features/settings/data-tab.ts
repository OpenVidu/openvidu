import { Component, computed, effect, inject, signal } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import type { InfoMigration } from '@openvidu-dashboard/typings';

import { ExternalLink } from '../../components/external-link/external-link.js';
import { Notice } from '../../components/feedback/notice.js';
import { Skeleton } from '../../components/feedback/skeleton.js';
import { InfoTip } from '../../components/info-tip/info-tip.js';
import { InfoService } from '../../core/info.js';
import { EXTERNAL_LINKS } from '../../core/links.js';
import { ServerStatusService } from '../../core/refresh/server-status.js';
import { QueryStateService } from '../../core/state/query-state.js';
import { formatBytes, formatNumber, formatTimestamp } from '../../format/formatters.js';
import { CollectionBreakdown } from './collection-breakdown.js';
import { storageClasses } from './storage-classes.js';

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
 * The legacy migration while it runs (and its outcome when it ends while the tab is open), the storage and retention
 * per data class with the collections behind each class, and where the retention is configured.
 */
@Component({
	selector: 'ovd-data-tab',
	imports: [CollectionBreakdown, ExternalLink, InfoTip, MatIcon, MatProgressBar, Notice, Skeleton],
	templateUrl: './data-tab.html',
	styleUrl: './data-tab.scss'
})
export class DataTab {
	private readonly service = inject(InfoService);
	private readonly server = inject(ServerStatusService);
	private readonly tz = inject(QueryStateService).tz;
	/** A migration seen running in this tab; its outcome stays visible until the tab is left. */
	private readonly seenRunning = signal(false);
	/** Labels of the classes whose collections show; kept out of the URL. */
	protected readonly expanded = signal<ReadonlySet<string>>(new Set());

	protected readonly configurationReference = EXTERNAL_LINKS.analyticsSettings;
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
	protected readonly classes = computed(() => {
		const read = this.service.read();

		if (read === null) {
			return null;
		}

		const { info, readAt } = read;
		const { rows, total } = storageClasses(info.storage, info.retention, readAt, {
			migration: this.migrationState(),
			tz: this.tz()
		});

		return {
			rows: rows.map((row) => ({
				...row,
				documentsText: formatNumber(row.documents),
				size: formatBytes(row.bytes)
			})),
			total: { documents: formatNumber(total.documents), size: formatBytes(total.bytes) },
			retentionReported: info.retention !== undefined
		};
	});

	constructor() {
		effect(() => {
			if (this.running()) {
				this.seenRunning.set(true);
			}
		});
	}

	protected toggle(label: string): void {
		this.expanded.update((expanded) => {
			const next = new Set(expanded);

			if (!next.delete(label)) {
				next.add(label);
			}

			return next;
		});
	}

	protected retry(): void {
		void this.service.load();
	}
}
