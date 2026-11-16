import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { computed, inject, Service, type Signal, signal } from '@angular/core';
import type { FeatureKey, InfoPublicResponse, InfoResponse } from '@openvidu-dashboard/typings';
import { catchError, throwError } from 'rxjs';

import { AuthService } from './auth/auth.js';
import { type ApiRequestError, toApiRequestError } from './http/api-error.js';
import { API_BASE, HttpService } from './http/http.js';

function isFullInfo(info: InfoResponse | InfoPublicResponse): info is InfoResponse {
	return 'features' in info;
}

/** A full info document and when it arrived (epoch ms): the instant its storage figures describe. */
export interface InfoRead {
	info: InfoResponse;
	readAt: number;
}

/**
 * `GET /api/v1/info`, read at startup and after sign-in: edition, versions, schema, migration and features as signals.
 * Without a session the endpoint answers the public subset (edition and dashboard version).
 */
@Service()
export class InfoService {
	private readonly http = inject(HttpService);
	private readonly auth = inject(AuthService);
	private readonly fullRead = signal<InfoRead | null>(null);
	private readonly publicInfo = signal<InfoPublicResponse | null>(null);
	private readonly failure = signal<ApiRequestError | null>(null);

	/** The full document; `null` before sign-in or when the last read failed without a previous one. */
	readonly info = computed(() => this.fullRead()?.info ?? null);
	readonly error = this.failure.asReadonly();
	/** The full document with the time it arrived; `null` like `info`. */
	readonly read = this.fullRead.asReadonly();
	readonly edition = computed(() => this.info()?.edition ?? this.publicInfo()?.edition ?? null);
	readonly dashboardVersion = computed(
		() => this.info()?.versions.dashboard ?? this.publicInfo()?.versions.dashboard ?? null
	);
	readonly migration = computed(() => this.info()?.migration ?? null);
	readonly features = computed<ReadonlySet<FeatureKey>>(() => new Set(this.info()?.features ?? []));

	/**
	 * Reads the info document; keeps the previous one and records the error when the request fails. The server status
	 * poll calls it again when the schema status or the migration state changes.
	 */
	async load(): Promise<void> {
		try {
			const info = await this.http.get<InfoResponse | InfoPublicResponse>('info');

			this.failure.set(null);

			if (isFullInfo(info)) {
				this.fullRead.set({ info, readAt: Date.now() });
			} else {
				this.publicInfo.set(info);

				if (!this.auth.authenticated()) {
					this.fullRead.set(null);
				}
			}
		} catch (error) {
			this.failure.set(toApiRequestError(error));
		}
	}
}

/** Feature flags of the running edition; a feature the info document does not list is locked. */
@Service()
export class FeatureService {
	private readonly info = inject(InfoService);

	enabled(feature: FeatureKey): boolean {
		return this.info.features().has(feature);
	}

	/** Signal form of `enabled()`. */
	enabledSignal(feature: FeatureKey): Signal<boolean> {
		return computed(() => this.info.features().has(feature));
	}
}

/** Re-reads the feature flags when the server reports a feature as PRO-only; the page then renders the lock. */
export const proFeatureInterceptor: HttpInterceptorFn = (req, next) => {
	if (!req.url.startsWith(API_BASE)) {
		return next(req);
	}

	const info = inject(InfoService);

	return next(req).pipe(
		catchError((error: unknown) => {
			if (error instanceof HttpErrorResponse && error.status === 403) {
				if (toApiRequestError(error).code === 'PRO_FEATURE') {
					void info.load();
				}
			}

			return throwError(() => error);
		})
	);
};
