import { Writable } from 'node:stream';

import { createLogger, format, type Logger, transports } from 'winston';

/** Logger that records `<level>: <message>` lines instead of printing them. */
export function silentLogger(): Logger & { lines: string[] } {
	const lines: string[] = [];
	const stream = new Writable({
		write(chunk: Buffer, _encoding, callback) {
			lines.push(chunk.toString().trimEnd());
			callback();
		}
	});
	const logger = createLogger({
		format: format.printf(({ level, message }) => `${level}: ${String(message)}`),
		transports: [new transports.Stream({ stream })]
	});

	return Object.assign(logger, { lines });
}
