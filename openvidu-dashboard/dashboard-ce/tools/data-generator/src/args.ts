import { parseArgs, type ParseArgsOptionsConfig } from 'node:util';

export type ParsedValues = Record<string, string | boolean | undefined>;

/** Parses process.argv with node:util.parseArgs in strict mode. */
export function parseCli(options: ParseArgsOptionsConfig): ParsedValues {
	const { values } = parseArgs({ args: process.argv.slice(2), options, strict: true, allowPositionals: false });

	return values as ParsedValues;
}

export function requireString(values: ParsedValues, name: string): string {
	const value = values[name];

	if (typeof value !== 'string' || value.length === 0) {
		throw new Error(`Missing required option --${name}`);
	}

	return value;
}

export function stringOption(values: ParsedValues, name: string, fallback: string): string {
	const value = values[name];

	return typeof value === 'string' && value.length > 0 ? value : fallback;
}

export function intOption(values: ParsedValues, name: string, fallback: number): number {
	const value = values[name];

	if (value === undefined) {
		return fallback;
	}

	const parsed = Number(value);

	if (typeof value !== 'string' || !Number.isInteger(parsed) || parsed < 0) {
		throw new Error(`Option --${name} must be a non-negative integer`);
	}

	return parsed;
}

export function flag(values: ParsedValues, name: string): boolean {
	return values[name] === true;
}
