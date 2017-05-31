import { NgModule } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {
    MdButtonModule,
    MdCheckboxModule,
    MdCardModule,
    MdInputModule
} from '@angular/material';

@NgModule({
    imports: [BrowserAnimationsModule, MdButtonModule, MdCheckboxModule, MdCardModule, MdInputModule],
    exports: [BrowserAnimationsModule, MdButtonModule, MdCheckboxModule, MdCardModule, MdInputModule],
})
export class AppMaterialModule { }
