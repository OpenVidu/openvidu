import { NgModule } from '@angular/core';
import { ActivitiesPanelBroadcastingActivityDirective, ActivitiesPanelRecordingActivityDirective } from './activities-panel.directive';
import { AdminLoginDirective, AdminRecordingsListDirective } from './admin.directive';
import { BroadcastingActivityBroadcastingErrorDirective } from './broadcasting-activity.directive';
import { LogoDirective } from './internals.directive';
import { ParticipantPanelItemMuteButtonDirective } from './participant-panel-item.directive';
import { RecordingActivityRecordingErrorDirective, RecordingActivityRecordingsListDirective } from './recording-activity.directive';
import {
	StreamDisplayAudioDetectionDirective,
	StreamDisplayParticipantNameDirective,
	StreamSettingsButtonDirective,
	StreamFrameRateDirective,
	StreamResolutionDirective
} from './stream.directive';
import {
	ToolbarActivitiesPanelButtonDirective,
	ToolbarBackgroundEffectsButtonDirective, ToolbarBroadcastingButtonDirective, ToolbarCaptionsButtonDirective,
	ToolbarChatPanelButtonDirective,
	ToolbarDisplayLogoDirective,
	ToolbarDisplaySessionNameDirective,
	ToolbarFullscreenButtonDirective,
	ToolbarLeaveButtonDirective,
	ToolbarParticipantsPanelButtonDirective,
	ToolbarRecordingButtonDirective,
	ToolbarScreenshareButtonDirective,
	ToolbarSettingsButtonDirective
} from './toolbar.directive';
import {
	AudioMutedDirective,
	CaptionsLangDirective,
	CaptionsLangOptionsDirective,
	LangOptionsDirective,
	LangDirective,
	MinimalDirective,
	ParticipantNameDirective,
	PrejoinDirective,
	VideoMutedDirective,
	SimulcastDirective
} from './videoconference.directive';

@NgModule({
	declarations: [
		MinimalDirective,
		LangDirective,
		LangOptionsDirective,
		CaptionsLangOptionsDirective,
		CaptionsLangDirective,
		PrejoinDirective,
		VideoMutedDirective,
		SimulcastDirective,
		AudioMutedDirective,
		ToolbarScreenshareButtonDirective,
		ToolbarFullscreenButtonDirective,
		ToolbarBackgroundEffectsButtonDirective,
		ToolbarCaptionsButtonDirective,
		ToolbarLeaveButtonDirective,
		ToolbarRecordingButtonDirective,
		ToolbarBroadcastingButtonDirective,
		ToolbarParticipantsPanelButtonDirective,
		ToolbarChatPanelButtonDirective,
		ToolbarActivitiesPanelButtonDirective,
		ToolbarDisplaySessionNameDirective,
		ToolbarDisplayLogoDirective,
		ToolbarSettingsButtonDirective,
		StreamDisplayParticipantNameDirective,
		StreamDisplayAudioDetectionDirective,
		StreamSettingsButtonDirective,
		StreamFrameRateDirective,
		StreamResolutionDirective,
		LogoDirective,
		ParticipantPanelItemMuteButtonDirective,
		ParticipantNameDirective,
		ActivitiesPanelRecordingActivityDirective,
		ActivitiesPanelBroadcastingActivityDirective,
		RecordingActivityRecordingsListDirective,
		RecordingActivityRecordingErrorDirective,
		BroadcastingActivityBroadcastingErrorDirective,
		AdminRecordingsListDirective,
		AdminLoginDirective
	],
	exports: [
		MinimalDirective,
		LangDirective,
		LangOptionsDirective,
		CaptionsLangOptionsDirective,
		CaptionsLangDirective,
		PrejoinDirective,
		VideoMutedDirective,
		SimulcastDirective,
		AudioMutedDirective,
		ToolbarScreenshareButtonDirective,
		ToolbarFullscreenButtonDirective,
		ToolbarBackgroundEffectsButtonDirective,
		ToolbarCaptionsButtonDirective,
		ToolbarLeaveButtonDirective,
		ToolbarRecordingButtonDirective,
		ToolbarBroadcastingButtonDirective,
		ToolbarParticipantsPanelButtonDirective,
		ToolbarChatPanelButtonDirective,
		ToolbarActivitiesPanelButtonDirective,
		ToolbarDisplaySessionNameDirective,
		ToolbarDisplayLogoDirective,
		ToolbarSettingsButtonDirective,
		StreamDisplayParticipantNameDirective,
		StreamDisplayAudioDetectionDirective,
		StreamSettingsButtonDirective,
		StreamFrameRateDirective,
		StreamResolutionDirective,
		LogoDirective,
		ParticipantPanelItemMuteButtonDirective,
		ParticipantNameDirective,
		ActivitiesPanelRecordingActivityDirective,
		ActivitiesPanelBroadcastingActivityDirective,
		RecordingActivityRecordingsListDirective,
		RecordingActivityRecordingErrorDirective,
		BroadcastingActivityBroadcastingErrorDirective,
		AdminRecordingsListDirective,
		AdminLoginDirective
	]
})
export class ApiDirectiveModule {}
