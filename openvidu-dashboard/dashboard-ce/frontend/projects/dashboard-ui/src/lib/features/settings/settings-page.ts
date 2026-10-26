import { afterNextRender, Component, computed, ElementRef, inject } from '@angular/core';
import { MatTab, MatTabGroup } from '@angular/material/tabs';

import { QueryStateService } from '../../core/state/query-state.js';
import { AboutTab } from './about-tab.js';
import { PreferencesTab } from './preferences-tab.js';

export const SETTINGS_TABS = ['preferences', 'about'] as const;
export type SettingsTab = (typeof SETTINGS_TABS)[number];

/** Preferences and About tabs selected by the `tab` query parameter. */
@Component({
	selector: 'ovd-settings-page',
	imports: [AboutTab, MatTab, MatTabGroup, PreferencesTab],
	template: `
		<h1 class="ovd-page-title">Settings</h1>
		<mat-tab-group [selectedIndex]="index()" (selectedIndexChange)="select($event)" [mat-stretch-tabs]="false">
			<mat-tab label="Preferences"><ovd-preferences-tab /></mat-tab>
			<mat-tab label="About"><ovd-about-tab /></mat-tab>
		</mat-tab-group>
	`
})
export class SettingsPage {
	private readonly query = inject(QueryStateService);
	private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

	protected readonly tab = computed(() => this.query.oneOf<SettingsTab>('tab', SETTINGS_TABS, 'preferences'));
	protected readonly index = computed(() => SETTINGS_TABS.indexOf(this.tab()));

	constructor() {
		if (this.query.value('tab') !== null) {
			afterNextRender(() => {
				this.host.nativeElement.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus();
			});
		}
	}

	protected select(index: number): void {
		const tab = SETTINGS_TABS[index];

		if (tab !== undefined && tab !== this.tab()) {
			void this.query.navigate({ tab });
		}
	}
}
