import { OverlayContainer } from '@angular/cdk/overlay';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { ModuleWithProviders, NgModule, Provider, EnvironmentProviders } from '@angular/core';

import { CdkOverlayContainer } from './config/custom-cdk-overlay';
import { OpenViduComponentsConfig } from './config/openvidu-components-angular.config';
import { ActionService } from './services/action/action.service';
import { ChatService } from './services/chat/chat.service';
import { DeviceService } from './services/device/device.service';
import { DocumentService } from './services/document/document.service';
import { LayoutService } from './services/layout/layout.service';
import { LoggerService } from './services/logger/logger.service';
import { OpenViduService } from './services/openvidu/openvidu.service';
import { PanelService } from './services/panel/panel.service';
import { ParticipantService } from './services/participant/participant.service';
import { PlatformService } from './services/platform/platform.service';
import { RecordingService } from './services/recording/recording.service';
import { StorageService } from './services/storage/storage.service';

import { VirtualBackgroundService } from './services/virtual-background/virtual-background.service';
import { BroadcastingService } from './services/broadcasting/broadcasting.service';
import { GlobalConfigService } from './services/config/global-config.service';
import { OpenViduComponentsConfigService } from './services/config/directive-config.service';
import { OpenViduComponentsUiModule } from './openvidu-components-angular-ui.module';
import { ViewportService } from './services/viewport/viewport.service';

@NgModule({
	imports: [OpenViduComponentsUiModule],
	exports: [OpenViduComponentsUiModule]
})
export class OpenViduComponentsModule {
	static forRoot(config: OpenViduComponentsConfig): ModuleWithProviders<OpenViduComponentsModule> {
		const providers: (Provider | EnvironmentProviders)[] = [
			{ provide: 'OPENVIDU_COMPONENTS_CONFIG', useValue: config },
			GlobalConfigService,
			OpenViduComponentsConfigService,
			ActionService,
			BroadcastingService,
			// CaptionService,
			CdkOverlayContainer,
			{ provide: OverlayContainer, useClass: CdkOverlayContainer },
			ChatService,
			DeviceService,
			DocumentService,
			// LayoutService,
			LoggerService,
			OpenViduService,
			PanelService,
			ParticipantService,
			PlatformService,
			RecordingService,
			StorageService,
			VirtualBackgroundService,
			ViewportService,
			provideHttpClient(withInterceptorsFromDi())
		];

		return {
			ngModule: OpenViduComponentsModule,
			providers
		};
	}
}
