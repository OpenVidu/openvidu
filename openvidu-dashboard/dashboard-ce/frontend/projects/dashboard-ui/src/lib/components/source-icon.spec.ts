import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';

import { SourceIcon } from './source-icon.js';

@Component({
	selector: 'ovd-host',
	imports: [SourceIcon],
	template: `
		<ovd-source-icon source="CAMERA" />
		<ovd-source-icon source="SCREEN_SHARE_AUDIO" />
	`
})
class Host {}

describe('SourceIcon', () => {
	it('names each source icon', async () => {
		TestBed.configureTestingModule({ providers: [provideRouter([])] });

		const fixture = TestBed.createComponent(Host);

		await fixture.whenStable();

		const element = fixture.nativeElement as HTMLElement;
		const icons = [...element.querySelectorAll('ovd-source-icon .icon')];

		expect(icons.map((icon) => icon.getAttribute('aria-label'))).toEqual(['Camera', 'Screen share audio']);
	});
});
