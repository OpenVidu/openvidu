/**
 * Viewport size categories based on design system breakpoints
 * @internal
 */
export type ViewportSize = 'mobile' | 'tablet' | 'desktop' | 'wide';

/**
 * Device orientation type
 * @internal
 */
export type DeviceOrientation = 'portrait' | 'landscape';

/**
 * Viewport information interface
 * @internal
 */
export interface ViewportInfo {
	width: number;
	height: number;
	size: ViewportSize;
	orientation: DeviceOrientation;
	isMobile: boolean;
	isTablet: boolean;
	isDesktop: boolean;
	isWide: boolean;
	isTouchDevice: boolean;
}
