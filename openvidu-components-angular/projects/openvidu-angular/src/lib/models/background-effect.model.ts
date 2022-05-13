export enum EffectType {
	NONE = 'NONE',
	BLUR = 'BLUR',
	IMAGE = 'IMAGE'
}

export interface BackgroundEffect {
	id: string;
	type: EffectType;
	thumbnail: string;
	src?: string;
}
