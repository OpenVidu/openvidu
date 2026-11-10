import { NgOptimizedImage } from '@angular/common';
import {
	afterNextRender,
	Component,
	computed,
	DestroyRef,
	effect,
	type ElementRef,
	inject,
	output,
	signal,
	untracked,
	viewChild
} from '@angular/core';
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
 * brand row with an overflow menu plus a row with the picker or the chip and the refresh control. On wide screens the
 * picker shows its absolute range only while the row has room for it beside the other controls, whose widths vary.
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
	private readonly brandRow = viewChild.required<ElementRef<HTMLElement>>('brandRow');
	/** The full range picker fits in the brand row, measured as the username and the update time change its controls. */
	private readonly fullPickerFits = signal(true);
	protected readonly pickerDisplay = computed(() => {
		switch (this.size()) {
			case 'xlarge':
			case 'large':
				return this.fullPickerFits() ? 'full' : 'compact';
			case 'medium':
				return 'compact';
			default:
				return 'minimal';
		}
	});
	protected readonly searchOpen = signal(false);
	protected readonly themeIcon = computed(() => THEME_ICONS[this.theme.preference()]);

	constructor() {
		const destroyRef = inject(DestroyRef);

		// Another page brings other controls: the full picker gets a new try.
		effect(() => {
			this.meta();
			this.registry.active();
			untracked(() => {
				this.fullPickerFits.set(true);
			});
		});

		afterNextRender(() => {
			const row = this.brandRow().nativeElement;
			// Width the row needed for the full picker when it last overflowed, always above the width it failed at, so a
			// row that keeps its width never flips between the full and the compact picker.
			let needed = Number.POSITIVE_INFINITY;
			let frame = 0;
			// Measured in an animation frame, after the controls took their size.
			const fit = () => {
				cancelAnimationFrame(frame);
				frame = requestAnimationFrame(() => {
					if (this.pickerDisplay() === 'full') {
						if (row.scrollWidth > row.clientWidth) {
							needed = Math.max(row.scrollWidth, row.clientWidth + 1);
							this.fullPickerFits.set(false);
						}
					} else if (row.clientWidth >= needed) {
						this.fullPickerFits.set(true);
					}
				});
			};

			if (typeof ResizeObserver === 'undefined') {
				return;
			}

			const resize = new ResizeObserver(fit);
			const observeControls = () => {
				resize.disconnect();
				resize.observe(row);

				for (const control of row.children) {
					resize.observe(control);
				}
			};
			const mutations = new MutationObserver(() => {
				observeControls();
				fit();
			});

			observeControls();
			mutations.observe(row, { childList: true });
			destroyRef.onDestroy(() => {
				cancelAnimationFrame(frame);
				resize.disconnect();
				mutations.disconnect();
			});
		});
	}

	protected signOut(): void {
		void this.auth.logout();
	}
}
