import { By } from '@angular/platform-browser';
import type { RouterTestingHarness } from '@angular/router/testing';

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
