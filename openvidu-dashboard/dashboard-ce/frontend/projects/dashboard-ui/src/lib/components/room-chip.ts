import { Component, computed, inject, input } from '@angular/core';
import { MatChip, MatChipRemove } from '@angular/material/chips';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { EntityPreviewService } from '../core/entity-preview.js';
import { QueryStateService } from '../core/query-state.js';

/** The `room` filter of a list: "Room: <name>" (the SID until the name is known), linked to the room, removable. */
@Component({
	selector: 'ovd-room-chip',
	imports: [MatChip, MatChipRemove, MatIcon, RouterLink],
	template: `
		<mat-chip class="chip" (removed)="remove()">
			Room: <a [routerLink]="['/rooms', sid()]">{{ label() }}</a>
			<button matChipRemove type="button" [attr.aria-label]="'Remove room filter ' + label()">
				<mat-icon svgIcon="close" />
			</button>
		</mat-chip>
	`,
	styles: `
		:host {
			display: inline-flex;
			align-items: center;
		}

		a {
			margin-inline-start: 4px;
			color: inherit;
		}
	`
})
export class RoomChip {
	private readonly previews = inject(EntityPreviewService);
	private readonly query = inject(QueryStateService);

	readonly sid = input.required<string>();
	/** Name of the room when the page knows it; otherwise the list preview's, else the SID. */
	readonly name = input<string>();

	protected readonly label = computed(() => this.name() ?? this.previews.get('room', this.sid())?.name ?? this.sid());

	protected remove(): void {
		void this.query.navigate({ room: null });
	}
}
