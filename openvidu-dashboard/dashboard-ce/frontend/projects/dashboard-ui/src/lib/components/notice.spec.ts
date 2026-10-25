import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { ApiRequestError } from '../core/api-error.js';
import { ErrorBanner } from './error-banner.js';
import { Notice } from './notice.js';

@Component({
	selector: 'ovd-notice-host',
	imports: [ErrorBanner, Notice],
	template: `
		<ovd-error-banner [error]="error" (retry)="retries = retries + 1" />
		<ovd-notice id="info">Expired stats are not shown.</ovd-notice>
		<ovd-notice
			id="warning"
			variant="warning"
			actionLabel="View active rooms"
			dismissible
			(action)="actions = actions + 1"
			(dismiss)="dismissals = dismissals + 1"
			>Stats may be stale.</ovd-notice
		>
	`
})
class NoticeHost {
	readonly error = new ApiRequestError(500, 'INTERNAL_ERROR', 'boom', {}, 'req-7');
	retries = 0;
	actions = 0;
	dismissals = 0;
}

describe('Notice', () => {
	it('shows the error variant with the message, the request id and Retry', async () => {
		const fixture = TestBed.createComponent(NoticeHost);
		const element = fixture.nativeElement as HTMLElement;

		await fixture.whenStable();

		const error = element.querySelector('ovd-error-banner ovd-notice');

		expect(error?.classList.contains('error')).toBe(true);
		expect(error?.getAttribute('role')).toBe('alert');
		expect(error?.textContent).toContain('Something went wrong while loading the data.');
		expect(error?.textContent).toContain('Request req-7');

		error?.querySelector('button')?.click();
		expect(fixture.componentInstance.retries).toBe(1);
	});

	it('shows an info notice without action', async () => {
		const fixture = TestBed.createComponent(NoticeHost);

		await fixture.whenStable();

		const info = (fixture.nativeElement as HTMLElement).querySelector('#info');

		expect(info?.classList.contains('info')).toBe(true);
		expect(info?.getAttribute('role')).toBe('status');
		expect(info?.textContent).toContain('Expired stats are not shown.');
		expect(info?.querySelector('button')).toBeNull();
	});

	it('shows a warning with its action and dismiss button', async () => {
		const fixture = TestBed.createComponent(NoticeHost);

		await fixture.whenStable();

		const warning = (fixture.nativeElement as HTMLElement).querySelector('#warning');
		const [action, dismiss] = [...(warning?.querySelectorAll('button') ?? [])];

		expect(warning?.classList.contains('warning')).toBe(true);
		expect(warning?.getAttribute('role')).toBe('alert');
		expect(action?.textContent.trim()).toBe('View active rooms');
		expect(dismiss?.getAttribute('aria-label')).toBe('Dismiss');

		action?.click();
		dismiss?.click();
		expect([fixture.componentInstance.actions, fixture.componentInstance.dismissals]).toEqual([1, 1]);
	});
});
