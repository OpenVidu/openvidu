import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FlexLayoutModule } from '@angular/flex-layout';
import { AppMaterialModule } from './app.material.module';

import { routing } from './app.routing';
import { AppComponent } from './app.component';
import { TestSessionsComponent } from './components/test-sessions/test-sessions.component';
import { TestApirestComponent } from './components/test-apirest/test-apirest.component';
import { OpenviduInstanceComponent } from './components/openvidu-instance/openvidu-instance.component';
import { VideoComponent } from './components/video/video.component';
import { OpenViduVideoComponent } from './components/video/ov-video.component';
import { ExtensionDialogComponent } from './components/dialogs/extension-dialog.component';
import { LocalRecordingDialogComponent } from './components/dialogs/local-recording-dialog.component';

import { OpenviduRestService } from './services/openvidu-rest.service';
import { OpenviduParamsService } from './services/openvidu-params.service';
import { TestFeedService } from './services/test-feed.service';
import { MuteSubscribersService } from './services/mute-subscribers.service';
import { SessionPropertiesDialogComponent } from './components/dialogs/session-properties-dialog.component';
import { SessionApiDialogComponent } from './components/dialogs/session-api-dialog.component';
import { EventsDialogComponent } from './components/dialogs/events-dialog.component';

@NgModule({
  declarations: [
    AppComponent,
    OpenviduInstanceComponent,
    VideoComponent,
    OpenViduVideoComponent,
    TestSessionsComponent,
    TestApirestComponent,
    ExtensionDialogComponent,
    SessionPropertiesDialogComponent,
    SessionApiDialogComponent,
    EventsDialogComponent,
    LocalRecordingDialogComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    BrowserAnimationsModule,
    AppMaterialModule,
    FlexLayoutModule,
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
    LocalRecordingDialogComponent
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
