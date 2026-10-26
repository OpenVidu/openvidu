import { Component, computed, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatRadioButton, MatRadioGroup } from '@angular/material/radio';
import { MatOption, MatSelect } from '@angular/material/select';
import {
	BROWSER_TIME_ZONE,
	PAGE_SIZES,
	type PageSize,
	RANGE_PRESET_FROM,
	type RangePreset,
	REFRESH_INTERVALS_MS,
	type RefreshIntervalMs,
	type ThemePreference,
	type TimeZonePreference
} from '@openvidu-dashboard/typings';

import { RANGE_PRESET_LABELS } from '../../components/date-time-range-picker/date-time-range-picker.js';
import { REFRESH_LABELS } from '../../components/refresh-control/refresh-control.js';
import { ZoneSelect } from '../../components/zone/zone-select.js';
import { browserTimeZone, PreferencesService } from '../../core/preferences/preferences.js';
import { SessionZoneService } from '../../core/state/session-zone.js';
import { ToastService } from '../../core/ui/toast.js';

/** Viewer preferences, saved on every change with a "Saved" toast. */
@Component({
	selector: 'ovd-preferences-tab',
	imports: [MatButton, MatFormField, MatLabel, MatOption, MatRadioButton, MatRadioGroup, MatSelect, ZoneSelect],
	template: `
		<form class="preferences" (submit)="$event.preventDefault()">
			<fieldset>
				<legend>Theme</legend>
				<mat-radio-group [value]="preferences().theme" (change)="setTheme($event.value)" aria-label="Theme">
					<mat-radio-button value="system">System</mat-radio-button>
					<mat-radio-button value="light">Light</mat-radio-button>
					<mat-radio-button value="dark">Dark</mat-radio-button>
				</mat-radio-group>
			</fieldset>
			<fieldset>
				<legend>Default time zone</legend>
				<mat-radio-group
					[value]="zoneMode()"
					(change)="setZoneMode($event.value)"
					aria-label="Default time zone"
				>
					<mat-radio-button value="browser">Browser ({{ browserZone }})</mat-radio-button>
					<mat-radio-button value="other">Another zone</mat-radio-button>
				</mat-radio-group>
				@if (zoneMode() === 'other') {
					<ovd-zone-select class="zone" [zone]="preferences().timeZone" (zoneChange)="setTimeZone($event)" />
				}
			</fieldset>
			<mat-form-field>
				<mat-label>Default time range</mat-label>
				<mat-select [value]="preferences().defaultPreset" (selectionChange)="setPreset($event.value)">
					@for (preset of presets; track preset) {
						<mat-option [value]="preset">{{ presetLabels[preset] }}</mat-option>
					}
				</mat-select>
			</mat-form-field>
			<mat-form-field>
				<mat-label>Rows per page</mat-label>
				<mat-select [value]="preferences().pageSize" (selectionChange)="setPageSize($event.value)">
					@for (size of pageSizes; track size) {
						<mat-option [value]="size">{{ size }}</mat-option>
					}
				</mat-select>
			</mat-form-field>
			<mat-form-field>
				<mat-label>Auto-refresh of live views</mat-label>
				<mat-select [value]="liveRefresh()" (selectionChange)="setLiveRefresh($event.value)">
					@for (interval of intervals; track interval) {
						<mat-option [value]="interval">{{ refreshLabels[interval] }}</mat-option>
					}
				</mat-select>
			</mat-form-field>
			<div>
				<button matButton="outlined" type="button" (click)="reset()">Reset to defaults</button>
			</div>
		</form>
	`,
	styles: `
		.preferences {
			display: flex;
			flex-direction: column;
			gap: 16px;
			max-width: 480px;
			padding: 16px 0;
		}

		fieldset {
			margin: 0;
			padding: 0;
			border: 0;
		}

		legend {
			margin-bottom: 4px;
			font: var(--mat-sys-title-small);
		}

		mat-radio-group {
			display: flex;
			flex-wrap: wrap;
			gap: 8px;
		}

		.zone {
			margin-top: 8px;
		}
	`
})
export class PreferencesTab {
	private readonly service = inject(PreferencesService);
	private readonly session = inject(SessionZoneService);
	private readonly toast = inject(ToastService);

	protected readonly preferences = this.service.preferences;
	protected readonly zoneMode = computed(() =>
		this.preferences().timeZone === BROWSER_TIME_ZONE ? BROWSER_TIME_ZONE : 'other'
	);
	protected readonly liveRefresh = computed(() => this.preferences().refreshMs.live);
	protected readonly browserZone = browserTimeZone();
	protected readonly presets = Object.keys(RANGE_PRESET_FROM) as RangePreset[];
	protected readonly presetLabels = RANGE_PRESET_LABELS;
	protected readonly pageSizes = PAGE_SIZES;
	protected readonly intervals = REFRESH_INTERVALS_MS;
	protected readonly refreshLabels = REFRESH_LABELS;

	protected setTheme(theme: ThemePreference): void {
		this.save({ theme });
	}

	/** "Another zone" starts from UTC; the zone select then picks any other. */
	protected setZoneMode(mode: string): void {
		this.setTimeZone(mode === BROWSER_TIME_ZONE ? BROWSER_TIME_ZONE : 'UTC');
	}

	/** A new default zone also becomes the zone of the session, so the next timed page opens in it. */
	protected setTimeZone(timeZone: TimeZonePreference): void {
		this.save({ timeZone });
		this.session.set(this.service.timeZone());
	}

	protected setPreset(defaultPreset: RangePreset): void {
		this.save({ defaultPreset });
	}

	protected setPageSize(pageSize: PageSize): void {
		this.save({ pageSize });
	}

	protected setLiveRefresh(interval: RefreshIntervalMs): void {
		this.service.setRefreshInterval('live', interval);
		this.toast.show('Saved');
	}

	protected reset(): void {
		this.service.reset();
		this.session.set(this.service.timeZone());
		this.toast.show('Preferences reset to defaults');
	}

	private save(patch: Parameters<PreferencesService['update']>[0]): void {
		this.service.update(patch);
		this.toast.show('Saved');
	}
}
