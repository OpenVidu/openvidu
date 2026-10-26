import { Service, type Signal, signal } from '@angular/core';

/**
 * Live counters other pages show next to their lists (the Agents page tile). The overview change feeds them from its
 * polling of `GET /api/v1/overview`; until a source sets them they are `null` and tiles show "—".
 */
@Service()
export class LiveCountersService {
	private readonly agents = signal<number | null>(null);

	/** Active agent sessions across all rooms. */
	readonly activeAgents: Signal<number | null> = this.agents.asReadonly();

	setActiveAgents(count: number | null): void {
		this.agents.set(count);
	}
}
