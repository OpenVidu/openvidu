import { FeatureKey } from '@openvidu-dashboard/typings';

import type { RouteRegistry } from '../api/route-registry.js';

/** The locks of the `track-detail` routes: the detail, its subscriptions and its series. */
export function registerTracksRoutes(registry: RouteRegistry): void {
	for (const path of ['', '/subscriptions', '/series']) {
		registry.lock({ method: 'get', path: `/tracks/{sid}${path}`, feature: FeatureKey.TRACK_DETAIL });
	}
}
