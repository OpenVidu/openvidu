import { describe, expect, it } from 'vitest';

import { egressErrorHint, isEgressId } from '../egress/egress-display.js';
import { publishedSources } from '../participants/participant-display.js';
import { formatBandwidth, isRoomSid } from './room-display.js';

describe('room display', () => {
	it('detects SIDs and formats the bandwidth', () => {
		expect(isRoomSid('RM_ab12cd')).toBe(true);
		expect(isRoomSid('demo')).toBe(false);
		expect(formatBandwidth({ up: 12_300_000, down: 48_000_000 })).toBe('↑ 12.3 MB ↓ 48 MB');
	});

	it('detects egress IDs, explains egress errors and lists the published sources', () => {
		expect(isEgressId('EG_ab12cd')).toBe(true);
		expect(egressErrorHint({ errorCode: 403 })).toBe('Egress failed (code 403) — open the detail for the error');
		expect(egressErrorHint({})).toBe('Egress failed — open the detail for the error');
		expect(publishedSources({ MICROPHONE: 1, CAMERA: 1, SCREEN_SHARE: 0 })).toEqual(['CAMERA', 'MICROPHONE']);
		expect(publishedSources({})).toEqual([]);
	});
});
