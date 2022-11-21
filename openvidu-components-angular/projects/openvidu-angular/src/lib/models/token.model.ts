
/**
 *
 * TokenModel type must be contain a `webcam` property (it will be used by a standart participant).
 * It also optionally can contain a `screen` property.
 *
 * If TokenModel contains the `screen` token, the participant will be able to share a screen and camera at the same time.
 * Otherwise, the participant will not be able to share a screen.
 */
export interface TokenModel {
	webcam: string;
	screen?: string;
}
