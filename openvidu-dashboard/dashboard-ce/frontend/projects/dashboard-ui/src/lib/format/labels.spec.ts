import { describe, expect, it } from 'vitest';

import {
	BROWSER_LABELS,
	clientOsLabel,
	EGRESS_TYPE_LABELS,
	enumLabel,
	INGRESS_INPUT_LABELS,
	MEDIA_STATS_TEXTS,
	ROOM_TOPOLOGY_LABELS
} from './labels.js';

describe('enumLabel', () => {
	it('reads the label, the raw value without one, and "—" when absent', () => {
		expect(enumLabel(EGRESS_TYPE_LABELS, 'room_composite')).toBe('Room composite');
		expect(enumLabel(INGRESS_INPUT_LABELS, 'NEW_INPUT')).toBe('NEW_INPUT');
		expect(enumLabel(EGRESS_TYPE_LABELS, undefined)).toBe('—');
	});
});

describe('room topology labels', () => {
	it('labels every topology from the emptiest to the most participative', () => {
		expect(Object.values(ROOM_TOPOLOGY_LABELS)).toEqual([
			'Empty',
			'Single participant',
			'No publishers',
			'1:1',
			'1:N',
			'N:M'
		]);
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

describe('MEDIA_STATS_TEXTS', () => {
	it('Texts', () => {
		expect(MEDIA_STATS_TEXTS.entity('room')).toBe('No media statistics were recorded for this room.');
		expect(MEDIA_STATS_TEXTS.entity('participant')).toBe('No media statistics were recorded for this participant.');
		expect(MEDIA_STATS_TEXTS.entity('track')).toBe('No media statistics were recorded for this track.');
		expect(MEDIA_STATS_TEXTS.rangeNone).toBe('There is no data for the requested timeframe.');
		expect(MEDIA_STATS_TEXTS.column).toBe('Rooms with no data for the requested timeframe show no value.');
	});
});
