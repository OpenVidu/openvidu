import { Component, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

/** A link to an external page: new tab, `rel="noopener"` and a trailing `open_in_new` icon. */
@Component({
	selector: 'ovd-external-link',
	imports: [MatIcon],
	template: `
		<a [href]="href()" target="_blank" rel="noopener">
			<ng-content />
			<mat-icon svgIcon="open_in_new" aria-hidden="true" />
			<span class="ovd-visually-hidden">(opens in a new tab)</span>
		</a>
	`,
	styles: `
		a {
			display: inline-flex;
			align-items: center;
			gap: 2px;
		}

		mat-icon {
			width: 16px;
			height: 16px;
		}
	`
})
export class ExternalLink {
	readonly href = input.required<string>();
}
