import { NgTemplateOutlet } from '@angular/common';
import {
	booleanAttribute,
	Component,
	computed,
	contentChild,
	Directive,
	inject,
	input,
	output,
	TemplateRef
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import type { FeatureKey } from '@openvidu-dashboard/typings';

import { EmptyState } from '../../components/feedback/empty-state.js';
import { ErrorBanner } from '../../components/feedback/error-banner.js';
import { Skeleton } from '../../components/feedback/skeleton.js';
import { ProLockOverlay } from '../../components/lock/pro-lock-overlay.js';
import { SectionCard } from '../../components/tiles/section-card.js';
import { FeatureService } from '../../core/info.js';

/** Content of an analytics card, instantiated only once it has data: `<ng-template ovdCardContent>`. */
@Directive({ selector: 'ng-template[ovdCardContent]' })
export class CardContent {
	readonly template = inject(TemplateRef);
}

/**
 * A section of the Analytics page: the compact lock of its PRO feature, a skeleton of its height until its first data,
 * "No data in this range" with "Widen range", or its content, under its error notice with retry when a request fails;
 * "Export CSV" in the header.
 */
@Component({
	selector: 'ovd-analytics-card',
	imports: [EmptyState, ErrorBanner, MatButton, MatIcon, NgTemplateOutlet, ProLockOverlay, SectionCard, Skeleton],
	template: `
		<ovd-section-card [heading]="heading()" [info]="locked() ? undefined : info()" [sectionId]="sectionId()">
			@if (exportable()) {
				<button
					ovdSectionActions
					matButton
					type="button"
					[disabled]="locked() || exporting()"
					(click)="exportCsv.emit()"
				>
					<mat-icon svgIcon="download" />
					Export CSV
				</button>
			}
			@if (locked()) {
				<ovd-pro-lock-overlay variant="card" [feature]="lockFeature()" />
			} @else {
				@if (error()) {
					<ovd-error-banner class="error" [error]="error()" (retry)="retry.emit()" />
				}
				@if (loading()) {
					<ovd-skeleton variant="chart" [height]="height()" />
				} @else if (empty()) {
					@if (!error()) {
						<ovd-empty-state icon="query_stats" heading="No data in this range">
							<button ovdEmptyAction matButton="outlined" type="button" (click)="widen.emit()">
								Widen range
							</button>
						</ovd-empty-state>
					}
				} @else {
					<ng-container [ngTemplateOutlet]="content()?.template ?? null" />
				}
			}
		</ovd-section-card>
	`,
	styles: `
		:host {
			display: block;
		}

		.error {
			margin-bottom: 12px;
		}
	`
})
export class AnalyticsCard {
	private readonly features = inject(FeatureService);

	readonly heading = input.required<string>();
	/** Explanation of the heading, shown by an info tip after it. */
	readonly info = input<string>();
	readonly sectionId = input.required<string>();
	/** PRO feature of the card; the card renders its lock, and requests nothing, while it is disabled. */
	readonly feature = input<FeatureKey>();
	readonly loading = input(false, { transform: booleanAttribute });
	readonly error = input<unknown>(null);
	readonly empty = input(false, { transform: booleanAttribute });
	readonly exportable = input(true, { transform: booleanAttribute });
	readonly exporting = input(false, { transform: booleanAttribute });
	/** Height of the real content, kept by the skeleton and the empty state. */
	readonly height = input(280);
	readonly exportCsv = output();
	readonly retry = output();
	readonly widen = output();

	protected readonly content = contentChild(CardContent);
	protected readonly locked = computed(() => {
		const feature = this.feature();

		return feature !== undefined && !this.features.enabled(feature);
	});
	protected readonly lockFeature = computed(() => this.feature() ?? 'analytics-quality');
}
