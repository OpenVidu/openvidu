import { NgModule } from '@angular/core';
import { ActivitiesPanelBroadcastingActivityDirective, ActivitiesPanelRecordingActivityDirective } from './activities-panel.directive';
import {
	AdminDashboardRecordingsListDirective,
	AdminDashboardTitleDirective,
	AdminLoginErrorDirective,
	AdminLoginTitleDirective
} from './admin.directive';
import {
	FallbackLogoDirective,
	LayoutRemoteParticipantsDirective,
	PrejoinDisplayParticipantName,
	ToolbarBrandingLogoDirective
} from './internals.directive';
import { ParticipantPanelItemMuteButtonDirective } from './participant-panel-item.directive';
import {
	StreamDisplayAudioDetectionDirective,
	StreamDisplayParticipantNameDirective,
	StreamVideoControlsDirective
} from './stream.directive';
import {
	ToolbarActivitiesPanelButtonDirective,
	ToolbarAdditionalButtonsPossitionDirective,
	ToolbarBackgroundEffectsButtonDirective,
	ToolbarBroadcastingButtonDirective,
	ToolbarCameraButtonDirective,
	// ToolbarCaptionsButtonDirective,
	ToolbarChatPanelButtonDirective,
	ToolbarDisplayLogoDirective,
	ToolbarDisplayRoomNameDirective,
	ToolbarFullscreenButtonDirective,
	ToolbarLeaveButtonDirective,
	ToolbarMicrophoneButtonDirective,
	ToolbarParticipantsPanelButtonDirective,
	ToolbarRecordingButtonDirective,
	ToolbarScreenshareButtonDirective,
	ToolbarSettingsButtonDirective
} from './toolbar.directive';
import {
	AudioEnabledDirective,
	// CaptionsLangDirective,
	// CaptionsLangOptionsDirective,
	LangDirective,
	LangOptionsDirective,
	LivekitUrlDirective,
	MinimalDirective,
	ParticipantNameDirective,
	PrejoinDirective,
	RecordingStreamBaseUrlDirective,
	ShowDisconnectionDialogDirective,
	TokenDirective,
	TokenErrorDirective,
	VideoEnabledDirective
} from './videoconference.directive';

const directives = [
	LivekitUrlDirective,
	TokenDirective,
	TokenErrorDirective,
	MinimalDirective,
	LangDirective,
	LangOptionsDirective,
	// CaptionsLangOptionsDirective,
	// CaptionsLangDirective,
	PrejoinDirective,
	PrejoinDisplayParticipantName,
	VideoEnabledDirective,
	AudioEnabledDirective,
	ShowDisconnectionDialogDirective,
	RecordingStreamBaseUrlDirective,
	ToolbarCameraButtonDirective,
	ToolbarMicrophoneButtonDirective,
	ToolbarScreenshareButtonDirective,
	ToolbarFullscreenButtonDirective,
	ToolbarBackgroundEffectsButtonDirective,
	// ToolbarCaptionsButtonDirective,
	ToolbarLeaveButtonDirective,
	ToolbarRecordingButtonDirective,
	ToolbarBroadcastingButtonDirective,
	ToolbarParticipantsPanelButtonDirective,
	ToolbarChatPanelButtonDirective,
	ToolbarActivitiesPanelButtonDirective,
	ToolbarDisplayRoomNameDirective,
	ToolbarDisplayLogoDirective,
	ToolbarSettingsButtonDirective,
	ToolbarAdditionalButtonsPossitionDirective,
	StreamDisplayParticipantNameDirective,
	StreamDisplayAudioDetectionDirective,
	StreamVideoControlsDirective,
	FallbackLogoDirective,
	ToolbarBrandingLogoDirective,
	ParticipantPanelItemMuteButtonDirective,
	ParticipantNameDirective,
	ActivitiesPanelRecordingActivityDirective,
	ActivitiesPanelBroadcastingActivityDirective,
	AdminDashboardRecordingsListDirective,
	AdminLoginTitleDirective,
	AdminLoginErrorDirective,
	AdminDashboardTitleDirective,
	LayoutRemoteParticipantsDirective
];

@NgModule({
	declarations: [...directives],
	exports: [...directives]
})
export class ApiDirectiveModule {}
