import { Component } from '@angular/core';

/** A value that reflects no data, e.g. bytes of a server without media statistics: a dimmed "—" read as "Not available". */
@Component({
	selector: 'ovd-unavailable',
	template: `<span class="value" aria-hidden="true">—</span><span class="ovd-visually-hidden">Not available</span>`,
	styles: `
		.value {
			opacity: 0.38;
			filter: grayscale(1);
		}
	`
})
export class UnavailableValue {}
