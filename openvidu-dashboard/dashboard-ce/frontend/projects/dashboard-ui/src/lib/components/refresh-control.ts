import { Component, computed, inject, input } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatTooltip } from '@angular/material/tooltip';
import { REFRESH_INTERVALS_MS, type RefreshIntervalMs } from '@openvidu-dashboard/typings';

import { QueryStateService } from '../core/query-state.js';
import { RefreshRegistry } from '../core/refresh.js';
import { formatTimestamp } from '../format/formatters.js';

export const REFRESH_LABELS: Readonly<Record<RefreshIntervalMs, string>> = {
	0: 'Off',
	10_000: '10 s',
	30_000: '30 s',
	60_000: '1 min',
	300_000: '5 min'
};

/**
 * Manual refresh, the interval of the page's refresh scheduler and "updated hh:mm:ss". A manual scheduler shows no
 * interval; a paused one shows it disabled with the pause reason as tooltip.
 */
@Component({
	selector: 'ovd-refresh-control',
	imports: [MatButton, MatIcon, MatIconButton, MatMenu, MatMenuItem, MatMenuTrigger, MatTooltip],
	template: `
		<button
			matIconButton
			type="button"
			aria-label="Refresh now"
			matTooltip="Refresh now"
			[disabled]="scheduler() === null || inFlight()"
			(click)="refresh()"
		>
			<mat-icon svgIcon="refresh" />
		</button>
		@if (!manual()) {
			<span class="interval-host" [matTooltip]="paused() ?? ''" [matTooltipDisabled]="paused() === null">
				@if (compact()) {
					<button
						matIconButton
						type="button"
						class="interval-icon"
						[matMenuTriggerFor]="intervalMenu"
						[disabled]="scheduler() === null || paused() !== null"
						[attr.aria-label]="intervalLabel()"
						[matTooltip]="intervalLabel()"
						[matTooltipDisabled]="paused() !== null"
					>
						<mat-icon svgIcon="schedule" />
					</button>
				} @else {
					<button
						matButton
						type="button"
						class="interval"
						[matMenuTriggerFor]="intervalMenu"
						[disabled]="scheduler() === null || paused() !== null"
						[attr.aria-label]="intervalLabel()"
					>
						{{ labels[interval()] }}
						<mat-icon svgIcon="keyboard_arrow_down" iconPositionEnd />
					</button>
				}
			</span>
		}
		<mat-menu #intervalMenu="matMenu">
			@if (compact() && updated()) {
				<div class="menu-updated ovd-tabular" role="presentation">{{ updated() }}</div>
			}
			@for (option of intervals; track option) {
				<button
					mat-menu-item
					type="button"
					role="menuitemradio"
					[attr.aria-checked]="option === interval()"
					(click)="setInterval(option)"
				>
					{{ labels[option] }}
					@if (option === interval()) {
						<mat-icon class="checked" svgIcon="check" aria-hidden="true" />
					}
				</button>
			}
		</mat-menu>
		<span class="updated ovd-tabular" [class.ovd-visually-hidden]="compact() && !manual()" aria-live="polite">{{
			updated()
		}}</span>
	`,
	styles: `
		/* The header's gap between controls, so every button of the row is evenly spaced. */
		:host {
			display: inline-flex;
			align-items: center;
			gap: 8px;
		}

		.interval-host {
			display: inline-flex;
		}

		.interval {
			min-width: 0;
			padding-inline: 8px 4px;
		}

		.menu-updated {
			padding: 8px 16px;
			color: var(--mat-sys-on-surface-variant);
			font: var(--mat-sys-body-small);
		}

		/* "updated hh:mm:ss" in tabular digits, reserved before the first response so nothing moves. */
		.updated {
			color: var(--mat-sys-on-surface-variant);
			font: var(--mat-sys-body-small);
			white-space: nowrap;
		}

		/* Only while shown: the reserved width of the hidden live region would overflow narrow viewports. */
		.updated:not(.ovd-visually-hidden) {
			min-inline-size: 16ch;
		}
	`
})
export class RefreshControl {
	private readonly registry = inject(RefreshRegistry);
	private readonly query = inject(QueryStateService);

	/**
	 * Narrow headers: the manual button and an icon opening the intervals with the last update; the update time stays
	 * in the live region.
	 */
	readonly compact = input(false);

	protected readonly intervals = REFRESH_INTERVALS_MS;
	protected readonly labels = REFRESH_LABELS;
	protected readonly scheduler = this.registry.active;
	protected readonly inFlight = computed(() => this.scheduler()?.inFlight() ?? false);
	protected readonly interval = computed(() => this.scheduler()?.interval() ?? 0);
	protected readonly manual = computed(() => this.scheduler()?.manual ?? false);
	protected readonly paused = computed(() => this.scheduler()?.pausedReason() ?? null);
	protected readonly intervalLabel = computed(() => `Auto-refresh: ${this.labels[this.interval()]}`);
	protected readonly updated = computed(() => {
		const at = this.scheduler()?.lastUpdated() ?? null;

		return at === null ? '' : `updated ${formatTimestamp(at, { tz: this.query.tz(), now: at, rangeMs: 0 })}`;
	});

	protected setInterval(interval: RefreshIntervalMs): void {
		this.scheduler()?.setInterval(interval);
	}

	protected refresh(): void {
		void this.scheduler()?.refresh();
	}
}
