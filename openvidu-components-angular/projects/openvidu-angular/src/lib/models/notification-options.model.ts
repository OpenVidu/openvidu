import { MatLegacySnackBarConfig as MatSnackBarConfig } from '@angular/material/legacy-snack-bar';

/**
 * @internal
 */
export interface INotificationOptions {
	message: string;
	buttonActionText?: string;
	cssClassName?: string;
	config?: MatSnackBarConfig;
}