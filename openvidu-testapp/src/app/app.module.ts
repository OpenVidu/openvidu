import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FlexLayoutModule } from '@angular/flex-layout';
import { AppMaterialModule } from './app.material.module';
import { HttpClientModule } from '@angular/common/http';

import { routing } from './app.routing';
import { AppComponent } from './app.component';
import { TestSessionsComponent } from './components/test-sessions/test-sessions.component';
import { TestApirestComponent } from './components/test-apirest/test-apirest.component';
import { TestScenariosComponent } from './components/test-scenarios/test-scenarios.component';
import { OpenviduInstanceComponent } from './components/openvidu-instance/openvidu-instance.component';
import { VideoComponent } from './components/video/video.component';
import { OpenViduVideoComponent } from './components/video/ov-video.component';
import { UsersTableComponent } from './components/users-table/users-table.component';
import { TableVideoComponent } from './components/users-table/table-video.component';

import { ExtensionDialogComponent } from './components/dialogs/extension-dialog/extension-dialog.component';
import { LocalRecordingDialogComponent } from './components/dialogs/local-recording-dialog/local-recording-dialog.component';
import { SessionPropertiesDialogComponent } from './components/dialogs/session-properties-dialog/session-properties-dialog.component';
import { SessionApiDialogComponent } from './components/dialogs/session-api-dialog/session-api-dialog.component';
import { EventsDialogComponent } from './components/dialogs/events-dialog/events-dialog.component';
import { PublisherPropertiesDialogComponent } from './components/dialogs/publisher-properties-dialog/publisher-properties-dialog.component';
import { ScenarioPropertiesDialogComponent } from './components/dialogs/scenario-properties-dialog/scenario-properties-dialog.component';
import { FilterDialogComponent } from './components/dialogs/filter-dialog/filter-dialog.component';

import { OpenviduRestService } from './services/openvidu-rest.service';
import { OpenviduParamsService } from './services/openvidu-params.service';
import { TestFeedService } from './services/test-feed.service';
import { MuteSubscribersService } from './services/mute-subscribers.service';

@NgModule({
  declarations: [
    AppComponent,
    OpenviduInstanceComponent,
    VideoComponent,
    OpenViduVideoComponent,
    TestSessionsComponent,
    TestApirestComponent,
    TestScenariosComponent,
    ExtensionDialogComponent,
    SessionPropertiesDialogComponent,
    SessionApiDialogComponent,
    EventsDialogComponent,
    LocalRecordingDialogComponent,
    PublisherPropertiesDialogComponent,
    ScenarioPropertiesDialogComponent,
    FilterDialogComponent,
    UsersTableComponent,
    TableVideoComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    BrowserAnimationsModule,
    AppMaterialModule,
    FlexLayoutModule,
    HttpClientModule,
    routing
  ],
  providers: [
    OpenviduRestService,
    OpenviduParamsService,
    TestFeedService,
    MuteSubscribersService
  ],
  entryComponents: [
    ExtensionDialogComponent,
    SessionPropertiesDialogComponent,
    SessionApiDialogComponent,
    EventsDialogComponent,
    LocalRecordingDialogComponent,
    PublisherPropertiesDialogComponent,
    ScenarioPropertiesDialogComponent,
    FilterDialogComponent
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
