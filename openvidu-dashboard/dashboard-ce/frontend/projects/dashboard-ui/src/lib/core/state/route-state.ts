import { computed, inject, Service, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
	type ActivatedRouteSnapshot,
	NavigationCancel,
	NavigationEnd,
	NavigationError,
	ResolveEnd,
	Router,
	type RouterStateSnapshot
} from '@angular/router';
import type { NavigationMeta, PageMeta } from '@openvidu-dashboard/typings';

import type { EntityKind } from './entity-preview.js';

/** `data` keys the dashboard reads from its routes. */
export interface DashboardRouteData {
	/** Sidenav entry of a top-level page; also its page metadata. */
	navigation?: NavigationMeta;
	/** Page metadata of a route without a sidenav entry. */
	page?: PageMeta;
	/** Crumb of the route: a fixed label, or the value of a route parameter shown with a copy chip. */
	breadcrumb?: string | { param: string };
	/** Entity a detail route shows: its kind and the route parameter holding its identifier. */
	entity?: { kind: EntityKind; param: string };
}

/** The `data` a route declares itself; `route.data` also holds keys inherited from componentless parents. */
export function ownData(route: ActivatedRouteSnapshot): DashboardRouteData {
	return route.routeConfig?.data ?? {};
}

/** The deepest primary route of a snapshot tree. */
export function deepestRoute(root: ActivatedRouteSnapshot): ActivatedRouteSnapshot {
	let route = root;

	while (route.firstChild) {
		route = route.firstChild;
	}

	return route;
}

/** Page metadata of the deepest route that declares it, walking up to the root. */
export function pageMetaOf(route: ActivatedRouteSnapshot): PageMeta | null {
	for (let current: ActivatedRouteSnapshot | null = route; current; current = current.parent) {
		const data = ownData(current);
		const meta = data.page ?? data.navigation;

		if (meta) {
			return meta;
		}
	}

	return null;
}

/**
 * The router state as signals, updated when a navigation is about to activate its routes (so pages read the new query
 * parameters on their first render) and corrected when it is cancelled.
 */
@Service()
export class RouteStateService {
	private readonly router = inject(Router);
	private readonly state = signal<RouterStateSnapshot>(this.router.routerState.snapshot);

	readonly snapshot = this.state.asReadonly();
	readonly queryParamMap = computed(() => this.state().root.queryParamMap);
	readonly deepest = computed(() => deepestRoute(this.state().root));
	readonly pageMeta = computed(() => pageMetaOf(this.deepest()));
	readonly url = computed(() => this.state().url);

	constructor() {
		this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
			if (event instanceof ResolveEnd) {
				this.state.set(event.state);
			} else if (
				event instanceof NavigationEnd ||
				event instanceof NavigationCancel ||
				event instanceof NavigationError
			) {
				this.state.set(this.router.routerState.snapshot);
			}
		});
	}
}
