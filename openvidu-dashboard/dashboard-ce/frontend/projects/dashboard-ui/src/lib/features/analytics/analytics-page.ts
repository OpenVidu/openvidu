import { NgComponentOutlet } from '@angular/common';
import { Component, computed, effect, forwardRef, inject, signal, type Type, untracked } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatTooltip } from '@angular/material/tooltip';
import {
	ANALYTICS_SCOPE_PATTERN,
	type AnalyticsBreakdown,
	type AnalyticsBreakdownsResponse,
	type AnalyticsBucketGranularity,
	type AnalyticsDimension,
	type AnalyticsGranularity,
	type AnalyticsMetric,
	type AnalyticsScope,
	type AnalyticsSeriesResponse,
	type AnalyticsSummary,
	type FeatureKey,
	formatRetentionLength,
	type ParticipantKind,
	VISIBLE_PARTICIPANT_KINDS
} from '@openvidu-dashboard/typings';

import { BreakdownChart } from '../../charts/breakdown-chart.js';
import { seriesNote } from '../../charts/chart-note.js';
import type { BreakdownEntry, ChartSeries } from '../../charts/chart-options.js';
import { TimeSeriesChart } from '../../charts/time-series-chart/time-series-chart.js';
import { RangePickerService } from '../../components/date-time-range-picker/date-time-range-picker.js';
import { errorMessage } from '../../components/feedback/error-banner.js';
import { Notice } from '../../components/feedback/notice.js';
import { KpiTile } from '../../components/tiles/kpi-tile.js';
import { TileRow } from '../../components/tiles/tile-row.js';
import { toApiRequestError } from '../../core/http/api-error.js';
import { InfoService } from '../../core/info.js';
import { injectListLoader } from '../../core/refresh/list-loader.js';
import { ListStateService } from '../../core/state/list-state.js';
import { QueryStateService } from '../../core/state/query-state.js';
import { resolveRange } from '../../core/state/relative-time.js';
import { ToastService } from '../../core/ui/toast.js';
import { formatBytes, formatDuration, formatNumber, formatPercent } from '../../format/formatters.js';
import { INFO_TEXTS } from '../../format/info-texts.js';
import {
	CONNECTION_TYPE_LABELS,
	EGRESS_TYPE_LABELS,
	INGRESS_INPUT_LABELS,
	OS_LABELS,
	PARTICIPANT_KIND_LABELS,
	SDK_LABELS
} from '../../format/labels.js';
import { bandwidthLines } from '../rooms/room-display.js';
import { AnalyticsCard, CardContent } from './analytics-card.js';
import {
	AnalyticsDataService,
	type AnalyticsPlan,
	analyticsPlan,
	type AnalyticsState,
	metricInfo
} from './analytics-data.js';
import {
	autoGranularity,
	DEFAULT_ROLLUPS_5MIN_RETENTION_MS,
	effectiveGranularity,
	GRANULARITY_LABELS,
	type GranularityContext,
	granularityOptions,
	hourlyGranularity,
	validGranularity
} from './analytics-granularity.js';
import {
	ANALYTICS_PRO_CARDS,
	ANALYTICS_PRO_SLOTS,
	ANALYTICS_SCOPE_SELECT,
	type AnalyticsCardView,
	type AnalyticsExportItems,
	AnalyticsPageContext,
	type AnalyticsProSlot,
	type AnalyticsProSlotFacts
} from './analytics-seams.js';

const NOT_PROVIDED = 'Not provided by this server version';

function retentionLength(ms: number): string {
	return formatRetentionLength(ms, { formatCount: formatNumber });
}

/** A request of a refresh: its body, or why it failed. */
interface Settled<T> {
	value: T | null;
	error: unknown;
}

interface AnalyticsResult {
	plan: AnalyticsPlan;
	summary: Settled<AnalyticsSummary>;
	/** One per series request of the plan. */
	series: Settled<AnalyticsSeriesResponse>[];
	breakdowns: Settled<AnalyticsBreakdownsResponse>;
}

