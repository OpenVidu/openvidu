import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { OverlayContainer } from '@angular/cdk/overlay';

import { ToolbarComponent } from './components/toolbar/toolbar.component';
import { VideoComponent } from './components/video/video.component';
import { ChatPanelComponent } from './components/panel/chat-panel/chat-panel.component';
import { SessionComponent } from './components/session/session.component';
import { LayoutComponent } from './components/layout/layout.component';
import { StreamComponent } from './components/stream/stream.component';
import { DialogTemplateComponent } from './components/dialogs/dialog.component';
import { RecordingDialogComponent } from './components/dialogs/recording-dialog.component';
import { DeleteDialogComponent } from './components/dialogs/delete-recording.component';

import { LinkifyPipe } from './pipes/linkify.pipe';
import { TranslatePipe } from './pipes/translate.pipe';
import { StreamTypesEnabledPipe, ParticipantStreamsPipe } from './pipes/participant.pipe';
import { DurationFromSecondsPipe, SearchByStringPropertyPipe } from './pipes/recording.pipe';

import { OpenViduAngularConfig } from './config/openvidu-angular.config';
import { CdkOverlayContainer } from './config/custom-cdk-overlay';
import { DeviceService } from './services/device/device.service';
import { LoggerService } from './services/logger/logger.service';
import { PlatformService } from './services/platform/platform.service';
import { StorageService } from './services/storage/storage.service';
import { TokenService } from './services/token/token.service';
import { OpenViduAngularConfigService } from './services/config/openvidu-angular.config.service';
import { OpenViduService } from './services/openvidu/openvidu.service';
import { ActionService } from './services/action/action.service';
import { ChatService } from './services/chat/chat.service';
import { DocumentService } from './services/document/document.service';
import { LayoutService } from './services/layout/layout.service';
import { PanelService } from './services/panel/panel.service';
import { ParticipantService } from './services/participant/participant.service';
import { RecordingService } from './services/recording/recording.service';

import { ParticipantPanelItemComponent } from './components/panel/participants-panel/participant-panel-item/participant-panel-item.component';
import { ParticipantsPanelComponent } from './components/panel/participants-panel/participants-panel/participants-panel.component';
import { VideoconferenceComponent } from './components/videoconference/videoconference.component';
import { PanelComponent } from './components/panel/panel.component';
import { AudioWaveComponent } from './components/audio-wave/audio-wave.component';
import { PreJoinComponent } from './components/pre-join/pre-join.component';

import { AvatarProfileComponent } from './components/avatar-profile/avatar-profile.component';
import { OpenViduAngularDirectiveModule } from './directives/template/openvidu-angular.directive.module';
import { ApiDirectiveModule } from './directives/api/api.directive.module';
import { BackgroundEffectsPanelComponent } from './components/panel/background-effects-panel/background-effects-panel.component';
import { SettingsPanelComponent } from './components/panel/settings-panel/settings-panel.component';
import { ActivitiesPanelComponent } from './components/panel/activities-panel/activities-panel.component';
import { RecordingActivityComponent } from './components/panel/activities-panel/recording-activity-panel/recording-activity.component';
import { AdminDashboardComponent } from './admin/dashboard/dashboard.component';
import { AdminLoginComponent } from './admin/login/login.component';
import { AppMaterialModule } from './openvidu-angular.material.module';
import { VideoDevicesComponent } from './components/settings/video-devices/video-devices.component';
import { AudioDevicesComponent } from './components/settings/audio-devices/audio-devices.component';
import { NicknameInputComponent } from './components/settings/nickname-input/nickname-input.component';
import { LangSelectorComponent } from './components/settings/lang-selector/lang-selector.component';
import { SubtitlesSettingComponent } from './components/settings/subtitles/subtitles.component';
import { CaptionsComponent } from './components/captions/captions.component';

const publicComponents = [
	AdminDashboardComponent,
	AdminLoginComponent,
	VideoconferenceComponent,
	ToolbarComponent,
	PanelComponent,
	ParticipantsPanelComponent,
	ParticipantPanelItemComponent,
	ChatPanelComponent,
	StreamComponent,
	LayoutComponent
];
const privateComponents = [
	PreJoinComponent,
	SessionComponent,
	ActivitiesPanelComponent,
	BackgroundEffectsPanelComponent,
	SettingsPanelComponent,
	AudioWaveComponent,
	CaptionsComponent,
	DialogTemplateComponent,
	RecordingDialogComponent,
	DeleteDialogComponent,
	AvatarProfileComponent,
	VideoComponent,
	VideoDevicesComponent,
	AudioDevicesComponent,
	NicknameInputComponent,
	LangSelectorComponent,
	RecordingActivityComponent,
	SubtitlesSettingComponent
];

@NgModule({
	declarations: [
		publicComponents,
		privateComponents,
		LinkifyPipe,
		ParticipantStreamsPipe,
		DurationFromSecondsPipe,
		SearchByStringPropertyPipe,
		StreamTypesEnabledPipe,
		TranslatePipe
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
		ChatService,
		PanelService,
		DeviceService,
		DocumentService,
		LayoutService,
		LoggerService,
		PlatformService,
		ParticipantService,
		StorageService,
		TokenService,
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
	],
	entryComponents: [DialogTemplateComponent, RecordingDialogComponent, DeleteDialogComponent]
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
