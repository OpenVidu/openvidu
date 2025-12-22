import { LayoutDimensionsCache } from './layout-dimensions-cache.model';
import {
	BestDimensions,
	CategorizedElements,
	ElementDimensions,
	ExtendedLayoutOptions,
	LAYOUT_CONSTANTS,
	LayoutAlignment,
	LayoutBox,
	LayoutCalculationResult,
	LayoutRow
} from './layout-types.model';

/**
 * Pure calculation logic for layout positioning.
 * Contains all mathematical algorithms for element positioning without DOM manipulation.
 *
 * @internal
 */
export class LayoutCalculator {
	constructor(private dimensionsCache: LayoutDimensionsCache) {}

	/**
	 * Calculate complete layout including boxes and areas
	 * @param opts Extended layout options with container dimensions
	 * @param elements Array of element dimensions
	 * @returns Layout calculation result with boxes and areas
	 */
	calculateLayout(opts: ExtendedLayoutOptions, elements: ElementDimensions[]): LayoutCalculationResult {
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

		// Categorize elements
		const categorized = this.categorizeElements(elements);
		const { bigOnes, normalOnes, smallOnes, topBarOnes } = categorized;

		let bigBoxes: LayoutBox[] = [];
		let smallBoxes: LayoutBox[] = [];
		let topBarBoxes: LayoutBox[] = [];
		let normalBoxes: LayoutBox[] = [];
		let areas: LayoutCalculationResult['areas'] = { big: null, normal: null, small: null, topBar: null };

		// Handle different layout scenarios based on element types
		if (bigOnes.length > 0 && (normalOnes.length > 0 || smallOnes.length > 0 || topBarOnes.length > 0)) {
			// Scenario: Big elements with normal/small/topbar elements
			let bigWidth;
			let bigHeight;
			let showBigFirst = bigFirst;

			if (availableRatio > this.getVideoRatio(bigOnes[0])) {
				// We are tall, going to take up the whole width and arrange small guys at the bottom
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
						bigDimensions = this.getBestDimensions(ratio, ratio, bigWidth, bigHeight, bigOnes.length, bigMaxWidth, bigMaxHeight);
					}

					bigHeight = Math.max(
						containerHeight * minBigPercentage,
						Math.min(bigHeight, bigDimensions.targetHeight * bigDimensions.targetRows)
					);

					// Don't awkwardly scale the small area bigger than we need to and end up with floating videos in the middle
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
				// We are wide, going to take up the whole height and arrange the small guys on the right
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
						bigDimensions = this.getBestDimensions(ratio, ratio, bigWidth, bigHeight, bigOnes.length, bigMaxWidth, bigMaxHeight);
					}

					bigWidth = Math.max(
						containerWidth * minBigPercentage,
						Math.min(bigWidth, bigDimensions.targetWidth * bigDimensions.targetCols)
					);

					// Don't awkwardly scale the small area bigger than we need to and end up with floating videos in the middle
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
				areas.big = { top: 0, left: 0, width: bigWidth, height: bigHeight };
				areas.normal = { top: offsetTop, left: offsetLeft, width: containerWidth - offsetLeft, height: containerHeight - offsetTop };
			} else {
				areas.big = { left: bigOffsetLeft, top: bigOffsetTop, width: bigWidth, height: bigHeight };
				areas.normal = { top: 0, left: 0, width: containerWidth - offsetLeft, height: containerHeight - offsetTop };
			}
		} else if (bigOnes.length > 0 && normalOnes.length === 0 && smallOnes.length === 0 && topBarOnes.length === 0) {
			// We only have bigOnes just center it
			areas.big = { top: 0, left: 0, width: containerWidth, height: containerHeight };
		} else if (normalOnes.length > 0 || smallOnes.length > 0 || topBarOnes.length > 0) {
			// Only normal, small, and/or topbar elements
			areas.normal = { top: offsetTop, left: offsetLeft, width: containerWidth - offsetLeft, height: containerHeight - offsetTop };
		}

		// Calculate boxes for each area
		if (areas.big) {
			bigBoxes = this.calculateBoxesForArea(
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
				normalBoxes = this.calculateBoxesForArea(
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

		// Rebuild the array in the right order based on element types
		const boxes = this.reconstructBoxesInOrder(
			elements,
			categorized,
			bigBoxes,
			normalBoxes,
			smallBoxes,
			topBarBoxes
		);

		return { boxes, areas };
	}

	/**
	 * Calculate best dimensions for a set of elements
	 * @param minRatio Minimum aspect ratio
	 * @param maxRatio Maximum aspect ratio
	 * @param width Available width
	 * @param height Available height
	 * @param count Number of elements
	 * @param maxWidth Maximum element width
	 * @param maxHeight Maximum element height
	 * @returns Best dimensions calculation result
	 */
	getBestDimensions(
		minRatio: number,
		maxRatio: number,
		width: number,
		height: number,
		count: number,
		maxWidth: number,
		maxHeight: number
	): BestDimensions {
		// Cache key for memoization
		const cacheKey = LayoutDimensionsCache.generateKey(minRatio, maxRatio, width, height, count, maxWidth, maxHeight);
		const cached = this.dimensionsCache.get(cacheKey);
		if (cached) {
			return cached;
		}

		let maxArea: number | undefined;
		let targetCols = 1;
		let targetRows = 1;
		let targetHeight = 0;
		let targetWidth = 0;

		// Iterate through every possible combination of rows and columns
		// and see which one has the least amount of whitespace
		for (let i = 1; i <= count; i++) {
			const cols = i;
			const rows = Math.ceil(count / cols);

			// Try taking up the whole height and width
			let tHeight = Math.floor(height / rows);
			let tWidth = Math.floor(width / cols);

			let tRatio = tHeight / tWidth;
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

		const result: BestDimensions = {
			maxArea: maxArea || 0,
			targetCols: targetCols,
			targetRows: targetRows,
			targetHeight: targetHeight,
			targetWidth: targetWidth,
			ratio: targetHeight / targetWidth || 0
		};

		// Cache the result for future use
		this.dimensionsCache.set(cacheKey, result);

		return result;
	}

	/**
	 * Calculate boxes for a specific area
	 * @param opts Area-specific layout options
	 * @param elements Elements to position in this area
	 * @returns Array of layout boxes
	 */
	private calculateBoxesForArea(
		opts: Partial<ExtendedLayoutOptions & { offsetLeft: number; offsetTop: number }>,
		elements: ElementDimensions[]
	): LayoutBox[] {
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
		// and calculate the width of each row so that we know if we go over the size and need to adjust
		for (let i = 0; i < ratios.length; i++) {
			if (i % dimensions.targetCols === 0) {
				// This is a new row
				row = { ratios: [], width: 0, height: 0 };
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
			case LayoutAlignment.START:
				y = 0;
				break;
			case LayoutAlignment.END:
				y = containerHeight - totalRowHeight;
				break;
			case LayoutAlignment.CENTER:
			default:
				y = (containerHeight - totalRowHeight) / 2;
				break;
		}

		// Iterate through each row and place each child
		for (let i = 0; i < rows.length; i++) {
			row = rows[i];
			let rowMarginLeft;
			switch (alignItems) {
				case LayoutAlignment.START:
					rowMarginLeft = 0;
					break;
				case LayoutAlignment.END:
					rowMarginLeft = containerWidth - row.width;
					break;
				case LayoutAlignment.CENTER:
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

	/**
	 * Categorize elements into big, normal, small, and topBar
	 * @param elements Elements to categorize
	 * @returns Categorized elements with their indices
	 */
	private categorizeElements(elements: ElementDimensions[]): CategorizedElements & {
		bigOnes: ElementDimensions[];
		normalOnes: ElementDimensions[];
		smallOnes: ElementDimensions[];
		topBarOnes: ElementDimensions[];
	} {
		const bigIndices: number[] = [];
		const smallIndices: number[] = [];
		const topBarIndices: number[] = [];
		const normalIndices: number[] = [];

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

		return {
			big: bigOnes,
			normal: normalOnes,
			small: smallOnes,
			topBar: topBarOnes,
			bigOnes,
			normalOnes,
			smallOnes,
			topBarOnes,
			bigIndices,
			normalIndices,
			smallIndices,
			topBarIndices
		};
	}

	/**
	 * Reconstruct boxes in original element order
	 * @param elements Original elements
	 * @param categorized Categorized elements
	 * @param bigBoxes Boxes for big elements
	 * @param normalBoxes Boxes for normal elements
	 * @param smallBoxes Boxes for small elements
	 * @param topBarBoxes Boxes for topBar elements
	 * @returns Boxes in original order
	 */
	private reconstructBoxesInOrder(
		elements: ElementDimensions[],
		categorized: CategorizedElements,
		bigBoxes: LayoutBox[],
		normalBoxes: LayoutBox[],
		smallBoxes: LayoutBox[],
		topBarBoxes: LayoutBox[]
	): LayoutBox[] {
		const boxes: LayoutBox[] = [];
		let bigBoxesIdx = 0;
		let normalBoxesIdx = 0;
		let smallBoxesIdx = 0;
		let topBarBoxesIdx = 0;

		elements.forEach((element, idx) => {
			if (categorized.bigIndices.indexOf(idx) > -1) {
				boxes[idx] = bigBoxes[bigBoxesIdx];
				bigBoxesIdx += 1;
			} else if (categorized.topBarIndices.indexOf(idx) > -1) {
				boxes[idx] = topBarBoxes[topBarBoxesIdx];
				topBarBoxesIdx += 1;
			} else if (categorized.smallIndices.indexOf(idx) > -1) {
				boxes[idx] = smallBoxes[smallBoxesIdx];
				smallBoxesIdx += 1;
			} else {
				boxes[idx] = normalBoxes[normalBoxesIdx];
				normalBoxesIdx += 1;
			}
		});

		return boxes;
	}

	/**
	 * Get video aspect ratio
	 * @param element Element dimensions
	 * @returns Aspect ratio (height/width)
	 */
	private getVideoRatio(element: ElementDimensions): number {
		return element.height / element.width;
	}
}
