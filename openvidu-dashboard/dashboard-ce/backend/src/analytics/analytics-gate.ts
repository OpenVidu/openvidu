import {
	ANALYTICS_GLOBAL_SCOPE,
	ANALYTICS_SCOPE_FEATURE,
	type AnalyticsDimension,
	analyticsDimensionFeature,
	type AnalyticsMetric,
	analyticsMetricFeature,
	type FeatureKey
} from '@openvidu-dashboard/typings';

import { ApiError } from '../http/api-error.js';

export interface AnalyticsRequestItems {
	metrics?: readonly AnalyticsMetric[];
	dimensions?: readonly AnalyticsDimension[];
	scope?: string;
}

/**
 * PRO metrics, dimensions and node scopes of an analytics request, allowed by the enabled features: a request with any
 * locked item is rejected whole with `PRO_FEATURE` naming the first one.
 */
export class AnalyticsFeatureGate {
	constructor(private readonly features: () => readonly FeatureKey[]) {}

	check({ metrics = [], dimensions = [], scope = ANALYTICS_GLOBAL_SCOPE }: AnalyticsRequestItems): void {
		const enabled = new Set(this.features());
		const required = [
			...metrics.map(analyticsMetricFeature),
			...dimensions.map(analyticsDimensionFeature),
			scope === ANALYTICS_GLOBAL_SCOPE ? undefined : ANALYTICS_SCOPE_FEATURE
		];
		const locked = required.find((feature) => feature !== undefined && !enabled.has(feature));

		if (locked !== undefined) {
			throw new ApiError('PRO_FEATURE', 'This feature requires OpenVidu PRO', { feature: locked });
		}
	}
}
