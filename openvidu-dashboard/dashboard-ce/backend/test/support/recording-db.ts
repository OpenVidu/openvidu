import type { Db, Document } from 'mongodb';

/** A driver call a service made: the operation, its collection and the index hint of its options. */
export interface RecordedCall {
	operation: 'find' | 'countDocuments' | 'aggregate';
	collection: string;
	hint: unknown;
}

/**
 * A `Db` stand-in whose collections return no documents and record every `find`, `countDocuments` and `aggregate`
 * call with its hint, so a unit test can check which index a service asks for.
 */
export function recordingDb(): { db: Db; calls: RecordedCall[] } {
	const calls: RecordedCall[] = [];
	const record = (operation: RecordedCall['operation'], collection: string, options?: Document) => {
		calls.push({ operation, collection, hint: options?.hint });
	};
	const collection = (name: string) => ({
		find: (_filter: Document, options?: Document) => {
			record('find', name, options);

			const cursor = {
				sort: () => cursor,
				limit: () => cursor,
				project: () => cursor,
				toArray: () => Promise.resolve([])
			};

			return cursor;
		},
		countDocuments: (_filter: Document, options?: Document) => {
			record('countDocuments', name, options);

			return Promise.resolve(0);
		},
		aggregate: (_pipeline: Document[], options?: Document) => {
			record('aggregate', name, options);

			return { toArray: () => Promise.resolve([]) };
		}
	});

	return { db: { collection } as unknown as Db, calls };
}
