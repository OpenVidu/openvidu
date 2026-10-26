import { Component, computed, DestroyRef, inject, InjectionToken, output, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatAutocomplete, MatAutocompleteTrigger, MatOptgroup } from '@angular/material/autocomplete';
import { MatOption } from '@angular/material/core';
import { MatIconButton } from '@angular/material/button';
import { MatFormField, MatHint, MatPrefix, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatTooltip } from '@angular/material/tooltip';
import { type Params, Router } from '@angular/router';
import { entityIdKind, type ListResponse } from '@openvidu-dashboard/typings';
import { catchError, debounceTime, distinctUntilChanged, forkJoin, map, of, Subject, switchMap } from 'rxjs';

import { HttpService } from '../../core/http/http.js';
import type { EntityKind } from '../../core/state/entity-preview.js';
import { ListStateService } from '../../core/state/list-state.js';
import { resolveRange } from '../../core/state/relative-time.js';
import { GLOBAL_SEARCH_ID } from '../../core/ui/focus.js';
import { DETAIL_PATHS, SHORT_SEARCH_HINT } from './list-search.js';

export const SEARCH_DEBOUNCE_MS = 300;
export const SEARCH_LIMIT = 5;

export interface SearchResult {
	label: string;
	secondary?: string;
	/** Absolute path of the detail page. */
	link: string;
}

/** One list endpoint searched by prefix with `q`. */
export interface SearchSource {
	title: string;
	/** API path of the list, e.g. `rooms`. */
	endpoint: string;
	/** UI path of the list, target of "See all in …". */
	listPath: string;
	toResult: (item: Readonly<Record<string, unknown>>) => SearchResult | null;
}

export interface SearchGroup {
	source: SearchSource;
	results: SearchResult[];
	seeAll: string;
}

function text(item: Readonly<Record<string, unknown>>, key: string): string | undefined {
	const value = item[key];

	return typeof value === 'string' && value !== '' ? value : undefined;
}

export const DEFAULT_SEARCH_SOURCES: readonly SearchSource[] = [
	{
		title: 'Rooms',
		endpoint: 'rooms',
		listPath: '/rooms',
		toResult: (item) => {
			const sid = text(item, 'sid');

			return sid === undefined
				? null
				: { label: text(item, 'name') ?? sid, secondary: sid, link: `/rooms/${sid}` };
		}
	},
	{
		title: 'Participants',
		endpoint: 'participants',
		listPath: '/participants',
		toResult: (item) => {
			const sid = text(item, 'sid');

			return sid === undefined
				? null
				: {
						label: text(item, 'identity') ?? sid,
						secondary: text(item, 'roomName') ?? sid,
						link: `/participants/${sid}`
					};
		}
	},
	{
		title: 'Egress',
		endpoint: 'egresses',
		listPath: '/egress',
		toResult: (item) => {
			const id = text(item, 'egressId');

			return id === undefined
				? null
				: { label: id, secondary: text(item, 'roomName') ?? '', link: `/egress/${id}` };
		}
	},
	{
		title: 'Ingress',
		endpoint: 'ingresses',
		listPath: '/ingress',
		toResult: (item) => {
			const id = text(item, 'ingressId');

			return id === undefined ? null : { label: text(item, 'name') ?? id, secondary: id, link: `/ingress/${id}` };
		}
	}
];

/** List endpoints searched by the header; slice changes may replace them. */
export const SEARCH_SOURCES = new InjectionToken<readonly SearchSource[]>('SEARCH_SOURCES', {
	factory: () => DEFAULT_SEARCH_SOURCES
});

/** The entity of an exact ID with a detail page (`RM_`, `PA_`, `EG_`, `IN_`) and that page, or `null`. */
export function exactIdTarget(query: string): { kind: EntityKind; id: string; path: string } | null {
	const id = query.trim();
	const kind = entityIdKind(id);

	return kind === undefined || kind === 'track' ? null : { kind, id, path: `${DETAIL_PATHS[kind]}/${id}` };
}

/** Detail path of an exact ID, or `null`. */
export function sidTarget(query: string): string | null {
	return exactIdTarget(query)?.path ?? null;
}

/**
 * Header search: an exact ID offers "Open <entity> <ID>" and Enter opens its detail (or the locked page in CE); text of at
 * least 2 characters runs one prefix request per list after 300 ms, cancelling the previous ones, and shows up to five
 * results per list with "See all in …".
 */
