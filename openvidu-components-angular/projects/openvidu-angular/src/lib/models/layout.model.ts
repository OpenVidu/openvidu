/**
 * @internal
 */
export enum LayoutClass {
	ROOT_ELEMENT = 'OT_root',
	BIG_ELEMENT = 'OV_big',
	SMALL_ELEMENT = 'OV_small',
	IGNORED_ELEMENT = 'OV_ignored',
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

export enum LayoutAlignment {
	START = 'start',
	CENTER = 'center',
	END = 'end'
}

/**
 * @internal
 */
export interface OpenViduLayoutOptions {
	/**
	 * The narrowest ratio that will be used (*2x3* by default)
	 */
	maxRatio: number;

	/**
	 * The widest ratio that will be used (*16x9* by default)
	 */
	minRatio: number;

	/**
	 * If this is true then the aspect ratio of the video is maintained and minRatio and maxRatio are ignored (*false* by default)
	 */
	fixedRatio: boolean;
	/**
	 * Whether you want to animate the transitions
	 */
	animate: any;
	/**
	 * The class to add to elements that should be sized bigger
	 */
	bigClass: string;

	/**
	 * The class to add to elements that should be sized smaller
	 */
	smallClass: string;

	/**
	 * The class to add to elements that should be ignored
	 */
	ignoredClass: string;

	/**
	 * The maximum percentage of space the big ones should take up
	 */
	bigPercentage: any;

	/**
	 * If this is set then it will scale down the big space if there is left over whitespace down to this minimum size
	 */
	minBigPercentage: number;

	/**
	 * FixedRatio for the big ones
	 */
	bigFixedRatio: any;

	/**
	 * The narrowest ratio to use for the big elements (*2x3* by default)
	 */
	bigMaxRatio: any;

	/**
	 * The widest ratio to use for the big elements (*16x9* by default)
	 */
	bigMinRatio: any;

	/**
	 * Whether to place the big one in the top left `true` or bottom right
	 */
	bigFirst: boolean | 'column' | 'row';

	/**
	 *
	 */
	alignItems: LayoutAlignment;
	/**
	 *
	 */
	bigAlignItems: LayoutAlignment;
	/**
	 *
	 */
	smallAlignItems: LayoutAlignment;
	/**
	 *  The maximum width of the elements
	 */
	maxWidth: number;
	/**
	 * The maximum height of the elements
	 */
	maxHeight: number;
	smallMaxWidth: number;
	smallMaxHeight: number;
	bigMaxWidth: number;
	bigMaxHeight: number;

	/**
	 *  If there are less elements on the last row then we can scale them up to take up more space
	 */
	scaleLastRow?: boolean;
	/**
	 * Scale last row for the big elements
	 */
	bigScaleLastRow?: boolean;
}

/**
 * @internal
 */
export class OpenViduLayout {
	/**
	 * @hidden
	 */
	private layoutContainer: HTMLElement;

	/**
	 * @hidden
	 */
	private opts: OpenViduLayoutOptions;

