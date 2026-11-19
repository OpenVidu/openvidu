import { Component, inject, signal, type TemplateRef, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { settle } from '../../../testing/fixtures.js';
import { ExternalLink } from '../external-link/external-link.js';
import { ConfirmDialogService, type ConfirmDialogResult } from './confirm-dialog.js';

@Component({
	imports: [ExternalLink],
	template: `
		<button type="button" class="opener" (click)="open()">Delete Events</button>
		<ng-template #body>
			<p>Deletes the stored events.</p>
			<ovd-external-link href="https://example.org/">How to free disk space</ovd-external-link>
		</ng-template>
	`
})
class Host {
	private readonly dialogs = inject(ConfirmDialogService);
	readonly body = viewChild.required<TemplateRef<unknown>>('body');
	readonly results = signal<(ConfirmDialogResult | null)[]>([]);

	open(): void {
		void this.dialogs
			.confirm({
				title: 'Delete events?',
				body: this.body(),
				confirmLabel: 'Delete',
				checkbox: { label: 'Also delete the data before 3.10', note: 'A rollback to 3.9 will find no data.' }
			})
			.then((result) => {
				this.results.update((results) => [...results, result]);
			});
	}
}

function dialog(): HTMLElement {
	const element = document.querySelector<HTMLElement>('mat-dialog-container');

	if (element === null) {
		throw new Error('no dialog open');
	}

	return element;
}

/** The elements of the dialog the Tab key moves through, in order. */
function tabbable(container: HTMLElement): HTMLElement[] {
	return [...container.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled])')];
}

describe('ConfirmDialog', () => {
	let host: Host;
	let opener: HTMLButtonElement;

	beforeEach(async () => {
		const fixture = TestBed.createComponent(Host);

		await fixture.whenStable();
		host = fixture.componentInstance;
		const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.opener');

		if (button === null) {
			throw new Error('no opener');
		}

		opener = button;
		opener.focus();
		opener.click();
		await settle();
		await fixture.whenStable();
	});

	afterEach(() => {
		document.querySelectorAll('.cdk-overlay-container').forEach((element) => {
			element.remove();
		});
	});

	it('Keyboard confirmation', async () => {
		const container = dialog();
		const cancel = container.querySelector<HTMLButtonElement>('.ovd-confirm-cancel');
		const confirm = container.querySelector<HTMLButtonElement>('.confirm');

		expect(document.activeElement).toBe(cancel);
		expect(container.getAttribute('role')).toBe('dialog');
		// The focus trap keeps Tab inside: the dialog is wrapped by its anchors and the confirm button comes after
		// Cancel in its tab order.
		expect(container.parentElement?.querySelectorAll('.cdk-focus-trap-anchor')).toHaveLength(2);
		expect(tabbable(container).indexOf(confirm as HTMLElement)).toBeGreaterThan(
			tabbable(container).indexOf(cancel as HTMLElement)
		);

		confirm?.focus();
		confirm?.click();
		confirm?.click();
		await settle();

		expect(host.results()).toEqual([{ checked: false }]);
		expect(document.querySelector('mat-dialog-container')).toBeNull();
		expect(document.activeElement).toBe(opener);
	});

	it('Keyboard confirmation: with the checkbox checked, its note shows and the result says so', async () => {
		const container = dialog();

		expect(container.textContent).not.toContain('A rollback to 3.9 will find no data.');
		container.querySelector<HTMLInputElement>('input[type="checkbox"]')?.click();
		await settle();
		expect(container.textContent).toContain('A rollback to 3.9 will find no data.');

		container.querySelector<HTMLButtonElement>('.confirm')?.click();
		await settle();

		expect(host.results()).toEqual([{ checked: true }]);
	});

	it('Escape cancels: so does Cancel', async () => {
		dialog().querySelector<HTMLButtonElement>('.ovd-confirm-cancel')?.click();
		await settle();

		expect(document.querySelector('mat-dialog-container')).toBeNull();
		expect(host.results()).toEqual([null]);
		expect(document.activeElement).toBe(opener);
	});

	it('Escape cancels', async () => {
		const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });

		// The overlay reads the key code, which jsdom does not take from the event options.
		Object.defineProperty(escape, 'keyCode', { value: 27 });
		dialog().dispatchEvent(escape);
		await settle();

		expect(document.querySelector('mat-dialog-container')).toBeNull();
		expect(host.results()).toEqual([null]);
		expect(document.activeElement).toBe(opener);
	});

	it('shows the title, the body with its link and Cancel before the confirm button', () => {
		const container = dialog();
		const buttons = [...container.querySelectorAll('mat-dialog-actions button')].map((button) =>
			button.textContent.trim()
		);

		expect(container.querySelector('h2')?.textContent).toBe('Delete events?');
		expect(container.querySelector('a')?.getAttribute('target')).toBe('_blank');
		expect(buttons).toEqual(['Cancel', 'Delete']);
	});
});