/** Labels and colour entities of the series the page draws. */
const SERIES_LABELS: Partial<Record<AnalyticsMetric, { label: string; entity: string }>> = {
	roomsCreated: { label: 'Created', entity: 'publish' },
	roomsEnded: { label: 'Ended', entity: 'subscribe' },
	participantsJoined: { label: 'Joined', entity: 'sessions' },
	participantsAborted: { label: 'Aborted', entity: 'aborted' },
	connectionSuccessRate: { label: 'Connection success', entity: 'sessions' },
	uniqueIdentities: { label: 'Unique identities', entity: 'unique' },
	bytesUp: { label: 'Up', entity: 'up' },
	bytesDown: { label: 'Down', entity: 'down' },
	egressStarted: { label: 'Started', entity: 'sessions' },
	egressDurationMs: { label: 'Duration', entity: 'track' },
	scoreAvg: { label: 'Average score', entity: 'sessions' },
	poorSamples: { label: 'Poor samples', entity: 'web' },
	lostSamples: { label: 'Lost samples', entity: 'failed' },
	tracksSubscribeFailed: { label: 'Subscribe failures', entity: 'failed' },
	ingressSessions: { label: 'Sessions', entity: 'sessions' }
};

/** Labels of the breakdown keys of the CE dimensions, matched case-insensitively; browsers read as stored. */
const DIMENSION_LABELS: Partial<Record<AnalyticsDimension, Readonly<Record<string, string>>>> = {
	sdk: lowerKeys(SDK_LABELS),
	os: lowerKeys(OS_LABELS),
	connectionType: lowerKeys(CONNECTION_TYPE_LABELS),
	kind: lowerKeys(PARTICIPANT_KIND_LABELS),
	egressType: lowerKeys(EGRESS_TYPE_LABELS),
	ingressInputType: lowerKeys(INGRESS_INPUT_LABELS)
};

function lowerKeys(labels: Readonly<Record<string, string>>): Record<string, string> {
	return Object.fromEntries(Object.entries(labels).map(([key, label]) => [key.toLowerCase(), label]));
}

/** The label of a breakdown key, or the key as stored. */
export function dimensionLabel(dimension: AnalyticsDimension, key: string): string {
	return DIMENSION_LABELS[dimension]?.[key.toLowerCase()] ?? key;
}

function settle<T>(promise: Promise<T>): Promise<Settled<T>> {
	return promise.then(
		(value) => ({ value, error: null }),
		(error: unknown) => ({ value: null, error: error ?? new Error('Request failed') })
	);
}

function count(value: number | undefined): string | null {
	return value === undefined ? null : formatNumber(value);
}

/**
 * Usage of the deployment over the global range, loaded on demand: KPI tiles, the Rooms, Participants, Client
 * breakdowns, Data transferred, Egress and Ingress sections, and the PRO strip, whose slots render the
 * `ANALYTICS_PRO_CARDS` components or their locks; the `ANALYTICS_SCOPE_SELECT` of the header narrows every section to
 * one node. The page is the {@link AnalyticsPageContext} of those components.
 */
@Component({
	selector: 'ovd-analytics-page',
	imports: [
		AnalyticsCard,
		BreakdownChart,
		CardContent,
		KpiTile,
		MatButton,
		MatFormField,
		MatIcon,
		MatLabel,
		MatOption,
		MatSelect,
		MatSuffix,
		MatTooltip,
		NgComponentOutlet,
		Notice,
		TileRow,
		TimeSeriesChart
	],
	providers: [{ provide: AnalyticsPageContext, useExisting: forwardRef(() => AnalyticsPage) }],
	templateUrl: './analytics-page.html',
	styleUrl: './analytics-page.scss'
})
export class AnalyticsPage implements AnalyticsPageContext {
	protected readonly infoTexts = INFO_TEXTS;
	private readonly data = inject(AnalyticsDataService);
	private readonly query = inject(QueryStateService);
	private readonly listState = inject(ListStateService);
	private readonly info = inject(InfoService);
	private readonly rangePicker = inject(RangePickerService);
	private readonly toast = inject(ToastService);

