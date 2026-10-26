import { describe, expect, it } from 'vitest';

import { EGRESS_TYPE_LABELS, enumLabel, INGRESS_INPUT_LABELS } from './labels.js';

describe('enumLabel', () => {
	it('reads the label, the raw value without one, and "—" when absent', () => {
		expect(enumLabel(EGRESS_TYPE_LABELS, 'room_composite')).toBe('Room composite');
		expect(enumLabel(INGRESS_INPUT_LABELS, 'NEW_INPUT')).toBe('NEW_INPUT');
		expect(enumLabel(EGRESS_TYPE_LABELS, undefined)).toBe('—');
	});
});
