/**
 * @internal
 */
export enum LayoutClass {
	ROOT_ELEMENT = 'OV_root',
	BIG_ELEMENT = 'OV_big',
	SMALL_ELEMENT = 'OV_small',
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
 * Strategy interface for layout area calculations
 * @internal
 */
interface LayoutStrategy {
	calculateAreas(
		containerWidth: number,
		containerHeight: number,
		bigPercentage: number,
		bigWidth: number,
		bigHeight: number
	): { big: LayoutArea; small: LayoutArea; offsetLeft: number; offsetTop: number };

	determineBigFirst(bigFirst: BigFirstOption): boolean;
}

/**
 * Tall layout strategy: arrange small elements at bottom
 * @internal
 */
class TallLayoutStrategy implements LayoutStrategy {
	calculateAreas(
		containerWidth: number,
		containerHeight: number,
		bigPercentage: number,
		bigWidth: number,
		bigHeight: number
	): { big: LayoutArea; small: LayoutArea; offsetLeft: number; offsetTop: number } {
		const offsetTop = bigHeight;
		return {
			big: { top: 0, left: 0, width: bigWidth, height: bigHeight },
			small: {
				top: offsetTop,
				left: 0,
				width: containerWidth,
				height: containerHeight - offsetTop
			},
			offsetLeft: 0,
			offsetTop
		};
	}

	determineBigFirst(bigFirst: BigFirstOption): boolean {
		if (bigFirst === 'column') return false;
		if (bigFirst === 'row') return true;
		return !!bigFirst;
	}
}

/**
 * Wide layout strategy: arrange small elements on right
 * @internal
 */
class WideLayoutStrategy implements LayoutStrategy {
	calculateAreas(
		containerWidth: number,
		containerHeight: number,
		bigPercentage: number,
		bigWidth: number,
		bigHeight: number
	): { big: LayoutArea; small: LayoutArea; offsetLeft: number; offsetTop: number } {
		const offsetLeft = bigWidth;
		return {
			big: { top: 0, left: 0, width: bigWidth, height: bigHeight },
			small: {
				top: 0,
				left: offsetLeft,
				width: containerWidth - offsetLeft,
				height: containerHeight
			},
			offsetLeft,
			offsetTop: 0
		};
	}

