import { Component, InjectionToken, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Router path of the page of a media node, provided by an edition that has one; CE provides none. */
export const MEDIA_NODE_LINK = new InjectionToken<((label: string) => string) | null>('MEDIA_NODE_LINK', {
	providedIn: 'root',
	factory: () => null
});

/** A media node label in monospace: a link to its page when the edition provides one, "—" without a label. */
@Component({
	selector: 'ovd-media-node',
	imports: [RouterLink],
	template: `
		@if (label(); as label) {
			@if (path(); as path) {
				<a class="ovd-mono" [routerLink]="path">{{ label }}</a>
			} @else {
				<span class="ovd-mono">{{ label }}</span>
			}
		} @else {
			<span>—</span>
		}
	`
})
export class MediaNodeLabel {
	private readonly link = inject(MEDIA_NODE_LINK);

	readonly label = input<string | undefined>();

	protected readonly path = computed(() => {
		const label = this.label();

		return label === undefined || this.link === null ? null : this.link(label);
	});
}
