import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatOptionModule } from '@angular/material/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSliderModule } from '@angular/material/slider';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FlexLayoutModule } from '@angular/flex-layout';
import { OverlayContainer } from '@angular/cdk/overlay';
import { MatMenuModule } from '@angular/material/menu';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';

import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';

import { UserSettingsComponent } from './components/user-settings/user-settings.component';
import { ToolbarComponent } from './components/toolbar/toolbar.component';
import { VideoComponent } from './components/video/video.component';
import { ChatPanelComponent } from './components/panel/chat-panel/chat-panel.component';
import { SessionComponent } from './components/session/session.component';
import { LayoutComponent } from './components/layout/layout.component';
import { StreamComponent } from './components/stream/stream.component';
import { DialogTemplateComponent } from './components/material/dialog.component';

import { LinkifyPipe } from './pipes/linkify.pipe';
import { TooltipListPipe } from './pipes/tooltip-list.pipe';
import { ConnectionsEnabledPipe, NicknamePipe, ParticipantConnectionsPipe } from './pipes/participant-connections.pipe';

import { LibConfig } from './config/lib.config';
import { CdkOverlayContainer } from './config/custom-cdk-overlay';
import { DeviceService } from './services/device/device.service';
import { LoggerService } from './services/logger/logger.service';
import { PlatformService } from './services/platform/platform.service';
import { StorageService } from './services/storage/storage.service';
import { TokenService } from './services/token/token.service';
import { LibraryConfigService } from './services/library-config/library-config.service';
import { WebrtcService } from './services/webrtc/webrtc.service';
import { ActionService } from './services/action/action.service';
import { ChatService } from './services/chat/chat.service';
import { DocumentService } from './services/document/document.service';
import { LayoutService } from './services/layout/layout.service';
import { SidenavMenuService } from './services/sidenav-menu/sidenav-menu.service';
import { ParticipantService } from './services/participant/participant.service';
import { ParticipantItemComponent } from './components/panel/participants-panel/participant-item/participant-item.component';
import { ParticipantsPanelComponent } from './components/panel/participants-panel/participants-panel/participants-panel.component';
import { VideoconferenceComponent } from './components/videoconference/videoconference.component';
import { PanelComponent } from './components/panel/panel.component';

@NgModule({
	declarations: [
		UserSettingsComponent,
		VideoComponent,
		ToolbarComponent,
		ChatPanelComponent,
		SessionComponent,
		LayoutComponent,
		StreamComponent,
		DialogTemplateComponent,
		LinkifyPipe,
		TooltipListPipe,
		ParticipantConnectionsPipe,
		ConnectionsEnabledPipe,
		NicknamePipe,
		ParticipantItemComponent,
		ParticipantsPanelComponent,
		VideoconferenceComponent,
  PanelComponent
	],
	imports: [
		CommonModule,
		HttpClientModule,
		FormsModule,
		ReactiveFormsModule,
		RouterModule.forRoot([]),
		MatButtonModule,
		MatCardModule,
		MatToolbarModule,
		MatIconModule,
		MatInputModule,
		MatFormFieldModule,
		MatDialogModule,
		MatTooltipModule,
		MatBadgeModule,
		MatGridListModule,
		MatSelectModule,
		MatOptionModule,
		MatProgressSpinnerModule,
		MatSliderModule,
		MatSidenavModule,
		MatSnackBarModule,
		FlexLayoutModule,
		MatMenuModule,
		MatDividerModule,
		MatListModule
	],
	providers: [
		ActionService,
		CdkOverlayContainer,
		{ provide: OverlayContainer, useClass: CdkOverlayContainer },
		ChatService,
		SidenavMenuService,
		DeviceService,
		DocumentService,
		LayoutService,
		LoggerService,
		PlatformService,
		ParticipantService,
		StorageService,
		TokenService,
		WebrtcService
	],
	exports: [
		VideoconferenceComponent,
		UserSettingsComponent,
		ToolbarComponent,
		ChatPanelComponent,
		SessionComponent,
		LayoutComponent,
		StreamComponent,
		VideoComponent,
		ParticipantConnectionsPipe,
		CommonModule
	],
	entryComponents: [DialogTemplateComponent]
})
export class OpenviduAngularModule {
	static forRoot(environment): ModuleWithProviders<OpenviduAngularModule> {
		// console.log(`${library.name} config: ${environment}`);
		const libConfig: LibConfig = { environment };
		return {
			ngModule: OpenviduAngularModule,
			providers: [LibraryConfigService, { provide: 'LIB_CONFIG', useValue: libConfig }]
		};
	}
}
