/**
 * @internal
 */
export enum EffectType {
	NONE = 'NONE',
	BLUR = 'BLUR',
	IMAGE = 'IMAGE'
}

/**
 * @internal
 */
export interface BackgroundEffect {
	id: string;
	type: EffectType;
	thumbnail: string;
	src?: string;
}
