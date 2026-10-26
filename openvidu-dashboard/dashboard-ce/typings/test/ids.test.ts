import { describe, expect, it } from 'vitest';

import { ENTITY_ID_PATTERNS, entityIdKind, isEntityId } from '../src/index.js';

describe('entity identifiers', () => {
	it('recognises the exact identifier of each entity', () => {
		expect(entityIdKind('RM_ab12cd')).toBe('room');
		expect(entityIdKind('PA_x1y2')).toBe('participant');
		expect(entityIdKind('EG_a1b2')).toBe('egress');
		expect(entityIdKind('IN_c3d4')).toBe('ingress');
		expect(entityIdKind('TR_cam1')).toBe('track');
		expect(isEntityId('room', 'RM_ab12cd')).toBe(true);
		expect(isEntityId('room', 'PA_x1y2')).toBe(false);
	});

	it.each(['RM_', 'rm_abc', 'RM_ab-cd', ' RM_ab', 'demo-room'])('rejects %j', (value) => {
		expect(entityIdKind(value)).toBeUndefined();
	});

	it('anchors every pattern', () => {
		expect(Object.values(ENTITY_ID_PATTERNS).every((pattern) => pattern.source.startsWith('^'))).toBe(true);
	});
});
