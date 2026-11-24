import * as z from 'zod';

import { DELETION_CLASS_KEYS, DELETION_CLASSES, DeletionState } from '@openvidu-dashboard/typings';

import { isoDate } from '../api/responses.js';

const classKey = z.enum(DELETION_CLASS_KEYS);

/** Body of `POST /deletions`: strict, `includeLegacy` only with `class: "all"`. */
export const startDeletionRequest = z
	.strictObject({
		class: z.enum(DELETION_CLASSES).meta({ description: 'Class of data to delete' }),
		includeLegacy: z
			.boolean()
			.optional()
			.meta({ description: 'Also drop the data before 3.10; only with class all' })
	})
	.superRefine((body, context) => {
		if (body.includeLegacy !== undefined && body.class !== 'all') {
			context.addIssue({ code: 'custom', path: ['includeLegacy'], message: 'is only accepted with class all' });
		}
	})
	.meta({ id: 'StartDeletionRequest' });

export const deletionJob = z
	.object({
		id: z.string(),
		class: z.enum(DELETION_CLASSES),
		includeLegacy: z.boolean(),
		state: z.enum(DeletionState),
		cutoff: isoDate,
		startedAt: isoDate,
		finishedAt: isoDate.optional(),
		currentClass: z.enum([...DELETION_CLASS_KEYS, 'legacy']).optional(),
		collection: z.object({ index: z.number().int(), total: z.number().int() }),
		deleted: z.number().int(),
		error: z.string().optional()
	})
	.meta({ id: 'DeletionJob' });

const deletionRecord = z.object({
	completed: z.object({ cutoff: isoDate, endedBefore: isoDate, finishedAt: isoDate }).optional(),
	incomplete: z.object({ state: z.enum(['interrupted', 'failed']), at: isoDate }).optional()
});

/** `deletions` of the info document: the last outcome of each class. */
export const deletionRecords = z.partialRecord(classKey, deletionRecord);
