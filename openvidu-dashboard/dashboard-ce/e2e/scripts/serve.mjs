#!/usr/bin/env node
// Serves the built CE application (or the one in E2E_APP_ROOT, e.g. the PRO build) for the end-to-end tests: static
// files with the SPA fallback. API requests are mocked by the tests, so any that reaches this server fails with 502.
// Under /dashboard/ it also behaves as a path-stripping reverse proxy in front of an application built with
// `<base href="/dashboard/">`, which is all such a build changes.
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.env.E2E_APP_ROOT
	? resolve(process.env.E2E_APP_ROOT)
	: join(dirname(fileURLToPath(import.meta.url)), '../../frontend/dist/frontend/browser');
const port = Number(process.env.E2E_PORT ?? 4310);
const PREFIX = '/dashboard';
const TYPES = {
	'.css': 'text/css',
	'.html': 'text/html; charset=utf-8',
	'.ico': 'image/x-icon',
	'.js': 'text/javascript',
	'.json': 'application/json',
	'.png': 'image/png',
	'.svg': 'image/svg+xml',
	'.txt': 'text/plain',
	'.woff2': 'font/woff2'
};

async function isFile(path) {
	try {
		return (await stat(path)).isFile();
	} catch {
		return false;
	}
}

createServer(async (req, res) => {
	const { pathname: requested } = new URL(req.url ?? '/', 'http://localhost');
	const prefixed = requested === PREFIX || requested.startsWith(`${PREFIX}/`);
	const pathname = prefixed ? requested.slice(PREFIX.length) || '/' : requested;

	if (pathname.startsWith('/api/')) {
		res.writeHead(502, { 'content-type': 'text/plain' }).end(`Unmocked API request: ${pathname}`);

		return;
	}

	const candidate = normalize(join(root, decodeURIComponent(pathname)));
	const file = candidate.startsWith(root + sep) && (await isFile(candidate)) ? candidate : join(root, 'index.html');

	res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });

	if (prefixed && file === join(root, 'index.html')) {
		res.end((await readFile(file, 'utf8')).replace('<base href="/">', `<base href="${PREFIX}/">`));

		return;
	}

	createReadStream(file).pipe(res);
}).listen(port, '127.0.0.1', () => {
	console.log(`Serving ${root} on http://127.0.0.1:${port}`);
});
