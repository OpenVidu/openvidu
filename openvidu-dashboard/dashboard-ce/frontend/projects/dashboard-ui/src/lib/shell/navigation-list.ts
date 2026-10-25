import { Component, computed, inject, input, output } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { type IsActiveMatchOptions, Router, RouterLink, RouterLinkActive } from '@angular/router';
import type { NavigationMeta } from '@openvidu-dashboard/typings';

import { FeatureService } from '../core/info.js';
import { ListStateService } from '../core/list-state.js';
import { navigationEntries } from '../routing/compose-routes.js';
import { SidenavFooter } from './sidenav-footer.js';

/** Entries ordered at or after this position sit at the bottom of the sidenav. */
export const BOTTOM_ENTRIES_FROM = 90;

/**
 * The sidenav entries of the composed routes: range carried to range-scoped pages, the current entry marked with
 * `aria-current="page"` and a filled icon, locked PRO entries with a lock and a tooltip.
 */
/** The section stays marked on its detail pages, whose URLs carry no range parameters. */
const ACTIVE_OPTIONS: IsActiveMatchOptions = {
	paths: 'subset',
	queryParams: 'ignored',
	matrixParams: 'ignored',
	fragment: 'ignored'
};

@Component({
	selector: 'ovd-navigation-list',
	imports: [MatIcon, MatTooltip, RouterLink, RouterLinkActive, SidenavFooter],
	template: `
		<nav aria-label="Main">
			@for (group of groups(); track $index) {
				<ul [class.bottom]="$index === 1">
					@for (entry of group; track entry.path) {
						<li>
							<a
								[routerLink]="entry.path"
								[queryParams]="entry.rangeScoped ? range() : null"
								routerLinkActive="active"
								[routerLinkActiveOptions]="activeOptions"
								ariaCurrentWhenActive="page"
								#active="routerLinkActive"
								[matTooltip]="tooltip(entry)"
								[matTooltipDisabled]="tooltip(entry) === ''"
								matTooltipPosition="right"
								[attr.aria-label]="
									rail() ? entry.label + (locked(entry) ? ', OpenVidu PRO' : '') : null
								"
								(click)="navigated.emit()"
							>
								<mat-icon
									[svgIcon]="active.isActive ? entry.icon + '-fill' : entry.icon"
									aria-hidden="true"
								/>
								@if (!rail()) {
									<span class="label">{{ entry.label }}</span>
									@if (locked(entry)) {
										<mat-icon class="lock" svgIcon="lock" aria-label="OpenVidu PRO" />
									}
								}
							</a>
						</li>
					}
				</ul>
			}
			<ovd-sidenav-footer class="footer" [rail]="rail()" />
		</nav>
	`,
	styles: `
		:host {
			display: flex;
			flex-direction: column;
			height: 100%;
		}

		nav {
			display: flex;
			flex: 1;
			flex-direction: column;
			padding: 8px;
		}

		ul {
			margin: 0;
			padding: 0;
			list-style: none;
		}

		.bottom {
			margin-top: auto;
		}

		a {
			display: flex;
			align-items: center;
			gap: 12px;
			min-height: 44px;
			padding: 0 12px;
			border-radius: 22px;
			color: var(--mat-sys-on-surface-variant);
			font: var(--mat-sys-label-large);
			text-decoration: none;
		}

		a:hover {
			background: var(--mat-sys-surface-container-high);
		}

		a.active {
			background: var(--mat-sys-primary-container);
			color: var(--mat-sys-on-primary-container);
			font-weight: 600;
		}

		.label {
			flex: 1;
		}

		.lock {
			width: 18px;
			height: 18px;
		}

		.footer {
			padding: 16px 12px 8px;
		}
	`
})
export class NavigationList {
	protected readonly activeOptions = ACTIVE_OPTIONS;
	private readonly features = inject(FeatureService);
	private readonly entries = navigationEntries(inject(Router).config);

	/** Icons only, with tooltips. */
	readonly rail = input(false);
	readonly navigated = output();

	protected readonly range = inject(ListStateService).rangeParams;
	protected readonly groups = computed(() => [
		this.entries.filter((entry) => entry.order < BOTTOM_ENTRIES_FROM),
		this.entries.filter((entry) => entry.order >= BOTTOM_ENTRIES_FROM)
	]);

	protected locked(entry: NavigationMeta): boolean {
		return entry.feature !== undefined && !this.features.enabled(entry.feature);
	}

	protected tooltip(entry: NavigationMeta): string {
		if (this.locked(entry)) {
			return this.rail() ? `${entry.label} · OpenVidu PRO` : 'Available in OpenVidu PRO';
		}

		return this.rail() ? entry.label : '';
	}
}
