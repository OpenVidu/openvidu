import { Component, computed, effect, inject, signal, type TemplateRef, untracked, viewChild } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatTooltip } from '@angular/material/tooltip';
import type {
	DeletionClass,
	DeletionJob,
	DeletionRecord,
	InfoMigration,
	StartDeletionRequest
} from '@openvidu-dashboard/typings';

import { ConfirmDialogService } from '../../components/confirm-dialog/confirm-dialog.js';
import { ExternalLink } from '../../components/external-link/external-link.js';
import { errorMessage } from '../../components/feedback/error-banner.js';
import { Notice } from '../../components/feedback/notice.js';
import { Skeleton } from '../../components/feedback/skeleton.js';
import { InfoTip } from '../../components/info-tip/info-tip.js';
import { toApiRequestError } from '../../core/http/api-error.js';
import { HttpService } from '../../core/http/http.js';
import { InfoService } from '../../core/info.js';
import { EXTERNAL_LINKS } from '../../core/links.js';
import { ServerStatusService } from '../../core/refresh/server-status.js';
import { QueryStateService } from '../../core/state/query-state.js';
import { ToastService } from '../../core/ui/toast.js';
import { DELETION_CLASS_LABELS, deletionStepLabel, documentCount } from '../../format/deletions.js';
import { formatBytes, formatNumber, formatTimestamp } from '../../format/formatters.js';
import { CollectionBreakdown } from './collection-breakdown.js';
import { LEGACY_LABEL, storageClasses } from './storage-classes.js';

/** The free space line shows from 1 MB. */
const FREE_LINE_MIN_BYTES = 1_000_000;

const KEPT = 'Data of rooms in progress and data that ended in the last 5 minutes are kept.';
const UNDONE = 'This cannot be undone.';
const DISK_SPACE =
	'MongoDB keeps the freed disk space for new data of the same collections and does not return it to the system.';

/** The body of a deletion dialog: its first sentences, the paragraph after them and the disk space link. */
export interface DeletionDialogBody {
	lead: string;
	rest?: string;
	link: boolean;
}

/** Title and body of the confirmation dialog of each deletion. */
export const DELETION_DIALOGS: Readonly<Record<DeletionClass, { title: string; body: DeletionDialogBody }>> = {
	events: {
		title: 'Delete events?',
		body: {
			lead: 'Deletes the stored events of rooms, participant sessions, egresses and ingresses that have ended. Their records stay, but their event timelines become empty.',
			rest: `${KEPT} ${UNDONE} ${DISK_SPACE}`,
			link: true
		}
	},
	stats: {
		title: 'Delete stats?',
		body: {
			lead: 'Deletes the media statistics (quality, bitrate, packet loss) of sessions and tracks that have ended. Their charts become empty; Analytics keeps its figures.',
			rest: `${KEPT} ${UNDONE} ${DISK_SPACE}`,
			link: true
		}
	},
	tracks: {
		title: 'Delete tracks and subscriptions?',
		body: {
			lead: 'Deletes the published tracks and subscriptions that have ended, with the statistics stored per track. Statistics stored per participant are kept.',
			rest: `${KEPT} ${UNDONE} ${DISK_SPACE}`,
			link: true
		}
	},
	entities: {
		title: 'Delete entities?',
		body: {
			lead: 'Deletes rooms, participant sessions, egresses and ingress sessions that have ended, with their events, stats, tracks and subscriptions. Ingresses that are not deleted and media node records are kept; Analytics keeps its figures.',
			rest: `${KEPT} ${UNDONE} ${DISK_SPACE}`,
			link: true
		}
	},
	'rollups-5min': {
		title: 'Delete 5-minute rollups?',
		body: {
			lead: 'Deletes the 5-minute rollups before the previous 5 minutes. Analytics charts of ranges up to one day become empty for that time.',
			rest: `${UNDONE} ${DISK_SPACE}`,
			link: true
		}
	},
	'rollups-hourly': {
		title: 'Delete hourly rollups?',
		body: {
			lead: 'Deletes the hourly rollups before the previous hour. Overview figures of today, list summaries and Analytics of ranges up to 90 days become empty for that time.',
			rest: `${UNDONE} ${DISK_SPACE}`,
			link: true
		}
	},
	'rollups-daily': {
		title: 'Delete daily rollups?',
		body: {
			lead: 'Deletes the daily rollups before yesterday. Analytics of ranges over 90 days and unique identities become empty for that time.',
			rest: `${UNDONE} ${DISK_SPACE}`,
			link: true
		}
	},
	all: {
		title: 'Delete all analytics data?',
		body: {
			lead: 'Deletes events, stats, tracks and subscriptions, entities and the 5-minute, hourly and daily rollups: Analytics loses its history.',
			rest: `Data of rooms in progress, data that ended in the last 5 minutes, the latest rollups, ingresses that are not deleted and media node records are kept. ${UNDONE} ${DISK_SPACE}`,
			link: true
		}
	},
	legacy: {
		title: 'Delete data before 3.10?',
		body: {
			lead: 'Deletes the analytics data of OpenVidu before 3.10. Its disk space is freed at once. A rollback to 3.9 will find no analytics data. This cannot be undone.',
			link: false
		}
	}
};

