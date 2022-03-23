import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

/**
 * @internal
 */
export interface DialogData {
	title: string;
	description: string;
	showActionButtons: boolean;
}
/**
 * @internal
 */

@Component({
	selector: 'ov-dialog-template',
	template: `
		<h1 mat-dialog-title>{{ data.title }}</h1>
		<div mat-dialog-content>{{ data.description }}</div>
		<div mat-dialog-actions *ngIf="data.showActionButtons">
			<button mat-button (click)="close()">Close</button>
		</div>
	`
})
export class DialogTemplateComponent {
	constructor(public dialogRef: MatDialogRef<DialogTemplateComponent>, @Inject(MAT_DIALOG_DATA) public data: DialogData) {}

	close() {
		this.dialogRef.close();
	}
}
