import type { Edition } from './info.js';

/** `POST /api/v1/auth/login`. */
export interface LoginRequest {
	username: string;
	password: string;
}

/** `POST /api/v1/auth/login` and `POST /api/v1/auth/refresh`; the refresh token travels only in its cookie. */
export interface AuthTokenResponse {
	accessToken: string;
	/** Expiry of `accessToken`, ISO 8601 UTC. */
	expiresAt: string;
}

/** `GET /api/v1/auth/me`. */
export interface MeResponse {
	username: string;
	edition: Edition;
	/** Expiry of the presented access token, ISO 8601 UTC. */
	expiresAt: string;
}
