import type { DeletionClass, DeletionJob, DeletionRecord } from '@openvidu-dashboard/typings';

import { errorMessage } from '../../components/feedback/error-banner.js';
import { toApiRequestError } from '../../core/http/api-error.js';
import { DELETION_CLASS_LABELS, deletionStepLabel, documentCount } from '../../format/deletions.js';
import { formatNumber, formatTimestamp } from '../../format/formatters.js';

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

/** The tip after a free space line; its last words link to the documentation on freeing disk space. */
export const FREE_SPACE_TIP = {
	text: 'MongoDB reuses this space for new data. The rest of the space the deleted data used stays reserved until the collection is compacted; see Freeing disk space.',
	link: 'Freeing disk space'
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

/** The toast of a job that completed while the Data tab showed it: "Events deleted: 1,250,312 documents". */
export function deletionCompleted(job: DeletionJob): string {
	return `${jobSubject(job.class)} deleted: ${documentCount(job.deleted)}`;
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
