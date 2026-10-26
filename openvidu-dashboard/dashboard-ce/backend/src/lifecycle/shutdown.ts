import type { Server } from 'node:http';

import type { Logger } from '../logging/logger.js';

/** Time a shutdown may take before the process exits anyway, under the 10 s container stop timeout. */
export const SHUTDOWN_DEADLINE_MS = 5_000;

export type Exit = (code: number) => void;

/**
 * The one shutdown sequence of the process, used by signals, startup failures and the exits of startup hooks:
 * stop accepting connections, close idle ones, run the registered closers (timers, MongoDB client) and exit with
 * the requested code. The first request wins; later ones are ignored.
 */
export class Shutdown {
	private readonly closers: (() => Promise<void> | void)[] = [];
	private server: Server | undefined;
	private started = false;

	constructor(
		private readonly logger: Logger,
		private readonly exit: Exit,
		private readonly deadlineMs = SHUTDOWN_DEADLINE_MS
	) {}

	/** True once a shutdown has been requested; startup steps check it before going on. */
	isRequested(): boolean {
		return this.started;
	}

	attachServer(server: Server): void {
		this.server = server;
	}

	/** Registers a resource to release, closed in reverse order of registration. */
	onShutdown(closer: () => Promise<void> | void): void {
		this.closers.push(closer);
	}

	async run(code: number, reason?: string): Promise<void> {
		if (this.started) {
			return;
		}

		this.started = true;

		if (reason) {
			this.logger.info(`Shutting down: ${reason}`);
		}

		const deadline = setTimeout(() => {
			this.logger.warn(`Shutdown took longer than ${String(this.deadlineMs)} ms; exiting`);
			this.exit(code);
		}, this.deadlineMs);
		deadline.unref();

		try {
			await this.closeServer();

			for (const closer of [...this.closers].reverse()) {
				try {
					await closer();
				} catch (error) {
					this.logger.warn('Error while shutting down', error);
				}
			}
		} finally {
			clearTimeout(deadline);
			this.exit(code);
		}
	}

	private closeServer(): Promise<void> {
		const server = this.server;

		if (!server?.listening) {
			return Promise.resolve();
		}

		return new Promise((resolve) => {
			server.close(() => {
				resolve();
			});
			server.closeIdleConnections();
		});
	}
}
