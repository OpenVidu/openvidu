import { Component, computed, input } from '@angular/core';

import { injectTicker } from '../../core/refresh/ticker.js';
import { formatDuration } from '../../format/formatters.js';

export interface LiveDuration {
	start?: string | Date | null | undefined;
	end?: string | Date | null | undefined;
	/** Duration the server stored once the item ended. */
	storedMs?: number | null | undefined;
	running: boolean;
}

function time(value: string | Date | null | undefined): number | undefined {
	if (value === null || value === undefined) {
		return undefined;
	}

	const ms = new Date(value).getTime();

	return Number.isNaN(ms) ? undefined : ms;
}

/**
 * The duration of an item at `now`: the time since its start while it runs, whatever it has stored (the writer stores
 * 0 for an active egress output); once ended, the stored value, or its end minus its start without one.
 *
 * @returns Milliseconds, or `undefined` when nothing allows computing it.
 */
export function liveDurationMs(item: LiveDuration, now: Date): number | undefined {
	const start = time(item.start);

	if (item.running && start !== undefined) {
		return Math.max(0, now.getTime() - start);
	}

	if (item.storedMs !== null && item.storedMs !== undefined) {
		return item.storedMs;
	}

	if (start === undefined || item.running) {
		return undefined;
	}

	const end = time(item.end);

	return end === undefined ? undefined : Math.max(0, end - start);
}

/**
 * A stored total plus the elapsed time of its running part, such as an ingress whose session publishes now.
 *
 * @param runningSince Start of the running part; `undefined` while nothing runs.
 */
export function liveTotalMs(storedMs: number, runningSince: string | Date | null | undefined, now: Date): number {
	const since = time(runningSince);

	return since === undefined ? storedMs : storedMs + Math.max(0, now.getTime() - since);
}

/** A live duration (see {@link liveDurationMs}) that counts up every second while running; `—` when unknown. */
@Component({
	selector: 'ovd-duration',
	host: { class: 'ovd-tabular' },
	template: `{{ text() }}`
})
export class Duration {
	private readonly now = injectTicker();

	readonly start = input<string | Date | null>();
	readonly end = input<string | Date | null>();
	readonly storedMs = input<number | null>();
	readonly running = input(false);
	/** Stored total to which the running part adds, replacing `storedMs`. */
	readonly totalMs = input<number>();

	protected readonly text = computed(() => {
		const total = this.totalMs();

		if (total !== undefined) {
			return formatDuration(liveTotalMs(total, this.running() ? this.start() : undefined, this.now()));
		}

		const ms = liveDurationMs(
			{ start: this.start(), end: this.end(), storedMs: this.storedMs(), running: this.running() },
			this.running() ? this.now() : new Date(0)
		);

		return ms === undefined ? '—' : formatDuration(ms);
	});
}
