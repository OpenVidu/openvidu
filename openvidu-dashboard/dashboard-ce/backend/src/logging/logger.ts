import { createLogger as createWinstonLogger, format, type Logger, transports } from 'winston';

import type { LogLevel } from '../config/variables.js';

export type { Logger };

/** Console logger: `<timestamp> <level>: <message>` followed by metadata as JSON and the stack of errors. */
export function createLogger(level: LogLevel = 'info'): Logger {
	const formats = [
		format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
		format.splat(),
		format.errors({ stack: true }),
		format.printf((info) => {
			const { level: name, message, timestamp, stack, ...meta } = info;
			const metadata = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
			const trace = typeof stack === 'string' ? `\n${stack}` : '';

			return `${String(timestamp)} ${name}: ${String(message)}${metadata}${trace}`;
		})
	];

	if (process.stdout.isTTY) {
		formats.unshift(format.colorize());
	}

	return createWinstonLogger({ level, format: format.combine(...formats), transports: [new transports.Console()] });
}
