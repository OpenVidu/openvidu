/**
 * @internal
 */
export enum LayoutClass {
	ROOT_ELEMENT = 'OV_root',
	BIG_ELEMENT = 'OV_big',
	SMALL_ELEMENT = 'OV_small',
	TOP_BAR_ELEMENT = 'OV_top-bar',
	IGNORED_ELEMENT = 'OV_ignored',
	MINIMIZED_ELEMENT = 'OV_minimized',
	SIDENAV_CONTAINER = 'sidenav-container',
	NO_SIZE_ELEMENT = 'no-size',
	CLASS_NAME = 'layout'
}

/**
 * @internal
 */
export enum SidenavMode {
	OVER = 'over',
	SIDE = 'side'
}

/**
 * @internal
 */
export enum LayoutAlignment {
	START = 'start',
	CENTER = 'center',
	END = 'end'
}

/**
 * Layout position options for big elements
 */
export type BigFirstOption = boolean | 'column' | 'row';

/**
 * Element dimensions interface
 */
export interface ElementDimensions {
	height: number;
	width: number;
	big?: boolean;
	small?: boolean;
	topBar?: boolean;
}

/**
 * Layout area definition
 */
export interface LayoutArea {
	top: number;
	left: number;
	width: number;
	height: number;
}

/**
 * Layout box positioning
 */
export interface LayoutBox extends LayoutArea {}

/**
 * Row structure for layout calculations
 */
export interface LayoutRow {
	ratios: number[];
	width: number;
	height: number;
}

/**
 * Best dimensions calculation result
 */
export interface BestDimensions {
	maxArea: number;
	targetCols: number;
	targetRows: number;
	targetHeight: number;
	targetWidth: number;
	ratio: number;
}

/**
 * Extended layout options with container dimensions
 */
export interface ExtendedLayoutOptions extends OpenViduLayoutOptions {
	containerWidth: number;
	containerHeight: number;
}

/**
 * Layout calculation result containing positioned boxes and allocated areas
 */
export interface LayoutCalculationResult {
	boxes: LayoutBox[];
	areas: LayoutAreas;
}

/**
 * Layout areas for different element categories
 */
export interface LayoutAreas {
	big: LayoutArea | null;
	normal: LayoutArea | null;
	small: LayoutArea | null;
	topBar: LayoutArea | null;
}

/**
 * Categorized elements by type
 * @internal
 */
export interface CategorizedElements {
	big: ElementDimensions[];
	normal: ElementDimensions[];
	small: ElementDimensions[];
	topBar: ElementDimensions[];
	bigIndices: number[];
	normalIndices: number[];
	smallIndices: number[];
	topBarIndices: number[];
}

/**
 * Layout configuration constants
 */
export const LAYOUT_CONSTANTS = {
	DEFAULT_VIDEO_WIDTH: 640,
	DEFAULT_VIDEO_HEIGHT: 480,
	DEFAULT_MAX_RATIO: 3 / 2,
	DEFAULT_MIN_RATIO: 9 / 16,
	DEFAULT_BIG_PERCENTAGE: 0.8,
	UPDATE_TIMEOUT: 50,
	ANIMATION_DURATION: '0.1s',
	ANIMATION_EASING: 'linear'
} as const;

/**
 * @internal
 */
export interface OpenViduLayoutOptions {
	/** The narrowest ratio that will be used (2x3 by default) */
	maxRatio: number;
	/** The widest ratio that will be used (16x9 by default) */
	minRatio: number;
	/** If true, aspect ratio is maintained and minRatio/maxRatio are ignored */
	fixedRatio: boolean;
	/** Whether to animate transitions */
	animate: boolean;
	/** Class for elements that should be sized bigger */
	bigClass: string;
	/** Class for elements that should be sized smaller */
	smallClass: string;
	/** Class for elements that should be ignored */
	ignoredClass: string;
	/** Maximum percentage of space big elements should take up */
	bigPercentage: number;
	/** Minimum percentage for big space to scale down whitespace */
	minBigPercentage: number;
	/** Fixed ratio for big elements */
	bigFixedRatio: boolean;
	/** Narrowest ratio for big elements */
	bigMaxRatio: number;
	/** Widest ratio for big elements */
	bigMinRatio: number;
	/** Position preference for big elements */
	bigFirst: BigFirstOption;
	/** Alignment for all elements */
	alignItems: LayoutAlignment;
	/** Alignment for big elements */
	bigAlignItems: LayoutAlignment;
	/** Alignment for small elements */
	smallAlignItems: LayoutAlignment;
	/** Maximum width of elements */
	maxWidth: number;
	/** Maximum height of elements */
	maxHeight: number;
	/** Maximum width for small elements */
	smallMaxWidth: number;
	/** Maximum height for small elements */
	smallMaxHeight: number;
	/** Maximum width for big elements */
	bigMaxWidth: number;
	/** Maximum height for big elements */
	bigMaxHeight: number;
	/** Scale up elements in last row if fewer elements */
	scaleLastRow: boolean;
	/** Scale up big elements in last row */
	bigScaleLastRow: boolean;
}
