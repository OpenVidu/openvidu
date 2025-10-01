import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

/**
 * @internal
 */
@Component({
    selector: 'app-delete-dialog',
    template: `
		<div mat-dialog-content>{{ 'PANEL.RECORDING.DELETE_QUESTION' | translate }}</div>
		<div mat-dialog-actions>
			<button mat-button [disableRipple]="true" (click)="close()">{{ 'PANEL.RECORDING.CANCEL' | translate }}</button>
			<button [disableRipple]="true" mat-button cdkFocusInitial (click)="close(true)" id="delete-recording-confirm-btn">
				{{ 'PANEL.RECORDING.DELETE' | translate }}
			</button>
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
			#delete-recording-confirm-btn {
				background-color: var(--ov-error-color) !important;
				color: var(--ov-primary-action-color);
			}
			.mat-mdc-button,
			.mat-mdc-button:not(:disabled),
			::ng-deep .mat-mdc-button .mat-mdc-button-persistent-ripple::before {
				color: var(--ov-text-primary-color) !important;
				background-color: var(--ov-primary-action-color) !important;
				border-radius: var(--ov-surface-radius);
			}
		`
    ],
    standalone: false
})
export class DeleteDialogComponent {
	constructor(public dialogRef: MatDialogRef<DeleteDialogComponent>) {}

	close(succsess = false) {
		this.dialogRef.close(succsess);
	}
}
