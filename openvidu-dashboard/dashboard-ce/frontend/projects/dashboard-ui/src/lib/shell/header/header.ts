import { NgOptimizedImage } from '@angular/common';
import { Component, computed, inject, output, signal } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatDivider } from '@angular/material/list';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatTooltip } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';

import { DateTimeRangePicker } from '../../components/date-time-range-picker/date-time-range-picker.js';
import { RefreshControl } from '../../components/refresh-control/refresh-control.js';
import { GlobalSearch } from '../../components/search/global-search.js';
import { ZoneChip } from '../../components/zone/zone-chip.js';
import { AuthService } from '../../core/auth/auth.js';
import { FeatureService, InfoService } from '../../core/info.js';
import { ThemeService } from '../../core/preferences/theme.js';
import { PRODUCT_NAME } from '../../core/providers.js';
import { RefreshRegistry } from '../../core/refresh/refresh.js';
import { RouteStateService } from '../../core/state/route-state.js';
import { BreakpointService } from '../../core/ui/breakpoints.js';
import { THEME_ICONS, ThemeToggle } from '../theme-toggle.js';

/**
 * Burger, logo, global search, range picker (range-scoped routes) or zone chip (other unlocked timed routes), refresh
 * control (live-capable routes whose page registered a scheduler), theme toggle and user menu. Below 600 px it becomes a
 * brand row with an overflow menu plus a row with the picker or the chip and the refresh control.
 */
@Component({
	selector: 'ovd-header',
	imports: [
		DateTimeRangePicker,
		GlobalSearch,
		MatButton,
		MatDivider,
		MatIcon,
		MatIconButton,
		MatMenu,
		MatMenuItem,
		MatMenuTrigger,
		MatTooltip,
		NgOptimizedImage,
		RefreshControl,
		RouterLink,
		ThemeToggle,
		ZoneChip
	],
	templateUrl: './header.html',
	styleUrl: './header.scss'
})
export class Header {
	private readonly breakpoints = inject(BreakpointService);
	private readonly auth = inject(AuthService);
	protected readonly theme = inject(ThemeService);

	/** The burger was pressed. */
	readonly menu = output();

	protected readonly product = PRODUCT_NAME;
	protected readonly size = this.breakpoints.size;
	protected readonly handset = this.breakpoints.handset;
	protected readonly desktop = this.breakpoints.desktop;
	protected readonly meta = inject(RouteStateService).pageMeta;
	private readonly registry = inject(RefreshRegistry);
	private readonly features = inject(FeatureService);
	private readonly info = inject(InfoService);
	protected readonly refreshable = computed(
		() => (this.meta()?.liveCapable ?? false) && this.registry.active() !== null
	);
	/** A timed page without the range picker whose feature, if any, is enabled. */
	protected readonly zoneChip = computed(() => {
		const meta = this.meta();

		return (
			meta?.timed === true &&
			!meta.rangeScoped &&
			(meta.feature === undefined || this.features.enabled(meta.feature))
		);
	});
	/** Retention of the page's data for the range picker; `null` without a limit or before `GET /info` answers. */
	protected readonly pickerRetentionMs = computed(() => {
		const key = this.meta()?.retention;

		return key === undefined ? null : (this.info.info()?.retention?.[key] ?? null);
	});
	protected readonly username = computed(() => this.auth.username() ?? 'Administrator');
	/** Below 960 px: short brand, icon-only user menu and the search behind an icon. */
	protected readonly compact = computed(() => ['xsmall', 'small'].includes(this.size()));
	protected readonly searchInline = computed(() => !this.compact());
	protected readonly pickerDisplay = computed(() => {
		switch (this.size()) {
			case 'xlarge':
			case 'large':
				return 'full';
			case 'medium':
				return 'compact';
			default:
				return 'minimal';
		}
	});
	protected readonly searchOpen = signal(false);
	protected readonly themeIcon = computed(() => THEME_ICONS[this.theme.preference()]);

	protected signOut(): void {
		void this.auth.logout();
	}
}
