import { A11yModule } from '@angular/cdk/a11y';
import { CdkConnectedOverlay, CdkOverlayOrigin, type ConnectedPosition } from '@angular/cdk/overlay';
import {
	Component,
	computed,
	effect,
	ElementRef,
	inject,
	input,
	Service,
	signal,
	untracked,
	viewChild
} from '@angular/core';
import { TZDate } from '@date-fns/tz';
import { provideDateFnsAdapter } from '@angular/material-date-fns-adapter';
import { MatButton } from '@angular/material/button';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { MatDatepicker, MatDatepickerInput, MatDatepickerToggle } from '@angular/material/datepicker';
import { MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatTimepicker, MatTimepickerInput, MatTimepickerToggle } from '@angular/material/timepicker';
import { formatRetentionLength, RANGE_PRESET_FROM, type RangePreset } from '@openvidu-dashboard/typings';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';

import { browserTimeZone } from '../../core/preferences/preferences.js';
import { ListStateService } from '../../core/state/list-state.js';
import { QueryStateService, type RangeParams } from '../../core/state/query-state.js';
import { resolveRange } from '../../core/state/relative-time.js';
import { formatNumber } from '../../format/formatters.js';
import { ZoneSelect } from '../zone/zone-select.js';

/** Opens the range picker of the header from a page, e.g. its "Widen range" action. */
@Service()
export class RangePickerService {
	private readonly count = signal(0);

	readonly requests = this.count.asReadonly();

	open(): void {
		this.count.update((count) => count + 1);
	}
}

export const RANGE_PRESET_LABELS: Readonly<Record<RangePreset, string>> = {
	'1h': 'Last hour',
	'6h': 'Last 6 hours',
	'24h': 'Last 24 hours',
	'7d': 'Last 7 days',
	'30d': 'Last 30 days',
	'90d': 'Last 90 days',
	month: 'This month'
};

const PRESETS = Object.keys(RANGE_PRESET_FROM) as RangePreset[];
const POSITIONS: ConnectedPosition[] = [
	{ originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 4 },
	{ originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 }
];

/** The preset a range corresponds to, or `null` for a custom range. */
export function presetOf(range: Pick<RangeParams, 'from' | 'to'>): RangePreset | null {
	return range.to === 'now' ? (PRESETS.find((preset) => RANGE_PRESET_FROM[preset] === range.from) ?? null) : null;
}

/** ISO 8601 to the minute, with the zone's offset, of a wall-clock date and time in `tz`. */
export function wallClockToIso(date: Date, time: Date, tz: string): string {
	const zoned = new TZDate(
		date.getFullYear(),
		date.getMonth(),
		date.getDate(),
		time.getHours(),
		time.getMinutes(),
		tz
	);

	return format(zoned, "yyyy-MM-dd'T'HH:mmXXX");
}

/** A wall-clock `Date` (browser zone) showing the instant as seen in `tz`, for the date and time inputs. */
export function instantToWallClock(instant: Date, tz: string): Date {
	const zoned = new TZDate(instant.getTime(), tz);

	return new Date(zoned.getFullYear(), zoned.getMonth(), zoned.getDate(), zoned.getHours(), zoned.getMinutes());
}

/**
 * The header range picker: presets kept relative in the URL, a custom range to the minute in the selected zone, the zone
 * select and the UTC toggle. It validates `from < to`, warns when the range starts before the page's retention, and
 * writes through `QueryStateService` (which drops the cursor).
 */
@Component({
	selector: 'ovd-date-time-range-picker',
	imports: [
		A11yModule,
		CdkConnectedOverlay,
		CdkOverlayOrigin,
		MatButton,
		MatDatepicker,
		MatDatepickerInput,
		MatDatepickerToggle,
		MatFormField,
		MatIcon,
		MatInput,
		MatLabel,
		MatSlideToggle,
		MatSuffix,
		MatTimepicker,
		MatTimepickerInput,
		MatTimepickerToggle,
		ZoneSelect
	],
	providers: [
		{ provide: MAT_DATE_LOCALE, useValue: enUS },
		provideDateFnsAdapter({
			parse: { dateInput: 'yyyy-MM-dd', timeInput: 'HH:mm' },
			display: {
				dateInput: 'yyyy-MM-dd',
				timeInput: 'HH:mm',
				monthYearLabel: 'LLL uuuu',
				dateA11yLabel: 'PP',
				monthYearA11yLabel: 'LLLL uuuu',
				timeOptionLabel: 'HH:mm'
			}
		})
	],
	templateUrl: './date-time-range-picker.html',
	styleUrl: './date-time-range-picker.scss'
})
export class DateTimeRangePicker {
	private readonly query = inject(QueryStateService);
	private readonly openRequests = inject(RangePickerService).requests;
	private readonly listState = inject(ListStateService);
	private readonly trigger = viewChild.required<string, ElementRef<HTMLButtonElement>>('trigger', {
		read: ElementRef
	});

