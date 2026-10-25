import { describe, expect, it } from 'vitest';

import { MIN_SUPPORTED_SCHEMA_VERSION, SCHEMA_VERSION } from '@openvidu-dashboard/typings';

import { olderSchemaMessage, schemaStatus } from '../../src/schema/schema-status.js';

describe('writer schema status', () => {
	it('classifies the writer version', () => {
		expect(schemaStatus(undefined)).toEqual({ dashboard: SCHEMA_VERSION, status: 'uninitialized' });
		expect(schemaStatus(SCHEMA_VERSION)).toEqual({
			dashboard: SCHEMA_VERSION,
			writer: SCHEMA_VERSION,
			status: 'ok'
		});
		expect(schemaStatus(SCHEMA_VERSION + 1).status).toBe('newer');
		expect(schemaStatus(MIN_SUPPORTED_SCHEMA_VERSION - 1).status).toBe('older');
	});

	it('tells an older writer to upgrade', () => {
		expect(olderSchemaMessage(0)).toBe(
			`Analytics schema version 0 is older than the minimum ${String(MIN_SUPPORTED_SCHEMA_VERSION)} supported by this dashboard; upgrade the OpenVidu server`
		);
	});
});
