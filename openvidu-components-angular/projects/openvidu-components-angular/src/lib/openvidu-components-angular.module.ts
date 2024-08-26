import { OverlayContainer } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { DeleteDialogComponent } from './components/dialogs/delete-recording.component';
import { DialogTemplateComponent } from './components/dialogs/dialog.component';
import { RecordingDialogComponent } from './components/dialogs/recording-dialog.component';
import { LayoutComponent } from './components/layout/layout.component';
import { ChatPanelComponent } from './components/panel/chat-panel/chat-panel.component';
import { SessionComponent } from './components/session/session.component';
import { StreamComponent } from './components/stream/stream.component';
import { ToolbarComponent } from './components/toolbar/toolbar.component';
import { MediaElementComponent } from './components/media-element/media-element.component';

import { LinkifyPipe } from './pipes/linkify.pipe';
import { RemoteParticipantTracksPipe, TrackPublishedTypesPipe } from './pipes/participant.pipe';
import { DurationFromSecondsPipe, SearchByStringPropertyPipe, ThumbnailFromUrlPipe } from './pipes/recording.pipe';
import { TranslatePipe } from './pipes/translate.pipe';

import { DragDropModule } from '@angular/cdk/drag-drop';

import { CdkOverlayContainer } from './config/custom-cdk-overlay';
import { OpenViduComponentsConfig } from './config/openvidu-components-angular.config';
import { ActionService } from './services/action/action.service';
import { ChatService } from './services/chat/chat.service';
import { OpenViduComponentsConfigService } from './services/config/directive-config.service';
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

import { AdminDashboardComponent } from './admin/admin-dashboard/admin-dashboard.component';
import { AdminLoginComponent } from './admin/admin-login/admin-login.component';
import { AvatarProfileComponent } from './components/avatar-profile/avatar-profile.component';
// import { CaptionsComponent } from './components/captions/captions.component';
import { ProFeatureDialogTemplateComponent } from './components/dialogs/pro-feature-dialog.component';
import { ActivitiesPanelComponent } from './components/panel/activities-panel/activities-panel.component';
import { BroadcastingActivityComponent } from './components/panel/activities-panel/broadcasting-activity/broadcasting-activity.component';
import { RecordingActivityComponent } from './components/panel/activities-panel/recording-activity/recording-activity.component';
import { BackgroundEffectsPanelComponent } from './components/panel/background-effects-panel/background-effects-panel.component';
import { SettingsPanelComponent } from './components/panel/settings-panel/settings-panel.component';
import { AudioDevicesComponent } from './components/settings/audio-devices/audio-devices.component';
// import { CaptionsSettingComponent } from './components/settings/captions/captions.component';
import { LangSelectorComponent } from './components/settings/lang-selector/lang-selector.component';
import { ParticipantNameInputComponent } from './components/settings/participant-name-input/participant-name-input.component';
import { VideoDevicesComponent } from './components/settings/video-devices/video-devices.component';
import { ApiDirectiveModule } from './directives/api/api.directive.module';
import { OpenViduComponentsDirectiveModule } from './directives/template/openvidu-components-angular.directive.module';
import { AppMaterialModule } from './openvidu-components-angular.material.module';
import { VirtualBackgroundService } from './services/virtual-background/virtual-background.service';
import { BroadcastingService } from './services/broadcasting/broadcasting.service';
import { TranslateService } from './services/translate/translate.service';

const publicComponents = [
	AdminDashboardComponent,
	AdminLoginComponent,
	VideoconferenceComponent,
	ToolbarComponent,
	PanelComponent,
	ActivitiesPanelComponent,
	RecordingActivityComponent,
	BroadcastingActivityComponent,
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
	// CaptionsComponent,
	DialogTemplateComponent,
	ProFeatureDialogTemplateComponent,
	RecordingDialogComponent,
	DeleteDialogComponent,
	AvatarProfileComponent,
	MediaElementComponent,
	VideoDevicesComponent,
	AudioDevicesComponent,
	ParticipantNameInputComponent,
	LangSelectorComponent
	// CaptionsSettingComponent
];

@NgModule({
	declarations: [
		publicComponents,
		privateComponents,
		LinkifyPipe,
		RemoteParticipantTracksPipe,
		DurationFromSecondsPipe,
		SearchByStringPropertyPipe,
		ThumbnailFromUrlPipe,
		TrackPublishedTypesPipe,
		TranslatePipe
	],
	exports: [
		publicComponents,
		RemoteParticipantTracksPipe,
		DurationFromSecondsPipe,
		TrackPublishedTypesPipe,
		OpenViduComponentsDirectiveModule,
		ApiDirectiveModule
	],
	imports: [
		CommonModule,
		FormsModule,
		ReactiveFormsModule,
		AppMaterialModule,
		OpenViduComponentsDirectiveModule,
		ApiDirectiveModule,
		DragDropModule
	],
	providers: [
		ActionService,
		BroadcastingService,
		// CaptionService,
		CdkOverlayContainer,
		{ provide: OverlayContainer, useClass: CdkOverlayContainer },
		ChatService,
		DeviceService,
		DocumentService,
		LayoutService,
		LoggerService,
		OpenViduService,
		PanelService,
		ParticipantService,
		PlatformService,
		RecordingService,
		StorageService,
		TranslateService,
		VirtualBackgroundService,
		provideHttpClient(withInterceptorsFromDi())
	]
})
export class OpenViduComponentsModule {
	static forRoot(config): ModuleWithProviders<OpenViduComponentsModule> {
		// console.log(`${library.name} config: ${environment}`);
		const libConfig: OpenViduComponentsConfig = config;
		return {
			ngModule: OpenViduComponentsModule,
			providers: [OpenViduComponentsConfigService, { provide: 'OPENVIDU_COMPONENTS_CONFIG', useValue: libConfig }]
		};
	}
}
