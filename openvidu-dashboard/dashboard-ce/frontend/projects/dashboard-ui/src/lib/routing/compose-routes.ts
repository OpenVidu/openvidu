import { inject } from '@angular/core';
import type { CanMatchFn, Route, Routes } from '@angular/router';
import type { FeatureKey, NavigationMeta } from '@openvidu-dashboard/typings';

import { FeatureService } from '../core/info.js';
import type { DashboardRouteData } from '../core/state/route-state.js';

/** A route of the dashboard whose `data` follows `DashboardRouteData`. */
export type DashboardRoute = Omit<Route, 'data' | 'children'> & {
	data?: DashboardRouteData;
	children?: DashboardRoute[];
};

function mergeRoute(base: DashboardRoute, override: DashboardRoute): DashboardRoute {
	const merged: DashboardRoute = { ...base, ...override, data: { ...base.data, ...override.data } };

	if (base.children !== undefined && override.children !== undefined) {
		merged.children = mergeLevel(base.children, override.children);
	}

	if (override.component !== undefined) {
		delete merged.loadComponent;
	}

	if (override.loadComponent !== undefined) {
		delete merged.component;
	}

	if (override.loadChildren !== undefined) {
		delete merged.children;
	}

	return merged;
}

function mergeLevel(base: readonly DashboardRoute[], overrides: readonly DashboardRoute[]): DashboardRoute[] {
	const result = [...base];

	for (const route of overrides) {
		const index = result.findIndex((candidate) => candidate.path === route.path);
		const existing = result[index];

		if (existing === undefined) {
			const wildcard = result.findIndex((candidate) => candidate.path === '**');

			result.splice(wildcard === -1 ? result.length : wildcard, 0, route);
		} else {
			result[index] = mergeRoute(existing, route);
		}
	}

	return result;
}

/** Matches only while the edition has `feature`, so the router falls through to the catch-all route. */
function featureMatch(feature: FeatureKey): CanMatchFn {
	return () => inject(FeatureService).enabled(feature);
}

/** Routes whose navigation entry is hidden without its feature match only with it. */
function hideWithoutFeature(routes: readonly DashboardRoute[]): DashboardRoute[] {
	return routes.map((route) => {
		const navigation = route.data?.navigation;
		const feature = navigation?.hiddenWithoutFeature === true ? navigation.feature : undefined;

		return {
			...route,
			...(route.children === undefined ? {} : { children: hideWithoutFeature(route.children) }),
			...(feature === undefined ? {} : { canMatch: [...(route.canMatch ?? []), featureMatch(feature)] })
		};
	});
}

/**
 * Composes route configs: a later config replaces the earlier route with the same path at the same level, keeping the
 * earlier `data` keys it does not set (so a PRO page keeps the CE navigation metadata) and merging children by path.
 * New paths are inserted before a catch-all route. A route whose entry is hidden without its feature matches only with
 * the feature.
 */
export function composeRoutes(...configs: readonly (readonly DashboardRoute[])[]): Routes {
	return hideWithoutFeature(configs.reduce<DashboardRoute[]>((composed, config) => mergeLevel(composed, config), []));
}

function collect(routes: readonly Route[], entries: NavigationMeta[]): void {
	for (const route of routes) {
		const navigation = (route.data as DashboardRouteData | undefined)?.navigation;

		if (navigation) {
			entries.push(navigation);
		}

		if (route.children) {
			collect(route.children, entries);
		}
	}
}

/** Sidenav entries of a route tree, in `order`. */
export function navigationEntries(routes: readonly Route[]): NavigationMeta[] {
	const entries: NavigationMeta[] = [];

	collect(routes, entries);

	return entries.sort((a, b) => a.order - b.order);
}