	determineBigFirst(bigFirst: BigFirstOption): boolean {
		if (bigFirst === 'column') return true;
		if (bigFirst === 'row') return false;
		return !!bigFirst;
	}
}

/**
 * Layout configuration constants
 */
export const LAYOUT_CONSTANTS = {
	DEFAULT_VIDEO_WIDTH: 640,
	DEFAULT_VIDEO_HEIGHT: 480,
	DEFAULT_MAX_RATIO: 3 / 2,
	DEFAULT_MIN_RATIO: 9 / 16,
	DEFAULT_BIG_PERCENTAGE: 0.85,
	UPDATE_TIMEOUT: 50,
	ANIMATION_DURATION: '0.15s',
	ANIMATION_EASING: 'ease-in-out'
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

/**
 * @internal
 */
export class OpenViduLayout {
	private layoutContainer!: HTMLElement;
	private opts!: OpenViduLayoutOptions;
	private dimensionsCache = new Map<string, BestDimensions>();
	private layoutCache = new Map<string, { boxes: LayoutBox[]; areas: any }>();
	private readonly CACHE_SIZE_LIMIT = 100;

	/**
	 * Update the layout container
	 * module export layout
	 */
	updateLayout(container: HTMLElement, opts: OpenViduLayoutOptions) {
		setTimeout(() => {
			this.layoutContainer = container;
			this.opts = opts;

			if (this.getCssProperty(this.layoutContainer, 'display') === 'none') {
				return;
			}
			let id = this.layoutContainer.id;
			if (!id) {
				id = 'OV_' + this.cheapUUID();
				this.layoutContainer.id = id;
			}

			const extendedOpts: ExtendedLayoutOptions = {
				...opts,
				containerHeight: this.getHeight(this.layoutContainer) -
					this.getCSSNumber(this.layoutContainer, 'border-top') -
					this.getCSSNumber(this.layoutContainer, 'border-bottom'),
				containerWidth: this.getWidth(this.layoutContainer) -
					this.getCSSNumber(this.layoutContainer, 'border-left') -
					this.getCSSNumber(this.layoutContainer, 'border-right')
			};

			const selector = `#${id}>*:not(.${LayoutClass.IGNORED_ELEMENT}):not(.${LayoutClass.MINIMIZED_ELEMENT})`;
			const children = Array.prototype.filter.call(
				this.layoutContainer.querySelectorAll(selector),
				() => this.filterDisplayNone
			);
			const elements = children.map((element) => {
				const res = this.getChildDims(element);
				res.big = element.classList.contains(this.opts.bigClass);
				return res;
			});

			const layout = this.getLayout(extendedOpts, elements);
			layout.boxes.forEach((box, idx) => {
				const elem = children[idx];
				this.getCssProperty(elem, 'position', 'absolute');
				const actualWidth =
					box.width -
					-this.getCSSNumber(elem, 'margin-left') -
					this.getCSSNumber(elem, 'margin-right') -
					(this.getCssProperty(elem, 'box-sizing') !== 'border-box'
						? this.getCSSNumber(elem, 'padding-left') +
						this.getCSSNumber(elem, 'padding-right') +
						this.getCSSNumber(elem, 'border-left') +
						this.getCSSNumber(elem, 'border-right')
						: 0);

				const actualHeight =
					box.height -
					-this.getCSSNumber(elem, 'margin-top') -
					this.getCSSNumber(elem, 'margin-bottom') -
					(this.getCssProperty(elem, 'box-sizing') !== 'border-box'
						? this.getCSSNumber(elem, 'padding-top') +
						this.getCSSNumber(elem, 'padding-bottom') +
						this.getCSSNumber(elem, 'border-top') +
						this.getCSSNumber(elem, 'border-bottom')
						: 0);

				this.positionElement(elem, box.left, box.top, actualWidth, actualHeight, this.opts.animate);
			});
		}, LAYOUT_CONSTANTS.UPDATE_TIMEOUT);
	}

	/**
	 * Initialize the layout inside of the container with the options required
	 * @param container
	 * @param opts
	 */
	initLayoutContainer(container: HTMLElement, opts: OpenViduLayoutOptions) {
		this.opts = opts;
		this.layoutContainer = container;
		this.updateLayout(container, opts);
	}

	getLayoutContainer(): HTMLElement {
		return this.layoutContainer;
	}

	/**
	 * Clear dimensions cache to free memory
	 */
	clearCache(): void {
		this.dimensionsCache.clear();
		this.layoutCache.clear();
	}

	/**
	 * Manage cache size to prevent unlimited growth
	 * @hidden
	 */
	private manageCacheSize(cache: Map<any, any>): void {
		if (cache.size > this.CACHE_SIZE_LIMIT) {
			const firstKey = cache.keys().next().value;
			if (firstKey !== undefined) {
				cache.delete(firstKey);
			}
		}
	}

	/**
	 * Generate cache key for layout calculations
	 * @hidden
	 */
	private getLayoutCacheKey(opts: ExtendedLayoutOptions, elements: ElementDimensions[]): string {
		const elementKey = elements
			.map(e => `${e.width}x${e.height}x${e.big ? '1' : '0'}`)
			.join('_');
		return `${opts.containerWidth}x${opts.containerHeight}_${elementKey}_${opts.bigPercentage}`;
	}



	private getCssProperty(el: HTMLVideoElement | HTMLElement, propertyName: any, value?: string): void | string {
		if (value !== undefined) {
			// Set one CSS property
			el.style[propertyName] = value;
		} else if (typeof propertyName === 'object') {
			// Set several CSS properties at once
			Object.keys(propertyName).forEach((key) => {
				this.getCssProperty(el, key, propertyName[key]);
			});
		} else {
			// Get the CSS property
			const computedStyle = window.getComputedStyle(el);
			let currentValue = computedStyle.getPropertyValue(propertyName);

			if (currentValue === '') {
				currentValue = el.style[propertyName];
			}
			return currentValue;
		}
	}

	private height(el: HTMLElement) {
		const { offsetHeight } = el;

		if (offsetHeight > 0) {
			return `${offsetHeight}px`;
		}
		return this.getCssProperty(el, 'height');
	}

	private width(el: HTMLElement) {
		const { offsetWidth } = el;

		if (offsetWidth > 0) {
			return `${offsetWidth}px`;
		}
		return this.getCssProperty(el, 'width');
	}



	/**
	 * @hidden
	 */
	private fixAspectRatio(elem: HTMLVideoElement, width: number): void {
		const sub = elem.querySelector(`.${LayoutClass.ROOT_ELEMENT}`) as HTMLVideoElement;
		if (sub) {
			// If this is the parent of a subscriber or publisher, then we need
			// to force the mutation observer on the publisher or subscriber to
			// trigger to get it to fix its layout
			const oldWidth = sub.style.width;
			sub.style.width = `${width}px`;
			// sub.style.height = height + 'px';
			sub.style.width = oldWidth || '';
		}
	}

	/**
	 * @hidden
	 */
	private positionElement(elem: HTMLVideoElement, x: number, y: number, width: number, height: number, animate: boolean) {
		const targetPosition = {
			left: `${x}px`,
			top: `${y}px`,
			width: `${width}px`,
			height: `${height}px`
		};

		this.fixAspectRatio(elem, width);

		if (animate) {
			setTimeout(() => {
				// animation added in css transition: all .1s linear;
				elem.style.transition = `all ${LAYOUT_CONSTANTS.ANIMATION_DURATION} ${LAYOUT_CONSTANTS.ANIMATION_EASING}`;
				Object.entries(targetPosition).forEach(([key, value]) => {
					(elem.style as any)[key] = value;
				});
				this.fixAspectRatio(elem, width);
			}, 10);
		} else {
			elem.style.transition = 'none';
			Object.entries(targetPosition).forEach(([key, value]) => {
				(elem.style as any)[key] = value;
			});
			if (!elem.classList.contains(LayoutClass.CLASS_NAME)) {
				elem.classList.add(LayoutClass.CLASS_NAME);
			}
		}
		this.fixAspectRatio(elem, width);
	}

	/**
	 * @hidden
	 */
	private getChildDims(child: HTMLVideoElement | HTMLElement): { height: number; width: number; big?: boolean } {
		if (child instanceof HTMLVideoElement) {
			if (child.videoHeight && child.videoWidth) {
				return {
					height: child.videoHeight,
					width: child.videoWidth
				};
			}
		} else if (child instanceof HTMLElement) {
			const video = child.querySelector('video');
			if (video instanceof HTMLVideoElement && video.videoHeight && video.videoWidth) {
				return {
					height: video.videoHeight,
					width: video.videoWidth
				};
			}
		}
		return {
			height: LAYOUT_CONSTANTS.DEFAULT_VIDEO_HEIGHT,
			width: LAYOUT_CONSTANTS.DEFAULT_VIDEO_WIDTH
		};
	}

	/**
	 * @hidden
	 */
	private getCSSNumber(elem: HTMLElement, prop: string): number {
		const cssStr = this.getCssProperty(elem, prop);
		return cssStr ? parseInt(cssStr, 10) : 0;
	}

	/**
	 * @hidden
	 */
	// Really cheap UUID function
	private cheapUUID(): string {
		return Math.floor(Math.random() * 100000000).toString();
	}

	/**
	 * @hidden
	 */
	private getHeight(elem: HTMLElement): number {
		const heightStr = this.height(elem);
		return heightStr ? parseInt(heightStr, 10) : 0;
	}

	/**
	 * @hidden
	 */
	private getWidth(elem: HTMLElement): number {
		const widthStr = this.width(elem);
		return widthStr ? parseInt(widthStr, 10) : 0;
	}



	/**
	 * @hidden
	 */
	private filterDisplayNone(element: HTMLElement) {
		return this.getCssProperty(element, 'display') !== 'none';
	}

	/**
	 *
	 * --------------------------------------------------------------------------------
	 *
	 * GET LAYOUT
	 *
	 *
	 */

	/**
	 * @hidden
	 */
	private getBestDimensions(
		minRatio: number,
		maxRatio: number,
		width: number,
		height: number,
		count: number,
		maxWidth: number,
		maxHeight: number
	): BestDimensions {
		// Cache key for memoization
		const cacheKey = `${minRatio}_${maxRatio}_${width}_${height}_${count}_${maxWidth}_${maxHeight}`;
		const cached = this.dimensionsCache.get(cacheKey);
		if (cached) {
			return cached;
		}

		// Manage cache size before adding new entry
		this.manageCacheSize(this.dimensionsCache);
		let bestArea = 0;
		let bestCols = 1;
		let bestRows = 1;
		let bestHeight = 0;
		let bestWidth = 0;

		// Optimized: limit search space based on aspect ratio constraints
		const maxCols = Math.min(count, Math.ceil(Math.sqrt(count * width / height)));

		for (let cols = 1; cols <= maxCols; cols++) {
			const rows = Math.ceil(count / cols);

			// Early exit if too many rows for the height
			if (rows > height / 10) continue;

			let elementWidth = Math.floor(width / cols);
			let elementHeight = Math.floor(height / rows);

			const ratio = elementHeight / elementWidth;

			// Apply ratio constraints
			if (ratio > maxRatio) {
				elementHeight = elementWidth * maxRatio;
			} else if (ratio < minRatio) {
				elementWidth = elementHeight / minRatio;
			}

			// Apply size constraints
			elementWidth = Math.min(maxWidth, elementWidth);
			elementHeight = Math.min(maxHeight, elementHeight);

			const area = elementWidth * elementHeight * count;

			// Favor layouts with better utilization and fewer empty cells
			const efficiency = count / (cols * rows);
			const adjustedArea = area * efficiency;

			if (adjustedArea > bestArea) {
				bestArea = area;
				bestHeight = elementHeight;
				bestWidth = elementWidth;
				bestCols = cols;
				bestRows = rows;
			}
		}

		const result: BestDimensions = {
			maxArea: bestArea,
			targetCols: bestCols,
			targetRows: bestRows,
			targetHeight: bestHeight,
			targetWidth: bestWidth,
			ratio: bestHeight / bestWidth || 0
		};

		// Cache the result for future use
		this.dimensionsCache.set(cacheKey, result);

		return result;
	}

	private getVideoRatio(element: ElementDimensions): number {
		return element.height / element.width;
	}

	/**
	 * Calculate big element dimensions with minimum percentage constraints
	 * @hidden
	 */
	private calculateBigDimensions(
		bigOnes: ElementDimensions[],
		bigWidth: number,
		bigHeight: number,
		bigFixedRatio: boolean,
		bigMinRatio: number,
		bigMaxRatio: number,
		bigMaxWidth: number,
		bigMaxHeight: number,
		minBigPercentage: number,
		containerWidth: number,
		containerHeight: number,
		minRatio: number,
		maxRatio: number,
		smallOnes: ElementDimensions[],
		smallMaxWidth: number,
		smallMaxHeight: number,
		isTall: boolean
	): number {
		if (minBigPercentage <= 0) {
			return isTall ? bigHeight : bigWidth;
		}

		// Find the best size for the big area
		const bigDimensions = !bigFixedRatio
			? this.getBestDimensions(bigMinRatio, bigMaxRatio, bigWidth, bigHeight, bigOnes.length, bigMaxWidth, bigMaxHeight)
			: this.getBestDimensions(
					bigOnes[0].height / bigOnes[0].width,
					bigOnes[0].height / bigOnes[0].width,
					bigWidth,
					bigHeight,
					bigOnes.length,
					bigMaxWidth,
					bigMaxHeight
			  );

		const minSize = isTall ? containerHeight * minBigPercentage : containerWidth * minBigPercentage;
		const calculatedSize = isTall
			? bigDimensions.targetHeight * bigDimensions.targetRows
			: bigDimensions.targetWidth * bigDimensions.targetCols;
		let adjustedSize = Math.max(minSize, Math.min(isTall ? bigHeight : bigWidth, calculatedSize));

		// Don't awkwardly scale the small area bigger than we need to
		const smallDimensions = isTall
			? this.getBestDimensions(minRatio, maxRatio, containerWidth, containerHeight - adjustedSize, smallOnes.length, smallMaxWidth, smallMaxHeight)
			: this.getBestDimensions(minRatio, maxRatio, containerWidth - adjustedSize, containerHeight, smallOnes.length, smallMaxWidth, smallMaxHeight);

		const smallCalculatedSize = isTall
			? smallDimensions.targetRows * smallDimensions.targetHeight
			: smallDimensions.targetCols * smallDimensions.targetWidth;

		adjustedSize = Math.max(adjustedSize, (isTall ? containerHeight : containerWidth) - smallCalculatedSize);

		return adjustedSize;
	}

	/**
	 * Get layout strategy based on container and video ratios
	 * @hidden
	 */
	private getLayoutStrategy(availableRatio: number, videoRatio: number): LayoutStrategy {
		return availableRatio > videoRatio ? new TallLayoutStrategy() : new WideLayoutStrategy();
	}

	/**
	 * Calculate layout areas for big and small elements using Strategy Pattern
	 * @hidden
	 */
	private calculateLayoutAreas(
		availableRatio: number,
		videoRatio: number,
		containerWidth: number,
		containerHeight: number,
		bigPercentage: number,
		bigFirst: BigFirstOption,
		bigOnes: ElementDimensions[],
		smallOnes: ElementDimensions[],
		opts: ExtendedLayoutOptions
	): { big: LayoutArea | null; small: LayoutArea | null; bigFirst: boolean } {
		const strategy = this.getLayoutStrategy(availableRatio, videoRatio);
		const isTall = availableRatio > videoRatio;

		// Calculate initial big dimensions
		const initialBigWidth = isTall ? containerWidth : Math.floor(containerWidth * bigPercentage);
		const initialBigHeight = isTall ? Math.floor(containerHeight * bigPercentage) : containerHeight;

		// Calculate final big dimensions with constraints
		const bigWidth = isTall ? initialBigWidth : this.calculateBigDimensions(
			bigOnes,
			initialBigWidth,
			initialBigHeight,
			opts.bigFixedRatio,
			opts.bigMinRatio,
			opts.bigMaxRatio,
			opts.bigMaxWidth,
			opts.bigMaxHeight,
			opts.minBigPercentage,
			containerWidth,
			containerHeight,
			opts.minRatio,
			opts.maxRatio,
			smallOnes,
			opts.smallMaxWidth,
			opts.smallMaxHeight,
			false
		);

		const bigHeight = isTall ? this.calculateBigDimensions(
			bigOnes,
			initialBigWidth,
			initialBigHeight,
			opts.bigFixedRatio,
			opts.bigMinRatio,
			opts.bigMaxRatio,
			opts.bigMaxWidth,
			opts.bigMaxHeight,
			opts.minBigPercentage,
			containerWidth,
			containerHeight,
			opts.minRatio,
			opts.maxRatio,
			smallOnes,
			opts.smallMaxWidth,
			opts.smallMaxHeight,
			true
		) : initialBigHeight;

		// Use strategy to calculate areas
		const { big, small, offsetLeft, offsetTop } = strategy.calculateAreas(
			containerWidth,
			containerHeight,
			bigPercentage,
			bigWidth,
			bigHeight
		);

		const showBigFirst = strategy.determineBigFirst(bigFirst);

		if (showBigFirst) {
			return { big, small, bigFirst: true };
		} else {
			// Swap positions for bigFirst=false
			const bigOffsetLeft = containerWidth - offsetLeft;
			const bigOffsetTop = containerHeight - offsetTop;
			return {
				big: { left: bigOffsetLeft, top: bigOffsetTop, width: bigWidth, height: bigHeight },
				small: { top: 0, left: 0, width: containerWidth - offsetLeft, height: containerHeight - offsetTop },
				bigFirst: false
			};
		}
	}
	private getLayout(opts: ExtendedLayoutOptions, elements: ElementDimensions[]) {
		// Check cache first
		const cacheKey = this.getLayoutCacheKey(opts, elements);
		const cached = this.layoutCache.get(cacheKey);
		if (cached) {
			return cached;
		}

		// Manage cache size before adding new entry
		this.manageCacheSize(this.layoutCache);

		const {
			maxRatio = LAYOUT_CONSTANTS.DEFAULT_MAX_RATIO,
			minRatio = LAYOUT_CONSTANTS.DEFAULT_MIN_RATIO,
			fixedRatio = false,
			bigPercentage = LAYOUT_CONSTANTS.DEFAULT_BIG_PERCENTAGE,
			minBigPercentage = 0,
			bigFixedRatio = false,
			bigMaxRatio = LAYOUT_CONSTANTS.DEFAULT_MAX_RATIO,
			bigMinRatio = LAYOUT_CONSTANTS.DEFAULT_MIN_RATIO,
			bigFirst = true,
			containerWidth = LAYOUT_CONSTANTS.DEFAULT_VIDEO_WIDTH,
			containerHeight = LAYOUT_CONSTANTS.DEFAULT_VIDEO_HEIGHT,
			alignItems = LayoutAlignment.CENTER,
			bigAlignItems = LayoutAlignment.CENTER,
			smallAlignItems = LayoutAlignment.CENTER,
			maxWidth = Infinity,
			maxHeight = Infinity,
			smallMaxWidth = Infinity,
			smallMaxHeight = Infinity,
			bigMaxWidth = Infinity,
			bigMaxHeight = Infinity,
			scaleLastRow = true,
			bigScaleLastRow = true
		} = opts;
		// Separate big and small elements
		const bigIndices: number[] = [];
		const smallOnes = elements.filter((element) => !element.big);
		const bigOnes = elements.filter((element, idx) => {
			if (element.big) {
				bigIndices.push(idx);
				return true;
			}
			return false;
		});

		// Determine layout areas based on element distribution
		let areas: { big: LayoutArea | null; small: LayoutArea | null };
		let bigBoxes: LayoutBox[] = [];
		let smallBoxes: LayoutBox[] = [];

		if (bigOnes.length > 0 && smallOnes.length > 0) {
			// Mixed layout: calculate areas for both big and small elements
			const availableRatio = containerHeight / containerWidth;
			const layoutAreas = this.calculateLayoutAreas(
				availableRatio,
				this.getVideoRatio(bigOnes[0]),
				containerWidth,
				containerHeight,
				bigPercentage,
				bigFirst,
				bigOnes,
				smallOnes,
				opts
			);
			areas = { big: layoutAreas.big, small: layoutAreas.small };
		} else if (bigOnes.length > 0) {
			// Only big elements: use full container
			areas = {
				big: { top: 0, left: 0, width: containerWidth, height: containerHeight },
				small: null
			};
		} else {
			// Only small elements: use full container
			areas = {
				big: null,
				small: { top: 0, left: 0, width: containerWidth, height: containerHeight }
			};
		}

		if (areas.big) {
			bigBoxes = this.getLayoutAux(
				{
					containerWidth: areas.big.width,
					containerHeight: areas.big.height,
					offsetLeft: areas.big.left,
					offsetTop: areas.big.top,
					fixedRatio: bigFixedRatio,
					minRatio: bigMinRatio,
					maxRatio: bigMaxRatio,
					alignItems: bigAlignItems,
					maxWidth: bigMaxWidth,
					maxHeight: bigMaxHeight,
					scaleLastRow: bigScaleLastRow
				},
				bigOnes
			);
		}
		if (areas.small) {
			smallBoxes = this.getLayoutAux(
				{
					containerWidth: areas.small.width,
					containerHeight: areas.small.height,
					offsetLeft: areas.small.left,
					offsetTop: areas.small.top,
					fixedRatio,
					minRatio,
					maxRatio,
					alignItems: areas.big ? smallAlignItems : alignItems,
					maxWidth: areas.big ? smallMaxWidth : maxWidth,
					maxHeight: areas.big ? smallMaxHeight : maxHeight,
					scaleLastRow
				},
				smallOnes
			);
		}

		const boxes: LayoutBox[] = [];
		let bigBoxesIdx = 0;
		let smallBoxesIdx = 0;
		// Rebuild the array in the right order based on where the bigIndices should be
		elements.forEach((element, idx) => {
			if (bigIndices.indexOf(idx) > -1) {
				boxes[idx] = bigBoxes[bigBoxesIdx];
				bigBoxesIdx += 1;
			} else {
				boxes[idx] = smallBoxes[smallBoxesIdx];
				smallBoxesIdx += 1;
			}
		});

		const result = { boxes, areas };
		// Cache the result for future use
		this.layoutCache.set(cacheKey, result);
		return result;
	}

	/**
	 * Build layout rows from element ratios
	 * @hidden
	 */
	private buildLayoutRows(
		ratios: number[],
		dimensions: BestDimensions,
		fixedRatio: boolean,
		containerWidth: number,
		maxHeight: number
	): { rows: LayoutRow[]; totalRowHeight: number } {
		const rows: LayoutRow[] = [];
		let row: LayoutRow | undefined;

		// Create rows and calculate their dimensions
		for (let i = 0; i < ratios.length; i++) {
			if (i % dimensions.targetCols === 0) {
				row = { ratios: [], width: 0, height: 0 };
				rows.push(row);
			}

			if (row) {
				const ratio = ratios[i];
				row.ratios.push(ratio);
				const targetWidth = fixedRatio ? dimensions.targetHeight / ratio : dimensions.targetWidth;
				row.width += targetWidth;
				row.height = dimensions.targetHeight;
			}
		}

		// Adjust rows that exceed container width
		let totalRowHeight = 0;
		for (const r of rows) {
			if (r.width > containerWidth) {
				r.height = Math.floor(r.height * (containerWidth / r.width));
				r.width = containerWidth;
			}
			totalRowHeight += r.height;
		}

		return { rows, totalRowHeight };
	}

	/**
	 * Scale rows to fill container height if needed
	 * @hidden
	 */
	private scaleRowsToFit(
		rows: LayoutRow[],
		totalRowHeight: number,
		containerWidth: number,
		containerHeight: number,
		maxHeight: number
	): number {
		let remainingShortRows = rows.filter(r => r.width < containerWidth && r.height < maxHeight).length;
		if (remainingShortRows === 0) return totalRowHeight;

		let remainingHeightDiff = containerHeight - totalRowHeight;
		let adjustedTotalHeight = 0;

		for (const row of rows) {
			if (row.width < containerWidth && remainingShortRows > 0) {
				let extraHeight = remainingHeightDiff / remainingShortRows;
				const maxExtraHeight = Math.floor(((containerWidth - row.width) / row.width) * row.height);

				if (extraHeight > maxExtraHeight) {
					extraHeight = maxExtraHeight;
				}

				row.width += Math.floor((extraHeight / row.height) * row.width);
				row.height += extraHeight;
				remainingHeightDiff -= extraHeight;
				remainingShortRows -= 1;
			}
			adjustedTotalHeight += row.height;
		}

		return adjustedTotalHeight;
	}

	/**
	 * Calculate vertical offset based on alignment
	 * @hidden
	 */
	private calculateVerticalOffset(alignItems: LayoutAlignment, containerHeight: number, totalRowHeight: number): number {
		switch (alignItems) {
			case LayoutAlignment.START:
				return 0;
			case LayoutAlignment.END:
				return containerHeight - totalRowHeight;
			case LayoutAlignment.CENTER:
			default:
				return (containerHeight - totalRowHeight) / 2;
		}
	}

	/**
	 * Calculate horizontal offset based on alignment
	 * @hidden
	 */
	private calculateHorizontalOffset(alignItems: LayoutAlignment, containerWidth: number, rowWidth: number): number {
		switch (alignItems) {
			case LayoutAlignment.START:
				return 0;
			case LayoutAlignment.END:
				return containerWidth - rowWidth;
			case LayoutAlignment.CENTER:
			default:
				return (containerWidth - rowWidth) / 2;
		}
	}

	private getLayoutAux(opts: Partial<OpenViduLayoutOptions & { containerWidth: number; containerHeight: number; offsetLeft: number; offsetTop: number }>, elements: ElementDimensions[]): LayoutBox[] {
		const {
			maxRatio = LAYOUT_CONSTANTS.DEFAULT_MAX_RATIO,
			minRatio = LAYOUT_CONSTANTS.DEFAULT_MIN_RATIO,
			fixedRatio = false,
			containerWidth = LAYOUT_CONSTANTS.DEFAULT_VIDEO_WIDTH,
			containerHeight = LAYOUT_CONSTANTS.DEFAULT_VIDEO_HEIGHT,
			offsetLeft = 0,
			offsetTop = 0,
			alignItems = LayoutAlignment.CENTER,
			maxWidth = Infinity,
			maxHeight = Infinity,
			scaleLastRow = true
		} = opts;
		const ratios = elements.map((element) => element.height / element.width);
		const count = ratios.length;

		// Calculate target dimensions for elements
		const targetRatio = fixedRatio && ratios.length > 0 ? ratios[0] : null;
		const dimensions = targetRatio
			? this.getBestDimensions(targetRatio, targetRatio, containerWidth, containerHeight, count, maxWidth, maxHeight)
			: this.getBestDimensions(minRatio, maxRatio, containerWidth, containerHeight, count, maxWidth, maxHeight);

		// Build and adjust rows
		const { rows, totalRowHeight } = this.buildLayoutRows(ratios, dimensions, fixedRatio, containerWidth, maxHeight);
		const finalRowHeight = scaleLastRow && totalRowHeight < containerHeight
			? this.scaleRowsToFit(rows, totalRowHeight, containerWidth, containerHeight, maxHeight)
			: totalRowHeight;

		// Calculate starting position
		let y = this.calculateVerticalOffset(alignItems, containerHeight, finalRowHeight);

		// Position elements in rows
		const boxes: LayoutBox[] = [];
		for (const row of rows) {
			let x = this.calculateHorizontalOffset(alignItems, containerWidth, row.width);

			for (const ratio of row.ratios) {
				let targetWidth = dimensions.targetWidth;
				const targetHeight = row.height;

				if (fixedRatio) {
					targetWidth = Math.floor(targetHeight / ratio);
				} else if (targetHeight / targetWidth !== dimensions.targetHeight / dimensions.targetWidth) {
					targetWidth = Math.floor((dimensions.targetWidth / dimensions.targetHeight) * targetHeight);
				}

				boxes.push({
					left: x + offsetLeft,
					top: y + offsetTop,
					width: targetWidth,
					height: targetHeight
				});
				x += targetWidth;
			}
			y += row.height;
		}
		return boxes;
	}
}
