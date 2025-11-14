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
	private connectionDialogRef: MatDialogRef<DialogTemplateComponent> | undefined;
	private isConnectionDialogOpen = false;

	constructor(
		private snackBar: MatSnackBar,
		public dialog: MatDialog,
		private translateService: TranslateService
	) {}

	launchNotification(options: INotificationOptions, callback?: () => void): void {
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
			// subscribe and complete immediately after calling callback
			const sub = notification.onAction().subscribe(() => {
				sub.unsubscribe();
				callback();
			});
		}
	}

	openDialog(titleMessage: string, descriptionMessage: string, allowClose = true) {
		this.closeDialog();
		const config: MatDialogConfig = {
			minWidth: '250px',
			data: { title: titleMessage, description: descriptionMessage, showActionButtons: allowClose },
			disableClose: !allowClose
		};
		this.dialogRef = this.dialog.open(DialogTemplateComponent, config);
		this.dialogRef.afterClosed().subscribe(() => (this.dialogRef = undefined));
	}

	openConnectionDialog(titleMessage: string, descriptionMessage: string, allowClose = false) {
		if (this.isConnectionDialogOpen) return;
		const config: MatDialogConfig = {
			minWidth: '250px',
			data: { title: titleMessage, description: descriptionMessage, showActionButtons: allowClose },
			disableClose: !allowClose
		};

		this.connectionDialogRef = this.dialog.open(DialogTemplateComponent, config);
		this.isConnectionDialogOpen = true;
		this.connectionDialogRef.afterClosed().subscribe(() => {
			this.isConnectionDialogOpen = false;
			this.connectionDialogRef = undefined;
		});
	}

	openDeleteRecordingDialog(successCallback: () => void) {
		this.closeDialog();
		this.dialogRef = this.dialog.open(DeleteDialogComponent);
		this.dialogRef.afterClosed().subscribe((result) => {
			if (result) {
				successCallback();
			}
			this.dialogRef = undefined;
		});
	}

	openRecordingPlayerDialog(src: string, allowClose = true) {
		this.closeDialog();
		const config: MatDialogConfig = {
			minWidth: '250px',
			data: { src, showActionButtons: allowClose },
			disableClose: !allowClose
		};
		this.dialogRef = this.dialog.open(RecordingDialogComponent, config);
		this.dialogRef.afterClosed().subscribe((data: { manageError: boolean; error: MediaError | null }) => {
			if (data && data.manageError) {
				this.handleRecordingPlayerError(data.error);
			}
			this.dialogRef = undefined;
		});
	}

	closeDialog() {
		if (this.dialogRef) {
			this.dialogRef.close();
			this.dialogRef = undefined;
		}
	}

	closeConnectionDialog() {
		if (this.connectionDialogRef) {
			this.connectionDialogRef.close();
			this.isConnectionDialogOpen = false;
			this.connectionDialogRef = undefined;
		}
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
