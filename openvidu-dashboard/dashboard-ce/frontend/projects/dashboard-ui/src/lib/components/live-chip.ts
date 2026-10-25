import { booleanAttribute, Component, computed, inject, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';

import { RefreshRegistry } from '../core/refresh.js';
import { ServerStatusService } from '../core/server-status.js';
import { formatTimestamp } from '../format/formatters.js';

/**
 * "LIVE" with a pulsing dot; "paused" while the page's auto-refresh is off; "stale" with a clock when the page reports
 * old data or the last server status found the writer silent, which wins over "paused". Changes are announced.
 */
@Component({
	selector: 'ovd-live-chip',
	imports: [MatIcon, MatTooltip],
	template: `
		<span
			class="chip"
			[class.stale]="state() === 'stale'"
			[class.paused]="state() === 'paused'"
			[matTooltip]="tooltip()"
			[matTooltipDisabled]="tooltip() === ''"
			[attr.tabindex]="tooltip() === '' ? null : 0"
			aria-live="polite"
		>
			@switch (state()) {
				@case ('stale') {
					<mat-icon svgIcon="schedule" aria-hidden="true" />
					stale
				}
				@case ('paused') {
					<mat-icon svgIcon="pause" aria-hidden="true" />
					paused
				}
				@default {
					<span class="dot" aria-hidden="true"></span>
					LIVE
				}
			}
		</span>
	`,
	styles: `
		/* One width for "LIVE", "paused" and "stale", so a change of state never moves what follows. */
		.chip {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			min-inline-size: 84px;
			box-sizing: border-box;
			gap: 6px;
			padding: 2px 10px;
			border-radius: 8px;
			background: var(--mat-sys-tertiary-container);
			color: var(--mat-sys-on-tertiary-container);
			font: var(--mat-sys-label-medium);
			font-weight: 600;
		}

		.paused {
			background: var(--mat-sys-surface-container-high);
			color: var(--mat-sys-on-surface-variant);

			mat-icon {
				width: 16px;
				height: 16px;
			}
		}

		.stale {
			background: var(--ovd-status-warning-bg);
			color: var(--ovd-status-warning-fg);
			border: 1px dotted currentColor;

			mat-icon {
				width: 16px;
				height: 16px;
			}
		}

		.dot {
			width: 8px;
			height: 8px;
			border-radius: 50%;
			background: currentColor;
			animation: pulse 1.6s ease-in-out infinite;
		}

		@keyframes pulse {
			50% {
				opacity: 0.3;
			}
		}

		@media (prefers-reduced-motion: reduce) {
			.dot {
				animation: none;
			}
		}
	`
})
export class LiveChip {
	private readonly status = inject(ServerStatusService);
	private readonly scheduler = inject(RefreshRegistry).active;

	/** The page's own data is stale, e.g. an active room without recent stats. */
	readonly stale = input(false, { transform: booleanAttribute });
	/** Time of the last statistics, shown in the stale tooltip. */
	readonly lastDataAt = input<string | Date | null>(null);
	readonly tz = input('UTC');

	protected readonly state = computed<'live' | 'paused' | 'stale'>(() => {
		if (this.stale() || !this.status.writerFresh()) {
			return 'stale';
		}

		return this.scheduler()?.interval() === 0 ? 'paused' : 'live';
	});
	protected readonly tooltip = computed(() => {
		switch (this.state()) {
			case 'stale':
				return this.status.writerFresh() ? this.statsHint() : this.writerHint();
			case 'paused':
				return this.pausedHint();
			default:
				return '';
		}
	});

	private statsHint(): string {
		const last = this.lastDataAt();

		return last === null ? '' : `Last stats at ${formatTimestamp(last, { tz: this.tz() })}`;
	}

	private writerHint(): string {
		const lastSeenAt = this.status.status()?.writer.lastSeenAt;

		return lastSeenAt === undefined
			? 'No writer batch received yet'
			: `Last writer batch at ${formatTimestamp(lastSeenAt, { tz: this.tz() }).slice(11)}`;
	}

	private pausedHint(): string {
		const at = this.scheduler()?.lastUpdated() ?? null;

		return at === null
			? 'Auto-refresh is off'
			: `Auto-refresh is off · data from ${formatTimestamp(at, { tz: this.tz(), now: at, rangeMs: 0 })}`;
	}
}
