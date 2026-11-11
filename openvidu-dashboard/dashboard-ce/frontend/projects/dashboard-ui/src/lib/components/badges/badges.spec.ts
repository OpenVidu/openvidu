import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatTooltip } from '@angular/material/tooltip';
import { By } from '@angular/platform-browser';
import { beforeEach, describe, expect, it } from 'vitest';

import { statusResponse } from '../../../testing/fixtures.js';
import { iconNames } from '../../../testing/icons.js';
import { PreferencesService } from '../../core/preferences/preferences.js';
import { RefreshRegistry, RefreshScheduler } from '../../core/refresh/refresh.js';
import { ServerStatusService } from '../../core/refresh/server-status.js';

import { ChartColorsService } from '../../charts/chart-colors.js';
import { KindBadge } from './kind-badge.js';
import { LiveChip } from './live-chip.js';
import {
	provideStatusStyles,
	STATUS_FAMILY_STYLES,
	STATUS_STYLES,
	StatusBadge,
	type StatusDomain,
	statusLabel
} from './status-badge.js';

@Component({
	selector: 'ovd-host',
	imports: [StatusBadge],
	template: `<ovd-status-badge
		[status]="status()"
		[domain]="domain()"
		[estimated]="estimated()"
		[subject]="subject()"
		[icon]="icon()"
	/>`
})
class StatusHost {
	readonly status = signal('active');
	readonly domain = signal<string>('room');
	readonly estimated = signal(false);
	readonly subject = signal<string | undefined>(undefined);
	readonly icon = signal<string | undefined>(undefined);
}

const SLOTS = ['#0088aa', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#2f4b7c', '#6250d6', '#e34948'];

/** The palette of the charts, which jsdom cannot read from the theme. */
const PALETTE = {
	provide: ChartColorsService,
	useValue: {
		colors: () => ({ slots: SLOTS, other: '#70787c', text: '#40484c', grid: '#bfc8cc', surface: '#f8fafb' })
	}
};

describe('StatusBadge', () => {
	const cases = Object.entries(STATUS_STYLES).flatMap(([domain, styles]) =>
		Object.entries(styles).map(
			([status, style]) => [domain as StatusDomain, status, style.family, style.icon] as const
		)
	);

	it.each(cases)('renders %s %s with its colour family, icon and label', async (domain, status, family, icon) => {
		const fixture = TestBed.createComponent(StatusHost);

		fixture.componentInstance.domain.set(domain);
		fixture.componentInstance.status.set(status);
		await fixture.whenStable();

		const badge = (fixture.nativeElement as HTMLElement).querySelector('.badge');

		expect(badge?.classList).toContain(`family-${family}`);
		expect(iconNames(fixture.debugElement)).toEqual([icon]);
		expect(badge?.textContent.trim()).toBe(statusLabel(status, domain));
	});

	it('renders the statuses of a domain registered with provideStatusStyles, unknown ones neutral', async () => {
		TestBed.configureTestingModule({
			providers: [provideStatusStyles({ widget: { spinning: STATUS_FAMILY_STYLES.info } })]
		});

		const fixture = TestBed.createComponent(StatusHost);

		fixture.componentInstance.domain.set('widget');
		fixture.componentInstance.status.set('spinning');
		await fixture.whenStable();
		expect((fixture.nativeElement as HTMLElement).querySelector('.badge')?.classList).toContain('family-info');

		fixture.componentInstance.status.set('stopped');
		await fixture.whenStable();
		expect((fixture.nativeElement as HTMLElement).querySelector('.badge')?.classList).toContain('family-neutral');
	});

	it('labels an idle ingress as idle', () => {
		expect(statusLabel('inactive', 'ingress')).toBe('idle');
		expect(statusLabel('limit_reached', 'egress')).toBe('limit reached');
	});

	it('marks a reconciler-closed room with a dotted outline and the estimate tooltip', async () => {
		const fixture = TestBed.createComponent(StatusHost);

		fixture.componentInstance.status.set('closed');
		fixture.componentInstance.estimated.set(true);
		await fixture.whenStable();

		const badge = (fixture.nativeElement as HTMLElement).querySelector('.badge');

		expect(badge?.classList).toContain('estimated');
		expect(badge?.getAttribute('aria-label')).toBe('closed, Closed by the reconciler: the end time is estimated');
		expect(iconNames(fixture.debugElement)).toEqual(['check_circle']);
	});

	it('takes the shared tag box', async () => {
		const fixture = TestBed.createComponent(StatusHost);

		await fixture.whenStable();

		expect((fixture.nativeElement as HTMLElement).querySelector('.badge')?.classList).toContain('ovd-tag');
	});

	it('names what it shows before the estimate or the hint in its tooltip', async () => {
		const fixture = TestBed.createComponent(StatusHost);
		const tooltip = () => fixture.debugElement.query(By.directive(MatTooltip)).injector.get(MatTooltip);

		fixture.componentInstance.subject.set('Room status');
		await fixture.whenStable();

		expect(tooltip().message).toBe('Room status');
		expect(tooltip().disabled).toBe(false);
		expect((fixture.nativeElement as HTMLElement).querySelector('.badge')?.getAttribute('aria-label')).toBe(
			'active, Room status'
		);

		fixture.componentInstance.status.set('closed');
		fixture.componentInstance.estimated.set(true);
		await fixture.whenStable();

		expect(tooltip().message).toBe('Room status · Closed by the reconciler: the end time is estimated');
	});

	it('shows the icon the page gives in the colours of its status', async () => {
		const fixture = TestBed.createComponent(StatusHost);

		fixture.componentInstance.icon.set('mic_off');
		await fixture.whenStable();

		expect(iconNames(fixture.debugElement)).toEqual(['mic_off']);
		expect((fixture.nativeElement as HTMLElement).querySelector('.badge')?.classList).toContain('family-success');
	});
});

describe('KindBadge', () => {
	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [PALETTE] });
	});

	it('shows the label of the kind, or the raw value without one', async () => {
		const fixture = TestBed.createComponent(KindBadge);
		const label = async (kind: string) => {
			fixture.componentRef.setInput('kind', kind);
			await fixture.whenStable();

			return (fixture.nativeElement as HTMLElement).textContent.trim();
		};

		expect(await label('room_composite')).toBe('Room composite');
		expect(await label('AGENT')).toBe('Agent');
		expect(await label('rtmp')).toBe('RTMP');
		expect(await label('new_type')).toBe('new_type');
	});

	it('draws a dot in the Analytics colour of the value, as a tag without tooltip', async () => {
		const fixture = TestBed.createComponent(KindBadge);
		const dot = async (kind: string) => {
			fixture.componentRef.setInput('kind', kind);
			await fixture.whenStable();

			return (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.dot')?.style.background;
		};

		// Participants violet, Egress orange, Ingress blue; Agent its own slot.
		expect(await dot('STANDARD')).toBe('rgb(98, 80, 214)');
		expect(await dot('room_composite')).toBe('rgb(235, 104, 52)');
		expect(await dot('rtmp')).toBe('rgb(47, 75, 124)');
		expect(await dot('AGENT')).toBe('rgb(232, 123, 164)');

		const tag = (fixture.nativeElement as HTMLElement).querySelector('.kind');

		expect(tag?.classList).toContain('ovd-tag');
		expect(tag?.getAttribute('tabindex')).toBeNull();
		expect(fixture.debugElement.query(By.directive(MatTooltip)).injector.get(MatTooltip).disabled).toBe(true);
	});

	it('reads the label and the tooltip the page gives', async () => {
		const fixture = TestBed.createComponent(KindBadge);

		fixture.componentRef.setInput('kind', 'url');
		fixture.componentRef.setInput('label', 'URL (RTSP)');
		fixture.componentRef.setInput('tooltip', 'Ingress input type');
		await fixture.whenStable();

		const tag = (fixture.nativeElement as HTMLElement).querySelector('.kind');

		expect(tag?.textContent.trim()).toBe('URL (RTSP)');
		expect(tag?.getAttribute('tabindex')).toBe('0');
		expect(tag?.getAttribute('aria-label')).toBe('URL (RTSP), Ingress input type');
		expect(fixture.debugElement.query(By.directive(MatTooltip)).injector.get(MatTooltip).message).toBe(
			'Ingress input type'
		);
	});
});

