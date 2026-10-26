/** Deterministic pseudo-random source (mulberry32) with the sampling helpers used by the generator. */
export class Rng {
	private state: number;

	constructor(seed: number) {
		this.state = seed >>> 0;
	}

	/** Uniform float in [0, 1). */
	next(): number {
		this.state = (this.state + 0x6d2b79f5) >>> 0;
		let t = this.state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	}

	/** Uniform integer in [min, max]. */
	int(min: number, max: number): number {
		return min + Math.floor(this.next() * (max - min + 1));
	}

	float(min: number, max: number): number {
		return min + this.next() * (max - min);
	}

	chance(probability: number): boolean {
		return this.next() < probability;
	}

	pick<T>(items: readonly T[]): T {
		const item = items[Math.floor(this.next() * items.length)];

		if (item === undefined) {
			throw new Error('pick() on an empty array');
		}

		return item;
	}

	/** Picks a value with probability proportional to its weight. */
	weighted<T>(entries: readonly (readonly [T, number])[]): T {
		const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
		let roll = this.next() * total;

		for (const [value, weight] of entries) {
			roll -= weight;

			if (roll < 0) {
				return value;
			}
		}

		const last = entries.at(-1);

		if (last === undefined) {
			throw new Error('weighted() on an empty array');
		}

		return last[0];
	}

	/** Knuth's algorithm; good enough for the small means used here. */
	poisson(mean: number): number {
		if (mean <= 0) {
			return 0;
		}

		const limit = Math.exp(-mean);
		let k = 0;
		let p = 1;

		do {
			k += 1;
			p *= this.next();
		} while (p > limit);

		return k - 1;
	}

	/** Box-Muller normal sample. */
	gaussian(mean: number, stdDev: number): number {
		const u = 1 - this.next();
		const v = this.next();

		return mean + stdDev * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
	}

	/** Normal sample clamped to [min, max]. */
	clampedGaussian(mean: number, stdDev: number, min: number, max: number): number {
		return Math.min(max, Math.max(min, this.gaussian(mean, stdDev)));
	}

	/** Random identifier in the LiveKit style: a prefix followed by alphanumeric characters. */
	id(prefix: string, length = 12): string {
		let out = prefix;

		for (let i = 0; i < length; i += 1) {
			out += ID_ALPHABET.charAt(Math.floor(this.next() * ID_ALPHABET.length));
		}

		return out;
	}
}

const ID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
