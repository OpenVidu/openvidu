import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeAll, describe, expect, it } from 'vitest';

@Component({
	selector: 'ovd-token-probe',
	template: '',
	styles: `
		@use '@angular/material' as mat;
		@use '../../../styles/tokens';

		:host {
			@include mat.theme-overrides(tokens.$overrides);
			@include tokens.custom-properties;
		}
	`
})
class TokenProbe {}

type Scheme = 'light' | 'dark';

const TEXT = 4.5;
const UI = 3;

/** Foreground, background and minimum ratio of every pair the theme promises. */
const PAIRS: [string, string, number][] = [
	['--mat-sys-on-surface', '--mat-sys-surface', TEXT],
	['--mat-sys-on-surface-variant', '--mat-sys-surface', TEXT],
	['--mat-sys-primary', '--mat-sys-surface', TEXT],
	['--mat-sys-tertiary', '--mat-sys-surface', TEXT],
	['--mat-sys-error', '--mat-sys-surface', TEXT],
	['--mat-sys-on-surface', '--mat-sys-surface-container', TEXT],
	['--mat-sys-on-surface-variant', '--mat-sys-surface-container', TEXT],
	['--mat-sys-primary', '--mat-sys-surface-container', TEXT],
	['--mat-sys-on-surface', '--mat-sys-surface-container-high', TEXT],
	['--mat-sys-on-surface-variant', '--mat-sys-surface-container-high', TEXT],
	['--mat-sys-on-primary', '--mat-sys-primary', TEXT],
	['--mat-sys-on-primary-container', '--mat-sys-primary-container', TEXT],
	['--mat-sys-on-tertiary-container', '--mat-sys-tertiary-container', TEXT],
	['--mat-sys-on-error', '--mat-sys-error', TEXT],
	['--mat-sys-on-error-container', '--mat-sys-error-container', TEXT],
	['--ovd-status-success-fg', '--ovd-status-success-bg', TEXT],
	['--ovd-status-neutral-fg', '--ovd-status-neutral-bg', TEXT],
	['--ovd-status-error-fg', '--ovd-status-error-bg', TEXT],
	['--ovd-status-warning-fg', '--ovd-status-warning-bg', TEXT],
	['--ovd-status-info-fg', '--ovd-status-info-bg', TEXT],
	['--mat-sys-outline', '--mat-sys-surface', UI],
	['--ovd-brand', '--mat-sys-surface', UI]
];

function luminance(hex: string): number {
	const channels = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255);
	const [r = 0, g = 0, b = 0] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));

	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
	const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];

	return (light + 0.05) / (dark + 0.05);
}

describe('theme tokens', () => {
	const tokens = new Map<string, Record<Scheme, string>>();

	beforeAll(() => {
		TestBed.createComponent(TokenProbe);

		const css = [...document.querySelectorAll('style')].map((style) => style.textContent).join('\n');

		for (const [, name, value] of css.matchAll(/(--[\w-]+):\s*([^;}]+)/g)) {
			if (name === undefined || value === undefined) {
				continue;
			}

			const pair = /light-dark\(\s*(#[0-9a-f]{6})\s*,\s*(#[0-9a-f]{6})\s*\)/i.exec(value);
			const single = /^\s*(#[0-9a-f]{6})\s*$/i.exec(value);

			if (pair?.[1] !== undefined && pair[2] !== undefined) {
				tokens.set(name, { light: pair[1], dark: pair[2] });
			} else if (single?.[1] !== undefined) {
				tokens.set(name, { light: single[1], dark: single[1] });
			}
		}
	});

	it.each(['light', 'dark'] as const)('meets WCAG AA in the %s scheme', (scheme) => {
		const failures = PAIRS.flatMap(([fg, bg, minimum]) => {
			const foreground = tokens.get(fg)?.[scheme];
			const background = tokens.get(bg)?.[scheme];

			if (foreground === undefined || background === undefined) {
				return [`${fg} on ${bg}: token missing`];
			}

			const ratio = contrast(foreground, background);

			return ratio >= minimum ? [] : [`${fg} on ${bg}: ${ratio.toFixed(2)} < ${String(minimum)}`];
		});

		expect(failures).toEqual([]);
	});

	it('uses the OpenVidu palette values for the key tokens', () => {
		expect(tokens.get('--mat-sys-primary')).toEqual({ light: '#006b86', dark: '#5fd4fb' });
		expect(tokens.get('--mat-sys-tertiary')).toEqual({ light: '#00677f', dark: '#00c8f7' });
		expect(tokens.get('--mat-sys-surface')).toEqual({ light: '#f8fafb', dark: '#0f1416' });
		expect(tokens.get('--mat-sys-on-surface')).toEqual({ light: '#171c1e', dark: '#dfe3e6' });
		expect(tokens.get('--mat-sys-error')).toEqual({ light: '#ba1a1a', dark: '#ffb4ab' });
	});
});
