import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { FeatureKey, NavigationMeta } from '@openvidu-dashboard/typings';

import { type EntityKind, EntityPreviewService } from '../../core/state/entity-preview.js';
import { ListStateService } from '../../core/state/list-state.js';
import { ownData } from '../../core/state/route-state.js';
import { RECONCILER_ESTIMATE } from '../../format/labels.js';
import { StatusBadge, type StatusDomain } from '../badges/status-badge.js';
import { CopyButton } from '../copy-button/copy-button.js';
import { EmptyState } from '../feedback/empty-state.js';
import { FeatureContent, FeatureGate } from './feature-gate.js';

const STATUS_DOMAINS: Readonly<Record<string, StatusDomain>> = {
	room: 'room',
	participant: 'participant',
	egress: 'egress',
	ingress: 'ingress'
};

/** What the title's copy button copies: the name when the list gave one, else the identifier. */
const COPY_LABELS: Readonly<Record<EntityKind, { name: string; id: string }>> = {
	room: { name: 'room name', id: 'room SID' },
	participant: { name: 'identity', id: 'participant SID' },
	egress: { name: 'egress ID', id: 'egress ID' },
	ingress: { name: 'ingress name', id: 'ingress ID' }
};

/**
 * A PRO page in CE: the header of the PRO page (title with its copy button and the status badge) from list data when a
 * list showed the entity, and the full-page lock. It never requests the locked detail; PRO replaces the route with the
 * real page.
 */
@Component({
	selector: 'ovd-locked-page',
	imports: [CopyButton, EmptyState, FeatureContent, FeatureGate, RouterLink, StatusBadge],
	template: `
		<header class="title">
			<h1 class="ovd-page-title">{{ heading() }}</h1>
			@if (copyLabel(); as label) {
				<ovd-copy-button [value]="heading()" [label]="label" />
			}
			@if (preview()?.status; as status) {
				<ovd-status-badge
					[status]="status"
					[domain]="domain()"
					[estimated]="preview()?.estimated ?? false"
					[estimatedHint]="estimate"
				/>
			}
		</header>
		@if (feature(); as feature) {
			<ovd-feature-gate [feature]="feature" variant="page">
				<ng-template ovdFeatureContent>
					<ovd-empty-state icon="construction" heading="Coming in this release" />
				</ng-template>
				@if (parent(); as parent) {
					<a ovdLockAction [routerLink]="parent.path" [queryParams]="parent.rangeScoped ? range() : null"
						>Back to {{ parent.label.toLowerCase() }}</a
					>
				}
			</ovd-feature-gate>
		}
	`,
	styles: `
		.title {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 8px;
			margin-bottom: 16px;

			h1 {
				margin-bottom: 0;
			}
		}
	`
})
export class LockedPage {
	private readonly route = inject(ActivatedRoute);
	private readonly previews = inject(EntityPreviewService);

	protected readonly estimate = RECONCILER_ESTIMATE;
	protected readonly range = inject(ListStateService).rangeParams;
	private readonly data = ownData(this.route.snapshot);
	protected readonly feature = computed<FeatureKey | undefined>(
		() => this.data.page?.feature ?? this.data.navigation?.feature
	);
	protected readonly parent = computed<NavigationMeta | undefined>(() =>
		this.route.parent === null ? undefined : ownData(this.route.parent.snapshot).navigation
	);
	protected readonly entityId = computed(() => {
		const entity = this.data.entity;

		return entity === undefined ? null : this.route.snapshot.paramMap.get(entity.param);
	});
	protected readonly preview = computed(() => {
		const entity = this.data.entity;
		const id = this.entityId();

		return entity === undefined || id === null ? undefined : this.previews.get(entity.kind, id);
	});
	protected readonly domain = computed(() => STATUS_DOMAINS[this.data.entity?.kind ?? 'room'] ?? 'room');
	/** The name from the list (never for egress, titled by its ID), else the identifier, else the page label. */
	protected readonly heading = computed(() => {
		const name = this.data.entity?.kind === 'egress' ? undefined : this.preview()?.name;

		return name ?? this.entityId() ?? this.data.navigation?.label ?? '';
	});
	protected readonly copyLabel = computed(() => {
		const kind = this.data.entity?.kind;
		const id = this.entityId();

		if (kind === undefined || id === null) {
			return null;
		}

		return this.heading() === id ? COPY_LABELS[kind].id : COPY_LABELS[kind].name;
	});
}
