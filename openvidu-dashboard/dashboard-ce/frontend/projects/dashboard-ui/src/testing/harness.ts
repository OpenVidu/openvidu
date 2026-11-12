import type { HttpParams } from '@angular/common/http';
import type { HttpTestingController } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import type { RouterTestingHarness } from '@angular/router/testing';
import { vi } from 'vitest';

import { settle } from './fixtures.js';

/** The element of the routed component. */
export function routeElement(harness: RouterTestingHarness): HTMLElement {
	const element = harness.routeNativeElement;

	if (element === null) {
		throw new Error('No routed component');
	}

	return element;
}

/** The instance of a component rendered by the routed component; tests cast it to the members they call. */
export function childComponent(harness: RouterTestingHarness, selector: string): unknown {
	const child = harness.routeDebugElement?.query(By.css(selector));

	if (child === undefined) {
		throw new Error(`${selector} is not rendered`);
	}

	return child.componentInstance;
}

/**
 * Clicks the Export CSV of `element`, answers its request to `path` with a file named `fileName` and returns the
 * request parameters and the names the browser saved.
 */
export async function exportCsv(
	http: HttpTestingController,
	element: HTMLElement,
	path: string,
	fileName = 'export.csv'
): Promise<{ params: HttpParams; saved: string[] }> {
	const saved: string[] = [];
	const createObjectURL = URL.createObjectURL.bind(URL);
	const revokeObjectURL = URL.revokeObjectURL.bind(URL);

	URL.createObjectURL = vi.fn(() => 'blob:csv');
	URL.revokeObjectURL = vi.fn();

	const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
		saved.push(this.download);
	});

	try {
		element.querySelector<HTMLButtonElement>('ovd-export-button button')?.click();

		const request = http.expectOne((req) => req.url === `api/v1/${path}`);

		request.flush(new Blob(['x\r\n']), { headers: { 'Content-Disposition': `attachment; filename=${fileName}` } });
		await settle();
		await settle();

		return { params: request.request.params, saved };
	} finally {
		click.mockRestore();
		URL.createObjectURL = createObjectURL;
		URL.revokeObjectURL = revokeObjectURL;
	}
}
