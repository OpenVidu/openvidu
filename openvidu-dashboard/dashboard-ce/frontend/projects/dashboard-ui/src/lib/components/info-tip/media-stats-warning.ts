import { Component, input } from '@angular/core';

import { InfoTip } from './info-tip.js';

/**
 * The warning icon of data that the servers do not generate (media statistics of mediasoup): its text shows like an info
 * tip and names the icon for assistive technology.
 */
@Component({
	selector: 'ovd-media-stats-warning',
	imports: [InfoTip],
	template: `<ovd-info-tip variant="warning" [text]="text()" />`,
	styles: `
		:host {
			display: inline-flex;
			vertical-align: middle;
		}
	`
})
export class MediaStatsWarning {
	/** One of `MEDIA_STATS_TEXTS`. */
	readonly text = input.required<string>();
}
