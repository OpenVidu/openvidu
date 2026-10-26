import { Component, computed, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatFormField, MatHint, MatLabel, MatPrefix, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatTooltip } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { isEntityId } from '@openvidu-dashboard/typings';

import type { EntityKind } from '../core/entity-preview.js';
import { ListStateService } from '../core/list-state.js';
import { QueryStateService } from '../core/query-state.js';

export const LIST_SEARCH_DEBOUNCE_MS = 300;
export const SHORT_SEARCH_HINT = 'Type at least 2 characters';
export const EXACT_ID_HINT = 'Exact ID: range and filters ignored · Enter opens it';

/** Path of each entity's detail page. */
export const DETAIL_PATHS: Readonly<Record<EntityKind, string>> = {
	room: '/rooms',
	participant: '/participants',
	egress: '/egress',
	ingress: '/ingress'
};

/** `q` when the API accepts it: two characters or more, or an exact ID of the list's entity. */
export function listSearchQuery(q: string, entity: EntityKind): string | null {
	return q.length >= 2 || isEntityId(entity, q) ? q : null;
}

/** The exact ID held by `q`, or `null`. */
export function exactListId(q: string | null, entity: EntityKind): string | null {
	return q !== null && isEntityId(entity, q) ? q : null;
}

/**
 * The search box of a list, bound to `q`: text of at least 2 characters or an exact ID is written after 300 ms (which
 * drops `cursor` and `page`), Enter on an exact ID opens the entity's detail, and "Clear search" removes `q`.
 */
@Component({
	selector: 'ovd-list-search',
	imports: [MatFormField, MatHint, MatIcon, MatIconButton, MatInput, MatLabel, MatPrefix, MatSuffix, MatTooltip],
	template: `
		<mat-form-field class="field" subscriptSizing="dynamic">
			<mat-icon matPrefix svgIcon="search" aria-hidden="true" />
			<mat-label>{{ label() }}</mat-label>
			<input
				matInput
				type="search"
				autocomplete="off"
				[value]="text()"
				(input)="onInput($event)"
				(keydown.enter)="open()"
			/>
			@if (text() !== '') {
				<button
					matIconButton
					matSuffix
					type="button"
					aria-label="Clear search"
					matTooltip="Clear search"
					(click)="clear()"
				>
					<mat-icon svgIcon="close" />
				</button>
			}
			@if (hint(); as hint) {
				<mat-hint>{{ hint }}</mat-hint>
			}
		</mat-form-field>
	`,
	styles: `
		:host {
			display: block;
			flex: 1 1 240px;
			max-width: 360px;
		}

		.field {
			width: 100%;
		}

		input::-webkit-search-cancel-button {
			appearance: none;
			display: none;
		}
	`
})
export class ListSearch {
	private readonly query = inject(QueryStateService);
	private readonly router = inject(Router);
	private readonly listState = inject(ListStateService);
	private timer: ReturnType<typeof setTimeout> | undefined;
	/** Last `q` written by the box, so only outside changes (Back, Clear filters) rewrite it. */
	private written = untracked(this.query.q);

	/** Label of the field, such as "Room name or SID". */
	readonly label = input.required<string>();
	/** Entity whose exact IDs the list accepts and Enter opens. */
	readonly entity = input.required<EntityKind>();

	protected readonly text = signal(untracked(this.query.q));
	private readonly exactId = computed(() => exactListId(this.text().trim(), this.entity()));
	protected readonly hint = computed(() => {
		if (this.exactId() !== null) {
			return EXACT_ID_HINT;
		}

		return this.text().trim().length === 1 ? SHORT_SEARCH_HINT : null;
	});

	constructor() {
		effect(() => {
			const q = this.query.q();

			untracked(() => {
				if (q !== this.written) {
					clearTimeout(this.timer);
					this.text.set(q);
				}

				this.written = q;
			});
		});
		inject(DestroyRef).onDestroy(() => {
			clearTimeout(this.timer);
		});
	}

	protected onInput(event: Event): void {
		const text = (event.target as HTMLInputElement).value;

		this.text.set(text);
		clearTimeout(this.timer);
		this.timer = setTimeout(() => {
			this.write(text.trim());
		}, LIST_SEARCH_DEBOUNCE_MS);
	}

	/** Opens the detail of an exact ID with the range, which its breadcrumb carries back. */
	protected open(): void {
		const id = this.exactId();

		if (id !== null) {
			clearTimeout(this.timer);
			void this.router.navigate([DETAIL_PATHS[this.entity()], id], { queryParams: this.listState.rangeParams() });
		}
	}

	protected clear(): void {
		clearTimeout(this.timer);
		this.text.set('');
		this.write('');
	}

	private write(text: string): void {
		if (text === this.query.q() || (text !== '' && listSearchQuery(text, this.entity()) === null)) {
			return;
		}

		this.written = text;
		void this.query.navigate({ q: text === '' ? null : text });
	}
}
