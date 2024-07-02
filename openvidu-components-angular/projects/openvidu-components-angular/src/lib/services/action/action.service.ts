import { Injectable } from '@angular/core';
import { MatDialog, MatDialogConfig, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { DeleteDialogComponent } from '../../components/dialogs/delete-recording.component';
import { DialogTemplateComponent } from '../../components/dialogs/dialog.component';
import { ProFeatureDialogTemplateComponent } from '../../components/dialogs/pro-feature-dialog.component';
import { RecordingDialogComponent } from '../../components/dialogs/recording-dialog.component';
import { INotificationOptions } from '../../models/notification-options.model';
import { TranslateService } from '../translate/translate.service';

/**
 * @internal
 */
@Injectable({
	providedIn: 'root'
})
export class ActionService {
	private dialogRef:
		| MatDialogRef<DialogTemplateComponent | RecordingDialogComponent | DeleteDialogComponent | ProFeatureDialogTemplateComponent>
		| undefined;
	private dialogSubscription: Subscription;
	constructor(
		private snackBar: MatSnackBar,
		public dialog: MatDialog,
		private translateService: TranslateService
	) {}

	launchNotification(options: INotificationOptions, callback): void {
		if (!options.config) {
			options.config = {
				duration: 3000,
				verticalPosition: 'top',
				horizontalPosition: 'end',
				panelClass: 'snackbarNotification'
			};
		}

		const notification = this.snackBar.open(options.message, options.buttonActionText, options.config);
		if (callback) {
			notification.onAction().subscribe(() => {
				callback();
			});
		}
	}

	openDialog(titleMessage: string, descriptionMessage: string, allowClose = true) {
		try {
			this.closeDialog();
		} catch (error) {
		} finally {
			const config: MatDialogConfig = {
				minWidth: '250px',
				data: { title: titleMessage, description: descriptionMessage, showActionButtons: allowClose },
				disableClose: !allowClose
			};
			this.dialogRef = this.dialog.open(DialogTemplateComponent, config);
			this.dialogSubscription = this.dialogRef.afterClosed().subscribe((result) => {
				this.dialogRef = undefined;
				if (this.dialogSubscription) this.dialogSubscription.unsubscribe();
			});
		}
	}

	// openProFeatureDialog(titleMessage: string, descriptionMessage: string, allowClose = true) {
	// 	try {
	// 		this.closeDialog();
	// 	} catch (error) {
	// 	} finally {
	// 		const config: MatDialogConfig = {
	// 			minWidth: '250px',
	// 			data: { title: titleMessage, description: descriptionMessage, showActionButtons: allowClose },
	// 			disableClose: !allowClose
	// 		};
	// 		this.dialogRef = this.dialog.open(ProFeatureDialogTemplateComponent, config);
	// 		this.dialogSubscription = this.dialogRef.afterClosed().subscribe((result) => {
	// 			this.dialogRef = undefined;
	// 			if (this.dialogSubscription) this.dialogSubscription.unsubscribe();
	// 		});
	// 	}
	// }

	openDeleteRecordingDialog(succsessCallback) {
		try {
			this.closeDialog();
		} catch (error) {
		} finally {
			this.dialogRef = this.dialog.open(DeleteDialogComponent);

			this.dialogSubscription = this.dialogRef.afterClosed().subscribe((result) => {
				if (result) {
					succsessCallback();
					if (this.dialogSubscription) this.dialogSubscription.unsubscribe();
				}
			});
		}
	}

	openRecordingPlayerDialog(src: string, allowClose = true) {
		try {
			this.closeDialog();
		} catch (error) {
		} finally {
			const config: MatDialogConfig = {
				minWidth: '250px',
				data: { src, showActionButtons: allowClose },
				disableClose: !allowClose
			};
			this.dialogRef = this.dialog.open(RecordingDialogComponent, config);

			this.dialogSubscription = this.dialogRef.afterClosed().subscribe((data: { manageError: boolean; error: MediaError | null }) => {
				if (data.manageError) {
					this.handleRecordingPlayerError(data.error);
				}
				if (this.dialogSubscription) this.dialogSubscription.unsubscribe();
			});
		}
	}

	closeDialog() {
		this.dialogRef?.close();
	}

	private handleRecordingPlayerError(error: MediaError | null) {
		let message = 'ERRORS.MEDIA_ERR_GENERIC';
		if (error) {
			switch (error.code) {
				case error.MEDIA_ERR_NETWORK:
					message = 'ERRORS.MEDIA_ERR_NETWORK';
					break;
				case error.MEDIA_ERR_DECODE:
					message = 'ERRORS.MEDIA_ERR_DECODE';
					break;
				case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
					message = 'ERRORS.MEDIA_ERR_SRC_NOT_SUPPORTED';
					break;
			}
		}

		const title = this.translateService.translate('ERRORS.LOAD_RECORDING_TITLE');
		message = this.translateService.translate(message);
		this.openDialog(title, message, true);
	}
}
