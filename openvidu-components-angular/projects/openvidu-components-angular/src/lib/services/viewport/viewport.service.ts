import { Injectable, signal, computed, OnDestroy } from '@angular/core';
import { fromEvent, Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PlatformService } from '../platform/platform.service';
import { DeviceOrientation, ViewportInfo, ViewportSize } from '../../models/viewport.model';

/**
 * Service for responsive viewport detection and device type identification.
 * Provides reactive signals and utilities for building responsive interfaces.
 * @internal
 */
@Injectable({
	providedIn: 'root'
})
export class ViewportService implements OnDestroy {
	// Design system breakpoints
	private readonly BREAKPOINTS = {
		mobile: 480,
		tablet: 768,
		desktop: 1024,
		wide: 1200
	} as const;

	// Reactive signals
	private readonly _width = signal(this.getCurrentWidth());
	private readonly _height = signal(this.getCurrentHeight());

	// Cleanup subject
	private readonly destroy$ = new Subject<void>();

	constructor(protected platform: PlatformService) {
		this.initializeResizeListener();
	}

	// ==== PUBLIC REACTIVE SIGNALS ====

	/**
	 * Current viewport width
	 */
	readonly width = this._width.asReadonly();

	/**
	 * Current viewport height
	 */
	readonly height = this._height.asReadonly();

	/**
	 * Whether device supports touch interactions
	 */
	readonly isTouchDevice = computed(() => this.platform.isTouchDevice());

	/**
	 * Current viewport size category
	 */
	readonly viewportSize = computed<ViewportSize>(() => {
		const width = this._width();
		if (width >= this.BREAKPOINTS.wide) return 'wide';
		if (width >= this.BREAKPOINTS.desktop) return 'desktop';
		if (width >= this.BREAKPOINTS.tablet) return 'tablet';
		return 'mobile';
	});

	/**
	 * Device orientation (computed)
	 */
	readonly orientation = computed<DeviceOrientation>(() => {
		return this._width() > this._height() ? 'landscape' : 'portrait';
	});

	/**
	 * Whether current viewport is mobile size
	 */
	readonly isMobile = computed(() => this.viewportSize() === 'mobile' && this.platform.isTouchDevice());

	/**
	 * Whether current viewport is tablet size
	 */
	readonly isTablet = computed(() => this.viewportSize() === 'tablet' && this.platform.isTouchDevice());

	/**
	 * Whether current viewport is desktop size
	 */
	readonly isDesktop = computed(() => this.viewportSize() === 'desktop');

	/**
	 * Whether current viewport is wide desktop size
	 */
	readonly isWide = computed(() => this.viewportSize() === 'wide');

	/**
	 * Whether current viewport is mobile or smaller
	 */
	readonly isMobileView = computed(() => this._width() < this.BREAKPOINTS.tablet);

	/**
	 * Whether current viewport is tablet or smaller
	 */
	readonly isTabletDown = computed(() => this._width() < this.BREAKPOINTS.desktop);

	/**
	 * Whether current viewport is tablet or larger
	 */
	readonly isTabletUp = computed(() => this._width() >= this.BREAKPOINTS.tablet);

	/**
	 * Whether current viewport is desktop or larger
	 */
	readonly isDesktopUp = computed(() => this._width() >= this.BREAKPOINTS.desktop);

	/**
	 * Complete viewport information
	 */
	readonly viewportInfo = computed<ViewportInfo>(() => ({
		width: this._width(),
		height: this._height(),
		size: this.viewportSize(),
		orientation: this.orientation(),
		isMobile: this.isMobile(),
		isTablet: this.isTablet(),
		isDesktop: this.isDesktop(),
		isWide: this.isWide(),
		isTouchDevice: this.isTouchDevice()
	}));

	// ==== PUBLIC UTILITY METHODS ====

	/**
	 * Check if viewport matches specific size
	 */
	matchesSize(size: ViewportSize): boolean {
		return this.viewportSize() === size;
	}

	/**
	 * Check if viewport is smaller than specified size
	 */
	isSmallerThan(size: ViewportSize): boolean {
		const currentWidth = this._width();
		return currentWidth < this.BREAKPOINTS[size];
	}

	/**
	 * Check if viewport is larger than specified size
	 */
	isLargerThan(size: ViewportSize): boolean {
		const currentWidth = this._width();
		return currentWidth >= this.BREAKPOINTS[size];
	}

	/**
	 * Get responsive grid columns based on viewport and content count
	 */
	getGridColumns(itemCount = 0): string {
		if (this.isMobileView()) {
			return 'single-column';
		}
		if (this.isTablet()) {
			return itemCount > 6 ? 'two-columns' : 'single-column';
		}
		return itemCount > 10 ? 'three-columns' : 'two-columns';
	}

	/**
	 * Get appropriate icon size for current viewport
	 */
	getIconSize(): 'small' | 'medium' | 'large' {
		if (this.isMobileView()) return 'medium';
		if (this.isTablet()) return 'small';
		return 'small';
	}

	/**
	 * Get appropriate spacing size for current viewport
	 */
	getSpacing(): 'compact' | 'comfortable' | 'spacious' {
		if (this.isMobileView()) return 'compact';
		if (this.isTablet()) return 'comfortable';
		return 'spacious';
	}

	/**
	 * Check if device is in landscape mode (mobile context)
	 */
	isLandscape(): boolean {
		return this.orientation() === 'landscape';
	}

	/**
	 * Check if device is in portrait mode
	 */
	isPortrait(): boolean {
		return this.orientation() === 'portrait';
	}

	/**
	 * Get breakpoint value for specified size
	 */
	getBreakpoint(size: keyof typeof this.BREAKPOINTS): number {
		return this.BREAKPOINTS[size];
	}

	// ==== PRIVATE METHODS ====

	private getCurrentWidth(): number {
		return typeof window !== 'undefined' ? window.innerWidth : 1024;
	}

	private getCurrentHeight(): number {
		return typeof window !== 'undefined' ? window.innerHeight : 768;
	}

	private detectTouchDevice(): boolean {
		if (typeof window === 'undefined') return false;
		return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
	}

	private initializeResizeListener(): void {
		if (typeof window === 'undefined') return;

		fromEvent(window, 'resize')
			.pipe(
				debounceTime(150), // Debounce for performance
				distinctUntilChanged(),
				takeUntil(this.destroy$)
			)
			.subscribe(() => {
				this._width.set(this.getCurrentWidth());
				this._height.set(this.getCurrentHeight());
			});
	}

	ngOnDestroy(): void {
		this.destroy$.next();
		this.destroy$.complete();
	}
}
