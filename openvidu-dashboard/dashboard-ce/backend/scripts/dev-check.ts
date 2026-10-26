/** Run by `./dashboard.sh dev` before it starts the development servers. */
import { checkDevConfig } from './dev.js';

if (!(await checkDevConfig())) {
	process.exitCode = 1;
}