	readonly tz = this.query.tz;
	protected readonly granularityLabels = GRANULARITY_LABELS;
	protected readonly proSlots = ANALYTICS_PRO_SLOTS;
	private readonly proCards = inject(ANALYTICS_PRO_CARDS);
	private readonly loadScopeSelect = inject(ANALYTICS_SCOPE_SELECT);
	/** Components of the seams, loaded once their feature is enabled. */
	protected readonly proComponents = signal<Partial<Record<AnalyticsProSlot, Type<unknown>>>>({});
	protected readonly scopeSelect = signal<Type<unknown> | null>(null);
	private readonly loading = new Set<string>();
	/** Last successful body of each request, kept on its card while a later refresh of the same request fails. */
	private readonly lastValues = new Map<string, unknown>();

	private readonly features = this.info.features;
	protected readonly perNode = computed(() => this.features().has('per-node-breakdown'));
	protected readonly perNodeLockHint = 'Per-node analytics is available in OpenVidu PRO';
	private readonly retention = computed(() => this.info.info()?.retention);

	/** The range resolved when the URL changes; the clock does not move it. */
	private readonly context = computed<GranularityContext | null>(() => {
		const now = new Date();
		const resolved = resolveRange(this.listState.range(), now);

		return resolved === undefined
			? null
			: {
					from: resolved.from,
					to: resolved.to,
					now,
					rollups5MinRetentionMs: this.retention()?.rollups5MinMs ?? DEFAULT_ROLLUPS_5MIN_RETENTION_MS
				};
	});
	protected readonly options = computed(() => {
		const context = this.context();

		return context === null ? [] : granularityOptions(context);
	});
	protected readonly granularity = computed<AnalyticsGranularity>(() => {
		const context = this.context();

		return context === null ? 'auto' : validGranularity(this.query.value('granularity'), context);
	});
	protected readonly effective = computed<AnalyticsBucketGranularity>(() => {
		const context = this.context();

		return context === null ? '1h' : effectiveGranularity(this.granularity(), context);
	});
	/** Hourly-only metrics are requested at one hour while the page shows finer buckets. */
	protected readonly hourlySplit = computed(() => hourlyGranularity(this.effective()) !== this.effective());
	protected readonly scope = computed<AnalyticsScope>(() => {
		const value = this.query.value('scope');

		return this.perNode() && value !== null && ANALYTICS_SCOPE_PATTERN.test(value)
			? (value as AnalyticsScope)
			: 'global';
	});
	readonly state = computed<AnalyticsState>(() => ({
		range: this.listState.range(),
		granularity: this.granularity(),
		effective: this.effective(),
		scope: this.scope()
	}));
	private readonly cards = Object.values(this.proCards);
	private readonly plan = computed(() => analyticsPlan(this.state(), this.features(), this.cards));

	readonly refreshes = signal(0);
	protected readonly exporting = signal<ReadonlySet<string>>(new Set());

	private readonly loader = injectListLoader({
		request: computed(() => ({ state: this.state(), plan: this.plan() })),
		manual: true,
		fetch: ({ state, plan }) => this.fetch(state, plan)
	});

	protected readonly result = this.loader.data;
	protected readonly summary = computed(() => this.result()?.summary.value ?? null);

