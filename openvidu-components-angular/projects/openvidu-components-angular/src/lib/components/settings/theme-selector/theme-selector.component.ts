import { Component } from '@angular/core';
import { OpenViduThemeService } from '../../../services/theme/theme.service';
import { OpenViduThemeMode } from '../../../models/theme.model';

@Component({
	selector: 'ov-theme-selector',
	standalone: false,
	template: `
		<div class="theme-selector-container">
			<button
				mat-flat-button
				[matMenuTriggerFor]="themeMenu"
				aria-haspopup="true"
				aria-label="Select theme"
				class="theme-selector-button"
			>
				<span class="theme-name">
					{{ currentTheme || 'Select theme' }}
					<mat-icon class="expand-icon">expand_more</mat-icon>
				</span>
			</button>

			<!-- Theme selection menu -->
			<mat-menu #themeMenu="matMenu" class="theme-menu">
				@for (theme of predefinedThemes; track theme) {
					<button
						mat-menu-item
						(click)="setTheme(theme)"
						[attr.id]="'theme-' + theme"
						[class.selected]="currentTheme === theme"
						class="theme-option"
					>
						@if (currentTheme === theme) {
							<mat-icon class="check-icon">check</mat-icon>
						}
						<span class="theme-option-name">{{ theme }}</span>
					</button>
				}
			</mat-menu>
		</div>
	`,
	styleUrl: './theme-selector.component.scss'
})
export class ThemeSelectorComponent {
	protected predefinedThemes: OpenViduThemeMode[] = Object.values(OpenViduThemeMode);
	constructor(private themeService: OpenViduThemeService) {}

	get currentTheme() {
		return this.themeService.getCurrentTheme();
	}

	setTheme(theme: OpenViduThemeMode) {
		this.themeService.setTheme(theme);
	}
}
