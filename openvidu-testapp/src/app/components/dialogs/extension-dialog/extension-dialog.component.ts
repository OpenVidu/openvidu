import { Component, Inject } from '@angular/core';
import { MatLegacyDialog as MatDialog, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';

@Component({
    selector: 'app-extension-dialog',
    template: `
    <div *ngIf="installView">
        <h2 mat-dialog-title>Install extension</h2>
        <mat-dialog-content>An extension is needed to share your screen!</mat-dialog-content>
        <mat-dialog-actions>
        <button mat-button mat-dialog-close>CANCEL</button>
        <button mat-button (click)="goToExtension()">INSTALL</button>
        </mat-dialog-actions>
    </div>
    <div *ngIf="!installView" style="text-align: center">
        <button mat-button (click)="reloadPage()">RELOAD PAGE<br>AFTER INSTALLED</button>
    </div>
    `
})
export class ExtensionDialogComponent {

    installView = true;

    constructor(public dialog: MatDialog, @Inject(MAT_DIALOG_DATA) public data: any) { }

    goToExtension() {
        window.open(this.data.url, '_blank');
        this.installView = false;
    }

    reloadPage() {
        window.location.reload();
    }

}

