import { DOCUMENT, inject, InjectionToken, Service } from '@angular/core';

/** The browser storage behind `StorageService`; `null` where storage is unavailable (blocked, private mode). */
export const BROWSER_STORAGE = new InjectionToken<Storage | null>('BROWSER_STORAGE', {
	factory: () => {
		try {
			return inject(DOCUMENT).defaultView?.localStorage ?? null;
		} catch {
			return null;
		}
	}
});

/** The only access to browser storage; failures (quota, denied access) are ignored. */
@Service()
export class StorageService {
	private readonly storage = inject(BROWSER_STORAGE);

	get(key: string): string | null {
		try {
			return this.storage?.getItem(key) ?? null;
		} catch {
			return null;
		}
	}

	set(key: string, value: string): void {
		try {
			this.storage?.setItem(key, value);
		} catch {
			// Storage full or denied: preferences then last only for the session.
		}
	}

	remove(key: string): void {
		try {
			this.storage?.removeItem(key);
		} catch {
			// Same as set().
		}
	}
}
