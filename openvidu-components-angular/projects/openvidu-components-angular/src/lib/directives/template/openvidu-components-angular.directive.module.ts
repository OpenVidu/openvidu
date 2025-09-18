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
	LeaveButtonDirective
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
		ParticipantPanelParticipantBadgeDirective
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
		ParticipantPanelParticipantBadgeDirective
		// BackgroundEffectsPanelDirective
	]
})
export class OpenViduComponentsDirectiveModule {}
