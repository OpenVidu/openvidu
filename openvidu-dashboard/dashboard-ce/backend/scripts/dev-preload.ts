/** Preloaded by the backend development scripts: the environment, then `.env` (git-ignored), then `dev.env`. */
import { DEV_ENV_FILE, loadDevEnv } from './dev.js';

loadDevEnv(['.env', DEV_ENV_FILE]);
