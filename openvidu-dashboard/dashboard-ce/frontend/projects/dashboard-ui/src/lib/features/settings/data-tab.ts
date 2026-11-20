import {
	Component,
	computed,
	DestroyRef,
	effect,
	inject,
	input,
	signal,
	type TemplateRef,
	untracked,
	viewChild
} from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatTooltip } from '@angular/material/tooltip';
import type {
	DeletionClass,
	DeletionClassKey,
	DeletionJob,
	InfoMigration,
	StartDeletionRequest
} from '@openvidu-dashboard/typings';

import { ConfirmDialogService } from '../../components/confirm-dialog/confirm-dialog.js';
import { ExternalLink } from '../../components/external-link/external-link.js';
import { Notice } from '../../components/feedback/notice.js';
import { Skeleton } from '../../components/feedback/skeleton.js';
import { InfoTip } from '../../components/info-tip/info-tip.js';
import { HttpService } from '../../core/http/http.js';
import { InfoService } from '../../core/info.js';
import { EXTERNAL_LINKS } from '../../core/links.js';
import { deletionKey, ServerStatusService } from '../../core/refresh/server-status.js';
import { QueryStateService } from '../../core/state/query-state.js';
import { ToastService } from '../../core/ui/toast.js';
import { completedClasses } from '../../format/deletions.js';
import { formatBytes, formatNumber, formatTimestamp } from '../../format/formatters.js';
import { CollectionBreakdown } from './collection-breakdown.js';
import {
	DELETION_DIALOGS,
	deletionCompleted,
	deletionOutcome,
	deletionProgress,
	deletionRecordLine,
	deletionRefusal,
	FREE_SPACE_PENDING,
	FREE_SPACE_TIP,
	LEGACY_CHECKBOX
} from './deletion-texts.js';
import { LEGACY_LABEL, storageClasses } from './storage-classes.js';

/** The free space line shows from 1 MB. */
const FREE_LINE_MIN_BYTES = 1_000_000;
/**
 * The second read of the info document after a deletion ends: after the MongoDB checkpoint (60 s) that releases the
 * space it freed, plus the delay of the status poll and small clock differences.
 */
export const SECOND_READ_MS = 65_000;

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
	imports: [
		CollectionBreakdown,
		ExternalLink,
		InfoTip,
		MatIcon,
		MatIconButton,
		MatProgressBar,
		MatTooltip,
		Notice,
		Skeleton
	],
	templateUrl: './data-tab.html',
	styleUrl: './data-tab.scss'
})
export class DataTab {
	private readonly service = inject(InfoService);
	private readonly server = inject(ServerStatusService);
	private readonly http = inject(HttpService);
	private readonly dialogs = inject(ConfirmDialogService);
	private readonly toast = inject(ToastService);
	private readonly tz = inject(QueryStateService).tz;
	private readonly dialogBody = viewChild.required<TemplateRef<unknown>>('deletionBody');
	/** The running job this tab showed, whose completion it announces. */
	private readonly watching = signal<string | null>(null);
	/** A migration seen running in this tab; its outcome stays visible until the tab is left. */
	private readonly seenRunning = signal(false);
	/** Labels of the classes whose collections show; kept out of the URL. */
	protected readonly expanded = signal<ReadonlySet<string>>(new Set());

	/**
	 * Whether the Data tab is the selected one: the tab group keeps the content of a tab it leaves, so opening the tab
	 * and closing it are changes of this input rather than of the component's life.
	 */
	readonly active = input(true);

	protected readonly configurationReference = EXTERNAL_LINKS.analyticsSettings;
	protected readonly freeingDiskSpace = EXTERNAL_LINKS.freeingDiskSpace;
	protected readonly freeSpaceTip = FREE_SPACE_TIP.text;
	protected readonly freeSpaceLink = FREE_SPACE_TIP.link;
	protected readonly freePendingText = FREE_SPACE_PENDING;
	protected readonly legacyName = `Delete ${LEGACY_LABEL}`;
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
	/** The latest deletion job of the server status. */
	private readonly deletion = computed(() => this.server.status()?.deletion ?? null);
	/** Why the delete buttons are disabled, or `null` while they are enabled. */
	protected readonly deleteBlocked = computed(() => {
		if (this.deletion()?.state === 'running') {
			return 'A deletion is running';
		}

		return this.running() ? 'Available once the migration ends' : null;
	});
	protected readonly deletionProgress = computed(() => {
		const job = this.deletion();

		return job?.state === 'running' ? deletionProgress(job) : null;
	});
	protected readonly deletionOutcome = computed(() => {
		const job = this.deletion();

		return job === null ? null : deletionOutcome(job, this.tz(), Date.now());
	});
	/**
	 * The classes of a deletion this tab saw complete, whose free space MongoDB reports only after its next checkpoint:
	 * they and the Total show a notice instead of their free line until the second read.
	 */
	private readonly freePending = signal<ReadonlySet<DeletionClassKey> | null>(null);
	/** The message of a refused deletion request, until the next request. */
	protected readonly refused = signal<string | null>(null);

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
		const tz = this.tz();
		const { rows, total } = storageClasses(info.storage, info.retention, readAt, {
			migration: this.migrationState(),
			tz
		});
		const free = (bytes: number) =>
			bytes >= FREE_LINE_MIN_BYTES ? `${formatBytes(bytes)} free for new data` : null;
		const pending = this.freePending();

