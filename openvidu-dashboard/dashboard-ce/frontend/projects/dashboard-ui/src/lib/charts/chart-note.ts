import type { BucketGranularity } from '@openvidu-dashboard/typings';

const BUCKET_NOTES: Readonly<Record<BucketGranularity, string>> = {
	'30s': '30-second buckets',
	'1m': 'One-minute buckets',
	'5m': 'Five-minute buckets',
	'15m': '15-minute buckets',
	'1h': 'Hourly',
	'6h': 'Six-hour buckets',
	'1d': 'Daily'
};

/** The note of a time-series chart: its bucket and the zone of its axis, as "Hourly · Europe/Madrid". */
export function seriesNote(granularity: BucketGranularity | undefined, tz: string): string {
	return granularity === undefined ? tz : `${BUCKET_NOTES[granularity]} · ${tz}`;
}
