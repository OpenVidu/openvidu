import type { ValueOf } from '../data-model/value-of.js';

/** Entities with a LiveKit identifier. */
export const EntityIdKind = {
	ROOM: 'room',
	PARTICIPANT: 'participant',
	EGRESS: 'egress',
	INGRESS: 'ingress',
	TRACK: 'track'
} as const;
export type EntityIdKind = ValueOf<typeof EntityIdKind>;

/** Exact identifiers: the LiveKit prefix followed by letters and digits. */
export const ENTITY_ID_PATTERNS: Readonly<Record<EntityIdKind, RegExp>> = {
	room: /^RM_[A-Za-z0-9]+$/,
	participant: /^PA_[A-Za-z0-9]+$/,
	egress: /^EG_[A-Za-z0-9]+$/,
	ingress: /^IN_[A-Za-z0-9]+$/,
	track: /^TR_[A-Za-z0-9]+$/
};

/** Whether `value` is an exact identifier of `kind`. */
export function isEntityId(kind: EntityIdKind, value: string): boolean {
	return ENTITY_ID_PATTERNS[kind].test(value);
}

/**
 * The entity an exact identifier belongs to.
 *
 * @param value Text to classify.
 * @returns The entity kind, or `undefined` when `value` is no exact identifier.
 */
export function entityIdKind(value: string): EntityIdKind | undefined {
	return (Object.keys(ENTITY_ID_PATTERNS) as EntityIdKind[]).find((kind) => ENTITY_ID_PATTERNS[kind].test(value));
}
