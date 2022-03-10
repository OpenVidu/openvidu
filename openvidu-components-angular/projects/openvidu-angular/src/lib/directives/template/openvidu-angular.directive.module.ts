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
	ToolbarDirective
} from './openvidu-angular.directive';

@NgModule({
	declarations: [
		ChatPanelDirective,
		LayoutDirective,
		PanelDirective,
		ParticipantPanelItemDirective,
		ParticipantsPanelDirective,
		StreamDirective,
		ToolbarDirective,
		ToolbarAdditionalButtonsDirective,
		ParticipantPanelItemElementsDirective
	],
	exports: [
		ChatPanelDirective,
		LayoutDirective,
		PanelDirective,
		ParticipantPanelItemDirective,
		ParticipantsPanelDirective,
		StreamDirective,
		ToolbarDirective,
		ToolbarAdditionalButtonsDirective,
		ParticipantPanelItemElementsDirective
	]
})
export class OpenViduAngularDirectiveModule {}
