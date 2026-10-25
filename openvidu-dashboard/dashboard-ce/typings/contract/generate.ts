import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';
import { buildArtifacts } from './artifacts.js';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));

for (const [relativePath, content] of buildArtifacts()) {
	const path = join(packageRoot, relativePath);
	const text = typeof content === 'string' ? content : await formatJson(path, content);
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, text);
	console.log(`wrote ${relativePath}`);
}

async function formatJson(path: string, value: unknown): Promise<string> {
	const options = await resolveConfig(path);

	return format(JSON.stringify(value), { ...options, filepath: path });
}
