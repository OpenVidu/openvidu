import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { computed, inject, Service } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

export type ScreenSize = 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge';

const QUERIES: readonly [ScreenSize, string][] = [
	['xsmall', Breakpoints.XSmall],
	['small', Breakpoints.Small],
	['medium', Breakpoints.Medium],
	['large', Breakpoints.Large],
	['xlarge', Breakpoints.XLarge]
];

/** The Material CDK breakpoint of the viewport as a signal. */
@Service()
export class BreakpointService {
	private readonly observer = inject(BreakpointObserver);

	readonly size = toSignal(
		this.observer
			.observe(QUERIES.map(([, query]) => query))
			.pipe(map((state) => QUERIES.find(([, query]) => state.breakpoints[query])?.[0] ?? 'large')),
		{ initialValue: 'large' }
	);

	/** Below 600 px. */
	readonly handset = computed(() => this.size() === 'xsmall');
	/** At least 1280 px. */
	readonly desktop = computed(() => this.size() === 'large' || this.size() === 'xlarge');
}