	/** `full`: preset, absolute range and zone; `compact`: preset and zone; `minimal`: preset only. */
	readonly display = input<'full' | 'compact' | 'minimal'>('full');
	/** Retention of the page's data; a range starting earlier shows a warning. */
	readonly retentionMs = input<number | null>(null);

	protected readonly open = signal(false);
	protected readonly positions = POSITIONS;
	protected readonly presets = PRESETS;
	protected readonly labels = RANGE_PRESET_LABELS;
	protected readonly range = this.listState.range;
	protected readonly preset = computed(() => presetOf(this.range()));
	protected readonly resolved = computed(() => resolveRange(this.range(), new Date()));
	protected readonly label = computed(() => {
		const preset = this.preset();

		return preset === null ? 'Custom range' : RANGE_PRESET_LABELS[preset];
	});
	protected readonly absolute = computed(() => {
		const resolved = this.resolved();
		const tz = this.range().tz;

		if (resolved === undefined) {
			return '';
		}

		const show = (date: Date): string => format(new TZDate(date.getTime(), tz), 'yyyy-MM-dd HH:mm');

		return `${show(resolved.from)} → ${show(resolved.to)}`;
	});

	protected readonly fromDate = signal<Date | null>(null);
	protected readonly fromTime = signal<Date | null>(null);
	protected readonly toDate = signal<Date | null>(null);
	protected readonly toTime = signal<Date | null>(null);
	protected readonly error = signal<string | null>(null);
	protected readonly utc = computed(() => this.range().tz === 'UTC');
	/** The custom start `toggle()` filled in: until it is edited, the warning follows the applied range. */
	private filledFrom: { date: Date | null; time: Date | null } = { date: null, time: null };
	protected readonly retentionWarning = computed(() => {
		const retention = this.retentionMs();

		if (retention === null) {
			return null;
		}

		// One instant for the range and the boundary, so that a preset as long as the retention never warns.
		const now = new Date();
		const from = this.warnedFrom(now);

		if (from === undefined || from.getTime() >= now.getTime() - retention) {
			return null;
		}

		return `Data older than ${formatRetentionLength(retention, { formatCount: formatNumber })} is not retained.`;
	});

	constructor() {
		let handled = untracked(this.openRequests);

		effect(() => {
			const requests = this.openRequests();

			if (requests !== handled) {
				handled = requests;
				untracked(() => {
					if (!this.open()) {
						this.toggle();
					}
				});
			}
		});
	}

	protected toggle(): void {
		if (this.open()) {
			this.close();

			return;
		}

		const resolved = resolveRange(this.range(), new Date());
		const tz = this.range().tz;

		if (resolved !== undefined) {
			const from = instantToWallClock(resolved.from, tz);
			const to = instantToWallClock(resolved.to, tz);

			this.filledFrom = { date: from, time: from };
			this.fromDate.set(from);
			this.fromTime.set(from);
			this.toDate.set(to);
			this.toTime.set(to);
		}

		this.error.set(null);
		this.open.set(true);
	}

	/** The start the warning checks: the edited custom start, or the applied range resolved at `now`. */
	private warnedFrom(now: Date): Date | undefined {
		const date = this.fromDate();
		const time = this.fromTime();

		if (date === this.filledFrom.date && time === this.filledFrom.time) {
			return resolveRange(this.range(), now)?.from;
		}

		return date === null || time === null ? undefined : new Date(wallClockToIso(date, time, this.range().tz));
	}

	protected close(): void {
		this.open.set(false);
		this.trigger().nativeElement.focus();
	}

	protected choosePreset(preset: RangePreset): void {
		void this.query.navigate({ from: RANGE_PRESET_FROM[preset], to: 'now', tz: this.range().tz });
		this.close();
	}

	protected applyCustom(): void {
		const [fromDate, fromTime, toDate, toTime] = [this.fromDate(), this.fromTime(), this.toDate(), this.toTime()];

		if (fromDate === null || fromTime === null || toDate === null || toTime === null) {
			this.error.set('Enter a start and an end');

			return;
		}

		const tz = this.range().tz;
		const from = wallClockToIso(fromDate, fromTime, tz);
		const to = wallClockToIso(toDate, toTime, tz);

		if (new Date(from).getTime() >= new Date(to).getTime()) {
			this.error.set('End must be after start');

			return;
		}

		void this.query.navigate({ from, to, tz });
		this.close();
	}

	/** The zone of the session; the default zone of Settings stays as it is. */
	protected chooseZone(zone: string): void {
		void this.query.navigate({ tz: zone });
	}

	protected setUtc(on: boolean): void {
		void this.query.navigate({ tz: on ? 'UTC' : browserTimeZone() });
	}
}
