import { computed, DOCUMENT, inject, Service, type Signal } from '@angular/core';

import { ThemeService } from '../core/theme.js';

export const CHART_SLOTS = 8;

/** Resolved colours of the theme tokens charts use, re-read whenever the applied scheme changes. */
export interface ChartColors {
	slots: string[];
	other: string;
	text: string;
	grid: string;
	surface: string;
}

const TOKENS = {
	other: '--mat-sys-outline',
	text: '--mat-sys-on-surface-variant',
	grid: '--mat-sys-outline-variant',
	surface: '--mat-sys-surface'
} as const;

/**
 * Reads the chart colours from the theme's custom properties. Their values are `light-dark()` pairs, so each one is
 * resolved through the computed `color` of a probe element under the current `color-scheme`.
 */
@Service()
export class ChartColorsService {
	private readonly document = inject(DOCUMENT);
	private readonly theme = inject(ThemeService);

	readonly colors = computed<ChartColors>(() => {
		this.theme.scheme();

		return this.withProbe((resolve) => ({
			slots: Array.from({ length: CHART_SLOTS }, (_, index) => resolve(`--ovd-chart-${String(index + 1)}`)),
			other: resolve(TOKENS.other),
			text: resolve(TOKENS.text),
			grid: resolve(TOKENS.grid),
			surface: resolve(TOKENS.surface)
		}));
	});

	/** The colours of other custom properties, such as an edition's own tokens, re-read with the applied scheme. */
	resolved<K extends string>(tokens: Readonly<Record<K, string>>): Signal<Readonly<Record<K, string>>> {
		return computed(() => {
			this.theme.scheme();

			return this.withProbe(
				(resolve) =>
					Object.fromEntries(
						Object.entries<string>(tokens).map(([key, token]) => [key, resolve(token)])
					) as Record<K, string>
			);
		});
	}

	private withProbe<T>(read: (resolve: (token: string) => string) => T): T {
		const probe = this.document.createElement('span');

		probe.style.display = 'none';
		this.document.body.appendChild(probe);

		try {
			return read((token) => {
				probe.style.color = `var(${token})`;

				return this.document.defaultView?.getComputedStyle(probe).color ?? '';
			});
		} finally {
			probe.remove();
		}
	}
}