	protected readonly title = computed(() =>
		this.scope() === 'global' ? 'Analytics' : `Analytics · ${this.scope()}`
	);
	/** Names what `auto` resolves to for the range, whatever value is selected. */
	protected readonly autoLabel = computed(() => {
		const context = this.context();

		return `auto (${GRANULARITY_LABELS[context === null ? this.effective() : autoGranularity(context)]})`;
	});
	/** The series of every chart, recomputed only when a response arrives, so charts never redraw on their own. */
	protected readonly charts = computed(() => {
		this.result();

		return {
			rooms: this.chart(['roomsCreated', 'roomsEnded']),
			participants: this.chart(['participantsJoined', 'participantsAborted']),
			success: this.chart(['connectionSuccessRate']),
			identities: this.chart(['uniqueIdentities']),
			bytes: this.chart(['bytesUp', 'bytesDown']),
			egressStarted: this.chart(['egressStarted']),
			egressEnded: this.chart(['egressEnded']),
			ingress: this.chart(['ingressSessions'])
		};
	});
	/** The breakdown entries of every chart, recomputed only when a response arrives. */
	protected readonly breakdowns = computed(() => {
		this.result();

		return {
			kind: this.entries('kind'),
			sdk: this.entries('sdk'),
			os: this.entries('os'),
			browser: this.entries('browser'),
			connectionType: this.entries('connectionType'),
			egressType: this.entries('egressType'),
			ingressInputType: this.entries('ingressInputType')
		};
	});
	protected readonly retentionBanner = computed(() => {
		const retention = this.retention();
		const context = this.context();

		if (retention === undefined || context === null) {
			return null;
		}

		const age = context.now.getTime() - context.from.getTime();

		if (retention.rollupsDailyMs !== null && age > retention.rollupsDailyMs) {
			return `Daily data older than ${retentionLength(retention.rollupsDailyMs)} is not retained`;
		}

		if (age > retention.rollupsHourlyMs) {
			const length = retentionLength(retention.rollupsHourlyMs);

			return this.effective() === '1d'
				? `Hourly data older than ${length} is not retained; daily values are shown`
				: `Hourly data older than ${length} is not retained`;
		}

		return null;
	});

	constructor() {
		effect(() => {
			const features = this.features();

			untracked(() => {
				this.loadSeams(features);
			});
		});
		effect(() => {
			const scope = this.query.value('scope');

			if (this.info.info() !== null && scope !== null && this.scope() !== scope) {
				untracked(() => void this.query.navigate({ scope: null }, { replaceUrl: true }));
			}
		});
	}

	// Tiles

	protected tile(value: number | undefined): string | null {
		return this.summary() === null ? null : (count(value) ?? 'n/a');
	}

	protected percentTile(value: number | undefined): string | null {
		return this.summary() === null ? null : value === undefined ? 'n/a' : formatPercent(value / 100);
	}

	protected identitiesLabel(): string {
		const days = this.summary()?.uniqueIdentities?.days;

		return days === undefined ? 'Unique identities' : `Unique identities (sum of ${String(days)} UTC days)`;
	}

	protected bandwidthTile(): [string, string] | null {
		const summary = this.summary();

		return summary === null ? null : bandwidthLines({ up: summary.bytesUp, down: summary.bytesDown });
	}

	protected bytesTile(value: number | undefined, arrow: string): string | null {
		return value === undefined ? null : `${arrow} ${formatBytes(value)}`;
	}

	protected durationTile(ms: number | undefined): string | null {
		return this.summary() === null ? null : ms === undefined ? 'n/a' : formatDuration(ms);
	}

	protected totalHint(ms: number | undefined): string | undefined {
		return ms === undefined ? undefined : `${formatDuration(ms)} in total`;
	}

	protected avgRoomSize(): string | null {
		const summary = this.summary();

		if (summary === null) {
			return null;
		}

		if (summary.avgRoomSize === undefined) {
			return 'n/a';
		}

		const size = Math.round(summary.avgRoomSize);

		return `${formatNumber(size)} participant${size === 1 ? '' : 's'}`;
	}

	protected avgRoomDuration(): string | null {
		const summary = this.summary();

		if (summary === null) {
			return null;
		}

		return summary.avgRoomDurationMs === undefined ? 'n/a' : formatDuration(summary.avgRoomDurationMs);
	}

	protected missingHint(value: unknown, hint = NOT_PROVIDED): string | undefined {
		return this.summary() !== null && value === undefined ? hint : undefined;
	}

	// Series and breakdowns

