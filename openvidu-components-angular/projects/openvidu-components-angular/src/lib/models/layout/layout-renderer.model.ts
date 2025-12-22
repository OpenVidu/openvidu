import { LAYOUT_CONSTANTS, LayoutBox } from './layout-types.model';

/**
 * Position information for DOM element
 */
interface ElementPosition {
	left: string;
	top: string;
	width: string;
	height: string;
	[key: string]: string; // Allow index signature for dynamic access
}

/**
 * Handles DOM manipulation and rendering for layout elements.
 * Manages positioning, animations, and visual updates without calculation logic.
 *
 * @internal
 */
export class LayoutRenderer {

	/**
	 * Render layout boxes to DOM elements
	 * @param container Parent container element
	 * @param boxes Calculated layout boxes
	 * @param elements DOM elements to position
	 * @param animate Whether to animate transitions
	 */
	renderLayout(container: HTMLElement, boxes: LayoutBox[], elements: HTMLElement[], animate: boolean): void {
		boxes.forEach((box, idx) => {
			const elem = elements[idx];
			if (!elem) return;

			// Set position:absolute for proper layout positioning
			this.getCssProperty(elem, 'position', 'absolute');

			const actualDimensions = this.calculateActualDimensions(elem, box);
			this.positionElement(elem, box.left, box.top, actualDimensions.width, actualDimensions.height, animate);
		});
	}

	/**
	 * Calculate actual element dimensions accounting for margins, padding, and borders
	 * @param elem DOM element
	 * @param box Layout box dimensions
	 * @returns Actual width and height
	 */
	private calculateActualDimensions(elem: HTMLElement, box: LayoutBox): { width: number; height: number } {
		const actualWidth =
			box.width -
			this.getCSSNumber(elem, 'margin-left') -
			this.getCSSNumber(elem, 'margin-right') -
			(this.getCssProperty(elem, 'box-sizing') !== 'border-box'
				? this.getCSSNumber(elem, 'padding-left') +
				  this.getCSSNumber(elem, 'padding-right') +
				  this.getCSSNumber(elem, 'border-left') +
				  this.getCSSNumber(elem, 'border-right')
				: 0);

		const actualHeight =
			box.height -
			this.getCSSNumber(elem, 'margin-top') -
			this.getCSSNumber(elem, 'margin-bottom') -
			(this.getCssProperty(elem, 'box-sizing') !== 'border-box'
				? this.getCSSNumber(elem, 'padding-top') +
				  this.getCSSNumber(elem, 'padding-bottom') +
				  this.getCSSNumber(elem, 'border-top') +
				  this.getCSSNumber(elem, 'border-bottom')
				: 0);

		return { width: actualWidth, height: actualHeight };
	}

	/**
	 * Position element at specified coordinates with optional animation
	 * @param elem Video or HTML element to position
	 * @param x Left position
	 * @param y Top position
	 * @param width Element width
	 * @param height Element height
	 * @param animate Whether to animate the transition
	 */
	private positionElement(
		elem: HTMLVideoElement | HTMLElement,
		x: number,
		y: number,
		width: number,
		height: number,
		animate: boolean
	): void {
		const targetPosition: ElementPosition = {
			left: `${x}px`,
			top: `${y}px`,
			width: `${width}px`,
			height: `${height}px`
		};

		this.fixAspectRatio(elem, width);

		if (animate) {
			setTimeout(() => {
				// Animation added in CSS transition: all .1s linear;
				this.animateElement(elem, targetPosition);
				this.fixAspectRatio(elem, width);
			}, 10);
		} else {
			this.setElementPosition(elem, targetPosition);
			if (!elem.classList.contains('layout')) {
				elem.classList.add('layout');
			}
		}

		this.fixAspectRatio(elem, width);
	}

	/**
	 * Set element position without animation
	 * @param elem Element to position
	 * @param targetPosition Target position object
	 */
	private setElementPosition(elem: HTMLVideoElement | HTMLElement, targetPosition: ElementPosition): void {
		Object.keys(targetPosition).forEach((key) => {
			(elem.style as any)[key] = targetPosition[key];
		});
	}

	/**
	 * Animate element to target position
	 * @param elem Element to animate
	 * @param targetPosition Target position object
	 */
	private animateElement(elem: HTMLVideoElement | HTMLElement, targetPosition: ElementPosition): void {
		elem.style.transition = `all ${LAYOUT_CONSTANTS.ANIMATION_DURATION} ${LAYOUT_CONSTANTS.ANIMATION_EASING}`;
		this.setElementPosition(elem, targetPosition);
	}

	/**
	 * Fix aspect ratio for video elements
	 * @param elem Element to fix
	 * @param width Target width
	 */
	private fixAspectRatio(elem: HTMLVideoElement | HTMLElement, width: number): void {
		const sub = elem.querySelector('.OV_root') as HTMLVideoElement;
		if (sub) {
			// If this is the parent of a subscriber or publisher, then we need
			// to force the mutation observer on the publisher or subscriber to
			// trigger to get it to fix its layout
			const oldWidth = sub.style.width;
			sub.style.width = `${width}px`;
			sub.style.width = oldWidth || '';
		}
	}

	/**
	 * Get CSS property value or set it
	 * @param el Element to query/modify
	 * @param propertyName Property name or object of properties
	 * @param value Optional value to set
	 * @returns Property value if getting, void if setting
	 */
	private getCssProperty(
		el: HTMLVideoElement | HTMLElement,
		propertyName: any,
		value?: string
	): void | string {
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

	/**
	 * Get CSS property as number
	 * @param elem Element to query
	 * @param prop Property name
	 * @returns Numeric value or 0 if not found
	 */
	private getCSSNumber(elem: HTMLElement, prop: string): number {
		const cssStr = this.getCssProperty(elem, prop);
		return cssStr ? parseInt(cssStr, 10) : 0;
	}
}