@Component({
	selector: 'ovd-global-search',
	imports: [
		MatAutocomplete,
		MatAutocompleteTrigger,
		MatFormField,
		MatHint,
		MatIcon,
		MatIconButton,
		MatInput,
		MatOptgroup,
		MatOption,
		MatPrefix,
		MatSuffix,
		MatTooltip
	],
	template: `
		<mat-form-field class="field" subscriptSizing="dynamic">
			<mat-icon matPrefix svgIcon="search" aria-hidden="true" />
			<input
				#box
				matInput
				type="search"
				autocomplete="off"
				aria-label="Search"
				[id]="inputId"
				[matAutocomplete]="results"
				placeholder="Name, identity or ID"
				[value]="query()"
				(input)="onInput($event)"
				(keydown.enter)="onEnter($event)"
			/>
			@if (query() !== '') {
				<button
					matIconButton
					matSuffix
					type="button"
					aria-label="Clear search"
					matTooltip="Clear search"
					(click)="clear(box)"
				>
					<mat-icon svgIcon="close" />
				</button>
			}
			@if (hint(); as hint) {
				<mat-hint>{{ hint }}</mat-hint>
			}
			<mat-autocomplete #results (optionSelected)="open($event.option.value)">
				@if (exact(); as exact) {
					<mat-option class="exact" [value]="exact.link">Open {{ exact.kind }} {{ exact.id }}</mat-option>
				}
				@for (group of groups(); track group.source.endpoint) {
					<mat-optgroup [label]="group.source.title">
						@for (result of group.results; track result.link) {
							<mat-option [value]="result.link">
								<span>{{ result.label }}</span>
								@if (result.secondary) {
									<span class="secondary ovd-mono">{{ result.secondary }}</span>
								}
							</mat-option>
						}
						<mat-option class="see-all" [value]="group.seeAll"
							>See all in {{ group.source.title }}</mat-option
						>
					</mat-optgroup>
				}
				@if (searched() && groups().length === 0) {
					<mat-option disabled value="">No matches</mat-option>
				}
			</mat-autocomplete>
		</mat-form-field>
	`,
	styles: `
		:host {
			display: block;
		}

		.field {
			width: 100%;
			--mat-form-field-container-height: 40px;
			--mat-form-field-container-vertical-padding: 8px;
		}

		.secondary {
			margin-inline-start: 8px;
			color: var(--mat-sys-on-surface-variant);
			font: var(--mat-sys-body-small);
		}

		.see-all {
			color: var(--mat-sys-primary);
		}

		input::-webkit-search-cancel-button {
			appearance: none;
			display: none;
		}
	`
})
export class GlobalSearch {
	private readonly http = inject(HttpService);
	private readonly router = inject(Router);
	private readonly listState = inject(ListStateService);
	private readonly sources = inject(SEARCH_SOURCES);
	private readonly input$ = new Subject<string>();
	private readonly trigger = viewChild.required(MatAutocompleteTrigger);

	/** Id of the input, focused by the `/` shortcut. */
	readonly inputId = GLOBAL_SEARCH_ID;
	/** Emitted after navigating, e.g. to close a mobile search overlay. */
	readonly navigated = output();

	protected readonly query = signal('');
	protected readonly groups = signal<SearchGroup[]>([]);
	protected readonly searched = signal(false);
	protected readonly exact = computed(() => {
		const target = exactIdTarget(this.query());

		return target === null
			? null
			: {
					...target,
					link: this.router.serializeUrl(
						this.router.createUrlTree([target.path], { queryParams: this.listState.rangeParams() })
					)
				};
	});
	protected readonly hint = computed(() =>
		this.query().trim().length === 1 && this.exact() === null ? SHORT_SEARCH_HINT : null
	);

	constructor() {
		this.input$
			.pipe(
				map((value) => value.trim()),
				debounceTime(SEARCH_DEBOUNCE_MS),
				distinctUntilChanged(),
				switchMap((q) => (q.length < 2 || exactIdTarget(q) !== null ? of(null) : this.search(q))),
				takeUntilDestroyed(inject(DestroyRef))
			)
			.subscribe((groups) => {
				this.groups.set(groups ?? []);
				this.searched.set(groups !== null);
			});
	}

	protected onInput(event: Event): void {
		const value = (event.target as HTMLInputElement).value;

		this.query.set(value);
		this.input$.next(value);
	}

	/** Enter on an exact ID opens it with the range, which its breadcrumb carries back. */
	protected onEnter(event: Event): void {
		const target = this.exact();

		if (target !== null) {
			event.preventDefault();
			this.open(target.link);
		}
	}

	/** Empties the box and closes the results, keeping the focus in the box. */
	protected clear(box: HTMLInputElement): void {
		this.query.set('');
		this.input$.next('');
		this.groups.set([]);
		this.searched.set(false);
		this.trigger().closePanel();
		box.focus();
	}

	protected open(url: string): void {
		if (url === '') {
			return;
		}

		void this.router.navigateByUrl(url);
		this.query.set('');
		this.groups.set([]);
		this.searched.set(false);
		this.navigated.emit();
	}

	private search(q: string) {
		const range = this.listState.range();
		const resolved = resolveRange(range, new Date());
		const params: Params = {
			q,
			limit: SEARCH_LIMIT,
			tz: range.tz,
			...(resolved === undefined ? {} : { from: resolved.from.toISOString(), to: resolved.to.toISOString() })
		};

		return forkJoin(
			this.sources.map((source) =>
				this.http.get$<ListResponse<Readonly<Record<string, unknown>>>>(source.endpoint, { params }).pipe(
					map((response): SearchGroup => ({
						source,
						results: response.items.map(source.toResult).filter((result) => result !== null),
						seeAll: this.router.serializeUrl(
							this.router.createUrlTree([source.listPath], {
								queryParams: this.listState.withRange({ q })
							})
						)
					})),
					catchError(() => of(null))
				)
			)
		).pipe(
			map((groups) => groups.filter((group): group is SearchGroup => group !== null && group.results.length > 0))
		);
	}
}
