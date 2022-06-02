import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

/**
 * @internal
 */
@Component({
	selector: 'app-delete-dialog',
	template: `
		<div mat-dialog-content>{{'PANEL.RECORDING.DELETE_QUESTION' | translate}}</div>
		<div mat-dialog-actions>
			<button mat-button (click)="close()">CANCEL</button>
			<button mat-button cdkFocusInitial (click)="close(true)" id="delete-recording-confirm-btn">{{'PANEL.RECORDING.DELETE' | translate}}</button>
		</div>
	`,
	styles: [``]
})
export class DeleteDialogComponent {
	constructor(public dialogRef: MatDialogRef<DeleteDialogComponent>) {}

	close(succsess = false) {
		this.dialogRef.close(succsess);
	}
}
