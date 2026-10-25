import { Double, Int32, Long } from 'bson';
import { SCHEMA_VERSION } from '../../src/index.js';

/**
 * Shared facts of the fixture scenario: one closed room on node alpha (09:00–09:45 UTC) and one active room on node
 * beta (since 10:00 UTC) on 2026-10-12, with the participants, tracks, egress and ingress they involve.
 */

export const DAY = '2026-10-12';
export const RETENTION_DAY_MS = 86_400_000;
export const ENTITIES_RETENTION_MS = 90 * RETENTION_DAY_MS;
export const TRACKS_RETENTION_MS = 7 * RETENTION_DAY_MS;

export const NODE_ALPHA = 'ND_alpha8Kq2Lm';
export const NODE_BETA = 'ND_beta3Vx9Pw';
export const SERVER_VERSION = '3.10.0';
export const REGION = 'eu-west';

export const CLOSED_ROOM = { sid: 'RM_aLkq3ZpD9wXy', name: 'Daily-Standup' } as const;
export const ACTIVE_ROOM = { sid: 'RM_bQ7tVnW2cErT', name: 'Webinar-Q4' } as const;

export const P = {
	alice: 'PA_aL1ce7Hd2Kq9',
	bob1: 'PA_b0bFirst4Tz1',
	bob2: 'PA_b0bSecnd8Rw3',
	carol: 'PA_car0lAb0rt5n',
	egressRecorder: 'PA_egRec0rder01',
	agent: 'PA_ag3ntAssist1',
	sip: 'PA_s1pCaller7Yx',
	dave: 'PA_dav3Pub6Mn2',
	erin: 'PA_er1nJ0in9Qa',
	ingress1: 'PA_1ngressSes01',
	ingress2: 'PA_1ngressSes02',
	egressStreamer: 'PA_egStr3amer02'
} as const;

export const T = {
	aliceCamera: 'TR_aLiceCam3Vp8',
	aliceMic: 'TR_aLiceMic0pus',
	daveCamera: 'TR_daveCamH264x',
	daveMic: 'TR_daveMic0pusx',
	ingressVideo1: 'TR_1ngVid1H264a',
	ingressVideo2: 'TR_1ngVid2H264b'
} as const;

export const EG = {
	recording: 'EG_rec0rdMp4Kq2',
	trackFailed: 'EG_trackF4iled9',
	streaming: 'EG_streamHls7Wz'
} as const;

export const IN = {
	rtmp: 'IN_0bsRtmpReu5e',
	whipDeleted: 'IN_wh1pDeleted3'
} as const;

export const INGRESS_SESSION = {
	first: 'rtmp_7f3c9a1e2b4d',
	second: 'rtmp_9d4e2f6a8c1b'
} as const;

/** UTC instant on the scenario day, `HH:MM:SS[.mmm]`. */
export function at(time: string): Date {
	return new Date(`${DAY}T${time}Z`);
}

export function plus(date: Date, ms: number): Date {
	return new Date(date.getTime() + ms);
}

export function between(from: Date, to: Date): number {
	return to.getTime() - from.getTime();
}

export const schemaVersion = SCHEMA_VERSION;

/** Explicitly typed numbers for protocol payloads, which the schemas do not describe. */
export const i32 = (value: number): Int32 => new Int32(value);
export const i64 = (value: number): Long => Long.fromNumber(value);
export const f64 = (value: number): Double => new Double(value);

export const unixSeconds = (date: Date): Long => Long.fromNumber(Math.floor(date.getTime() / 1000));
export const unixMs = (date: Date): Long => Long.fromNumber(date.getTime());
export const unixNs = (date: Date): Long => Long.fromNumber(date.getTime()).multiply(1_000_000);
