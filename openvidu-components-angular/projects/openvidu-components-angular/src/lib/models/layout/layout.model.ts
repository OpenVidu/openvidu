// Re-export all public types and constants for backward compatibility
export {
	BestDimensions,
	BigFirstOption,
	ElementDimensions,
	ExtendedLayoutOptions,
	LAYOUT_CONSTANTS,
	LayoutAlignment,
	LayoutArea,
	LayoutBox,
	LayoutClass,
	LayoutRow,
	OpenViduLayoutOptions,
	SidenavMode
} from './layout-types.model';

import { LayoutCalculator } from './layout-calculator.model';
import { LayoutDimensionsCache } from './layout-dimensions-cache.model';
import { LayoutRenderer } from './layout-renderer.model';
import { ElementDimensions, ExtendedLayoutOptions, LAYOUT_CONSTANTS, LayoutClass, OpenViduLayoutOptions } from './layout-types.model';

/**
 * OpenViduLayout orchestrates layout calculation and rendering.
 * Maintains backward compatibility with existing API while delegating to specialized classes.
 *
 * @internal
 */
export class OpenViduLayout {
	private layoutContainer!: HTMLElement;
	private opts!: OpenViduLayoutOptions;

	// Specialized components
	private dimensionsCache: LayoutDimensionsCache;
	private calculator: LayoutCalculator;
	private renderer: LayoutRenderer;

	constructor() {
		this.dimensionsCache = new LayoutDimensionsCache();
		this.calculator = new LayoutCalculator(this.dimensionsCache);
		this.renderer = new LayoutRenderer();
	}

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
				containerHeight:
					this.getHeight(this.layoutContainer) -
					this.getCSSNumber(this.layoutContainer, 'border-top') -
					this.getCSSNumber(this.layoutContainer, 'border-bottom'),
				containerWidth:
					this.getWidth(this.layoutContainer) -
					this.getCSSNumber(this.layoutContainer, 'border-left') -
					this.getCSSNumber(this.layoutContainer, 'border-right')
			};

			const selector = `#${id}>*:not(.${LayoutClass.IGNORED_ELEMENT}):not(.${LayoutClass.MINIMIZED_ELEMENT})`;
			const children = Array.prototype.filter.call(this.layoutContainer.querySelectorAll(selector), () => this.filterDisplayNone);

			const elements = children.map((element: HTMLElement) => {
				const res = this.getChildDims(element);
				res.big = element.classList.contains(this.opts.bigClass);
				res.small = element.classList.contains(LayoutClass.SMALL_ELEMENT);
				res.topBar = element.classList.contains(LayoutClass.TOP_BAR_ELEMENT);
				return res;
			});

			// Delegate calculation to LayoutCalculator
			const layout = this.calculator.calculateLayout(extendedOpts, elements);

			// Delegate rendering to LayoutRenderer
			this.renderer.renderLayout(this.layoutContainer, layout.boxes, children, this.opts.animate);
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

	// ============================================================================
	// PRIVATE UTILITY METHODS (DOM Helpers)
	// ============================================================================

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
}
