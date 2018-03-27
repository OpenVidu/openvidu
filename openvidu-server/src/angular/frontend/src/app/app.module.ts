import { BrowserModule } from '@angular/platform-browser';
import { FlexLayoutModule } from '@angular/flex-layout';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';
import { RouterModule } from '@angular/router';
import 'hammerjs';

import { routing } from './app.routing';
import { AppMaterialModule } from 'app/app.material.module';

import { InfoService } from './services/info.service';
import { RestService } from './services/rest.service';

import { AppComponent } from './app.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { SessionDetailsComponent } from './components/session-details/session-details.component';
import { CredentialsDialogComponent } from './components/dashboard/credentials-dialog.component';
import { LayoutBestFitComponent } from './components/layouts/layout-best-fit/layout-best-fit.component';


@NgModule({
  declarations: [
    AppComponent,
    DashboardComponent,
    SessionDetailsComponent,
    CredentialsDialogComponent,
    LayoutBestFitComponent,
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpModule,
    routing,
    AppMaterialModule,
    FlexLayoutModule
  ],
  entryComponents: [
    CredentialsDialogComponent,
  ],
  providers: [InfoService, RestService],
  bootstrap: [AppComponent]
})
export class AppModule { }
