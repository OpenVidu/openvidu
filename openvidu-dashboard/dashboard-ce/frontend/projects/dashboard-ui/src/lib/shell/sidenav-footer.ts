import { booleanAttribute, Component, computed, inject, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';

import { ExternalLink } from '../components/external-link/external-link.js';
import { InfoService } from '../core/info.js';
import { EXTERNAL_LINKS } from '../core/links.js';
import { EditionBadge } from './edition-badge.js';

/**
 * The bottom of the sidenav: "OpenVidu {version}" linking to About, the edition badge, the documentation link and, when
 * the server serves it, the OpenAPI link; in rail mode the short badge and a documentation icon.
 */
@Component({
	selector: 'ovd-sidenav-footer',
	imports: [EditionBadge, ExternalLink, MatIcon, MatTooltip, RouterLink],
	template: `
		@if (rail()) {
			<ovd-edition-badge compact />
			<a
				class="icon-link"
				[href]="documentation"
				target="_blank"
				rel="noopener"
				aria-label="Documentation (opens in a new tab)"
				matTooltip="Documentation"
				matTooltipPosition="right"
			>
				<mat-icon svgIcon="help" />
			</a>
		} @else {
			<div class="version">
				<a routerLink="/settings" [queryParams]="{ tab: 'about' }">{{ version() }}</a>
				<ovd-edition-badge />
			</div>
			<ovd-external-link [href]="documentation">Documentation</ovd-external-link>
			@if (openapi()) {
				<ovd-external-link href="api/v1/docs">OpenAPI</ovd-external-link>
			}
		}
	`,
	styles: `
		:host {
			display: flex;
			flex-direction: column;
			align-items: flex-start;
			gap: 8px;
			font: var(--mat-sys-body-small);
		}

		.version {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 4px 8px;

			a {
				color: var(--mat-sys-on-surface-variant);
				font: var(--mat-sys-label-large);
				text-decoration: none;
				white-space: nowrap;
			}

			a:hover {
				text-decoration: underline;
			}
		}

		.icon-link {
			display: inline-flex;
			padding: 8px;
			border-radius: 50%;
			color: var(--mat-sys-on-surface-variant);
		}

		.icon-link:hover {
			background: var(--mat-sys-surface-container-high);
		}
	`
})
export class SidenavFooter {
	private readonly info = inject(InfoService);

	readonly rail = input(false, { transform: booleanAttribute });

	protected readonly documentation = EXTERNAL_LINKS.documentation;
	protected readonly version = computed(() => `OpenVidu ${this.info.dashboardVersion() ?? ''}`.trim());
	protected readonly openapi = computed(() => this.info.info()?.openapiDocsEnabled === true);
}
