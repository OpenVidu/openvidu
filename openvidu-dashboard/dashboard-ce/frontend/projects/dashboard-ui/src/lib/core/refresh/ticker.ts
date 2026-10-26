import { DestroyRef, inject, type Signal, signal } from '@angular/core';

/** The current time, updated every `intervalMs` until the injecting component is destroyed (ticking durations). */
export function injectTicker(intervalMs = 1_000): Signal<Date> {
	const now = signal(new Date());
	const timer = setInterval(() => {
		now.set(new Date());
	}, intervalMs);

	inject(DestroyRef).onDestroy(() => {
		clearInterval(timer);
	});

	return now.asReadonly();
}
