import type { Collection, Db, ObjectId } from 'mongodb';

import { DashboardCollection } from './collections.js';

export interface SessionDocument {
	_id?: ObjectId;
	/** One per login; every rotation keeps it. */
	familyId: string;
	/** SHA-256 hex of the refresh token; the token itself is never stored. */
	tokenHash: string;
	createdAt: Date;
	expiresAt: Date;
	rotatedAt?: Date;
	revokedAt?: Date;
	ip?: string;
	userAgent?: string;
}

/** `dashboard_sessions`: one document per refresh token, removed by MongoDB once `expiresAt` passes. */
export class SessionRepository {
	private readonly sessions: Collection<SessionDocument>;

	constructor(db: Db) {
		this.sessions = db.collection<SessionDocument>(DashboardCollection.SESSIONS);
	}

	async ensureIndexes(): Promise<void> {
		await this.sessions.createIndexes([
			{ key: { tokenHash: 1 }, name: 'tokenHash_unique', unique: true },
			{ key: { familyId: 1 }, name: 'familyId' },
			{ key: { expiresAt: 1 }, name: 'expiresAt_ttl', expireAfterSeconds: 0 }
		]);
	}

	async insert(session: SessionDocument): Promise<void> {
		await this.sessions.insertOne(session);
	}

	/**
	 * Marks the session of `tokenHash` as rotated at `at`, keeping an earlier rotation time, and returns the session
	 * as it was before; null when no session has that hash.
	 */
	async rotate(tokenHash: string, at: Date): Promise<SessionDocument | null> {
		return this.sessions.findOneAndUpdate(
			{ tokenHash },
			[{ $set: { rotatedAt: { $ifNull: ['$rotatedAt', at] } } }],
			{
				returnDocument: 'before'
			}
		);
	}

	async findByHash(tokenHash: string): Promise<SessionDocument | null> {
		return this.sessions.findOne({ tokenHash });
	}

	async revokeFamily(familyId: string, at: Date): Promise<void> {
		await this.sessions.updateMany({ familyId, revokedAt: { $exists: false } }, { $set: { revokedAt: at } });
	}
}
