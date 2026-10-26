import type { AggregateOptions, Db, Document } from 'mongodb';

/** An aggregation to explain: the collection, its pipeline and options such as the index hint. */
export interface AggregatePlan {
	collection: string;
	pipeline: Document[];
	options?: AggregateOptions;
}

/** A find cursor (any `FindCursor`) or an aggregation. */
export type PlannableQuery =
	{ explain(verbosity: 'executionStats'): Promise<Document>; namespace: { collection?: string } } | AggregatePlan;

/** What an `explain('executionStats')` says about a query: plan stages, indexes used and the work done. */
export interface ExplainSummary {
	planStages: string[];
	pipelineStages: string[];
	indexes: string[];
	nReturned: number | null;
	totalKeysExamined: number | null;
	totalDocsExamined: number | null;
	executionTimeMillis: number | null;
	collscan: boolean;
}

function num(value: unknown): number | null {
	return typeof value === 'number' ? value : null;
}

function asDocument(value: unknown): Document {
	return typeof value === 'object' && value !== null ? value : {};
}

/** Walks a winning plan collecting its stage names and the indexes it scans. */
function walkPlan(node: unknown, stages: string[], indexes: string[]): void {
	if (Array.isArray(node)) {
		for (const child of node) {
			walkPlan(child, stages, indexes);
		}

		return;
	}

	if (typeof node !== 'object' || node === null) {
		return;
	}

	const plan = node as Record<string, unknown>;

	if (typeof plan.stage === 'string') {
		stages.push(plan.stage);
	}

	if (typeof plan.indexName === 'string') {
		indexes.push(plan.indexName);
	}

	for (const key of [
		'queryPlan',
		'inputStage',
		'inputStages',
		'outerStage',
		'innerStage',
		'thenStage',
		'elseStage'
	]) {
		if (key in plan) {
			walkPlan(plan[key], stages, indexes);
		}
	}
}

export function summarizeExplain(explain: Document): ExplainSummary {
	let planner = asDocument(explain.queryPlanner);
	let stats = asDocument(explain.executionStats);
	const pipelineStages: string[] = [];
	const rawStages: unknown = explain.stages;

	if (Array.isArray(rawStages)) {
		for (const stage of rawStages) {
			const doc = asDocument(stage);
			const key = Object.keys(doc)[0] ?? '?';
			pipelineStages.push(key);

			if (key === '$cursor') {
				const cursor = asDocument(doc.$cursor);
				planner = asDocument(cursor.queryPlanner);
				stats = asDocument(cursor.executionStats);
			}
		}
	}

	const planStages: string[] = [];
	const indexes: string[] = [];
	walkPlan(planner.winningPlan, planStages, indexes);

	return {
		planStages,
		pipelineStages,
		indexes: [...new Set(indexes)],
		nReturned: num(stats.nReturned),
		totalKeysExamined: num(stats.totalKeysExamined),
		totalDocsExamined: num(stats.totalDocsExamined),
		executionTimeMillis: num(stats.executionTimeMillis),
		collscan: planStages.includes('COLLSCAN')
	};
}

export function isAggregate<Q extends PlannableQuery>(query: Q): query is Extract<Q, AggregatePlan> {
	return 'pipeline' in query;
}

export async function explainQuery(db: Db, query: PlannableQuery): Promise<Document> {
	return isAggregate(query)
		? db.collection(query.collection).aggregate(query.pipeline, query.options).explain('executionStats')
		: query.explain('executionStats');
}