/** The checkbox of the Total dialog while the legacy data is kept for a rollback. */
export const LEGACY_CHECKBOX = {
	label: 'Also delete the data before 3.10',
	note: 'The data before 3.10 is dropped and its disk space freed at once. A rollback to 3.9 will find no analytics data.'
};

/** The class of a job as the subject of a sentence: "Events", "All analytics data", "Data before 3.10". */
function jobSubject(deletionClass: DeletionClass): string {
	switch (deletionClass) {
		case 'all':
			return 'All analytics data';
		case 'legacy':
			return 'Data before 3.10';
		default:
			return DELETION_CLASS_LABELS[deletionClass];
	}
}

/** The class of a job inside a sentence: "Events", "all analytics data", "data before 3.10". */
function jobObject(deletionClass: DeletionClass): string {
	return deletionClass === 'all' || deletionClass === 'legacy'
		? jobSubject(deletionClass).replace(/^./, (first) => first.toLowerCase())
		: DELETION_CLASS_LABELS[deletionClass];
}

/** `2026-11-19 10:31` in the session zone. */
function minute(value: string, tz: string): string {
	return formatTimestamp(value, { tz }).slice(0, 16);
}

/** The line of a running deletion: "Deleting Entities: 1,234,000 documents deleted · collection 2 of 5". */
export function deletionProgress(job: DeletionJob): string {
	const step = job.currentClass ?? (job.class === 'all' ? 'events' : job.class);

	return `Deleting ${deletionStepLabel(step)}: ${documentCount(job.deleted)} deleted · collection ${formatNumber(job.collection.index)} of ${formatNumber(job.collection.total)}`;
}

/** The notice of an interrupted or failed latest job, with its time ("10:20" today in `tz`, else with the date). */
export function deletionOutcome(job: DeletionJob, tz: string, now: number): string | null {
	if (job.state !== 'interrupted' && job.state !== 'failed') {
		return null;
	}

	const at = job.finishedAt ?? job.startedAt;
	const when = minute(at, tz);
	const today = formatTimestamp(now, { tz }).slice(0, 10) === when.slice(0, 10);
	const time = today ? when.slice(11) : when;
	const deleted = `${documentCount(job.deleted)} ${job.deleted === 1 ? 'was' : 'were'} deleted.`;
	const reason =
		job.state === 'interrupted'
			? `was interrupted at ${time}: the dashboard stopped while running it.`
			: `failed at ${time}: ${job.error ?? 'A database error stopped it'}.`;

	return `Deleting ${jobObject(job.class)} ${reason} ${deleted} Start it again to finish.`;
}

/**
 * The notice of a deletion request that started nothing: the message of a `409` (a deletion already running, the data
 * before 3.10 not kept for rollback), or the generic message of any other failure with its request id.
 */
export function deletionRefusal(error: unknown): string {
	const failure = toApiRequestError(error);

	if (failure.status === 409) {
		return failure.message;
	}

	return `The deletion did not start: ${errorMessage(failure)}${failure.requestId === undefined ? '' : ` Request ${failure.requestId}`}`;
}

/** The line under a class name: its last completed deletion, or a later one left incomplete. */
export function deletionRecordLine(
	record: DeletionRecord | undefined,
	tz: string
): { text: string; incomplete: boolean } | null {
	if (record?.incomplete !== undefined) {
		const what = record.incomplete.state === 'interrupted' ? 'interrupted' : 'failed';

		return { text: `Deletion ${what} ${minute(record.incomplete.at, tz)} (incomplete)`, incomplete: true };
	}

	return record?.completed === undefined
		? null
		: { text: `Deleted ${minute(record.completed.finishedAt, tz)}`, incomplete: false };
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

	protected readonly configurationReference = EXTERNAL_LINKS.analyticsSettings;
	protected readonly freeingDiskSpace = EXTERNAL_LINKS.freeingDiskSpace;
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

		return {
			rows: rows.map((row) => ({
				...row,
				documentsText: formatNumber(row.documents),
				size: formatBytes(row.bytes),
				free: free(row.freeBytes),
				deleted:
					row.deletionClass === undefined ? null : deletionRecordLine(info.deletions[row.deletionClass], tz),
				deletion: row.deletionClass ?? (row.rollback ? ('legacy' as const) : null),
				deleteName: row.deletionClass === undefined ? this.legacyName : `Delete ${row.label}`
			})),
			total: {
				documents: formatNumber(total.documents),
				size: formatBytes(total.bytes),
				free: free(total.freeBytes)
			},
			retentionReported: info.retention !== undefined,
			legacyKept: rows.some((row) => row.rollback)
		};
	});

	constructor() {
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
						this.toast.show(`${jobSubject(job.class)} deleted: ${documentCount(job.deleted)}`);
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
