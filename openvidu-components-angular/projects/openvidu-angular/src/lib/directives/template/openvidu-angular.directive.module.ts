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
	AdditionalPanelsDirective
} from './openvidu-angular.directive';

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
		ParticipantPanelItemElementsDirective
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
		ParticipantPanelItemElementsDirective
	]
})
export class OpenViduAngularDirectiveModule {}
