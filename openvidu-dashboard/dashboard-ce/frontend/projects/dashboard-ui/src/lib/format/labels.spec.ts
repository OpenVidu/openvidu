import { describe, expect, it } from 'vitest';

import { BROWSER_LABELS, clientOsLabel, EGRESS_TYPE_LABELS, enumLabel, INGRESS_INPUT_LABELS } from './labels.js';

describe('enumLabel', () => {
	it('reads the label, the raw value without one, and "—" when absent', () => {
		expect(enumLabel(EGRESS_TYPE_LABELS, 'room_composite')).toBe('Room composite');
		expect(enumLabel(INGRESS_INPUT_LABELS, 'NEW_INPUT')).toBe('NEW_INPUT');
		expect(enumLabel(EGRESS_TYPE_LABELS, undefined)).toBe('—');
	});
});

describe('client labels', () => {
	it('labels the browser keys, sessions without a browser included', () => {
		expect(['chrome', 'none', 'other'].map((key) => enumLabel(BROWSER_LABELS, key))).toEqual([
			'Chrome',
			'No browser',
			'Other'
		]);
	});

	it('reads a reported OS as its family label when it names one, else as reported', () => {
		expect(['linux', 'Linux', 'macos', ' iOS ', 'Chrome OS', ''].map(clientOsLabel)).toEqual([
			'Linux',
			'Linux',
			'macOS',
			'iOS',
			'Chrome OS',
			'—'
		]);
	});
});
