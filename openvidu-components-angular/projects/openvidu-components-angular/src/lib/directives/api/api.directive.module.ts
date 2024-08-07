import { NgModule } from '@angular/core';
import { ActivitiesPanelBroadcastingActivityDirective, ActivitiesPanelRecordingActivityDirective } from './activities-panel.directive';
import { AdminLoginErrorDirective, AdminDashboardRecordingsListDirective } from './admin.directive';
import { LogoDirective } from './internals.directive';
import { ParticipantPanelItemMuteButtonDirective } from './participant-panel-item.directive';
import {
	StreamDisplayAudioDetectionDirective,
	StreamDisplayParticipantNameDirective,
	StreamVideoControlsDirective
} from './stream.directive';
import {
	ToolbarActivitiesPanelButtonDirective,
	ToolbarBackgroundEffectsButtonDirective,
	ToolbarBroadcastingButtonDirective,
	// ToolbarCaptionsButtonDirective,
	ToolbarChatPanelButtonDirective,
	ToolbarDisplayLogoDirective,
	ToolbarDisplayRoomNameDirective,
	ToolbarFullscreenButtonDirective,
	ToolbarLeaveButtonDirective,
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
	TokenDirective,
	TokenErrorDirective,
	VideoEnabledDirective
} from './videoconference.directive';


@NgModule({
	declarations: [
		LivekitUrlDirective,
		TokenDirective,
		TokenErrorDirective,
		MinimalDirective,
		LangDirective,
		LangOptionsDirective,
		// CaptionsLangOptionsDirective,
		// CaptionsLangDirective,
		PrejoinDirective,
		VideoEnabledDirective,
		AudioEnabledDirective,
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
		StreamDisplayParticipantNameDirective,
		StreamDisplayAudioDetectionDirective,
		StreamVideoControlsDirective,
		LogoDirective,
		ParticipantPanelItemMuteButtonDirective,
		ParticipantNameDirective,
		ActivitiesPanelRecordingActivityDirective,
		ActivitiesPanelBroadcastingActivityDirective,
		AdminDashboardRecordingsListDirective,
		AdminLoginErrorDirective
	],
	exports: [
		LivekitUrlDirective,
		TokenDirective,
		TokenErrorDirective,
		MinimalDirective,
		LangDirective,
		LangOptionsDirective,
		// CaptionsLangOptionsDirective,
		// CaptionsLangDirective,
		PrejoinDirective,
		VideoEnabledDirective,
		AudioEnabledDirective,
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
		StreamDisplayParticipantNameDirective,
		StreamDisplayAudioDetectionDirective,
		StreamVideoControlsDirective,
		LogoDirective,
		ParticipantPanelItemMuteButtonDirective,
		ParticipantNameDirective,
		ActivitiesPanelRecordingActivityDirective,
		ActivitiesPanelBroadcastingActivityDirective,
		AdminDashboardRecordingsListDirective,
		AdminLoginErrorDirective
	]
})
export class ApiDirectiveModule {}
