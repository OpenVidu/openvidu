import { Component, Inject } from '@angular/core';
import { MdDialog, MD_DIALOG_DATA, MdDialogConfig } from '@angular/material';

@Component({
    selector: 'app-extension-dialog',
    template: `
    <div *ngIf="installView">
        <h2 md-dialog-title>Install extension</h2>
        <md-dialog-content>An extension is needed to share your screen!</md-dialog-content>
        <md-dialog-actions>
        <button md-button md-dialog-close>CANCEL</button>
        <button md-button (click)="goToExtension()">INSTALL</button>
        </md-dialog-actions>
    </div>
    <div *ngIf="!installView" style="text-align: center">
        <button md-button (click)="reloadPage()">RELOAD PAGE<br>AFTER INSTALLED</button>
    </div>
    `
})
export class ExtensionDialogComponent {

    installView = true;

    constructor(public dialog: MdDialog, @Inject(MD_DIALOG_DATA) public data: any) { }

    goToExtension() {
        window.open(this.data.url, '_blank');
        this.installView = false;
    }

    reloadPage() {
        window.location.reload();
    }

}

