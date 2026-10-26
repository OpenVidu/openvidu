import type { Db } from 'mongodb';

export const ACTIVE_ROOM: string;
export const CLOSED_ROOM: string;
export const RECONCILED_ROOM: string;
export const RECONCILED_EGRESS: string;
export const WEB_EGRESS: string;
export const LEAKING_EGRESS: string;
export const SENTINEL: string;
export const IDLE_INGRESS: string;
export const FAILED_INGRESS: string;
export const LEAKING_INGRESS: string;
export const INGRESS_USER_INFO: string;
export const STALE_ROOM: string;

export function seedRooms(db: Db, now?: Date): Promise<void>;
