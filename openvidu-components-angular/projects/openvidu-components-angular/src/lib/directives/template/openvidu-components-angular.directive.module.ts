import { NgModule } from '@angular/core';
import {
	ChatPanelDirective,
	LayoutDirective,
	PanelDirective,
	ParticipantPanelItemElementsDirective,
	ParticipantPanelItemDirective,
	ParticipantsPanelDirective,
	StreamDirective,
	ToolbarAdditionalButtonsDirective,
	ToolbarDirective,
	ToolbarAdditionalPanelButtonsDirective,
	AdditionalPanelsDirective,
	ActivitiesPanelDirective,
	BackgroundEffectsPanelDirective
} from './openvidu-components-angular.directive';
import {
	LayoutAdditionalElementsDirective,
	ParticipantPanelAfterLocalParticipantDirective,
	ParticipantPanelParticipantBadgeDirective,
	PreJoinDirective,
	LeaveButtonDirective,
	SettingsPanelGeneralAdditionalElementsDirective
} from './internals.directive';

@NgModule({
	declarations: [
		ChatPanelDirective,
		LayoutDirective,
		PanelDirective,
		AdditionalPanelsDirective,
		ParticipantPanelItemDirective,
		ParticipantsPanelDirective,
		StreamDirective,
		ToolbarDirective,
		ToolbarAdditionalButtonsDirective,
		LeaveButtonDirective,
		ToolbarAdditionalPanelButtonsDirective,
		ParticipantPanelItemElementsDirective,
		ActivitiesPanelDirective,
		PreJoinDirective,
		ParticipantPanelAfterLocalParticipantDirective,
		LayoutAdditionalElementsDirective,
		ParticipantPanelParticipantBadgeDirective,
		SettingsPanelGeneralAdditionalElementsDirective
		// BackgroundEffectsPanelDirective
	],
	exports: [
		ChatPanelDirective,
		LayoutDirective,
		PanelDirective,
		AdditionalPanelsDirective,
		ParticipantPanelItemDirective,
		ParticipantsPanelDirective,
		StreamDirective,
		ToolbarDirective,
		ToolbarAdditionalButtonsDirective,
		LeaveButtonDirective,
		ToolbarAdditionalPanelButtonsDirective,
		ParticipantPanelItemElementsDirective,
		ActivitiesPanelDirective,
		PreJoinDirective,
		ParticipantPanelAfterLocalParticipantDirective,
		LayoutAdditionalElementsDirective,
		ParticipantPanelParticipantBadgeDirective,
		SettingsPanelGeneralAdditionalElementsDirective
		// BackgroundEffectsPanelDirective
	]
})
export class OpenViduComponentsDirectiveModule {}
