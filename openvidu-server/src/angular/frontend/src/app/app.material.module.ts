import { NgModule } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {
    MdButtonModule,
    MdCheckboxModule,
    MdCardModule,
    MdInputModule,
    MdProgressSpinnerModule,
    MdTooltipModule
} from '@angular/material';

@NgModule({
    imports: [
        BrowserAnimationsModule,
        MdButtonModule,
        MdCheckboxModule,
        MdCardModule,
        MdInputModule,
        MdProgressSpinnerModule,
        MdTooltipModule
    ],
    exports: [
        BrowserAnimationsModule,
        MdButtonModule,
        MdCheckboxModule,
        MdCardModule,
        MdInputModule,
        MdProgressSpinnerModule,
        MdTooltipModule
    ],
})
export class AppMaterialModule { }
