import { NgModule } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {
    MdButtonModule,
    MdCheckboxModule,
    MdCardModule,
    MdInputModule,
    MdProgressSpinnerModule,
    MdTooltipModule,
    MdDialogModule
} from '@angular/material';

@NgModule({
    imports: [
        BrowserAnimationsModule,
        MdButtonModule,
        MdCheckboxModule,
        MdCardModule,
        MdInputModule,
        MdProgressSpinnerModule,
        MdTooltipModule,
        MdDialogModule
    ],
    exports: [
        BrowserAnimationsModule,
        MdButtonModule,
        MdCheckboxModule,
        MdCardModule,
        MdInputModule,
        MdProgressSpinnerModule,
        MdTooltipModule,
        MdDialogModule
    ],
})
export class AppMaterialModule { }
