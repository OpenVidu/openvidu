import * as z from 'zod';

import { tzParam } from '../api/query.js';

export const overviewQuery = z.object({ tz: tzParam });

export type OverviewParams = z.output<typeof overviewQuery>;
