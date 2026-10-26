import { DestroyRef, DOCUMENT, effect, inject, Service, type Signal, signal } from '@angular/core';
import type { RefreshIntervalMs } from '@openvidu-dashboard/typings';

import { PreferencesService } from '../preferences/preferences.js';

/** First retry delay after a failed refresh; it doubles up to `BACKOFF_MAX_MS`. */
export const BACKOFF_START_MS = 10_000;
export const BACKOFF_MAX_MS = 300_000;

export interface RefreshSchedulerOptions {
	/** Loads the page data; a rejection counts as a failed refresh. */
	load: () => Promise<unknown>;
	/** Why the page cannot poll now, such as "Room has ended"; `null` (the default) polls. */
	paused?: Signal<string | null>;
	/** Refreshes only on demand: no interval, whatever the viewer preference. */
	manual?: boolean;
	/** Shows the scheduler in the header refresh control; false for a secondary poll of the page. Default true. */
	register?: boolean;
	/** Fixed interval that replaces the viewer preference, for a poll the viewer does not control. */
	interval?: Signal<RefreshIntervalMs>;
}

/**
 * Runs a page loader once and then on the viewer's interval while the page is not paused and visible. A tick never overlaps a
 * request in flight, failures back off 10 → 20 → 40 s … 5 min, a hidden tab pauses the timer and its return fetches at
 * once. Create it with `injectRefreshScheduler()`.
 */
export class RefreshScheduler {
	private readonly running = signal(false);
	private readonly updated = signal<Date | null>(null);
	private readonly failure = signal<unknown>(null);
	private timer: ReturnType<typeof setTimeout> | undefined;
	private failures = 0;
	private active = false;
	private destroyed = false;

	readonly inFlight = this.running.asReadonly();
	readonly lastUpdated = this.updated.asReadonly();
	/** Error of the current failure streak, set once when the streak starts; `null` after a success. */
	readonly error = this.failure.asReadonly();
	readonly manual: boolean;

	constructor(
		private readonly options: RefreshSchedulerOptions,
		private readonly preferences: PreferencesService,
		private readonly document: Document,
		private readonly now: () => Date = () => new Date()
	) {
		this.manual = options.manual ?? false;
	}

	interval(): RefreshIntervalMs {
		return this.manual ? 0 : (this.options.interval?.() ?? this.preferences.refreshInterval('live'));
	}

	/** Why the page cannot poll now, or `null`. */
	pausedReason(): string | null {
		return this.options.paused?.() ?? null;
	}

	/** Stores a new interval for every live view. */
	setInterval(interval: RefreshIntervalMs): void {
		this.preferences.setRefreshInterval('live', interval);
	}

	/** Loads now unless a request is in flight; then schedules the next tick. */
	async refresh(): Promise<void> {
		if (this.running() || this.destroyed) {
			return;
		}

		this.clearTimer();
		this.running.set(true);

		try {
			await this.options.load();
			this.failures = 0;
			this.failure.set(null);
			this.updated.set(this.now());
		} catch (error) {
			this.failures++;

			if (this.failure() === null) {
				this.failure.set(error ?? new Error('Refresh failed'));
			}
		} finally {
			this.running.set(false);
		}

		this.schedule();
	}

	/** Applies whether the page can poll and the interval; called whenever either changes. */
	configure(polling: boolean, interval: number): void {
		this.active = polling && interval > 0;
		this.schedule(interval);
	}

	/** Pauses while the document is hidden and fetches at once when it becomes visible again. */
	visibilityChanged(): void {
		if (this.document.hidden) {
			this.clearTimer();
		} else if (this.active) {
			void this.refresh();
		}
	}

	destroy(): void {
		this.destroyed = true;
		this.clearTimer();
	}

	private schedule(interval: number = this.interval()): void {
		this.clearTimer();

		if (!this.active || this.destroyed || this.running() || this.document.hidden) {
			return;
		}

		const delay =
			this.failures > 0 ? Math.min(BACKOFF_START_MS * 2 ** (this.failures - 1), BACKOFF_MAX_MS) : interval;

		this.timer = setTimeout(() => void this.refresh(), delay);
	}

	private clearTimer(): void {
		clearTimeout(this.timer);
		this.timer = undefined;
	}
}

/** The scheduler of the current page, shown by the header refresh control. */
@Service()
export class RefreshRegistry {
	private readonly current = signal<RefreshScheduler | null>(null);

	readonly active = this.current.asReadonly();

	register(scheduler: RefreshScheduler): void {
		this.current.set(scheduler);
	}

	unregister(scheduler: RefreshScheduler): void {
		if (this.current() === scheduler) {
			this.current.set(null);
		}
	}
}

/**
 * Creates the refresh scheduler of a page: loads once, follows the interval preference and the pause reason, registers
 * with the header refresh control and stops when the page is destroyed.
 */
export function injectRefreshScheduler(options: RefreshSchedulerOptions): RefreshScheduler {
	const preferences = inject(PreferencesService);
	const document = inject(DOCUMENT);
	const registry = inject(RefreshRegistry);
	const scheduler = new RefreshScheduler(options, preferences, document);
	const onVisibility = (): void => {
		scheduler.visibilityChanged();
	};

	effect(() => {
		scheduler.configure(scheduler.pausedReason() === null, scheduler.interval());
	});
	document.addEventListener('visibilitychange', onVisibility);

	if (options.register !== false) {
		registry.register(scheduler);
	}

	inject(DestroyRef).onDestroy(() => {
		document.removeEventListener('visibilitychange', onVisibility);
		registry.unregister(scheduler);
		scheduler.destroy();
	});
	void scheduler.refresh();

	return scheduler;
}
