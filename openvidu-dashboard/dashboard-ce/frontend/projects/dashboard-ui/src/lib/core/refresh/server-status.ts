import { computed, effect, inject, Service, signal, untracked } from '@angular/core';
import { freshnessWindows, type RefreshIntervalMs, type StatusResponse } from '@openvidu-dashboard/typings';

import { HttpService } from '../http/http.js';
import { InfoService } from '../info.js';
import { injectRefreshScheduler, type RefreshScheduler } from './refresh.js';

export const STATUS_POLL_MS: RefreshIntervalMs = 30_000;
/** Poll while the migration runs or the schema is uninitialized, so their banners follow the server. */
export const STATUS_POLL_FAST_MS: RefreshIntervalMs = 10_000;
/** Consecutive silent statuses before the silent writer banner shows. */
const SILENT_STATUSES = 2;

/** The last status body and when the browser received it. */
export interface StatusSnapshot {
	body: StatusResponse;
	receivedAt: number;
}

/** Whether a status finds the writer silent: no batch within the silent window, or none at all once the schema exists. */
function silent(status: StatusResponse): boolean {
	if (status.migration.state === 'running') {
		return false;
	}

	const lastSeenAt = status.writer.lastSeenAt;

	return lastSeenAt === undefined
		? status.schema.status !== 'uninitialized'
		: Date.parse(status.generatedAt) - Date.parse(lastSeenAt) >
				freshnessWindows(status.writer.batchIntervalMs).silentMs;
}

/**
 * `GET /api/v1/status`: schema, migration and writer for the banners, the live chip, the Overview card and About. Every
 * judgment is made at the instant of the last response (`generatedAt`) with the freshness windows of the writer's batch
 * interval, and holds until the next one.
 */
@Service()
export class ServerStatusService {
	private readonly http = inject(HttpService);
	private readonly current = signal<StatusSnapshot | null>(null);
	/** Consecutive statuses that found the writer silent. */
	private readonly silentStreak = signal(0);

	readonly snapshot = this.current.asReadonly();
	readonly status = computed(() => this.current()?.body ?? null);
	/** `generatedAt − writer.lastSeenAt` of the last status; `null` before it or when no batch was ever seen. */
	readonly writerAgeMs = computed(() => {
		const status = this.status();
		const lastSeenAt = status?.writer.lastSeenAt;

		return status === null || lastSeenAt === undefined
			? null
			: Math.max(0, Date.parse(status.generatedAt) - Date.parse(lastSeenAt));
	});
	/** The freshness windows of the writer's batch interval in the last status. */
	readonly windows = computed(() => freshnessWindows(this.status()?.writer.batchIntervalMs));
	/** The last status found a batch within the fresh window; true while no status has arrived yet. */
	readonly writerFresh = computed(() => {
		const age = this.writerAgeMs();

		return this.status() === null || (age !== null && age <= this.windows().freshMs);
	});
	/**
	 * The silent writer banner: two consecutive statuses without a batch within the silent window (or without any batch
	 * once the schema exists); the first status with a fresh batch clears it. A running migration has its own banner and
	 * the writer writes no batch until it ends.
	 */
	readonly writerSilent = computed(() => this.silentStreak() >= SILENT_STATUSES);
	readonly pollInterval = computed<RefreshIntervalMs>(() => {
		const status = this.status();

		return status?.migration.state === 'running' || status?.schema.status === 'uninitialized'
			? STATUS_POLL_FAST_MS
			: STATUS_POLL_MS;
	});

	async load(): Promise<void> {
		const body = await this.http.get<StatusResponse>('status');

		this.current.set({ body, receivedAt: Date.now() });
		this.silentStreak.update((streak) => (silent(body) ? streak + 1 : 0));
	}
}

/**
 * Polls the server status for the signed-in frame, whatever the page and its auto-refresh, and re-reads the info
 * document once when the status reports another schema status or migration state.
 */
export function injectServerStatusPoll(): RefreshScheduler {
	const status = inject(ServerStatusService);
	const info = inject(InfoService);
	let reread: string | null = null;

	effect(() => {
		const body = status.status();
		const known = info.info();

		if (body === null || known === null) {
			return;
		}

		const key = `${body.schema.status}|${body.migration.state}`;

		if (key !== `${known.schema.status}|${known.migration.state}` && key !== reread) {
			reread = key;
			untracked(() => void info.load());
		}
	});

	return injectRefreshScheduler({
		register: false,
		interval: status.pollInterval,
		load: () => status.load()
	});
}
