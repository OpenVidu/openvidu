/**
 * Building blocks shared by the document types. Conventions of every document: dates are UTC `Date`, durations
 * integer milliseconds, sizes integer bytes; an optional field is absent while unknown (never `null`), except
 * `expiresAt`, which is `null` while an entity is open.
 */

/** Byte totals per direction: `up` is media sent by participants, `down` media received. */
export interface ByteTotals {
	up: number;
	down: number;
}

/** Quality samples accumulated from `track_stats` (MOS 1.0–4.5; `poor` counts samples below 2.06, `lost` below 1.25). */
export interface QualityTotals {
	scoreSum: number;
	scoreCount: number;
	minScore?: number;
	poor: number;
	lost: number;
}

/** Fields every entity document carries. */
export interface EntityBase {
	/** `SCHEMA_VERSION` of the writer that last wrote the document. */
	schemaVersion: number;
	/** `closedAt + retention` once the entity is closed; `null` while it is open, so TTL never removes live data. */
	expiresAt: Date | null;
}

/**
 * Writer bookkeeping (id sets behind set-based counters). Not part of the read contract: the dashboard never
 * reads it and the API never returns it.
 */
export type WriterInternal = Record<string, unknown>;
