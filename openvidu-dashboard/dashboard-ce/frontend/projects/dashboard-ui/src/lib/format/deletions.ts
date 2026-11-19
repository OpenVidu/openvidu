import type { DeletionClass, DeletionClassKey, DeletionStep } from '@openvidu-dashboard/typings';

import { formatNumber } from './formatters.js';

/** The label of each deletion class: the name of its row in the Storage table of the Data tab. */
export const DELETION_CLASS_LABELS: Readonly<Record<DeletionClassKey, string>> = {
	events: 'Events',
	stats: 'Stats',
	tracks: 'Tracks and subscriptions',
	entities: 'Entities',
	'rollups-5min': '5-minute rollups',
	'rollups-hourly': 'Hourly rollups',
	'rollups-daily': 'Daily rollups'
};

/** What a class step deletes, inside a sentence: "Deleting Entities", "Deleting data before 3.10". */
export function deletionStepLabel(step: DeletionStep): string {
	return step === 'legacy' ? 'data before 3.10' : DELETION_CLASS_LABELS[step];
}

/** The class of a job inside a sentence: "Entities", "all classes", "data before 3.10". */
export function deletionClassLabel(deletionClass: DeletionClass): string {
	return deletionClass === 'all' ? 'all classes' : deletionStepLabel(deletionClass);
}

/** `1 document`, `1,250,312 documents`. */
export function documentCount(count: number): string {
	return `${formatNumber(count)} document${count === 1 ? '' : 's'}`;
}