	/**
	 * Update the layout container
	 * module export layout
	 */
	updateLayout(container: HTMLElement, opts: any) {
		setTimeout(() => {
			this.layoutContainer = container;
			this.opts = opts;

			if (this.css(this.layoutContainer, 'display') === 'none') {
				return;
			}
			let id = this.layoutContainer.id;
			if (!id) {
				id = 'OT_' + this.cheapUUID();
				this.layoutContainer.id = id;
			}

			opts.containerHeight =
				this.getHeight(this.layoutContainer) -
				this.getCSSNumber(this.layoutContainer, 'border-top') -
				this.getCSSNumber(this.layoutContainer, 'border-bottom');
			opts.containerWidth =
				this.getWidth(this.layoutContainer) -
				this.getCSSNumber(this.layoutContainer, 'border-left') -
				this.getCSSNumber(this.layoutContainer, 'border-right');

			const children = Array.prototype.filter.call(
				this.layoutContainer.querySelectorAll(`#${id}>*:not(.${LayoutClass.IGNORED_ELEMENT})`),
				() => this.filterDisplayNone
			);
			const elements = children.map((element) => {
				const res = this.getChildDims(element);
				res.big = element.classList.contains(this.opts.bigClass);
				return res;
			});

			const layout = this.getLayout(opts, elements);
			layout.boxes.forEach((box, idx) => {
				const elem = children[idx];
				this.css(elem, 'position', 'absolute');
				const actualWidth =
					box.width -
					-this.getCSSNumber(elem, 'margin-left') -
					this.getCSSNumber(elem, 'margin-right') -
					(this.css(elem, 'box-sizing') !== 'border-box'
						? this.getCSSNumber(elem, 'padding-left') +
						  this.getCSSNumber(elem, 'padding-right') +
						  this.getCSSNumber(elem, 'border-left') +
						  this.getCSSNumber(elem, 'border-right')
						: 0);

				const actualHeight =
					box.height -
					-this.getCSSNumber(elem, 'margin-top') -
					this.getCSSNumber(elem, 'margin-bottom') -
					(this.css(elem, 'box-sizing') !== 'border-box'
						? this.getCSSNumber(elem, 'padding-top') +
						  this.getCSSNumber(elem, 'padding-bottom') +
						  this.getCSSNumber(elem, 'border-top') +
						  this.getCSSNumber(elem, 'border-bottom')
						: 0);

				this.positionElement(elem, box.left, box.top, actualWidth, actualHeight, this.opts.animate);
			});
		}, 50);
	}

	/**
	 * Initialize the layout inside of the container with the options required
	 * @param container
	 * @param opts
	 */
	initLayoutContainer(container: HTMLElement, opts: OpenViduLayoutOptions) {
		// this.opts = this.defaults(opts, {
		//   maxRatio: 3 / 2,
		//   minRatio: 9 / 16,
		//   fixedRatio: false,
		//   animate: false,
		//   bigClass: LayoutClass.BIG_ELEMENT,
		//   smallClass: LayoutClass.SMALL_ELEMENT,
		//   bigPercentage: 0.8,
		//   bigFixedRatio: false,
		//   bigMaxRatio: 3 / 2,
		//   bigMinRatio: 9 / 16,
		//   bigFirst: true,
		//   alignItems: 'center',
		//   bigAlignItems: 'center',
		//   smallAlignItems: 'center'
		// });
		this.opts = opts;
		this.layoutContainer = container;
	}

	getLayoutContainer(): HTMLElement {
		return this.layoutContainer;
	}

	/**
	 * Set the layout configuration
	 * @param options
	 */
	private setLayoutOptions(options: OpenViduLayoutOptions) {
		this.opts = options;
	}

	private css(el: HTMLVideoElement | HTMLElement, propertyName: any, value?: string) {
		if (!!value) {
			// We are setting one css property
			el.style[propertyName] = value;
			return NaN;
		} else if (typeof propertyName === 'object') {
			// We are setting several CSS properties at once
			Object.keys(propertyName).forEach((key) => {
				this.css(el, key, propertyName[key]);
			});
			return NaN;
		} else {
			// We are getting the css property
			var computedStyle = /*(this.opts && this.opts.window) ||*/ window.getComputedStyle(el);
			var currentValue = computedStyle.getPropertyValue(propertyName);

			if (currentValue === '') {
				currentValue = el.style[propertyName];
			}

			return currentValue;
		}
	}

	private height(el) {
		if (el.offsetHeight > 0) {
			return `${el.offsetHeight}px`;
		}
		return this.css(el, 'height');
	}
	private width(el) {
		if (el.offsetWidth > 0) {
			return `${el.offsetWidth}px`;
		}
		return this.css(el, 'width');
	}
	private defaults(custom: OpenViduLayoutOptions, defaults: OpenViduLayoutOptions): OpenViduLayoutOptions {
		var res = defaults;
		Object.keys(defaults).forEach((key) => {
			if (custom.hasOwnProperty(key)) {
				res[key] = custom[key];
			}
		});
		return res;
	}

