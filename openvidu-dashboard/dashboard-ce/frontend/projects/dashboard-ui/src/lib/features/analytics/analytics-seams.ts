import { InjectionToken, type Signal, type Type } from '@angular/core';
import type {
	AnalyticsBreakdown,
	AnalyticsDimension,
	AnalyticsMetric,
	AnalyticsMetricInfo,
	AnalyticsScope,
	FeatureKey
} from '@openvidu-dashboard/typings';

import type { BreakdownEntry, ChartSeries } from '../../charts/chart-options.js';
import type { AnalyticsState } from './analytics-data.js';

/** Slots of the PRO strip of the Analytics page, in page order. */
export type AnalyticsProSlot = 'quality' | 'diagnostics' | 'topRooms';

/** What the page renders the compact lock of a PRO card from while its feature is disabled. */
export interface AnalyticsProSlotFacts {
	slot: AnalyticsProSlot;
	heading: string;
	sectionId: string;
	feature: FeatureKey;
	exportable: boolean;
}

export const ANALYTICS_PRO_SLOTS: readonly AnalyticsProSlotFacts[] = [
	{ slot: 'quality', heading: 'Quality', sectionId: 'quality', feature: 'analytics-quality', exportable: true },
	{
		slot: 'diagnostics',
		heading: 'Diagnostics',
		sectionId: 'diagnostics',
		feature: 'analytics-diagnostics',
		exportable: true
	},
	{
		slot: 'topRooms',
		heading: 'Top rooms',
		sectionId: 'top-rooms',
		feature: 'analytics-top-rooms',
		exportable: false
	}
];

/**
 * A PRO card of the Analytics page: its component, loaded once the feature is enabled and rendered with the
 * {@link AnalyticsPageContext}, the metrics and dimensions it adds to the page's combined requests, and the info
 * (granularity rules) of the metrics the CE info does not describe.
 */
export interface AnalyticsProCard {
	loadComponent: () => Promise<Type<unknown>>;
	metrics?: readonly AnalyticsMetric[];
	dimensions?: readonly AnalyticsDimension[];
	metricInfo?: Readonly<Partial<Record<AnalyticsMetric, AnalyticsMetricInfo>>>;
}

/** The PRO cards by slot; CE provides none and renders the locks. */
export const ANALYTICS_PRO_CARDS = new InjectionToken<Readonly<Partial<Record<AnalyticsProSlot, AnalyticsProCard>>>>(
	'ANALYTICS_PRO_CARDS',
	{ factory: () => ({}) }
);

/** Loads the scope select of the page header, shown with `per-node-breakdown`; CE renders the locked select. */
export const ANALYTICS_SCOPE_SELECT = new InjectionToken<(() => Promise<Type<unknown>>) | null>(
	'ANALYTICS_SCOPE_SELECT',
	{ factory: () => null }
);

/** Loading, error and empty state of an analytics card. */
export interface AnalyticsCardView {
	loading: boolean;
	error: unknown;
	empty: boolean;
}

/** Metrics or dimensions of a CSV export. */
export interface AnalyticsExportItems {
	metrics?: readonly AnalyticsMetric[];
	dimensions?: readonly AnalyticsDimension[];
}

/** What the Analytics page shares with the components of its seams. */
export abstract class AnalyticsPageContext {
	/** Range, requested and effective granularity, and scope. */
	abstract readonly state: Signal<AnalyticsState>;
	abstract readonly tz: Signal<string>;
	/** Refreshes of the page, from 1: a card with requests of its own reloads when it changes. */
	abstract readonly refreshes: Signal<number>;
	/** The series of `metrics` from the combined series requests. */
	abstract chart(metrics: readonly AnalyticsMetric[]): ChartSeries[];
	/** Axis range of the series of `metric`. */
	abstract chartRange(metric: AnalyticsMetric): { from: string; to: string };
	/** Bucket and zone note of the chart of `metric`. */
	abstract note(metric: AnalyticsMetric): string;
	abstract breakdown(dimension: AnalyticsDimension): AnalyticsBreakdown | undefined;
	/** The breakdown entries of `dimension`, its keys labelled from `labels` (matched case-insensitively). */
	abstract entries(dimension: AnalyticsDimension, labels?: Readonly<Record<string, string>>): BreakdownEntry[];
	/** Loading, error and empty state of a card drawing `metrics` and `dimensions`. */
	abstract view(metrics: readonly AnalyticsMetric[], dimensions?: readonly AnalyticsDimension[]): AnalyticsCardView;
	/** Downloads the CSV of a card; a failure is toasted. */
	abstract exportCsv(card: string, items: AnalyticsExportItems): Promise<void>;
	abstract isExporting(card: string): boolean;
	/** Opens the range picker. */
	abstract widenRange(): void;
	abstract retry(): void;
	abstract setScope(scope: AnalyticsScope): void;
}
