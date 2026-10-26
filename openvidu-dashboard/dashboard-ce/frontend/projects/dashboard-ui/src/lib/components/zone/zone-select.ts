import { Component, computed, effect, input, output, signal, untracked } from '@angular/core';
import { MatAutocomplete, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatOption } from '@angular/material/core';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';

import { isTimeZone } from '../../core/state/relative-time.js';

const MAX_ZONE_OPTIONS = 50;

/** Every IANA zone the runtime knows, UTC first. */
export function timeZones(): string[] {
	const zones = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];

	return ['UTC', ...zones.filter((zone) => zone !== 'UTC')];
}

/** A text field that filters every IANA zone as the user types and emits the zone picked from its suggestions. */
@Component({
	selector: 'ovd-zone-select',
	imports: [MatAutocomplete, MatAutocompleteTrigger, MatFormField, MatInput, MatLabel, MatOption],
	template: `
		<mat-form-field subscriptSizing="dynamic">
			<mat-label>{{ label() }}</mat-label>
			<input
				matInput
				autocomplete="off"
				[matAutocomplete]="zoneList"
				[value]="filter()"
				(input)="filter.set($any($event.target).value)"
			/>
			<mat-autocomplete #zoneList (optionSelected)="choose($event.option.value)">
				@for (option of options(); track option) {
					<mat-option [value]="option">{{ option }}</mat-option>
				}
			</mat-autocomplete>
		</mat-form-field>
	`,
	styles: `
		:host {
			display: block;
		}

		mat-form-field {
			width: 100%;
		}
	`
})
export class ZoneSelect {
	private readonly zones = timeZones();

	/** The zone shown before the user types. */
	readonly zone = input('');
	readonly label = input('Time zone');
	readonly zoneChange = output<string>();

	protected readonly filter = signal('');
	protected readonly options = computed(() => {
		const filter = this.filter().toLowerCase();

		return this.zones.filter((zone) => zone.toLowerCase().includes(filter)).slice(0, MAX_ZONE_OPTIONS);
	});

	constructor() {
		effect(() => {
			const zone = this.zone();

			untracked(() => {
				this.filter.set(zone);
			});
		});
	}

	protected choose(zone: string): void {
		if (isTimeZone(zone)) {
			this.zoneChange.emit(zone);
		}
	}
}
