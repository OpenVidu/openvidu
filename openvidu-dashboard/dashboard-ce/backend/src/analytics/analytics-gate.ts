import {
	ANALYTICS_GLOBAL_ONLY_DIMENSIONS,
	ANALYTICS_GLOBAL_SCOPE,
	ANALYTICS_SCOPE_FEATURE,
	type AnalyticsDimension,
	analyticsDimensionFeature,
	type AnalyticsMetric,
	analyticsMetricFeature,
	type AnalyticsMetricInfo,
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

/**
 * Rejects, in a node scope, the metrics and dimensions served for the global scope only (egress and ingress) with
 * `VALIDATION_ERROR` naming the first one.
 */
export function checkGlobalOnly(
	{ metrics = [], dimensions = [], scope = ANALYTICS_GLOBAL_SCOPE }: AnalyticsRequestItems,
	info: Readonly<Partial<Record<AnalyticsMetric, AnalyticsMetricInfo>>>
): void {
	if (scope === ANALYTICS_GLOBAL_SCOPE) {
		return;
	}

	const metric = metrics.find((item) => info[item]?.globalOnly === true);
	const dimension = dimensions.find((item) => ANALYTICS_GLOBAL_ONLY_DIMENSIONS.includes(item));
	const [path, item] = metric === undefined ? ['dimensions', dimension] : ['metrics', metric];

	if (item !== undefined) {
		throw ApiError.validation([{ path: [path], message: `${item} is only available for the global scope` }]);
	}
}
