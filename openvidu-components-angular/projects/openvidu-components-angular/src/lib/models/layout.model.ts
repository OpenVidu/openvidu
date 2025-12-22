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

/**
 * @internal
 */
export class OpenViduLayout {
	private layoutContainer!: HTMLElement;
	private opts!: OpenViduLayoutOptions;
	private dimensionsCache = new Map<string, BestDimensions>();

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
				res.small = element.classList.contains(LayoutClass.SMALL_ELEMENT);
				res.topBar = element.classList.contains(LayoutClass.TOP_BAR_ELEMENT);
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
				this.animateElement(elem, targetPosition);
				this.fixAspectRatio(elem, width);
			}, 10);
		} else {
			this.setElementPosition(elem, targetPosition);
			if (!elem.classList.contains(LayoutClass.CLASS_NAME)) {
				elem.classList.add(LayoutClass.CLASS_NAME);
			}
		}
		this.fixAspectRatio(elem, width);
	}

	private setElementPosition(elem: HTMLVideoElement, targetPosition: { [key: string]: string }) {
		Object.keys(targetPosition).forEach((key) => {
			(elem.style as any)[key] = targetPosition[key];
		});
	}

	private animateElement(elem: HTMLVideoElement, targetPosition: { [key: string]: string }) {
		elem.style.transition = `all ${LAYOUT_CONSTANTS.ANIMATION_DURATION} ${LAYOUT_CONSTANTS.ANIMATION_EASING}`;
		this.setElementPosition(elem, targetPosition);
	}

	/**
	 * @hidden
	 */
	private getChildDims(child: HTMLVideoElement | HTMLElement): ElementDimensions {
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
	private getLayout(opts: ExtendedLayoutOptions, elements: ElementDimensions[]) {
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
		const availableRatio = containerHeight / containerWidth;
		let offsetLeft = 0;
		let offsetTop = 0;
		let bigOffsetTop = 0;
		let bigOffsetLeft = 0;
		const bigIndices: number[] = [];
		const smallIndices: number[] = [];
		const topBarIndices: number[] = [];
		const normalIndices: number[] = [];
		let bigBoxes: LayoutBox[] = [];
		let smallBoxes: LayoutBox[] = [];
		let topBarBoxes: LayoutBox[] = [];
		let normalBoxes: LayoutBox[] = [];
		let areas: { big: LayoutArea | null; normal: LayoutArea | null; small: LayoutArea | null; topBar: LayoutArea | null } = { big: null, normal: null, small: null, topBar: null };

		// Separate elements into categories: big, small, topbar, and normal
		const bigOnes = elements.filter((element, idx) => {
			if (element.big) {
				bigIndices.push(idx);
				return true;
			}
			return false;
		});
		const topBarOnes = elements.filter((element, idx) => {
			if (!element.big && element.topBar) {
				topBarIndices.push(idx);
				return true;
			}
			return false;
		});
		const smallOnes = elements.filter((element, idx) => {
			if (!element.big && !element.topBar && element.small) {
				smallIndices.push(idx);
				return true;
			}
			return false;
		});
		const normalOnes = elements.filter((element, idx) => {
			if (!element.big && !element.topBar && !element.small) {
				normalIndices.push(idx);
				return true;
			}
			return false;
		});

		// Handle different layout scenarios based on element types
		if (bigOnes.length > 0 && (normalOnes.length > 0 || smallOnes.length > 0 || topBarOnes.length > 0)) {
			// Scenario: Big elements with normal/small/topbar elements
			let bigWidth;
			let bigHeight;
			let showBigFirst = bigFirst;

			if (availableRatio > this.getVideoRatio(bigOnes[0])) {
				// We are tall, going to take up the whole width and arrange small
				// guys at the bottom
				bigWidth = containerWidth;
				bigHeight = Math.floor(containerHeight * bigPercentage);
				if (minBigPercentage > 0) {
					// Find the best size for the big area
					let bigDimensions;
					if (!bigFixedRatio) {
						bigDimensions = this.getBestDimensions(
							bigMinRatio,
							bigMaxRatio,
							bigWidth,
							bigHeight,
							bigOnes.length,
							bigMaxWidth,
							bigMaxHeight
						);
					} else {
						// Use the ratio of the first video element we find to approximate
						const ratio = bigOnes[0].height / bigOnes[0].width;
						bigDimensions = this.getBestDimensions(
							ratio,
							ratio,
							bigWidth,
							bigHeight,
							bigOnes.length,
							bigMaxWidth,
							bigMaxHeight
						);
					}
					bigHeight = Math.max(
						containerHeight * minBigPercentage,
						Math.min(bigHeight, bigDimensions.targetHeight * bigDimensions.targetRows)
					);
					// Don't awkwardly scale the small area bigger than we need to and end up with floating
					// videos in the middle
					const smallDimensions = this.getBestDimensions(
						minRatio,
						maxRatio,
						containerWidth,
						containerHeight - bigHeight,
						normalOnes.length + smallOnes.length + topBarOnes.length,
						smallMaxWidth,
						smallMaxHeight
					);
					bigHeight = Math.max(bigHeight, containerHeight - smallDimensions.targetRows * smallDimensions.targetHeight);
				}
				offsetTop = bigHeight;
				bigOffsetTop = containerHeight - offsetTop;
				if (bigFirst === 'column') {
					showBigFirst = false;
				} else if (bigFirst === 'row') {
					showBigFirst = true;
				}
			} else {
				// We are wide, going to take up the whole height and arrange the small
				// guys on the right
				bigHeight = containerHeight;
				bigWidth = Math.floor(containerWidth * bigPercentage);
				if (minBigPercentage > 0) {
					// Find the best size for the big area
					let bigDimensions;
					if (!bigFixedRatio) {
						bigDimensions = this.getBestDimensions(
							bigMinRatio,
							bigMaxRatio,
							bigWidth,
							bigHeight,
							bigOnes.length,
							bigMaxWidth,
							bigMaxHeight
						);
					} else {
						// Use the ratio of the first video element we find to approximate
						const ratio = bigOnes[0].height / bigOnes[0].width;
						bigDimensions = this.getBestDimensions(
							ratio,
							ratio,
							bigWidth,
							bigHeight,
							bigOnes.length,
							bigMaxWidth,
							bigMaxHeight
						);
					}
					bigWidth = Math.max(
						containerWidth * minBigPercentage,
						Math.min(bigWidth, bigDimensions.targetWidth * bigDimensions.targetCols)
					);
					// Don't awkwardly scale the small area bigger than we need to and end up with floating
					// videos in the middle
					const smallDimensions = this.getBestDimensions(
						minRatio,
						maxRatio,
						containerWidth - bigWidth,
						containerHeight,
						normalOnes.length + smallOnes.length + topBarOnes.length,
						smallMaxWidth,
						smallMaxHeight
					);
					bigWidth = Math.max(bigWidth, containerWidth - smallDimensions.targetCols * smallDimensions.targetWidth);
				}
				offsetLeft = bigWidth;
				bigOffsetLeft = containerWidth - offsetLeft;
				if (bigFirst === 'column') {
					showBigFirst = true;
				} else if (bigFirst === 'row') {
					showBigFirst = false;
				}
			}
			if (showBigFirst) {
				areas.big = {
					top: 0,
					left: 0,
					width: bigWidth,
					height: bigHeight
				};
				areas.normal = {
					top: offsetTop,
					left: offsetLeft,
					width: containerWidth - offsetLeft,
					height: containerHeight - offsetTop
				};
			} else {
				areas.big = {
					left: bigOffsetLeft,
					top: bigOffsetTop,
					width: bigWidth,
					height: bigHeight
				};
				areas.normal = {
					top: 0,
					left: 0,
					width: containerWidth - offsetLeft,
					height: containerHeight - offsetTop
				};
			}
		} else if (bigOnes.length > 0 && normalOnes.length === 0 && smallOnes.length === 0 && topBarOnes.length === 0) {
			// We only have bigOnes just center it
			areas.big = {
				top: 0,
				left: 0,
				width: containerWidth,
				height: containerHeight
			};
		} else if (normalOnes.length > 0 || smallOnes.length > 0 || topBarOnes.length > 0) {
			// Only normal, small, and/or topbar elements
			areas.normal = {
				top: offsetTop,
				left: offsetLeft,
				width: containerWidth - offsetLeft,
				height: containerHeight - offsetTop
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
		if (areas.normal) {
			let currentTop = areas.normal.top;
			let remainingHeight = areas.normal.height;

			// 1. Position TopBar Elements at the very top (header style: full width, 80px height)
			if (topBarOnes.length > 0) {
				const topBarHeight = 80;
				const topBarWidth = Math.floor(containerWidth / topBarOnes.length);

				topBarBoxes = topBarOnes.map((element, idx) => {
					return {
						left: areas.normal!.left + idx * topBarWidth,
						top: currentTop,
						width: topBarWidth,
						height: topBarHeight
					};
				});

				currentTop += topBarHeight;
				remainingHeight -= topBarHeight;
			}

			// 2. Position Small Elements (reduced format)
			if (smallOnes.length > 0) {
				const maxSmallWidthAvailable = smallMaxWidth;
				const maxSmallHeightAvailable = smallMaxHeight;

				const tentativeCols = maxSmallWidthAvailable === Infinity
					? smallOnes.length
					: Math.max(1, Math.floor(containerWidth / maxSmallWidthAvailable));
				const displayCols = Math.max(1, Math.min(smallOnes.length, tentativeCols));

				const computedWidth = maxSmallWidthAvailable === Infinity
					? Math.floor(containerWidth / displayCols)
					: maxSmallWidthAvailable;
				const computedHeight = maxSmallHeightAvailable === Infinity ? computedWidth : maxSmallHeightAvailable;

				const rowWidth = displayCols * computedWidth;
				const rowOffset = Math.floor(Math.max(0, containerWidth - rowWidth) / 2);

				smallBoxes = smallOnes.map((element, idx) => {
					const col = idx % displayCols;
					return {
						left: areas.normal!.left + col * computedWidth + rowOffset,
						top: currentTop,
						width: computedWidth,
						height: computedHeight
					};
				});

				currentTop += computedHeight;
				remainingHeight -= computedHeight;
			}

			// 3. Position Normal Elements in remaining space
			if (normalOnes.length > 0) {
				normalBoxes = this.getLayoutAux(
					{
						containerWidth: areas.normal.width,
						containerHeight: Math.max(0, remainingHeight),
						offsetLeft: areas.normal.left,
						offsetTop: currentTop,
						fixedRatio,
						minRatio,
						maxRatio,
						alignItems: areas.big ? smallAlignItems : alignItems,
						maxWidth: areas.big ? maxWidth : maxWidth,
						maxHeight: areas.big ? maxHeight : maxHeight,
						scaleLastRow
					},
					normalOnes
				);
			}
		}

		const boxes: LayoutBox[] = [];
		let bigBoxesIdx = 0;
		let normalBoxesIdx = 0;
		let smallBoxesIdx = 0;
		let topBarBoxesIdx = 0;
		// Rebuild the array in the right order based on element types
		elements.forEach((element, idx) => {
			if (bigIndices.indexOf(idx) > -1) {
				boxes[idx] = bigBoxes[bigBoxesIdx];
				bigBoxesIdx += 1;
			} else if (topBarIndices.indexOf(idx) > -1) {
				// Element is topbar (header style: full width, limited height)
				boxes[idx] = topBarBoxes[topBarBoxesIdx];
				topBarBoxesIdx += 1;
			} else if (smallIndices.indexOf(idx) > -1) {
				// Element is small (reduced format)
				boxes[idx] = smallBoxes[smallBoxesIdx];
				smallBoxesIdx += 1;
			} else {
				// Element is normal
				boxes[idx] = normalBoxes[normalBoxesIdx];
				normalBoxesIdx += 1;
			}
		});
		return { boxes, areas };
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

		let dimensions;

		if (!fixedRatio) {
			dimensions = this.getBestDimensions(minRatio, maxRatio, containerWidth, containerHeight, count, maxWidth, maxHeight);
		} else {
			// Use the ratio of the first video element we find to approximate
			const ratio = ratios.length > 0 ? ratios[0] : LAYOUT_CONSTANTS.DEFAULT_MIN_RATIO;
			dimensions = this.getBestDimensions(ratio, ratio, containerWidth, containerHeight, count, maxWidth, maxHeight);
		}

		// Loop through each stream in the container and place it inside
		let x = 0;
		let y = 0;
		const rows: LayoutRow[] = [];
		let row: LayoutRow | undefined;
		const boxes: LayoutBox[] = [];

		// Iterate through the children and create an array with a new item for each row
		// and calculate the width of each row so that we know if we go over the size and need
		// to adjust
		for (let i = 0; i < ratios.length; i++) {
			if (i % dimensions.targetCols === 0) {
				// This is a new row
				row = {
					ratios: [],
					width: 0,
					height: 0
				};
				rows.push(row);
			}
			const ratio = ratios[i];
			if (row) {
				row.ratios.push(ratio);
				let targetWidth = dimensions.targetWidth;
				const targetHeight = dimensions.targetHeight;
				// If we're using a fixedRatio then we need to set the correct ratio for this element
				if (fixedRatio) {
					targetWidth = targetHeight / ratio;
				}
				row.width += targetWidth;
				row.height = targetHeight;
			}
		}
		// Calculate total row height adjusting if we go too wide
		let totalRowHeight = 0;
		let remainingShortRows = 0;
		for (let i = 0; i < rows.length; i++) {
			row = rows[i];
			if (row.width > containerWidth) {
				// Went over on the width, need to adjust the height proportionally
				row.height = Math.floor(row.height * (containerWidth / row.width));
				row.width = containerWidth;
			} else if (row.width < containerWidth && row.height < maxHeight) {
				remainingShortRows += 1;
			}
			totalRowHeight += row.height;
		}
		if (scaleLastRow && totalRowHeight < containerHeight && remainingShortRows > 0) {
			// We can grow some of the rows, we're not taking up the whole height
			let remainingHeightDiff = containerHeight - totalRowHeight;
			totalRowHeight = 0;
			for (let i = 0; i < rows.length; i++) {
				row = rows[i];
				if (row.width < containerWidth) {
					// Evenly distribute the extra height between the short rows
					let extraHeight = remainingHeightDiff / remainingShortRows;
					if (extraHeight / row.height > (containerWidth - row.width) / row.width) {
						// We can't go that big or we'll go too wide
						extraHeight = Math.floor(((containerWidth - row.width) / row.width) * row.height);
					}
					row.width += Math.floor((extraHeight / row.height) * row.width);
					row.height += extraHeight;
					remainingHeightDiff -= extraHeight;
					remainingShortRows -= 1;
				}
				totalRowHeight += row.height;
			}
		}
		// vertical centering
		switch (alignItems) {
			case 'start':
				y = 0;
				break;
			case 'end':
				y = containerHeight - totalRowHeight;
				break;
			case 'center':
			default:
				y = (containerHeight - totalRowHeight) / 2;
				break;
		}
		// Iterate through each row and place each child
		for (let i = 0; i < rows.length; i++) {
			row = rows[i];
			let rowMarginLeft;
			switch (alignItems) {
				case 'start':
					rowMarginLeft = 0;
					break;
				case 'end':
					rowMarginLeft = containerWidth - row.width;
					break;
				case 'center':
				default:
					rowMarginLeft = (containerWidth - row.width) / 2;
					break;
			}
			x = rowMarginLeft;
			let targetHeight = row.height;
			for (let j = 0; j < row.ratios.length; j++) {
				const ratio = row.ratios[j];

				let targetWidth = dimensions.targetWidth;
				targetHeight = row.height;
				// If we're using a fixedRatio then we need to set the correct ratio for this element
				if (fixedRatio) {
					targetWidth = Math.floor(targetHeight / ratio);
				} else if (targetHeight / targetWidth !== dimensions.targetHeight / dimensions.targetWidth) {
					// We grew this row, we need to adjust the width to account for the increase in height
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
			y += targetHeight;
		}
		return boxes;
	}
}
