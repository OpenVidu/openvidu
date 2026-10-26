import { Component, computed, inject, viewChild } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatDivider } from '@angular/material/list';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';

import { browserTimeZone } from '../../core/preferences/preferences.js';
import { QueryStateService } from '../../core/state/query-state.js';
import { ZoneSelect } from './zone-select.js';

/**
 * The session zone of a timed page without the range picker (details, Overview), with a menu to switch it to UTC, the
 * browser zone or any IANA zone. A switch writes `tz` to the URL and keeps the page's cursor: it changes how times
 * read, not which rows show.
 */
@Component({
	selector: 'ovd-zone-chip',
	imports: [MatButton, MatDivider, MatIcon, MatMenu, MatMenuItem, MatMenuTrigger, ZoneSelect],
	template: `
		<button
			matButton
			type="button"
			class="chip"
			[matMenuTriggerFor]="menu"
			[attr.aria-label]="'Time zone: ' + zone()"
		>
			<mat-icon svgIcon="language" />
			<span class="zone">{{ zone() }}</span>
		</button>
		<mat-menu #menu="matMenu" class="ovd-zone-menu">
			@for (option of options(); track option.zone) {
				<button
					mat-menu-item
					type="button"
					role="menuitemradio"
					[attr.aria-checked]="option.zone === zone()"
					(click)="choose(option.zone)"
				>
					{{ option.label }}
					@if (option.zone === zone()) {
						<mat-icon class="checked" svgIcon="check" aria-hidden="true" />
					}
				</button>
			}
			<mat-divider />
			<!-- Keys and clicks stay in the field: the menu would read them as item navigation and close. -->
			<div class="search" tabindex="-1" (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()">
				<ovd-zone-select label="Other zone" [zone]="other()" (zoneChange)="choose($event)" />
			</div>
		</mat-menu>
	`,
	styles: `
		:host {
			display: inline-flex;
			align-items: center;
		}

		.chip {
			min-width: 0;
			padding-inline: 8px 12px;
		}

		.zone {
			max-width: 160px;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.checked {
			margin-inline-start: auto;
		}

		.search {
			padding: 8px 16px 4px;
			min-width: 240px;
		}
	`
})
export class ZoneChip {
	private readonly query = inject(QueryStateService);
	private readonly trigger = viewChild.required(MatMenuTrigger);
	private readonly browser = browserTimeZone();

	protected readonly zone = this.query.tz;
	protected readonly options = computed(() => [
		{ zone: 'UTC', label: 'UTC' },
		...(this.browser === 'UTC' ? [] : [{ zone: this.browser, label: `Browser (${this.browser})` }])
	]);
	/** The search starts from the active zone when it is not one of the menu items. */
	protected readonly other = computed(() =>
		this.options().some((option) => option.zone === this.zone()) ? '' : this.zone()
	);

	protected choose(zone: string): void {
		this.trigger().closeMenu();

		if (zone !== this.zone()) {
			void this.query.navigate({ tz: zone }, { keepCursor: true });
		}
	}
}
