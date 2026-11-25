import { hashId, hashRng, KeyedRng } from '@openvidu-dashboard/data-generator/random';
import { describe, expect, it } from 'vitest';

/** The streams of the live writer's rooms (`KeyedRng`): ids from SHA-256, every other draw as `hashRng()` draws it. */
describe('KeyedRng', () => {
	const key = '5|1795420800000|42|rng';

	it('draws its ids from hashId() of its key and their ordinal', () => {
		const rng = new KeyedRng(key);

		expect([rng.id('RM_'), rng.id('PA_'), rng.id('ND_', 8)]).toEqual([
			hashId('RM_', `${key}|1`),
			hashId('PA_', `${key}|2`),
			hashId('ND_', `${key}|3`, 8)
		]);
	});

	it('never repeats an id across the streams of many rooms', () => {
		const ids = new Set<string>();
		let drawn = 0;

		for (let room = 0; room < 2_000; room += 1) {
			for (const name of ['rng', 'shape', 'ingress', 'egress', 'media', 'api']) {
				const rng = new KeyedRng(`5|1795420800000|${String(room)}|${name}`);

				for (let k = 0; k < 5; k += 1) {
					ids.add(rng.id('TR_'));
					drawn += 1;
				}
			}
		}

		expect(ids.size).toBe(drawn);
	});

	it('draws every other value as the FNV-seeded stream of the same key, ids included in its state', () => {
		const keyed = new KeyedRng(key);
		const plain = hashRng(key);
		const draws = (rng: ReturnType<typeof hashRng>): unknown[] => {
			const values: unknown[] = [rng.next(), rng.int(1, 100)];

			rng.id('PA_');
			values.push(rng.float(0, 1), rng.chance(0.5));
			rng.id('EG_', 8);
			values.push(rng.gaussian(0, 1), rng.pick(['a', 'b', 'c']));

			return values;
		};

		expect(draws(keyed)).toEqual(draws(plain));
	});
});
