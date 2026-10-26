import { computed, inject, Service, signal } from '@angular/core';
import type { ActivatedRouteSnapshot, Params } from '@angular/router';

import { ListStateService } from '../core/state/list-state.js';
import { ownData, RouteStateService } from '../core/state/route-state.js';

export interface BreadcrumbItem {
	label: string;
	/** Absolute path of a crumb link; the last crumb has none. */
	link?: string;
	/** Query parameters of the link, the current range for range-scoped targets. */
	queryParams?: Params;
	/** Value copied by the button next to the current page. */
	copy?: string;
	/** Type of the copied identifier, labelling the button ("Copy room SID"). */
	copyLabel?: string;
}

/** Type of the identifier of each entity route parameter. */
const PARAM_LABELS: Readonly<Record<string, string>> = {
	roomSid: 'room SID',
	participantSid: 'participant SID',
	egressId: 'egress ID',
	ingressId: 'ingress ID'
};

function routePath(route: ActivatedRouteSnapshot): string {
	return (
		'/' +
		route.pathFromRoot
			.flatMap((segment) => segment.url.map((part) => part.path))
			.filter((part) => part !== '')
			.join('/')
	);
}

/**
 * Crumbs of the activated route tree: navigation labels with the range, fixed labels, and an entity parameter as its
 * own value with a copy button, so an entity page reads `<Section> / <identifier>`; the identifier of an entity the
 * server does not know has no copy button.
 */
@Service()
export class BreadcrumbService {
	private readonly routeState = inject(RouteStateService);
	private readonly listState = inject(ListStateService);
	private readonly missing = signal<string | null>(null);

	/** Marks the identifier of the current detail page as unknown to the server, or clears the mark with `null`. */
	setMissing(id: string | null): void {
		this.missing.set(id);
	}

	readonly items = computed<BreadcrumbItem[]>(() => {
		const range = this.listState.rangeParams();
		const items: BreadcrumbItem[] = [];

		for (const route of this.routeState.deepest().pathFromRoot) {
			const data = ownData(route);

			if (data.navigation) {
				items.push({
					label: data.navigation.label,
					link: data.navigation.path,
					...(data.navigation.rangeScoped ? { queryParams: range } : {})
				});
			} else if (typeof data.breadcrumb === 'string') {
				items.push({ label: data.breadcrumb, link: routePath(route) });
			} else if (typeof data.breadcrumb === 'object') {
				const { param } = data.breadcrumb;
				const value = route.paramMap.get(param) ?? '';

				items.push({
					label: value,
					link: routePath(route),
					...(value === this.missing() ? {} : { copy: value, copyLabel: PARAM_LABELS[param] ?? 'identifier' })
				});
			}
		}

		const last = items.at(-1);

		if (last !== undefined) {
			items[items.length - 1] = {
				label: last.label,
				...(last.copy === undefined ? {} : { copy: last.copy, copyLabel: last.copyLabel ?? 'identifier' })
			};
		}

		return items;
	});
}
