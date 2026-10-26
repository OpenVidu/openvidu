import { Service, signal } from '@angular/core';

/**
 * The time zone of the session: the last valid `tz` a timed page received, or the default zone saved in Settings;
 * `null` until either happens. Each tab keeps its own, in memory.
 */
@Service()
export class SessionZoneService {
	private readonly state = signal<string | null>(null);

	readonly zone = this.state.asReadonly();

	set(zone: string): void {
		this.state.set(zone);
	}
}
