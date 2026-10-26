import { computed, effect, type Signal, signal, untracked } from '@angular/core';

import { injectRefreshScheduler, type RefreshScheduler } from './refresh.js';

export interface ListLoaderOptions<Q, R> {
	/** Request built from the URL state; a change loads at once. */
	request: Signal<Q>;
	fetch: (request: Q) => Promise<R>;
	/** Loads only on start, on request changes and on the manual refresh. */
	manual?: boolean;
}

export interface ListLoader<R> {
	/** Data of the latest request; kept while a later load is in flight or after it fails. */
	readonly data: Signal<R | null>;
	readonly loading: Signal<boolean>;
	readonly error: Signal<unknown>;
	readonly scheduler: RefreshScheduler;
}

/**
 * Loads a page's data on start, on every change of the request and on the refresh interval. A request that changes
 * while a load is in flight is loaded as soon as that load answers, so the data always matches the latest URL state.
 */
export function injectListLoader<Q, R>(options: ListLoaderOptions<Q, R>): ListLoader<R> {
	const data = signal<R | null>(null);
	const key = computed(() => JSON.stringify(options.request()));

	const load = async (): Promise<void> => {
		for (;;) {
			const loaded = untracked(key);
			const result = await options.fetch(untracked(options.request));

			if (untracked(key) === loaded) {
				data.set(result);

				return;
			}
		}
	};

	const scheduler = injectRefreshScheduler({ load, manual: options.manual ?? false });
	let first = true;

	effect(() => {
		key();

		if (first) {
			first = false;

			return;
		}

		untracked(() => void scheduler.refresh());
	});

	return { data: data.asReadonly(), loading: scheduler.inFlight, error: scheduler.error, scheduler };
}
