import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

export type ConfigFileResult =
	| { kind: 'none' }
	| { kind: 'loaded'; path: string; applied: string[] }
	| { kind: 'missing'; path: string }
	| { kind: 'unreadable'; path: string; reason: string };

/**
 * Loads `DASHBOARD_CONFIG_PATH` (`KEY=value` lines) into `env`; variables already set in `env` keep their value.
 * A missing file is reported to be logged as a warning.
 */
export function loadConfigFile(env: NodeJS.ProcessEnv): ConfigFileResult {
	const path = env.DASHBOARD_CONFIG_PATH?.trim();

	if (!path) {
		return { kind: 'none' };
	}

	if (!existsSync(path)) {
		return { kind: 'missing', path };
	}

	let values: Record<string, string>;

	try {
		// Same parser as process.loadEnvFile, which writes to process.env only.
		values = parseEnv(readFileSync(path, 'utf8')) as Record<string, string>;
	} catch (error) {
		return { kind: 'unreadable', path, reason: error instanceof Error ? error.message : String(error) };
	}

	const applied: string[] = [];

	for (const [key, value] of Object.entries(values)) {
		if (env[key] === undefined) {
			env[key] = value;
			applied.push(key);
		}
	}

	return { kind: 'loaded', path, applied };
}
