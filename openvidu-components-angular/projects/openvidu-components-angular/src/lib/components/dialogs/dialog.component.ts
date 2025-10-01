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
		<div mat-dialog-content id="openvidu-dialog">{{ data.description }}</div>
		<div mat-dialog-actions *ngIf="data.showActionButtons">
			<button mat-button [disableRipple]="true" (click)="close()">{{ 'PANEL.CLOSE' | translate }}</button>
		</div>
	`,
    styles: [
        `
			::ng-deep .mat-mdc-dialog-content {
				color: var(--ov-text-surface-color) !important;
			}

			::ng-deep .mat-mdc-dialog-surface {
				background-color: var(--ov-surface-color);
				border-radius: var(--ov-surface-radius);
			}
			.mat-mdc-button,
			.mat-mdc-button:not(:disabled),
			::ng-deep .mat-mdc-button .mat-mdc-button-persistent-ripple::before {
				color: var(--ov-text-primary-color);
				background-color: var(--ov-primary-action-color) !important;
				border-radius: var(--ov-surface-radius);
			}
		`
    ],
    standalone: false
})
export class DialogTemplateComponent {
	constructor(
		public dialogRef: MatDialogRef<DialogTemplateComponent>,
		@Inject(MAT_DIALOG_DATA) public data: DialogData
	) {}

	close() {
		this.dialogRef.close();
	}
}
