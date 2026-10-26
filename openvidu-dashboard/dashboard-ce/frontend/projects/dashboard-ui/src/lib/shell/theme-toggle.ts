import { Component, computed, inject } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import type { ThemePreference } from '@openvidu-dashboard/typings';

import { ThemeService } from '../core/preferences/theme.js';

export const THEME_ICONS: Readonly<Record<ThemePreference, string>> = {
	system: 'brightness_auto',
	light: 'light_mode',
	dark: 'dark_mode'
};

/** Cycles the theme preference system → light → dark. */
@Component({
	selector: 'ovd-theme-toggle',
	imports: [MatIcon, MatIconButton, MatTooltip],
	template: `
		<button matIconButton type="button" [attr.aria-label]="label()" [matTooltip]="label()" (click)="theme.cycle()">
			<mat-icon [svgIcon]="icon()" />
		</button>
	`
})
export class ThemeToggle {
	protected readonly theme = inject(ThemeService);
	protected readonly icon = computed(() => THEME_ICONS[this.theme.preference()]);
	protected readonly label = computed(() => `Theme: ${this.theme.preference()}`);
}
