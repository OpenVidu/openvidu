import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE_HREF = /<base\s+href=["']([^"']+)["']/i;

export interface BasePathResolution {
	basePath: string;
	source: 'variable' | 'index.html' | 'default';
}

/**
 * Public base path of the dashboard (the browser-visible prefix, `/dashboard/` behind the deployment proxy):
 * `DASHBOARD_BASE_PATH`, else the `<base href>` of the built SPA, else `/`.
 */
export function resolveBasePath(configured: string | undefined, appRoot: string): BasePathResolution {
	if (configured !== undefined) {
		return { basePath: configured, source: 'variable' };
	}

	try {
		const href = BASE_HREF.exec(readFileSync(join(appRoot, 'index.html'), 'utf8'))?.[1];

		if (href?.startsWith('/')) {
			return { basePath: href.endsWith('/') ? href : `${href}/`, source: 'index.html' };
		}
	} catch {
		// No built SPA: the default applies.
	}

	return { basePath: '/', source: 'default' };
}
