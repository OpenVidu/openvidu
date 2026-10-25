import type { FeatureKey } from '../api/features.js';
import type { InfoRetention } from '../api/info.js';

/** Behaviour of a dashboard page that the shell reads from its route. */
export interface PageMeta {
	/** PRO feature the page needs; CE renders the full-page lock when it is disabled. */
	feature?: FeatureKey;
	/** The header shows the refresh control. */
	liveCapable: boolean;
	/** The header shows the range picker and the page reads `from` and `to`. */
	rangeScoped: boolean;
	/** The page shows times in the session zone and keeps it in its URL as `tz`; false when absent. */
	timed?: boolean;
	/** Retention of the page's data in `GET /info`; the range picker warns about ranges that start before it. */
	retention?: keyof InfoRetention;
}

/** Sidenav entry of a top-level page. */
export interface NavigationMeta extends PageMeta {
	label: string;
	/** Material Symbols name, present in the icon manifest. */
	icon: string;
	/** Absolute path the entry links to, e.g. `/rooms`. */
	path: string;
	/** Position in the sidenav, ascending. */
	order: number;
}
