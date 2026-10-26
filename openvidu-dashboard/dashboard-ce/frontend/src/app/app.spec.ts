import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';

import { App } from './app.js';

describe('App', () => {
	it('renders the routed page', async () => {
		TestBed.configureTestingModule({
			providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
		});

		const fixture = TestBed.createComponent(App);

		await fixture.whenStable();

		expect((fixture.nativeElement as HTMLElement).querySelector('router-outlet')).not.toBeNull();
	});
});
