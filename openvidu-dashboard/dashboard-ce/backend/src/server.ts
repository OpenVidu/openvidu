import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Edition } from '@openvidu-dashboard/typings';

import { runHealthcheck } from './lifecycle/healthcheck.js';
import { startDashboard } from './lifecycle/startup.js';

const { version } = createRequire(import.meta.url)('../package.json') as { version: string };

if (process.argv[2] === 'healthcheck') {
	process.exit(await runHealthcheck(process.env));
} else {
	await startDashboard({
		edition: Edition.CE,
		version,
		appRoot: join(dirname(fileURLToPath(import.meta.url)), 'public')
	});
}
