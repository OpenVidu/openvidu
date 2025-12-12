import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { MatExpansionModule } from '@angular/material/expansion';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import {
  MAT_FORM_FIELD_DEFAULT_OPTIONS,
  MatFormFieldModule,
} from '@angular/material/form-field';
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
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSliderModule } from '@angular/material/slider';

import { TestScenariosComponent } from './components/test-scenarios/test-scenarios.component';
import { TestSessionsComponent } from './components/test-sessions/test-sessions.component';
import { OpenviduInstanceComponent } from './components/openvidu-instance/openvidu-instance.component';
import { VideoTrackComponent } from './components/video-track/video-track.component';
import { ParticipantComponent } from './components/participant/participant.component';
import { AudioTrackComponent } from './components/audio-track/audio-track.component';
import { TrackComponent } from './components/track/track.component';
import { RoomApiDialogComponent } from './components/dialogs/room-api-dialog/room-api-dialog.component';
import { OptionsDialogComponent } from './components/dialogs/options-dialog/options-dialog.component';
import { EventsDialogComponent } from './components/dialogs/events-dialog/events-dialog.component';

import { TestFeedService } from './services/test-feed.service';
import { UsersTableComponent } from './components/users-table/users-table.component';
import { TableVideoComponent } from './components/users-table/table-video.component';
import { CallbackPipe } from './pipes/callback.pipe';
import { AppRoutingModule } from './app.routing';
import { VideoResolutionComponent } from './components/dialogs/options-dialog/video-resolution/video-resolution.component';
import { InfoDialogComponent } from './components/dialogs/info-dialog/info-dialog.component';
import { ProcessorDialogComponent } from './components/dialogs/processor-dialog/processor-dialog.component';

@NgModule({ declarations: [
        AppComponent,
        TestScenariosComponent,
        TestSessionsComponent,
        OpenviduInstanceComponent,
        ParticipantComponent,
        VideoTrackComponent,
        AudioTrackComponent,
        TrackComponent,
        RoomApiDialogComponent,
        EventsDialogComponent,
        UsersTableComponent,
        TableVideoComponent,
        CallbackPipe,
        OptionsDialogComponent,
        VideoResolutionComponent,
        InfoDialogComponent,
        ProcessorDialogComponent,
    ],
    bootstrap: [AppComponent], imports: [FormsModule,
        BrowserModule,
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
        MatRadioModule,
        MatSelectModule,
        MatChipsModule,
        MatSlideToggleModule,
        MatBadgeModule,
        MatProgressSpinnerModule,
        MatSliderModule], providers: [
        TestFeedService,
        {
            provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
            useValue: { appearance: 'outline', subscriptSizing: 'dynamic' },
        },
        provideHttpClient(withInterceptorsFromDi()),
    ] })
export class AppModule {}
