/** Values of an `as const` enumeration object, as the non-empty tuple `z.enum` takes. */
export function enumValues<T extends Record<string, string>>(enumeration: T): [T[keyof T], ...T[keyof T][]] {
	return Object.values(enumeration) as [T[keyof T], ...T[keyof T][]];
}
