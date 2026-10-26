type OptionalKeys<T> = { [K in keyof T]-?: object extends Pick<T, K> ? K : never }[keyof T];

/** `T` with its optional properties also accepting `undefined`. */
export type Loose<T> = Omit<T, OptionalKeys<T>> & { [K in OptionalKeys<T>]?: T[K] | undefined };

/** Drops undefined properties, so optional fields stay absent under `exactOptionalPropertyTypes`. */
export function compact<T extends object>(value: Loose<T>): T {
	return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;
}
