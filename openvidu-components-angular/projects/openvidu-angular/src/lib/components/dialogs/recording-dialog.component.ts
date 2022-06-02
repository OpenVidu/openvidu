import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

/**
 * @internal
 */
@Component({
	selector: 'app-recording-dialog',
	template: `
		<div mat-dialog-content>
			<video controls autoplay>
				<source [src]="src" [type]="type" />
			</video>
		</div>
		<div mat-dialog-actions *ngIf="data.showActionButtons" align="end">
			<button mat-button (click)="close()">{{ 'PANEL.CLOSE' | translate }}</button>
		</div>
	`,
	styles: [
		`
			video {
				max-height: 64vh;
				max-width: 100%;
			}
		`
	]
})
export class RecordingDialogComponent {
	src: string;
	type: string;

	constructor(public dialogRef: MatDialogRef<RecordingDialogComponent>, @Inject(MAT_DIALOG_DATA) public data: any) {
		this.src = data.src;
		this.type = data.type;
	}
	close() {
		this.dialogRef.close();
	}
}
