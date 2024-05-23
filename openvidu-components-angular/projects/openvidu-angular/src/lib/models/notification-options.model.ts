import { MatSnackBarConfig } from '@angular/material/snack-bar';

/**
 * @internal
 */
export interface INotificationOptions {
	message: string;
	buttonActionText?: string;
	cssClassName?: string;
	config?: MatSnackBarConfig;
}
