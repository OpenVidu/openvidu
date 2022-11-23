import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppMaterialModule } from './app.material.module';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app.routing';
import { OpenviduInstanceComponent } from './components/openvidu-instance/openvidu-instance.component';
import { TestApirestComponent } from './components/test-apirest/test-apirest.component';
import { TestScenariosComponent } from './components/test-scenarios/test-scenarios.component';
import { TestSessionsComponent } from './components/test-sessions/test-sessions.component';
import { TableVideoComponent } from './components/users-table/table-video.component';
import { UsersTableComponent } from './components/users-table/users-table.component';
import { OpenViduVideoComponent } from './components/video/ov-video.component';
import { VideoComponent } from './components/video/video.component';

import { EventsDialogComponent } from './components/dialogs/events-dialog/events-dialog.component';
import { ExtensionDialogComponent } from './components/dialogs/extension-dialog/extension-dialog.component';
import { LocalRecordingDialogComponent } from './components/dialogs/local-recording-dialog/local-recording-dialog.component';
import { OtherStreamOperationsDialogComponent } from './components/dialogs/other-stream-operations-dialog/other-stream-operations-dialog.component';
import { PublisherPropertiesDialogComponent } from './components/dialogs/publisher-properties-dialog/publisher-properties-dialog.component';
import { RecordingPropertiesComponent } from './components/dialogs/recording-properties/recording-properties.component';
import { ScenarioPropertiesDialogComponent } from './components/dialogs/scenario-properties-dialog/scenario-properties-dialog.component';
import { SessionApiDialogComponent } from './components/dialogs/session-api-dialog/session-api-dialog.component';
import { SessionPropertiesDialogComponent } from './components/dialogs/session-properties-dialog/session-properties-dialog.component';
import { ShowCodecDialogComponent } from './components/dialogs/show-codec-dialog/show-codec-dialog.component';

import { SessionInfoDialogComponent } from "./components/dialogs/session-info-dialog/session-info-dialog.component";
import { ShowIceServerConfiguredDialog } from './components/dialogs/show-configured-ice/show-configured-ice.component';
import { MuteSubscribersService } from './services/mute-subscribers.service';
import { OpenviduParamsService } from './services/openvidu-params.service';
import { OpenviduRestService } from './services/openvidu-rest.service';
import { TestFeedService } from './services/test-feed.service';

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
    RecordingPropertiesComponent,
    LocalRecordingDialogComponent,
    PublisherPropertiesDialogComponent,
    ScenarioPropertiesDialogComponent,
    OtherStreamOperationsDialogComponent,
    ShowCodecDialogComponent,
    ShowIceServerConfiguredDialog,
    SessionInfoDialogComponent,
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
    AppRoutingModule
  ],
  providers: [
    OpenviduRestService,
    OpenviduParamsService,
    TestFeedService,
    MuteSubscribersService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
