import type { Authenticator } from '../api/route-registry.js';
import { ApiError } from '../http/api-error.js';
import type { AuthService } from './auth-service.js';

const BEARER = /^Bearer\s+(\S+)$/i;

/**
 * Checks `Authorization: Bearer <token>`: required routes need it; optional routes check it only when the header is
 * present, so an expired token is a `401` and not the public answer.
 */
export function bearerAuthenticator(auth: () => AuthService): Authenticator {
	return async (req, required) => {
		const header = req.get('Authorization');

		if (header === undefined) {
			if (required) {
				throw new ApiError('UNAUTHORIZED', 'Missing access token', { reason: 'missing' });
			}

			return;
		}

		const token = BEARER.exec(header)?.[1];

		if (token === undefined) {
			throw new ApiError('UNAUTHORIZED', 'Malformed Authorization header', { reason: 'invalid' });
		}

		req.auth = await auth().verifyAccessToken(token);
	};
}
