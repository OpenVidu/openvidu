import { Component, computed, inject, signal } from '@angular/core';
import { MatSidenav, MatSidenavContainer, MatSidenavContent } from '@angular/material/sidenav';
import { RouterOutlet } from '@angular/router';

import { BreakpointService } from '../core/breakpoints.js';
import { FocusService, MAIN_CONTENT_ID } from '../core/focus.js';
import { ListStateService } from '../core/list-state.js';
import { PreferencesService } from '../core/preferences.js';
import { injectServerStatusPoll } from '../core/server-status.js';
import { Breadcrumbs } from '../components/breadcrumbs.js';
import { BannerSlot } from './banner-slot.js';
import { Header } from './header.js';
import { sidenavLayout } from './layout.js';
import { NavigationList } from './navigation-list.js';

/**
 * The authenticated frame: skip link, header, banners, sidenav, breadcrumbs, the page and the footer. Shells project
 * extra banners with `[ovdBanner]`.
 */
@Component({
	selector: 'ovd-dashboard-shell',
	imports: [
		BannerSlot,
		Breadcrumbs,
		Header,
		MatSidenav,
		MatSidenavContainer,
		MatSidenavContent,
		NavigationList,
		RouterOutlet
	],
	templateUrl: './dashboard-shell.html',
	styleUrl: './dashboard-shell.scss'
})
export class DashboardShell {
	private readonly breakpoints = inject(BreakpointService);
	private readonly preferences = inject(PreferencesService);
	private readonly focus = inject(FocusService);

	protected readonly mainId = MAIN_CONTENT_ID;
	protected readonly size = this.breakpoints.size;
	protected readonly desktop = this.breakpoints.desktop;
	protected readonly expanded = signal(false);
	protected readonly layout = computed(() =>
		sidenavLayout(this.size(), this.preferences.railPinned(), this.expanded())
	);

	constructor() {
		inject(ListStateService);
		injectServerStatusPoll();
		this.focus.start();
	}

	protected toggleNavigation(): void {
		if (this.breakpoints.desktop()) {
			this.preferences.update({ railPinned: !this.preferences.railPinned() });
		} else {
			this.expanded.set(!this.expanded());
		}
	}

	protected collapse(): void {
		if (!this.breakpoints.desktop()) {
			this.expanded.set(false);
		}
	}

	protected skip(event: Event): void {
		event.preventDefault();
		this.focus.skipToContent();
	}
}
