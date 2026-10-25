import { describe, expect, it } from 'vitest';

import { INFO_TEXTS } from './info-texts.js';

/** The texts of the `ui-info-tips` spec, verbatim. */
const SPEC: Partial<Record<keyof typeof INFO_TEXTS, string>> = {
	participantSessions:
		'Each time someone joins a room starts a participant session; leaving and joining again starts another. Only regular participants count: egress, ingress and agents are services.',
	uniqueIdentities:
		'Distinct participant identities among those sessions: someone who joined three times counts once.',
	services:
		'Egress, ingress, agent and other non-user sessions. They join rooms as participants but are not counted as participants.',
	sdk: 'Software development kit the client connected with.',
	liveAgents:
		'Agent sessions connected now. Agents join rooms as participants of kind Agent but are not counted as participants.',
	todayMinutes: 'Minutes of the participant sessions that ended today.',
	dailyUniqueIdentities:
		'Distinct participant identities per UTC day, counted once the day has closed; over several days the daily values are added up, so someone who joined on two days counts twice.'
};

describe('INFO_TEXTS', () => {
	it('reads the texts of the spec', () => {
		for (const [key, text] of Object.entries(SPEC)) {
			expect(INFO_TEXTS[key as keyof typeof INFO_TEXTS]).toBe(text);
		}
	});

	it('writes every text as one or two sentences ending with a full stop', () => {
		for (const text of Object.values(INFO_TEXTS)) {
			expect(text).toMatch(/^[A-Z].*\.$/);
			expect(text.split('. ').length).toBeLessThanOrEqual(3);
		}
	});
});
