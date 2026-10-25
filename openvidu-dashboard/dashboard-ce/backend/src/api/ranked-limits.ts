import type { InfoLimits } from '@openvidu-dashboard/typings';

/** Ranked participant sorts scan every session of the range: at most a day of them without a room filter. */
const PARTICIPANT_RANKED_SORT_MAX_RANGE_MS = 86_400_000;

/** The ranked sort limits of a `DASHBOARD_LIST_TOTAL_MAX_RANGE`. */
export function rankedSortLimits(totalMaxRangeMs: number): InfoLimits {
	return {
		rankedSortMaxRangeMs: totalMaxRangeMs,
		participantRankedSortMaxRangeMs: Math.min(PARTICIPANT_RANKED_SORT_MAX_RANGE_MS, totalMaxRangeMs)
	};
}
