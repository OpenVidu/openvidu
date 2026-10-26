import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CopyButton } from '../components/copy-button/copy-button.js';
import { type BreadcrumbItem, BreadcrumbService } from '../routing/breadcrumbs.js';

/** The crumb trail: links carry the current range, the current page is text with its copy button. */
@Component({
	selector: 'ovd-breadcrumbs',
	imports: [RouterLink, CopyButton],
	template: `
		@if (trail().length > 1) {
			<nav aria-label="Breadcrumb">
				<ol>
					@for (item of trail(); track $index; let last = $last) {
						<li>
							@if (item.link !== undefined && !last) {
								<a [routerLink]="item.link" [queryParams]="item.queryParams ?? null">{{
									item.label
								}}</a>
							} @else {
								<span
									[class.ovd-mono]="item.copy !== undefined"
									[attr.aria-current]="last ? 'page' : null"
									>{{ item.label }}</span
								>
								@if (last && item.copy !== undefined) {
									<ovd-copy-button [value]="item.copy" [label]="item.copyLabel ?? 'identifier'" />
								}
							}
						</li>
					}
				</ol>
			</nav>
		}
	`,
	styles: `
		ol {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			margin: 0;
			padding: 0;
			list-style: none;
			color: var(--mat-sys-on-surface-variant);
		}

		li {
			display: inline-flex;
			align-items: center;
			gap: 8px;
			min-width: 0;
		}

		li + li::before {
			content: '/';
			margin: 0 8px;
			color: var(--mat-sys-outline);
		}

		[aria-current] {
			color: var(--mat-sys-on-surface);
		}
	`
})
export class Breadcrumbs {
	private readonly service = inject(BreadcrumbService);

	/** Explicit crumbs; defaults to the trail derived from the route tree. */
	readonly items = input<readonly BreadcrumbItem[] | null>(null);

	protected readonly trail = computed(() => this.items() ?? this.service.items());
}
