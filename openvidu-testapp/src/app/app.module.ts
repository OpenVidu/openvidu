import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { MatExpansionModule } from '@angular/material/expansion';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS, MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { TestSessionsComponent } from './components/test-sessions/test-sessions.component';
import { OpenviduInstanceComponent } from './components/openvidu-instance/openvidu-instance.component';
import { VideoTrackComponent } from './components/video-track/video-track.component';
import { ParticipantComponent } from './components/participant/participant.component';
import { AudioTrackComponent } from './components/audio-track/audio-track.component';
import { TrackComponent } from './components/track/track.component';
import { RoomOptionsDialogComponent } from './components/dialogs/room-options-dialog/room-options-dialog.component';
import { RoomApiDialogComponent } from './components/dialogs/room-api-dialog/room-api-dialog.component';

import { TestFeedService } from './services/test-feed.service';
import { EventsDialogComponent } from './components/dialogs/events-dialog/events-dialog.component';

@NgModule({
  declarations: [
    AppComponent,
    TestSessionsComponent,
    OpenviduInstanceComponent,
    ParticipantComponent,
    VideoTrackComponent,
    AudioTrackComponent,
    TrackComponent,
    RoomOptionsDialogComponent,
    RoomApiDialogComponent,
    EventsDialogComponent
  ],
  imports: [
    FormsModule,
    BrowserModule,
    HttpClientModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    MatExpansionModule,
    MatToolbarModule,
    MatSidenavModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
    MatCardModule,
    MatTooltipModule,
    MatDialogModule,
    MatDividerModule,
    MatSelectModule,
    MatChipsModule,
    MatSlideToggleModule,
  ],
  providers: [
    TestFeedService,
    { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { appearance: 'outline', subscriptSizing: 'dynamic' } }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
