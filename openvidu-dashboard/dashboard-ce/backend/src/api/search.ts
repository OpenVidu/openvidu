import type { Document } from 'mongodb';

export function escapeRegex(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Anchored, case-insensitive prefix on a lower-cased shadow field. */
export function prefixRegex(value: string): Document {
	return { $regex: `^${escapeRegex(value.toLowerCase())}` };
}
