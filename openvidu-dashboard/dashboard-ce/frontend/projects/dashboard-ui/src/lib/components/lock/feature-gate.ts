import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, contentChild, Directive, inject, input, TemplateRef } from '@angular/core';
import type { FeatureKey } from '@openvidu-dashboard/typings';

import { FeatureService } from '../../core/info.js';
import { ProLockOverlay } from './pro-lock-overlay.js';

/** Content of a feature gate, instantiated only when the feature is enabled: `<ng-template ovdFeatureContent>`. */
@Directive({ selector: 'ng-template[ovdFeatureContent]' })
export class FeatureContent {
	readonly template = inject(TemplateRef);
}

/** Renders its content when the feature is enabled and the PRO lock otherwise, without any request to the feature. */
@Component({
	selector: 'ovd-feature-gate',
	imports: [NgTemplateOutlet, ProLockOverlay],
	template: `
		@if (enabled()) {
			<ng-container [ngTemplateOutlet]="content()?.template ?? null" />
		} @else {
			<ovd-pro-lock-overlay [feature]="feature()" [variant]="variant()">
				<ng-content select="[ovdLockAction]" ngProjectAs="[ovdLockAction]" />
			</ovd-pro-lock-overlay>
		}
	`
})
export class FeatureGate {
	private readonly features = inject(FeatureService);

	readonly feature = input.required<FeatureKey>();
	readonly variant = input<'page' | 'card'>('card');

	protected readonly content = contentChild(FeatureContent);
	protected readonly enabled = computed(() => this.features.enabled(this.feature()));
}
