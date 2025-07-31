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
import { LayoutAdditionalElementsDirective, ParticipantPanelAfterLocalParticipantDirective, PreJoinDirective } from './internals.directive';

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
		ToolbarAdditionalPanelButtonsDirective,
		ParticipantPanelItemElementsDirective,
		ActivitiesPanelDirective,
		PreJoinDirective,
		ParticipantPanelAfterLocalParticipantDirective,
		LayoutAdditionalElementsDirective
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
		ToolbarAdditionalPanelButtonsDirective,
		ParticipantPanelItemElementsDirective,
		ActivitiesPanelDirective,
		PreJoinDirective,
		ParticipantPanelAfterLocalParticipantDirective,
		LayoutAdditionalElementsDirective
		// BackgroundEffectsPanelDirective
	]
})
export class OpenViduComponentsDirectiveModule {}
