import { Service, signal } from '@angular/core';

/** Collapsed sections per route for the session, so a live refresh or a revisit keeps them as the user left them. */
@Service()
export class SectionStateService {
	private readonly collapsed = signal<ReadonlySet<string>>(new Set());

	isCollapsed(key: string): boolean {
		return this.collapsed().has(key);
	}

	setCollapsed(key: string, collapsed: boolean): void {
		const next = new Set(this.collapsed());

		if (collapsed) {
			next.add(key);
		} else {
			next.delete(key);
		}

		this.collapsed.set(next);
	}
}
