export enum AvatarType {
	DEFAULT = 'default',
	CAPTURED = 'captured'
}

export interface ChatMessage {
	isLocal: boolean;
	nickname: string;
	message: string;
}
