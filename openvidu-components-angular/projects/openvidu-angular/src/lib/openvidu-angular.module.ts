import { OverlayContainer } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { DeleteDialogComponent } from './components/dialogs/delete-recording.component';
import { DialogTemplateComponent } from './components/dialogs/dialog.component';
import { RecordingDialogComponent } from './components/dialogs/recording-dialog.component';
import { LayoutComponent } from './components/layout/layout.component';
import { ChatPanelComponent } from './components/panel/chat-panel/chat-panel.component';
import { SessionComponent } from './components/session/session.component';
import { StreamComponent } from './components/stream/stream.component';
import { ToolbarComponent } from './components/toolbar/toolbar.component';
import { VideoComponent } from './components/video/video.component';

import { LinkifyPipe } from './pipes/linkify.pipe';
import { ParticipantStreamsPipe, StreamTypesEnabledPipe } from './pipes/participant.pipe';
import { DurationFromSecondsPipe, SearchByStringPropertyPipe, ThumbnailFromUrlPipe } from './pipes/recording.pipe';
import { TranslatePipe } from './pipes/translate.pipe';

import { CdkOverlayContainer } from './config/custom-cdk-overlay';
import { OpenViduAngularConfig } from './config/openvidu-angular.config';
import { ActionService } from './services/action/action.service';
import { ChatService } from './services/chat/chat.service';
import { OpenViduAngularConfigService } from './services/config/openvidu-angular.config.service';
import { DeviceService } from './services/device/device.service';
import { DocumentService } from './services/document/document.service';
import { LayoutService } from './services/layout/layout.service';
import { LoggerService } from './services/logger/logger.service';
import { OpenViduService } from './services/openvidu/openvidu.service';
import { PanelService } from './services/panel/panel.service';
import { ParticipantService } from './services/participant/participant.service';
import { PlatformService } from './services/platform/platform.service';
import { RecordingService } from './services/recording/recording.service';
import { StorageService } from './services/storage/storage.service';

import { AudioWaveComponent } from './components/audio-wave/audio-wave.component';
import { PanelComponent } from './components/panel/panel.component';
import { ParticipantPanelItemComponent } from './components/panel/participants-panel/participant-panel-item/participant-panel-item.component';
import { ParticipantsPanelComponent } from './components/panel/participants-panel/participants-panel/participants-panel.component';
import { PreJoinComponent } from './components/pre-join/pre-join.component';
import { VideoconferenceComponent } from './components/videoconference/videoconference.component';

import { AdminDashboardComponent } from './admin/dashboard/dashboard.component';
import { AdminLoginComponent } from './admin/login/login.component';
import { AvatarProfileComponent } from './components/avatar-profile/avatar-profile.component';
import { CaptionsComponent } from './components/captions/captions.component';
import { ProFeatureDialogTemplateComponent } from './components/dialogs/pro-feature-dialog.component';
import { ActivitiesPanelComponent } from './components/panel/activities-panel/activities-panel.component';
import { RecordingActivityComponent } from './components/panel/activities-panel/recording-activity/recording-activity.component';
import { StreamingActivityComponent } from './components/panel/activities-panel/streaming-activity/streaming-activity.component';
import { BackgroundEffectsPanelComponent } from './components/panel/background-effects-panel/background-effects-panel.component';
import { SettingsPanelComponent } from './components/panel/settings-panel/settings-panel.component';
import { AudioDevicesComponent } from './components/settings/audio-devices/audio-devices.component';
import { CaptionsSettingComponent } from './components/settings/captions/captions.component';
import { LangSelectorComponent } from './components/settings/lang-selector/lang-selector.component';
import { NicknameInputComponent } from './components/settings/nickname-input/nickname-input.component';
import { VideoDevicesComponent } from './components/settings/video-devices/video-devices.component';
import { CustomBreakPointsProvider, CustomLayoutExtensionDirective } from './config/custom-flexlayout-breakpoints';
import { ApiDirectiveModule } from './directives/api/api.directive.module';
import { OpenViduAngularDirectiveModule } from './directives/template/openvidu-angular.directive.module';
import { AppMaterialModule } from './openvidu-angular.material.module';

const publicComponents = [
	AdminDashboardComponent,
	AdminLoginComponent,
	VideoconferenceComponent,
	ToolbarComponent,
	PanelComponent,
	ActivitiesPanelComponent,
    RecordingActivityComponent,
    StreamingActivityComponent,
	ParticipantsPanelComponent,
	ParticipantPanelItemComponent,
	ChatPanelComponent,
	StreamComponent,
	LayoutComponent
];
const privateComponents = [
	PreJoinComponent,
	SessionComponent,
	BackgroundEffectsPanelComponent,
	SettingsPanelComponent,
	AudioWaveComponent,
	CaptionsComponent,
	DialogTemplateComponent,
    ProFeatureDialogTemplateComponent,
	RecordingDialogComponent,
	DeleteDialogComponent,
	AvatarProfileComponent,
	VideoComponent,
	VideoDevicesComponent,
	AudioDevicesComponent,
	NicknameInputComponent,
	LangSelectorComponent,
	CaptionsSettingComponent
];

@NgModule({
    declarations: [
        publicComponents,
        privateComponents,
        LinkifyPipe,
        ParticipantStreamsPipe,
        DurationFromSecondsPipe,
        SearchByStringPropertyPipe,
        ThumbnailFromUrlPipe,
        StreamTypesEnabledPipe,
        TranslatePipe,
        CustomLayoutExtensionDirective,
    ],
    imports: [
        CommonModule,
        HttpClientModule,
        FormsModule,
        ReactiveFormsModule,
        RouterModule.forRoot([]),
        AppMaterialModule,
        OpenViduAngularDirectiveModule,
        ApiDirectiveModule
    ],
    providers: [
        ActionService,
        CdkOverlayContainer,
        { provide: OverlayContainer, useClass: CdkOverlayContainer },
        CustomBreakPointsProvider,
        ChatService,
        PanelService,
        DeviceService,
        DocumentService,
        LayoutService,
        LoggerService,
        PlatformService,
        ParticipantService,
        StorageService,
        OpenViduService,
        RecordingService
    ],
    exports: [
        publicComponents,
        ParticipantStreamsPipe,
        DurationFromSecondsPipe,
        StreamTypesEnabledPipe,
        CommonModule,
        OpenViduAngularDirectiveModule,
        ApiDirectiveModule
    ]
})
export class OpenViduAngularModule {
	static forRoot(config): ModuleWithProviders<OpenViduAngularModule> {
		// console.log(`${library.name} config: ${environment}`);
		const libConfig: OpenViduAngularConfig = config;
		return {
			ngModule: OpenViduAngularModule,
			providers: [OpenViduAngularConfigService, { provide: 'OPENVIDU_ANGULAR_CONFIG', useValue: libConfig }]
		};
	}
}
