import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { CallComponent } from './openvidu-call/call.component';
import { TestingComponent } from './testing-app/testing.component';
import { ExamplesDashboardComponent } from './examples/examples-dashboard/examples-dashboard.component';
import { ToolbarDirectiveComponent } from './examples/toolbar-directive/toolbar-directive.component';
import { ToolbarAdditionalButtonsDirectiveComponent } from './examples/toolbarAdditionalButtons-directive/toolbarAdditionalButtons-directive.component';
import { LayoutDirectiveComponent } from './examples/layout-directive/layout-directive.component';
import { StreamDirectiveComponent } from './examples/stream-directive/stream-directive.component';
import { PanelDirectiveComponent } from './examples/panel-directive/panel-directive.component';
import { ParticipantsPanelDirectiveComponent } from './examples/participantsPanel-directive/participantsPanel-directive.component';
import { ChatPanelDirectiveComponent } from './examples/chatPanel-directive/chatPanel-directive.component';

import { ParticipantPanelItemElementsDirectiveComponent } from './examples/participantPanelItemElements-directive/participantPanelItemElements-directive.component';
import { ParticipantPanelItemDirectiveComponent } from './examples/participantPanelItem-directive/participantPanelItem-directive.component';

const routes: Routes = [
	{ path: '', component: DashboardComponent },
	{ path: 'call', component: CallComponent },
	{ path: 'testing', component: TestingComponent },

	{ path: 'examples', component: ExamplesDashboardComponent},
	{ path: 'examples/toolbarDirective', component: ToolbarDirectiveComponent },
	{ path: 'examples/toolbarAdditionalButtonsDirective', component: ToolbarAdditionalButtonsDirectiveComponent },
	{ path: 'examples/layoutDirective', component: LayoutDirectiveComponent },
	{ path: 'examples/streamDirective', component: StreamDirectiveComponent },
	{ path: 'examples/panelDirective', component: PanelDirectiveComponent },
	{ path: 'examples/participantsPanelDirective', component: ParticipantsPanelDirectiveComponent },
	{ path: 'examples/chatPanelDirective', component: ChatPanelDirectiveComponent },
	{ path: 'examples/participantPanelItemDirective', component: ParticipantPanelItemDirectiveComponent },
	{ path: 'examples/participantPanelItemElementsDirective', component: ParticipantPanelItemElementsDirectiveComponent },
];
@NgModule({
	imports: [RouterModule.forRoot(routes, { useHash: true })],
	exports: [RouterModule]
})
export class AppRoutingModule {}
