import { NgModule } from '@angular/core';
import {
	StreamDisplayParticipantNameDirective,
	StreamDisplayAudioDetectionDirective,
	StreamSettingsButtonDirective
} from './stream.directive';
import {
	ToolbarScreenshareButtonDirective,
	ToolbarFullscreenButtonDirective,
	ToolbarLeaveButtonDirective,
	ToolbarParticipantsPanelButtonDirective,
	ToolbarChatPanelButtonDirective,
	ToolbarDisplaySessionNameDirective,
	ToolbarDisplayLogoDirective,
	LogoDirective
} from './toolbar.directive';
import { AudioMutedDirective, MinimalDirective, VideoMutedDirective } from './videoconference.directive';

@NgModule({
	declarations: [
		MinimalDirective,
		VideoMutedDirective,
		AudioMutedDirective,
		ToolbarScreenshareButtonDirective,
		ToolbarFullscreenButtonDirective,
		ToolbarLeaveButtonDirective,
		ToolbarParticipantsPanelButtonDirective,
		ToolbarChatPanelButtonDirective,
		ToolbarDisplaySessionNameDirective,
		ToolbarDisplayLogoDirective,
		StreamDisplayParticipantNameDirective,
		StreamDisplayAudioDetectionDirective,
		StreamSettingsButtonDirective,
		LogoDirective
	],
	exports: [
		MinimalDirective,
		VideoMutedDirective,
		AudioMutedDirective,
		ToolbarScreenshareButtonDirective,
		ToolbarFullscreenButtonDirective,
		ToolbarLeaveButtonDirective,
		ToolbarParticipantsPanelButtonDirective,
		ToolbarChatPanelButtonDirective,
		ToolbarDisplaySessionNameDirective,
		ToolbarDisplayLogoDirective,
		StreamDisplayParticipantNameDirective,
		StreamDisplayAudioDetectionDirective,
		StreamSettingsButtonDirective,
		LogoDirective
	]
})
export class ApiDirectiveModule {}
