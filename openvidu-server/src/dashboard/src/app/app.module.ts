import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';
import { BrowserModule } from '@angular/platform-browser';
import 'hammerjs';
import { AppComponent } from './app.component';
import { AppMaterialModule } from './app.material.module';
import { routing } from './app.routing';
import { CredentialsDialogComponent } from './components/dashboard/credentials-dialog.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { LayoutBaseComponent } from './components/layouts/layout-base/layout-base.component';
import { LayoutBestFitComponent } from './components/layouts/layout-best-fit/layout-best-fit.component';
import { LayoutHorizontalPresentationComponent } from './components/layouts/layout-horizontal-presentation/layout-horizontal-presentation.component';
import { LayoutVerticalPresentationComponent } from './components/layouts/layout-vertical-presentation/layout-vertical-presentation.component';
import { OpenViduVideoComponent } from './components/layouts/ov-video.component';
import { SessionDetailsComponent } from './components/session-details/session-details.component';
import { InfoService } from './services/info.service';
import { RestService } from './services/rest.service';

@NgModule({
  declarations: [
    AppComponent,
    DashboardComponent,
    SessionDetailsComponent,
    CredentialsDialogComponent,
    LayoutBaseComponent,
    LayoutBestFitComponent,
    LayoutVerticalPresentationComponent,
    LayoutHorizontalPresentationComponent,
    OpenViduVideoComponent
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
    CredentialsDialogComponent
  ],
  providers: [InfoService, RestService],
  bootstrap: [AppComponent]
})
export class AppModule { }
