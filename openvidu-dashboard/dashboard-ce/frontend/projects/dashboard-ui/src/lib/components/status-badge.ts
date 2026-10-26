import { booleanAttribute, Component, computed, inject, InjectionToken, input, type Provider } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';

import { RECONCILER_ESTIMATE } from '../format/labels.js';

/** The CE status domains; an edition registers more with {@link provideStatusStyles}. */
export type StatusDomain = 'room' | 'participant' | 'egress' | 'ingress';
export type StatusFamily = 'success' | 'neutral' | 'error' | 'warning' | 'info';

export interface StatusStyle {
	family: StatusFamily;
	icon: string;
}

/** Styles of the statuses of each domain. */
export type StatusStyles = Readonly<Record<string, Readonly<Record<string, StatusStyle>>>>;

const SUCCESS: StatusStyle = { family: 'success', icon: 'radio_button_checked' };
const NEUTRAL: StatusStyle = { family: 'neutral', icon: 'check_circle' };
const ERROR: StatusStyle = { family: 'error', icon: 'error' };
const WARNING: StatusStyle = { family: 'warning', icon: 'cancel' };
const INFO: StatusStyle = { family: 'info', icon: 'pending' };

/** The style of each colour family, for the statuses of registered domains. */
export const STATUS_FAMILY_STYLES: Readonly<Record<StatusFamily, StatusStyle>> = {
	success: SUCCESS,
	neutral: NEUTRAL,
	error: ERROR,
	warning: WARNING,
	info: INFO
};

/** Colour family and icon of every status per domain; colour is never the only cue, the label always shows. */
export const STATUS_STYLES: Readonly<Record<StatusDomain, Readonly<Record<string, StatusStyle>>>> = {
	room: { active: SUCCESS, closed: NEUTRAL },
	participant: { joining: INFO, active: SUCCESS, left: NEUTRAL, aborted: WARNING },
	egress: {
		starting: INFO,
		active: SUCCESS,
		ending: INFO,
		complete: NEUTRAL,
		failed: ERROR,
		aborted: WARNING,
		limit_reached: WARNING
	},
	ingress: {
		inactive: INFO,
		buffering: INFO,
		publishing: SUCCESS,
		error: ERROR,
		complete: NEUTRAL,
		deleted: NEUTRAL
	}
};

/** Status domains an edition adds to the CE ones. */
export const EXTRA_STATUS_STYLES = new InjectionToken<readonly StatusStyles[]>('EXTRA_STATUS_STYLES');

/** Registers status domains beyond the CE ones; a status the domains do not list renders neutral. */
export function provideStatusStyles(styles: StatusStyles): Provider {
	return { provide: EXTRA_STATUS_STYLES, useValue: styles, multi: true };
}

/** Labels that differ from the stored status in a domain. */
const DOMAIN_LABELS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
	ingress: { inactive: 'idle' }
};

export function statusLabel(status: string, domain?: string): string {
	return (
		(domain === undefined ? undefined : DOMAIN_LABELS[domain]?.[status]) ??
		status.toLowerCase().replaceAll('_', ' ')
	);
}

/**
 * Icon and label of a status in its domain; `estimated` marks a status set by the reconciler, `stale` an active entity
 * without recent stats, and `hint` explains the status (an end reason, a disconnect reason) in a tooltip.
 */
@Component({
	selector: 'ovd-status-badge',
	imports: [MatIcon, MatTooltip],
	template: `
		<span
			class="badge"
			[class]="'family-' + style().family"
			[class.estimated]="estimated()"
			[matTooltip]="tooltip() ?? ''"
			[matTooltipDisabled]="tooltip() === null"
			[attr.tabindex]="tooltip() === null ? null : 0"
			[attr.aria-label]="tooltip() === null ? null : label() + ', ' + tooltip()"
		>
			<mat-icon [svgIcon]="style().icon" aria-hidden="true" />
			{{ label() }}
			@if (stale()) {
				<mat-icon class="stale" svgIcon="schedule" aria-hidden="true" />
			}
		</span>
	`,
	styles: `
		:host {
			display: inline-flex;
		}

		.badge {
			display: inline-flex;
			align-items: center;
			gap: 4px;
			padding: 2px 8px 2px 6px;
			border: 1px solid transparent;
			border-radius: 8px;
			font: var(--mat-sys-label-medium);
			white-space: nowrap;

			mat-icon {
				width: 16px;
				height: 16px;
			}
		}

		.estimated {
			border: 1px dotted currentColor;
		}

		@each $family in success, neutral, error, warning, info {
			.family-#{$family} {
				background: var(--ovd-status-#{$family}-bg);
				color: var(--ovd-status-#{$family}-fg);
			}
		}
	`
})
export class StatusBadge {
	private readonly styles = (inject(EXTRA_STATUS_STYLES, { optional: true }) ?? []).reduce<StatusStyles>(
		(styles, extra) => ({ ...styles, ...extra }),
		STATUS_STYLES
	);

	readonly status = input.required<string>();
	/** A {@link StatusDomain} or a domain registered with {@link provideStatusStyles}. */
	readonly domain = input.required<string>();
	readonly estimated = input(false, { transform: booleanAttribute });
	/** Tooltip of an estimated status; defaults to the reconciler estimate text. */
	readonly estimatedHint = input<string>();
	/** An active entity whose stats stopped arriving: a clock after the label; say when in `hint`. */
	readonly stale = input(false, { transform: booleanAttribute });
	/** Tooltip of a status that is not estimated. */
	readonly hint = input<string>();

	protected readonly style = computed(() => this.styles[this.domain()]?.[this.status()] ?? NEUTRAL);
	protected readonly label = computed(() => statusLabel(this.status(), this.domain()));
	protected readonly tooltip = computed(() => {
		if (this.estimated()) {
			return this.estimatedHint() ?? RECONCILER_ESTIMATE;
		}

		return this.hint() ?? null;
	});
}
