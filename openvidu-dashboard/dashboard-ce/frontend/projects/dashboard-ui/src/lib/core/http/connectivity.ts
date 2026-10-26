import { HttpErrorResponse, type HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { computed, inject, Service, signal } from '@angular/core';
import { tap } from 'rxjs';

import { API_BASE } from './http.js';

/** Consecutive unreachable requests before the connectivity banner shows. */
const OFFLINE_AFTER = 2;

/**
 * Whether the API requests reach the dashboard server; drives the connectivity banner, which shows after two
 * consecutive requests that did not reach it and clears with the first that does.
 */
@Service()
export class ConnectivityService {
	private readonly failures = signal(0);

	readonly online = computed(() => this.failures() < OFFLINE_AFTER);

	report(reached: boolean): void {
		this.failures.update((failures) => (reached ? 0 : failures + 1));
	}
}

/** Records network failures (status 0) of API requests and clears them on the next answer. */
export const connectivityInterceptor: HttpInterceptorFn = (req, next) => {
	if (!req.url.startsWith(API_BASE)) {
		return next(req);
	}

	const connectivity = inject(ConnectivityService);

	return next(req).pipe(
		tap({
			next: (event) => {
				if (event instanceof HttpResponse) {
					connectivity.report(true);
				}
			},
			error: (error: unknown) => {
				connectivity.report(!(error instanceof HttpErrorResponse && error.status === 0));
			}
		})
	);
};
