import type { Server } from 'node:http';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Shutdown } from '../../src/lifecycle/shutdown.js';
import { silentLogger } from '../support/silent-logger.js';

function fakeServer(closeDelayMs = 0) {
	const calls: string[] = [];
	const server = {
		listening: true,
		close(callback: () => void) {
			calls.push('close');
			setTimeout(callback, closeDelayMs);
		},
		closeIdleConnections() {
			calls.push('closeIdleConnections');
		}
	};

	return { server: server as unknown as Server, calls };
}

describe('shutdown', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it('closes the server, then the resources in reverse order, then exits with the code', async () => {
		const exits: number[] = [];
		const order: string[] = [];
		const shutdown = new Shutdown(silentLogger(), (code) => exits.push(code));
		const { server, calls } = fakeServer();
		shutdown.attachServer(server);
		shutdown.onShutdown(() => {
			order.push('mongo');
		});
		shutdown.onShutdown(() => {
			order.push('timers');
		});

		const done = shutdown.run(0, 'SIGTERM received');
		await vi.runAllTimersAsync();
		await done;
		expect(calls).toEqual(['close', 'closeIdleConnections']);
		expect(order).toEqual(['timers', 'mongo']);
		expect(exits).toEqual([0]);
	});

	it('ignores a repeated request', async () => {
		const exits: number[] = [];
		const shutdown = new Shutdown(silentLogger(), (code) => exits.push(code));
		const first = shutdown.run(0);
		const second = shutdown.run(1);
		await vi.runAllTimersAsync();
		await Promise.all([first, second]);
		expect(exits).toEqual([0]);
		expect(shutdown.isRequested()).toBe(true);
	});

	it('exits with the same code when a resource hangs past the deadline', async () => {
		const exits: number[] = [];
		const shutdown = new Shutdown(silentLogger(), (code) => exits.push(code), 5_000);
		shutdown.onShutdown(() => new Promise(() => undefined));
		void shutdown.run(7);
		await vi.advanceTimersByTimeAsync(4_999);
		expect(exits).toEqual([]);
		await vi.advanceTimersByTimeAsync(1);
		expect(exits).toEqual([7]);
	});

	it('keeps going when a resource fails to close', async () => {
		const exits: number[] = [];
		const shutdown = new Shutdown(silentLogger(), (code) => exits.push(code));
		shutdown.onShutdown(() => {
			throw new Error('already closed');
		});
		await shutdown.run(1);
		expect(exits).toEqual([1]);
	});
});
