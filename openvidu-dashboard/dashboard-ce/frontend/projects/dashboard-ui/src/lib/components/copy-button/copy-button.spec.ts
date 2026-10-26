import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastService } from '../../core/ui/toast.js';
import { CopyButton } from './copy-button.js';

@Component({
	selector: 'ovd-host',
	imports: [CopyButton],
	template: `<a href="/rooms/RM_ab12cd" (click)="followed = true; $event.preventDefault()">demo-room</a
		><ovd-copy-button value="demo-room" label="room name" />`
})
class Host {
	followed = false;
}

describe('CopyButton', () => {
	let toast: ReturnType<typeof vi.fn<(message: string) => void>>;

	beforeEach(() => {
		toast = vi.fn<(message: string) => void>();
		TestBed.configureTestingModule({ providers: [{ provide: ToastService, useValue: { show: toast } }] });
	});

	afterEach(() => {
		Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true });
		Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
	});

	it('shows only the button next to the value it copies, named after the value', async () => {
		const writeText = vi.fn(() => Promise.resolve());

		Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
		Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

		const fixture = TestBed.createComponent(Host);

		await fixture.whenStable();

		const element = fixture.nativeElement as HTMLElement;
		const button = element.querySelector('ovd-copy-button button');
		const visible = element.textContent.replace(
			element.querySelector('.ovd-visually-hidden')?.textContent ?? '',
			''
		);

		expect(button?.getAttribute('aria-label')).toBe('Copy room name');
		expect(visible.match(/demo-room/g)).toHaveLength(1);

		(button as HTMLButtonElement | null)?.click();
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(writeText).toHaveBeenCalledWith('demo-room');
		expect(toast).toHaveBeenCalledWith('Copied');
		expect(fixture.componentInstance.followed).toBe(false);
	});
});
