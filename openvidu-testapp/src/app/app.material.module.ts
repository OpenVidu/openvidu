import { NgModule } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatCardModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule,
    MatToolbarModule,
    MatTabsModule,
    MatTableModule,
    MatListModule,
    MatRadioModule,
    MatSelectModule,
    MatChipsModule,
    MatExpansionModule,
    MatSlideToggleModule,
    MatSidenavModule,
    MatFormFieldModule,
    MatBadgeModule
} from '@angular/material';

@NgModule({
    exports: [
        BrowserAnimationsModule,
        MatButtonModule,
        MatIconModule,
        MatCheckboxModule,
        MatCardModule,
        MatInputModule,
        MatProgressSpinnerModule,
        MatTooltipModule,
        MatDialogModule,
        MatToolbarModule,
        MatTabsModule,
        MatTableModule,
        MatListModule,
        MatRadioModule,
        MatSelectModule,
        MatChipsModule,
        MatExpansionModule,
        MatSlideToggleModule,
        MatSidenavModule,
        MatFormFieldModule,
        MatBadgeModule
    ],
})
export class AppMaterialModule { }
