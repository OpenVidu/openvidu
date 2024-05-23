import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DialogData } from '../../models/dialog.model';

/**
 * @internal
 */

@Component({
	selector: 'ov-dialog-template',
	template: `
		<h1 mat-dialog-title>{{ data.title }}</h1>
		<div mat-dialog-content>{{ data.description }}</div>
		<div mat-dialog-actions *ngIf="data.showActionButtons">
			<button mat-button (click)="close()">{{'PANEL.CLOSE' | translate}}</button>
		</div>
	`
})
export class DialogTemplateComponent {
	constructor(public dialogRef: MatDialogRef<DialogTemplateComponent>, @Inject(MAT_DIALOG_DATA) public data: DialogData) {}

	close() {
		this.dialogRef.close();
	}
}
