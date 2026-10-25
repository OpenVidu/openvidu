/** A controllable `window.matchMedia` for jsdom, which does not implement it. */
class FakeMediaQueryList extends EventTarget implements MediaQueryList {
	onchange: ((this: MediaQueryList, event: MediaQueryListEvent) => unknown) | null = null;

	constructor(readonly media: string) {
		super();
	}

	get matches(): boolean {
		return features.get(this.media) ?? false;
	}

	addListener(listener: (event: MediaQueryListEvent) => void): void {
		this.addEventListener('change', listener as EventListener);
	}

	removeListener(listener: (event: MediaQueryListEvent) => void): void {
		this.removeEventListener('change', listener as EventListener);
	}

	notify(): void {
		const event = Object.assign(new Event('change'), { matches: this.matches, media: this.media });

		this.dispatchEvent(event);
	}
}

interface MediaState {
	features: Map<string, boolean>;
	lists: Set<FakeMediaQueryList>;
}

// Shared through globalThis: the setup file and each spec bundle get their own copy of this module.
const state = ((globalThis as { __ovdMediaState?: MediaState }).__ovdMediaState ??= {
	features: new Map(),
	lists: new Set()
});
const { features, lists } = state;

export function installMatchMedia(): void {
	window.matchMedia = (query: string): MediaQueryList => {
		const list = new FakeMediaQueryList(query);

		lists.add(list);

		return list;
	};
}

/** Sets whether a media query matches and notifies its listeners. */
export function setMediaQuery(query: string, matches: boolean): void {
	features.set(query, matches);

	for (const list of lists) {
		if (list.media === query) {
			list.notify();
		}
	}
}

export function resetMediaQueries(): void {
	features.clear();
	lists.clear();
}