	/**
	 * @hidden
	 */
	private fixAspectRatio(elem: HTMLVideoElement, width: number) {
		const sub: HTMLVideoElement = <HTMLVideoElement>elem.querySelector(`.${LayoutClass.ROOT_ELEMENT}`);
		if (sub) {
			// If this is the parent of a subscriber or publisher then we need
			// to force the mutation observer on the publisher or subscriber to
			// trigger to get it to fix it's layout
			const oldWidth = sub.style.width;
			sub.style.width = `${width}px`;
			// sub.style.height = height + 'px';
			sub.style.width = oldWidth || '';
		}
	}

	/**
	 * @hidden
	 */
	private positionElement(elem: HTMLVideoElement, x: number, y: number, width: number, height: number, animate: any) {
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
				elem.style.left = targetPosition.left;
				elem.style.top = targetPosition.top;
				elem.style.width = targetPosition.width;
				elem.style.height = targetPosition.height;
				this.fixAspectRatio(elem, width);
			}, 10);
		} else {
			this.css(elem, targetPosition);
			if (!elem.classList.contains(LayoutClass.CLASS_NAME)) {
				elem.classList.add(LayoutClass.CLASS_NAME);
			}
		}
		this.fixAspectRatio(elem, width);
	}

	/**
	 * @hidden
	 */
	private getChildDims(child: HTMLVideoElement): {
		height: number;
		width: number;
		big?: boolean;
	} {
		if (child) {
			if (child.videoHeight && child.videoWidth) {
				return {
					height: child.videoHeight,
					width: child.videoWidth
				};
			}
			const video: HTMLVideoElement = <HTMLVideoElement>child.querySelector('video');
			if (video && video.videoHeight && video.videoWidth) {
				return {
					height: video.videoHeight,
					width: video.videoWidth
				};
			}
		}
		return {
			height: 480,
			width: 640
		};
	}

	/**
	 * @hidden
	 */
	private getCSSNumber(elem: HTMLElement, prop: string) {
		const cssStr = this.css(elem, prop);

		return cssStr ? parseInt(cssStr.toString(), 10) : 0;
	}

	/**
	 * @hidden
	 */
	// Really cheap UUID function
	private cheapUUID() {
		return (Math.random() * 100000000).toFixed(0);
	}

	/**
	 * @hidden
	 */
	private getHeight(elem: HTMLElement) {
		const heightStr = this.height(elem);
		return heightStr ? parseInt(heightStr.toString(), 10) : 0;
	}

	/**
	 * @hidden
	 */
	private getWidth(elem: HTMLElement) {
		const widthStr = this.width(elem);
		return widthStr ? parseInt(widthStr.toString(), 10) : 0;
	}

	/**
	 * @hidden
	 */
	// private arrange(
	//   children: HTMLVideoElement[],
	//   containerWidth: number,
	//   containerHeight: number,
	//   offsetLeft: number,
	//   offsetTop: number,
	//   fixedRatio: boolean,
	//   minRatio: number,
	//   maxRatio: number,
	//   animate: any
	// ) {
	// const boxes = this.getLayout(
	//   {
	//     containerWidth,
	//     containerHeight,
	//     minRatio,
	//     maxRatio,
	//     fixedRatio,
	//   },
	//   children.map((child) => this.getVideoRatio(child))
	// );

	// boxes.forEach((box, idx) => {
	//   const elem = children[idx];
	//   this.css(elem, 'position', 'absolute');
	//   const actualWidth =
	//     box.width -
	//     this.getCSSNumber(elem, 'paddingLeft') -
	//     this.getCSSNumber(elem, 'paddingRight') -
	//     this.getCSSNumber(elem, 'marginLeft') -
	//     this.getCSSNumber(elem, 'marginRight') -
	//     this.getCSSNumber(elem, 'borderLeft') -
	//     this.getCSSNumber(elem, 'borderRight');

	//   const actualHeight =
	//     box.height -
	//     this.getCSSNumber(elem, 'paddingTop') -
	//     this.getCSSNumber(elem, 'paddingBottom') -
	//     this.getCSSNumber(elem, 'marginTop') -
	//     this.getCSSNumber(elem, 'marginBottom') -
	//     this.getCSSNumber(elem, 'borderTop') -
	//     this.getCSSNumber(elem, 'borderBottom');

	//   this.positionElement(
	//     elem,
	//     box.left + offsetLeft,
	//     box.top + offsetTop,
	//     actualWidth,
	//     actualHeight,
	//     animate
	//   );
	// });
	// }

	/**
	 * @hidden
	 */
	// private attachElements(
	//   bigOnes: HTMLVideoElement[],
	//   normalOnes: HTMLVideoElement[],
	//   smallOnes: HTMLVideoElement[]
	// ) {
	//   const containerHeight =
	//     this.getHeight(this.layoutContainer) -
	//     this.getCSSNumber(this.layoutContainer, 'borderTop') -
	//     this.getCSSNumber(this.layoutContainer, 'borderBottom');
	//   const containerWidth =
	//     this.getWidth(this.layoutContainer) -
	//     this.getCSSNumber(this.layoutContainer, 'borderLeft') -
	//     this.getCSSNumber(this.layoutContainer, 'borderRight');
	//   const offsetLeft = 0;
	//   const offsetTop = 0;
	//   if (this.existBigAndNormalOnes(bigOnes, normalOnes, smallOnes)) {
	//     const smallOnesAux = smallOnes.length > 0 ? smallOnes : normalOnes;
	//     const bigOnesAux = bigOnes.length > 0 ? bigOnes : normalOnes;
	//     this.arrangeBigAndSmallOnes(bigOnesAux, smallOnesAux, {
	//       containerHeight,
	//       containerWidth,
	//     });
	//   } else if (this.onlyExistBigOnes(bigOnes, normalOnes, smallOnes)) {
	//     // We only have one bigOne just center it
	//     this.arrange(
	//       bigOnes,
	//       containerWidth,
	//       containerHeight,
	//       0,
	//       0,
	//       this.opts.bigFixedRatio,
	//       this.opts.bigMinRatio,
	//       this.opts.bigMaxRatio,
	//       this.opts.animate
	//     );
	//   } else if (
	//     this.existBigAndNormalAndSmallOnes(bigOnes, normalOnes, smallOnes)
	//   ) {
	//     this.arrangeBigAndSmallOnes(bigOnes, normalOnes.concat(smallOnes), {
	//       containerHeight,
	//       containerWidth,
	//     });
	//   } else {
	//     const normalOnesAux = normalOnes.concat(smallOnes);
	//     this.arrange(
	//       normalOnesAux,
	//       containerWidth - offsetLeft,
	//       containerHeight - offsetTop,
	//       offsetLeft,
	//       offsetTop,
	//       this.opts.fixedRatio,
	//       this.opts.minRatio,
	//       this.opts.maxRatio,
	//       this.opts.animate
	//     );
	//   }
	// }

	/**
	 * @hidden
	 */
	// private arrangeBigAndSmallOnes(
	//   bigOnesAux: HTMLVideoElement[],
	//   smallOnesAux: HTMLVideoElement[],
	//   data: { containerHeight: number; containerWidth: number }
	// ) {
	//   const { containerWidth, containerHeight } = data;
	//   let offsetLeft = 0;
	//   let offsetTop = 0;
	//   const availableRatio = containerHeight / containerWidth;
	//   let bigOffsetTop = 0;
	//   let bigOffsetLeft = 0;
	//   let bigWidth, bigHeight;
	//   if (availableRatio > this.getVideoRatio(bigOnesAux[0])) {
	//     // We are tall, going to take up the whole width and arrange small
	//     // guys at the bottom
	//     bigWidth = containerWidth;
	//     bigHeight = Math.floor(containerHeight * this.opts.bigPercentage);
	//     offsetTop = bigHeight;
	//     bigOffsetTop = containerHeight - offsetTop;
	//   } else {
	//     // We are wide, going to take up the whole height and arrange the small
	//     // guys on the right
	//     bigHeight = containerHeight;
	//     bigWidth = Math.floor(containerWidth * this.opts.bigPercentage);
	//     offsetLeft = bigWidth;
	//     bigOffsetLeft = containerWidth - offsetLeft;
	//   }
	//   if (this.opts.bigFirst) {
	//     this.arrange(
	//       bigOnesAux,
	//       bigWidth,
	//       bigHeight,
	//       0,
	//       0,
	//       this.opts.bigFixedRatio,
	//       this.opts.bigMinRatio,
	//       this.opts.bigMaxRatio,
	//       this.opts.animate
	//     );
	//     this.arrange(
	//       smallOnesAux,
	//       containerWidth - offsetLeft,
	//       containerHeight - offsetTop,
	//       offsetLeft,
	//       offsetTop,
	//       this.opts.fixedRatio,
	//       this.opts.minRatio,
	//       this.opts.maxRatio,
	//       this.opts.animate
	//     );
	//   } else {
	//     this.arrange(
	//       smallOnesAux,
	//       containerWidth - offsetLeft,
	//       containerHeight - offsetTop,
	//       0,
	//       0,
	//       this.opts.fixedRatio,
	//       this.opts.minRatio,
	//       this.opts.maxRatio,
	//       this.opts.animate
	//     );
	//     this.arrange(
	//       bigOnesAux,
	//       bigWidth,
	//       bigHeight,
	//       bigOffsetLeft,
	//       bigOffsetTop,
	//       this.opts.bigFixedRatio,
	//       this.opts.bigMinRatio,
	//       this.opts.bigMaxRatio,
	//       this.opts.animate
	//     );
	//   }
	// }

	/**
	 * @hidden
	 */
	// private existBigAndNormalOnes(
	//   bigOnes: HTMLVideoElement[],
	//   normalOnes: HTMLVideoElement[],
	//   smallOnes: HTMLVideoElement[]
	// ) {
	//   return (
	//     (bigOnes.length > 0 && normalOnes.length > 0 && smallOnes.length === 0) ||
	//     (bigOnes.length > 0 && normalOnes.length === 0 && smallOnes.length > 0) ||
	//     (bigOnes.length === 0 && normalOnes.length > 0 && smallOnes.length > 0)
	//   );
	// }

	/**
	 * @hidden
	 */
	// private onlyExistBigOnes(
	//   bigOnes: HTMLVideoElement[],
	//   normalOnes: HTMLVideoElement[],
	//   smallOnes: HTMLVideoElement[]
	// ): boolean {
	//   return (
	//     bigOnes.length > 0 && normalOnes.length === 0 && smallOnes.length === 0
	//   );
	// }

	/**
	 * @hidden
	 */
	// private existBigAndNormalAndSmallOnes(
	//   bigOnes: HTMLVideoElement[],
	//   normalOnes: HTMLVideoElement[],
	//   smallOnes: HTMLVideoElement[]
	// ): boolean {
	//   return bigOnes.length > 0 && normalOnes.length > 0 && smallOnes.length > 0;
	// }

	/**
	 * @hidden
	 */
	private filterDisplayNone(element: HTMLElement) {
		return this.css(element, 'display') !== 'none';
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
	) {
		let maxArea: number;
		let targetCols: number;
		let targetRows: number;
		let targetHeight: number;
		let targetWidth: number;
		let tWidth: number;
		let tHeight: number;
		let tRatio: number;

		// Iterate through every possible combination of rows and columns
		// and see which one has the least amount of whitespace
		for (let i = 1; i <= count; i++) {
			const cols = i;
			const rows = Math.ceil(count / cols);

			// Try taking up the whole height and width
			tHeight = Math.floor(height / rows);
			tWidth = Math.floor(width / cols);

			tRatio = tHeight / tWidth;
			if (tRatio > maxRatio) {
				// We went over decrease the height
				tRatio = maxRatio;
				tHeight = tWidth * tRatio;
			} else if (tRatio < minRatio) {
				// We went under decrease the width
				tRatio = minRatio;
				tWidth = tHeight / tRatio;
			}

			tWidth = Math.min(maxWidth, tWidth);
			tHeight = Math.min(maxHeight, tHeight);
			const area = tWidth * tHeight * count;

			// If this width and height takes up the most space then we're going with that
			if (maxArea === undefined || area >= maxArea) {
				if (!(area === maxArea && count % (cols * rows) > count % (targetRows * targetCols))) {
					// Favour even numbers of participants in each row, eg. 2 on each row
					// instead of 3 in one row and then 1 on the next
					maxArea = area;
					targetHeight = tHeight;
					targetWidth = tWidth;
					targetCols = cols;
					targetRows = rows;
				}
			}
		}
		return {
			maxArea,
			targetCols,
			targetRows,
			targetHeight,
			targetWidth,
			ratio: targetHeight / targetWidth
		};
	}

	private getVideoRatio(element: { height: number; width: number; big?: boolean }) {
		return element.height / element.width;
	}
	private getLayout(opts: any, elements: { height: number; width: number; big?: boolean }[]) {
		const {
			maxRatio = 3 / 2,
			minRatio = 9 / 16,
			fixedRatio = false,
			bigPercentage = 0.8,
			minBigPercentage = 0,
			bigFixedRatio = false,
			bigMaxRatio = 3 / 2,
			bigMinRatio = 9 / 16,
			bigFirst = true,
			containerWidth = 640,
			containerHeight = 480,
			alignItems = 'center',
			bigAlignItems = 'center',
			smallAlignItems = 'center',
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
		const bigIndices = [];
		let bigBoxes = [];
		let smallBoxes = [];
		let areas: { big: any; small: any } = { big: null, small: null };

		// Move to Get Layout
		const smallOnes = elements.filter((element) => !element.big);
		const bigOnes = elements.filter((element, idx) => {
			if (element.big) {
				bigIndices.push(idx);
				return true;
			}
			return false;
		});
		//TODO: Habia un codigo personalizado que servía para
		//TODO: tener videos grandes, pequeños y normales
		//.filter((x) => !smallOnes.includes(x));

		// const normalOnes: HTMLVideoElement[] = Array.prototype.filter
		//   .call(
		//     this.layoutContainer.querySelectorAll(
		//       `#${id}>*:not(.${this.opts.bigClass})`
		//     ),
		//     () => this.filterDisplayNone
		//   )
		//   .filter((x) => !smallOnes.includes(x));
		// this.attachElements(bigOnes, normalOnes, smallOnes);
		if (bigOnes.length > 0 && smallOnes.length > 0) {
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
						smallOnes.length,
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
						smallOnes.length,
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
				areas.small = {
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
				areas.small = {
					top: 0,
					left: 0,
					width: containerWidth - offsetLeft,
					height: containerHeight - offsetTop
				};
			}
		} else if (bigOnes.length > 0 && smallOnes.length === 0) {
			// We only have one bigOne just center it
			areas.big = {
				top: 0,
				left: 0,
				width: containerWidth,
				height: containerHeight
			};
		} else {
			areas.small = {
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

		const boxes = [];
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
		return { boxes, areas };
	}

	private getLayoutAux(opts: any, elements: { height: number; width: number; big?: boolean }[]) {
		const {
			maxRatio = 3 / 2,
			minRatio = 9 / 16,
			fixedRatio = false,
			containerWidth = 640,
			containerHeight = 480,
			offsetLeft = 0,
			offsetTop = 0,
			alignItems = 'center',
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
			const ratio = ratios.length > 0 ? ratios[0] : null;
			dimensions = this.getBestDimensions(ratio, ratio, containerWidth, containerHeight, count, maxWidth, maxHeight);
		}

		// Loop through each stream in the container and place it inside
		let x = 0;
		let y = 0;
		const rows = [];
		let row;
		const boxes = [];

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
			let targetHeight;
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