describe('LiveChip', () => {
	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
	});

	it('reads LIVE with a dot, or stale with the clock and the last stats time, in a polite region', async () => {
		const fixture = TestBed.createComponent(LiveChip);
		const element = fixture.nativeElement as HTMLElement;

		await fixture.whenStable();
		expect(element.textContent.trim()).toBe('LIVE');
		expect(element.querySelector('.dot')).not.toBeNull();
		expect(element.querySelector('[aria-live="polite"]')).not.toBeNull();
		expect(element.querySelector('.chip')?.classList).toContain('ovd-tag');

		fixture.componentRef.setInput('stale', true);
		fixture.componentRef.setInput('lastDataAt', '2026-10-13T10:00:00Z');
		await fixture.whenStable();
		expect(element.textContent.trim()).toBe('stale');
		expect(iconNames(fixture.debugElement)).toEqual(['schedule']);
		expect(element.querySelector('.chip')?.getAttribute('tabindex')).toBe('0');
	});

	it('reads paused while the page auto-refresh is off, unless the page or the writer is stale', async () => {
		const preferences = TestBed.inject(PreferencesService);
		const scheduler = new RefreshScheduler({ load: () => Promise.resolve() }, preferences, document);

		TestBed.inject(RefreshRegistry).register(scheduler);
		preferences.setRefreshInterval('live', 0);

		const fixture = TestBed.createComponent(LiveChip);
		const element = fixture.nativeElement as HTMLElement;
		const tooltip = () => fixture.debugElement.query(By.css('.chip')).injector.get(MatTooltip).message;

		await fixture.whenStable();
		expect(element.textContent.trim()).toBe('paused');
		expect(iconNames(fixture.debugElement)).toEqual(['pause']);
		expect(tooltip()).toBe('Auto-refresh is off');

		const load = TestBed.inject(ServerStatusService).load();

		TestBed.inject(HttpTestingController).expectOne('api/v1/status').flush(statusResponse({}, 45_000));
		await load;
		await fixture.whenStable();
		expect(element.textContent.trim()).toBe('stale');
		expect(tooltip()).toMatch(/^Last writer batch at 11:59:15/);

		preferences.setRefreshInterval('live', 10_000);
		await fixture.whenStable();
		expect(element.textContent.trim()).toBe('stale');
	});

	it('returns to LIVE when an interval is chosen again', async () => {
		const preferences = TestBed.inject(PreferencesService);

		TestBed.inject(RefreshRegistry).register(
			new RefreshScheduler({ load: () => Promise.resolve() }, preferences, document)
		);
		preferences.setRefreshInterval('live', 0);

		const fixture = TestBed.createComponent(LiveChip);
		const element = fixture.nativeElement as HTMLElement;

		await fixture.whenStable();
		expect(element.textContent.trim()).toBe('paused');

		preferences.setRefreshInterval('live', 10_000);
		await fixture.whenStable();
		expect(element.textContent.trim()).toBe('LIVE');
	});
});
