import { afterEach } from 'vitest';

import { installMatchMedia, resetMediaQueries } from './media.js';

installMatchMedia();

// jsdom has no ResizeObserver; ngx-echarts only needs the methods to exist.
globalThis.ResizeObserver = class {
	observe = (): void => undefined;
	unobserve = (): void => undefined;
	disconnect = (): void => undefined;
};

afterEach(() => {
	localStorage.clear();
	sessionStorage.clear();
	resetMediaQueries();
	document.documentElement.removeAttribute('data-theme');
});
