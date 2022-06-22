import { BrowserModule } from '@angular/platform-browser';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app.routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

import { environment } from 'src/environments/environment';

import { CallComponent } from './openvidu-call/call.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { TestingComponent } from './testing-app/testing.component';
import { ToolbarDirectiveComponent } from './examples/toolbar-directive/toolbar-directive.component';
import { ToolbarAdditionalButtonsDirectiveComponent } from './examples/toolbarAdditionalButtons-directive/toolbarAdditionalButtons-directive.component';
import { ToolbarAdditionalPanelButtonsDirectiveComponent } from './examples/toolbarAdditionalPanelButtons-directive/toolbarAdditionalPanelButtons-directive.component';
import { LayoutDirectiveComponent } from './examples/layout-directive/layout-directive.component';
import { StreamDirectiveComponent } from './examples/stream-directive/stream-directive.component';
import { PanelDirectiveComponent } from './examples/panel-directive/panel-directive.component';
import { AdditionalPanelsDirectiveComponent } from './examples/additionalPanels-directive/additionalPanels-directive.component';
import { ParticipantsPanelDirectiveComponent } from './examples/participantsPanel-directive/participantsPanel-directive.component';
import { ParticipantPanelItemDirectiveComponent } from './examples/participantPanelItem-directive/participantPanelItem-directive.component';
import { ParticipantPanelItemElementsDirectiveComponent } from './examples/participantPanelItemElements-directive/participantPanelItemElements-directive.component';
import { ChatPanelDirectiveComponent } from './examples/chatPanel-directive/chatPanel-directive.component';
import { AdminDashboardComponent } from './admin/admin-dashboard/admin-dashboard.component';
// openvidu-angular
import { OpenViduAngularModule } from 'openvidu-angular';
import { ExamplesDashboardComponent } from './examples/examples-dashboard/examples-dashboard.component';

@NgModule({
	declarations: [
		AppComponent,
		DashboardComponent,
		AdminDashboardComponent,
		CallComponent,
		TestingComponent,
		ExamplesDashboardComponent,
		ToolbarDirectiveComponent,
		ToolbarAdditionalButtonsDirectiveComponent,
		ToolbarAdditionalPanelButtonsDirectiveComponent,
		LayoutDirectiveComponent,
		StreamDirectiveComponent,
		PanelDirectiveComponent,
		AdditionalPanelsDirectiveComponent,
		ParticipantsPanelDirectiveComponent,
		ChatPanelDirectiveComponent,
		ParticipantPanelItemDirectiveComponent,
		ParticipantPanelItemElementsDirectiveComponent
	],
	imports: [
		BrowserModule,
		MatCheckboxModule,
		MatButtonModule,
		MatIconModule,
		MatMenuModule,
		BrowserAnimationsModule,
		OpenViduAngularModule.forRoot(environment),
		AppRoutingModule // Order is important, AppRoutingModule must be the last import for useHash working
	],
	providers: [],
	bootstrap: [AppComponent]
})
export class AppModule {}