	/** The series of `metrics` (and the expansions of `egressEnded`) from the request that holds them. */
	chart(metrics: readonly AnalyticsMetric[]): ChartSeries[] {
		return metrics.flatMap((metric) => {
			const response = this.responseOf(metric)?.value;

			if (response === null || response === undefined) {
				return [];
			}

			if (metric === 'egressEnded') {
				return response.series
					.filter((series) => series.name.startsWith('egressEnded.'))
					.map((series) => {
						const status = series.name.slice('egressEnded.'.length);

						return {
							name: status,
							points: series.points,
							entity: `egress_${status.toLowerCase()}`
						};
					});
			}

			const series = response.series.find((item) => item.name === metric);
			const label = SERIES_LABELS[metric];

			if (series === undefined) {
				return [];
			}

			return [
				{
					name: label?.label ?? metric,
					entity: label?.entity ?? metric,
					points:
						metric === 'connectionSuccessRate'
							? series.points.map(([ts, value]) => [ts, value === null ? null : value / 100])
							: series.points
				}
			];
		});
	}

	/** Axis range of the series of `metric`: from its first bucket, which may start before `from`, to `to`. */
	chartRange(metric: AnalyticsMetric): { from: string; to: string } {
		const response = this.responseOf(metric)?.value;
		const context = this.context();

		if (response === null || response === undefined) {
			return { from: context?.from.toISOString() ?? '', to: context?.to.toISOString() ?? '' };
		}

		const first = (response.series.find((series) => series.name === metric) ?? response.series[0])?.points[0]?.[0];

		return { from: first !== undefined && first < response.from ? first : response.from, to: response.to };
	}

	breakdown(dimension: AnalyticsDimension): AnalyticsBreakdown | undefined {
		return this.result()?.breakdowns.value?.breakdowns.find((item) => item.dimension === dimension);
	}

	/** The labelled entries of a breakdown; each keeps its key as the entity its colour follows. */
	entries(dimension: AnalyticsDimension, labels?: Readonly<Record<string, string>>): BreakdownEntry[] {
		const named = labels === undefined ? undefined : lowerKeys(labels);

		const items = (this.breakdown(dimension)?.items ?? []).filter(
			// SIP, CONNECTOR and BRIDGE are not used by OpenVidu yet.
			(item) => dimension !== 'kind' || VISIBLE_PARTICIPANT_KINDS.includes(item.key as ParticipantKind)
		);

		return items.map((item) => ({
			name:
				named === undefined ? dimensionLabel(dimension, item.key) : (named[item.key.toLowerCase()] ?? item.key),
			value: item.count,
			entity: item.key
		}));
	}

	/** The note of a time-series chart: "Hourly" for an hourly-only metric below an hour, else the page bucket; the zone. */
	note(metric: AnalyticsMetric): string {
		const hourly = this.hourlySplit() && metricInfo(metric, this.cards)?.hourlyOnly === true;

		return seriesNote(hourly ? '1h' : this.effective(), this.tz());
	}

	/** Loading, error and empty state of a card that draws `metrics` and `dimensions`. */
	view(metrics: readonly AnalyticsMetric[], dimensions: readonly AnalyticsDimension[] = []): AnalyticsCardView {
		const result = this.result();

		if (result === null) {
			return { loading: true, error: null, empty: false };
		}

		const requests = metrics.map((metric) => this.responseOf(metric));
		const error =
			requests.find((request) => request?.error)?.error ??
			(dimensions.length > 0 ? result.breakdowns.error : null) ??
			null;
		const values = this.chart(metrics).flatMap((series) => series.points.map(([, value]) => value));
		const dimensionValues = dimensions.length > 0 && result.breakdowns.value !== null;
		const totals = dimensions.map((dimension) => this.breakdown(dimension)?.total ?? 0);

		return {
			loading: false,
			error,
			empty:
				values.every((value) => value === null || value === 0) &&
				(!dimensionValues || totals.every((total) => total === 0))
		};
	}

	// Actions

