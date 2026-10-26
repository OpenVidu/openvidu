import {
	type ExplainSummary,
	explainQuery,
	isAggregate,
	type PlannableQuery,
	summarizeExplain
} from '@openvidu-dashboard/data-generator/plan';
import type { Db } from 'mongodb';
import { expect } from 'vitest';

export type { ExplainSummary, PlannableQuery };

export interface IndexBackedOptions {
	/** Upper bound of `totalDocsExamined`, or a function of the plan (for instance `(plan) => plan.nReturned`). */
	maxDocsExamined: number | ((plan: ExplainSummary) => number);
	/** A COLLSCAN is accepted while the collection holds at most this many documents. */
	collscanThreshold?: number;
}

const DEFAULT_COLLSCAN_THRESHOLD = 1000;

/**
 * Runs `explain('executionStats')` for a find cursor or an aggregation and fails when the winning plan scans a
 * collection above the threshold or examines more documents than the bound. Returns the plan summary.
 */
export async function expectIndexBacked(
	db: Db,
	query: PlannableQuery,
	options: IndexBackedOptions
): Promise<ExplainSummary> {
	const plan = summarizeExplain(await explainQuery(db, query));
	const collection = isAggregate(query) ? query.collection : (query.namespace.collection ?? '?');
	const stages = [...plan.planStages, ...plan.pipelineStages].join(' > ');

	if (plan.collscan) {
		const documents = await db.collection(collection).estimatedDocumentCount();
		const threshold = options.collscanThreshold ?? DEFAULT_COLLSCAN_THRESHOLD;

		if (documents > threshold) {
			throw new Error(`${collection}: COLLSCAN over ${String(documents)} documents (${stages})`);
		}
	}

	const bound =
		typeof options.maxDocsExamined === 'function' ? options.maxDocsExamined(plan) : options.maxDocsExamined;
	const examined = plan.totalDocsExamined;

	if (examined === null) {
		throw new Error(`${collection}: explain reported no executionStats (${stages})`);
	}

	if (examined > bound) {
		throw new Error(
			`${collection}: ${String(examined)} documents examined, more than the bound of ${String(bound)} (${stages})`
		);
	}

	return plan;
}

/** The winning plan uses exactly `expected` and scans no collection. */
export function expectIndexes(plan: ExplainSummary, expected: string[]): void {
	expect(plan.collscan).toBe(false);
	expect([...new Set(plan.indexes)].sort()).toEqual([...expected].sort());
}

/** A point lookup on `_id`: the ID hack stages name no index. */
export function expectIdLookup(plan: ExplainSummary): void {
	expect(plan.collscan).toBe(false);
	expect(plan.planStages.some((stage) => stage.endsWith('IDHACK')) || plan.indexes.includes('_id_')).toBe(true);
}

/** p95 of `runs` sequential calls, in milliseconds. */
export async function p95(run: () => Promise<unknown>, runs = 20): Promise<number> {
	const samples: number[] = [];

	for (let i = 0; i < runs; i++) {
		const start = performance.now();

		await run();
		samples.push(performance.now() - start);
	}

	samples.sort((a, b) => a - b);

	return samples[Math.ceil(samples.length * 0.95) - 1] ?? Number.NaN;
}