		return {
			rows: rows.map((row) => ({
				...row,
				documentsText: formatNumber(row.documents),
				size: formatBytes(row.bytes),
				free: free(row.freeBytes),
				freePending: row.deletionClass !== undefined && pending?.has(row.deletionClass) === true,
				deleted:
					row.deletionClass === undefined ? null : deletionRecordLine(info.deletions[row.deletionClass], tz),
				deletion: row.deletionClass ?? (row.rollback ? ('legacy' as const) : null),
				deleteName: row.deletionClass === undefined ? this.legacyName : `Delete ${row.label}`
			})),
			total: {
				documents: formatNumber(total.documents),
				size: formatBytes(total.bytes),
				free: free(total.freeBytes),
				freePending: pending !== null
			},
			retentionReported: info.retention !== undefined,
			legacyKept: rows.some((row) => row.rollback)
		};
	});

	constructor() {
		let secondRead: ReturnType<typeof setTimeout> | undefined;
		/** The deletion job and state of the last status this tab saw; `undefined` before the first. */
		let seen: string | undefined;

		inject(DestroyRef).onDestroy(() => {
			clearTimeout(secondRead);
		});
		// Each opening of the tab reads the storage figures again; closing it cancels the second read below.
		effect(() => {
			if (this.active()) {
				untracked(() => void this.service.load());
			} else {
				clearTimeout(secondRead);
				this.freePending.set(null);
			}
		});
		// When a status reports that a deletion ended, the shell reads the info document; the open tab reads it once
		// more after the checkpoint that releases the freed space.
		effect(() => {
			const job = this.deletion();
			const key = deletionKey(job);

			if (
				seen !== undefined &&
				key !== seen &&
				job !== null &&
				job.state !== 'running' &&
				untracked(() => this.active())
			) {
				const completed = job.state === 'completed' ? completedClasses(job.class) : [];

				clearTimeout(secondRead);
				untracked(() => {
					this.freePending.set(completed.length > 0 ? new Set(completed) : null);
				});
				secondRead = setTimeout(() => {
					void this.service.load().then(() => {
						this.freePending.set(null);
					});
				}, SECOND_READ_MS);
			}

			seen = key;
		});
		effect(() => {
			if (this.running()) {
				this.seenRunning.set(true);
			}
		});
		// The completion of a job this tab showed running is announced once; an interrupted or failed one has its notice.
		effect(() => {
			const job = this.deletion();

			if (job === null) {
				return;
			}

			untracked(() => {
				if (job.state === 'running') {
					this.watching.set(job.id);
				} else if (job.id === this.watching()) {
					this.watching.set(null);

					if (job.state === 'completed') {
						this.toast.show(deletionCompleted(job));
					}
				}
			});
		});
	}

	/** Confirms and starts the deletion of a class, of every class (`all`) or of the legacy data. */
	protected async delete(deletionClass: DeletionClass, legacyKept = false): Promise<void> {
		if (this.deleteBlocked() !== null) {
			return;
		}

		const dialog = DELETION_DIALOGS[deletionClass];
		const result = await this.dialogs.confirm({
			title: dialog.title,
			body: this.dialogBody(),
			bodyContext: dialog.body,
			confirmLabel: 'Delete',
			...(deletionClass === 'all' && legacyKept ? { checkbox: LEGACY_CHECKBOX } : {})
		});

		if (result === null) {
			return;
		}

		const request: StartDeletionRequest =
			deletionClass === 'all' && result.checked
				? { class: 'all', includeLegacy: true }
				: { class: deletionClass };

		this.refused.set(null);

		try {
			await this.http.post<DeletionJob>('deletions', request);
		} catch (error) {
			this.refused.set(deletionRefusal(error));
		}

		void this.server.pollNow();
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
