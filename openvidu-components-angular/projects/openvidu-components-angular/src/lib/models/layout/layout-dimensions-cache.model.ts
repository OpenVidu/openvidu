import { BestDimensions } from './layout-types.model';

/**
 * Manages caching of dimension calculations for layout optimization.
 * Uses memoization to avoid recalculating the same layout dimensions.
 * 
 * @internal
 */
export class LayoutDimensionsCache {
	private cache = new Map<string, BestDimensions>();

	/**
	 * Retrieves cached dimension calculation if available
	 * @param key Cache key generated from calculation parameters
	 * @returns Cached dimensions or undefined if not found
	 */
	get(key: string): BestDimensions | undefined {
		return this.cache.get(key);
	}

	/**
	 * Stores dimension calculation result in cache
	 * @param key Cache key generated from calculation parameters
	 * @param value Calculated best dimensions
	 */
	set(key: string, value: BestDimensions): void {
		this.cache.set(key, value);
	}

	/**
	 * Clears all cached dimensions to free memory
	 */
	clear(): void {
		this.cache.clear();
	}

	/**
	 * Gets the current cache size
	 * @returns Number of cached entries
	 */
	size(): number {
		return this.cache.size;
	}

	/**
	 * Checks if a key exists in the cache
	 * @param key Cache key to check
	 * @returns True if key exists
	 */
	has(key: string): boolean {
		return this.cache.has(key);
	}

	/**
	 * Generates a cache key from calculation parameters
	 * @param minRatio Minimum aspect ratio
	 * @param maxRatio Maximum aspect ratio
	 * @param width Container width
	 * @param height Container height
	 * @param count Number of elements
	 * @param maxWidth Maximum element width
	 * @param maxHeight Maximum element height
	 * @returns Cache key string
	 */
	static generateKey(
		minRatio: number,
		maxRatio: number,
		width: number,
		height: number,
		count: number,
		maxWidth: number,
		maxHeight: number
	): string {
		return `${minRatio}_${maxRatio}_${width}_${height}_${count}_${maxWidth}_${maxHeight}`;
	}
}
