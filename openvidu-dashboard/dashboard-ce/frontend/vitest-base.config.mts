import { defineConfig } from 'vitest/config';

// Workspace packages resolve to their TypeScript sources, as in the other packages, so tests need no build.
export default defineConfig({
	resolve: {
		conditions: ['source']
	},
	test: {
		// The Angular builder compiles the specs in memory, but this cache, on by default since Vitest 5, keys each module
		// by the file on disk, so a later run could reuse a module compiled from an older source.
		fsModuleCache: false
	}
});
