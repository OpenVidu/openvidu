import { describe, expect, it } from 'vitest';

import { ifNoneMatchMatches } from '../../src/http/conditional.js';

describe('If-None-Match', () => {
	it('compares validators weakly, in lists and with the wildcard', () => {
		expect(ifNoneMatchMatches('W/"1-2"', 'W/"1-2"')).toBe(true);
		expect(ifNoneMatchMatches('"1-2"', 'W/"1-2"')).toBe(true);
		expect(ifNoneMatchMatches('W/"0-0", W/"1-2"', 'W/"1-2"')).toBe(true);
		expect(ifNoneMatchMatches('*', 'W/"1-2"')).toBe(true);
		expect(ifNoneMatchMatches('W/"1-3"', 'W/"1-2"')).toBe(false);
		expect(ifNoneMatchMatches(undefined, 'W/"1-2"')).toBe(false);
	});
});
