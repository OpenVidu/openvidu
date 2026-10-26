import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MatTooltip } from '@angular/material/tooltip';
import { describe, expect, it } from 'vitest';

import { settle } from '../../../testing/fixtures.js';
import { InfoTip } from './info-tip.js';

@Component({
	selector: 'ovd-host',
	imports: [InfoTip],
	template: `<div class="header">
			<span>Unique identities</span>
			<ovd-info-tip subject="Unique identities" text="Distinct participant identities." />
		</div>
		<p class="elsewhere">Elsewhere</p>`
})
class Host {}

function pointer(type: string): Event {
	const event = new MouseEvent('pointerdown', { bubbles: true });

	Object.defineProperty(event, 'pointerType', { value: type });

	return event;
}

async function render() {
	const fixture = TestBed.createComponent(Host);

	await fixture.whenStable();

	const element = fixture.nativeElement as HTMLElement;
	const button = element.querySelector<HTMLButtonElement>('ovd-info-tip button');
	const tooltip = fixture.debugElement.query(By.directive(MatTooltip)).injector.get(MatTooltip);

	return {
		fixture,
		element,
		button,
		tooltip,
		stable: async () => {
			await settle();
			await fixture.whenStable();
		}
	};
}

describe('InfoTip', () => {
	it('is a button named after its subject that shows its text on hover', async () => {
		const { button, stable } = await render();

		expect(button?.getAttribute('aria-label')).toBe('About Unique identities');
		button?.dispatchEvent(new MouseEvent('mouseenter'));
		await stable();
		expect(document.querySelector('.mat-mdc-tooltip')?.textContent.trim()).toBe('Distinct participant identities.');
	});

	it('shows on a mouse click without reaching the element around it', async () => {
		const { element, button, tooltip, stable } = await render();
		let clicks = 0;

		element.querySelector('.header')?.addEventListener('click', () => {
			clicks++;
		});
		button?.dispatchEvent(pointer('mouse'));
		button?.click();
		await stable();

		expect(tooltip._isTooltipVisible()).toBe(true);
		expect(clicks).toBe(0);
	});

	it('toggles on taps and hides on a tap elsewhere', async () => {
		const { element, button, tooltip, stable } = await render();

		button?.dispatchEvent(pointer('touch'));
		button?.click();
		await stable();
		expect(tooltip._isTooltipVisible()).toBe(true);

		button?.dispatchEvent(pointer('touch'));
		button?.click();
		await stable();
		expect(tooltip._isTooltipVisible()).toBe(false);

		button?.dispatchEvent(pointer('touch'));
		button?.click();
		await stable();
		element.querySelector('.elsewhere')?.dispatchEvent(pointer('touch'));
		await stable();
		expect(tooltip._isTooltipVisible()).toBe(false);
	});
});