	protected setGranularity(granularity: AnalyticsGranularity): void {
		void this.query.navigate({ granularity: granularity === 'auto' ? null : granularity });
	}

	setScope(scope: AnalyticsScope): void {
		void this.query.navigate({ scope: scope === 'global' ? null : scope });
	}

	widenRange(): void {
		this.rangePicker.open();
	}

	retry(): void {
		void this.loader.scheduler.refresh();
	}

	/** Downloads the CSV of a card: its series at the coarsest granularity it draws, or its breakdowns. */
	async exportCsv(card: string, items: AnalyticsExportItems): Promise<void> {
		const state = this.state();
		const metrics = (items.metrics ?? []).filter(
			(metric) => metric !== 'uniqueIdentities' || state.effective === '1d'
		);
		const hourly = metrics.some((metric) => metricInfo(metric, this.cards)?.hourlyOnly === true);

		this.exporting.update((cards) => new Set([...cards, card]));

		try {
			await (metrics.length > 0
				? this.data.exportCsv(state, 'series', {
						metrics,
						granularity: hourly ? hourlyGranularity(state.effective) : state.granularity
					})
				: this.data.exportCsv(state, 'breakdowns', { dimensions: items.dimensions ?? [] }));
		} catch (error) {
			const requestId = toApiRequestError(error).requestId;

			this.toast.show(
				`Export failed: ${errorMessage(error)}${requestId === undefined ? '' : ` Request ${requestId}`}`
			);
		} finally {
			this.exporting.update((cards) => new Set([...cards].filter((item) => item !== card)));
		}
	}

	isExporting(card: string): boolean {
		return this.exporting().has(card);
	}

	private responseOf(metric: AnalyticsMetric): Settled<AnalyticsSeriesResponse> | null {
		const result = this.result();
		const index = result?.plan.series.findIndex((request) => request.metrics.includes(metric)) ?? -1;

		return index < 0 ? null : (result?.series[index] ?? null);
	}

	private async fetch(state: AnalyticsState, plan: AnalyticsPlan): Promise<AnalyticsResult> {
		const base = JSON.stringify(state);

		this.refreshes.update((count) => count + 1);

		const [summary, breakdowns, series] = await Promise.all([
			this.keep(`${base}|summary`, settle(this.data.summary(state))),
			plan.dimensions.length > 0
				? this.keep(`${base}|breakdowns`, settle(this.data.breakdowns(state, plan.dimensions)))
				: Promise.resolve({ value: null, error: null }),
			Promise.all(
				plan.series.map((request) =>
					this.keep(`${base}|${JSON.stringify(request)}`, settle(this.data.series(state, request)))
				)
			)
		]);

		return { plan, summary, breakdowns, series };
	}

	/** The settled request, with the last body of the same request when it failed, so its card keeps the content. */
	private async keep<T>(key: string, request: Promise<Settled<T>>): Promise<Settled<T>> {
		const settled = await request;

		if (settled.error === null) {
			this.lastValues.set(key, settled.value);

			return settled;
		}

		return { value: (this.lastValues.get(key) as T | undefined) ?? null, error: settled.error };
	}

	/** Loads the component of every seam whose feature is enabled, once. */
	private loadSeams(features: ReadonlySet<FeatureKey>): void {
		for (const facts of ANALYTICS_PRO_SLOTS) {
			const card = this.proCards[facts.slot];

			if (card !== undefined && features.has(facts.feature) && !this.loading.has(facts.slot)) {
				this.loading.add(facts.slot);
				void card.loadComponent().then((component) => {
					this.proComponents.update((components) => ({ ...components, [facts.slot]: component }));
				});
			}
		}

		if (this.loadScopeSelect !== null && features.has('per-node-breakdown') && !this.loading.has('scope')) {
			this.loading.add('scope');
			void this.loadScopeSelect().then((component) => {
				this.scopeSelect.set(component);
			});
		}
	}

	protected enabled(facts: AnalyticsProSlotFacts): boolean {
		return this.features().has(facts.feature);
	}
}
