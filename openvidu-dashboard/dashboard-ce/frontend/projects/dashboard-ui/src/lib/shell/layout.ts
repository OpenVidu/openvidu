import type { ScreenSize } from '../core/breakpoints.js';

export interface SidenavLayout {
	mode: 'side' | 'over';
	opened: boolean;
	/** Icons only, 72 px wide. */
	rail: boolean;
}

/**
 * Sidenav per breakpoint: Large and XLarge keep a 240 px side panel (a 72 px rail when pinned), Medium a rail that the
 * burger expands over the content, Small and XSmall an over drawer closed by default.
 */
export function sidenavLayout(size: ScreenSize, railPinned: boolean, expanded: boolean): SidenavLayout {
	switch (size) {
		case 'xlarge':
		case 'large':
			return { mode: 'side', opened: true, rail: railPinned };
		case 'medium':
			return { mode: 'side', opened: true, rail: !expanded };
		default:
			return { mode: 'over', opened: expanded, rail: false };
	}
}
