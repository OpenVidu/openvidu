import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, Injectable, input, signal, type TemplateRef } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

import { RouteStateService } from '../../core/state/route-state.js';
import { SectionStateService } from '../../core/state/section-state.js';
import { InfoTip } from '../info-tip/info-tip.js';

let nextId = 0;

/** Controls that content of a section renders in the section header, such as the Columns button of its table. */
@Injectable()
export class SectionHeaderActions {
	private readonly registered = signal<readonly TemplateRef<unknown>[]>([]);

	readonly templates = this.registered.asReadonly();

	add(template: TemplateRef<unknown>): void {
		this.registered.update((templates) => (templates.includes(template) ? templates : [...templates, template]));
	}

	remove(template: TemplateRef<unknown>): void {
		this.registered.update((templates) => templates.filter((registered) => registered !== template));
	}
}

/**
 * A collapsible section with title, count, an optional info tip and actions (`[ovdSectionActions]`, then the controls registered through
 * `SectionHeaderActions`); collapse survives refreshes.
 */
@Component({
	selector: 'ovd-section-card',
	imports: [InfoTip, MatIconButton, MatIcon, NgTemplateOutlet],
	providers: [SectionHeaderActions],
	template: `
		<header>
			<button
				matIconButton
				type="button"
				[attr.aria-expanded]="!collapsed()"
				[attr.aria-controls]="bodyId"
				[attr.aria-label]="(collapsed() ? 'Expand ' : 'Collapse ') + heading()"
				(click)="toggle()"
			>
				<mat-icon [svgIcon]="collapsed() ? 'chevron_right' : 'keyboard_arrow_down'" />
			</button>
			<div class="heading-row">
				<h2>
					{{ heading() }}
					@if (count() !== undefined) {
						<span class="count ovd-tabular">({{ count() }})</span>
					}
				</h2>
				@if (info(); as info) {
					<ovd-info-tip [text]="info" [subject]="heading()" />
				}
			</div>
			<div class="actions">
				<ng-content select="[ovdSectionActions]" />
				@for (template of headerActions.templates(); track template) {
					<ng-container [ngTemplateOutlet]="template" />
				}
			</div>
		</header>
		<div class="body" [id]="bodyId" [hidden]="collapsed()"><ng-content /></div>
	`,
	styles: `
		:host {
			display: block;
			border: 1px solid var(--mat-sys-outline-variant);
			border-radius: 12px;
			background: var(--mat-sys-surface-container-lowest);
		}

		header {
			display: flex;
			align-items: center;
			flex-wrap: wrap;
			gap: 8px;
			padding: 8px 16px 8px 8px;
		}

		/* The info tip sits beside the heading, not inside it, so the heading keeps its own accessible name. */
		.heading-row {
			display: flex;
			flex: 1;
			align-items: center;
			min-width: 0;
		}

		.count {
			color: var(--mat-sys-on-surface-variant);
			font-weight: 400;
		}

		.actions {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 8px;
		}

		.body {
			padding: 0 16px 16px;
		}
	`
})
export class SectionCard {
	private readonly sections = inject(SectionStateService);
	private readonly routeState = inject(RouteStateService);
	protected readonly headerActions = inject(SectionHeaderActions);

	readonly heading = input.required<string>();
	readonly count = input<number>();
	/** Explanation of the heading, shown by an info tip after it. */
	readonly info = input<string>();
	/** Key of the section on its page, e.g. `events`. */
	readonly sectionId = input.required<string>();

	protected readonly bodyId = `ovd-section-${String(nextId++)}`;
	private readonly key = computed(() => `${this.routeState.url().split('?')[0] ?? ''}#${this.sectionId()}`);
	protected readonly collapsed = computed(() => this.sections.isCollapsed(this.key()));

	protected toggle(): void {
		this.sections.setCollapsed(this.key(), !this.collapsed());
	}
}
