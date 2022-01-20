import { MatSnackBarConfig } from '@angular/material/snack-bar';

export interface INotificationOptions {
	message: string;
	buttonActionText?: string;
	cssClassName?: string;
	config?: MatSnackBarConfig;
}