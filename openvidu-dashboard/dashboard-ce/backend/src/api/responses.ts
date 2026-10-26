import * as z from 'zod';

export const isoDate = z.iso.datetime();

/** `stale` of rooms and participants: present, `true`, only while the entity is active without recent stats. */
export const staleField = z
	.literal(true)
	.optional()
	.meta({ description: 'Active entity whose last stats flush is older than the stale window' });

/** `ListResponse<T>`: one page of a list with its cursors and, under the range limit, `total`. */
export function listResponse(item: z.ZodType, id: string) {
	return z
		.object({
			items: z.array(item),
			nextCursor: z.string().nullable(),
			prevCursor: z.string().nullable(),
			total: z.number().int().optional()
		})
		.meta({ id });
}
