import { NgModule } from '@angular/core';
import {
	ChatPanelDirective,
	LayoutDirective,
	OvImageDirective,
	PanelDirective,
	ParticipantPanelItemDirective,
	ParticipantsPanelDirective,
	StreamDirective,
	ToolbarDirective
} from './openvidu-angular.directive';

@NgModule({
	declarations: [
		ChatPanelDirective,
		LayoutDirective,
		OvImageDirective,
		PanelDirective,
		ParticipantPanelItemDirective,
		ParticipantsPanelDirective,
		StreamDirective,
		ToolbarDirective
	],
	exports: [
		ChatPanelDirective,
		LayoutDirective,
		OvImageDirective,
		PanelDirective,
		ParticipantPanelItemDirective,
		ParticipantsPanelDirective,
		StreamDirective,
		ToolbarDirective
	]
})
export class OpenViduAngularDirectiveModule {}
