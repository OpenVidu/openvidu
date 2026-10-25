import { Service, signal } from '@angular/core';

export type EntityKind = 'room' | 'participant' | 'egress' | 'ingress';

/** What a list row knows about an entity, enough for a detail header before (or instead of) the detail request. */
export interface EntityPreview {
	name?: string;
	status?: string;
	/** ISO 8601 start of the entity (room created, participant joined, egress started). */
	startedAt?: string;
	/** Status domain and reconciler estimate of `status`. */
	estimated?: boolean;
	/** Parent room, for participants, egress and ingress. */
	room?: { sid: string; name: string };
	/** Type of an egress or input type of an ingress, shown as a badge. */
	kind?: string;
}

const MAX_ENTRIES = 2_000;

/** Previews of entities seen in lists, read by detail headers and breadcrumbs (also by the CE locked pages). */
@Service()
export class EntityPreviewService {
	private readonly entries = signal<ReadonlyMap<string, EntityPreview>>(new Map());

	get(kind: EntityKind, id: string): EntityPreview | undefined {
		return this.entries().get(`${kind}:${id}`);
	}

	set(kind: EntityKind, id: string, preview: EntityPreview): void {
		const next = new Map(this.entries());

		next.delete(`${kind}:${id}`);
		next.set(`${kind}:${id}`, preview);

		while (next.size > MAX_ENTRIES) {
			const oldest = next.keys().next().value;

			if (oldest === undefined) {
				break;
			}

			next.delete(oldest);
		}

		this.entries.set(next);
	}
}
