import { Injectable } from '@angular/core';
import { MatDialog, MatDialogConfig, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SafeResourceUrl, SafeUrl } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { DeleteDialogComponent } from '../../components/dialogs/delete-recording.component';
import { RecordingDialogComponent } from '../../components/dialogs/recording-dialog.component';
import { DialogTemplateComponent } from '../../components/dialogs/dialog.component';
import { INotificationOptions } from '../../models/notification-options.model';

/**
 * @internal
 */
@Injectable({
	providedIn: 'root'
})
export class ActionService {
	private dialogRef: MatDialogRef<DialogTemplateComponent | RecordingDialogComponent | DeleteDialogComponent>;
	private dialogSubscription: Subscription;
	constructor(private snackBar: MatSnackBar, public dialog: MatDialog) {}

	launchNotification(options: INotificationOptions, callback): void {
		if (!options.config) {
			options.config = {
				duration: 3000,
				verticalPosition: 'top',
				horizontalPosition: 'end'
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
				this.dialogRef = null;
			});
		}
	}

	openDeleteRecordingDialog(succsessCallback) {
		try {
			this.closeDialog();
		} catch (error) {
		} finally {
			this.dialogRef = this.dialog.open(DeleteDialogComponent);

			this.dialogSubscription = this.dialogRef.afterClosed().subscribe((result) => {
				if (result) {
					succsessCallback();
				}
			});
		}
	}

	openRecordingPlayerDialog(src: SafeUrl, type: string, allowClose = true) {
		try {
			this.closeDialog();
		} catch (error) {
		} finally {
			const config: MatDialogConfig = {
				minWidth: '250px',
				data: { src, type, showActionButtons: allowClose },
				disableClose: !allowClose
			};
			this.dialogRef = this.dialog.open(RecordingDialogComponent, config);
		}
	}

	closeDialog() {
		this.dialogRef.close();
		if (this.dialogSubscription) this.dialogSubscription.unsubscribe();
	}
}
