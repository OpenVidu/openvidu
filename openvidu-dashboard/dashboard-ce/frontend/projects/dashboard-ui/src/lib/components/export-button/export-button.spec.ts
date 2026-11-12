import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiRequestError } from '../../core/http/api-error.js';
import type { Download } from '../../core/http/http.js';
import { ToastService } from '../../core/ui/toast.js';
import { EXPORT_TRUNCATED_MESSAGE, ExportButton, exportFailedMessage } from './export-button.js';

@Component({
	selector: 'ovd-host',
	imports: [ExportButton],
	template: `<ovd-export-button [run]="run" [disabled]="disabled()" fallbackName="rooms.csv" />`
})
class Host {
	readonly disabled = signal(false);
	next: () => Promise<Download> = () => Promise.resolve({ blob: new Blob(), fileName: null, truncated: false });
	readonly run = () => this.next();
}

describe('ExportButton', () => {
	let saved: string[];
	let toast: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		saved = [];
		toast = vi.fn();
		URL.createObjectURL = vi.fn(() => 'blob:csv');
		URL.revokeObjectURL = vi.fn();
		vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
			saved.push(this.download);
		});
		TestBed.configureTestingModule({ providers: [{ provide: ToastService, useValue: { show: toast } }] });
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	async function render() {
		const fixture = TestBed.createComponent(Host);

		await fixture.whenStable();

		const button = () => (fixture.nativeElement as HTMLElement).querySelector('button');

		// The export settles over several microtasks after the click.
		const stable = async () => {
			await new Promise((resolve) => setTimeout(resolve));
			await fixture.whenStable();
		};

		return { host: fixture.componentInstance, button, stable };
	}

	it('saves the file under the server name, or its fallback, and stays disabled while it runs', async () => {
		const { host, button, stable } = await render();
		let finish: (download: Download) => void = () => undefined;

		host.next = () =>
			new Promise((resolve) => {
				finish = resolve;
			});
		button()?.click();
		await stable();
		expect(button()?.disabled).toBe(true);

		finish({ blob: new Blob(['sid\r\n']), fileName: 'rooms-a-b.csv', truncated: false });
		await stable();
		expect(saved).toEqual(['rooms-a-b.csv']);
		expect(button()?.disabled).toBe(false);
		expect(button()?.textContent.trim()).toBe('Export CSV');
		expect(toast).not.toHaveBeenCalled();

		host.next = () => Promise.resolve({ blob: new Blob(), fileName: null, truncated: false });
		button()?.click();
		await stable();
		expect(saved).toEqual(['rooms-a-b.csv', 'rooms.csv']);
	});

	it('toasts the cap notice of a cut export', async () => {
		const { host, button, stable } = await render();

		host.next = () => Promise.resolve({ blob: new Blob(), fileName: 'rooms.csv', truncated: true });
		button()?.click();
		await stable();

		expect(saved).toEqual(['rooms.csv']);
		expect(toast).toHaveBeenCalledWith(EXPORT_TRUNCATED_MESSAGE);
		expect(EXPORT_TRUNCATED_MESSAGE).toBe(
			'Exported the first 10,000 rows. Narrow the range or the filters to export the rest.'
		);
	});

	it('toasts a failure with its request id and is enabled again', async () => {
		const { host, button, stable } = await render();
		const failure = new ApiRequestError(500, 'INTERNAL_ERROR', 'boom', {}, 'abc');

		host.next = () => Promise.reject(failure);
		button()?.click();
		await stable();

		expect(saved).toEqual([]);
		expect(toast).toHaveBeenCalledWith(exportFailedMessage(failure));
		expect(exportFailedMessage(failure)).toMatch(/^Export failed: .+ Request abc$/);
		expect(button()?.disabled).toBe(false);
	});

	it('is disabled when the page says so', async () => {
		const { host, button, stable } = await render();

		host.disabled.set(true);
		await stable();

		expect(button()?.disabled).toBe(true);
	});
});
